// 🚀 نظام مراقبة وتشخيص الاتصال الذكي
export class ConnectionMonitor {
  private metrics = {
    connectionAttempts: 0,
    successfulConnections: 0,
    failedConnections: 0,
    totalDisconnects: 0,
    averageLatency: 0,
    lastLatencies: [] as number[],
    connectionUptime: 0,
    lastConnectedAt: 0,
    reconnectTimes: [] as number[],
    errorHistory: [] as Array<{ timestamp: number; error: string; context: string }>,
  };

  private isMonitoring = false;
  private monitorInterval: number | null = null;

  constructor() {
    this.loadMetricsFromStorage();
  }

  // 🔥 بدء المراقبة
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    // مراقبة دورية كل 30 ثانية
    this.monitorInterval = window.setInterval(() => {
      this.updateMetrics();
      this.saveMetricsToStorage();
      this.checkConnectionHealth();
    }, 30000);
  }

  // 🔥 إيقاف المراقبة
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    }

  // 🔥 تسجيل محاولة اتصال
  recordConnectionAttempt() {
    this.metrics.connectionAttempts++;
    }

  // 🔥 تسجيل اتصال ناجح
  recordSuccessfulConnection() {
    this.metrics.successfulConnections++;
    this.metrics.lastConnectedAt = Date.now();
    const reconnectTime = Date.now();
    this.metrics.reconnectTimes.push(reconnectTime);
    
    // الاحتفاظ بآخر 10 أوقات إعادة اتصال
    if (this.metrics.reconnectTimes.length > 10) {
      this.metrics.reconnectTimes = this.metrics.reconnectTimes.slice(-10);
    }
    
    }

  // 🔥 تسجيل اتصال فاشل
  recordFailedConnection(error?: string) {
    this.metrics.failedConnections++;
    if (error) {
      this.recordError(error, 'connection_failure');
    }
    }

  // 🔥 تسجيل انقطاع
  recordDisconnection(reason?: string) {
    this.metrics.totalDisconnects++;
    if (reason) {
      this.recordError(reason, 'disconnection');
    }
    
    // حساب مدة الاتصال
    if (this.metrics.lastConnectedAt > 0) {
      const uptime = Date.now() - this.metrics.lastConnectedAt;
      this.metrics.connectionUptime += uptime;
    }
    
    }

  // 🔥 تسجيل زمن الاستجابة
  recordLatency(latency: number) {
    this.metrics.lastLatencies.push(latency);
    
    // الاحتفاظ بآخر 20 قياس
    if (this.metrics.lastLatencies.length > 20) {
      this.metrics.lastLatencies = this.metrics.lastLatencies.slice(-20);
    }
    
    // حساب المتوسط
    this.metrics.averageLatency = 
      this.metrics.lastLatencies.reduce((a, b) => a + b, 0) / this.metrics.lastLatencies.length;
  }

  // 🔥 تسجيل خطأ
  recordError(error: string, context: string) {
    this.metrics.errorHistory.push({
      timestamp: Date.now(),
      error,
      context
    });
    
    // الاحتفاظ بآخر 50 خطأ
    if (this.metrics.errorHistory.length > 50) {
      this.metrics.errorHistory = this.metrics.errorHistory.slice(-50);
    }
  }

  // 🔥 فحص صحة الاتصال
  private checkConnectionHealth() {
    const health = this.getConnectionHealth();
    
    if (health.status === 'poor') {
      console.warn('⚠️ جودة الاتصال ضعيفة:', health);
      
      // إرسال تقرير للخادم (اختياري)
      this.reportPoorConnection(health);
    } else if (health.status === 'good') {
      }
  }

  // 🔥 الحصول على تقرير صحة الاتصال
  getConnectionHealth(): {
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // فحص معدل نجاح الاتصال
    const successRate = this.metrics.connectionAttempts > 0 
      ? (this.metrics.successfulConnections / this.metrics.connectionAttempts) * 100 
      : 100;
    
    if (successRate < 50) {
      score -= 40;
      issues.push('معدل نجاح الاتصال منخفض جداً');
      recommendations.push('تحقق من اتصال الإنترنت');
    } else if (successRate < 80) {
      score -= 20;
      issues.push('معدل نجاح الاتصال منخفض');
      recommendations.push('قد تحتاج لتحسين الاتصال');
    }

    // فحص زمن الاستجابة
    if (this.metrics.averageLatency > 1000) {
      score -= 30;
      issues.push('زمن استجابة عالي جداً');
      recommendations.push('تحقق من سرعة الإنترنت');
    } else if (this.metrics.averageLatency > 500) {
      score -= 15;
      issues.push('زمن استجابة مرتفع');
      recommendations.push('قد تحتاج لشبكة أسرع');
    }

    // فحص تكرار الانقطاع
    const recentErrors = this.metrics.errorHistory.filter(
      e => Date.now() - e.timestamp < 300000 // آخر 5 دقائق
    ).length;
    
    if (recentErrors > 10) {
      score -= 25;
      issues.push('أخطاء متكررة في الاتصال');
      recommendations.push('تحقق من اتصال الإنترنت أو انتظر الاستئناف التلقائي');
    } else if (recentErrors > 5) {
      score -= 10;
      issues.push('بعض أخطاء الاتصال');
    }

    // تحديد الحالة العامة
    let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    if (score >= 90) status = 'excellent';
    else if (score >= 75) status = 'good';
    else if (score >= 60) status = 'fair';
    else if (score >= 40) status = 'poor';
    else status = 'critical';

    return { status, score, issues, recommendations };
  }

  // 🔥 الحصول على إحصائيات مفصلة
  getDetailedStats() {
    const health = this.getConnectionHealth();
    const uptime = this.metrics.lastConnectedAt > 0 
      ? Date.now() - this.metrics.lastConnectedAt 
      : 0;

    return {
      ...this.metrics,
      health,
      currentUptime: uptime,
      successRate: this.metrics.connectionAttempts > 0 
        ? (this.metrics.successfulConnections / this.metrics.connectionAttempts) * 100 
        : 100,
      recentErrors: this.metrics.errorHistory.filter(
        e => Date.now() - e.timestamp < 300000
      ).length,
    };
  }

  // 🔥 تحديث المقاييس الدورية
  private updateMetrics() {
    // تحديث مدة الاتصال الحالية
    if (this.metrics.lastConnectedAt > 0) {
      const currentUptime = Date.now() - this.metrics.lastConnectedAt;
      // لا نضيف للـ total uptime هنا، فقط عند الانقطاع
    }
  }

  // 🔥 حفظ المقاييس في localStorage
  private saveMetricsToStorage() {
    try {
      const data = {
        ...this.metrics,
        lastSaved: Date.now()
      };
      localStorage.setItem('connection_metrics', JSON.stringify(data));
    } catch (error) {
      console.warn('فشل حفظ مقاييس الاتصال:', error);
    }
  }

  // 🔥 تحميل المقاييس من localStorage
  private loadMetricsFromStorage() {
    try {
      const saved = localStorage.getItem('connection_metrics');
      if (saved) {
        const data = JSON.parse(saved);
        this.metrics = { ...this.metrics, ...data };
        }
    } catch (error) {
      console.warn('فشل تحميل مقاييس الاتصال:', error);
    }
  }

  // 🔥 إرسال تقرير الاتصال الضعيف للخادم
  private async reportPoorConnection(health: any) {
    try {
      const report = {
        timestamp: Date.now(),
        health,
        metrics: this.metrics,
        userAgent: navigator.userAgent,
        connection: (navigator as any).connection?.effectiveType || 'unknown'
      };

      // إرسال التقرير (اختياري)
      fetch('/api/connection-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      }).catch(() => {}); // تجاهل الأخطاء
    } catch {}
  }

  // 🔥 إعادة تعيين المقاييس
  reset() {
    this.metrics = {
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      totalDisconnects: 0,
      averageLatency: 0,
      lastLatencies: [],
      connectionUptime: 0,
      lastConnectedAt: 0,
      reconnectTimes: [],
      errorHistory: [],
    };
    
    try {
      localStorage.removeItem('connection_metrics');
    } catch {}
    
    }
}

// 🔥 مثيل عام للمراقب
export const connectionMonitor = new ConnectionMonitor();