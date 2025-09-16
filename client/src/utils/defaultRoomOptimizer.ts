/**
 * محسن الغرف الافتراضية - حل مشاكل التكرارات والمنطق المعقد
 * Default Room Optimizer - Fixes duplications and complex logic
 */

// ثوابت للغرف الافتراضية
export const DEFAULT_ROOM_CONSTANTS = {
  GENERAL_ROOM_ID: 'general',
  GENERAL_ROOM_NAME: 'الدردشة العامة',
  WELCOME_ROOM_ID: 'welcome',
  WELCOME_ROOM_NAME: 'غرفة الترحيب',
  DEFAULT_ROOM_DESCRIPTION: 'الغرفة العامة للدردشة',
  WELCOME_ROOM_DESCRIPTION: 'غرفة الترحيب بالمستخدمين الجدد',
} as const;

// واجهة للغرفة الافتراضية
export interface DefaultRoom {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isActive: boolean;
  isLocked: boolean;
  isBroadcast: boolean;
}

// واجهة لإدارة الغرف الافتراضية
interface DefaultRoomManager {
  rooms: Map<string, DefaultRoom>;
  userCurrentRooms: Map<number, string>;
  roomUsers: Map<string, Set<number>>;
}

// متغيرات عامة لإدارة الغرف الافتراضية
const defaultRoomManager: DefaultRoomManager = {
  rooms: new Map(),
  userCurrentRooms: new Map(),
  roomUsers: new Map(),
};

/**
 * محسن الغرف الافتراضية
 */
export class DefaultRoomOptimizer {
  private static instance: DefaultRoomOptimizer;
  private roomCache = new Map<string, DefaultRoom>();
  private userRoomCache = new Map<number, string>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 30000; // 30 ثانية

  static getInstance(): DefaultRoomOptimizer {
    if (!DefaultRoomOptimizer.instance) {
      DefaultRoomOptimizer.instance = new DefaultRoomOptimizer();
    }
    return DefaultRoomOptimizer.instance;
  }

  /**
   * تهيئة الغرف الافتراضية
   */
  initializeDefaultRooms(): void {
    // الغرفة العامة
    const generalRoom: DefaultRoom = {
      id: DEFAULT_ROOM_CONSTANTS.GENERAL_ROOM_ID,
      name: DEFAULT_ROOM_CONSTANTS.GENERAL_ROOM_NAME,
      description: DEFAULT_ROOM_CONSTANTS.DEFAULT_ROOM_DESCRIPTION,
      isDefault: true,
      isActive: true,
      isLocked: false,
      isBroadcast: false,
    };

    // غرفة الترحيب
    const welcomeRoom: DefaultRoom = {
      id: DEFAULT_ROOM_CONSTANTS.WELCOME_ROOM_ID,
      name: DEFAULT_ROOM_CONSTANTS.WELCOME_ROOM_NAME,
      description: DEFAULT_ROOM_CONSTANTS.WELCOME_ROOM_DESCRIPTION,
      isDefault: true,
      isActive: true,
      isLocked: false,
      isBroadcast: false,
    };

    // حفظ في الكاش
    this.roomCache.set(generalRoom.id, generalRoom);
    this.roomCache.set(welcomeRoom.id, welcomeRoom);
    
    // حفظ في المدير العام
    defaultRoomManager.rooms.set(generalRoom.id, generalRoom);
    defaultRoomManager.rooms.set(welcomeRoom.id, welcomeRoom);
  }

  /**
   * الحصول على غرفة افتراضية
   */
  getDefaultRoom(roomId: string): DefaultRoom | null {
    // فحص الكاش أولاً
    const cached = this.roomCache.get(roomId);
    if (cached && this.isCacheValid(roomId)) {
      return cached;
    }

    // فحص المدير العام
    const room = defaultRoomManager.rooms.get(roomId);
    if (room) {
      this.roomCache.set(roomId, room);
      this.cacheExpiry.set(roomId, Date.now() + this.CACHE_DURATION);
      return room;
    }

    return null;
  }

  /**
   * الحصول على جميع الغرف الافتراضية
   */
  getAllDefaultRooms(): DefaultRoom[] {
    return Array.from(defaultRoomManager.rooms.values());
  }

  /**
   * فحص ما إذا كانت الغرفة افتراضية
   */
  isDefaultRoom(roomId: string): boolean {
    return defaultRoomManager.rooms.has(roomId);
  }

  /**
   * الحصول على الغرفة الافتراضية للمستخدم
   */
  getUserDefaultRoom(userId: number): string {
    // فحص الكاش أولاً
    const cached = this.userRoomCache.get(userId);
    if (cached && this.isCacheValid(`user_${userId}`)) {
      return cached;
    }

    // فحص المدير العام
    const currentRoom = defaultRoomManager.userCurrentRooms.get(userId);
    if (currentRoom) {
      this.userRoomCache.set(userId, currentRoom);
      this.cacheExpiry.set(`user_${userId}`, Date.now() + this.CACHE_DURATION);
      return currentRoom;
    }

    // إرجاع الغرفة العامة كافتراضي
    return DEFAULT_ROOM_CONSTANTS.GENERAL_ROOM_ID;
  }

  /**
   * تعيين الغرفة الحالية للمستخدم
   */
  setUserCurrentRoom(userId: number, roomId: string): void {
    // التأكد من أن الغرفة موجودة
    if (!this.isDefaultRoom(roomId)) {
      roomId = DEFAULT_ROOM_CONSTANTS.GENERAL_ROOM_ID;
    }

    // تحديث المدير العام
    defaultRoomManager.userCurrentRooms.set(userId, roomId);
    
    // تحديث الكاش
    this.userRoomCache.set(userId, roomId);
    this.cacheExpiry.set(`user_${userId}`, Date.now() + this.CACHE_DURATION);

    // تحديث قائمة مستخدمي الغرفة
    this.updateRoomUsers(userId, roomId);
  }

