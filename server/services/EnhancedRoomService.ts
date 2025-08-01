import { EventEmitter } from 'events';
import { z } from 'zod';
import { eq, and, sql, desc, asc, inArray, or, not } from 'drizzle-orm';
import { db } from '../database-adapter';
import { rooms, roomUsers, users, messages, notifications } from '../../shared/schema';
import type { User } from '../../shared/schema';

// Validation schemas
const createRoomSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Room ID can only contain letters, numbers, hyphens, and underscores'),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  createdBy: z.number(),
  isDefault: z.boolean().default(false),
  isBroadcast: z.boolean().default(false),
  isPrivate: z.boolean().default(false),
  maxUsers: z.number().min(1).max(1000).default(100),
  hostId: z.number().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const joinRoomSchema = z.object({
  userId: z.number(),
  roomId: z.string().min(1),
  password: z.string().optional(),
});

const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
  isBroadcast: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  maxUsers: z.number().min(1).max(1000).optional(),
  hostId: z.number().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
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
  isPrivate: boolean;
  maxUsers: number;
  hostId?: number;
  category?: string;
  tags: string[];
  speakers: number[];
  micQueue: number[];
  createdAt: Date;
  updatedAt: Date;
  userCount: number;
  onlineUserCount: number;
  creator?: User;
  host?: User;
}

export interface RoomUser {
  userId: number;
  roomId: string;
  joinedAt: Date;
  user?: User;
  isSpeaker: boolean;
  isModerator: boolean;
}

export interface RoomStats {
  totalMessages: number;
  todayMessages: number;
  totalUsers: number;
  onlineUsers: number;
  averageMessagesPerDay: number;
  peakUsers: number;
  peakTime: Date;
}

export interface RoomSearchFilters {
  category?: string;
  isBroadcast?: boolean;
  isPrivate?: boolean;
  maxUsers?: number;
  tags?: string[];
  createdBy?: number;
  isActive?: boolean;
}

export class EnhancedRoomService extends EventEmitter {
  private roomCache = new Map<string, RoomInfo>();
  private userRoomCache = new Map<number, Set<string>>();
  private roomUserCache = new Map<string, Set<number>>();
  private roomStatsCache = new Map<string, RoomStats>();

  constructor() {
    super();
    this.setupCacheCleanup();
    this.setupEventHandlers();
  }

  // Cache management
  private setupCacheCleanup() {
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
    this.roomStatsCache.clear();
    this.emit('cache_cleared');
  }

