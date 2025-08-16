// مكتبة تحسين الأداء للشات
import { useCallback, useMemo, useRef, useEffect } from 'react';

import type { ChatMessage, ChatUser } from '@/types/chat';

// تحسين عرض الرسائل بـ Virtual Scrolling
export class VirtualScrollManager {
  private containerHeight = 0;
  private itemHeight = 80; // ارتفاع الرسالة المقدر
  private visibleStart = 0;
  private visibleEnd = 0;
  private totalItems = 0;
  
  constructor(containerHeight: number, itemHeight: number = 80) {
    this.containerHeight = containerHeight;
    this.itemHeight = itemHeight;
  }
  
  calculateVisibleRange(scrollTop: number, totalItems: number) {
    this.totalItems = totalItems;
    this.visibleStart = Math.floor(scrollTop / this.itemHeight);
    this.visibleEnd = Math.min(
      this.visibleStart + Math.ceil(this.containerHeight / this.itemHeight) + 1,
      totalItems
    );
    
    return {
      start: Math.max(0, this.visibleStart - 5), // buffer
      end: Math.min(totalItems, this.visibleEnd + 5)
    };
  }
  
  getScrollHeight() {
    return this.totalItems * this.itemHeight;
  }
}

// مدير ذاكرة التخزين المؤقت للرسائل
export class MessageCacheManager {
  private cache = new Map<string, ChatMessage[]>();
  private userCache = new Map<number, ChatUser>();
  private maxCacheSize = 1000;
  private accessTimes = new Map<string, number>();
  
  // تخزين الرسائل مع LRU eviction
  setMessages(key: string, messages: ChatMessage[]) {
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }
    
    this.cache.set(key, messages);
    this.accessTimes.set(key, Date.now());
  }
  
  getMessages(key: string): ChatMessage[] | null {
    const messages = this.cache.get(key);
    if (messages) {
      this.accessTimes.set(key, Date.now());
      return messages;
    }
    return null;
  }
  
  // حذف العناصر الأقل استخداماً
  private evictLeastRecentlyUsed() {
    let oldestKey = '';
    let oldestTime = Infinity;
    
    for (const [key, time] of this.accessTimes) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessTimes.delete(oldestKey);
    }
  }
  
  // تخزين بيانات المستخدمين
  setUser(userId: number, user: ChatUser) {
    this.userCache.set(userId, user);
  }
  
  getUser(userId: number): ChatUser | null {
    return this.userCache.get(userId) || null;
  }
  
  clear() {
    this.cache.clear();
    this.userCache.clear();
    this.accessTimes.clear();
  }
}

// مدير تحسين الشبكة
export class NetworkOptimizer {
  private pendingRequests = new Map<string, Promise<any>>();
  private requestQueue: Array<{ key: string; request: () => Promise<any> }> = [];
  private isProcessing = false;
  
  // منع الطلبات المتكررة
  async deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }
    
    const promise = requestFn();
    this.pendingRequests.set(key, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }
  
  // تجميع الطلبات المتتالية
  async batchRequest(key: string, requestFn: () => Promise<any>) {
    this.requestQueue.push({ key, request: requestFn });
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }
  
  private async processQueue() {
    this.isProcessing = true;
    
    // انتظار تجميع المزيد من الطلبات
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const batch = this.requestQueue.splice(0);
    const promises = batch.map(item => item.request());
    
    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('خطأ في معالجة دفعة الطلبات:', error);
    }
    
    this.isProcessing = false;
    
    // معالجة أي طلبات جديدة
    if (this.requestQueue.length > 0) {
      this.processQueue();
    }
  }
}

