/**
 * Enhanced error monitoring and event logging system
 * Provides comprehensive tracking of database and system errors
 */

import { getCircuitBreakerStatus } from './database-timeout';

export interface ErrorEvent {
  id: string;
  timestamp: Date;
  type: 'database' | 'socket' | 'api' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
  userId?: number;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  stack?: string;
}

export interface SystemMetrics {
  timestamp: Date;
  databaseConnections: {
    active: number;
    idle: number;
    total: number;
    circuitBreakerState: string;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  errors: {
    last24h: number;
    lastHour: number;
    critical: number;
  };
}

class ErrorMonitor {
  private errors: ErrorEvent[] = [];
  private readonly maxErrors = 1000; // Keep last 1000 errors
  private readonly cleanupInterval = 60 * 60 * 1000; // 1 hour
  
  constructor() {
    // Clean up old errors periodically
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Log an error event
   */
  logError(event: Omit<ErrorEvent, 'id' | 'timestamp'>): void {
    const errorEvent: ErrorEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date()
    };

    this.errors.push(errorEvent);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log to console with appropriate level
    this.logToConsole(errorEvent);

    // Trigger alerts for critical errors
    if (errorEvent.severity === 'critical') {
      this.handleCriticalError(errorEvent);
    }
  }

  /**
   * Log database-specific errors
   */
  logDatabaseError(error: Error, context?: any): void {
    let severity: ErrorEvent['severity'] = 'medium';
    
    // Determine severity based on error type
    if (error.message.includes('Max client connections reached')) {
      severity = 'critical';
    } else if (error.message.includes('timeout')) {
      severity = 'high';
    } else if (error.message.includes('connection terminated')) {
      severity = 'high';
    }

    this.logError({
      type: 'database',
      severity,
      message: error.message,
      details: {
        stack: error.stack,
        context,
        circuitBreakerState: getCircuitBreakerStatus()
      }
    });
  }

  /**
   * Log Socket.IO errors
   */
  logSocketError(error: Error, socketId?: string, userId?: number): void {
    this.logError({
      type: 'socket',
      severity: 'medium',
      message: error.message,
      details: {
        socketId,
        stack: error.stack
      },
      userId
    });
  }

  /**
   * Log API errors
   */
  logApiError(error: Error, req?: any): void {
    let severity: ErrorEvent['severity'] = 'medium';
    
    // Determine severity
    if (error.message.includes('unauthorized') || error.message.includes('forbidden')) {
      severity = 'high'; // Security-related
    }

    this.logError({
      type: 'api',
      severity,
      message: error.message,
      details: {
        stack: error.stack
      },
      userId: req?.user?.id,
      ip: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get?.('User-Agent'),
      path: req?.path,
      method: req?.method
    });
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 50, type?: ErrorEvent['type']): ErrorEvent[] {
    let filteredErrors = this.errors;
    
    if (type) {
      filteredErrors = this.errors.filter(e => e.type === type);
    }
    
    return filteredErrors
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    last24h: number;
    lastHour: number;
  } {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let last24hCount = 0;
    let lastHourCount = 0;

    for (const error of this.errors) {
      // Count by type
      byType[error.type] = (byType[error.type] || 0) + 1;
      
      // Count by severity
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
      
      // Count recent errors
      if (error.timestamp > last24h) {
        last24hCount++;
      }
      if (error.timestamp > lastHour) {
        lastHourCount++;
      }
    }

    return {
      total: this.errors.length,
      byType,
      bySeverity,
      last24h: last24hCount,
      lastHour: lastHourCount
    };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const errorStats = this.getErrorStats();
    const circuitBreaker = getCircuitBreakerStatus();

    return {
      timestamp: new Date(),
      databaseConnections: {
        active: 0, // Would need to get from postgres client
        idle: 0,
        total: 0,
        circuitBreakerState: circuitBreaker.state
      },
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      errors: {
        last24h: errorStats.last24h,
        lastHour: errorStats.lastHour,
        critical: errorStats.bySeverity.critical || 0
      }
    };
  }

  /**
   * Clear all errors (for testing/maintenance)
   */
  clearErrors(): void {
    this.errors = [];
    console.log('🧹 Error log cleared');
  }

  private generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logToConsole(event: ErrorEvent): void {
    const prefix = this.getSeverityPrefix(event.severity);
    const context = event.userId ? ` [User: ${event.userId}]` : '';
    const location = event.path ? ` [${event.method} ${event.path}]` : '';
    
    console.error(`${prefix} [${event.type.toUpperCase()}]${context}${location} ${event.message}`);
    
    if (event.details && event.severity === 'critical') {
      console.error('Details:', event.details);
    }
  }

  private getSeverityPrefix(severity: ErrorEvent['severity']): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '❌';
      case 'medium': return '⚠️';
      case 'low': return 'ℹ️';
      default: return '❓';
    }
  }

  private handleCriticalError(event: ErrorEvent): void {
    console.error('🚨 CRITICAL ERROR DETECTED:', {
      id: event.id,
      type: event.type,
      message: event.message,
      timestamp: event.timestamp
    });

    // Here you could add integrations with:
    // - Slack/Discord notifications
    // - Email alerts
    // - External monitoring services (Sentry, DataDog, etc.)
    
    // For now, just ensure it's prominently logged
    if (event.type === 'database' && event.message.includes('Max client connections')) {
      console.error('💡 IMMEDIATE ACTION REQUIRED: Database connection pool exhausted');
      console.error('   - Check for connection leaks');
      console.error('   - Consider reducing DB_POOL_MAX');
      console.error('   - Monitor active connections');
      console.error('   - Consider implementing PgBouncer');
    }
  }

  private cleanup(): void {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const originalLength = this.errors.length;
    
    this.errors = this.errors.filter(error => error.timestamp > oneWeekAgo);
    
    if (originalLength > this.errors.length) {
      console.log(`🧹 Cleaned up ${originalLength - this.errors.length} old error logs`);
    }
  }
}

// Global error monitor instance
export const errorMonitor = new ErrorMonitor();

/**
 * Express middleware for automatic error logging
 */
export function errorLoggingMiddleware(err: any, req: any, res: any, next: any) {
  errorMonitor.logApiError(err, req);
  next(err);
}

/**
 * Wrapper for database operations with automatic error logging
 */
export function withErrorLogging<T extends (...args: any[]) => Promise<any>>(
  operation: T,
  context?: string
): T {
  return (async (...args: any[]) => {
    try {
      return await operation(...args);
    } catch (error) {
      errorMonitor.logDatabaseError(error as Error, { context, args });
      throw error;
    }
  }) as T;
}

/**
 * Log successful operations for monitoring
 */
export function logSuccess(type: string, message: string, details?: any): void {
  // For now, just log to console. Could be extended to track success metrics
  console.log(`✅ [${type.toUpperCase()}] ${message}`, details ? details : '');
}