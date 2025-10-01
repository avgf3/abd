/**
 * Monitoring and health check routes
 * Provides system status, error logs, and database health information
 */

import { Router, Request, Response } from 'express';
import { errorMonitor } from '../utils/error-monitoring';
import { getCircuitBreakerStatus, resetCircuitBreaker } from '../utils/database-timeout';
import { checkDatabaseHealth, getDatabaseStatus } from '../database-adapter';

const router = Router();

/**
 * GET /api/monitoring/health
 * Basic health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const circuitBreaker = getCircuitBreakerStatus();
    const dbStatus = getDatabaseStatus();
    const dbHealthy = await checkDatabaseHealth();
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: dbStatus.connected,
        healthy: dbHealthy,
        type: dbStatus.type,
        circuitBreakerState: circuitBreaker.state
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
      }
    };

    // Set status based on critical systems
    if (!dbHealthy || !circuitBreaker.isHealthy) {
      health.status = 'degraded';
      res.status(503);
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/errors
 * Get recent error logs (requires admin access)
 */
router.get('/errors', (req: Request, res: Response) => {
  try {
    // In a real app, you'd check for admin permissions here
    // if (!req.user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const limit = parseInt(req.query.limit as string) || 50;
    const type = req.query.type as string;
    
    const errors = errorMonitor.getRecentErrors(limit, type as any);
    const stats = errorMonitor.getErrorStats();

    res.json({
      errors,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve error logs',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/stats
 * Get system statistics and metrics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const circuitBreaker = getCircuitBreakerStatus();
    const dbStatus = getDatabaseStatus();
    const errorStats = errorMonitor.getErrorStats();
    const memUsage = process.memoryUsage();

    const stats = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        circuitBreaker,
        healthy: await checkDatabaseHealth()
      },
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      errors: errorStats,
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve system stats',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/monitoring/circuit-breaker/reset
 * Manually reset the circuit breaker (admin only)
 */
router.post('/circuit-breaker/reset', (req: Request, res: Response) => {
  try {
    // In a real app, you'd check for admin permissions here
    // if (!req.user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const beforeState = getCircuitBreakerStatus();
    resetCircuitBreaker();
    const afterState = getCircuitBreakerStatus();

    res.json({
      message: 'Circuit breaker reset successfully',
      before: beforeState,
      after: afterState,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to reset circuit breaker',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/monitoring/errors
 * Clear error logs (admin only)
 */
router.delete('/errors', (req: Request, res: Response) => {
  try {
    // In a real app, you'd check for admin permissions here
    // if (!req.user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });

    errorMonitor.clearErrors();

    res.json({
      message: 'Error logs cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear error logs',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/database
 * Detailed database connection information
 */
router.get('/database', async (req: Request, res: Response) => {
  try {
    const dbStatus = getDatabaseStatus();
    const circuitBreaker = getCircuitBreakerStatus();
    const isHealthy = await checkDatabaseHealth();

    const databaseInfo = {
      status: dbStatus,
      healthy: isHealthy,
      circuitBreaker,
      connectionPool: {
        // These would need to be implemented to get actual pool stats
        active: 'N/A',
        idle: 'N/A',
        total: 'N/A'
      },
      lastHealthCheck: new Date().toISOString()
    };

    res.json(databaseInfo);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve database information',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;