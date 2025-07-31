import { EventEmitter } from 'events';
import { z } from 'zod';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { db } from '../database-adapter';
import { rooms, roomUsers, users, messages } from '../../shared/schema';
import type { User } from '../../shared/schema';

// Room validation schemas
const createRoomSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  createdBy: z.number(),
  isDefault: z.boolean().default(false),
  isBroadcast: z.boolean().default(false),
  hostId: z.number().optional(),
});

const joinRoomSchema = z.object({
  userId: z.number(),
  roomId: z.string().min(1),
});

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

export interface RoomUser {
  userId: number;
  roomId: string;
  joinedAt: Date;
  user?: User;
}

export class RoomService extends EventEmitter {
  private roomCache = new Map<string, RoomInfo>();
  private userRoomCache = new Map<number, Set<string>>();
  private roomUserCache = new Map<string, Set<number>>();

  constructor() {
    super();
    this.setupCacheCleanup();
  }

  // Cache management
  private setupCacheCleanup() {
    // Clean cache every 5 minutes
    setInterval(() => {
      if (this.roomCache.size > 1000) {
        this.clearCache();
      }
    }, 5 * 60 * 1000);
  }

  private clearCache() {
    this.roomCache.clear();
    this.userRoomCache.clear();
    this.roomUserCache.clear();
    this.emit('cache_cleared');
  }

  private getCacheKey(prefix: string, ...keys: (string | number)[]): string {
    return `${prefix}:${keys.join(':')}`;
  }

  // Room CRUD operations
  async createRoom(roomData: z.infer<typeof createRoomSchema>): Promise<RoomInfo> {
    const validated = createRoomSchema.parse(roomData);
    
    try {
      // Check if room already exists
      const existingRoom = await this.getRoom(validated.id);
      if (existingRoom) {
        throw new Error(`Room with ID ${validated.id} already exists`);
      }

      const newRoom = await db.insert(rooms).values({
        ...validated,
        speakers: JSON.stringify([]),
        micQueue: JSON.stringify([]),
        isActive: true,
      }).returning();

      const roomInfo = await this.formatRoomInfo(newRoom[0]);
      
      // Update cache
      this.roomCache.set(validated.id, roomInfo);
      
      this.emit('room_created', roomInfo);
      console.log(`✅ Room created: ${validated.name} (${validated.id})`);
      
      return roomInfo;
    } catch (error) {
      console.error(`❌ Error creating room ${validated.id}:`, error);
      throw error;
    }
  }

  async getRoom(roomId: string): Promise<RoomInfo | null> {
    try {
      // Check cache first
      if (this.roomCache.has(roomId)) {
        return this.roomCache.get(roomId)!;
      }

      const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
      
      if (room.length === 0) {
        return null;
      }

      const roomInfo = await this.formatRoomInfo(room[0]);
      
      // Update cache
      this.roomCache.set(roomId, roomInfo);
      
      return roomInfo;
    } catch (error) {
      console.error(`❌ Error getting room ${roomId}:`, error);
      throw error;
    }
  }

  async getAllRooms(includeInactive = false): Promise<RoomInfo[]> {
    try {
      const query = db.select().from(rooms);
      
      if (!includeInactive) {
        query.where(eq(rooms.isActive, true));
      }
      
      const roomList = await query.orderBy(asc(rooms.createdAt));
      
      const roomInfos = await Promise.all(
        roomList.map(room => this.formatRoomInfo(room))
      );

      return roomInfos;
    } catch (error) {
      console.error('❌ Error getting all rooms:', error);
      throw error;
    }
  }