// Hook لتحسين عرض الرسائل
export function useOptimizedMessages(messages: ChatMessage[], containerRef: React.RefObject<HTMLElement>) {
  const cacheManager = useRef(new MessageCacheManager());
  const virtualScroll = useRef<VirtualScrollManager | null>(null);
  
  // تهيئة Virtual Scrolling
  useEffect(() => {
    if (containerRef.current) {
      const height = containerRef.current.clientHeight;
      virtualScroll.current = new VirtualScrollManager(height);
    }
  }, [containerRef]);
  
  // تجميع الرسائل حسب المرسل والوقت
  const groupedMessages = useMemo(() => {
    const groups: Array<{
      sender: ChatUser;
      messages: ChatMessage[];
      timestamp: Date;
    }> = [];
    
    let currentGroup: typeof groups[0] | null = null;
    const timeThreshold = 5 * 60 * 1000; // 5 دقائق
    
    messages.forEach(message => {
      const isSameSender =
        currentGroup && message.senderId === (currentGroup.sender?.id || currentGroup.messages[0]?.senderId);
      const isWithinTimeThreshold =
        message.timestamp && currentGroup.timestamp &&
        (new Date(message.timestamp as any).getTime() - currentGroup.timestamp.getTime()) < timeThreshold;
      
      if (isSameSender && isWithinTimeThreshold) {
        currentGroup!.messages.push(message);
      } else {
        currentGroup = {
          sender: message.sender || {
            id: message.senderId || 0,
            username: 'مستخدم محذوف',
            userType: 'guest' as const,
            role: 'guest' as const,
            gender: 'male' as const,
            profileBackgroundColor: '#3c0d0d',
            isOnline: false,
            isHidden: false,
            lastSeen: null,
            joinDate: new Date(),
            createdAt: new Date(),
            isMuted: false,
            muteExpiry: null,
            isBanned: false,
            banExpiry: null,
            isBlocked: false,
            ignoredUsers: [],
            usernameColor: '#666666',
            userTheme: 'default',
            profileEffect: 'none',
            points: 0,
            level: 1,
            totalPoints: 0,
            levelProgress: 0
          },
          messages: [message],
          timestamp: new Date(message.timestamp as any)
        };
        groups.push(currentGroup);
      }
    });
    
    return groups;
  }, [messages]);
  
  // تحسين البحث في الرسائل
  const searchMessages = useCallback((query: string) => {
    if (!query.trim()) return messages;
    
    const lowerQuery = query.toLowerCase();
    return messages.filter(message =>
      message.content.toLowerCase().includes(lowerQuery) ||
      message.sender?.username.toLowerCase().includes(lowerQuery)
    );
  }, [messages]);
  
  return {
    groupedMessages,
    searchMessages,
    cacheManager: cacheManager.current,
    virtualScroll: virtualScroll.current
  };
}

// Hook لتحسين الأداء العام
export function usePerformanceOptimization() {
  const networkOptimizer = useRef(new NetworkOptimizer());
  const renderCount = useRef(0);
  const lastRenderTime = useRef(0);
  
  // مراقبة أداء الرسوم البيانية
  useEffect(() => {
    renderCount.current++;
    const now = performance.now();
    
    if (lastRenderTime.current > 0) {
      const renderTime = now - lastRenderTime.current;
      if (renderTime > 100) { // إذا كان الرسم يستغرق أكثر من 100ms
        console.warn(`رسم بطيء: ${renderTime.toFixed(2)}ms`);
      }
    }
    
    lastRenderTime.current = now;
  });
  
  // تنظيف الذاكرة
  const cleanupMemory = useCallback(() => {
    // تنظيف event listeners العامة المعروفة إن كانت مضافة بمراجع
    // ملاحظة: لا يمكن إزالة مستمعين مجهولين الهوية؛ يجب حفظ المراجع عند الإضافة
    // هنا نكتفي بتوجيه المطوّر لاستخدام مراجع handlers وإزالتها في useEffect cleanup في أماكنها.
  }, []);
  
  return {
    networkOptimizer: networkOptimizer.current,
    renderCount: renderCount.current,
    cleanupMemory
  };
}

// مدير إشعارات متقدم
export class NotificationManager {
  private permission: NotificationPermission = 'default';
  private soundEnabled = true;
  private visualEnabled = true;
  
  async requestPermission(): Promise<boolean> {
    if ('Notification' in window) {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    }
    return false;
  }
  
  async showNotification(title: string, options: {
    body?: string;
    icon?: string;
    tag?: string;
    sound?: boolean;
    requireInteraction?: boolean;
  } = {}) {
    if (this.permission !== 'granted') {
      return false;
    }
    
    try {
      const notification = new Notification(title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: !this.soundEnabled
      });
      
      // إغلاق تلقائي بعد 5 ثوان
      setTimeout(() => notification.close(), 5000);
      
      return true;
    } catch (error) {
      console.warn('خطأ في إظهار الإشعار:', error);
      return false;
    }
  }
  
  toggleSound(enabled: boolean) {
    this.soundEnabled = enabled;
  }
  
  toggleVisual(enabled: boolean) {
    this.visualEnabled = enabled;
  }
}

export const globalNotificationManager = new NotificationManager();