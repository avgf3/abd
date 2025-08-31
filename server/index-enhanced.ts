import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { createServer } from 'http';

import { initializeSystem } from './database-setup';
import { registerRoutes } from './routes';
import { setupSecurity, setupHealthEndpoint, gracefulShutdown } from './security-enhanced';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { setupVite, serveStatic, log } from './vite';
import { applyServerSecurity } from './middleware/serverConfig';
import { logger } from './utils/logger';
import { setupSocketRedisAdapter } from './utils/socketRedisAdapter';
import { initializeRedis } from './utils/redis';

import path from 'path';
import { promises as fsp } from 'fs';

// إزالة استدعاء Garbage Collection اليدوي - سنعتمد على Node.js لإدارة الذاكرة
// بدلاً من ذلك، نستخدم مراقبة الذاكرة للتنبيه فقط
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const rssUsedMB = Math.round(usage.rss / 1024 / 1024);
    
    if (heapUsedMB > 300) {
      logger.warn('High memory usage detected', {
        heapUsed: `${heapUsedMB}MB`,
        rss: `${rssUsedMB}MB`
      });
    }
  }, 60000); // كل دقيقة
}

const app = express();
const server = createServer(app);

try {
  (app as any).set('trust proxy', true);
} catch {}

// Hide Express signature
app.disable('x-powered-by');

// تطبيق إعدادات الأمان والحدود على الخادم
applyServerSecurity(app, server);

// Normalize paths to avoid duplicate slashes
app.use((req, res, next) => {
  try {
    const originalUrl = req.originalUrl || '/';
    const [pathPart, queryPart] = originalUrl.split('?', 2);

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

// Setup health endpoint early
setupHealthEndpoint(app);

// Deduplicate query params
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

// Setup enhanced security
setupSecurity(app);

// Compression optimization
app.use(
  compression({
    threshold: 16384, // 16KB
    level: 6,
    filter: (req, res) => {
      try {
        if (req.path && (req.path.startsWith('/api') || req.path === '/health')) {
          return false;
        }
        if (req.path && req.path.match(/\.(jpg|jpeg|png|gif|webp|ico)$/i)) {
          return false;
        }
        const contentType = res.getHeader('Content-Type');
        if (contentType && typeof contentType === 'string') {
          return /text|javascript|json|svg|xml/.test(contentType);
        }
      } catch {}
      return (compression as any).filter(req, res);
    },
    memLevel: 8,
    strategy: 0
  })
);

// خدمة الملفات الثابتة للصور المرفوعة
const uploadsPath = path.join(process.cwd(), 'client/public/uploads');
app.use(
  '/uploads',
  async (req, res, next) => {
    try {
      const requestPath = decodeURIComponent(req.path || '/');
      const fullPath = path.resolve(uploadsPath, '.' + requestPath);

      const withinUploads = fullPath.startsWith(path.resolve(uploadsPath + path.sep));
      const equalsUploadsIndex = fullPath === path.resolve(uploadsPath);
      if (!withinUploads && !equalsUploadsIndex) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      try {
        await fsp.stat(fullPath);
      } catch {
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
  <rect width="100" height="100" fill="#ffffff"/>
  <circle cx="50" cy="35" r="20" fill="#999"/>
  <ellipse cx="50" cy="80" rx="35" ry="25" fill="#999"/>
</svg>`;
            await fsp.writeFile(defaultAvatarPath, defaultSVG);
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return res.sendFile(defaultAvatarPath);
          }
        }
        return res.status(404).json({ error: 'File not found' });
      }

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
    maxAge: 0,
    etag: false,
    lastModified: false,
    immutable: false,
    cacheControl: false,
    index: false,
    redirect: false,
    setHeaders: (res, path) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  })
);

// Main application initialization
async function initializeApp() {
  try {
    logger.info('Starting application initialization...');
    
    // Initialize Redis for sessions and caching
    const { store: sessionStore } = initializeRedis();
    
    // Initialize database and session
    const { sessionMiddleware, io } = await initializeSystem(app, server, sessionStore);
    
    // Setup Socket.IO Redis Adapter for clustering
    await setupSocketRedisAdapter(io);
    
    // Register all routes
    registerRoutes(app, io);
    
    logger.info('Application initialization completed');
  } catch (error) {
    logger.error('Failed to initialize application', error);
    process.exit(1);
  }
}

// Initialize the application
initializeApp();

// Setup error logging middleware
app.use(logger.errorLogger());

// Setup Vite in development
if (app.get('env') === 'development') {
  await setupVite(app, server);
} else {
  logger.info('Running in production mode');
  serveStatic(app);
}

// Error handling middlewares
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown handling
let isShuttingDown = false;

async function handleShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Give ongoing requests 30 seconds to complete
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
  
  // Perform cleanup
  await gracefulShutdown();
  
  process.exit(0);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  handleShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', reason as any, { promise });
  handleShutdown('unhandledRejection');
});

// Start the server
const PORT = parseInt(process.env.PORT as string) || 10000;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, {
    env: process.env.NODE_ENV,
    pid: process.pid,
    node: process.version
  });
  
  if (process.env.NODE_ENV === 'development') {
    log(`
  ➜  Local:   http://localhost:${PORT}
  ➜  API:     http://localhost:${PORT}/api
  ➜  Health:  http://localhost:${PORT}/health
    `);
  }
});