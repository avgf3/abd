import { EventEmitter } from 'events';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { db } from '../database-adapter';
import { rooms, roomUsers, users, messages } from '../../shared/schema';
import type { User } from '../../shared/schema';

export interface RoomInfo {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  createdBy: number;
  isDefault: boolean;
  isActive: boolean;
  isBroadcast: boolean;
  hostId?: number;
  speakers: number[];
  micQueue: number[];
  createdAt: Date;
  userCount: number;
  onlineUserCount: number;
}

export class RoomService extends EventEmitter {
  constructor() {
    super();
  }

  // جلب جميع الغرف
  async getAllRooms(includeInactive = false): Promise<RoomInfo[]> {
    try {
      const query = db.select().from(rooms);
      
      if (!includeInactive) {
        query.where(eq(rooms.isActive, true));
      }
      
      const roomList = await query.orderBy(desc(rooms.isDefault), asc(rooms.createdAt));
      
      const roomInfos = await Promise.all(
        roomList.map(room => this.formatRoomInfo(room))
      );

      return roomInfos;
    } catch (error) {
      console.error('❌ Error getting all rooms:', error);
      // إرجاع الغرف الافتراضية في حالة الخطأ
      return [
        {
          id: 'general',
          name: 'الدردشة العامة',
          description: 'الغرفة الرئيسية للدردشة',
          createdBy: 1,
          isDefault: true,
          isActive: true,
          isBroadcast: false,
          speakers: [],
          micQueue: [],
          createdAt: new Date(),
          userCount: 0,
          onlineUserCount: 0
        }
      ];
    }
  }

  // إنشاء غرفة جديدة
  async createRoom(roomData: {
    id?: string;
    name: string;
    description?: string;
    icon?: string;
    createdBy: number;
    isBroadcast?: boolean;
    hostId?: number;
  }): Promise<RoomInfo> {
    try {
      const roomId = roomData.id || `room_${Date.now()}`;
      
      // التحقق من عدم وجود الغرفة
      const existingRoom = await this.getRoom(roomId);
      if (existingRoom) {
        throw new Error(`Room with ID ${roomId} already exists`);
      }

      const newRoom = await db.insert(rooms).values({
        id: roomId,
        name: roomData.name,
        description: roomData.description || '',
        icon: roomData.icon || '',
        createdBy: roomData.createdBy,
        isDefault: false,
        isActive: true,
        isBroadcast: roomData.isBroadcast || false,
        hostId: roomData.hostId,
        speakers: JSON.stringify([]),
        micQueue: JSON.stringify([]),
      }).returning();

      const roomInfo = await this.formatRoomInfo(newRoom[0]);
      
      this.emit('room_created', roomInfo);
      console.log(`✅ Room created: ${roomData.name} (${roomId})`);
      
      return roomInfo;
    } catch (error) {
      console.error(`❌ Error creating room:`, error);
      throw error;
    }
  }

  // جلب غرفة محددة
  async getRoom(roomId: string): Promise<RoomInfo | null> {
    try {
      const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
      
      if (room.length === 0) {
        return null;
      }

      return await this.formatRoomInfo(room[0]);
    } catch (error) {
      console.error(`❌ Error getting room ${roomId}:`, error);
      return null;
    }
  }

  // انضمام لغرفة
  async joinRoom(userId: number, roomId: string): Promise<void> {
    try {
      // التأكد من وجود الغرفة
      const room = await this.getRoom(roomId);
      if (!room && roomId !== 'general') {
        throw new Error(`Room ${roomId} does not exist`);
      }

      // التأكد من وجود الغرفة العامة
      if (roomId === 'general') {
        await this.ensureGeneralRoom();
      }

      // التحقق من عدم وجود المستخدم في الغرفة مسبقاً
      const existingMembership = await db.select()
        .from(roomUsers)
        .where(and(eq(roomUsers.userId, userId), eq(roomUsers.roomId, roomId)))
        .limit(1);

      if (existingMembership.length === 0) {
        await db.insert(roomUsers).values({
          userId: userId,
          roomId: roomId,
        });

        console.log(`✅ User ${userId} joined room ${roomId}`);
      }

      this.emit('user_joined_room', { userId, roomId });
    } catch (error) {
      console.error(`❌ Error joining room ${roomId} for user ${userId}:`, error);
      throw error;
    }
  }

  // مغادرة غرفة
  async leaveRoom(userId: number, roomId: string): Promise<void> {
    try {
      await db.delete(roomUsers)
        .where(and(eq(roomUsers.userId, userId), eq(roomUsers.roomId, roomId)));

      this.emit('user_left_room', { userId, roomId });
      console.log(`✅ User ${userId} left room ${roomId}`);
    } catch (error) {
      console.error(`❌ Error leaving room ${roomId} for user ${userId}:`, error);
      throw error;
    }
  }

