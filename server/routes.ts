import type { Express } from 'express';
import { createServer, type Server } from 'http';
import apiRouter from './routes';
import { setupRealtime } from './realtime';
import { setupCompleteDownload } from './download-complete';

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount API router
  app.use('/api', apiRouter);

  // Optional utilities
  try { setupCompleteDownload(app); } catch {}

  // Create HTTP server and attach Socket.IO
  const server = createServer(app);
  const io = setupRealtime(server);
  try { (app as any).set('io', io); } catch {}

  return server;
}
