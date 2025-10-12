/**
 * نظام إدارة التخزين المؤقت لبيانات المستخدمين
 * يحل مشكلة تذبذب أسماء المستخدمين عند انقطاع الاتصال أو حدوث أخطاء
 */

import type { ChatUser } from '@/types/chat';

interface CachedUser {
  id: number;
  username: string;
  userType?: string;
  role?: string;
  profileImage?: string;
  avatarHash?: string;
  usernameColor?: string;
  profileBackgroundColor?: string;
  profileEffect?: string;
  isOnline?: boolean;
  lastSeen?: string | Date | null;
  currentRoom?: string | null;
  lastUpdated: number;
}

class UserCacheManager {
  private static instance: UserCacheManager;
  private memoryCache: Map<number, CachedUser> = new Map();
  private readonly CACHE_KEY = 'user_cache_v2';
  private readonly MAX_CACHE_SIZE = 500;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 ساعة
  private readonly PRIORITY_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 أيام للمستخدمين المهمين

  private constructor() {
    this.loadFromLocalStorage();
    // ✅ تنظيف الكاش القديم كل 5 دقائق لتحسين الأداء
    setInterval(() => this.cleanupOldEntries(), 5 * 60 * 1000);
    // ✅ تنظيف شامل كل ساعة
    setInterval(() => this.deepCleanup(), 60 * 60 * 1000);
  }

  static getInstance(): UserCacheManager {
    if (!UserCacheManager.instance) {
      UserCacheManager.instance = new UserCacheManager();
    }
    return UserCacheManager.instance;
  }

  /**
   * تحميل البيانات من localStorage عند بدء التطبيق
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.CACHE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as Record<string, CachedUser>;
        Object.entries(data).forEach(([key, user]) => {
          const userId = parseInt(key, 10);
          if (!isNaN(userId) && user && user.username) {
            this.memoryCache.set(userId, user);
          }
        });
      }
    } catch (error) {
      console.error('خطأ في تحميل كاش المستخدمين:', error);
      // في حالة فساد البيانات، نقوم بمسحها
      localStorage.removeItem(this.CACHE_KEY);
    }
  }

  /**
   * حفظ البيانات في localStorage
   */
  private saveToLocalStorage(): void {
    try {
      const data: Record<string, CachedUser> = {};
      
      // نحفظ فقط أحدث المستخدمين استخداماً
      const sorted = Array.from(this.memoryCache.entries())
        .sort((a, b) => b[1].lastUpdated - a[1].lastUpdated)
        .slice(0, this.MAX_CACHE_SIZE);
      
      sorted.forEach(([id, user]) => {
        data[id.toString()] = user;
      });
      
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('خطأ في حفظ كاش المستخدمين:', error);
      // في حالة امتلاء التخزين، نحاول تنظيف البيانات القديمة
      this.cleanupOldEntries();
    }
  }

  /**
   * تخزين أو تحديث بيانات مستخدم
   */
  setUser(user: ChatUser | Partial<ChatUser> & { id: number }): void {
    if (!user.id || !user.username) return;

    const existing = this.memoryCache.get(user.id);
    const cached: CachedUser = {
      id: user.id,
      username: user.username,
      userType: 'userType' in user ? user.userType : existing?.userType,
      role: 'role' in user ? user.role : existing?.role,
      profileImage: 'profileImage' in user ? user.profileImage : existing?.profileImage,
      avatarHash: 'avatarHash' in user ? (user as any).avatarHash : existing?.avatarHash,
      usernameColor: 'usernameColor' in user ? user.usernameColor : existing?.usernameColor,
      profileBackgroundColor: 'profileBackgroundColor' in user ? user.profileBackgroundColor : existing?.profileBackgroundColor,
      profileEffect: 'profileEffect' in user ? user.profileEffect : existing?.profileEffect,
      isOnline: 'isOnline' in user ? user.isOnline : existing?.isOnline,
      lastSeen: 'lastSeen' in user ? (user as any).lastSeen : existing?.lastSeen,
      currentRoom: 'currentRoom' in user ? (user as any).currentRoom : existing?.currentRoom,
      lastUpdated: Date.now(),
    };

    this.memoryCache.set(user.id, cached);
    this.saveToLocalStorage();
  }

  /**
   * تحديث مجموعة من المستخدمين دفعة واحدة
   */
  setUsers(users: Array<ChatUser | Partial<ChatUser> & { id: number }>): void {
    users.forEach(user => this.setUser(user));
  }

