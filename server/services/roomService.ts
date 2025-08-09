import { storage } from '../storage';
import { db, dbType } from '../database-adapter';
import path from 'path';
import fs from 'fs';

export interface Room {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  createdBy: number;
  isDefault: boolean;
  isActive: boolean;
  isBroadcast?: boolean;
  hostId?: number | null;
  speakers?: number[];
  micQueue?: number[];
  userCount?: number;
  createdAt: Date;
}

export interface CreateRoomData {
  name: string;
  description?: string;
  icon?: string;
  createdBy: number;
  isDefault?: boolean;
  isActive?: boolean;
  isBroadcast?: boolean;
  hostId?: number | null;
}

export interface BroadcastInfo {
  hostId: number | null;
  speakers: number[];
  micQueue: number[];
}

class RoomService {
  private connectedRooms = new Map<string, Set<number>>(); // roomId -> Set of userIds
  private userRooms = new Map<number, string>(); // userId -> current roomId

  /**
   * جلب جميع الغرف
   */
  async getAllRooms(): Promise<Room[]> {
    try {
      if (!db || dbType === 'disabled') {
        return [];
      }
      return await storage.getAllRooms();
    } catch (error) {
      console.error('خطأ في جلب الغرف:', error);
      return [];
    }
  }

  /**
   * جلب غرفة واحدة
   */
  async getRoom(roomId: string): Promise<Room | null> {
    try {
      if (!db || dbType === 'disabled') {
        return null;
      }
      return await storage.getRoom(roomId);
    } catch (error) {
      console.error(`خطأ في جلب الغرفة ${roomId}:`, error);
      return null;
    }
  }

  /**
   * إنشاء غرفة جديدة
   */
  async createRoom(roomData: CreateRoomData): Promise<Room | null> {
    try {
      if (!db || dbType === 'disabled') {
        throw new Error('قاعدة البيانات غير متوفرة');
      }

      // التحقق من صحة البيانات
      if (!roomData.name?.trim()) {
        throw new Error('اسم الغرفة مطلوب');
      }

      // التحقق من صلاحيات المستخدم
      const user = await storage.getUser(roomData.createdBy);
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      if (!['admin', 'owner'].includes(user.userType)) {
        throw new Error('ليس لديك صلاحية لإنشاء غرف');
      }

      // التحقق من عدم تكرار اسم الغرفة
      const existingRooms = await this.getAllRooms();
      const nameExists = existingRooms.some(room => 
        room.name.toLowerCase().trim() === roomData.name.toLowerCase().trim()
      );
      
      if (nameExists) {
        throw new Error('اسم الغرفة موجود مسبقاً');
      }

      const room = await storage.createRoom({
        ...roomData,
        name: roomData.name.trim(),
        description: roomData.description?.trim() || '',
        isDefault: roomData.isDefault || false,
        isActive: roomData.isActive !== false, // default true
        isBroadcast: roomData.isBroadcast || false,
        hostId: roomData.hostId || null
      });

      console.log(`✅ تم إنشاء الغرفة: ${room.name} (${room.id})`);
      return room;
    } catch (error) {
      console.error('خطأ في إنشاء الغرفة:', error);
      throw error;
    }
  }

  /**
   * حذف غرفة
   */
  async deleteRoom(roomId: string, userId: number): Promise<void> {
    try {
      if (!db || dbType === 'disabled') {
        throw new Error('قاعدة البيانات غير متوفرة');
      }

      const room = await this.getRoom(roomId);
      if (!room) {
        throw new Error('الغرفة غير موجودة');
      }

      // لا يمكن حذف الغرفة الافتراضية
      if (room.isDefault) {
        throw new Error('لا يمكن حذف الغرفة الافتراضية');
      }

      // التحقق من الصلاحيات
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      const canDelete = room.createdBy === userId || ['admin', 'owner'].includes(user.userType);
      if (!canDelete) {
        throw new Error('ليس لديك صلاحية لحذف هذه الغرفة');
      }

      // حذف صورة الغرفة إن وجدت
      if (room.icon) {
        const imagePath = path.join(process.cwd(), 'client', 'public', room.icon);
        if (fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);
            console.log(`🗑️ تم حذف صورة الغرفة: ${room.icon}`);
          } catch (err) {
            console.warn(`⚠️ تعذر حذف صورة الغرفة: ${err}`);
          }
        }
      }

      // حذف الغرفة من قاعدة البيانات
      await storage.deleteRoom(roomId);

      // تنظيف ذاكرة الغرف المتصلة
      this.connectedRooms.delete(roomId);
      
      // نقل المستخدمين المتصلين للغرفة العامة
      for (const [uId, currentRoomId] of this.userRooms.entries()) {
        if (currentRoomId === roomId) {
          this.userRooms.set(uId, 'general');
        }
      }

