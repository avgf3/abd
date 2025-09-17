/**
 * خدمة محسنة لإدارة المستخدمين
 * تحسين الأداء والاستقرار من خلال استخدام cache وتحسين الاستعلامات
 */

import { databaseService } from './databaseService';
import { DEFAULT_ROOM_CONSTANTS } from '../../client/src/utils/defaultRoomOptimizer';

/**
 * Cache بسيط لتخزين بيانات المستخدمين مؤقتاً
 */
const userCache = new Map<number, {
  data: any;
  timestamp: number;
  lastSeen?: Date;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

/**
 * تنظيف الـ cache من البيانات المنتهية الصلاحية
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of userCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      userCache.delete(key);
    }
  }
}

/**
 * تنظيف الـ cache كل دقيقة
 */
setInterval(cleanExpiredCache, 60 * 1000);

/**
 * خدمة محسنة لإدارة المستخدمين
 */
export const optimizedUserService = {
  /**
   * تحديث حالة الاتصال للمستخدم مع تحسين الأداء
   */
  async setUserOnlineStatus(id: number, isOnline: boolean): Promise<void> {
    try {
      // تحديث قاعدة البيانات
      await databaseService.updateUser(id, { 
        isOnline, 
        lastSeen: new Date() 
      });

      // تحديث الـ cache إذا كان موجوداً
      const cached = userCache.get(id);
      if (cached) {
        cached.data.isOnline = isOnline;
        cached.data.lastSeen = new Date();
        cached.lastSeen = new Date();
      }
    } catch (error) {
      console.error('خطأ في تحديث حالة الاتصال:', error);
      throw error;
    }
  },

  /**
   * تحديث الغرفة الحالية للمستخدم مع تحسين الأداء
   */
  async setUserCurrentRoom(id: number, currentRoom: string | null): Promise<void> {
    try {
      // استخدام الغرفة الافتراضية إذا لم يتم تحديد غرفة
      const roomId = currentRoom || DEFAULT_ROOM_CONSTANTS.GENERAL_ROOM_ID;
      
      // تحديث قاعدة البيانات
      await databaseService.updateUser(id, { 
        currentRoom: roomId, 
        lastSeen: new Date() 
      });

      // تحديث الـ cache إذا كان موجوداً
      const cached = userCache.get(id);
      if (cached) {
        cached.data.currentRoom = roomId;
        cached.data.lastSeen = new Date();
        cached.lastSeen = new Date();
      }
    } catch (error) {
      console.error('خطأ في تحديث الغرفة الحالية:', error);
      throw error;
    }
  },

  /**
   * الحصول على بيانات المستخدم مع استخدام الـ cache
   */
  async getUserById(id: number): Promise<any> {
    try {
      // التحقق من الـ cache أولاً
      const cached = userCache.get(id);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.data;
      }

      // جلب البيانات من قاعدة البيانات
      const user = await databaseService.getUserById(id);
      if (user) {
        // تخزين في الـ cache
        userCache.set(id, {
          data: user,
          timestamp: Date.now(),
          lastSeen: user.lastSeen ? new Date(user.lastSeen) : undefined,
        });
      }

      return user;
    } catch (error) {
      console.error('خطأ في جلب بيانات المستخدم:', error);
      throw error;
    }
  },

  /**
   * تحديث بيانات المستخدم مع تحديث الـ cache
   */
  async updateUser(id: number, updates: any): Promise<any> {
    try {
      // تحديث قاعدة البيانات
      const updatedUser = await databaseService.updateUser(id, updates);
      
      if (updatedUser) {
        // تحديث الـ cache
        const cached = userCache.get(id);
        if (cached) {
          cached.data = { ...cached.data, ...updates };
          cached.timestamp = Date.now();
        }
      }

      return updatedUser;
    } catch (error) {
      console.error('خطأ في تحديث بيانات المستخدم:', error);
      throw error;
    }
  },

  /**
   * مسح المستخدم من الـ cache
   */
  clearUserCache(id: number): void {
    userCache.delete(id);
  },

  /**
   * مسح جميع البيانات من الـ cache
   */
  clearAllCache(): void {
    userCache.clear();
  },

  /**
   * الحصول على إحصائيات الـ cache
   */
  getCacheStats(): { size: number; entries: number[] } {
    return {
      size: userCache.size,
      entries: Array.from(userCache.keys()),
    };
  },
};