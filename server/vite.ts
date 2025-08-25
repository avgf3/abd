import fs from 'fs';
import { type Server } from 'http';
import path from 'path';

import express, { type Express } from 'express';
import { nanoid } from 'nanoid';

// استخدام نظام التسجيل الموحد من logger.ts
import { log as logger } from './utils/logger';

export function log(message: string, source = 'express') {
  logger.info(`[${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  // Dynamically import the Vite API only when needed (development)
  const { createServer: createViteServer, createLogger } = await import('vite');
  const viteLogger = createLogger();

  // Dynamically import the Vite config only in development to avoid evaluating it in production
  let viteUserConfig: any = {};
  try {
    const module = await import(new URL('../vite.config.ts', import.meta.url).href);
    viteUserConfig = module.default || {};
  } catch {
    viteUserConfig = {};
  }

  const vite = await createViteServer({
    ...viteUserConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: 'custom',
  });

  app.use(vite.middlewares);
  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(import.meta.dirname, '..', 'client', 'index.html');

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, 'utf-8');
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);
      const page = await vite.transformIndexHtml(url, template);
      res
        .status(200)
        .set({
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, must-revalidate',
          Vary: 'Accept, Accept-Encoding'
        })
        .end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), 'dist/public');

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(
    express.static(distPath, {
      etag: true,
      lastModified: true,
      maxAge: '7d',
      setHeaders: (res, filePath) => {
        // Aggressive caching for hashed assets
        if (
          /\.(?:js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp)$/i.test(filePath) &&
          /assets\//.test(filePath)
        ) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('Vary', 'Accept, Accept-Encoding');
        }
      },
    })
  );

  // fall through to index.html if the file doesn't exist (exclude API)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    next();
  });
  app.use('*', (_req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } catch {}
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}
