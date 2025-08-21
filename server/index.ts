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
import fs from 'fs';
import { promises as fsp } from 'fs';
import { Server } from 'http';

const app = express();
// Trust reverse proxy to get correct client IPs from x-forwarded-for
try {
  (app as any).set('trust proxy', true);
} catch {}

// Setup security first
setupSecurity(app);
app.use(compression({ threshold: 1024 }));

app.use(express.urlencoded({ limit: '10mb', extended: true }));

// خدمة الملفات الثابتة للصور المرفوعة - محسّنة ومُقيدة
const uploadsPath = path.join(process.cwd(), 'client/public/uploads');
const ALLOWED_UPLOAD_DIRS = new Set(['avatars', 'profiles', 'wall', 'rooms', 'banners']);
const ALLOWED_UPLOAD_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
app.use(
  '/uploads',
  async (req, res, next) => {
    const requestedPathRaw = typeof req.path === 'string' ? req.path : '';
    const requestedPath = decodeURIComponent(requestedPathRaw);

    // منع الاجتياز والتأكد من أن المسار داخل uploads
    if (requestedPath.includes('..')) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    const trimmed = requestedPath.replace(/^\/+/, '');
    const resolved = path.resolve(uploadsPath, trimmed);
    if (!resolved.startsWith(uploadsPath + path.sep)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    // السماح فقط بمجلدات معروفة وامتدادات صور آمنة
    const segments = trimmed.split('/').filter(Boolean);
    const baseDir = segments[0] || '';
    const ext = path.extname(trimmed).toLowerCase();

    if (!ALLOWED_UPLOAD_DIRS.has(baseDir) || !ALLOWED_UPLOAD_EXTS.has(ext)) {
      return res.status(404).json({ error: 'File not found' });
    }

    try {
      await fsp.stat(resolved);
    } catch {
      console.error('❌ الملف غير موجود:', resolved);

      // Return default avatar for profile images
      if (
        requestedPath.includes('profile-') ||
        requestedPath.includes('/profiles/') ||
        requestedPath.includes('/avatars/')
      ) {
        const defaultAvatarPath = path.join(process.cwd(), 'client/public/default_avatar.svg');
        try {
          await fsp.stat(defaultAvatarPath);
          return res.sendFile(defaultAvatarPath);
        } catch {}
      }

      return res.status(404).json({ error: 'File not found' });
    }

    // إذا كانت صورة أفاتار ومعها باراميتر نسخة v، فعّل كاش طويل وimmutable
    if (
      requestedPath.includes('/avatars/') &&
      typeof req.query.v === 'string' &&
      (req.query.v as string).length > 0
    ) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }

    next();
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
      }
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
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
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