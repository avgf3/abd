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
import fetch from "node-fetch";

const app = express();

// إعدادات خاصة بـ Render
const isProduction = process.env.NODE_ENV === 'production';
const isRender = process.env.RENDER === 'true' || process.env.RENDER_EXTERNAL_URL;

// Setup security first
setupSecurity(app);

app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Trust proxy for Render
if (isRender) {
  app.set('trust proxy', 1);
  log('🔧 Render environment detected - proxy trust enabled');
}

// Health check endpoint - مُحسّن لـ Render
app.get('/api/health', (req, res) => {
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version
  };
  
  res.status(200).json(healthData);
});

// Render-specific keep-alive endpoint
app.get('/api/keep-alive', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    message: 'Server is running'
  });
});

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
    
    // Return placeholder for wall images
    if (req.path.includes('wall-') || req.path.includes('/wall/')) {
      const placeholderPath = path.join(process.cwd(), 'client/public/placeholder.jpg');
      if (fs.existsSync(placeholderPath)) {
        return res.sendFile(placeholderPath);
      }
    }
    
    // Return a 1x1 transparent pixel as fallback
    const transparentPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(transparentPixel);
  }
  
  console.log('✅ الملف موجود:', fullPath);
  next();
}, express.static(uploadsPath, {
  // إعدادات محسّنة للأداء
  maxAge: isProduction ? '7d' : '1d', // cache أطول في الإنتاج
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
    
    // إعدادات Render المحسنة
    if (isRender) {
      res.setHeader('X-Render-Cache', 'HIT');
    }
  }
}));

// Request logging middleware - محسن للإنتاج
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
    if (path.startsWith("/api") && !path.includes('/health') && !path.includes('/keep-alive')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse && !isProduction) {
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

// دالة للبحث عن منفذ متاح - محسنة لـ Render
async function findAvailablePort(startPort: number, maxPort: number = startPort + 100): Promise<number> {
  // في بيئة Render، استخدم المنفذ المحدد مباشرة
  if (isRender || isProduction) {
    log(`🎯 استخدام المنفذ المحدد للإنتاج: ${startPort}`);
    return startPort;
  }
  
  const net = await import('net');
  
  return new Promise((resolve, reject) => {
    let port = startPort;
    
    function tryPort(portToTry: number) {
      if (portToTry > maxPort) {
        reject(new Error(`لم يتم العثور على منفذ متاح بين ${String(startPort)} و ${String(maxPort)}`));
        return;
      }
      
      const server = net.createServer();
      
      server.listen(portToTry, '0.0.0.0', () => {
        server.close(() => {
          resolve(portToTry);
        });
      });
      
      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          log(`⚠️ المنفذ ${portToTry} مستخدم، جاري المحاولة مع ${portToTry + 1}`);
          tryPort(portToTry + 1);
        } else {
          reject(err);
        }
      });
    }
    
    tryPort(port);
  });
}

