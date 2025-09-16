/**
 * محسن خدمة المستخدمين في الخادم - حل مشاكل التحديثات المتكررة وآخر تواجد
 * Server User Service Optimizer - Fixes repeated updates and last seen issues
 */

import bcrypt from 'bcrypt';
import { eq, desc, and } from 'drizzle-orm';
import { users, type User, type InsertUser } from '../../shared/schema';
import { db } from '../database-adapter';

// ثوابت للتحكم في التحديثات
const LAST_SEEN_UPDATE_THROTTLE = 30000; // 30 ثانية بين تحديثات آخر تواجد
const USER_UPDATE_THROTTLE = 5000; // 5 ثواني بين تحديثات المستخدم
const CACHE_DURATION = 60000; // دقيقة واحدة للكاش

// واجهة لتتبع التحديثات
interface UpdateTracker {
  lastSeenUpdates: Map<number, number>; // userId -> timestamp
  userUpdates: Map<number, number>; // userId -> timestamp
  pendingUpdates: Set<string>; // update keys
}

// متغيرات عامة لتتبع التحديثات
const updateTracker: UpdateTracker = {
  lastSeenUpdates: new Map(),
  userUpdates: new Map(),
  pendingUpdates: new Set(),
};

/**
 * فحص ما إذا كان يمكن تحديث آخر تواجد
 */
function canUpdateLastSeen(userId: number): boolean {
  const now = Date.now();
  const lastUpdate = updateTracker.lastSeenUpdates.get(userId) || 0;
  return now - lastUpdate >= LAST_SEEN_UPDATE_THROTTLE;
}

/**
 * فحص ما إذا كان يمكن تحديث المستخدم
 */
function canUpdateUser(userId: number): boolean {
  const now = Date.now();
  const lastUpdate = updateTracker.userUpdates.get(userId) || 0;
  return now - lastUpdate >= USER_UPDATE_THROTTLE;
}

/**
 * تسجيل تحديث آخر تواجد
 */
function recordLastSeenUpdate(userId: number): void {
  updateTracker.lastSeenUpdates.set(userId, Date.now());
}

/**
 * تسجيل تحديث المستخدم
 */
function recordUserUpdate(userId: number): void {
  updateTracker.userUpdates.set(userId, Date.now());
}

/**
 * محسن خدمة المستخدمين
 */
export class OptimizedUserService {
  private static instance: OptimizedUserService;
  private userCache = new Map<number, { user: User; timestamp: number }>();
  private updatePromises = new Map<string, Promise<any>>();

  static getInstance(): OptimizedUserService {
    if (!OptimizedUserService.instance) {
      OptimizedUserService.instance = new OptimizedUserService();
    }
    return OptimizedUserService.instance;
  }