  /**
   * الحصول على بيانات مستخدم من الكاش
   */
  /**
   * الحصول على اسم المستخدم من الكاش
   */
  getUsername(userId: number, fallback?: string): string {
    const user = this.getUser(userId);
    return user?.username || fallback || `User ${userId}`;
  }

  getUser(userId: number): CachedUser | null {
    const cached = this.memoryCache.get(userId);
    if (!cached) return null;

    // التحقق من صلاحية الكاش
    const age = Date.now() - cached.lastUpdated;
    const maxAge = this.isPriorityUser(cached) ? this.PRIORITY_CACHE_DURATION : this.CACHE_DURATION;
    
    if (age > maxAge) {
      // البيانات قديمة جداً، نحتفظ بالاسم فقط كحد أدنى
      return {
        ...cached,
        isOnline: false, // نفترض أنه غير متصل إذا كانت البيانات قديمة
      };
    }

    return cached;
  }

  /**
   * الحصول على اسم المستخدم مع إعادة المحاولة
   */
  async getUsernameWithRetry(userId: number, maxRetries = 3): Promise<string | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const cached = this.getUser(userId);
        if (cached?.username) {
          return cached.username;
        }
        
        // محاولة جلب البيانات من الخادم
        const response = await fetch(`/api/users/${userId}`);
        if (response.ok) {
          const userData = await response.json();
          if (userData?.username) {
            this.setUser(userData);
            return userData.username;
          }
        }
        
