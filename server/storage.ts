import { databaseService, type User, type Message, type Friend, type Notification, type Room } from './services/databaseService';
import bcrypt from 'bcrypt';
import { friendService } from './services/friendService';
import { userService } from './services/userService';
import { notificationService } from './services/notificationService';
import { db } from './database-adapter';
import { friends as friendsTable } from '../shared/schema';
import { eq } from 'drizzle-orm';

// User-related functions
export async function getUserById(id: number): Promise<User | null> {
  return await databaseService.getUserById(id);
}

export async function getUserByUsername(username: string): Promise<User | null> {
  return await databaseService.getUserByUsername(username);
}

export async function createUser(user: Partial<User>): Promise<User | null> {
  return await databaseService.createUser(user);
}

export async function updateUser(id: number, updates: Partial<User>): Promise<User | null> {
  return await databaseService.updateUser(id, updates);
}

export async function updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void> {
  await databaseService.updateUser(userId, { isOnline, lastSeen: new Date() });
}

export async function updateUserLastSeen(userId: number): Promise<void> {
  await databaseService.updateUser(userId, { lastSeen: new Date() });
}

export async function getOnlineUsers(): Promise<User[]> {
  return await databaseService.getOnlineUsers();
}

export async function getAllUsers(): Promise<User[]> {
  return await databaseService.getAllUsers();
}

// Message-related functions
export async function saveMessage(message: Partial<Message>): Promise<Message | null> {
  return await databaseService.createMessage(message);
}

export async function getMessages(roomId: string, limit: number = 50): Promise<Message[]> {
  return await databaseService.getMessages(roomId, limit);
}

export async function getPrivateMessages(userId1: number, userId2: number, limit: number = 50): Promise<Message[]> {
  return await databaseService.getPrivateMessages(userId1, userId2, limit);
}

export async function getAllMessages(): Promise<Message[]> {
  return await databaseService.getMessages('general', 1000); // Get all general messages
}

// Friend-related functions
export async function sendFriendRequest(userId: number, friendId: number): Promise<Friend | null> {
  return await databaseService.sendFriendRequest(userId, friendId);
}

export async function getFriends(userId: number): Promise<Friend[]> {
  return await databaseService.getFriends(userId);
}

export async function getFriendRequests(userId: number): Promise<Friend[]> {
  // This needs custom implementation since it's not in the basic service
  const status = databaseService.getStatus();
  if (!status.connected) return [];

  try {
    // Implementation would depend on the specific requirements
    // For now, return empty array
    return [];
  } catch (error) {
    console.error('Error getting friend requests:', error);
    return [];
  }
}

export async function updateFriendRequestStatus(requestId: number, status: string): Promise<Friend | null> {
  return await databaseService.updateFriendRequest(requestId, status);
}

export async function acceptFriendRequest(requestId: number): Promise<Friend | null> {
  return await databaseService.updateFriendRequest(requestId, 'accepted');
}

export async function rejectFriendRequest(requestId: number): Promise<Friend | null> {
  return await databaseService.updateFriendRequest(requestId, 'rejected');
}

export async function removeFriend(requestId: number): Promise<boolean> {
  try {
    await databaseService.updateFriendRequest(requestId, 'removed');
    return true;
  } catch (error) {
    console.error('Error removing friend:', error);
    return false;
  }
}

export async function blockFriend(requestId: number): Promise<Friend | null> {
  return await databaseService.updateFriendRequest(requestId, 'blocked');
}

// Room-related functions
export async function getRoomById(roomId: number): Promise<Room | null> {
  const rooms = await databaseService.getRooms();
  return rooms.find(room => room.id === roomId) || null;
}

export async function getAllRooms(): Promise<Room[]> {
  return await databaseService.getRooms();
}

export async function createRoom(roomData: Partial<Room>): Promise<Room | null> {
  return await databaseService.createRoom(roomData);
}

// Helper: fetch single room by id (supports string/number ids)
export async function getRoom(id: string | number): Promise<any | null> {
  const rooms = await databaseService.getRooms();
  const match = rooms.find((r: any) => String(r.id) === String(id)) || null;
  if (!match) return null;
  // Ensure backward-compat field
  return {
    ...match,
    is_broadcast: (match as any).is_broadcast ?? (match as any).isBroadcast ?? false,
  };
}