  /**
   * تحديث قائمة مستخدمي الغرفة
   */
  private updateRoomUsers(userId: number, newRoomId: string): void {
    // إزالة المستخدم من الغرف السابقة
    for (const [roomId, users] of defaultRoomManager.roomUsers.entries()) {
      if (users.has(userId)) {
        users.delete(userId);
        if (users.size === 0 && !this.isDefaultRoom(roomId)) {
          defaultRoomManager.roomUsers.delete(roomId);
        }
      }
    }

    // إضافة المستخدم للغرفة الجديدة
    if (!defaultRoomManager.roomUsers.has(newRoomId)) {
      defaultRoomManager.roomUsers.set(newRoomId, new Set());
    }
    defaultRoomManager.roomUsers.get(newRoomId)!.add(userId);
  }

  /**
   * الحصول على مستخدمي الغرفة
   */
  getRoomUsers(roomId: string): number[] {
    const users = defaultRoomManager.roomUsers.get(roomId);
    return users ? Array.from(users) : [];
  }

  /**
   * فحص صحة الكاش
   */
  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry) return false;
    return Date.now() < expiry;
  }

  /**
   * تنظيف الكاش المنتهي الصلاحية
   */
  cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now >= expiry) {
        this.cacheExpiry.delete(key);
        if (key.startsWith('user_')) {
          const userId = parseInt(key.replace('user_', ''));
          this.userRoomCache.delete(userId);
        } else {
          this.roomCache.delete(key);
        }
      }
    }
  }

  /**
   * إزالة مستخدم من جميع الغرف
   */
  removeUser(userId: number): void {
    // إزالة من المدير العام
    defaultRoomManager.userCurrentRooms.delete(userId);
    
    // إزالة من الكاش
    this.userRoomCache.delete(userId);
    this.cacheExpiry.delete(`user_${userId}`);

    // إزالة من جميع الغرف
    for (const [roomId, users] of defaultRoomManager.roomUsers.entries()) {
      users.delete(userId);
      if (users.size === 0 && !this.isDefaultRoom(roomId)) {
        defaultRoomManager.roomUsers.delete(roomId);
      }
    }
  }

  /**
   * إعادة تعيين الكاش
   */
  reset(): void {
    this.roomCache.clear();
    this.userRoomCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * الحصول على إحصائيات الغرف
   */
  getRoomStats(): {
    totalRooms: number;
    totalUsers: number;
    roomUserCounts: Record<string, number>;
  } {
    const totalRooms = defaultRoomManager.rooms.size;
    const totalUsers = defaultRoomManager.userCurrentRooms.size;
    const roomUserCounts: Record<string, number> = {};

    for (const [roomId, users] of defaultRoomManager.roomUsers.entries()) {
      roomUserCounts[roomId] = users.size;
    }

    return {
      totalRooms,
      totalUsers,
      roomUserCounts,
    };
  }
}

// تصدير المثيل الوحيد
export const defaultRoomOptimizer = DefaultRoomOptimizer.getInstance();

/**
 * دالة مساعدة للحصول على الغرفة الافتراضية
 */
export function getDefaultRoom(roomId: string): DefaultRoom | null {
  return defaultRoomOptimizer.getDefaultRoom(roomId);
}

/**
 * دالة مساعدة للحصول على جميع الغرف الافتراضية
 */
export function getAllDefaultRooms(): DefaultRoom[] {
  return defaultRoomOptimizer.getAllDefaultRooms();
}

/**
 * دالة مساعدة لفحص ما إذا كانت الغرفة افتراضية
 */
export function isDefaultRoom(roomId: string): boolean {
  return defaultRoomOptimizer.isDefaultRoom(roomId);
}

/**
 * دالة مساعدة للحصول على الغرفة الحالية للمستخدم
 */
export function getUserCurrentRoom(userId: number): string {
  return defaultRoomOptimizer.getUserDefaultRoom(userId);
}

/**
 * دالة مساعدة لتعيين الغرفة الحالية للمستخدم
 */
export function setUserCurrentRoom(userId: number, roomId: string): void {
  defaultRoomOptimizer.setUserCurrentRoom(userId, roomId);
}

/**
 * دالة مساعدة للحصول على مستخدمي الغرفة
 */
export function getRoomUsers(roomId: string): number[] {
  return defaultRoomOptimizer.getRoomUsers(roomId);
}

/**
 * دالة مساعدة لتهيئة الغرف الافتراضية
 */
export function initializeDefaultRooms(): void {
  defaultRoomOptimizer.initializeDefaultRooms();
}

/**
 * دالة مساعدة للحصول على إحصائيات الغرف
 */
export function getRoomStats(): {
  totalRooms: number;
  totalUsers: number;
  roomUserCounts: Record<string, number>;
} {
  return defaultRoomOptimizer.getRoomStats();
}

/**
 * دالة مساعدة لتنظيف الكاش
 */
export function cleanupRoomCache(): void {
  defaultRoomOptimizer.cleanupExpiredCache();
}

/**
 * دالة مساعدة لإزالة مستخدم من جميع الغرف
 */
export function removeUserFromRooms(userId: number): void {
  defaultRoomOptimizer.removeUser(userId);
}

/**
 * دالة مساعدة لإعادة تعيين الكاش
 */
export function resetRoomCache(): void {
  defaultRoomOptimizer.reset();
}