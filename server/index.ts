import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { Server as IOServer } from 'socket.io';
import http from 'http';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// خدمة الملفات الثابتة للصور المرفوعة
app.use('/uploads', express.static(path.join(process.cwd(), 'client/public/uploads')));

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
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
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

(async () => {
  // استخدم http.createServer لربط socket.io مع express
  const httpServer = http.createServer(app);
  const io = new IOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // مثال: استقبال اتصال جديد
  io.on('connection', (socket) => {
    console.log('🔌 مستخدم متصل عبر WebSocket');
    // يمكنك هنا إضافة منطق الدردشة الحية
    socket.on('disconnect', () => {
      console.log('❌ مستخدم قطع الاتصال');
    });
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // طباعة اسم البيئة الحالية للمعلومات فقط
  const currentEnv = process.env.NODE_ENV || app.get("env") || "undefined";
  log(`Current environment: ${currentEnv}`);

  // إذا كان مجلد البناء موجود (dist)، استخدم serveStatic، وإلا استخدم setupVite
  const fs = await import('fs');
  const path = await import('path');
  const distPath = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  // ALWAYS serve the app on port 5000
  const port = process.env.PORT ? Number(process.env.PORT) : 5000;
  httpServer.listen(port, '0.0.0.0', () => {
    log(`serving on port ${port}`);
  });
})();
