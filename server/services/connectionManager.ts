/**
 * مدير الاتصالات الموحد - مصدر الحقيقة الوحيد لعضوية الغرف
 * يحل مشكلة تعدد الخرائط وعدم التزامن بينها
 */

import { Socket } from 'socket.io';

// نوع بيانات المستخدم المتصل
export interface ConnectedUser {
  id: number;
  username: string;
  userType: string;
  socketId: string;
  currentRoom: string;
  lastActivity: Date;
  isOnline: boolean;
}

// نوع بيانات الغرفة
export interface RoomState {
  id: string;
  userIds: Set<number>;
  userCount: number;
  lastActivity: Date;
}

class ConnectionManager {
  // 🎯 مصدر الحقيقة الوحيد - خريطة المستخدمين المتصلين
  private connectedUsers = new Map<number, ConnectedUser>();
  
  // 🎯 مصدر الحقيقة الوحيد - خريطة الغرف وأعضائها
  private rooms = new Map<string, RoomState>();
  
  // 🎯 خريطة Socket ID إلى User ID للبحث السريع
  private socketToUser = new Map<string, number>();
  
  // 🔒 حماية من العمليات المتزامنة
  private operationLocks = new Map<string, Promise<void>>();

  /**
   * 🔐 حماية من العمليات المتزامنة
   */
  private async withLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
    // انتظار العملية الحالية إن وجدت
    if (this.operationLocks.has(key)) {
      await this.operationLocks.get(key);
    }

