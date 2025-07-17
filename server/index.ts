import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";

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
  const httpServer = await registerRoutes(app);

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
    await setupVite(app, httpServer);
  }

  // إنشاء خادم Socket.IO - إعدادات محسنة للإنتاج
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ["https://abd-gmva.onrender.com"]
        : ["http://localhost:5000", "http://localhost:3000", "http://127.0.0.1:5000"],
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true
    },
    allowEIO3: true,
    // ترتيب النقل: polling أولاً للاستقرار
    transports: ['polling', 'websocket'],
    // قيم مناسبة للـ free tier في Render
    pingTimeout: 30000,  // 30 ثانية بدلاً من 60
    pingInterval: 15000, // 15 ثانية بدلاً من 25
    upgradeTimeout: 10000, // timeout للـ WebSocket upgrade
    maxHttpBufferSize: 1e6, // 1MB حد أقصى
    // إعدادات إضافية للاستقرار
    connectTimeout: 30000,
    serveClient: true,
    // Cookie settings للـ sticky sessions
    cookie: {
      name: "io",
      httpOnly: true,
      sameSite: "strict"
    }
  });

  // Socket.IO connection handling
  io.on("connection", (socket) => {
    console.log(`✅ Socket.IO: اتصال جديد - ${socket.id}`);
    console.log(`📍 من: ${socket.handshake.address}`);
    console.log(`🌐 User-Agent: ${socket.handshake.headers['user-agent']}`);

    socket.on("chat message", (msg) => {
      io.emit("chat message", msg); // بث لجميع المستخدمين
    });

    socket.on("disconnect", (reason) => {
      console.log(`❌ Socket.IO: انقطاع الاتصال - ${socket.id} - السبب: ${reason}`);
    });
    
    socket.on("error", (error) => {
      console.error(`🚨 Socket.IO خطأ - ${socket.id}:`, error);
    });
  });

  // إضافة معالجة أخطاء عامة
  io.engine.on("connection_error", (err) => {
    console.error("🚨 Socket.IO Engine خطأ اتصال:", {
      message: err.message,
      description: err.description,
      context: err.context,
      type: err.type
    });
  });

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT ? Number(process.env.PORT) : 5000;
  httpServer.listen(port, "0.0.0.0", () => {
    log(`✅ السيرفر يعمل على http://localhost:${port}`);
  });
})();
