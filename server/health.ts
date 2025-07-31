
import { Request, Response } from 'express';
import { db } from './database-adapter';

export async function healthCheck(req: Request, res: Response) {
  try {
    // Check database connection
    await db.select().from(users).limit(1);
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.status(200).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
}
