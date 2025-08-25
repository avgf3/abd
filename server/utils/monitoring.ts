import os from 'os';
import { logger } from './logger';

interface SystemMetrics {
  cpu: {
    usage: number;
    count: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  process: {
    pid: number;
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
  };
  timestamp: string;
}

interface RequestMetrics {
  totalRequests: number;
  requestsPerMinute: number;
  averageResponseTime: number;
  statusCodes: Record<number, number>;
  slowestEndpoints: Array<{
    path: string;
    method: string;
    averageTime: number;
    count: number;
  }>;
}

class MonitoringService {
  private metrics: {
    requests: Map<string, { count: number; totalTime: number }>;
    statusCodes: Map<number, number>;
    requestTimes: number[];
    lastMinuteRequests: number[];
  };
  
  private intervals: {
    metrics?: NodeJS.Timeout;
    cleanup?: NodeJS.Timeout;
  } = {};

  constructor() {
    this.metrics = {
      requests: new Map(),
      statusCodes: new Map(),
      requestTimes: [],
      lastMinuteRequests: []
    };
    
    this.startMonitoring();
  }

  private startMonitoring() {
    // تسجيل المقاييس كل دقيقة
    this.intervals.metrics = setInterval(() => {
      this.logSystemMetrics();
      this.logRequestMetrics();
    }, 60000);

    // تنظيف البيانات القديمة كل 5 دقائق
    this.intervals.cleanup = setInterval(() => {
      this.cleanupOldData();
    }, 300000);

    // تسجيل المقاييس عند بدء التشغيل
    this.logSystemMetrics();
  }

  stopMonitoring() {
    if (this.intervals.metrics) {
      clearInterval(this.intervals.metrics);
    }
    if (this.intervals.cleanup) {
      clearInterval(this.intervals.cleanup);
    }
  }

  getSystemMetrics(): SystemMetrics {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // حساب استخدام CPU
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const cpuUsage = 100 - ~~(100 * totalIdle / totalTick);
    
    return {
      cpu: {
        usage: cpuUsage,
        count: cpus.length,
        loadAverage: os.loadavg()
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usage: (usedMemory / totalMemory) * 100
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      },
      timestamp: new Date().toISOString()
    };
  }

  recordRequest(method: string, path: string, statusCode: number, responseTime: number) {
    // تسجيل endpoint
    const key = `${method} ${path}`;
    const endpoint = this.metrics.requests.get(key) || { count: 0, totalTime: 0 };
    endpoint.count++;
    endpoint.totalTime += responseTime;
    this.metrics.requests.set(key, endpoint);
    
    // تسجيل status code
    const currentCount = this.metrics.statusCodes.get(statusCode) || 0;
    this.metrics.statusCodes.set(statusCode, currentCount + 1);
    
    // تسجيل وقت الاستجابة
    this.metrics.requestTimes.push(responseTime);
    
    // تسجيل الطلبات في الدقيقة الأخيرة
    const now = Date.now();
    this.metrics.lastMinuteRequests.push(now);
  }

  getRequestMetrics(): RequestMetrics {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // حساب الطلبات في الدقيقة الأخيرة
    this.metrics.lastMinuteRequests = this.metrics.lastMinuteRequests.filter(
      time => time > oneMinuteAgo
    );
    
    // حساب متوسط وقت الاستجابة
    const avgResponseTime = this.metrics.requestTimes.length > 0
      ? this.metrics.requestTimes.reduce((a, b) => a + b, 0) / this.metrics.requestTimes.length
      : 0;
    
    // جمع أبطأ endpoints
    const slowestEndpoints = Array.from(this.metrics.requests.entries())
      .map(([key, data]) => {
        const [method, ...pathParts] = key.split(' ');
        return {
          method,
          path: pathParts.join(' '),
          averageTime: data.totalTime / data.count,
          count: data.count
        };
      })
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);
    
