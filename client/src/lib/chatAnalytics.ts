import { useState, useEffect, useCallback } from 'react';
// نظام تحليلات الشات المتقدم
export interface ChatAnalytics {
  messagesPerHour: number[];
  activeUsers: number;
  averageResponseTime: number;
  topUsers: Array<{ username: string; messageCount: number }>;
  popularWords: Array<{ word: string; count: number }>;
  userEngagement: {
    totalSessions: number;
    averageSessionDuration: number;
    bounceRate: number;
  };
}

export interface UserActivity {
  userId: number;
  username: string;
  sessionsToday: number;
  totalMessages: number;
  averageResponseTime: number;
  lastActivity: Date;
  favoriteEmojis: string[];
  activityPattern: number[]; // ساعات النشاط في اليوم
}

export class ChatAnalyticsManager {
  private messageTimestamps: number[] = [];
  private userSessions = new Map<number, { start: number; end?: number; messages: number }>();
  private responsetimes: number[] = [];
  private wordFrequency = new Map<string, number>();
  private userActivities = new Map<number, UserActivity>();
  
  // تسجيل رسالة جديدة
  recordMessage(userId: number, username: string, content: string, timestamp: Date = new Date()) {
    const now = timestamp.getTime();
    this.messageTimestamps.push(now);
    
    // تحديث نشاط المستخدم
    this.updateUserActivity(userId, username, 'message');
    
    // تحليل الكلمات
    this.analyzeWords(content);
    
    // تنظيف البيانات القديمة (أكثر من 24 ساعة)
    const dayAgo = now - (24 * 60 * 60 * 1000);
    this.messageTimestamps = this.messageTimestamps.filter(time => time > dayAgo);
  }
  
  // تسجيل جلسة مستخدم
  startUserSession(userId: number, username: string) {
    const now = Date.now();
    this.userSessions.set(userId, { start: now, messages: 0 });
    this.updateUserActivity(userId, username, 'login');
  }
  
  // انتهاء جلسة مستخدم
  endUserSession(userId: number) {
    const session = this.userSessions.get(userId);
    if (session) {
      session.end = Date.now();
      this.userSessions.set(userId, session);
    }
  }
  
  // تحديث نشاط المستخدم
  private updateUserActivity(userId: number, username: string, action: 'login' | 'message') {
    let activity = this.userActivities.get(userId);
    
    if (!activity) {
      activity = {
        userId,
        username,
        sessionsToday: 0,
        totalMessages: 0,
        averageResponseTime: 0,
        lastActivity: new Date(),
        favoriteEmojis: [],
        activityPattern: new Array(24).fill(0)
      };
    }
    
    activity.lastActivity = new Date();
    
    if (action === 'message') {
      activity.totalMessages++;
      const hour = new Date().getHours();
      activity.activityPattern[hour]++;
    } else if (action === 'login') {
      activity.sessionsToday++;
    }
    
    this.userActivities.set(userId, activity);
  }
  
  // تحليل الكلمات
  private analyzeWords(content: string) {
    const words = content
      .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, '') // إزالة الرموز
      .split(/\s+/)
      .filter(word => word.length > 2); // كلمات أطول من حرفين
    
