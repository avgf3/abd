/**
 * محسن خاصية آخر تواجد - حل مشاكل التحديثات المتكررة وعدم الدقة
 * Last Seen Optimizer - Fixes repeated updates and accuracy issues
 */

import { ChatUser } from '@/types/chat';

// ثوابت للتحكم في تحديثات آخر تواجد
const LAST_SEEN_UPDATE_INTERVAL = 30000; // 30 ثانية بين التحديثات
const LAST_SEEN_CACHE_DURATION = 60000; // دقيقة واحدة للكاش
const LAST_SEEN_THROTTLE_MS = 5000; // 5 ثواني لمنع التحديثات السريعة

// واجهة لتتبع تحديثات آخر تواجد
interface LastSeenTracker {
  lastUpdates: Map<number, number>; // userId -> timestamp
  pendingUpdates: Set<number>; // userIds with pending updates
  updateQueue: Map<number, () => Promise<void>>; // userId -> update function
}

// متغيرات عامة لتتبع تحديثات آخر تواجد
const lastSeenTracker: LastSeenTracker = {
  lastUpdates: new Map(),
  pendingUpdates: new Set(),
  updateQueue: new Map(),
};

/**
 * فحص ما إذا كان يمكن تحديث آخر تواجد
 */
export function canUpdateLastSeen(userId: number): boolean {
  const now = Date.now();
  const lastUpdate = lastSeenTracker.lastUpdates.get(userId) || 0;
  
  // منع التحديثات المتكررة
  if (lastSeenTracker.pendingUpdates.has(userId)) {
    return false;
  }
  
  // منع التحديثات السريعة جداً
  if (now - lastUpdate < LAST_SEEN_THROTTLE_MS) {
    return false;
  }
  
  return true;
}

/**
 * تسجيل بداية تحديث آخر تواجد
 */
export function startLastSeenUpdate(userId: number): void {
  lastSeenTracker.pendingUpdates.add(userId);
  lastSeenTracker.lastUpdates.set(userId, Date.now());
}

/**
 * تسجيل انتهاء تحديث آخر تواجد
 */
export function endLastSeenUpdate(userId: number): void {
  lastSeenTracker.pendingUpdates.delete(userId);
}

/**
 * إضافة تحديث آخر تواجد للطابور
 */
export function queueLastSeenUpdate(
  userId: number, 
  updateFn: () => Promise<void>
): void {
  // إذا كان هناك تحديث معلق، أضفه للطابور
  if (lastSeenTracker.pendingUpdates.has(userId)) {
    lastSeenTracker.updateQueue.set(userId, updateFn);
    return;
  }
  
  // تنفيذ التحديث فوراً
  executeLastSeenUpdate(userId, updateFn);
}

/**
 * تنفيذ تحديث آخر تواجد
 */
async function executeLastSeenUpdate(
  userId: number, 
  updateFn: () => Promise<void>
): Promise<void> {
  if (!canUpdateLastSeen(userId)) {
    return;
  }
  
  startLastSeenUpdate(userId);
  
  try {
    await updateFn();
  } finally {
    endLastSeenUpdate(userId);
    
    // تنفيذ التحديثات المعلقة
    const queuedUpdate = lastSeenTracker.updateQueue.get(userId);
    if (queuedUpdate) {
      lastSeenTracker.updateQueue.delete(userId);
      // تنفيذ التحديث المعلق بعد تأخير قصير
      setTimeout(() => {
        executeLastSeenUpdate(userId, queuedUpdate);
      }, LAST_SEEN_THROTTLE_MS);
    }
  }
}

/**
 * محسن آخر تواجد
 */
export class LastSeenOptimizer {
  private static instance: LastSeenOptimizer;
  private lastSeenCache = new Map<number, { lastSeen: Date; timestamp: number }>();
  private updatePromises = new Map<number, Promise<void>>();
  private updateInterval: NodeJS.Timeout | null = null;

  static getInstance(): LastSeenOptimizer {
    if (!LastSeenOptimizer.instance) {
      LastSeenOptimizer.instance = new LastSeenOptimizer();
    }
    return LastSeenOptimizer.instance;
  }

  /**
   * بدء التحديثات الدورية
   */
  startPeriodicUpdates(): void {
    if (this.updateInterval) {
      return;
    }
    
    this.updateInterval = setInterval(() => {
      this.cleanupExpiredCache();
    }, LAST_SEEN_UPDATE_INTERVAL);
  }

