import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase, createDefaultUsers, runMigrations } from "./database-setup";
import { setupSecurity } from "./security";
import path from "path";

const app = express();

// Setup security first
setupSecurity(app);

app.use(express.urlencoded({ limit: '10mb', extended: true }));

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

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  
  // Run database migrations before starting server
  try {
    await runMigrations();
    log("✅ Database migrations completed successfully");
  } catch (error) {
    log("⚠️ Database migration failed:", error);
    // Continue server startup - fallback handling is in initializeDatabase
  }
  
  // Initialize database before starting server
  await initializeDatabase();
  await createDefaultUsers();

  const port = process.env.PORT ? Number(process.env.PORT) : 5000;
  httpServer.listen(port, "0.0.0.0", () => {
    log(`✅ السيرفر يعمل على http://localhost:${port}`);
  });
})();
