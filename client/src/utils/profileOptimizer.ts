/**
 * محسن الملف الشخصي - حل مشاكل التحميل المستمر والتكرارات
 * Profile Optimizer - Fixes continuous loading and duplications
 */

import { ChatUser } from '@/types/chat';

// ثوابت للتحكم في التحديثات
const UPDATE_THROTTLE_MS = 1000; // ثانية واحدة بين التحديثات
const CACHE_DURATION_MS = 30000; // 30 ثانية للكاش

// واجهة لتتبع التحديثات
interface UpdateTracker {
  lastUpdate: number;
  pendingUpdates: Set<string>;
  updateQueue: Map<string, () => Promise<void>>;
}

// متغيرات عامة لتتبع التحديثات
const updateTracker: UpdateTracker = {
  lastUpdate: 0,
  pendingUpdates: new Set(),
  updateQueue: new Map(),
};

/**
 * فحص ما إذا كان يمكن إجراء تحديث أم لا
 */
export function canUpdate(userId: number, updateType: string): boolean {
  const now = Date.now();
  const key = `${userId}_${updateType}`;
  
  // منع التحديثات المتكررة
  if (updateTracker.pendingUpdates.has(key)) {
    return false;
  }
  
  // منع التحديثات السريعة جداً
  if (now - updateTracker.lastUpdate < UPDATE_THROTTLE_MS) {
    return false;
  }
  
  return true;
}

/**
 * تسجيل بداية التحديث
 */
export function startUpdate(userId: number, updateType: string): void {
  const key = `${userId}_${updateType}`;
  updateTracker.pendingUpdates.add(key);
  updateTracker.lastUpdate = Date.now();
}

/**
 * تسجيل انتهاء التحديث
 */
export function endUpdate(userId: number, updateType: string): void {
  const key = `${userId}_${updateType}`;
  updateTracker.pendingUpdates.delete(key);
}

/**
 * إضافة تحديث للطابور
 */
export function queueUpdate(
  userId: number, 
  updateType: string, 
  updateFn: () => Promise<void>
): void {
  const key = `${userId}_${updateType}`;
  
  // إذا كان هناك تحديث معلق، أضفه للطابور
  if (updateTracker.pendingUpdates.has(key)) {
    updateTracker.updateQueue.set(key, updateFn);
    return;
  }
  
  // تنفيذ التحديث فوراً
  executeUpdate(userId, updateType, updateFn);
}

/**
 * تنفيذ التحديث
 */
async function executeUpdate(
  userId: number, 
  updateType: string, 
  updateFn: () => Promise<void>
): Promise<void> {
  if (!canUpdate(userId, updateType)) {
    return;
  }
  
  startUpdate(userId, updateType);
  
  try {
    await updateFn();
  } finally {
    endUpdate(userId, updateType);
    
    // تنفيذ التحديثات المعلقة
    const key = `${userId}_${updateType}`;
    const queuedUpdate = updateTracker.updateQueue.get(key);
    if (queuedUpdate) {
      updateTracker.updateQueue.delete(key);
      // تنفيذ التحديث المعلق بعد تأخير قصير
      setTimeout(() => {
        executeUpdate(userId, updateType, queuedUpdate);
      }, UPDATE_THROTTLE_MS);
    }
  }
}

/**
 * محسن تحديث الملف الشخصي
 */
export class ProfileOptimizer {
  private static instance: ProfileOptimizer;
  private userCache = new Map<number, { user: ChatUser; timestamp: number }>();
  private updatePromises = new Map<string, Promise<void>>();

  static getInstance(): ProfileOptimizer {
    if (!ProfileOptimizer.instance) {
      ProfileOptimizer.instance = new ProfileOptimizer();
    }
    return ProfileOptimizer.instance;
  }

  /**
   * الحصول على مستخدم من الكاش
   */
  getCachedUser(userId: number): ChatUser | null {
    const cached = this.userCache.get(userId);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > CACHE_DURATION_MS) {
      this.userCache.delete(userId);
      return null;
    }
    