      console.log(`🗑️ تم حذف الغرفة: ${room.name} (${roomId})`);
    } catch (error) {
      console.error('خطأ في حذف الغرفة:', error);
      throw error;
    }
  }

  /**
   * انضمام مستخدم للغرفة
   */
  async joinRoom(userId: number, roomId: string): Promise<void> {
    try {
      if (!db || dbType === 'disabled') {
        throw new Error('قاعدة البيانات غير متوفرة');
      }

      const room = await this.getRoom(roomId);
      if (!room) {
        throw new Error('الغرفة غير موجودة');
      }

      if (!room.isActive) {
        throw new Error('الغرفة غير نشطة');
      }

      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      // إضافة للذاكرة المحلية
      if (!this.connectedRooms.has(roomId)) {
        this.connectedRooms.set(roomId, new Set());
      }
      this.connectedRooms.get(roomId)!.add(userId);

      // تحديث الغرفة الحالية للمستخدم
      const previousRoom = this.userRooms.get(userId);
      if (previousRoom && previousRoom !== roomId) {
        this.leaveRoomMemory(userId, previousRoom);
      }
      this.userRooms.set(userId, roomId);

      // حفظ في قاعدة البيانات إذا لزم الأمر
      await storage.joinRoom(userId, roomId);

      console.log(`🏠 المستخدم ${user.username} انضم للغرفة ${room.name}`);
    } catch (error) {
      console.error('خطأ في الانضمام للغرفة:', error);
      throw error;
    }
  }

  /**
   * مغادرة مستخدم للغرفة
   */
  async leaveRoom(userId: number, roomId: string): Promise<void> {
    try {
      // إزالة من الذاكرة المحلية
      this.leaveRoomMemory(userId, roomId);

      // حفظ في قاعدة البيانات إذا لزم الأمر
      if (db && dbType !== 'disabled') {
        await storage.leaveRoom(userId, roomId);
      }

      const user = await storage.getUser(userId);
      console.log(`🚪 المستخدم ${user?.username} غادر الغرفة ${roomId}`);
    } catch (error) {
      console.error('خطأ في مغادرة الغرفة:', error);
      throw error;
    }
  }

  /**
   * مغادرة من الذاكرة فقط
   */
  private leaveRoomMemory(userId: number, roomId: string): void {
    if (this.connectedRooms.has(roomId)) {
      this.connectedRooms.get(roomId)!.delete(userId);
      
      // حذف الغرفة من الذاكرة إذا أصبحت فارغة (عدا الغرفة العامة)
      if (this.connectedRooms.get(roomId)!.size === 0 && roomId !== 'general') {
        this.connectedRooms.delete(roomId);
      }
    }

    // إزالة من userRooms إذا كان في هذه الغرفة
    if (this.userRooms.get(userId) === roomId) {
      this.userRooms.delete(userId);
    }
  }

  /**
   * جلب مستخدمي الغرفة
   */
  async getRoomUsers(roomId: string): Promise<any[]> {
    try {
      if (!db || dbType === 'disabled') {
        return [];
      }

      // جلب من قاعدة البيانات أولاً
      const dbUsers = await storage.getRoomUsers(roomId);
      
      // دمج مع المستخدمين المتصلين في الذاكرة
      const connectedUserIds = this.connectedRooms.get(roomId) || new Set();
      const allUserIds = new Set([
        ...dbUsers.map((u: any) => u.id),
        ...Array.from(connectedUserIds)
      ]);

      // جلب بيانات جميع المستخدمين
      const users = [];
      for (const userId of allUserIds) {
        try {
          const user = await storage.getUser(userId);
          if (user) {
            users.push(user);
          }
        } catch (err) {
          console.warn(`تعذر جلب بيانات المستخدم ${userId}:`, err);
        }
      }

      return users;
    } catch (error) {
      console.error(`خطأ في جلب مستخدمي الغرفة ${roomId}:`, error);
      return [];
    }
  }

  /**
   * تحديث عدد المستخدمين في الغرفة
   */
  async updateRoomUserCount(roomId: string): Promise<number> {
    try {
      const users = await this.getRoomUsers(roomId);
      const count = users.length;

      // تحديث في قاعدة البيانات إذا أمكن
      if (db && dbType !== 'disabled') {
        await storage.updateRoomUserCount(roomId, count);
      }

      return count;
    } catch (error) {
      console.error(`خطأ في تحديث عدد مستخدمي الغرفة ${roomId}:`, error);
      return 0;
    }
  }

  /**
   * إدارة غرف البث - طلب الميكروفون
   */
  async requestMic(roomId: string, userId: number): Promise<void> {
    try {
      const room = await this.getRoom(roomId);
      if (!room || !room.isBroadcast) {
        throw new Error('الغرفة غير صالحة للبث');
      }

      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      await storage.addToMicQueue(roomId, userId);
      console.log(`🎤 المستخدم ${user.username} طلب الميكروفون في غرفة ${room.name}`);
    } catch (error) {
      console.error('خطأ في طلب الميكروفون:', error);
      throw error;
    }
  }

  /**
   * إدارة غرف البث - موافقة على الميكروفون
   */
  async approveMic(roomId: string, userId: number, approvedBy: number): Promise<void> {
    try {
      const room = await this.getRoom(roomId);
      if (!room || !room.isBroadcast) {
        throw new Error('الغرفة غير صالحة للبث');
      }

      // التحقق من الصلاحيات
      const approver = await storage.getUser(approvedBy);
      if (!approver) {
        throw new Error('المستخدم غير موجود');
      }

      const canApprove = room.hostId === approvedBy || ['admin', 'owner'].includes(approver.userType);
      if (!canApprove) {
        throw new Error('ليس لديك صلاحية لإدارة الميكروفونات');
      }

      await storage.removeFromMicQueue(roomId, userId);
      await storage.addSpeaker(roomId, userId);

      const user = await storage.getUser(userId);
      console.log(`✅ تمت الموافقة على ميكروفون ${user?.username} في غرفة ${room.name}`);
    } catch (error) {
      console.error('خطأ في الموافقة على الميكروفون:', error);
      throw error;
    }
  }

  /**
   * إدارة غرف البث - رفض الميكروفون
   */
  async rejectMic(roomId: string, userId: number, rejectedBy: number): Promise<void> {
    try {
      const room = await this.getRoom(roomId);
      if (!room || !room.isBroadcast) {
        throw new Error('الغرفة غير صالحة للبث');
      }

      // التحقق من الصلاحيات
      const rejecter = await storage.getUser(rejectedBy);
      if (!rejecter) {
        throw new Error('المستخدم غير موجود');
      }

      const canReject = room.hostId === rejectedBy || ['admin', 'owner'].includes(rejecter.userType);
      if (!canReject) {
        throw new Error('ليس لديك صلاحية لإدارة الميكروفونات');
      }

      await storage.removeFromMicQueue(roomId, userId);

      const user = await storage.getUser(userId);
      console.log(`❌ تم رفض ميكروفون ${user?.username} في غرفة ${room.name}`);
    } catch (error) {
      console.error('خطأ في رفض الميكروفون:', error);
      throw error;
    }
  }

  /**
   * إدارة غرف البث - إزالة متحدث
   */
  async removeSpeaker(roomId: string, userId: number, removedBy: number): Promise<void> {
    try {
      const room = await this.getRoom(roomId);
      if (!room || !room.isBroadcast) {
        throw new Error('الغرفة غير صالحة للبث');
      }

      // التحقق من الصلاحيات
      const remover = await storage.getUser(removedBy);
      if (!remover) {
        throw new Error('المستخدم غير موجود');
      }

      const canRemove = room.hostId === removedBy || ['admin', 'owner'].includes(remover.userType);
      if (!canRemove) {
        throw new Error('ليس لديك صلاحية لإدارة الميكروفونات');
      }

      await storage.removeSpeaker(roomId, userId);

      const user = await storage.getUser(userId);
      console.log(`🔇 تم إزالة ${user?.username} من المتحدثين في غرفة ${room.name}`);
    } catch (error) {
      console.error('خطأ في إزالة المتحدث:', error);
      throw error;
    }
  }

  /**
   * جلب معلومات البث
   */
  async getBroadcastInfo(roomId: string): Promise<BroadcastInfo | null> {
    try {
      const room = await this.getRoom(roomId);
      if (!room || !room.isBroadcast) {
        return null;
      }

      return {
        hostId: room.hostId || null,
        speakers: room.speakers || [],
        micQueue: room.micQueue || []
      };
    } catch (error) {
      console.error(`خطأ في جلب معلومات البث للغرفة ${roomId}:`, error);
      return null;
    }
  }

  /**
   * الحصول على إحصائيات الغرف
   */
  async getRoomsStats(): Promise<{
    totalRooms: number;
    activeRooms: number;
    broadcastRooms: number;
    totalConnectedUsers: number;
  }> {
    try {
      const rooms = await this.getAllRooms();
      const totalRooms = rooms.length;
      const activeRooms = rooms.filter(r => r.isActive).length;
      const broadcastRooms = rooms.filter(r => r.isBroadcast).length;
      
      let totalConnectedUsers = 0;
      for (const userSet of this.connectedRooms.values()) {
        totalConnectedUsers += userSet.size;
      }

      return {
        totalRooms,
        activeRooms,
        broadcastRooms,
        totalConnectedUsers
      };
    } catch (error) {
      console.error('خطأ في جلب إحصائيات الغرف:', error);
      return {
        totalRooms: 0,
        activeRooms: 0,
        broadcastRooms: 0,
        totalConnectedUsers: 0
      };
    }
  }

  /**
   * تنظيف الغرف - إزالة المستخدمين غير المتصلين
   */
  cleanupRooms(): void {
    console.log('🧹 تنظيف الغرف...');
    
    for (const [roomId, userSet] of this.connectedRooms.entries()) {
      if (userSet.size === 0 && roomId !== 'general') {
        this.connectedRooms.delete(roomId);
        console.log(`🗑️ تم حذف الغرفة الفارغة ${roomId} من الذاكرة`);
      }
    }

    console.log(`✅ تنظيف الغرف مكتمل. الغرف النشطة: ${this.connectedRooms.size}`);
  }
}

// تصدير instance واحد
export const roomService = new RoomService();