  /**
   * إنشاء مستخدم جديد
   */
  async createUser(userData: InsertUser): Promise<User> {
    try {
      // تشفير كلمة المرور إذا كانت موجودة
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }

      // تعيين القيم الافتراضية
      const userToInsert: InsertUser = {
        ...userData,
        role: userData.role || userData.userType || 'guest',
        profileBackgroundColor: userData.profileBackgroundColor || '#2a2a2a',
        usernameColor: userData.usernameColor || '#000000',
        currentRoom: userData.currentRoom || 'general',
      };

      const [newUser] = await db
        .insert(users)
        .values(userToInsert as any)
        .returning();

      // حفظ في الكاش
      this.userCache.set(newUser.id, {
        user: newUser,
        timestamp: Date.now()
      });

      return newUser;
    } catch (error) {
      console.error('خطأ في إنشاء المستخدم:', error);
      throw error;
    }
  }

  /**
   * الحصول على مستخدم بالمعرف - محسن مع الكاش
   */
  async getUserById(id: number): Promise<User | undefined> {
    try {
      // فحص الكاش أولاً
      const cached = this.userCache.get(id);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.user;
      }

      // جلب من قاعدة البيانات
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      
      if (user) {
        // حفظ في الكاش
        this.userCache.set(id, {
          user,
          timestamp: Date.now()
        });
      }

      return user;
    } catch (error) {
      console.error('خطأ في الحصول على المستخدم:', error);
      return undefined;
    }
  }

  /**
   * الحصول على مستخدم باسم المستخدم - محسن مع الكاش
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username.trim()))
        .limit(1);

      if (user) {
        // حفظ في الكاش
        this.userCache.set(user.id, {
          user,
          timestamp: Date.now()
        });
      }

      return user;
    } catch (error) {
      console.error('خطأ في الحصول على المستخدم باسم المستخدم:', error);
      return undefined;
    }
  }

  /**
   * تحديث بيانات المستخدم - محسن لمنع التكرار
   */
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const updateKey = `update_${id}`;
    
    // منع التحديثات المتكررة
    if (this.updatePromises.has(updateKey)) {
      return this.updatePromises.get(updateKey);
    }

    const updatePromise = this.performUserUpdate(id, updates);
    this.updatePromises.set(updateKey, updatePromise);
    
    try {
      const result = await updatePromise;
      return result;
    } finally {
      this.updatePromises.delete(updateKey);
    }
  }

  /**
   * تنفيذ تحديث المستخدم
   */
  private async performUserUpdate(id: number, updates: Partial<User>): Promise<User | undefined> {
    try {
      // فحص ما إذا كان يمكن التحديث
      if (!canUpdateUser(id)) {
        console.log(`⏳ تم تأجيل تحديث المستخدم ${id} - تحديث سريع جداً`);
        return undefined;
      }

      // إزالة المعرف من التحديثات
      const { id: userId, ...updateData } = updates as any;

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      if (updatedUser) {
        // تحديث الكاش
        this.userCache.set(id, {
          user: updatedUser,
          timestamp: Date.now()
        });

        // تسجيل التحديث
        recordUserUpdate(id);
      }

      return updatedUser;
    } catch (error) {
      console.error('خطأ في تحديث المستخدم:', error);
      return undefined;
    }
  }

  /**
   * تعيين حالة الاتصال - محسن لمنع التكرار
   */
  async setUserOnlineStatus(id: number, isOnline: boolean): Promise<void> {
    const updateKey = `online_${id}`;
    
    // منع التحديثات المتكررة
    if (this.updatePromises.has(updateKey)) {
      return;
    }

    const updatePromise = this.performOnlineStatusUpdate(id, isOnline);
    this.updatePromises.set(updateKey, updatePromise);
    
    try {
      await updatePromise;
    } finally {
      this.updatePromises.delete(updateKey);
    }
  }

  /**
   * تنفيذ تحديث حالة الاتصال
   */
  private async performOnlineStatusUpdate(id: number, isOnline: boolean): Promise<void> {
    try {
      const now = new Date();
      
      await db
        .update(users)
        .set({
          isOnline,
          lastSeen: now,
        } as any)
        .where(eq(users.id, id));

      // تحديث الكاش
      const cached = this.userCache.get(id);
      if (cached) {
        cached.user.isOnline = isOnline;
        cached.user.lastSeen = now;
        cached.timestamp = Date.now();
      }

      console.log(`✅ تم تحديث حالة الاتصال للمستخدم ${id}: ${isOnline ? 'متصل' : 'غير متصل'}`);
    } catch (error) {
      console.error('خطأ في تعيين حالة الاتصال:', error);
    }
  }

  /**
   * تحديث الغرفة الحالية للمستخدم - محسن لمنع التذبذب
   */
  async setUserCurrentRoom(id: number, currentRoom: string | null): Promise<void> {
    const updateKey = `room_${id}`;
    
    // منع التحديثات المتكررة
    if (this.updatePromises.has(updateKey)) {
      return;
    }

    const updatePromise = this.performCurrentRoomUpdate(id, currentRoom);
    this.updatePromises.set(updateKey, updatePromise);
    
    try {
      await updatePromise;
    } finally {
      this.updatePromises.delete(updateKey);
    }
  }

  /**
   * تنفيذ تحديث الغرفة الحالية
   */
  private async performCurrentRoomUpdate(id: number, currentRoom: string | null): Promise<void> {
    try {
      // التأكد من أن currentRoom ليس null أو undefined
      const roomToSet = currentRoom || 'general';
      
      await db
        .update(users)
        .set({
          currentRoom: roomToSet,
          lastSeen: new Date(),
        } as any)
        .where(eq(users.id, id));

      // تحديث الكاش
      const cached = this.userCache.get(id);
      if (cached) {
        (cached.user as any).currentRoom = roomToSet;
        cached.user.lastSeen = new Date();
        cached.timestamp = Date.now();
      }
        
      console.log(`✅ تم تحديث الغرفة الحالية للمستخدم ${id} إلى: ${roomToSet}`);
    } catch (error) {
      console.error('خطأ في تحديث الغرفة الحالية:', error);
    }
  }

  /**
   * تحديث آخر تواجد - محسن لمنع التكرار
   */
  async updateLastSeen(id: number): Promise<void> {
    // فحص ما إذا كان يمكن تحديث آخر تواجد
    if (!canUpdateLastSeen(id)) {
      return;
    }

    try {
      const now = new Date();
      
      await db
        .update(users)
        .set({
          lastSeen: now,
        } as any)
        .where(eq(users.id, id));

      // تحديث الكاش
      const cached = this.userCache.get(id);
      if (cached) {
        cached.user.lastSeen = now;
        cached.timestamp = Date.now();
      }

      // تسجيل التحديث
      recordLastSeenUpdate(id);
    } catch (error) {
      console.error('خطأ في تحديث آخر تواجد:', error);
    }
  }

  /**
   * تعيين حالة الإخفاء
   */
  async setUserHiddenStatus(id: number, isHidden: boolean): Promise<void> {
    try {
      await db
        .update(users)
        .set({ isHidden } as any)
        .where(eq(users.id, id));

      // تحديث الكاش
      const cached = this.userCache.get(id);
      if (cached) {
        (cached.user as any).isHidden = isHidden;
        cached.timestamp = Date.now();
      }
    } catch (error) {
      console.error('خطأ في تعيين حالة الإخفاء:', error);
    }
  }

  /**
   * الحصول على جميع المستخدمين المتصلين - محسن مع الكاش
   */
  async getOnlineUsers(): Promise<User[]> {
    try {
      const onlineUsers = await db
        .select()
        .from(users)
        .where(and(eq(users.isOnline, true), eq(users.isHidden, false)));

      // تحديث الكاش
      onlineUsers.forEach(user => {
        this.userCache.set(user.id, {
          user,
          timestamp: Date.now()
        });
      });

      return onlineUsers;
    } catch (error) {
      console.error('خطأ في الحصول على المستخدمين المتصلين:', error);
      return [];
    }
  }

  /**
   * الحصول على جميع المستخدمين - محسن مع الكاش
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const allUsers = await db.select().from(users).orderBy(desc(users.joinDate));

      // تحديث الكاش
      allUsers.forEach(user => {
        this.userCache.set(user.id, {
          user,
          timestamp: Date.now()
        });
      });

      return allUsers;
    } catch (error) {
      console.error('خطأ في الحصول على جميع المستخدمين:', error);
      return [];
    }
  }

  /**
   * التحقق من بيانات الاعتماد
   */
  async verifyUserCredentials(username: string, password: string): Promise<User | null> {
    try {
      const user = await this.getUserByUsername(username);

      if (!user || !user.password) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (isPasswordValid) {
        return user;
      }

      return null;
    } catch (error) {
      console.error('خطأ في التحقق من بيانات الاعتماد:', error);
      return null;
    }
  }

  /**
   * تنظيف الكاش المنتهي الصلاحية
   */
  cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [userId, cached] of this.userCache.entries()) {
      if (now - cached.timestamp > CACHE_DURATION) {
        this.userCache.delete(userId);
      }
    }
  }

  /**
   * إزالة مستخدم من الكاش
   */
  removeUserFromCache(userId: number): void {
    this.userCache.delete(userId);
  }

  /**
   * إعادة تعيين الكاش
   */
  resetCache(): void {
    this.userCache.clear();
    this.updatePromises.clear();
  }

  /**
   * الحصول على إحصائيات الكاش
   */
  getCacheStats(): {
    cacheSize: number;
    updatePromises: number;
    lastSeenUpdates: number;
    userUpdates: number;
  } {
    return {
      cacheSize: this.userCache.size,
      updatePromises: this.updatePromises.size,
      lastSeenUpdates: updateTracker.lastSeenUpdates.size,
      userUpdates: updateTracker.userUpdates.size,
    };
  }
}

// تصدير المثيل الوحيد
export const optimizedUserService = OptimizedUserService.getInstance();

/**
 * دالة مساعدة لتنظيف الكاش
 */
export function cleanupUserCache(): void {
  optimizedUserService.cleanupExpiredCache();
}

/**
 * دالة مساعدة لإعادة تعيين الكاش
 */
export function resetUserCache(): void {
  optimizedUserService.resetCache();
}

/**
 * دالة مساعدة للحصول على إحصائيات الكاش
 */
export function getUserCacheStats(): {
  cacheSize: number;
  updatePromises: number;
  lastSeenUpdates: number;
  userUpdates: number;
} {
  return optimizedUserService.getCacheStats();
}