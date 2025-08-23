import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from 'express';
import compression from 'compression';

import { initializeSystem } from './database-setup';
import { registerRoutes } from './routes';
import { setupSecurity } from './security';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { setupVite, serveStatic, log } from './vite';

import path from 'path';
import { promises as fsp } from 'fs';
import { ensureUploadDirectories } from './utils/ensure-upload-dirs';

const app = express();
try {
  (app as any).set('trust proxy', true);
} catch {}

// Hide Express signature
app.disable('x-powered-by');

// Normalize paths to avoid duplicate slashes and unintended trailing slashes
app.use((req, res, next) => {
  try {
    const originalUrl = req.originalUrl || '/';
    const [pathPart, queryPart] = originalUrl.split('?', 2);

    // Skip Socket.IO path from normalization to avoid breaking handshakes
    if (pathPart.startsWith('/socket.io')) {
      return next();
    }

    let normalizedPath = pathPart.replace(/\/{2,}/g, '/');
    if (normalizedPath.length > 1 && /\/+$/g.test(normalizedPath)) {
      normalizedPath = normalizedPath.replace(/\/+$/g, '');
    }

    if (normalizedPath !== pathPart) {
      const normalizedUrl = normalizedPath + (queryPart ? `?${queryPart}` : '');
      if (req.method === 'GET' || req.method === 'HEAD') {
        res.redirect(308, normalizedUrl);
        return;
      } else {
        req.url = normalizedUrl;
      }
    }
  } catch {}
  next();
});

// Deduplicate query params under /api to mitigate HTTP Parameter Pollution
app.use((req, _res, next) => {
  try {
    if (req.path && req.path.startsWith('/api')) {
      const query = req.query as any;
      for (const key in query) {
        const value = query[key];
        if (Array.isArray(value)) {
          query[key] = value[value.length - 1];
        }
      }
    }
  } catch {}
  next();
});

// Setup security first
setupSecurity(app);
app.use(compression({ threshold: 1024 }));

app.use(express.urlencoded({ limit: '10mb', extended: true }));

