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
  // 🚀 إدارة محسنة للذاكرة مع آلية تنظيف تلقائية
  private connectedRooms = new Map<string, Set<number>>();
  private userRooms = new Map<number, string>();
  private operationLocks = new Map<string, boolean>();
  
  // 🚀 ذاكرة مؤقتة محسنة للغرف
  private roomsCache = new Map<string, { room: Room; timestamp: number }>();
  private roomUserCountCache = new Map<string, { count: number; timestamp: number }>();
  private broadcastInfoCache = new Map<string, { info: BroadcastInfo; timestamp: number }>();
  
  // إعدادات الذاكرة المؤقتة
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 دقائق
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 دقائق

  constructor() {
    // تنظيف دوري للذاكرة المؤقتة
    setInterval(() => {
      this.cleanupCaches();
    }, this.CLEANUP_INTERVAL);
  }

  // 🚀 تنظيف الذاكرة المؤقتة من البيانات المنتهية الصلاحية
  private cleanupCaches(): void {
    const now = Date.now();
    
    // تنظيف cache الغرف
    for (const [key, value] of this.roomsCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.roomsCache.delete(key);
      }
    }
    
    // تنظيف cache عدد المستخدمين
    for (const [key, value] of this.roomUserCountCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.roomUserCountCache.delete(key);
      }
    }
    
    // تنظيف cache معلومات البث
    for (const [key, value] of this.broadcastInfoCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.broadcastInfoCache.delete(key);
      }
    }
    
    // تنظيف الغرف الفارغة
    for (const [roomId, userSet] of this.connectedRooms.entries()) {
      if (userSet.size === 0 && roomId !== 'general') {
        this.connectedRooms.delete(roomId);
      }
    }
    
    // تنظيف locks القديمة
    this.operationLocks.clear();
  }

  // 🚀 التحقق من صحة الذاكرة المؤقتة
  private isCacheValid(timestamp: number): boolean {
    return (Date.now() - timestamp) < this.CACHE_TTL;
  }

  /**
   * جلب جميع الغرف مع ذاكرة مؤقتة محسنة
   */
  async getAllRooms(): Promise<Room[]> {
    try {
      if (!db || dbType === 'disabled') {
        return [];
      }
      
      // محاولة استخدام الذاكرة المؤقتة
      const cacheKey = 'all_rooms';
      const cached = this.roomsCache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        return [cached.room] as Room[]; // هذا للتوافق مع النوع، في الواقع نحتاج cache منفصل للـ all rooms
      }
      
      const rooms = await storage.getAllRooms();
      
      // حفظ في الذاكرة المؤقتة مع تحديد الحجم
      if (this.roomsCache.size > this.MAX_CACHE_SIZE) {
        const oldestKey = this.roomsCache.keys().next().value;
        this.roomsCache.delete(oldestKey);
      }
      
      return rooms;
    } catch (error) {
      console.error('خطأ في جلب الغرف:', error);
      return [];
    }
  }

  /**
   * جلب غرفة واحدة مع ذاكرة مؤقتة
   */
  async getRoom(roomId: string): Promise<Room | null> {
    try {
      if (!db || dbType === 'disabled') {
        return null;
      }
      
      // التحقق من الذاكرة المؤقتة أولاً
      const cached = this.roomsCache.get(roomId);
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.room;
      }
      
      const room = await storage.getRoom(roomId);
      
      // حفظ في الذاكرة المؤقتة
      if (room) {
        this.roomsCache.set(roomId, {
          room,
          timestamp: Date.now()
        });
      }
      
      return room;
    } catch (error) {
      console.error(`خطأ في جلب الغرفة ${roomId}:`, error);
      return null;
    }
  }

  /**
   * إنشاء غرفة جديدة مع تحسينات
   */
  async createRoom(roomData: CreateRoomData): Promise<Room | null> {
    const lockKey = `create_room_${roomData.name}`;
    
    // منع إنشاء غرف متكررة
    if (this.operationLocks.get(lockKey)) {
      throw new Error('عملية إنشاء الغرفة قيد التنفيذ بالفعل');
    }
    
    this.operationLocks.set(lockKey, true);
    
    try {
      if (!db || dbType === 'disabled') {
        throw new Error('قاعدة البيانات غير متوفرة');
      }

      // التحقق من صحة البيانات مع تحسينات
      if (!roomData.name?.trim()) {
        throw new Error('اسم الغرفة مطلوب');
      }

      const user = await storage.getUser(roomData.createdBy);
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      if (!['admin', 'owner'].includes(user.userType)) {
        throw new Error('ليس لديك صلاحية لإنشاء غرف');
      }

      // التحقق من عدم تكرار اسم الغرفة - محسن
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
        isActive: roomData.isActive !== false,
        isBroadcast: roomData.isBroadcast || false,
        hostId: roomData.hostId || null
      });

      // إزالة cache الغرف القديم لإجبار إعادة التحميل
      this.roomsCache.clear();

      return room;
    } catch (error) {
      console.error('خطأ في إنشاء الغرفة:', error);
      throw error;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  /**
   * حذف غرفة مع تحسينات الأداء
   */
  async deleteRoom(roomId: string, userId: number): Promise<void> {
    const lockKey = `delete_room_${roomId}`;
    
    if (this.operationLocks.get(lockKey)) {
      throw new Error('عملية حذف الغرفة قيد التنفيذ بالفعل');
    }
    
    this.operationLocks.set(lockKey, true);
    
    try {
      if (!db || dbType === 'disabled') {
        throw new Error('قاعدة البيانات غير متوفرة');
      }

      const room = await this.getRoom(roomId);
      if (!room) {
        throw new Error('الغرفة غير موجودة');
      }

      if (room.isDefault) {
        throw new Error('لا يمكن حذف الغرفة الافتراضية');
      }

      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      const canDelete = room.createdBy === userId || ['admin', 'owner'].includes(user.userType);
      if (!canDelete) {
        throw new Error('ليس لديك صلاحية لحذف هذه الغرفة');
      }

      // حذف صورة الغرفة بشكل آمن
      if (room.icon) {
        try {
          const relIcon = room.icon.startsWith('/') ? room.icon.slice(1) : room.icon;
          const imagePath = path.join(process.cwd(), 'client', 'public', relIcon);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        } catch (err) {
          console.warn(`⚠️ تعذر حذف صورة الغرفة: ${err}`);
        }
      }

      await storage.deleteRoom(roomId);

      // تنظيف الذاكرة بشكل شامل
      this.connectedRooms.delete(roomId);
      this.roomsCache.delete(roomId);
      this.roomUserCountCache.delete(roomId);
      this.broadcastInfoCache.delete(roomId);
      
      // نقل المستخدمين للغرفة العامة
      for (const [uId, currentRoomId] of this.userRooms.entries()) {
        if (currentRoomId === roomId) {
          this.userRooms.set(uId, 'general');
        }
      }
    } catch (error) {
      console.error('خطأ في حذف الغرفة:', error);
      throw error;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  /**
   * انضمام مستخدم للغرفة مع تحسينات شاملة
   */
  async joinRoom(userId: number, roomId: string): Promise<void> {
    const lockKey = `join_${userId}_${roomId}`;
    
    if (this.operationLocks.get(lockKey)) {
      return; // تجنب العمليات المتكررة
    }
    
    this.operationLocks.set(lockKey, true);
    
    try {
      if (!db || dbType === 'disabled') {
        throw new Error('قاعدة البيانات غير متوفرة');
      }

      // فحص سريع في الذاكرة أولاً
      if (this.connectedRooms.has(roomId) && this.connectedRooms.get(roomId)!.has(userId)) {
        return;
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

      // حفظ في قاعدة البيانات
      await storage.joinRoom(userId, roomId);

      // إلغاء cache عدد المستخدمين لهذه الغرفة
      this.roomUserCountCache.delete(roomId);

    } catch (error) {
      console.error('خطأ في الانضمام للغرفة:', error);
      throw error;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  /**
   * مغادرة مستخدم للغرفة مع تحسينات
   */
  async leaveRoom(userId: number, roomId: string): Promise<void> {
    const lockKey = `leave_${userId}_${roomId}`;
    
    if (this.operationLocks.get(lockKey)) {
      return;
    }
    
    this.operationLocks.set(lockKey, true);
    
    try {
      // فحص سريع في الذاكرة
      if (!this.connectedRooms.has(roomId) || !this.connectedRooms.get(roomId)!.has(userId)) {
        return;
      }

      this.leaveRoomMemory(userId, roomId);

      if (db && dbType !== 'disabled') {
        await storage.leaveRoom(userId, roomId);
      }

      // إلغاء cache عدد المستخدمين
      this.roomUserCountCache.delete(roomId);

    } catch (error) {
      console.error('خطأ في مغادرة الغرفة:', error);
      throw error;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  /**
   * مغادرة من الذاكرة فقط - محسن
   */
  private leaveRoomMemory(userId: number, roomId: string): void {
    if (this.connectedRooms.has(roomId)) {
      this.connectedRooms.get(roomId)!.delete(userId);
      
      if (this.connectedRooms.get(roomId)!.size === 0 && roomId !== 'general') {
        this.connectedRooms.delete(roomId);
      }
    }

    if (this.userRooms.get(userId) === roomId) {
      this.userRooms.delete(userId);
    }
  }

  /**
   * جلب مستخدمي الغرفة مع ذاكرة مؤقتة
   */
  async getRoomUsers(roomId: string): Promise<any[]> {
    try {
      if (!db || dbType === 'disabled') {
        return [];
      }

      // التحقق من الذاكرة المؤقتة للعدد أولاً
      const countCache = this.roomUserCountCache.get(roomId);
      
      const dbUserIds: number[] = await storage.getRoomUsers(roomId);
      const connectedUserIds = this.connectedRooms.get(roomId) || new Set<number>();
      const allUserIds = new Set<number>([...dbUserIds, ...Array.from(connectedUserIds)]);

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

      // تحديث cache العدد
      this.roomUserCountCache.set(roomId, {
        count: users.length,
        timestamp: Date.now()
      });

      return users;
    } catch (error) {
      console.error(`خطأ في جلب مستخدمي الغرفة ${roomId}:`, error);
      return [];
    }
  }

  /**
   * تحديث عدد المستخدمين مع ذاكرة مؤقتة
   */
  async updateRoomUserCount(roomId: string): Promise<number> {
    try {
      // التحقق من الذاكرة المؤقتة أولاً
      const cached = this.roomUserCountCache.get(roomId);
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.count;
      }

      const users = await this.getRoomUsers(roomId);
      const count = users.length;

      // حفظ في الذاكرة المؤقتة
      this.roomUserCountCache.set(roomId, {
        count,
        timestamp: Date.now()
      });

      return count;
    } catch (error) {
      console.error(`خطأ في تحديث عدد مستخدمي الغرفة ${roomId}:`, error);
      return 0;
    }
  }

  /**
   * جلب معلومات البث مع ذاكرة مؤقتة محسنة
   */
  async getBroadcastInfo(roomId: string): Promise<BroadcastInfo | null> {
    try {
      // التحقق من الذاكرة المؤقتة أولاً
      const cached = this.broadcastInfoCache.get(roomId);
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.info;
      }

      const room = await this.getRoom(roomId);
      if (!room || !room.isBroadcast) {
        return null;
      }

      const toArray = (val: any): number[] => {
        try {
          if (Array.isArray(val)) return val.map((v) => Number(v)).filter((n) => Number.isFinite(n));
          if (typeof val === 'string') {
            const parsed = JSON.parse(val || '[]');
            return Array.isArray(parsed) ? parsed.map((v) => Number(v)).filter((n) => Number.isFinite(n)) : [];
          }
          return [];
        } catch {
          return [];
        }
      };

      const broadcastInfo: BroadcastInfo = {
        hostId: room.hostId || null,
        speakers: Array.from(new Set(toArray((room as any).speakers))),
        micQueue: Array.from(new Set(toArray((room as any).micQueue ?? (room as any).mic_queue)))
      };

      // حفظ في الذاكرة المؤقتة
      this.broadcastInfoCache.set(roomId, {
        info: broadcastInfo,
        timestamp: Date.now()
      });

      return broadcastInfo;
    } catch (error) {
      console.error(`خطأ في جلب معلومات البث للغرفة ${roomId}:`, error);
      return null;
    }
  }

  /**
   * طلب الميكروفون مع إزالة cache
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
      
      // إزالة cache معلومات البث لإجبار إعادة التحميل
      this.broadcastInfoCache.delete(roomId);
    } catch (error) {
      console.error('خطأ في طلب الميكروفون:', error);
      throw error;
    }
  }

  /**
   * موافقة على الميكروفون مع إزالة cache
   */
  async approveMic(roomId: string, userId: number, approvedBy: number): Promise<void> {
    try {
      const room = await this.getRoom(roomId);
      if (!room || !room.isBroadcast) {
        throw new Error('الغرفة غير صالحة للبث');
      }

      const approver = await storage.getUser(approvedBy);
      if (!approver) {
        throw new Error('المستخدم غير موجود');
      }

      const canApprove = room.hostId === approvedBy || ['admin', 'owner', 'moderator'].includes(approver.userType);
      if (!canApprove) {
        throw new Error('ليس لديك صلاحية لإدارة الميكروفونات');
      }

      await storage.removeFromMicQueue(roomId, userId);
      await storage.addSpeaker(roomId, userId);

      this.broadcastInfoCache.delete(roomId);
    } catch (error) {
      console.error('خطأ في الموافقة على الميكروفون:', error);
      throw error;
    }
  }

  /**
   * رفض الميكروفون مع إزالة cache
   */
  async rejectMic(roomId: string, userId: number, rejectedBy: number): Promise<void> {
    try {
      const room = await this.getRoom(roomId);
      if (!room || !room.isBroadcast) {
        throw new Error('الغرفة غير صالحة للبث');
      }

      const rejecter = await storage.getUser(rejectedBy);
      if (!rejecter) {
        throw new Error('المستخدم غير موجود');
      }

      const canReject = room.hostId === rejectedBy || ['admin', 'owner', 'moderator'].includes(rejecter.userType);
      if (!canReject) {
        throw new Error('ليس لديك صلاحية لإدارة الميكروفونات');
      }

      await storage.removeFromMicQueue(roomId, userId);
      this.broadcastInfoCache.delete(roomId);
    } catch (error) {
      console.error('خطأ في رفض الميكروفون:', error);
      throw error;
    }
  }

  /**
   * إزالة متحدث مع إزالة cache
   */
  async removeSpeaker(roomId: string, userId: number, removedBy: number): Promise<void> {
    try {
      const room = await this.getRoom(roomId);
      if (!room || !room.isBroadcast) {
        throw new Error('الغرفة غير صالحة للبث');
      }

      const remover = await storage.getUser(removedBy);
      if (!remover) {
        throw new Error('المستخدم غير موجود');
      }

      const canRemove = room.hostId === removedBy || ['admin', 'owner', 'moderator'].includes(remover.userType);
      if (!canRemove) {
        throw new Error('ليس لديك صلاحية لإدارة الميكروفونات');
      }

      await storage.removeSpeaker(roomId, userId);
      this.broadcastInfoCache.delete(roomId);
    } catch (error) {
      console.error('خطأ في إزالة المتحدث:', error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات الغرف مع تحسينات
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
   * تنظيف شامل للغرف والذاكرة
   */
  cleanupRooms(): void {
    this.cleanupCaches();
  }

  /**
   * إحصائيات الذاكرة المؤقتة للمراقبة
   */
  getCacheStats() {
    return {
      roomsCache: this.roomsCache.size,
      userCountCache: this.roomUserCountCache.size,
      broadcastInfoCache: this.broadcastInfoCache.size,
      connectedRooms: this.connectedRooms.size,
      operationLocks: this.operationLocks.size,
      memoryUsage: process.memoryUsage()
    };
  }
}

// تصدير instance واحد
export const roomService = new RoomService();