  private setupEventHandlers() {
    this.on('room_created', (room: RoomInfo) => {
      console.log(`🏠 Room created: ${room.name} (${room.id}) by user ${room.createdBy}`);
    });

    this.on('room_updated', (room: RoomInfo) => {
      console.log(`🔄 Room updated: ${room.name} (${room.id})`);
    });

    this.on('room_deleted', (data: { roomId: string; room: RoomInfo }) => {
      console.log(`🗑️ Room deleted: ${data.room.name} (${data.roomId})`);
    });

    this.on('user_joined_room', (data: { userId: number; roomId: string }) => {
      console.log(`👤 User ${data.userId} joined room ${data.roomId}`);
    });

    this.on('user_left_room', (data: { userId: number; roomId: string }) => {
      console.log(`👋 User ${data.userId} left room ${data.roomId}`);
    });
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
        id: validated.id,
        name: validated.name,
        description: validated.description,
        icon: validated.icon,
        createdBy: validated.createdBy,
        isDefault: validated.isDefault || false,
        isBroadcast: validated.isBroadcast,
        isPrivate: validated.isPrivate || false,
        maxUsers: validated.maxUsers || 100,
        hostId: validated.hostId,
        category: validated.category,
        tags: validated.tags ? JSON.stringify(validated.tags) : '[]',
        speakers: JSON.stringify([]),
        micQueue: JSON.stringify([]),
        isActive: true,
      }).returning();

      const roomInfo = await this.formatRoomInfo(newRoom[0]);
      
      // Update cache
      this.roomCache.set(validated.id, roomInfo);
      
      this.emit('room_created', roomInfo);
      
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

  async getAllRooms(filters: RoomSearchFilters = {}, includeInactive = false): Promise<RoomInfo[]> {
    try {
      let query = db.select().from(rooms);
      
      const conditions = [];
      
      if (!includeInactive) {
        conditions.push(eq(rooms.isActive, true));
      }
      
      if (filters.category) {
        conditions.push(eq(rooms.category, filters.category));
      }
      
      if (filters.isBroadcast !== undefined) {
        conditions.push(eq(rooms.isBroadcast, filters.isBroadcast));
      }
      
      if (filters.isPrivate !== undefined) {
        conditions.push(eq(rooms.isPrivate, filters.isPrivate));
      }
      
      if (filters.maxUsers) {
        conditions.push(sql`${rooms.maxUsers} <= ${filters.maxUsers}`);
      }
      
      if (filters.createdBy) {
        conditions.push(eq(rooms.createdBy, filters.createdBy));
      }
      
      if (filters.isActive !== undefined) {
        conditions.push(eq(rooms.isActive, filters.isActive));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const roomList = await query.orderBy(asc(rooms.createdAt));
      
      const roomInfos = await Promise.all(
        roomList.map(room => this.formatRoomInfo(room))
      );

      // Filter by tags if specified
      if (filters.tags && filters.tags.length > 0) {
        return roomInfos.filter(room => 
          filters.tags!.some(tag => room.tags.includes(tag))
        );
      }

      return roomInfos;
    } catch (error) {
      console.error('❌ Error getting all rooms:', error);
      throw error;
    }
  }

  async updateRoom(roomId: string, updates: z.infer<typeof updateRoomSchema>): Promise<RoomInfo | null> {
    try {
      const validated = updateRoomSchema.parse(updates);
      
      const existingRoom = await this.getRoom(roomId);
      if (!existingRoom) {
        throw new Error(`Room ${roomId} not found`);
      }

      const updateData: any = {};
      
      if (validated.name) updateData.name = validated.name;
      if (validated.description !== undefined) updateData.description = validated.description;
      if (validated.icon !== undefined) updateData.icon = validated.icon;
      if (validated.isActive !== undefined) updateData.isActive = validated.isActive;
      if (validated.isBroadcast !== undefined) updateData.isBroadcast = validated.isBroadcast;
      if (validated.isPrivate !== undefined) updateData.isPrivate = validated.isPrivate;
      if (validated.maxUsers) updateData.maxUsers = validated.maxUsers;
      if (validated.hostId !== undefined) updateData.hostId = validated.hostId;
      if (validated.category !== undefined) updateData.category = validated.category;
      if (validated.tags) updateData.tags = JSON.stringify(validated.tags);
      
      updateData.updatedAt = new Date();

      await db.update(rooms).set(updateData).where(eq(rooms.id, roomId));

      // Clear cache and get updated room
      this.roomCache.delete(roomId);
      const updatedRoom = await this.getRoom(roomId);

      this.emit('room_updated', updatedRoom);

      return updatedRoom;
    } catch (error) {
      console.error(`❌ Error updating room ${roomId}:`, error);
      throw error;
    }
  }

  async deleteRoom(roomId: string, deletedBy: number): Promise<void> {
    try {
      if (roomId === 'general') {
        throw new Error('Cannot delete the general room');
      }

      // Get room info before deletion
      const room = await this.getRoom(roomId);
      if (!room) {
        throw new Error(`Room ${roomId} not found`);
      }

      // Check permissions
      if (room.createdBy !== deletedBy && !await this.isUserAdmin(deletedBy)) {
        throw new Error('Insufficient permissions to delete this room');
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
      this.roomStatsCache.delete(roomId);
      
      // Clear user room cache for all users
      this.userRoomCache.forEach((userRooms, userId) => {
        if (userRooms.has(roomId)) {
          userRooms.delete(roomId);
        }
      });

      this.emit('room_deleted', { roomId, room });
    } catch (error) {
      console.error(`❌ Error deleting room ${roomId}:`, error);
      throw error;
    }
  }

  // User-Room operations
  async joinRoom(userId: number, roomId: string, password?: string): Promise<void> {
    const validated = joinRoomSchema.parse({ userId, roomId, password });
    
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

      // Check if room is private and user has access
      if (room && room.isPrivate && room.createdBy !== userId && !await this.isUserAdmin(userId)) {
        throw new Error('Access denied to private room');
      }

      // Check room capacity
      if (room && room.userCount >= room.maxUsers) {
        throw new Error('Room is at maximum capacity');
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

        // Send welcome notification for general room
        if (roomId === 'general') {
          await this.sendWelcomeNotification(userId);
        }
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
      if (roomId === 'general') {
        throw new Error('Cannot leave the general room');
      }

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
          isPrivate: false,
          maxUsers: 1000,
          category: 'general',
          tags: ['عام', 'دردشة'],
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

    // Get creator and host info
    const creator = room.createdBy ? await this.getUserById(room.createdBy) : undefined;
    const host = room.hostId ? await this.getUserById(room.hostId) : undefined;

    return {
      id: room.id,
      name: room.name,
      description: room.description,
      icon: room.icon,
      createdBy: room.createdBy,
      isDefault: room.isDefault,
      isActive: room.isActive,
      isBroadcast: room.isBroadcast,
      isPrivate: room.isPrivate || false,
      maxUsers: room.maxUsers || 100,
      hostId: room.hostId,
      category: room.category,
      tags: room.tags ? JSON.parse(room.tags) : [],
      speakers: room.speakers ? JSON.parse(room.speakers) : [],
      micQueue: room.micQueue ? JSON.parse(room.micQueue) : [],
      createdAt: room.createdAt,
      updatedAt: room.updatedAt || room.createdAt,
      userCount: userCount[0]?.count || 0,
      onlineUserCount: onlineUserCount[0]?.count || 0,
      creator,
      host,
    };
  }

  private async getUserById(userId: number): Promise<User | undefined> {
    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length > 0) {
        return {
          ...user[0],
          ignoredUsers: user[0].ignoredUsers ? JSON.parse(user[0].ignoredUsers) : []
        };
      }
      return undefined;
    } catch (error) {
      console.error(`Error getting user ${userId}:`, error);
      return undefined;
    }
  }

  private async isUserAdmin(userId: number): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      return user?.userType === 'admin' || user?.userType === 'owner';
    } catch (error) {
      return false;
    }
  }

  private async sendWelcomeNotification(userId: number): Promise<void> {
    try {
      await db.insert(notifications).values({
        userId,
        type: 'welcome',
        title: 'مرحباً بك في الغرفة العامة!',
        message: 'نتمنى لك وقتاً ممتعاً في الدردشة مع الأعضاء الآخرين',
        isRead: false,
        data: JSON.stringify({ roomId: 'general' }),
      });
    } catch (error) {
      console.error('Error sending welcome notification:', error);
    }
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
      return true;
    } catch (error) {
      console.error(`❌ Error removing speaker ${userId} from room ${roomId}:`, error);
      throw error;
    }
  }

  // Statistics
  async getRoomStats(roomId: string): Promise<RoomStats> {
    try {
      // Check cache first
      if (this.roomStatsCache.has(roomId)) {
        return this.roomStatsCache.get(roomId)!;
      }

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

      const averageMessagesPerDay = await db.select({ 
        avg: sql<number>`AVG(daily_count) as avg` 
      })
      .from(
        db.select({ 
          daily_count: sql<number>`COUNT(*) as daily_count` 
        })
        .from(messages)
        .where(eq(messages.roomId, roomId))
        .groupBy(sql`DATE(${messages.timestamp})`)
        .as('daily_stats')
      );

      const stats: RoomStats = {
        totalMessages: messageCount[0]?.count || 0,
        todayMessages: todayMessages[0]?.count || 0,
        totalUsers: room.userCount,
        onlineUsers: room.onlineUserCount,
        averageMessagesPerDay: Math.round(averageMessagesPerDay[0]?.avg || 0),
        peakUsers: room.userCount, // This could be enhanced with historical data
        peakTime: new Date(), // This could be enhanced with historical data
      };

      // Cache stats for 5 minutes
      this.roomStatsCache.set(roomId, stats);
      setTimeout(() => this.roomStatsCache.delete(roomId), 5 * 60 * 1000);

      return stats;
    } catch (error) {
      console.error(`❌ Error getting stats for room ${roomId}:`, error);
      throw error;
    }
  }

  // Search and filtering
  async searchRooms(query: string, filters: RoomSearchFilters = {}): Promise<RoomInfo[]> {
    try {
      const allRooms = await this.getAllRooms(filters);
      
      if (!query) {
        return allRooms;
      }

      const searchTerm = query.toLowerCase();
      return allRooms.filter(room => 
        room.name.toLowerCase().includes(searchTerm) ||
        room.description?.toLowerCase().includes(searchTerm) ||
        room.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        room.category?.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('❌ Error searching rooms:', error);
      throw error;
    }
  }

  // Room categories
  async getRoomCategories(): Promise<string[]> {
    try {
      const categories = await db.select({ category: rooms.category })
        .from(rooms)
        .where(and(
          eq(rooms.isActive, true),
          sql`${rooms.category} IS NOT NULL`
        ))
        .groupBy(rooms.category);

      return categories.map(c => c.category).filter(Boolean);
    } catch (error) {
      console.error('❌ Error getting room categories:', error);
      throw error;
    }
  }

  // Popular rooms
  async getPopularRooms(limit: number = 10): Promise<RoomInfo[]> {
    try {
      const popularRooms = await db.select()
        .from(rooms)
        .where(eq(rooms.isActive, true))
        .orderBy(desc(rooms.createdAt))
        .limit(limit);

      const roomInfos = await Promise.all(
        popularRooms.map(room => this.formatRoomInfo(room))
      );

      // Sort by online user count
      return roomInfos.sort((a, b) => b.onlineUserCount - a.onlineUserCount);
    } catch (error) {
      console.error('❌ Error getting popular rooms:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const enhancedRoomService = new EnhancedRoomService();