import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
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
          requestPath.includes('profile-')
        ) {
          const defaultAvatarPath = path.join(process.cwd(), 'client/public/default_avatar.svg');
          try {
            await fsp.stat(defaultAvatarPath);
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

    // Start the server
    const PORT = Number(process.env.PORT) || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      const mode = process.env.NODE_ENV;
      log(`🚀 الخادم يعمل على المنفذ ${PORT} في وضع ${mode}`);

      if (mode === 'development') {
        log(`📱 رابط التطبيق: http://localhost:${PORT}`);
      }

      // إظهار معلومات قاعدة البيانات (اختياري)
      import('./database-adapter')
        .then(({ getDatabaseStatus }) => {
          try {
            getDatabaseStatus();
          } catch {}
        })
        .catch(() => {});
    });

    // API not-found and error handlers (mounted after routes)
    app.use('/api', notFoundHandler);
    app.use(errorHandler);

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
