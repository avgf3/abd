/**
 * نظام مراقبة وتسجيل شامل لتتبع أداء التطبيق
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

interface ErrorLog {
  message: string;
  stack?: string;
  context?: any;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface UserAction {
  action: string;
  details?: any;
  timestamp: number;
}

interface SystemHealth {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    online: boolean;
    latency?: number;
    lastError?: string;
  };
  socket: {
    connected: boolean;
    reconnectAttempts: number;
    lastDisconnect?: number;
  };
  uploads: {
    total: number;
    successful: number;
    failed: number;
    averageTime?: number;
  };
}

export class MonitoringSystem {
  private static instance: MonitoringSystem;
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorLog[] = [];
  private userActions: UserAction[] = [];
  private uploadMetrics = {
    total: 0,
    successful: 0,
    failed: 0,
    times: [] as number[]
  };
  private maxLogs = 1000; // الحد الأقصى للسجلات في الذاكرة

  private constructor() {
    this.setupGlobalErrorHandlers();
    this.startNetworkMonitoring();
  }

  static getInstance(): MonitoringSystem {
    if (!MonitoringSystem.instance) {
      MonitoringSystem.instance = new MonitoringSystem();
    }
    return MonitoringSystem.instance;
  }

  /**
   * إعداد معالجات الأخطاء العامة
   */
  private setupGlobalErrorHandlers(): void {
    // معالج الأخطاء غير المعالجة
    window.addEventListener('error', (event) => {
      this.logError({
        message: event.message,
        stack: event.error?.stack,
        context: {
          filename: event.filename,
          line: event.lineno,
          column: event.colno
        },
        severity: 'high'
      });
    });

    // معالج رفض Promise غير المعالج
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        severity: 'high'
      });
    });
  }

  /**
   * مراقبة حالة الشبكة
   */
  private startNetworkMonitoring(): void {
    // مراقبة حالة الاتصال
    window.addEventListener('online', () => {
      this.logMetric('network_status', 1, 'boolean');
    });

    window.addEventListener('offline', () => {
      this.logMetric('network_status', 0, 'boolean');
      this.logError({
        message: 'فقدان الاتصال بالإنترنت',
        severity: 'high'
      });
    });

    // قياس سرعة الاتصال دورياً
    setInterval(() => {
      this.measureNetworkLatency();
    }, 60000); // كل دقيقة
  }

  /**
   * قياس تأخير الشبكة
   */
  private async measureNetworkLatency(): Promise<void> {
    const start = performance.now();
    
    try {
      await fetch('/api/ping', { method: 'HEAD' });
      const latency = performance.now() - start;
      this.logMetric('network_latency', latency, 'ms');
    } catch (error) {
      this.logError({
        message: 'فشل قياس تأخير الشبكة',
        severity: 'low'
      });
    }
  }

  /**
   * تسجيل metric أداء
   */
  logMetric(name: string, value: number, unit: string = ''): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now()
    };

    this.metrics.push(metric);
    
    // تنظيف القديم
    if (this.metrics.length > this.maxLogs) {
      this.metrics = this.metrics.slice(-this.maxLogs);
    }

    // طباعة في وضع التطوير
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Metric: ${name} = ${value}${unit}`);
    }
  }

  /**
   * تسجيل خطأ
   */
  logError(error: Omit<ErrorLog, 'timestamp'>): void {
    const errorLog: ErrorLog = {
      ...error,
      timestamp: Date.now()
    };

    this.errors.push(errorLog);
    
    // تنظيف القديم
    if (this.errors.length > this.maxLogs) {
      this.errors = this.errors.slice(-this.maxLogs);
    }

    // طباعة الخطأ
    console.error(`🚨 Error [${error.severity}]:`, error.message, error.context);

    // إرسال للخادم في حالة الأخطاء الحرجة
    if (error.severity === 'critical' || error.severity === 'high') {
      this.sendErrorToServer(errorLog);
    }
  }

  /**
   * تسجيل إجراء مستخدم
   */
  logUserAction(action: string, details?: any): void {
    const userAction: UserAction = {
      action,
      details,
      timestamp: Date.now()
    };

    this.userActions.push(userAction);
    
    // تنظيف القديم
    if (this.userActions.length > this.maxLogs) {
      this.userActions = this.userActions.slice(-this.maxLogs);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`👤 User Action: ${action}`, details);
    }
  }

  /**
   * تسجيل محاولة رفع ملف
   */
  logUploadAttempt(success: boolean, duration?: number): void {
    this.uploadMetrics.total++;
    
    if (success) {
      this.uploadMetrics.successful++;
      if (duration) {
        this.uploadMetrics.times.push(duration);
        // الاحتفاظ بآخر 100 وقت فقط
        if (this.uploadMetrics.times.length > 100) {
          this.uploadMetrics.times.shift();
        }
      }
    } else {
      this.uploadMetrics.failed++;
    }

    // حساب معدل النجاح
    const successRate = this.uploadMetrics.successful / this.uploadMetrics.total;
    this.logMetric('upload_success_rate', successRate * 100, '%');

    // تحذير إذا كان معدل الفشل عالي
    if (successRate < 0.8 && this.uploadMetrics.total > 10) {
      this.logError({
        message: `معدل فشل رفع الملفات عالي: ${((1 - successRate) * 100).toFixed(1)}%`,
        severity: 'medium',
        context: this.uploadMetrics
      });
    }
  }

  /**
   * الحصول على صحة النظام
   */
  getSystemHealth(): SystemHealth {
    const memoryInfo = this.getMemoryInfo();
    const averageUploadTime = this.uploadMetrics.times.length > 0
      ? this.uploadMetrics.times.reduce((a, b) => a + b, 0) / this.uploadMetrics.times.length
      : undefined;

    return {
      memory: memoryInfo,
      network: {
        online: navigator.onLine,
        latency: this.getLatestMetric('network_latency')?.value,
        lastError: this.getLatestNetworkError()
      },
      socket: {
        connected: this.getLatestMetric('socket_connected')?.value === 1,
        reconnectAttempts: this.getLatestMetric('socket_reconnect_attempts')?.value || 0,
        lastDisconnect: this.getLatestMetric('socket_disconnect_time')?.value
      },
      uploads: {
        total: this.uploadMetrics.total,
        successful: this.uploadMetrics.successful,
        failed: this.uploadMetrics.failed,
        averageTime: averageUploadTime
      }
    };
  }

  /**
   * الحصول على معلومات الذاكرة
   */
  private getMemoryInfo(): SystemHealth['memory'] {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      return {
        used: memInfo.usedJSHeapSize,
        total: memInfo.jsHeapSizeLimit,
        percentage: (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100
      };
    }
    
    return {
      used: 0,
      total: 0,
      percentage: 0
    };
  }

  /**
   * الحصول على آخر metric
   */
  private getLatestMetric(name: string): PerformanceMetric | undefined {
    for (let i = this.metrics.length - 1; i >= 0; i--) {
      if (this.metrics[i].name === name) {
        return this.metrics[i];
      }
    }
    return undefined;
  }

  /**
   * الحصول على آخر خطأ شبكة
   */
  private getLatestNetworkError(): string | undefined {
    for (let i = this.errors.length - 1; i >= 0; i--) {
      if (this.errors[i].message.includes('شبكة') || 
          this.errors[i].message.includes('اتصال')) {
        return this.errors[i].message;
      }
    }
    return undefined;
  }

  /**
   * إرسال الخطأ للخادم
   */
  private async sendErrorToServer(error: ErrorLog): Promise<void> {
    try {
      await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...error,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date(error.timestamp).toISOString()
        })
      });
    } catch (err) {
      console.error('Failed to send error to server:', err);
    }
  }

  /**
   * تصدير التقرير الكامل
   */
  exportReport(): {
    health: SystemHealth;
    recentErrors: ErrorLog[];
    recentActions: UserAction[];
    performanceMetrics: Record<string, number>;
  } {
    const health = this.getSystemHealth();
    const recentErrors = this.errors.slice(-50);
    const recentActions = this.userActions.slice(-50);
    
    // تجميع metrics الأداء
    const performanceMetrics: Record<string, number> = {};
    const metricGroups = new Map<string, number[]>();
    
    this.metrics.forEach(metric => {
      if (!metricGroups.has(metric.name)) {
        metricGroups.set(metric.name, []);
      }
      metricGroups.get(metric.name)!.push(metric.value);
    });
    
    // حساب المتوسط لكل metric
    metricGroups.forEach((values, name) => {
      performanceMetrics[name] = values.reduce((a, b) => a + b, 0) / values.length;
    });

    return {
      health,
      recentErrors,
      recentActions,
      performanceMetrics
    };
  }

  /**
   * مسح جميع السجلات
   */
  clearLogs(): void {
    this.metrics = [];
    this.errors = [];
    this.userActions = [];
  }
}

/**
 * Hook لاستخدام نظام المراقبة
 */
import { useCallback } from 'react';

export function useMonitoring() {
  const monitoring = MonitoringSystem.getInstance();

  const logMetric = useCallback((name: string, value: number, unit?: string) => {
    monitoring.logMetric(name, value, unit);
  }, [monitoring]);

  const logError = useCallback((error: Omit<ErrorLog, 'timestamp'>) => {
    monitoring.logError(error);
  }, [monitoring]);

  const logUserAction = useCallback((action: string, details?: any) => {
    monitoring.logUserAction(action, details);
  }, [monitoring]);

  const logUploadAttempt = useCallback((success: boolean, duration?: number) => {
    monitoring.logUploadAttempt(success, duration);
  }, [monitoring]);

  const getSystemHealth = useCallback(() => {
    return monitoring.getSystemHealth();
  }, [monitoring]);

  return {
    logMetric,
    logError,
    logUserAction,
    logUploadAttempt,
    getSystemHealth,
    monitoring
  };
}

// بدء نظام المراقبة تلقائياً
if (typeof window !== 'undefined') {
  MonitoringSystem.getInstance();
}