    return cached.user;
  }

  /**
   * حفظ مستخدم في الكاش
   */
  setCachedUser(userId: number, user: ChatUser): void {
    this.userCache.set(userId, {
      user: { ...user },
      timestamp: Date.now()
    });
  }

  /**
   * تحديث محسن للمستخدم
   */
  async updateUser(
    userId: number, 
    updates: Partial<ChatUser>,
    updateFn: () => Promise<void>
  ): Promise<void> {
    const updateKey = `update_${userId}`;
    
    // منع التحديثات المتكررة
    if (this.updatePromises.has(updateKey)) {
      return this.updatePromises.get(updateKey);
    }
    
    const updatePromise = queueUpdate(userId, 'profile', async () => {
      try {
        await updateFn();
        
        // تحديث الكاش المحلي
        const cachedUser = this.getCachedUser(userId);
        if (cachedUser) {
          const updatedUser = { ...cachedUser, ...updates };
          this.setCachedUser(userId, updatedUser);
        }
      } finally {
        this.updatePromises.delete(updateKey);
      }
    });
    
    this.updatePromises.set(updateKey, updatePromise);
    return updatePromise;
  }

  /**
   * جلب محسن للمستخدم
   */
  async fetchUser(
    userId: number,
    fetchFn: () => Promise<ChatUser>
  ): Promise<ChatUser | null> {
    const fetchKey = `fetch_${userId}`;
    
    // منع الطلبات المتكررة
    if (this.updatePromises.has(fetchKey)) {
      return this.updatePromises.get(fetchKey) as Promise<ChatUser | null>;
    }
    
    const fetchPromise = queueUpdate(userId, 'fetch', async () => {
      try {
        // فحص الكاش أولاً
        const cached = this.getCachedUser(userId);
        if (cached) {
          return cached;
        }
        
        // جلب من الخادم
        const user = await fetchFn();
        this.setCachedUser(userId, user);
        return user;
      } finally {
        this.updatePromises.delete(fetchKey);
      }
    });
    
    this.updatePromises.set(fetchKey, fetchPromise);
    return fetchPromise;
  }

  /**
   * تنظيف الكاش القديم
   */
  cleanup(): void {
    const now = Date.now();
    for (const [userId, cached] of this.userCache.entries()) {
      if (now - cached.timestamp > CACHE_DURATION_MS) {
        this.userCache.delete(userId);
      }
    }
  }

  /**
   * إزالة مستخدم من الكاش
   */
  removeUser(userId: number): void {
    this.userCache.delete(userId);
  }

  /**
   * إعادة تعيين الكاش
   */
  reset(): void {
    this.userCache.clear();
    this.updatePromises.clear();
  }
}

// تصدير المثيل الوحيد
export const profileOptimizer = ProfileOptimizer.getInstance();

/**
 * دالة مساعدة لتحديث الملف الشخصي بشكل آمن
 */
export async function safeProfileUpdate(
  userId: number,
  updates: Partial<ChatUser>,
  updateFn: () => Promise<void>
): Promise<void> {
  return profileOptimizer.updateUser(userId, updates, updateFn);
}

/**
 * دالة مساعدة لجلب الملف الشخصي بشكل آمن
 */
export async function safeProfileFetch(
  userId: number,
  fetchFn: () => Promise<ChatUser>
): Promise<ChatUser | null> {
  return profileOptimizer.fetchUser(userId, fetchFn);
}

/**
 * دالة مساعدة للحصول على مستخدم من الكاش
 */
export function getCachedProfile(userId: number): ChatUser | null {
  return profileOptimizer.getCachedUser(userId);
}

/**
 * دالة مساعدة لحفظ مستخدم في الكاش
 */
export function setCachedProfile(userId: number, user: ChatUser): void {
  profileOptimizer.setCachedUser(userId, user);
}

/**
 * دالة مساعدة لحفظ آخر ظهور للمستخدم في الكاش
 */
export function setCachedLastSeen(userId: number, lastSeen: Date): void {
  const cached = profileOptimizer.getCachedUser(userId);
  if (cached) {
    const updatedUser = { ...cached, lastSeen };
    profileOptimizer.setCachedUser(userId, updatedUser);
  }
}

/**
 * دالة مساعدة للحصول على آخر ظهور للمستخدم من الكاش
 */
export function getCachedLastSeen(userId: number): Date | null {
  const cached = profileOptimizer.getCachedUser(userId);
  return cached?.lastSeen || null;
}