  async updateRoom(roomId: string, updates: Partial<RoomInfo>): Promise<RoomInfo | null> {
    try {
      const existingRoom = await this.getRoom(roomId);
      if (!existingRoom) {
        throw new Error(`Room ${roomId} not found`);
      }

      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
      if (updates.isBroadcast !== undefined) updateData.isBroadcast = updates.isBroadcast;
      if (updates.hostId !== undefined) updateData.hostId = updates.hostId;
      if (updates.speakers) updateData.speakers = JSON.stringify(updates.speakers);
      if (updates.micQueue) updateData.micQueue = JSON.stringify(updates.micQueue);

      await db.update(rooms).set(updateData).where(eq(rooms.id, roomId));

      // Clear cache and get updated room
      this.roomCache.delete(roomId);
      const updatedRoom = await this.getRoom(roomId);

      this.emit('room_updated', updatedRoom);
      console.log(`✅ Room updated: ${roomId}`);

      return updatedRoom;
    } catch (error) {
      console.error(`❌ Error updating room ${roomId}:`, error);
      throw error;
    }
  }

  async deleteRoom(roomId: string): Promise<void> {
    try {
      if (roomId === 'general') {
        throw new Error('Cannot delete the general room');
      }

      // Get room info before deletion
      const room = await this.getRoom(roomId);
      if (!room) {
        throw new Error(`Room ${roomId} not found`);
      }

      // Remove all users from room
      await db.delete(roomUsers).where(eq(roomUsers.roomId, roomId));
      
      // Delete all messages in room
      await db.delete(messages).where(eq(messages.roomId, roomId));
      
      // Delete the room
      await db.delete(rooms).where(eq(rooms.id, roomId));

      // Clear caches
      this.roomCache.delete(roomId);
      this.roomUserCache.delete(roomId);
      
      // Clear user room cache for all users
      this.userRoomCache.forEach((userRooms, userId) => {
        if (userRooms.has(roomId)) {
          userRooms.delete(roomId);
        }
      });

      this.emit('room_deleted', { roomId, room });
      console.log(`✅ Room deleted: ${roomId}`);
    } catch (error) {
      console.error(`❌ Error deleting room ${roomId}:`, error);
      throw error;
    }
  }

  // User-Room operations
  async joinRoom(userId: number, roomId: string): Promise<void> {
    const validated = joinRoomSchema.parse({ userId, roomId });
    
    try {
      // Ensure room exists
      const room = await this.getRoom(roomId);
      if (!room && roomId !== 'general') {
        throw new Error(`Room ${roomId} does not exist`);
      }

      // Ensure general room exists
      if (roomId === 'general') {
        await this.ensureGeneralRoom();
      }

      // Check if user is already in room
      const existingMembership = await db.select()
        .from(roomUsers)
        .where(and(eq(roomUsers.userId, userId), eq(roomUsers.roomId, roomId)))
        .limit(1);

      if (existingMembership.length === 0) {
        await db.insert(roomUsers).values({
          userId: validated.userId,
          roomId: validated.roomId,
        });

        console.log(`✅ User ${userId} joined room ${roomId}`);
      }

      // Update caches
      if (!this.userRoomCache.has(userId)) {
        this.userRoomCache.set(userId, new Set());
      }
      this.userRoomCache.get(userId)!.add(roomId);

      if (!this.roomUserCache.has(roomId)) {
        this.roomUserCache.set(roomId, new Set());
      }
      this.roomUserCache.get(roomId)!.add(userId);

      // Clear room cache to refresh user count
      this.roomCache.delete(roomId);

      this.emit('user_joined_room', { userId, roomId });
    } catch (error) {
      console.error(`❌ Error joining room ${roomId} for user ${userId}:`, error);
      throw error;
    }
  }

  async leaveRoom(userId: number, roomId: string): Promise<void> {
    try {
      await db.delete(roomUsers)
        .where(and(eq(roomUsers.userId, userId), eq(roomUsers.roomId, roomId)));

      // Update caches
      if (this.userRoomCache.has(userId)) {
        this.userRoomCache.get(userId)!.delete(roomId);
      }

      if (this.roomUserCache.has(roomId)) {
        this.roomUserCache.get(roomId)!.delete(userId);
      }

      // Clear room cache to refresh user count
      this.roomCache.delete(roomId);

      this.emit('user_left_room', { userId, roomId });
      console.log(`✅ User ${userId} left room ${roomId}`);
    } catch (error) {
      console.error(`❌ Error leaving room ${roomId} for user ${userId}:`, error);
      throw error;
    }
  }