  /**
   * إيقاف التحديثات الدورية
   */
  stopPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * الحصول على آخر تواجد من الكاش
   */
  getCachedLastSeen(userId: number): Date | null {
    const cached = this.lastSeenCache.get(userId);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > LAST_SEEN_CACHE_DURATION) {
      this.lastSeenCache.delete(userId);
      return null;
    }
    
    return cached.lastSeen;
  }

  /**
   * حفظ آخر تواجد في الكاش
   */
  setCachedLastSeen(userId: number, lastSeen: Date): void {
    this.lastSeenCache.set(userId, {
      lastSeen: new Date(lastSeen),
      timestamp: Date.now()
    });
  }

  /**
   * تحديث محسن لآخر تواجد
   */
  async updateLastSeen(
    userId: number,
    updateFn: () => Promise<void>
  ): Promise<void> {
    // منع التحديثات المتكررة
    if (this.updatePromises.has(userId)) {
      return this.updatePromises.get(userId);
    }
    
    const updatePromise = queueLastSeenUpdate(userId, async () => {
      try {
        await updateFn();
        
        // تحديث الكاش المحلي
        this.setCachedLastSeen(userId, new Date());
      } finally {
        this.updatePromises.delete(userId);
      }
    });
    
    this.updatePromises.set(userId, updatePromise);
    return updatePromise;
  }

  /**
   * تنسيق آخر تواجد للعرض
   */
  formatLastSeen(lastSeen: Date | string | null, roomName?: string): string {
    if (!lastSeen) return '';
    
    try {
      const lastSeenDate = lastSeen instanceof Date ? lastSeen : new Date(lastSeen);
      
      if (isNaN(lastSeenDate.getTime())) {
        return '';
      }
      
      const now = new Date();
      const isToday = lastSeenDate.toDateString() === now.toDateString();
      
      const timeString = lastSeenDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      let formattedTime: string;
      
      if (isToday) {
        // اليوم: الوقت فقط
        formattedTime = timeString;
      } else {
        // أكثر من يوم: التاريخ + الوقت
        const dateString = lastSeenDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit'
        });
        formattedTime = `${dateString} ${timeString}`;
      }
      
      // إضافة اسم الغرفة إذا كان متوفراً
      if (roomName && roomName !== 'الدردشة العامة') {
        return `آخر تواجد: ${formattedTime} في ${roomName}`;
      }
      
      return `آخر تواجد: ${formattedTime}`;
    } catch (error) {
      console.error('خطأ في تنسيق آخر تواجد:', error);
      return '';
    }
  }

  /**
   * تنظيف الكاش المنتهي الصلاحية
   */
  cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [userId, cached] of this.lastSeenCache.entries()) {
      if (now - cached.timestamp > LAST_SEEN_CACHE_DURATION) {
        this.lastSeenCache.delete(userId);
      }
    }
  }

  /**
   * إزالة مستخدم من الكاش
   */
  removeUser(userId: number): void {
    this.lastSeenCache.delete(userId);
    this.updatePromises.delete(userId);
  }

  /**
   * إعادة تعيين الكاش
   */
  reset(): void {
    this.lastSeenCache.clear();
    this.updatePromises.clear();
  }
}

// تصدير المثيل الوحيد
export const lastSeenOptimizer = LastSeenOptimizer.getInstance();

/**
 * دالة مساعدة لتحديث آخر تواجد بشكل آمن
 */
export async function safeLastSeenUpdate(
  userId: number,
  updateFn: () => Promise<void>
): Promise<void> {
  return lastSeenOptimizer.updateLastSeen(userId, updateFn);
}

/**
 * دالة مساعدة لتنسيق آخر تواجد
 */
export function formatLastSeenSafe(
  lastSeen: Date | string | null, 
  roomName?: string
): string {
  return lastSeenOptimizer.formatLastSeen(lastSeen, roomName);
}

/**
 * دالة مساعدة للحصول على آخر تواجد من الكاش
 */
export function getCachedLastSeen(userId: number): Date | null {
  return lastSeenOptimizer.getCachedLastSeen(userId);
}

/**
 * دالة مساعدة لحفظ آخر تواجد في الكاش
 */
export function setCachedLastSeen(userId: number, lastSeen: Date): void {
  lastSeenOptimizer.setCachedLastSeen(userId, lastSeen);
}

/**
 * بدء التحديثات الدورية لآخر تواجد
 */
export function startLastSeenPeriodicUpdates(): void {
  lastSeenOptimizer.startPeriodicUpdates();
}

/**
 * إيقاف التحديثات الدورية لآخر تواجد
 */
export function stopLastSeenPeriodicUpdates(): void {
  lastSeenOptimizer.stopPeriodicUpdates();
}