    words.forEach(word => {
      const count = this.wordFrequency.get(word) || 0;
      this.wordFrequency.set(word, count + 1);
    });
  }
  
  // الحصول على تحليلات شاملة
  getAnalytics(): any {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    // الرسائل في الساعة الماضية
    const recentMessages = this.messageTimestamps.filter(time => time > hourAgo);
    
    // المستخدمون النشطون
    const activeUsers = Array.from(this.userActivities.values())
      .filter(user => (now - user.lastActivity.getTime()) < hourAgo).length;
    
    // متوسط وقت الاستجابة
    const avgResponseTime = this.responseTime.length > 0
      ? this.responseTime.reduce((a, b) => a + b, 0) / this.responseTime.length
      : 0;
    
    // أكثر المستخدمين نشاطاً
    const topUsers = Array.from(this.userActivities.values())
      .sort((a, b) => b.totalMessages - a.totalMessages)
      .slice(0, 10)
      .map(user => ({ username: user.username, messageCount: user.totalMessages }));
    
    // الكلمات الأكثر استخداماً
    const popularWords = Array.from(this.wordFrequency.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));
    
    // إحصائيات الجلسات
    const sessions = Array.from(this.userSessions.values());
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.end);
    const averageSessionDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.end! - s.start), 0) / completedSessions.length
      : 0;
    const bounceRate = sessions.filter(s => s.messages === 0).length / totalSessions;
    
    // الرسائل حسب الساعة (آخر 24 ساعة)
    const messagesPerHour = new Array(24).fill(0);
    const dayAgo = now - (24 * 60 * 60 * 1000);
    
    this.messageTimestamps
      .filter(time => time > dayAgo)
      .forEach(time => {
        const hour = new Date(time).getHours();
        messagesPerHour[hour]++;
      });
    
    return {
      messagesPerHour,
      activeUsers,
      averageResponseTime: avgResponseTime,
      topUsers,
      popularWords,
      userEngagement: {
        totalSessions,
        averageSessionDuration,
        bounceRate
      }
    };
  }
  
  // الحصول على نشاط مستخدم محدد
  getUserActivity(userId: number): UserActivity | null {
    return this.userActivities.get(userId) || null;
  }
  
  // تصدير البيانات
  exportData() {
    return {
      analytics: this.getAnalytics(),
      userActivities: Array.from(this.userActivities.values()),
      wordFrequency: Array.from(this.wordFrequency.entries()),
      recentSessions: Array.from(this.userSessions.entries())
    };
  }
  
  // مسح البيانات القديمة
  cleanup() {
    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    // مسح الرسائل الأقدم من أسبوع
    this.messageTimestamps = this.messageTimestamps.filter(time => time > weekAgo);
    
    // مسح الجلسات القديمة
    for (const [userId, session] of this.userSessions) {
      if (session.start < weekAgo) {
        this.userSessions.delete(userId);
      }
    }
    
    // الاحتفاظ بأكثر 1000 كلمة شائعة فقط
    if (this.wordFrequency.size > 1000) {
      const sorted = Array.from(this.wordFrequency.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 1000);
      
      this.wordFrequency.clear();
      sorted.forEach(([word, count]) => {
        this.wordFrequency.set(word, count);
      });
    }
  }
  
  private responseTime: number[] = [];
  
  // تسجيل وقت الاستجابة
  recordResponseTime(time: number) {
    this.responseTime.push(time);
    
    // الاحتفاظ بآخر 1000 وقت استجابة فقط
    if (this.responseTime.length > 1000) {
      this.responseTime = this.responseTime.slice(-1000);
    }
  }
}

// تحليلات أداء الدردشة
export class ChatAnalytics {
  private static instance: ChatAnalytics;
  private metrics = {
    messagesSent: 0,
    messagesReceived: 0,
    connectionTime: 0,
    responseTime: 0,
    errors: 0,
    userActions: new Map<string, number>(),
    performance: {
      renderTime: 0,
      memoryUsage: 0,
      networkRequests: 0
    }
  };

  private startTime = Date.now();
  private connectionStartTime = 0;

  static getInstance(): ChatAnalytics {
    if (!ChatAnalytics.instance) {
      ChatAnalytics.instance = new ChatAnalytics();
    }
    return ChatAnalytics.instance;
  }

  // تسجيل بداية الاتصال
  recordConnectionStart() {
    this.connectionStartTime = Date.now();
  }

  // تسجيل نجاح الاتصال
  recordConnectionSuccess() {
    if (this.connectionStartTime > 0) {
      this.metrics.connectionTime = Date.now() - this.connectionStartTime;
    }
  }

  // تسجيل رسالة مرسلة
  recordMessageSent() {
    this.metrics.messagesSent++;
  }

  // تسجيل رسالة مستلمة
  recordMessageReceived() {
    this.metrics.messagesReceived++;
  }

  // تسجيل خطأ
  recordError(error: string) {
    this.metrics.errors++;
    console.error('Chat Analytics Error:', error);
  }

  // تسجيل إجراء مستخدم
  recordUserAction(action: string) {
    const count = this.metrics.userActions.get(action) || 0;
    this.metrics.userActions.set(action, count + 1);
  }

  // تسجيل أداء الرسم
  recordRenderTime(time: number) {
    this.metrics.performance.renderTime = time;
  }

  // تسجيل استخدام الذاكرة
  recordMemoryUsage(usage: number) {
    this.metrics.performance.memoryUsage = usage;
  }

  // تسجيل طلب شبكة
  recordNetworkRequest() {
    this.metrics.performance.networkRequests++;
  }

  // الحصول على الإحصائيات
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const messagesPerMinute = (this.metrics.messagesSent + this.metrics.messagesReceived) / (uptime / 60000);
    
    return {
      ...this.metrics,
      uptime,
      messagesPerMinute,
      errorRate: this.metrics.errors / (this.metrics.messagesSent + this.metrics.messagesReceived) || 0,
      userActions: Object.fromEntries(this.metrics.userActions)
    };
  }

  // تصدير البيانات
  exportData() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      connectionType: (navigator as any).connection?.effectiveType || 'unknown'
    };
  }

  // إعادة تعيين الإحصائيات
  reset() {
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      connectionTime: 0,
      responseTime: 0,
      errors: 0,
      userActions: new Map<string, number>(),
      performance: {
        renderTime: 0,
        memoryUsage: 0,
        networkRequests: 0
      }
    };
    this.startTime = Date.now();
  }
}