// خدمة الملفات الثابتة للصور المرفوعة - محسّنة لـ Render
const uploadsPath = path.join(process.cwd(), 'client/public/uploads');
app.use(
  '/uploads',
  async (req, res, next) => {
    try {
      // Decode and normalize path safely
      const requestPath = decodeURIComponent(req.path || '/');
      const fullPath = path.resolve(uploadsPath, '.' + requestPath);

      // Ensure path stays within uploads directory
      const withinUploads = fullPath.startsWith(path.resolve(uploadsPath + path.sep));
      const equalsUploadsIndex = fullPath === path.resolve(uploadsPath);
      if (!withinUploads && !equalsUploadsIndex) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Check existence
      try {
        await fsp.stat(fullPath);
      } catch {
        // الملف غير موجود - سنستخدم الصورة الافتراضية بصمت
        if (
          requestPath.includes('/avatars/') ||
          requestPath.includes('/profiles/') ||
          requestPath.includes('/banners/') ||
          requestPath.includes('profile-') ||
          requestPath.includes('/rooms/') ||
          requestPath.includes('/messages/') ||
          requestPath.includes('/wall/')
        ) {
          // تحديد نوع الصورة الافتراضية بناءً على المسار
          let defaultImagePath = path.join(process.cwd(), 'client/public/default_avatar.svg');
          
          if (requestPath.includes('/rooms/')) {
            // صورة افتراضية للغرف
            const defaultRoomSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#2c3e50"/>
  <rect x="20" y="30" width="60" height="40" fill="#34495e" rx="5"/>
  <circle cx="50" cy="50" r="8" fill="#ecf0f1"/>
</svg>`;
            const roomDefaultPath = path.join(process.cwd(), 'client/public/default_room.svg');
            try {
              await fsp.stat(roomDefaultPath);
            } catch {
              await fsp.writeFile(roomDefaultPath, defaultRoomSVG);
            }
            defaultImagePath = roomDefaultPath;
          } else if (requestPath.includes('/messages/')) {
            // صورة افتراضية للرسائل
            const defaultMessageSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#95a5a6"/>
  <path d="M20 30 L80 30 L80 60 L30 60 L20 70 Z" fill="#bdc3c7"/>
</svg>`;
            const messageDefaultPath = path.join(process.cwd(), 'client/public/default_message.svg');
            try {
              await fsp.stat(messageDefaultPath);
            } catch {
              await fsp.writeFile(messageDefaultPath, defaultMessageSVG);
            }
            defaultImagePath = messageDefaultPath;
          }
          
          try {
            await fsp.stat(defaultImagePath);
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return res.sendFile(defaultImagePath);
          } catch {
            const defaultSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#3c0d0d"/>
  <circle cx="50" cy="35" r="20" fill="#666"/>
  <ellipse cx="50" cy="80" rx="35" ry="25" fill="#666"/>
</svg>`;
            await fsp.writeFile(defaultImagePath, defaultSVG);
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return res.sendFile(defaultImagePath);
          }
        }
        return res.status(404).json({ error: 'File not found' });
      }

      const isAvatar = requestPath.includes('/avatars/');
      const isBanner = requestPath.includes('/banners/');
      const hasVersionParam = typeof req.query.v === 'string' && (req.query.v as string).length > 0;
      if ((isAvatar || isBanner) && hasVersionParam) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      if ((isAvatar || isBanner) && !hasVersionParam) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      }
      res.setHeader('Vary', 'Accept, Accept-Encoding');

      next();
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }
  },
  express.static(uploadsPath, {
    // إعدادات محسّنة للأداء
    maxAge: '1d', // cache لمدة يوم واحد
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // إعداد headers مناسبة للصور
      if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (filePath.endsWith('.gif')) {
        res.setHeader('Content-Type', 'image/gif');
      } else if (filePath.endsWith('.webp')) {
        res.setHeader('Content-Type', 'image/webp');
      } else if (filePath.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
      }

      // سياسة التخزين المؤقت حسب نوع المسار
      try {
        const existing = (res.getHeader('Cache-Control') as string | undefined) || '';
        const normalized = String(filePath).replace(/\\/g, '/');

        // ملفات الرسائل/الجدار/أيقونات الغرف تُرفع بأسماء فريدة => يمكن كاش دائم
        if (/\/uploads\/(wall|messages|rooms)\//.test(normalized)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('Vary', 'Accept, Accept-Encoding');
          return;
        }

        // صور الأفاتار/البانر قد تتغير على نفس المسار;
        // إن لم تُضبط immutable مسبقاً (وجود v في الـ pre-middleware)، اجبر إعادة التحقق
        if (/\/uploads\/(avatars|banners)\//.test(normalized)) {
          if (!/immutable|no-cache/i.test(existing)) {
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
          }
          res.setHeader('Vary', 'Accept, Accept-Encoding');
          return;
        }
      } catch {}
    },
  })
);

// خدمة SVG icons
const svgPath = path.join(process.cwd(), 'client/public/svgs');
app.use(
  '/svgs',
  express.static(svgPath, {
    maxAge: '7d',
    etag: true,
    setHeaders: (res) => {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=604800');
    },
  })
);

// خدمة ملفات الحائط المرفوعة (بدون بدائل)
const wallUploadsPath = path.join(process.cwd(), 'client', 'public', 'uploads', 'wall');
app.use('/uploads/wall', express.static(wallUploadsPath, { maxAge: '1d', etag: true }));

// خدمة الصور والأيقونات
app.use(
  '/icons',
  express.static(path.join(process.cwd(), 'client/public/icons'), {
    maxAge: '7d',
  })
);

// Health check endpoint - simple and fast
app.get('/health', (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  } catch {}
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// More detailed health endpoint
app.get('/api/health', async (req, res) => {
  try {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    } catch {}
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
        environment: dbStatus.environment,
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// Initialize database and start server
async function startServer() {
  const PORT = process.env.PORT || 3001;
  
  try {
    // التأكد من وجود مجلدات الرفع
    await ensureUploadDirectories();
    
    // Initialize the database system first
    const systemInitialized = await initializeSystem();

    if (systemInitialized) {
      console.log('✅ تم تهيئة النظام بنجاح');
    } else {
      console.warn('⚠️ تم بدء الخادم مع تحذيرات في تهيئة النظام');
    }

    // Register routes and get the server
    const server = await registerRoutes(app);

    // Setup client handling
    if (process.env.NODE_ENV === 'development') {
      setupVite(app, server);
    } else {
      // Serve built static files in production
      serveStatic(app);
    }

    // Start the server with retry mechanism
    const HOST = '0.0.0.0';
    
    const startListening = () => {
      return new Promise<void>((resolve, reject) => {
        const errorHandler = (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`❌ المنفذ ${PORT} مستخدم بالفعل`);
            reject(error);
          } else if (error.code === 'EACCES') {
            console.error(`❌ لا توجد صلاحيات للاستماع على المنفذ ${PORT}`);
            reject(error);
          } else {
            console.error('❌ خطأ في بدء الخادم:', error);
            reject(error);
          }
        };

        server.once('error', errorHandler);
        
        server.listen(PORT, HOST, () => {
          server.removeListener('error', errorHandler);
          const mode = process.env.NODE_ENV;
          console.log(`🚀 الخادم يعمل على http://${HOST}:${PORT} في وضع ${mode}`);
          
          if (mode === 'development') {
            console.log(`📱 رابط التطبيق: http://localhost:${PORT}`);
          } else if (process.env.RENDER_EXTERNAL_URL) {
            console.log(`🌐 رابط التطبيق: ${process.env.RENDER_EXTERNAL_URL}`);
          }
          
          resolve();
        });
      });
    };

    // محاولة بدء الخادم
    try {
      await startListening();
    } catch (error: any) {
      if (error.code === 'EADDRINUSE') {
        console.log('⏳ المنفذ مستخدم، محاولة مرة أخرى بعد 5 ثواني...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        await startListening();
      } else {
        throw error;
      }
    }

    // إظهار معلومات قاعدة البيانات
    import('./database-adapter')
      .then(({ getDatabaseStatus, checkDatabaseHealth }) => {
        try {
          const status = getDatabaseStatus();
          if (status.connected) {
            console.log('✅ قاعدة البيانات متصلة');
            // فحص صحة قاعدة البيانات بشكل دوري
            setInterval(async () => {
              const isHealthy = await checkDatabaseHealth();
              if (!isHealthy) {
                console.warn('⚠️ قاعدة البيانات غير متاحة، محاولة إعادة الاتصال...');
                const { initializeDatabase } = await import('./database-adapter');
                await initializeDatabase();
              }
            }, 30000); // كل 30 ثانية
          } else {
            console.warn('⚠️ قاعدة البيانات غير متصلة');
          }
        } catch {}
      })
      .catch(() => {});

    // API not-found and error handlers (mounted after routes)
    app.use('/api', notFoundHandler);
    app.use(errorHandler);

    // Handle graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n📥 تم استلام إشارة ${signal}، بدء الإيقاف الآمن...`);
      
      // إيقاف قبول اتصالات جديدة
      server.close(async () => {
        console.log('✅ تم إغلاق جميع الاتصالات');
        
        // إغلاق قاعدة البيانات
        try {
          const { dbAdapter } = await import('./database-adapter');
          if (dbAdapter.client) {
            await dbAdapter.client.end();
            console.log('✅ تم إغلاق اتصال قاعدة البيانات');
          }
        } catch {}
        
        process.exit(0);
      });
      
      // فرض الإيقاف بعد 10 ثواني
      setTimeout(() => {
        console.error('⚠️ فرض الإيقاف بعد انتهاء المهلة');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // معالجة الأخطاء غير المعالجة
    process.on('uncaughtException', (error) => {
      console.error('💥 خطأ غير معالج:', error);
      // لا نوقف الخادم مباشرة، نسجل الخطأ فقط
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('⚠️ Promise مرفوض غير معالج:', reason);
      // لا نوقف الخادم مباشرة، نسجل الخطأ فقط
    });

  } catch (error) {
    console.error('💥 فشل في بدء الخادم:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