    // تحويل status codes إلى object
    const statusCodes: Record<number, number> = {};
    this.metrics.statusCodes.forEach((count, code) => {
      statusCodes[code] = count;
    });
    
    return {
      totalRequests: this.metrics.requestTimes.length,
      requestsPerMinute: this.metrics.lastMinuteRequests.length,
      averageResponseTime: Math.round(avgResponseTime),
      statusCodes,
      slowestEndpoints
    };
  }

  private logSystemMetrics() {
    const metrics = this.getSystemMetrics();
    
    logger.info('System Metrics', {
      cpu: {
        usage: `${metrics.cpu.usage}%`,
        loadAverage: metrics.cpu.loadAverage.map(l => l.toFixed(2))
      },
      memory: {
        usage: `${metrics.memory.usage.toFixed(2)}%`,
        used: `${(metrics.memory.used / 1024 / 1024 / 1024).toFixed(2)}GB`,
        free: `${(metrics.memory.free / 1024 / 1024 / 1024).toFixed(2)}GB`
      },
      process: {
        uptime: `${Math.floor(metrics.process.uptime / 60)}m`,
        memory: {
          rss: `${(metrics.process.memory.rss / 1024 / 1024).toFixed(2)}MB`,
          heapUsed: `${(metrics.process.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`
        }
      }
    });
  }

  private logRequestMetrics() {
    const metrics = this.getRequestMetrics();
    
    if (metrics.totalRequests > 0) {
      logger.info('Request Metrics', {
        total: metrics.totalRequests,
        rpm: metrics.requestsPerMinute,
        avgResponseTime: `${metrics.averageResponseTime}ms`,
        statusCodes: metrics.statusCodes,
        slowestEndpoints: metrics.slowestEndpoints.slice(0, 3).map(e => ({
          endpoint: `${e.method} ${e.path}`,
          avgTime: `${Math.round(e.averageTime)}ms`,
          count: e.count
        }))
      });
    }
  }

  private cleanupOldData() {
    // الاحتفاظ بآخر 1000 وقت استجابة فقط
    if (this.metrics.requestTimes.length > 1000) {
      this.metrics.requestTimes = this.metrics.requestTimes.slice(-1000);
    }
    
    // تنظيف endpoints التي لم يتم استخدامها مؤخرًا
    const threshold = 100;
    this.metrics.requests.forEach((data, key) => {
      if (data.count > threshold) {
        // إعادة تعيين العدادات للـ endpoints النشطة
        data.count = Math.floor(data.count / 2);
        data.totalTime = Math.floor(data.totalTime / 2);
      }
    });
  }

  // Express middleware
  middleware() {
    return (req: any, res: any, next: any) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const responseTime = Date.now() - start;
        this.recordRequest(
          req.method,
          req.route?.path || req.path,
          res.statusCode,
          responseTime
        );
      });
      
      next();
    };
  }

  // Health check endpoint data
  getHealthData() {
    const systemMetrics = this.getSystemMetrics();
    const requestMetrics = this.getRequestMetrics();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      system: {
        cpu: systemMetrics.cpu,
        memory: {
          usage: `${systemMetrics.memory.usage.toFixed(2)}%`,
          free: `${(systemMetrics.memory.free / 1024 / 1024 / 1024).toFixed(2)}GB`
        }
      },
      requests: {
        total: requestMetrics.totalRequests,
        rpm: requestMetrics.requestsPerMinute,
        avgResponseTime: `${requestMetrics.averageResponseTime}ms`
      },
      process: {
        pid: process.pid,
        memory: {
          heapUsed: `${(systemMetrics.process.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          rss: `${(systemMetrics.process.memory.rss / 1024 / 1024).toFixed(2)}MB`
        }
      }
    };
  }
}

// Create singleton instance
export const monitoring = new MonitoringService();

// Graceful shutdown
process.on('SIGTERM', () => {
  monitoring.stopMonitoring();
});

process.on('SIGINT', () => {
  monitoring.stopMonitoring();
});