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
  getAnalytics(): ChatAnalytics {
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

// مثيل عام لمدير التحليلات
export const chatAnalytics = new ChatAnalyticsManager();

// Hook لاستخدام التحليلات في React
export function useChatAnalytics() {
  const [analytics, setAnalytics] = useState<ChatAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const refreshAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      // محاكاة تحميل البيانات
      await new Promise(resolve => setTimeout(resolve, 500));
      const data = chatAnalytics.getAnalytics();
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
    recordMessage: chatAnalytics.recordMessage.bind(chatAnalytics),
    startSession: chatAnalytics.startUserSession.bind(chatAnalytics),
    endSession: chatAnalytics.endUserSession.bind(chatAnalytics)
  };
}