        // انتظار قصير قبل المحاولة التالية
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 200 * attempt));
        }
      } catch (error) {
        console.error(`محاولة ${attempt} فشلت لجلب المستخدم ${userId}:`, error);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 200 * attempt));
        }
      }
    }
    
    console.error(`فشل في جلب اسم المستخدم ${userId} بعد ${maxRetries} محاولات`);
    return null;
  }

  /**
   * الحصول على بيانات مستخدم كاملة مع دمج البيانات الجديدة
   */
  getUserWithMerge(userId: number, partialData?: Partial<ChatUser>): ChatUser {
    const cached = this.getUser(userId);
    const base: Partial<CachedUser> = cached || { id: userId, username: null };
    
    // دمج البيانات مع إعطاء الأولوية للبيانات الجديدة
    const merged: ChatUser = {
      id: userId,
      username: partialData?.username || base.username || null,
      userType: partialData?.userType || base.userType || 'member',
      role: partialData?.role || base.role || 'member',
      profileImage: partialData?.profileImage || base.profileImage,
      avatarHash: 'avatarHash' in (partialData || {}) ? (partialData as any).avatarHash : (base as any)?.avatarHash,
      usernameColor: partialData?.usernameColor || base.usernameColor,
      profileBackgroundColor: partialData?.profileBackgroundColor || base.profileBackgroundColor,
      profileEffect: partialData?.profileEffect || base.profileEffect,
      isOnline: partialData?.isOnline ?? base.isOnline ?? false,
      lastSeen: (partialData as any)?.lastSeen ?? (base as any)?.lastSeen ?? null,
      currentRoom: (partialData as any)?.currentRoom ?? (base as any)?.currentRoom ?? null,
    } as ChatUser;

    // تحديث الكاش بالبيانات المدمجة
    if (partialData) {
      this.setUser(merged);
    }

    return merged;
  }

  /**
   * تحديد إذا كان المستخدم مهماً (يحتاج فترة كاش أطول)
   */
  private isPriorityUser(user: CachedUser): boolean {
    // المستخدمون المهمون: المشرفون، المالكون، VIP
    return user.userType === 'owner' || 
           user.userType === 'admin' || 
           user.userType === 'vip' ||
           user.role === 'owner' ||
           user.role === 'admin';
  }

  /**
   * تنظيف الإدخالات القديمة
   */
  private cleanupOldEntries(): void {
    const now = Date.now();
    let changed = false;

    this.memoryCache.forEach((user, id) => {
      const age = now - user.lastUpdated;
      const maxAge = this.isPriorityUser(user) ? this.PRIORITY_CACHE_DURATION : this.CACHE_DURATION;
      
      // حذف البيانات القديمة جداً
      if (age > maxAge * 2) {
        this.memoryCache.delete(id);
        changed = true;
      }
    });

    if (changed) {
      this.saveToLocalStorage();
    }
  }

  /**
   * ✅ تنظيف شامل للذاكرة
   */
  private deepCleanup(): void {
    const now = Date.now();
    let changed = false;
    let removedCount = 0;

    // تنظيف البيانات القديمة جداً
    this.memoryCache.forEach((user, id) => {
      const age = now - user.lastUpdated;
      const maxAge = this.isPriorityUser(user) ? this.PRIORITY_CACHE_DURATION : this.CACHE_DURATION;
      
      if (age > maxAge) {
        this.memoryCache.delete(id);
        changed = true;
        removedCount++;
      }
    });

    // إذا كان الكاش كبير جداً، احتفظ فقط بأحدث المستخدمين
    if (this.memoryCache.size > this.MAX_CACHE_SIZE) {
      const sorted = Array.from(this.memoryCache.entries())
        .sort((a, b) => b[1].lastUpdated - a[1].lastUpdated)
        .slice(0, this.MAX_CACHE_SIZE);
      
      this.memoryCache.clear();
      sorted.forEach(([id, user]) => {
        this.memoryCache.set(id, user);
      });
      changed = true;
    }

    if (changed) {
      this.saveToLocalStorage();
      }
  }

  /**
   * مسح الكاش بالكامل
   */
  clearCache(): void {
    this.memoryCache.clear();
    localStorage.removeItem(this.CACHE_KEY);
  }

  /**
   * الحصول على إحصائيات الكاش
   */
  getStats(): { size: number; oldestEntry: number | null; newestEntry: number | null } {
    let oldest: number | null = null;
    let newest: number | null = null;

    this.memoryCache.forEach(user => {
      if (!oldest || user.lastUpdated < oldest) oldest = user.lastUpdated;
      if (!newest || user.lastUpdated > newest) newest = user.lastUpdated;
    });

    return {
      size: this.memoryCache.size,
      oldestEntry: oldest,
      newestEntry: newest,
    };
  }

  /**
   * تحديث حالة الاتصال لمجموعة من المستخدمين
   */
  updateOnlineStatus(onlineUserIds: number[]): void {
    const onlineSet = new Set(onlineUserIds);
    let changed = false;

    this.memoryCache.forEach((user, id) => {
      const shouldBeOnline = onlineSet.has(id);
      if (user.isOnline !== shouldBeOnline) {
        user.isOnline = shouldBeOnline;
        // تحديث lastSeen عند تغيير حالة الاتصال
        if (!shouldBeOnline) {
          user.lastSeen = new Date();
        }
        user.lastUpdated = Date.now();
        changed = true;
      }
    });

    if (changed) {
      this.saveToLocalStorage();
    }
  }

  /**
   * ✅ تحديث حالة مستخدم واحد
   */
  updateUserStatus(userId: number, isOnline: boolean): void {
    const cached = this.memoryCache.get(userId);
    if (cached) {
      cached.isOnline = isOnline;
      cached.lastUpdated = Date.now();
      this.memoryCache.set(userId, cached);
      this.saveToLocalStorage();
    }
  }

  /**
   * ✅ تحديث غرفة مستخدم
   */
  updateUserRoom(userId: number, roomId: string): void {
    const cached = this.memoryCache.get(userId);
    if (cached) {
      cached.currentRoom = roomId;
      cached.lastUpdated = Date.now();
      this.memoryCache.set(userId, cached);
      this.saveToLocalStorage();
    }
  }
}

// تصدير instance واحد فقط
export const userCache = UserCacheManager.getInstance();

// تصدير دوال مساعدة للاستخدام المباشر
export const getCachedUsername = (userId: number, fallback?: string): string => {
  return userCache.getUsername(userId, fallback);
};

export const setCachedUser = (user: ChatUser | Partial<ChatUser> & { id: number }): void => {
  userCache.setUser(user);
};

export const getCachedUser = (userId: number): CachedUser | null => {
  return userCache.getUser(userId);
};

export const getCachedUserWithMerge = (userId: number, partialData?: Partial<ChatUser>): ChatUser => {
  return userCache.getUserWithMerge(userId, partialData);
};

// ✅ دوال التحديث الجديدة
export const updateCachedUserStatus = (userId: number, isOnline: boolean): void => {
  userCache.updateUserStatus(userId, isOnline);
};

export const updateCachedUserRoom = (userId: number, roomId: string): void => {
  userCache.updateUserRoom(userId, roomId);
};