// دالة إغلاق آمن للخادم
function setupGracefulShutdown(httpServer: Server) {
  const shutdown = (signal: string) => {
    log(`🛑 تم استلام إشارة ${signal}، بدء الإغلاق الآمن...`);
    
    httpServer.close((err) => {
      if (err) {
        log(`❌ خطأ في إغلاق الخادم: ${err.message}`);
        process.exit(1);
      }
      
      log('✅ تم إغلاق الخادم بنجاح');
      process.exit(0);
    });
    
    // فرض الإغلاق بعد 30 ثانية
    setTimeout(() => {
      log('⏰ انتهت مهلة الإغلاق الآمن، فرض الإغلاق...');
      process.exit(1);
    }, 30000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // معالجة الأخطاء غير المتوقعة
  process.on('uncaughtException', (error) => {
    log(`❌ خطأ غير متوقع: ${error.message}`);
    log(error.stack);
    shutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    log(`❌ Promise مرفوض غير معالج: ${String(reason)}`);
    shutdown('unhandledRejection');
  });
}

(async () => {
  let httpServer: Server | null = null;
  
  try {
    // تسجيل Routes وإنشاء الخادم
    httpServer = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      log(`❌ خطأ في التطبيق: ${message} (${status})`);
      res.status(status).json({ message });
    });

    // طباعة اسم البيئة الحالية
    const currentEnv = process.env.NODE_ENV || app.get("env") || "development";
    log(`🌍 البيئة الحالية: ${currentEnv}`);

    // إعداد Vite أو الملفات الثابتة
    const fs = await import('fs');
    const pathModule = await import('path');
    const distPath = pathModule.resolve(process.cwd(), 'dist');
    
    if (fs.existsSync(distPath)) {
      log('📦 تم العثور على مجلد البناء، استخدام الملفات الثابتة');
      serveStatic(app);
    } else {
      log('🔧 بيئة التطوير، تفعيل Vite');
      await setupVite(app, httpServer);
    }

    // تشغيل migrations قاعدة البيانات
    try {
      log('🗄️ بدء تشغيل migrations قاعدة البيانات...');
      await runMigrations();
      log("✅ تم إكمال migrations قاعدة البيانات بنجاح");
    } catch (error) {
      log("⚠️ فشل في migrations، محاولة الدفع الطارئ:", error);
      try {
        await runDrizzlePush();
        log("✅ تم إكمال الدفع الطارئ لقاعدة البيانات بنجاح");
      } catch (pushError) {
        log("❌ فشل الدفع الطارئ أيضاً:", pushError);
        log("🔄 سيتم المتابعة بدون قاعدة بيانات...");
      }
    }
    
    // تهيئة قاعدة البيانات
    log('🔄 تهيئة قاعدة البيانات...');
    await initializeDatabase();
    await createDefaultUsers();
    log('✅ تم إكمال تهيئة قاعدة البيانات');

    // تحديد المنفذ المطلوب - محسن لـ Render
    const preferredPort = process.env.PORT ? Number(process.env.PORT) : (isProduction ? 10000 : 3001);
    log(`🔍 تحديد المنفذ للخادم: ${preferredPort}...`);
    
    // البحث عن منفذ متاح
    const availablePort = await findAvailablePort(preferredPort);
    
    if (availablePort !== preferredPort && !isProduction) {
      log(`⚠️ المنفذ ${preferredPort} غير متاح، سيتم استخدام ${availablePort}`);
    }

    // بدء تشغيل الخادم
    httpServer.listen(availablePort, "0.0.0.0", () => {
      log(`🚀 الخادم يعمل بنجاح على:`);
      log(`   📡 المضيف: http://localhost:${availablePort}`);
      log(`   🌐 الشبكة: http://0.0.0.0:${availablePort}`);
      log(`   🔌 Socket.IO: متاح على /socket.io/`);
      log(`   📊 صحة النظام: http://localhost:${availablePort}/api/health`);
    });
    
    // إعداد الإغلاق الآمن
    setupGracefulShutdown(httpServer);
    
    // إعداد keep-alive محسن لـ Render
    if (isRender || isProduction) {
      const keepAlive = () => {
        const host = process.env.RENDER_EXTERNAL_URL || `http://localhost:${availablePort}`;
        log(`🔄 Keep-alive ping to ${host}/api/keep-alive`);
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        fetch(`${host}/api/keep-alive`, {
          method: 'GET',
          signal: controller.signal,
        })
          .then(res => {
            clearTimeout(timeoutId);
            if (res.ok) {
              log(`✅ Keep-alive successful: ${res.status}`);
            } else {
              log(`⚠️ Keep-alive warning: ${res.status}`);
            }
          })
          .catch(err => {
            clearTimeout(timeoutId);
            log(`❌ Keep-alive failed: ${err.message}`);
          });
      };
      
      // ping كل 10 دقائق لـ Render (أكثر تكراراً)
      const keepAliveInterval = isRender ? 10 * 60 * 1000 : 14 * 60 * 1000;
      const intervalId = setInterval(keepAlive, keepAliveInterval);
      
      // تنظيف عند الإغلاق
      const cleanup = () => {
        log('🧹 تنظيف keep-alive interval');
        clearInterval(intervalId);
      };
      
      process.on('SIGTERM', cleanup);
      process.on('SIGINT', cleanup);
      
      // بدء أول ping بعد 30 ثانية في Render
      setTimeout(keepAlive, isRender ? 30000 : 60000);
      
      log(`⏰ Keep-alive مُفعّل: ping كل ${keepAliveInterval / 60000} دقيقة`);
    }
    
  } catch (error) {
    log(`❌ خطأ حرج في بدء تشغيل الخادم: ${error}`);
    
    if (httpServer) {
      httpServer.close();
    }
    
    process.exit(1);
  }
})();