    let resolver: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolver = resolve;
    });
    
    this.operationLocks.set(key, lockPromise);

    try {
      const result = await operation();
      return result;
    } finally {
      this.operationLocks.delete(key);
      resolver!();
    }
  }

  /**
   * 👤 إضافة مستخدم متصل
   */
  async addUser(socket: Socket, userData: {
    id: number;
    username: string;
    userType: string;
  }): Promise<void> {
    const lockKey = `user_${userData.id}`;
    
    return this.withLock(lockKey, async () => {
      // إزالة الاتصال السابق إن وجد
      if (this.connectedUsers.has(userData.id)) {
        await this.removeUserFromAllRooms(userData.id);
      }

      const connectedUser: ConnectedUser = {
        id: userData.id,
        username: userData.username,
        userType: userData.userType,
        socketId: socket.id,
        currentRoom: '', // سيتم تحديدها عند الانضمام للغرفة
        lastActivity: new Date(),
        isOnline: true
      };

      this.connectedUsers.set(userData.id, connectedUser);
      this.socketToUser.set(socket.id, userData.id);

      console.log(`✅ تم إضافة المستخدم ${userData.username} (${userData.id})`);
    });
  }

  /**
   * 🚪 انضمام مستخدم لغرفة
   */
  async joinRoom(userId: number, roomId: string): Promise<{
    success: boolean;
    previousRoom?: string;
    userCount: number;
    roomUsers: ConnectedUser[];
  }> {
    const lockKey = `join_${userId}_${roomId}`;
    
    return this.withLock(lockKey, async () => {
      const user = this.connectedUsers.get(userId);
      if (!user) {
        throw new Error(`المستخدم ${userId} غير متصل`);
      }

      // الخروج من الغرفة السابقة
      const previousRoom = user.currentRoom;
      if (previousRoom && previousRoom !== roomId) {
        await this.leaveRoomInternal(userId, previousRoom, false);
      }

      // التحقق من وجود الغرفة وإنشاؤها إن لم تكن موجودة
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, {
          id: roomId,
          userIds: new Set(),
          userCount: 0,
          lastActivity: new Date()
        });
      }

      const room = this.rooms.get(roomId)!;
      
      // إضافة المستخدم للغرفة
      room.userIds.add(userId);
      room.userCount = room.userIds.size;
      room.lastActivity = new Date();

      // تحديث بيانات المستخدم
      user.currentRoom = roomId;
      user.lastActivity = new Date();

      console.log(`✅ انضم ${user.username} للغرفة ${roomId}`);

      return {
        success: true,
        previousRoom,
        userCount: room.userCount,
        roomUsers: this.getRoomUsersInternal(roomId)
      };
    });
  }

  /**
   * 🚶 مغادرة المستخدم للغرفة
   */
  async leaveRoom(userId: number, roomId: string): Promise<{
    success: boolean;
    userCount: number;
    roomUsers: ConnectedUser[];
  }> {
    return this.leaveRoomInternal(userId, roomId, true);
  }

  /**
   * 🚶 مغادرة داخلية (مع إمكانية إيقاف الحماية)
   */
  private async leaveRoomInternal(userId: number, roomId: string, useLock: boolean = true): Promise<{
    success: boolean;
    userCount: number;
    roomUsers: ConnectedUser[];
  }> {
    const operation = async () => {
      const user = this.connectedUsers.get(userId);
      if (!user) {
        throw new Error(`المستخدم ${userId} غير متصل`);
      }

      const room = this.rooms.get(roomId);
      if (!room) {
        console.warn(`⚠️ الغرفة ${roomId} غير موجودة`);
        return {
          success: false,
          userCount: 0,
          roomUsers: []
        };
      }

      // إزالة المستخدم من الغرفة
      room.userIds.delete(userId);
      room.userCount = room.userIds.size;
      room.lastActivity = new Date();

      // مسح الغرفة الحالية من المستخدم
      if (user.currentRoom === roomId) {
        user.currentRoom = '';
      }

      // حذف الغرفة إذا أصبحت فارغة (عدا الغرفة العامة)
      if (room.userCount === 0 && roomId !== 'general') {
        this.rooms.delete(roomId);
        console.log(`🗑️ تم حذف الغرفة الفارغة: ${roomId}`);
      }

      console.log(`✅ غادر ${user.username} الغرفة ${roomId}`);

      return {
        success: true,
        userCount: room.userCount,
        roomUsers: this.getRoomUsersInternal(roomId)
      };
    };

    if (useLock) {
      const lockKey = `leave_${userId}_${roomId}`;
      return this.withLock(lockKey, operation);
    } else {
      return operation();
    }
  }

  /**
   * ❌ إزالة مستخدم من جميع الغرف (عند قطع الاتصال)
   */
  async removeUserFromAllRooms(userId: number): Promise<string[]> {
    const lockKey = `remove_all_${userId}`;
    
    return this.withLock(lockKey, async () => {
      const user = this.connectedUsers.get(userId);
      if (!user) {
        return [];
      }

      const affectedRooms: string[] = [];

      // البحث عن جميع الغرف التي يوجد بها المستخدم
      for (const [roomId, room] of this.rooms.entries()) {
        if (room.userIds.has(userId)) {
          room.userIds.delete(userId);
          room.userCount = room.userIds.size;
          room.lastActivity = new Date();
          affectedRooms.push(roomId);

          // حذف الغرفة إذا أصبحت فارغة (عدا الغرفة العامة)
          if (room.userCount === 0 && roomId !== 'general') {
            this.rooms.delete(roomId);
            console.log(`🗑️ تم حذف الغرفة الفارغة: ${roomId}`);
          }
        }
      }

      // إزالة المستخدم من الخرائط
      this.connectedUsers.delete(userId);
      this.socketToUser.delete(user.socketId);

      console.log(`❌ تم إزالة ${user.username} من ${affectedRooms.length} غرفة/غرف`);
      return affectedRooms;
    });
  }

  /**
   * 📋 الحصول على مستخدمي الغرفة
   */
  getRoomUsers(roomId: string): ConnectedUser[] {
    return this.getRoomUsersInternal(roomId);
  }

  private getRoomUsersInternal(roomId: string): ConnectedUser[] {
    const room = this.rooms.get(roomId);
    if (!room) {
      return [];
    }

    return Array.from(room.userIds)
      .map(userId => this.connectedUsers.get(userId))
      .filter((user): user is ConnectedUser => user !== undefined);
  }

  /**
   * 🔍 البحث عن مستخدم بواسطة Socket ID
   */
  getUserBySocketId(socketId: string): ConnectedUser | undefined {
    const userId = this.socketToUser.get(socketId);
    return userId ? this.connectedUsers.get(userId) : undefined;
  }

  /**
   * 🔍 البحث عن مستخدم بواسطة User ID
   */
  getUser(userId: number): ConnectedUser | undefined {
    return this.connectedUsers.get(userId);
  }

  /**
   * 🏠 الحصول على الغرفة الحالية للمستخدم
   */
  getUserCurrentRoom(userId: number): string | undefined {
    return this.connectedUsers.get(userId)?.currentRoom;
  }

  /**
   * 📊 إحصائيات الغرفة
   */
  getRoomStats(roomId: string): { userCount: number; isActive: boolean } {
    const room = this.rooms.get(roomId);
    return {
      userCount: room?.userCount || 0,
      isActive: (room?.userCount || 0) > 0
    };
  }

  /**
   * 📈 إحصائيات عامة
   */
  getGlobalStats(): {
    totalUsers: number;
    totalRooms: number;
    activeRooms: number;
  } {
    return {
      totalUsers: this.connectedUsers.size,
      totalRooms: this.rooms.size,
      activeRooms: Array.from(this.rooms.values()).filter(room => room.userCount > 0).length
    };
  }

  /**
   * 🧹 تنظيف الغرف الفارغة والاتصالات القديمة
   */
  cleanup(): void {
    const now = new Date();
    const timeout = 5 * 60 * 1000; // 5 دقائق

    // تنظيف المستخدمين غير النشطين
    for (const [userId, user] of this.connectedUsers.entries()) {
      if (now.getTime() - user.lastActivity.getTime() > timeout) {
        this.removeUserFromAllRooms(userId);
        console.log(`🧹 تم إزالة المستخدم غير النشط: ${user.username}`);
      }
    }

    // تنظيف الغرف الفارغة
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.userCount === 0 && roomId !== 'general') {
        this.rooms.delete(roomId);
        console.log(`🧹 تم إزالة الغرفة الفارغة: ${roomId}`);
      }
    }

    console.log(`🧹 تنظيف مكتمل: ${this.connectedUsers.size} مستخدم، ${this.rooms.size} غرفة`);
  }

  /**
   * 🔄 تحديث نشاط المستخدم
   */
  updateUserActivity(userId: number): void {
    const user = this.connectedUsers.get(userId);
    if (user) {
      user.lastActivity = new Date();
    }
  }

  /**
   * 📋 الحصول على جميع المستخدمين المتصلين
   */
  getAllConnectedUsers(): ConnectedUser[] {
    return Array.from(this.connectedUsers.values());
  }

  /**
   * 🏠 الحصول على جميع الغرف النشطة
   */
  getAllActiveRooms(): Array<{ id: string; userCount: number; users: ConnectedUser[] }> {
    return Array.from(this.rooms.entries()).map(([roomId, room]) => ({
      id: roomId,
      userCount: room.userCount,
      users: this.getRoomUsersInternal(roomId)
    }));
  }
}

// تصدير instance واحد للاستخدام في جميع أنحاء التطبيق
export const connectionManager = new ConnectionManager();