import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeSystem } from "./database-setup";
import { setupSecurity } from "./security";
import path from "path";
import fs from "fs";
import { Server } from "http";
import compression from "compression";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

// Trust proxy and harden headers
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Setup security first
setupSecurity(app);

// Enable gzip compression
app.use(compression());

app.use(express.urlencoded({ limit: '10mb', extended: true }));

// خدمة الملفات الثابتة للصور المرفوعة - محسّنة لـ Render
const uploadsPath = path.join(process.cwd(), 'client/public/uploads');
app.use('/uploads', (req, res, next) => {
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
  }
}));

// خدمة SVG icons
const svgPath = path.join(process.cwd(), 'client/public/svgs');
app.use('/svgs', express.static(svgPath, {
  maxAge: '7d',
  etag: true,
  setHeaders: (res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=604800');
  }
}));

// خدمة ملفات الحائط المرفوعة (بدون بدائل)
const wallUploadsPath = path.join(process.cwd(), 'client', 'public', 'uploads', 'wall');
app.use('/uploads/wall', express.static(wallUploadsPath, { maxAge: '1d', etag: true }));

// خدمة الصور والأيقونات
app.use('/icons', express.static(path.join(process.cwd(), 'client/public/icons'), {
  maxAge: '7d'
}));

// Health check endpoint - simple and fast
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// More detailed health endpoint  
app.get('/api/health', async (req, res) => {
  try {
    const { checkDatabaseHealth, getDatabaseStatus } = await import('./database-adapter');
    const dbHealth = await checkDatabaseHealth();
    const dbStatus = getDatabaseStatus();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        connected: dbHealth,
        type: dbStatus.type,
        environment: dbStatus.environment
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Initialize database and start server
async function startServer() {
  try {
    // تهيئة النظام (قاعدة البيانات + البيانات الافتراضية)
    const systemInitialized = await initializeSystem();
    
    if (systemInitialized) {
      } else {
      console.warn('⚠️ تم بدء الخادم مع تحذيرات في تهيئة النظام');
    }

    // Register routes and get the server
    const server = await registerRoutes(app);

    // API 404 and error handlers
    app.use('/api', notFoundHandler);
    app.use(errorHandler);

    // Setup client handling
    if (process.env.NODE_ENV === 'development') {
      setupVite(app, server);
    } else {
      // Serve built static files in production
      serveStatic(app);
    }

    // Start the server
    const PORT = Number(process.env.PORT) || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      const mode = process.env.NODE_ENV;
      log(`🚀 الخادم يعمل على المنفذ ${PORT} في وضع ${mode}`);
      
      if (mode === 'development') {
        log(`📱 رابط التطبيق: http://localhost:${PORT}`);
      }
      
      // إظهار معلومات قاعدة البيانات (اختياري)
      import('./database-adapter').then(({ getDatabaseStatus }) => {
        try { getDatabaseStatus(); } catch {}
      }).catch(() => {});
      });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      server.close(() => {
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      server.close(() => {
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('💥 فشل في بدء الخادم:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
