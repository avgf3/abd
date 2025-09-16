/**
 * نظام إدارة الأخطاء المحسن
 * يحل مشكلة معالجة الأخطاء الضعيفة والتكرارات
 */

interface ErrorInfo {
  message: string;
  code?: string;
  timestamp: number;
  context?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorManager {
  private static instance: ErrorManager;
  private errorLog: ErrorInfo[] = [];
  private readonly MAX_ERRORS = 100;
  private readonly ERROR_THROTTLE_TIME = 5000; // 5 seconds
  private lastErrorTime: number = 0;

  private constructor() {
    // تنظيف الأخطاء القديمة كل ساعة
    setInterval(() => this.cleanupOldErrors(), 60 * 60 * 1000);
  }

  static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  /**
   * تسجيل خطأ مع معالجة محسنة
   */
  logError(error: Error | string, context?: string, severity: ErrorInfo['severity'] = 'medium'): void {
    const now = Date.now();
    
    // منع تكرار الأخطاء في فترة قصيرة
    if (now - this.lastErrorTime < this.ERROR_THROTTLE_TIME) {
      return;
    }
    
    this.lastErrorTime = now;
    
    const errorInfo: ErrorInfo = {
      message: typeof error === 'string' ? error : error.message,
      code: typeof error === 'object' && 'code' in error ? (error as any).code : undefined,
      timestamp: now,
      context,
      severity,
    };
    
    this.errorLog.push(errorInfo);
    
    // تحديد حجم السجل
    if (this.errorLog.length > this.MAX_ERRORS) {
      this.errorLog = this.errorLog.slice(-this.MAX_ERRORS);
    }
    
    // تسجيل في console فقط للأخطاء المهمة
    if (severity === 'high' || severity === 'critical') {
      console.error(`[${severity.toUpperCase()}] ${errorInfo.message}`, {
        context: errorInfo.context,
        code: errorInfo.code,
        timestamp: new Date(errorInfo.timestamp).toISOString(),
      });
    }
  }

  /**
   * معالجة أخطاء API مع إعادة المحاولة
   */
  async handleApiError(error: any, context: string, retryCount: number = 0): Promise<never> {
    const errorMessage = this.getErrorMessage(error);
    
    this.logError(errorMessage, context, 'high');
    
    // إعادة المحاولة للأخطاء المؤقتة
    if (retryCount < 3 && this.isRetryableError(error)) {
      await this.delay(1000 * (retryCount + 1)); // تأخير متزايد
      throw new Error(`إعادة المحاولة ${retryCount + 1}: ${errorMessage}`);
    }
    
    throw new Error(errorMessage);
  }

  /**
   * التحقق من إمكانية إعادة المحاولة
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    // أخطاء الشبكة
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('network')) {
      return true;
    }
    
    // أخطاء الخادم المؤقتة
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    
    // أخطاء timeout
    if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
      return true;
    }
    
    return false;
  }

  /**
   * الحصول على رسالة خطأ مفهومة
   */
  private getErrorMessage(error: any): string {
    if (!error) return 'خطأ غير معروف';
    
    if (typeof error === 'string') {
      return error;
    }
    
    if (error.message) {
      return error.message;
    }
    
    if (error.status) {
      switch (error.status) {
        case 400:
          return 'طلب غير صحيح';
        case 401:
          return 'غير مصرح بالوصول';
        case 403:
          return 'ممنوع الوصول';
        case 404:
          return 'المورد غير موجود';
        case 413:
          return 'حجم الملف كبير جداً';
        case 429:
          return 'تم تجاوز الحد المسموح من الطلبات';
        case 500:
          return 'خطأ في الخادم';
        case 502:
          return 'خطأ في البوابة';
        case 503:
          return 'الخدمة غير متاحة';
        default:
          return `خطأ في الخادم (${error.status})`;
      }
    }
    
    return 'خطأ غير معروف';
  }

  /**
   * تأخير بسيط
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * تنظيف الأخطاء القديمة
   */
  private cleanupOldErrors(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.errorLog = this.errorLog.filter(error => error.timestamp > oneHourAgo);
  }

  /**
   * الحصول على إحصائيات الأخطاء
   */
  getErrorStats(): {
    total: number;
    bySeverity: Record<string, number>;
    recent: ErrorInfo[];
  } {
    const bySeverity = this.errorLog.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const recent = this.errorLog.slice(-10); // آخر 10 أخطاء
    
    return {
      total: this.errorLog.length,
      bySeverity,
      recent,
    };
  }

  /**
   * مسح سجل الأخطاء
   */
  clearErrors(): void {
    this.errorLog = [];
  }
}

// تصدير instance واحد فقط
export const errorManager = ErrorManager.getInstance();

// تصدير دوال مساعدة للاستخدام المباشر
export const logError = (error: Error | string, context?: string, severity?: ErrorInfo['severity']): void => {
  errorManager.logError(error, context, severity);
};

export const handleApiError = (error: any, context: string, retryCount?: number): Promise<never> => {
  return errorManager.handleApiError(error, context, retryCount);
};

export const getErrorStats = () => {
  return errorManager.getErrorStats();
};