  async getUserRooms(userId: number): Promise<string[]> {
    try {
      // Check cache first
      if (this.userRoomCache.has(userId)) {
        return Array.from(this.userRoomCache.get(userId)!);
      }

      const userRoomList = await db.select({ roomId: roomUsers.roomId })
        .from(roomUsers)
        .where(eq(roomUsers.userId, userId));

      const roomIds = userRoomList.map(row => row.roomId);

      // Update cache
      this.userRoomCache.set(userId, new Set(roomIds));

      return roomIds;
    } catch (error) {
      console.error(`❌ Error getting rooms for user ${userId}:`, error);
      throw error;
    }
  }

  async getRoomUsers(roomId: string): Promise<number[]> {
    try {
      // Check cache first
      if (this.roomUserCache.has(roomId)) {
        return Array.from(this.roomUserCache.get(roomId)!);
      }

      const roomUserList = await db.select({ userId: roomUsers.userId })
        .from(roomUsers)
        .where(eq(roomUsers.roomId, roomId));

      const userIds = roomUserList.map(row => row.userId);

      // Update cache
      this.roomUserCache.set(roomId, new Set(userIds));

      return userIds;
    } catch (error) {
      console.error(`❌ Error getting users for room ${roomId}:`, error);
      throw error;
    }
  }

  async getOnlineUsersInRoom(roomId: string): Promise<User[]> {
    try {
      const onlineUsers = await db.select({
        id: users.id,
        username: users.username,
        userType: users.userType,
        role: users.role,
        profileImage: users.profileImage,
        profileBanner: users.profileBanner,
        profileBackgroundColor: users.profileBackgroundColor,
        status: users.status,
        gender: users.gender,
        age: users.age,
        country: users.country,
        relation: users.relation,
        bio: users.bio,
        isOnline: users.isOnline,
        isHidden: users.isHidden,
        lastSeen: users.lastSeen,
        joinDate: users.joinDate,
        createdAt: users.createdAt,
        isMuted: users.isMuted,
        muteExpiry: users.muteExpiry,
        isBanned: users.isBanned,
        banExpiry: users.banExpiry,
        isBlocked: users.isBlocked,
        ipAddress: users.ipAddress,
        deviceId: users.deviceId,
        ignoredUsers: users.ignoredUsers,
        usernameColor: users.usernameColor,
        userTheme: users.userTheme,
        profileEffect: users.profileEffect,
        points: users.points,
        level: users.level,
        totalPoints: users.totalPoints,
        levelProgress: users.levelProgress,
      })
      .from(users)
      .innerJoin(roomUsers, eq(users.id, roomUsers.userId))
      .where(and(
        eq(roomUsers.roomId, roomId),
        eq(users.isOnline, true),
        eq(users.isHidden, false)
      ))
      .orderBy(asc(users.username));

      // Transform ignoredUsers from string to array
      return onlineUsers.map(user => ({
        ...user,
        ignoredUsers: user.ignoredUsers ? JSON.parse(user.ignoredUsers) : []
      }));
    } catch (error) {
      console.error(`❌ Error getting online users for room ${roomId}:`, error);
      throw error;
    }
  }

  // Utility methods
  async ensureGeneralRoom(): Promise<void> {
    try {
      const generalRoom = await this.getRoom('general');
      if (!generalRoom) {
        await this.createRoom({
          id: 'general',
          name: 'الغرفة العامة',
          description: 'الغرفة الافتراضية لجميع المستخدمين',
          createdBy: 1, // System user
          isDefault: true,
          isBroadcast: false,
        });
        console.log('✅ General room created');
      }
    } catch (error) {
      console.error('❌ Error ensuring general room exists:', error);
      throw error;
    }
  }

