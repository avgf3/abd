import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

import { friends as friendsTable } from '../shared/schema';

import { SecurityManager } from './auth/security';
import { db } from './database-adapter';
import { connectedUsers } from './realtime';
import {
  databaseService,
  type User,
  type Message,
  type Friend,
  type Notification,
  type Room,
} from './services/databaseService';
import { friendService } from './services/friendService';
import { notificationService } from './services/notificationService';
import { userService } from './services/userService';

// Helper function
function safeParseJsonArray(value: string): any[] {
  try {
    return Array.isArray(JSON.parse(value)) ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

// Points functions
export async function addPoints(userId: number, points: number, reason: string): Promise<void> {
  try {
    if (!userId || points <= 0) return;

    const user = await databaseService.getUserById(userId);
    if (!user) {
      console.error('User not found for adding points:', userId);
      return;
    }

    const newPoints = (user.points || 0) + points;
    const newTotalPoints = (user.totalPoints || 0) + points;

    // Update user points
    await databaseService.updateUser(userId, {
      points: newPoints,
      totalPoints: newTotalPoints,
    });

    // Add to points history
    await databaseService.addPointsHistory(userId, points, reason, 'earn');
  } catch (error) {
    console.error('Error adding points:', error);
  }
}

export async function deductPoints(userId: number, points: number, reason: string): Promise<void> {
  try {
    const user = await databaseService.getUserById(userId);
    if (!user) return;

    const newPoints = Math.max(0, (user.points || 0) - points);
    await databaseService.updateUser(userId, { points: newPoints });
    await databaseService.addPointsHistory(userId, -points, reason, 'spend');
  } catch (error) {
    console.error('Error deducting points:', error);
  }
}

export async function getPointsHistory(userId: number): Promise<any[]> {
  return await databaseService.getUserPointsHistory(userId);
}

export async function getTopUsersByPoints(limit?: number): Promise<User[]> { // إزالة الحد الأقصى تماماً
  try {
    return await databaseService.getTopUsersByPoints(limit);
  } catch (error) {
    console.error('Error getting top users by points:', error);
    return [];
  }
}

export async function getUserLevel(userId: number): Promise<number> {
  try {
    const user = await databaseService.getUserById(userId);
    return user?.level || 1;
  } catch (error) {
    console.error('Error getting user level:', error);
    return 1;
  }
}

// Stats functions
export async function getStats(): Promise<{
  users: number;
  messages: number;
  onlineUsers: number;
}> {
  return await databaseService.getStats();
}

export async function blockDevice(
  ipAddress: string,
  deviceId: string,
  userId: number,
  reason: string,
  blockedBy: number
): Promise<void> {
  // This functionality needs to be implemented in databaseService
  console.warn('blockDevice not implemented in databaseService');
}

export async function isDeviceBlocked(ipAddress: string, deviceId: string): Promise<boolean> {
  try {
    // This functionality needs to be implemented in databaseService
    console.warn('isDeviceBlocked not implemented in databaseService');
    return false;
  } catch (error) {
    console.error('Error checking device block:', error);
    return false;
  }
}

export async function getAllBlockedDevices(): Promise<any[]> {
  try {
    return await databaseService.getBlockedDevices();
  } catch (error) {
    console.error('Error getting blocked devices:', error);
    return [];
  }
}

export async function validateUserCredentials(
  username: string,
  password: string
): Promise<User | null> {
  try {
    const user = await databaseService.getUserByUsername(username);
    if (!user || !user.password) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  } catch (error) {
    console.error('Error validating credentials:', error);
    return null;
  }
}

// تم نقل دالة hashPassword إلى auth/security.ts لتجنب التكرار
export const hashPassword = SecurityManager.hashPassword;

export function getDatabaseStatus() {
  return databaseService.getStatus();
}

export async function getMessageCount(): Promise<number> {
  try {
    const stats = await databaseService.getStats();
    return stats.messages;
  } catch (error) {
    console.error('Error getting message count:', error);
    return 0;
  }
}

export async function getUserCount(): Promise<number> {
  try {
    const total = await databaseService.countUsers();
    return Number(total) || 0;
  } catch (error) {
    console.error('Error getting user count:', error);
    return 0;
  }
}

// Room management functions
export async function joinRoom(userId: number, roomId: number | string): Promise<boolean> {
  try {
    const status = databaseService.getStatus();
    if (!status.connected) return true;
    const { db, dbType } = await import('./database-adapter');
    if (dbType === 'postgresql') {
      const { roomMembers } = await import('../shared/schema');
      const { eq, and } = await import('drizzle-orm');
      const exists = await (db as any)
        .select({ userId: (roomMembers as any).userId })
        .from(roomMembers as any)
        .where(
          and(
            eq((roomMembers as any).roomId, String(roomId) as any),
            eq((roomMembers as any).userId, userId as any)
          )
        )
        .limit(1);
      if (!exists || exists.length === 0) {
        await (db as any)
          .insert(roomMembers as any)
          .values({ roomId: String(roomId) as any, userId: userId as any });
      }
      return true;
    }
    // No SQLite fallback in production
    return true;
  } catch (error) {
    console.error('Error joinRoom:', error);
    return true;
  }
}

export async function leaveRoom(userId: number, roomId: number | string): Promise<boolean> {
  try {
    const status = databaseService.getStatus();
    if (!status.connected) return true;
    const { db, dbType } = await import('./database-adapter');
    if (dbType === 'postgresql') {
      const { roomMembers } = await import('../shared/schema');
      const { eq, and } = await import('drizzle-orm');
      await (db as any)
        .delete(roomMembers as any)
        .where(
          and(
            eq((roomMembers as any).roomId, String(roomId) as any),
            eq((roomMembers as any).userId, userId as any)
          )
        );
      return true;
    }
    return true;
  } catch (error) {
    console.error('Error leaveRoom:', error);
    return true;
  }
}

export async function getRoomUsers(roomId: number | string): Promise<number[]> {
  try {
    const status = databaseService.getStatus();
    if (!status.connected) return [];
    const { db, dbType } = await import('./database-adapter');
    if (dbType === 'postgresql') {
      const { roomMembers } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      const rows = await (db as any)
        .select({ userId: (roomMembers as any).userId })
        .from(roomMembers as any)
        .where(eq((roomMembers as any).roomId, String(roomId) as any));
      return (rows || []).map((r: any) => r.userId);
    }
    return [];
  } catch (error) {
    console.error('Error getRoomUsers:', error);
    return [];
  }
}

export async function getUserRooms(userId: number): Promise<string[]> {
  try {
    const status = databaseService.getStatus();
    if (!status.connected) return [];
    const { db, dbType } = await import('./database-adapter');
    if (dbType === 'postgresql') {
      const { roomMembers } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      const rows = await (db as any)
        .select({ roomId: (roomMembers as any).roomId })
        .from(roomMembers as any)
        .where(eq((roomMembers as any).userId, userId as any));
      return (rows || []).map((r: any) => String(r.roomId));
    }
    return [];
  } catch (error) {
    console.error('Error getUserRooms:', error);
    return [];
  }
}

export async function isUserInRoom(userId: number, roomId: number | string): Promise<boolean> {
  try {
    const status = databaseService.getStatus();
    if (!status.connected) return true;
    const { db, dbType } = await import('./database-adapter');
    if (dbType === 'postgresql') {
      const { roomMembers } = await import('../shared/schema');
      const { eq, and } = await import('drizzle-orm');
      const rows = await (db as any)
        .select({ uid: (roomMembers as any).userId })
        .from(roomMembers as any)
        .where(
          and(
            eq((roomMembers as any).userId, userId as any),
            eq((roomMembers as any).roomId, String(roomId) as any)
          )
        )
        .limit(1);
      return Array.isArray(rows) && rows.length > 0;
    }
    return true;
  } catch (error) {
    console.error('Error isUserInRoom:', error);
    return true;
  }
}

// Wall post functions (placeholder - these tables may not exist yet)
export async function createWallPost(postData: any): Promise<any> {
  try {
    const { db, dbType } = await import('./database-adapter');
    if (!db || dbType === 'disabled') {
      // Fallback: return an in-memory-like object
      return {
        id: Math.floor(Date.now() / 1000),
        ...postData,
      };
    }
    if (dbType === 'postgresql') {
      const { wallPosts } = await import('../shared/schema');
      const [inserted] = await (db as any)
        .insert(wallPosts as any)
        .values({
          userId: postData.userId,
          username: postData.username,
          userRole: postData.userRole,
          userGender: postData.userGender ?? null, // إضافة الجنس
          userLevel: postData.userLevel ?? 1, // إضافة المستوى
          content: postData.content ?? null,
          imageUrl: postData.imageUrl ?? null,
          type: postData.type ?? 'public',
          timestamp: postData.timestamp ?? new Date(),
          userProfileImage: postData.userProfileImage ?? null,
          userProfileFrame: postData.userProfileFrame ?? null,
          userProfileTag: postData.userProfileTag ?? null,
          usernameColor: postData.usernameColor ?? null,
          // تخزين تدرج وتأثير الاسم لحظة النشر لعرض متسق لاحقاً
          usernameGradient: postData.usernameGradient ?? null,
          usernameEffect: postData.usernameEffect ?? null,
        })
        .returning();
      return inserted;
    }
    return null;
  } catch (error) {
    console.error('Error createWallPost:', error);
    return null;
  }
}

export async function getWallPosts(userId: number, limit?: number): Promise<any[]> { // إزالة الحد الأقصى تماماً
  try {
    const { db, dbType } = await import('./database-adapter');
    if (!db || dbType === 'disabled') return [];
    if (dbType === 'postgresql') {
      const { wallPosts } = await import('../shared/schema');
      const { desc } = await import('drizzle-orm');
      const rows = await (db as any)
        .select()
        .from(wallPosts as any)
        .orderBy(desc((wallPosts as any).timestamp))
        .limit(limit);
      return rows || [];
    }
    return [];
  } catch (error) {
    console.error('Error getWallPosts:', error);
    return [];
  }
}

export async function getWallPostsByUsers(userIds: number[], limit?: number): Promise<any[]> { // إزالة الحد الأقصى تماماً
  try {
    const { db, dbType } = await import('./database-adapter');
    if (!db || dbType === 'disabled') return [];
    if (dbType === 'postgresql') {
      const { wallPosts } = await import('../shared/schema');
      const { inArray, desc } = await import('drizzle-orm');
      const rows = await (db as any)
        .select()
        .from(wallPosts as any)
        .where(inArray((wallPosts as any).userId, userIds as any))
        .orderBy(desc((wallPosts as any).timestamp))
        .limit(limit);
      return rows || [];
    }
    return [];
  } catch (error) {
    console.error('Error getWallPostsByUsers:', error);
    return [];
  }
}

export async function deleteWallPost(postId: number): Promise<boolean> {
  try {
    const { db, dbType } = await import('./database-adapter');
    if (!db || dbType === 'disabled') return true;
    if (dbType === 'postgresql') {
      const { wallPosts, wallReactions } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      await (db as any)
        .delete(wallReactions as any)
        .where(eq((wallReactions as any).postId, postId as any));
      await (db as any).delete(wallPosts as any).where(eq((wallPosts as any).id, postId as any));
      return true;
    }
    return true;
  } catch (error) {
    console.error('Error deleteWallPost:', error);
    return false;
  }
}

export async function reactToWallPost(
  postId: number,
  userId: number,
  reaction: string
): Promise<boolean> {
  try {
    const { db, dbType } = await import('./database-adapter');
    if (!db || dbType === 'disabled') return true;
    if (dbType === 'postgresql') {
      const { wallReactions } = await import('../shared/schema');
      const { eq, and } = await import('drizzle-orm');
      const existing = await (db as any)
        .select()
        .from(wallReactions as any)
        .where(
          and(
            eq((wallReactions as any).postId, postId as any),
            eq((wallReactions as any).userId, userId as any)
          )
        )
        .limit(1);
      if (existing && existing.length > 0) {
        await (db as any)
          .update(wallReactions as any)
          .set({ type: reaction })
          .where(
            and(
              eq((wallReactions as any).postId, postId as any),
              eq((wallReactions as any).userId, userId as any)
            )
          );
      } else {
        await (db as any)
          .insert(wallReactions as any)
          .values({ postId, userId, username: '', type: reaction });
      }
      return true;
    }
    return true;
  } catch (error) {
    console.error('Error reactToWallPost:', error);
    return false;
  }
}

export async function getWallPostReactions(postId: number): Promise<any[]> {
  // This would need custom implementation with wall_reactions table
  // For now, return empty array
  return [];
}

export async function getUserWallPostReactions(userId: number, postId: number): Promise<any[]> {
  // This would need custom implementation with wall_reactions table
  // For now, return empty array
  return [];
}

// Legacy storage interface for backward compatibility
interface LegacyStorage {
  getUser: (id: number) => Promise<User | undefined>;
  getUserByUsername: (username: string) => Promise<User | undefined>;
  createUser: (user: any) => Promise<User>;
  updateUser: (id: number, updates: Partial<User>) => Promise<User | undefined>;
  setUserOnlineStatus: (id: number, isOnline: boolean) => Promise<void>;
  createMessage: (message: any) => Promise<Message>;
  getPublicMessages: (limit?: number) => Promise<Message[]>;
  getPrivateMessages: (userId1: number, userId2: number, limit?: number) => Promise<Message[]>;
  getRoomMessages: (roomId: string, limit?: number, offset?: number) => Promise<Message[]>;
  addFriend: (userId: number, friendId: number) => Promise<Friend>;
  getFriends: (userId: number) => Promise<User[]>;
  getUserFriends?: (userId: number) => Promise<User[]>;
  createNotification: (notification: any) => Promise<Notification>;
  getUserNotifications: (userId: number, limit?: number) => Promise<Notification[]>;
  markNotificationAsRead: (notificationId: number) => Promise<boolean>;
  getOnlineUsers: () => Promise<User[]>;
  getAllUsers: () => Promise<User[]>;
  // Add more methods as needed
  [key: string]: any; // Allow additional methods
}

// Create a storage object that delegates to the new functions
export const storage: LegacyStorage = {
  async getUser(id: number) {
    // استخدام النظام الجديد للتمييز بين البوتات والمستخدمين
    const { isBotId, isUserId } = await import('./types/entities');
    
    try {
      // التحقق من نوع الكيان بناءً على المعرف
      if (isBotId(id)) {
        // هذا بوت - البحث في جدول البوتات
        return await this.getBotAsUser(id);
      } else if (isUserId(id)) {
        // هذا مستخدم حقيقي - البحث في جدول المستخدمين
        const user = await databaseService.getUserById(id);
        if (user) {
          // إضافة نوع الكيان للتمييز
          return { ...user, entityType: 'user' } as any;
        }
      } else {
        // معرف غير صالح
        console.warn(`معرف كيان غير صالح: ${id}`);
        return undefined;
      }
    } catch (e) {
      console.error('خطأ في جلب الكيان:', e);
    }
    
    return undefined;
  },

  // دالة مساعدة لجلب البوت وتحويله لتنسيق المستخدم
  async getBotAsUser(id: number) {
    try {
      const { db, dbType } = await import('./database-adapter');
      if (!db || dbType !== 'postgresql') return undefined;
      
      const { bots } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const rows = await (db as any)
        .select()
        .from(bots as any)
        .where(eq((bots as any).id, id as any))
        .limit(1);
      
      const bot = rows?.[0];
      if (!bot) return undefined;
      
      // تحويل البوت لتنسيق المستخدم مع إضافة نوع الكيان
      const mapped = {
        id: bot.id,
        username: bot.username,
        entityType: 'bot',
        userType: 'bot',
        role: 'bot',
        profileImage: bot.profileImage,
        profileBanner: bot.profileBanner,
        profileBackgroundColor: bot.profileBackgroundColor,
        status: bot.status,
        gender: bot.gender,
        country: bot.country,
        relation: bot.relation,
        bio: bot.bio,
        isOnline: !!bot.isOnline,
        isHidden: false,
        lastSeen: bot.lastActivity || new Date(), // استخدام lastActivity أو التاريخ الحالي
        joinDate: bot.createdAt,
        createdAt: bot.createdAt,
        isMuted: false,
        muteExpiry: null,
        isBanned: false,
        banExpiry: null,
        isBlocked: false,
        usernameColor: bot.usernameColor,
        profileEffect: bot.profileEffect,
        points: bot.points,
        level: bot.level,
        totalPoints: bot.totalPoints,
        levelProgress: bot.levelProgress,
        currentRoom: bot.currentRoom && bot.currentRoom.trim() !== '' ? bot.currentRoom : 'general',
        // خصائص خاصة بالبوت
        isActive: bot.isActive,
        botType: bot.botType,
        settings: bot.settings,
      } as any;
      
      return mapped;
    } catch (e) {
      console.error('خطأ في جلب البوت:', e);
      return undefined;
    }
  },

  async getUserByUsername(username: string) {
    const user = await databaseService.getUserByUsername(username);
    return user || undefined;
  },

  async getUserByEmail(email: string) {
    const user = await databaseService.getUserByEmail(email);
    return user || undefined;
  },

  // Batch users fetch to reduce N+1 patterns
  async getUsersByIds(userIds: number[]) {
    try {
      const uniqueIds = Array.from(new Set((userIds || []).filter((id) => typeof id === 'number')));
      if (uniqueIds.length === 0) return [];

      // جلب المستخدمين العاديين والبوتات بشكل متوازي
      const [regularUsers, bots] = await Promise.all([
        databaseService.getUsersByIds(uniqueIds),
        this.getBotsByIds(uniqueIds)
      ]);

      // دمج النتائج
      const allUsers = [...(regularUsers || []), ...(bots || [])];
      return Array.isArray(allUsers) ? allUsers : [];
    } catch (e) {
      console.error('storage.getUsersByIds error:', e);
      return [];
    }
  },

  // دالة مساعدة لجلب البوتات بالـ IDs
  async getBotsByIds(userIds: number[]) {
    try {
      const { db, dbType } = await import('./database-adapter');
      if (!db || dbType !== 'postgresql') return [];
      
      const { bots } = await import('../shared/schema');
      const { inArray } = await import('drizzle-orm');
      
      const botRows = await (db as any)
        .select()
        .from(bots as any)
        .where(inArray((bots as any).id, userIds));
      
      // تحويل البوتات لتنسيق المستخدمين
      return (botRows || []).map((bot: any) => ({
        id: bot.id,
        username: bot.username,
        userType: 'bot',
        role: 'bot',
        profileImage: bot.profileImage,
        profileBanner: bot.profileBanner,
        profileBackgroundColor: bot.profileBackgroundColor,
        status: bot.status,
        gender: bot.gender,
        country: bot.country,
        relation: bot.relation,
        bio: bot.bio,
        isOnline: !!bot.isOnline,
        isHidden: false,
        lastSeen: bot.lastActivity || new Date(), // استخدام lastActivity أو التاريخ الحالي
        joinDate: bot.createdAt,
        createdAt: bot.createdAt,
        isMuted: false,
        muteExpiry: null,
        isBanned: false,
        banExpiry: null,
        isBlocked: false,
        usernameColor: bot.usernameColor,
        profileEffect: bot.profileEffect,
        points: bot.points,
        level: bot.level,
        totalPoints: bot.totalPoints,
        levelProgress: bot.levelProgress,
        currentRoom: bot.currentRoom && bot.currentRoom.trim() !== '' ? bot.currentRoom : 'general',
      }));
    } catch (e) {
      console.error('Error fetching bots by IDs:', e);
      return [];
    }
  },

  async createUser(user: any) {
    try {
      const newUser = await databaseService.createUser(user);
      if (!newUser) {
        console.error('Failed to create user in database:', user?.username);
        return null;
      }
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  },

  async updateUser(id: number, updates: Partial<User>) {
    const user = await databaseService.updateUser(id, updates);
    return user || undefined;
  },

  async setUserOnlineStatus(id: number, isOnline: boolean) {
    const now = new Date();
    await databaseService.updateUser(id, { isOnline, lastSeen: now });
    
    // تحديث الذاكرة المحلية
    const entry = connectedUsers.get(id);
    if (entry) {
      entry.lastSeen = now;
      connectedUsers.set(id, entry);
    }
  },

  async createMessage(message: any) {
    try {
      // If public message to room, validate per-room moderation (PostgreSQL only)
      if (!message.isPrivate && message.roomId && typeof message.senderId === 'number') {
        const can = await databaseService.canSendInRoom(message.roomId, message.senderId);
        if (!can.allowed) {
          console.error('User not allowed to send in room:', message.senderId, message.roomId);
          return null;
        }
      }
      const newMessage = await databaseService.createMessage(message);
      if (!newMessage) {
        console.error('Failed to create message in database');
        return null;
      }
      return newMessage;
    } catch (error) {
      console.error('Error creating message:', error);
      return null;
    }
  },

  async getPublicMessages(limit?: number) { // إزالة الحد الأقصى تماماً
    return await databaseService.getMessages('general', limit);
  },

  async getPrivateMessages(userId1: number, userId2: number, limit?: number) { // إزالة الحد الأقصى تماماً
    return await databaseService.getPrivateMessages(userId1, userId2, limit);
  },

  async getPrivateMessagesBefore(
    userId1: number,
    userId2: number,
    limit?: number, // إزالة الحد الأقصى تماماً
    beforeTimestamp?: Date,
    beforeId?: number
  ) {
    return await databaseService.getPrivateMessagesBefore(
      userId1,
      userId2,
      limit,
      beforeTimestamp,
      beforeId
    );
  },

  async getRoomMessages(roomId: string, limit?: number, offset = 0) { // إزالة الحد الأقصى تماماً
    return await databaseService.getMessages(roomId, limit, offset);
  },

  async getMessage(messageId: number) {
    return await databaseService.getMessageById(messageId);
  },

  async deleteMessage(messageId: number) {
    return await databaseService.deleteMessage(messageId);
  },

  // ========= Message Reactions =========
  async reactToMessage(messageId: number, userId: number, type: 'like' | 'dislike' | 'heart') {
    return await databaseService.upsertMessageReaction(messageId, userId, type);
  },
  async removeMessageReaction(messageId: number, userId: number) {
    return await databaseService.deleteMessageReaction(messageId, userId);
  },
  async getMessageReactionCounts(messageId: number) {
    return await databaseService.getMessageReactionCounts(messageId);
  },
  async getUserMessageReaction(messageId: number, userId: number) {
    return await databaseService.getUserMessageReaction(messageId, userId);
  },

  // Friends
  async addFriend(userId: number, friendId: number) {
    return await friendService.addFriend(userId, friendId);
  },

  async getFriends(userId: number) {
    return await friendService.getFriends(userId);
  },

  // Alias expected by routes.ts
  async getUserFriends(userId: number) {
    return await friendService.getFriends(userId);
  },

  // Legacy friend request passthroughs to unified friendService
  async getFriendship(userId1: number, userId2: number) {
    return await friendService.getFriendship(userId1, userId2);
  },
  async getFriendRequest(senderId: number, receiverId: number) {
    return await friendService.getFriendRequest(senderId, receiverId);
  },
  async getFriendRequestById(requestId: number) {
    return await friendService.getFriendRequestById(requestId);
  },
  async getIncomingFriendRequests(userId: number) {
    return await friendService.getIncomingFriendRequests(userId);
  },
  async getOutgoingFriendRequests(userId: number) {
    return await friendService.getOutgoingFriendRequests(userId);
  },
  async createFriendRequest(senderId: number, receiverId: number) {
    return await friendService.createFriendRequest(senderId, receiverId);
  },
  async acceptFriendRequest(requestId: number) {
    return await friendService.acceptFriendRequest(requestId);
  },
  async declineFriendRequest(requestId: number) {
    return await friendService.declineFriendRequest(requestId);
  },
  async ignoreFriendRequest(requestId: number) {
    return await friendService.ignoreFriendRequest(requestId);
  },
  async deleteFriendRequest(requestId: number) {
    return await friendService.deleteFriendRequest(requestId);
  },

  // Notifications
  async createNotification(notification: any) {
    try {
      const result = await notificationService.createNotification(notification);
      if (!result) {
        console.error('Failed to create notification:', notification?.type);
        return null;
      }
      return result;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  },

  async getUserNotifications(userId: number, limit?: number) { // إزالة الحد الأقصى تماماً
    return await notificationService.getUserNotifications(userId, limit);
  },

  async markNotificationAsRead(notificationId: number) {
    return await notificationService.markNotificationAsRead(notificationId);
  },

  async getOnlineUsers() {
    // ✅ استخدام البيانات الحية من connectedUsers بدلاً من قاعدة البيانات
    // لتجنب إظهار المستخدمين المنفصلين خلال فترة السماح
    try {
      const onlineUsers: User[] = [];
      
      for (const [userId, entry] of connectedUsers.entries()) {
        // التحقق من أن المستخدم لديه اتصالات نشطة
        if (entry.sockets.size > 0 && entry.user) {
          // استثناء المستخدمين المخفيين
          if (entry.user.isHidden === true) continue;
          
          // إضافة المستخدم للقائمة
          onlineUsers.push({
            ...entry.user,
            isOnline: true,
            lastSeen: entry.lastSeen,
          } as User);
        }
      }
      
      // تنظيف البيانات قبل الإرجاع
      const { sanitizeUsersArray } = await import('./utils/data-sanitizer');
      return sanitizeUsersArray(onlineUsers);
    } catch (error) {
      console.error('Error getting online users from connectedUsers:', error);
      // في حالة الخطأ، نستخدم قاعدة البيانات كـ fallback
      return await databaseService.getOnlineUsers();
    }
  },

  async getAllUsers() {
    return await databaseService.getAllUsers();
  },

  // Wall posts APIs expected by routes
  async getWallPosts(typeOrUser: any) {
    if (typeOrUser === 'public') {
      return await (await import('./storage')).getWallPosts(0, 50);
    }
    // If array of user IDs passed, delegate to by-users path
    if (Array.isArray(typeOrUser)) {
      return await (await import('./storage')).getWallPostsByUsers(typeOrUser, 50);
    }
    return [];
  },

  async getWallPostsByUsers(userIds: number[]) {
    return await (await import('./storage')).getWallPostsByUsers(userIds, 50);
  },

  async createWallPost(postData: any) {
    return await (await import('./storage')).createWallPost(postData);
  },

  async getWallPost(postId: number) {
    try {
      const { db, dbType } = await import('./database-adapter');
      if (!db || dbType === 'disabled') return undefined;
      if (dbType === 'postgresql') {
        const { wallPosts } = await import('../shared/schema');
        const { eq } = await import('drizzle-orm');
        const rows = await (db as any)
          .select()
          .from(wallPosts as any)
          .where(eq((wallPosts as any).id, postId as any))
          .limit(1);
        return rows && rows[0] ? rows[0] : undefined;
      }
      return undefined;
    } catch (error) {
      console.error('Error getWallPost:', error);
      return undefined;
    }
  },

  async addWallReaction(reaction: {
    postId: number;
    userId: number;
    username: string;
    type: string;
  }) {
    try {
      const { db, dbType } = await import('./database-adapter');
      if (!db || dbType === 'disabled') return true;
      if (dbType === 'postgresql') {
        const { wallReactions, wallPosts } = await import('../shared/schema');
        const { eq, and, count } = await import('drizzle-orm');

        const existing = await (db as any)
          .select()
          .from(wallReactions as any)
          .where(
            and(
              eq((wallReactions as any).postId, reaction.postId as any),
              eq((wallReactions as any).userId, reaction.userId as any)
            )
          )
          .limit(1);

        if (existing && existing.length > 0) {
          await (db as any)
            .update(wallReactions as any)
            .set({ type: reaction.type })
            .where(
              and(
                eq((wallReactions as any).postId, reaction.postId as any),
                eq((wallReactions as any).userId, reaction.userId as any)
              )
            );
        } else {
          await (db as any).insert(wallReactions as any).values({
            postId: reaction.postId,
            userId: reaction.userId,
            username: reaction.username,
            type: reaction.type,
          });
        }

        // Recompute counts
        const [likesRow] = await (db as any)
          .select({ c: count() })
          .from(wallReactions as any)
          .where(
            and(
              eq((wallReactions as any).postId, reaction.postId as any),
              eq((wallReactions as any).type, 'like' as any)
            )
          );
        const [heartsRow] = await (db as any)
          .select({ c: count() })
          .from(wallReactions as any)
          .where(
            and(
              eq((wallReactions as any).postId, reaction.postId as any),
              eq((wallReactions as any).type, 'heart' as any)
            )
          );
        const [dislikesRow] = await (db as any)
          .select({ c: count() })
          .from(wallReactions as any)
          .where(
            and(
              eq((wallReactions as any).postId, reaction.postId as any),
              eq((wallReactions as any).type, 'dislike' as any)
            )
          );

        await (db as any)
          .update(wallPosts as any)
          .set({
            totalLikes: likesRow?.c ?? 0,
            totalHearts: heartsRow?.c ?? 0,
            totalDislikes: dislikesRow?.c ?? 0,
            updatedAt: new Date(),
          })
          .where(eq((wallPosts as any).id, reaction.postId as any));

        return true;
      }
      return true;
    } catch (error) {
      console.error('Error addWallReaction:', error);
      return false;
    }
  },

  async getWallPostWithReactions(postId: number) {
    try {
      const post = await (this as any).getWallPost(postId);
      return post || null;
    } catch (error) {
      console.error('Error getWallPostWithReactions:', error);
      return null;
    }
  },

  async deleteWallPost(postId: number) {
    return await (await import('./storage')).deleteWallPost(postId);
  },

  // Provide blocked devices for moderation bootstrap
  async getBlockedDevices() {
    return await databaseService.getBlockedDevices();
  },

  async createBlockedDevice(data: any) {
    try {
      return await databaseService.createBlockedDevice(data);
    } catch (error) {
      console.error('Error in storage.createBlockedDevice:', error);
      return null;
    }
  },

  async deleteBlockedDevice(userId: number) {
    try {
      return await databaseService.deleteBlockedDevice(userId);
    } catch (error) {
      console.error('Error in storage.deleteBlockedDevice:', error);
      return null;
    }
  },

  // ========= Room helpers exposed on storage =========
  async getRooms() {
    return await databaseService.getRooms();
  },

  // ========= Room messages stats/search exposed on storage =========
  async getRoomMessageCount(roomId: string) {
    return await databaseService.getRoomMessageCount(roomId);
  },
  async getRoomMessageCountSince(roomId: string, since: Date) {
    return await databaseService.getRoomMessageCountSince(roomId, since);
  },
  async getRoomActiveUserCount(roomId: string, since: Date) {
    return await databaseService.getRoomActiveUserCount(roomId, since);
  },
  async getLastRoomMessage(roomId: string) {
    return await databaseService.getLastRoomMessage(roomId);
  },
  async getRoomMessagesSince(roomId: string, sinceId?: number, sinceTimestamp?: Date, limit?: number) {
    return await databaseService.getRoomMessagesSince(roomId, sinceId, sinceTimestamp, limit ?? 500);
  },
  async searchRoomMessages(roomId: string, searchQuery: string, limit?: number, offset?: number) {
    return await databaseService.searchRoomMessages(roomId, searchQuery, limit, offset ?? 0); // إزالة الحد الأقصى تماماً
  },
  async countSearchRoomMessages(roomId: string, searchQuery: string) {
    return await databaseService.countSearchRoomMessages(roomId, searchQuery);
  },
  async deleteOldRoomMessages(roomId: string, cutoffDate: Date) {
    return await databaseService.deleteOldRoomMessages(roomId, cutoffDate);
  },

  // Alias to match routes usage
  async getAllRooms() {
    return await databaseService.getRooms();
  },

  async getRoom(roomId: string) {
    try {
      // Try DB service helper
      const room = await databaseService.getRoomById(roomId as any);
      if (room) return room as any;

      // Fallback: if not found and asking for 'general', synthesize minimal room info
      if (roomId === 'general') {
        return {
          id: 'general',
          name: 'الغرفة العامة',
          description: 'الغرفة العامة للدردشة',
          isDefault: true,
          isActive: true,
          isLocked: false,
          isBroadcast: false,
          hostId: null,
          speakers: '[]',
          micQueue: '[]',
          createdAt: new Date(),
        } as any;
      }
      return null as any;
    } catch (e) {
      console.error('getRoom error:', e);
      return null as any;
    }
  },

  async createRoom(roomData: Partial<Room>) {
    return await databaseService.createRoom(roomData);
  },

  async deleteRoom(roomId: string) {
    return await databaseService.deleteRoom(roomId);
  },

  async updateRoom(roomId: string, updates: Partial<Room>) {
    return await databaseService.updateRoomById(roomId, updates);
  },

  async joinRoom(userId: number, roomId: number | string) {
    return await joinRoom(userId, roomId as any);
  },

  async leaveRoom(userId: number, roomId: number | string) {
    return await leaveRoom(userId, roomId as any);
  },

  async getUserRooms(userId: number) {
    return await getUserRooms(userId);
  },

  async getRoomUsers(roomId: string) {
    return await getRoomUsers(roomId as any);
  },

  async getOnlineUsersInRoom(roomId: string) {
    try {
      const status = databaseService.getStatus();
      if (!status.connected) return [];
      const { db, dbType } = await import('./database-adapter');
      if (dbType === 'postgresql') {
        const { roomMembers } = await import('../shared/schema');
        const { eq } = await import('drizzle-orm');
        const rows = await (db as any)
          .select({ userId: (roomMembers as any).userId })
          .from(roomMembers as any)
          .where(eq((roomMembers as any).roomId, String(roomId) as any));
        const userIds = (rows || []).map((r: any) => r.userId);
        const fetchedUsers = await databaseService.getUsersByIds(userIds as number[]);
        const users = (fetchedUsers || []).filter(
          (u: any) => u && u.isOnline && !(u as any).isHidden
        );
        return users as any[];
      }
      return [] as any[];
    } catch (error) {
      console.error('Error getOnlineUsersInRoom:', error);
      return [] as any[];
    }
  },

  // ========= Broadcast Room / Mic Management =========

  // تمت إزالة التكرار هنا. انظر القسم الأعلى لتعريفات البث الموحدة.

  // Per-room moderation helpers (PostgreSQL only)
  async muteUserInRoom(roomId: string, targetUserId: number, minutes: number): Promise<boolean> {
    try {
      const { db, dbType } = await import('./database-adapter');
      if (db && dbType === 'postgresql') {
        const { roomMembers } = await import('../shared/schema');
        const { eq, and } = await import('drizzle-orm');
        await (db as any)
          .update(roomMembers as any)
          .set({ mutedUntil: new Date(Date.now() + minutes * 60000) } as any)
          .where(
            and(
              eq((roomMembers as any).roomId, roomId as any),
              eq((roomMembers as any).userId, targetUserId as any)
            )
          );
        return true;
      }
      return false;
    } catch (e) {
      console.error('muteUserInRoom error:', e);
      return false;
    }
  },

  async unmuteUserInRoom(roomId: string, targetUserId: number): Promise<boolean> {
    try {
      const { db, dbType } = await import('./database-adapter');
      if (db && dbType === 'postgresql') {
        const { roomMembers } = await import('../shared/schema');
        const { eq, and } = await import('drizzle-orm');
        await (db as any)
          .update(roomMembers as any)
          .set({ mutedUntil: null } as any)
          .where(
            and(
              eq((roomMembers as any).roomId, roomId as any),
              eq((roomMembers as any).userId, targetUserId as any)
            )
          );
        return true;
      }
      return false;
    } catch (e) {
      console.error('unmuteUserInRoom error:', e);
      return false;
    }
  },

  async banUserInRoom(roomId: string, targetUserId: number, minutes: number): Promise<boolean> {
    try {
      const { db, dbType } = await import('./database-adapter');
      if (db && dbType === 'postgresql') {
        const { roomMembers } = await import('../shared/schema');
        const { eq, and } = await import('drizzle-orm');
        await (db as any)
          .update(roomMembers as any)
          .set({ bannedUntil: new Date(Date.now() + minutes * 60000) } as any)
          .where(
            and(
              eq((roomMembers as any).roomId, roomId as any),
              eq((roomMembers as any).userId, targetUserId as any)
            )
          );
        return true;
      }
      return false;
    } catch (e) {
      console.error('banUserInRoom error:', e);
      return false;
    }
  },

  async unbanUserInRoom(roomId: string, targetUserId: number): Promise<boolean> {
    try {
      const { db, dbType } = await import('./database-adapter');
      if (db && dbType === 'postgresql') {
        const { roomMembers } = await import('../shared/schema');
        const { eq, and } = await import('drizzle-orm');
        await (db as any)
          .update(roomMembers as any)
          .set({ bannedUntil: null } as any)
          .where(
            and(
              eq((roomMembers as any).roomId, roomId as any),
              eq((roomMembers as any).userId, targetUserId as any)
            )
          );
        return true;
      }
      return false;
    } catch (e) {
      console.error('unbanUserInRoom error:', e);
      return false;
    }
  },

  async getBroadcastRoomInfo(roomId: string) {
    try {
      const room = await this.getRoom(roomId);
      if (!room) return null;
      const isBroadcast = (room as any).isBroadcast ?? (room as any).is_broadcast ?? false;
      if (!isBroadcast) return null;

      const hostId = (room as any).hostId ?? (room as any).host_id ?? null;
      const speakers = this.parseSpeakers((room as any).speakers);
      const micQueue = this.parseMicQueue((room as any).micQueue ?? (room as any).mic_queue);

      return {
        roomId,
        hostId,
        speakers,
        micQueue,
      };
    } catch (e) {
      console.error('getBroadcastRoomInfo error:', e);
      return null;
    }
  },

  // ========= User helpers (stealth/ignore list) =========
  async setUserHiddenStatus(id: number, isHidden: boolean) {
    return await userService.setUserHiddenStatus(id, isHidden);
  },

  async addIgnoredUser(userId: number, ignoredUserId: number) {
    return await userService.addIgnoredUser(userId, ignoredUserId);
  },

  async removeIgnoredUser(userId: number, ignoredUserId: number) {
    return await userService.removeIgnoredUser(userId, ignoredUserId);
  },

  async getIgnoredUsers(userId: number) {
    return await userService.getIgnoredUsers(userId);
  },

  async getIgnoredUsersDetailed(userId: number) {
    return await userService.getIgnoredUsersDetailed(userId);
  },

  // ========= Notifications helpers =========
  async getUnreadNotificationCount(userId: number) {
    return await notificationService.getUnreadNotificationCount(userId);
  },
  // نقاط ومهام إضافية
  async updateUserPoints(userId: number, updates: Partial<User>) {
    return await databaseService.updateUserPoints(userId, updates);
  },
  async addPointsHistory(userId: number, points: number, reason: string, action: 'earn' | 'spend') {
    await databaseService.addPointsHistory(userId, points, reason, action);
  },
  async getUserPointsHistory(userId: number, limit?: number) {
    return await databaseService.getUserPointsHistory(userId, limit);
  },
  async getTopUsersByPoints(limit?: number) {
    return await getTopUsersByPoints(limit);
  },
  async getUserMessageCount(userId: number) {
    return await databaseService.getUserMessageCount(userId);
  },
  async getUserLastDailyLogin(userId: number) {
    return await databaseService.getLatestPointsHistoryByReason(userId, 'DAILY_LOGIN');
  },
  async updateUserLastDailyLogin(userId: number, today: string) {
    await databaseService.updateUserLastDailyLogin(userId, today);
  },

  // ========= Broadcast Room / Mic Management =========

  // تمت إزالة التكرار هنا. انظر القسم الأعلى لتعريفات البث الموحدة.

  // ========= Broadcast Room helpers (queue/speakers) =========
  async addToMicQueue(roomId: string, userId: number) {
    try {
      const status = databaseService.getStatus();
      if (!status.connected) return false;
      const { db, dbType } = await import('./database-adapter');
      if (dbType === 'postgresql') {
        const { rooms } = await import('../shared/schema');
        const { eq } = await import('drizzle-orm');
        // Read current queue
        const rows = await (db as any)
          .select({ micQueue: (rooms as any).micQueue })
          .from(rooms as any)
          .where(eq((rooms as any).id, roomId as any))
          .limit(1);
        const current = rows?.[0]?.micQueue
          ? typeof rows[0].micQueue === 'string'
            ? JSON.parse(rows[0].micQueue)
            : rows[0].micQueue
          : [];
        if (!current.includes(userId)) current.push(userId);
        await (db as any)
          .update(rooms)
          .set({ micQueue: JSON.stringify(current) })
          .where(eq((rooms as any).id, roomId as any));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error addToMicQueue:', error);
      return false;
    }
  },

  async removeFromMicQueue(roomId: string, userId: number) {
    try {
      const status = databaseService.getStatus();
      if (!status.connected) return false;
      const { db, dbType } = await import('./database-adapter');
      if (dbType === 'postgresql') {
        const { rooms } = await import('../shared/schema');
        const { eq } = await import('drizzle-orm');
        const rows = await (db as any)
          .select({ micQueue: (rooms as any).micQueue })
          .from(rooms as any)
          .where(eq((rooms as any).id, roomId as any))
          .limit(1);
        const current = rows?.[0]?.micQueue
          ? typeof rows[0].micQueue === 'string'
            ? JSON.parse(rows[0].micQueue)
            : rows[0].micQueue
          : [];
        const next = current.filter((id: number) => id !== userId);
        await (db as any)
          .update(rooms)
          .set({ micQueue: JSON.stringify(next) })
          .where(eq((rooms as any).id, roomId as any));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removeFromMicQueue:', error);
      return false;
    }
  },

  async addSpeaker(roomId: string, userId: number) {
    try {
      const status = databaseService.getStatus();
      if (!status.connected) return false;
      const { db, dbType } = await import('./database-adapter');
      if (dbType === 'postgresql') {
        const { rooms } = await import('../shared/schema');
        const { eq } = await import('drizzle-orm');
        const rows = await (db as any)
          .select({ speakers: (rooms as any).speakers })
          .from(rooms as any)
          .where(eq((rooms as any).id, roomId as any))
          .limit(1);
        const current = rows?.[0]?.speakers
          ? typeof rows[0].speakers === 'string'
            ? JSON.parse(rows[0].speakers)
            : rows[0].speakers
          : [];
        if (!current.includes(userId)) current.push(userId);
        await (db as any)
          .update(rooms)
          .set({ speakers: JSON.stringify(current) })
          .where(eq((rooms as any).id, roomId as any));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error addSpeaker:', error);
      return false;
    }
  },

  async removeSpeaker(roomId: string, userId: number) {
    try {
      const status = databaseService.getStatus();
      if (!status.connected) return false;
      const { db, dbType } = await import('./database-adapter');
      if (dbType === 'postgresql') {
        const { rooms } = await import('../shared/schema');
        const { eq } = await import('drizzle-orm');
        const rows = await (db as any)
          .select({ speakers: (rooms as any).speakers })
          .from(rooms as any)
          .where(eq((rooms as any).id, roomId as any))
          .limit(1);
        const current: number[] = rows?.[0]?.speakers
          ? typeof rows[0].speakers === 'string'
            ? JSON.parse(rows[0].speakers)
            : rows[0].speakers
          : [];
        const next = (current || []).filter((id: number) => id !== userId);
        await (db as any)
          .update(rooms)
          .set({ speakers: JSON.stringify(next) })
          .where(eq((rooms as any).id, roomId as any));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removeSpeaker:', error);
      return false;
    }
  },

  async setRoomHost(roomId: string, hostId: number | null) {
    try {
      const status = databaseService.getStatus();
      if (!status.connected) return false;
      const { db, dbType } = await import('./database-adapter');
      if (dbType === 'postgresql') {
        const { rooms } = await import('../shared/schema');
        const { eq } = await import('drizzle-orm');
        await (db as any)
          .update(rooms)
          .set({ hostId: hostId as any })
          .where(eq((rooms as any).id, roomId as any));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setRoomHost:', error);
      return false;
    }
  },
};

// Export the database service for direct access if needed
export { databaseService };

// Default export is the storage object
export default storage;

// Public interface type for storage consumers
export type IStorage = typeof storage;
