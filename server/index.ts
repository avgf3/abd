import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase, createDefaultUsers, runMigrations, runDrizzlePush } from "./database-setup";
import { setupSecurity } from "./security";
import path from "path";
import fs from "fs";
import { Server } from "http";

const app = express();

// Setup security first
setupSecurity(app);

app.use(express.urlencoded({ limit: '10mb', extended: true }));

// خدمة الملفات الثابتة للصور المرفوعة - محسّنة لـ Render
const uploadsPath = path.join(process.cwd(), 'client/public/uploads');
app.use('/uploads', (req, res, next) => {
  console.log('📁 طلب ملف:', req.path, 'من:', uploadsPath);
  
  // التحقق من وجود الملف
  const fullPath = path.join(uploadsPath, req.path);
  if (!fs.existsSync(fullPath)) {
    console.error('❌ الملف غير موجود:', fullPath);
    
    // Return default avatar for profile images
    if (req.path.includes('profile-') || req.path.includes('/profiles/')) {
      const defaultAvatarPath = path.join(process.cwd(), 'client/public/default_avatar.svg');
      if (fs.existsSync(defaultAvatarPath)) {
        return res.sendFile(defaultAvatarPath);
      }
    }
    
    return res.status(404).json({ error: 'File not found' });
  }
  
  console.log('✅ الملف موجود:', fullPath);
  next();
}, express.static(uploadsPath, {
  // إعدادات محسّنة للأداء
  maxAge: '1d', // cache لمدة يوم واحد
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // إعداد headers مناسبة للصور
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (path.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    } else if (path.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
    
    // السماح بالوصول من أي domain
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// دالة للبحث عن منفذ متاح
async function findAvailablePort(startPort: number, maxPort: number = startPort + 100): Promise<number> {
  const net = await import('net');
  
  function tryPort(portToTry: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.listen(portToTry, () => {
        server.once('close', () => {
          resolve(portToTry);
        });
        server.close();
      });
      server.on('error', () => {
        if (portToTry >= maxPort) {
          reject(new Error(`No available ports found between ${startPort} and ${maxPort}`));
        } else {
          resolve(tryPort(portToTry + 1));
        }
      });
    });
  }
  
  return tryPort(startPort);
}

// دالة إعداد إغلاق آمن للخادم
function setupGracefulShutdown(httpServer: Server) {
  const shutdown = (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    httpServer.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// دالة بدء الخادم
async function startServer() {
  try {
    console.log('🚀 Starting Arabic Chat Server...');
    
    // Initialize database
    console.log('🗄️ Initializing database...');
    await initializeDatabase();
    
    // Run migrations if needed
    if (process.env.NODE_ENV === 'production') {
      console.log('🔄 Running database migrations...');
      await runMigrations();
    }
    
    // Create default users
    console.log('👥 Creating default users...');
    await createDefaultUsers();
    
    // Find available port
    const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
    const availablePort = await findAvailablePort(port);
    
    // Register routes and get HTTP server
    const httpServer = await registerRoutes(app);
    
    // Setup graceful shutdown
    setupGracefulShutdown(httpServer);
    
    // Start server
    httpServer.listen(availablePort, () => {
      console.log(`✅ Server is running on port ${availablePort}`);
      console.log(`🌐 Open http://localhost:${availablePort} in your browser`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode enabled');
      } else {
        console.log('🚀 Production mode enabled');
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// بدء الخادم
startServer();