  // حذف غرفة
  async deleteRoom(roomId: string): Promise<void> {
    try {
      if (roomId === 'general') {
        throw new Error('Cannot delete the general room');
      }

      const room = await this.getRoom(roomId);
      if (!room) {
        throw new Error(`Room ${roomId} not found`);
      }

      // حذف جميع المستخدمين من الغرفة
      await db.delete(roomUsers).where(eq(roomUsers.roomId, roomId));
      
      // حذف جميع الرسائل في الغرفة
      await db.delete(messages).where(eq(messages.roomId, roomId));
      
      // حذف الغرفة
      await db.delete(rooms).where(eq(rooms.id, roomId));

      this.emit('room_deleted', { roomId, room });
      console.log(`✅ Room deleted: ${roomId}`);
    } catch (error) {
      console.error(`❌ Error deleting room ${roomId}:`, error);
      throw error;
    }
  }

  // جلب مستخدمي الغرفة
  async getRoomUsers(roomId: string): Promise<number[]> {
    try {
      const roomUserList = await db.select({ userId: roomUsers.userId })
        .from(roomUsers)
        .where(eq(roomUsers.roomId, roomId));

      return roomUserList.map(row => row.userId);
    } catch (error) {
      console.error(`❌ Error getting users for room ${roomId}:`, error);
      return [];
    }
  }

  // جلب المستخدمين المتصلين في الغرفة
  async getOnlineUsersInRoom(roomId: string): Promise<User[]> {
    try {
      const onlineUsers = await db.select({
        id: users.id,
        username: users.username,
        userType: users.userType,
        role: users.role,
        profileImage: users.profileImage,
        isOnline: users.isOnline,
        lastSeen: users.lastSeen,
      })
      .from(users)
      .innerJoin(roomUsers, eq(users.id, roomUsers.userId))
      .where(and(
        eq(roomUsers.roomId, roomId),
        eq(users.isOnline, true)
      ))
      .orderBy(asc(users.username));

      return onlineUsers as User[];
    } catch (error) {
      console.error(`❌ Error getting online users for room ${roomId}:`, error);
      return [];
    }
  }

  // التأكد من وجود الغرفة العامة
  async ensureGeneralRoom(): Promise<void> {
    try {
      const generalRoom = await this.getRoom('general');
      if (!generalRoom) {
        await this.createRoom({
          id: 'general',
          name: 'الدردشة العامة',
          description: 'الغرفة الافتراضية لجميع المستخدمين',
          createdBy: 1,
          isBroadcast: false,
        });
        console.log('✅ General room created');
      }
    } catch (error) {
      console.error('❌ Error ensuring general room exists:', error);
    }
  }

  // تنسيق معلومات الغرفة
  private async formatRoomInfo(room: any): Promise<RoomInfo> {
    try {
      // حساب عدد المستخدمين
      const userCount = await db.select({ count: sql<number>`count(*)` })
        .from(roomUsers)
        .where(eq(roomUsers.roomId, room.id));

      const onlineUserCount = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .innerJoin(roomUsers, eq(users.id, roomUsers.userId))
        .where(and(
          eq(roomUsers.roomId, room.id),
          eq(users.isOnline, true)
        ));

      return {
        id: room.id,
        name: room.name,
        description: room.description,
        icon: room.icon,
        createdBy: room.createdBy,
        isDefault: room.isDefault,
        isActive: room.isActive,
        isBroadcast: room.isBroadcast,
        hostId: room.hostId,
        speakers: room.speakers ? JSON.parse(room.speakers) : [],
        micQueue: room.micQueue ? JSON.parse(room.micQueue) : [],
        createdAt: room.createdAt,
        userCount: userCount[0]?.count || 0,
        onlineUserCount: onlineUserCount[0]?.count || 0,
      };
    } catch (error) {
      console.error('❌ Error formatting room info:', error);
      return {
        id: room.id,
        name: room.name,
        description: room.description,
        icon: room.icon,
        createdBy: room.createdBy,
        isDefault: room.isDefault || false,
        isActive: room.isActive || true,
        isBroadcast: room.isBroadcast || false,
        hostId: room.hostId,
        speakers: [],
        micQueue: [],
        createdAt: room.createdAt || new Date(),
        userCount: 0,
        onlineUserCount: 0,
      };
    }
  }

  // إحصائيات الغرفة
  async getRoomStats(roomId: string): Promise<any> {
    try {
      const room = await this.getRoom(roomId);
      if (!room) {
        throw new Error(`Room ${roomId} not found`);
      }

      const messageCount = await db.select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(eq(messages.roomId, roomId));

      return {
        room,
        totalMessages: messageCount[0]?.count || 0,
        totalUsers: room.userCount,
        onlineUsers: room.onlineUserCount,
      };
    } catch (error) {
      console.error(`❌ Error getting stats for room ${roomId}:`, error);
      throw error;
    }
  }
}

// إنشاء instance واحد
export const roomService = new RoomService();