// Broadcast info derived from room record (fallback implementation)
export async function getBroadcastRoomInfo(roomId: string): Promise<{
  roomId: string;
  isBroadcast: boolean;
  hostId: number | null;
  speakers: any[];
  micQueue: any[];
} | null> {
  const room = await getRoom(roomId);
  if (!room) return null;
  const speakersRaw = (room as any).speakers ?? '[]';
  const micQueueRaw = (room as any).micQueue ?? '[]';
  return {
    roomId: String(roomId),
    isBroadcast: Boolean((room as any).isBroadcast ?? (room as any).is_broadcast ?? false),
    hostId: (room as any).hostId ?? null,
    speakers: typeof speakersRaw === 'string' ? safeParseJsonArray(speakersRaw) : Array.isArray(speakersRaw) ? speakersRaw : [],
    micQueue: typeof micQueueRaw === 'string' ? safeParseJsonArray(micQueueRaw) : Array.isArray(micQueueRaw) ? micQueueRaw : [],
  };
}

function safeParseJsonArray(value: string): any[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Notification-related functions
export async function createNotification(notification: Partial<Notification>): Promise<Notification | null> {
  return await databaseService.createNotification(notification);
}

export async function getNotifications(userId: number): Promise<Notification[]> {
  return await databaseService.getNotifications(userId);
}

export async function markNotificationAsRead(notificationId: number): Promise<void> {
  // This would need custom implementation
  // For now, do nothing
}

export async function markAllNotificationsAsRead(userId: number): Promise<void> {
  // This would need custom implementation
  // For now, do nothing
}

export async function deleteNotification(notificationId: number): Promise<void> {
  // This would need custom implementation
  // For now, do nothing
}

export async function getUnreadNotificationsCount(userId: number): Promise<number> {
  try {
    const notifications = await databaseService.getNotifications(userId);
    return notifications.filter(n => !n.isRead).length;
  } catch (error) {
    console.error('Error getting unread notifications count:', error);
    return 0;
  }
}

// Points and levels
export async function addPoints(userId: number, points: number, reason: string): Promise<void> {
  try {
    const user = await databaseService.getUserById(userId);
    if (user) {
      const newPoints = user.points + points;
      const newTotalPoints = user.totalPoints + points;
      
      // Calculate level based on total points
      let newLevel = user.level;
      let newLevelProgress = user.levelProgress;
      
      // Simple level calculation - can be enhanced later
      const pointsPerLevel = 1000;
      newLevel = Math.floor(newTotalPoints / pointsPerLevel) + 1;
      newLevelProgress = (newTotalPoints % pointsPerLevel) / pointsPerLevel * 100;
      
      await databaseService.updateUser(userId, {
        points: newPoints,
        totalPoints: newTotalPoints,
        level: newLevel,
        levelProgress: Math.round(newLevelProgress)
      });
    }
  } catch (error) {
    console.error('Error adding points:', error);
  }
}

export async function deductPoints(userId: number, points: number, reason: string): Promise<void> {
  try {
    const user = await databaseService.getUserById(userId);
    if (user) {
      const newPoints = Math.max(0, user.points - points);
      await databaseService.updateUser(userId, { points: newPoints });
    }
  } catch (error) {
    console.error('Error deducting points:', error);
  }
}

export async function getPointsHistory(userId: number): Promise<any[]> {
  // This would need custom implementation
  // For now, return empty array
  return [];
}

export async function getTopUsersByPoints(limit: number = 10): Promise<User[]> {
  try {
    const users = await databaseService.getAllUsers();
    return users
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);
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

// Statistics
export async function getStats(): Promise<{ users: number; messages: number; onlineUsers: number }> {
  return await databaseService.getStats();
}

// Security functions
export async function blockDevice(ipAddress: string, deviceId: string, userId: number, reason: string, blockedBy: number): Promise<void> {
  // This would need custom implementation
  // For now, do nothing
}

export async function isDeviceBlocked(ipAddress: string, deviceId: string): Promise<boolean> {
  // This would need custom implementation
  // For now, return false
  return false;
}

export async function getAllBlockedDevices(): Promise<any[]> {
  // This would need custom implementation
  // For now, return empty array
  return [];
}

// User authentication helpers
export async function validateUserCredentials(username: string, password: string): Promise<User | null> {
  try {
    const user = await databaseService.getUserByUsername(username);
    if (!user || !user.password) return null;
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    return isValidPassword ? user : null;
  } catch (error) {
    console.error('Error validating user credentials:', error);
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

// Database status
export function getDatabaseStatus() {
  return databaseService.getStatus();
}

// Legacy compatibility functions (marked for removal)
export async function getMessageCount(): Promise<number> {
  const stats = await databaseService.getStats();
  return stats.messages;
}

export async function getUserCount(): Promise<number> {
  const stats = await databaseService.getStats();
  return stats.users;
}

// Room membership functions (simplified)
export async function joinRoom(userId: number, roomId: number | string): Promise<boolean> {
  try {
    const status = databaseService.getStatus();
    if (!status.connected) return true; // لا تفشل الاتصال بسبب عدم توفر القاعدة

    // تأكد من وجود الغرفة (وفي PG تكون id نصية)
    const room = await getRoom(roomId);
    if (!room) {
      // أنشئ غرفة عامة تلقائياً عند الحاجة
      if (String(roomId) === 'general') {
        await databaseService.createRoom({ id: 'general', name: 'الدردشة العامة', description: 'الغرفة الرئيسية للدردشة', createdBy: 1, isDefault: true, isActive: true });
      } else {
        return false;
      }
    }

    // حفظ العضوية في جدول room_users إن توفر
    const { db, dbType } = await import('./database-adapter');
    const { roomUsers } = dbType === 'postgresql' ? await import('../shared/schema') : await import('../shared/sqlite-schema');
    const { eq, and } = await import('drizzle-orm');

    // احذف أي سجل سابق لنفس المستخدم/الغرفة لضمان التفرد ثم أدرجه
    if (db && dbType !== 'disabled') {
      // تحقق إن كان السجل موجوداً
      const existing = await (db as any)
        .select()
        .from((roomUsers as any))
        .where(and(eq((roomUsers as any).userId, userId as any), eq((roomUsers as any).roomId, String(roomId) as any)))
        .limit(1);
      if (Array.isArray(existing) && existing.length === 0) {
        await (db as any).insert((roomUsers as any)).values({ userId, roomId: String(roomId), joinedAt: dbType === 'sqlite' ? new Date().toISOString() : new Date() });
      }
    }
    return true;
  } catch (error) {
    console.error('Error joinRoom:', error);
    return false;
  }
}

export async function leaveRoom(userId: number, roomId: number | string): Promise<boolean> {
  try {
    const status = databaseService.getStatus();
    if (!status.connected) return true;
    const { db, dbType } = await import('./database-adapter');
    const { roomUsers } = dbType === 'postgresql' ? await import('../shared/schema') : await import('../shared/sqlite-schema');
    const { eq, and } = await import('drizzle-orm');
    if (db && dbType !== 'disabled') {
      await (db as any)
        .delete((roomUsers as any))
        .where(and(eq((roomUsers as any).userId, userId as any), eq((roomUsers as any).roomId, String(roomId) as any)));
    }
    return true;
  } catch (error) {
    console.error('Error leaveRoom:', error);
    return false;
  }
}

export async function getRoomUsers(roomId: number | string): Promise<number[]> {
  try {
    const status = databaseService.getStatus();
    if (!status.connected) return [];
    const { db, dbType } = await import('./database-adapter');
    const { roomUsers } = dbType === 'postgresql' ? await import('../shared/schema') : await import('../shared/sqlite-schema');
    const { eq } = await import('drizzle-orm');
    if (db && dbType !== 'disabled') {
      const rows = await (db as any)
        .select({ userId: (roomUsers as any).userId })
        .from((roomUsers as any))
        .where(eq((roomUsers as any).roomId, String(roomId) as any));
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
    const { roomUsers } = dbType === 'postgresql' ? await import('../shared/schema') : await import('../shared/sqlite-schema');
    const { eq } = await import('drizzle-orm');
    if (db && dbType !== 'disabled') {
      const rows = await (db as any)
        .select({ roomId: (roomUsers as any).roomId })
        .from((roomUsers as any))
        .where(eq((roomUsers as any).userId, userId as any));
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
    const { roomUsers } = dbType === 'postgresql' ? await import('../shared/schema') : await import('../shared/sqlite-schema');
    const { eq, and } = await import('drizzle-orm');
    if (db && dbType !== 'disabled') {
      const rows = await (db as any)
        .select({ id: (roomUsers as any).id })
        .from((roomUsers as any))
        .where(and(eq((roomUsers as any).userId, userId as any), eq((roomUsers as any).roomId, String(roomId) as any)))
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
export async function createWallPost(userId: number, content: string): Promise<any> {
  // This would need custom implementation with wall_posts table
  // For now, return null
  return null;
}

export async function getWallPosts(userId: number, limit: number = 10): Promise<any[]> {
  // This would need custom implementation with wall_posts table
  // For now, return empty array
  return [];
}

export async function getUserWallPosts(userId: number, targetUserId: number, limit: number = 10): Promise<any[]> {
  // This would need custom implementation with wall_posts table
  // For now, return empty array
  return [];
}

export async function deleteWallPost(postId: number, userId: number): Promise<boolean> {
  // This would need custom implementation with wall_posts table
  // For now, return true
  return true;
}

export async function reactToWallPost(postId: number, userId: number, reaction: string): Promise<boolean> {
  // This would need custom implementation with wall_reactions table
  // For now, return true
  return true;
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
  getRoomMessages: (roomId: string, limit?: number) => Promise<Message[]>;
  addFriend: (userId: number, friendId: number) => Promise<Friend>;
  getFriends: (userId: number) => Promise<User[]>;
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
    const user = await getUserById(id);
    return user || undefined;
  },

  async getUserByUsername(username: string) {
    const user = await getUserByUsername(username);
    return user || undefined;
  },

  async createUser(user: any) {
    const newUser = await createUser(user);
    if (!newUser) throw new Error('Failed to create user');
    return newUser;
  },

  async updateUser(id: number, updates: Partial<User>) {
    const user = await updateUser(id, updates);
    return user || undefined;
  },

  async setUserOnlineStatus(id: number, isOnline: boolean) {
    await updateUserOnlineStatus(id, isOnline);
  },

  async createMessage(message: any) {
    const newMessage = await saveMessage(message);
    if (!newMessage) throw new Error('Failed to create message');
    return newMessage;
  },

  async getPublicMessages(limit?: number) {
    return await getMessages('general', limit);
  },

  async getPrivateMessages(userId1: number, userId2: number, limit?: number) {
    return await getPrivateMessages(userId1, userId2, limit);
  },

  async getRoomMessages(roomId: string, limit?: number) {
    return await getMessages(roomId, limit);
  },

  async addFriend(userId: number, friendId: number) {
    const friend = await sendFriendRequest(userId, friendId);
    if (!friend) throw new Error('Failed to add friend');
    return friend;
  },

  async getFriends(userId: number) {
    const friends = await getFriends(userId);
    return friends as any[]; // Cast to maintain compatibility
  },

  async createNotification(notification: any) {
    const newNotification = await createNotification(notification);
    if (!newNotification) throw new Error('Failed to create notification');
    return newNotification;
  },

  async getUserNotifications(userId: number, limit?: number) {
    return await getNotifications(userId);
  },

  async markNotificationAsRead(notificationId: number) {
    await markNotificationAsRead(notificationId);
    return true;
  },

  async getOnlineUsers() {
    return await getOnlineUsers();
  },

  async getAllUsers() {
    return await getAllUsers();
  },

  // Added for moderation persistence
  async getBlockedDevices() {
    return await databaseService.getBlockedDevices();
  },

  async createBlockedDevice(data: any) {
    const created = await databaseService.createBlockedDevice(data);
    if (!created) throw new Error('Failed to create blocked device');
    return created as any;
  },

  // Added for rooms compatibility
  async getRoom(roomId: string) {
    return await getRoom(roomId);
  },

  async getBroadcastRoomInfo(roomId: string) {
    return await getBroadcastRoomInfo(roomId);
  },

  // ========= Friends API (delegating to friendService) =========
  async getIncomingFriendRequests(userId: number) {
    return await friendService.getIncomingFriendRequests(userId);
  },

  async getOutgoingFriendRequests(userId: number) {
    return await friendService.getOutgoingFriendRequests(userId);
  },

  async createFriendRequest(senderId: number, receiverId: number) {
    return await friendService.createFriendRequest(senderId, receiverId);
  },

  async getFriendship(userId1: number, userId2: number) {
    return await friendService.getFriendship(userId1, userId2);
  },

  async getFriendRequest(senderId: number, receiverId: number) {
    return await friendService.getFriendship(senderId, receiverId);
  },

  async getFriendRequestById(requestId: number) {
    if (!db) return undefined;
    try {
      const rows = await (db as any)
        .select()
        .from(friendsTable)
        .where(eq(friendsTable.id as any, requestId))
        .limit(1);
      const row = Array.isArray(rows) ? rows[0] : undefined;
      if (!row) return undefined;
      return {
        id: row.id,
        senderId: row.userId,
        receiverId: row.friendId,
        status: row.status,
        createdAt: row.createdAt
      };
    } catch {
      return undefined;
    }
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

  // ========= Room helpers exposed on storage =========
  async getAllRooms() {
    return await getAllRooms();
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

  async getOnlineUsersInRoom(roomId: string) {
    try {
      const status = databaseService.getStatus();
      if (!status.connected) return [];
      const { db, dbType } = await import('./database-adapter');
      const { roomUsers } = dbType === 'postgresql' ? await import('../shared/schema') : await import('../shared/sqlite-schema');
      const { eq } = await import('drizzle-orm');
      if (db && dbType !== 'disabled') {
        const rows = await (db as any)
          .select({ userId: (roomUsers as any).userId })
          .from((roomUsers as any))
          .where(eq((roomUsers as any).roomId, String(roomId) as any));
        const userIds = (rows || []).map((r: any) => r.userId);
        const users: any[] = [];
        for (const id of userIds) {
          const u = await databaseService.getUserById(id);
          if (u) users.push(u as any);
        }
        return users;
      }
      return [] as any[];
    } catch (error) {
      console.error('Error getOnlineUsersInRoom:', error);
      return [] as any[];
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
  }
};

// Export the database service for direct access if needed
export { databaseService };

// Public interface type for storage consumers
export type IStorage = typeof storage;