// مدير مراقبة الأداء
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private observers: Map<string, (data: any) => void> = new Map();
  private isMonitoring = false;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // بدء المراقبة
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // مراقبة استخدام الذاكرة
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.notifyObservers('memory', {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        });
      }, 5000);
    }

    // مراقبة أداء الشبكة
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', () => {
          this.notifyObservers('network', {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt
          });
        });
      }
    }

    // مراقبة أداء الرسم
    let lastFrameTime = performance.now();
    const measureFrameTime = () => {
      const currentTime = performance.now();
      const frameTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      
      this.notifyObservers('frameTime', frameTime);
      
      if (this.isMonitoring) {
        requestAnimationFrame(measureFrameTime);
      }
    };
    
    requestAnimationFrame(measureFrameTime);
  }

  // إيقاف المراقبة
  stopMonitoring() {
    this.isMonitoring = false;
  }

  // إضافة مراقب
  addObserver(event: string, callback: (data: any) => void) {
    this.observers.set(event, callback);
  }

  // إزالة مراقب
  removeObserver(event: string) {
    this.observers.delete(event);
  }

  // إشعار المراقبين
  private notifyObservers(event: string, data: any) {
    const observer = this.observers.get(event);
    if (observer) {
      observer(data);
    }
  }
}

// مدير تحسين الأداء التلقائي
export class AutoOptimizer {
  private static instance: AutoOptimizer;
  private analytics = ChatAnalytics.getInstance();
  private monitor = PerformanceMonitor.getInstance();
  private optimizationRules = new Map<string, () => void>();

  static getInstance(): AutoOptimizer {
    if (!AutoOptimizer.instance) {
      AutoOptimizer.instance = new AutoOptimizer();
    }
    return AutoOptimizer.instance;
  }

  // إضافة قاعدة تحسين
  addOptimizationRule(name: string, rule: () => void) {
    this.optimizationRules.set(name, rule);
  }

  // تشغيل التحسينات التلقائية
  startAutoOptimization() {
    // مراقبة أداء الرسم
    this.monitor.addObserver('frameTime', (frameTime: number) => {
      if (frameTime > 16.67) { // أقل من 60fps
        this.triggerOptimization('render');
      }
    });

    // مراقبة استخدام الذاكرة
    this.monitor.addObserver('memory', (memory: any) => {
      const memoryUsage = memory.used / memory.limit;
      if (memoryUsage > 0.8) { // أكثر من 80%
        this.triggerOptimization('memory');
      }
    });

    // مراقبة الشبكة
    this.monitor.addObserver('network', (network: any) => {
      if (network.effectiveType === 'slow-2g' || network.effectiveType === '2g') {
        this.triggerOptimization('network');
      }
    });

    this.monitor.startMonitoring();
  }

  // تشغيل تحسين محدد
  private triggerOptimization(type: string) {
    const rule = this.optimizationRules.get(type);
    if (rule) {
      console.log(`🔧 تشغيل تحسين ${type}`);
      rule();
    }
  }

  // تحسينات افتراضية
  setupDefaultOptimizations() {
    // تحسين الرسم
    this.addOptimizationRule('render', () => {
      // تقليل عدد العناصر المعروضة
      const messageContainers = document.querySelectorAll('.message-container');
      if (messageContainers.length > 100) {
        // إزالة الرسائل القديمة
        const oldMessages = Array.from(messageContainers).slice(0, 50);
        oldMessages.forEach(msg => msg.remove());
      }
    });

    // تحسين الذاكرة
    this.addOptimizationRule('memory', () => {
      // تنظيف الذاكرة
      if ('gc' in window) {
        (window as any).gc();
      }
      
      // إزالة الصور غير المستخدمة
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (!img.offsetParent) {
          img.remove();
        }
      });
    });

    // تحسين الشبكة
    this.addOptimizationRule('network', () => {
      // تقليل حجم الصور
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (img.width > 300 || img.height > 300) {
          img.style.maxWidth = '300px';
          img.style.maxHeight = '300px';
        }
      });
    });
  }
}

// تصدير المدراء
export const chatAnalytics = ChatAnalytics.getInstance();
export const performanceMonitor = PerformanceMonitor.getInstance();
export const autoOptimizer = AutoOptimizer.getInstance();

// Hook لاستخدام التحليلات في React
export function useChatAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const refreshAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      // محاكاة تحميل البيانات
      await new Promise(resolve => setTimeout(resolve, 500));
      const data = chatAnalytics.getMetrics();
      setAnalytics(data);
    } catch (error) {
      console.error('خطأ في تحميل التحليلات:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    refreshAnalytics();
    
    // تحديث التحليلات كل 5 دقائق
    const interval = setInterval(refreshAnalytics, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [refreshAnalytics]);
  
  return {
    analytics,
    isLoading,
    refreshAnalytics,
    recordMessage: chatAnalytics.recordMessageSent.bind(chatAnalytics),
    startSession: chatAnalytics.recordConnectionStart.bind(chatAnalytics),
    endSession: () => {} // No end session method available
  };
}