  private async formatRoomInfo(room: any): Promise<RoomInfo> {
    // Get user counts
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
  }

  // Broadcast room specific methods
  async requestMic(userId: number, roomId: string): Promise<boolean> {
    try {
      const room = await this.getRoom(roomId);
      if (!room || !room.isBroadcast) {
        throw new Error('Room not found or not a broadcast room');
      }

      // Add to mic queue if not already present
      if (!room.micQueue.includes(userId)) {
        const updatedQueue = [...room.micQueue, userId];
        await this.updateRoom(roomId, { micQueue: updatedQueue });
        
        this.emit('mic_requested', { userId, roomId });
        console.log(`✅ User ${userId} requested mic in room ${roomId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Error requesting mic for user ${userId} in room ${roomId}:`, error);
      throw error;
    }
  }

  async approveMicRequest(roomId: string, userId: number, approvedBy: number): Promise<boolean> {
    try {
      const room = await this.getRoom(roomId);
      if (!room || !room.isBroadcast) {
        throw new Error('Room not found or not a broadcast room');
      }

      // Remove from queue and add to speakers
      const updatedQueue = room.micQueue.filter(id => id !== userId);
      const updatedSpeakers = room.speakers.includes(userId) 
        ? room.speakers 
        : [...room.speakers, userId];

      await this.updateRoom(roomId, { 
        micQueue: updatedQueue, 
        speakers: updatedSpeakers 
      });

      this.emit('mic_approved', { userId, roomId, approvedBy });
      console.log(`✅ User ${approvedBy} approved mic for user ${userId} in room ${roomId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error approving mic for user ${userId} in room ${roomId}:`, error);
      throw error;
    }
  }

  async rejectMicRequest(roomId: string, userId: number, rejectedBy: number): Promise<boolean> {
    try {
      const room = await this.getRoom(roomId);
      if (!room || !room.isBroadcast) {
        throw new Error('Room not found or not a broadcast room');
      }

      // Remove from queue
      const updatedQueue = room.micQueue.filter(id => id !== userId);
      await this.updateRoom(roomId, { micQueue: updatedQueue });

      this.emit('mic_rejected', { userId, roomId, rejectedBy });
      console.log(`❌ User ${rejectedBy} rejected mic for user ${userId} in room ${roomId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error rejecting mic for user ${userId} in room ${roomId}:`, error);
      throw error;
    }
  }

  async removeSpeaker(roomId: string, userId: number, removedBy: number): Promise<boolean> {
    try {
      const room = await this.getRoom(roomId);
      if (!room || !room.isBroadcast) {
        throw new Error('Room not found or not a broadcast room');
      }

      // Remove from speakers
      const updatedSpeakers = room.speakers.filter(id => id !== userId);
      await this.updateRoom(roomId, { speakers: updatedSpeakers });

      this.emit('speaker_removed', { userId, roomId, removedBy });
      console.log(`🔇 User ${removedBy} removed user ${userId} from speakers in room ${roomId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error removing speaker ${userId} from room ${roomId}:`, error);
      throw error;
    }
  }

  // Statistics
  async getRoomStats(roomId: string): Promise<any> {
    try {
      const room = await this.getRoom(roomId);
      if (!room) {
        throw new Error(`Room ${roomId} not found`);
      }

      const messageCount = await db.select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(eq(messages.roomId, roomId));

      const todayMessages = await db.select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(and(
          eq(messages.roomId, roomId),
          sql`DATE(${messages.timestamp}) = CURRENT_DATE`
        ));

      return {
        room,
        totalMessages: messageCount[0]?.count || 0,
        todayMessages: todayMessages[0]?.count || 0,
        totalUsers: room.userCount,
        onlineUsers: room.onlineUserCount,
      };
    } catch (error) {
      console.error(`❌ Error getting stats for room ${roomId}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
export const roomService = new RoomService();