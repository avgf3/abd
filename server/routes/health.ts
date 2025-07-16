import { Router } from "express";
import { checkDatabaseHealth, getDatabaseStatus } from "../db";

const router = Router();

// Basic health check
router.get("/ping", (req, res) => {
  res.json({ 
    message: "Server is running", 
    timestamp: new Date().toISOString(),
    status: "healthy",
    uptime: process.uptime()
  });
});

// Comprehensive health check including database
router.get("/health", async (req, res) => {
  try {
    const startTime = Date.now();
    const dbStatus = getDatabaseStatus();
    let dbHealthy = false;
    
    // Only check database health if connected
    if (dbStatus.connected) {
      dbHealthy = await checkDatabaseHealth();
    }
    
    const responseTime = Date.now() - startTime;
    
    const healthStatus = {
      status: dbStatus.connected && dbHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      database: {
        connected: dbStatus.connected,
        healthy: dbHealthy,
        environment: dbStatus.environment,
        url: dbStatus.url
      },
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage()
      }
    };
    
    const statusCode = healthStatus.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
      database: {
        connected: false,
        healthy: false
      }
    });
  }
});

// Database-specific health check
router.get("/db-status", async (req, res) => {
  try {
    const dbStatus = getDatabaseStatus();
    const dbHealthy = dbStatus.connected ? await checkDatabaseHealth() : false;
    
    res.json({
      connected: dbStatus.connected,
      healthy: dbHealthy,
      environment: dbStatus.environment,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Database status check error:", error);
    res.status(500).json({
      connected: false,
      healthy: false,
      error: "Database check failed",
      timestamp: new Date().toISOString()
    });
  }
});

export default router;