import { createServer, type Server } from 'http';
import type { Express } from 'express';

// Import route modules
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import roomRoutes from './routes/rooms';
import messageRoutes from './routes/messages';
import privateMessageRoutes from './routes/privateMessages';
import friendRoutes from './routes/friends';
import moderationRoutes from './routes/moderation';
import uploadRoutes from './routes/uploads';

// Import other dependencies
import { setupDownloadRoute } from './download-route';
import securityApiRoutes from './api-security';
import { developmentOnly, logDevelopmentEndpoint } from './middleware/development';
import { databaseCleanup } from './utils/database-cleanup';

export async function registerRoutes(app: Express, server?: Server) {
  // Register API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/private-messages', privateMessageRoutes);
  app.use('/api/friends', friendRoutes);
  app.use('/api/moderation', moderationRoutes);
  app.use('/api/upload', uploadRoutes);
  
  // Register security routes
  app.use('/api/security', securityApiRoutes);
  
  // Setup download route
  setupDownloadRoute(app);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Session check endpoint
  app.get('/api/session', (req, res) => {
    if (req.session.userId) {
      res.json({ authenticated: true, userId: req.session.userId });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Database cleanup endpoint (development only)
  app.post('/api/cleanup', developmentOnly, async (req, res) => {
    logDevelopmentEndpoint('/api/cleanup');
    try {
      const results = await databaseCleanup.runCleanup();
      res.json({ success: true, results });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في تنظيف قاعدة البيانات' });
    }
  });

  return server;
}
