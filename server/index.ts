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

// Early, lightweight health endpoint (no DB/session/compression)
app.get('/health', (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  } catch {}
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
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
// Compression with higher threshold and skip API JSON to reduce CPU under load
app.use(
  compression({
    threshold: 8192,
    filter: (req, res) => {
      try {
        if (req.path && req.path.startsWith('/api')) {
          return false;
        }
      } catch {}
      return (compression as any).filter(req, res);
    },
  })
);

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
          requestPath.includes('profile-')
        ) {
          const defaultAvatarPath = path.join(process.cwd(), 'client/public/default_avatar.svg');
          try {
            await fsp.stat(defaultAvatarPath);
            // default avatar is a static built-in asset, can be cached aggressively
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return res.sendFile(defaultAvatarPath);
          } catch {
            const defaultSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#3c0d0d"/>
  <circle cx="50" cy="35" r="20" fill="#666"/>
  <ellipse cx="50" cy="80" rx="35" ry="25" fill="#666"/>
</svg>`;
            await fsp.writeFile(defaultAvatarPath, defaultSVG);
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return res.sendFile(defaultAvatarPath);
          }
        }
        return res.status(404).json({ error: 'File not found' });
      }

      // Disable caching for every uploaded file explicitly
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Vary', 'Accept, Accept-Encoding');

      next();
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }
  },
  express.static(uploadsPath, {
    // Disable static layer caching for uploads too
    maxAge: 0,
    etag: false,
    lastModified: false,
    setHeaders: (res, filePath) => {
      // Content-Type only
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

      // Force no cache at the static layer as well
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Vary', 'Accept, Accept-Encoding');
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
  try {
    // تهيئة النظام (قاعدة البيانات + البيانات الافتراضية)
    const systemInitialized = await initializeSystem();

    if (systemInitialized) {
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
    const PORT = Number(process.env.PORT) || 5000;
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
          if (mode === 'development') {
            } else if (process.env.RENDER_EXTERNAL_URL) {
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
      // إيقاف قبول اتصالات جديدة
      server.close(async () => {
        // إغلاق قاعدة البيانات
        try {
          const { dbAdapter } = await import('./database-adapter');
          if (dbAdapter.client) {
            await dbAdapter.client.end();
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
