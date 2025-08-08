import { databaseService, type User, type Message, type Friend, type Notification, type Room } from './services/databaseService';
import bcrypt from 'bcrypt';
import { friendService } from './services/friendService';
import { userService } from './services/userService';
import { notificationService } from './services/notificationService';
import { db } from './database-adapter';
import { friends as friendsTable } from '../shared/schema';
import { eq } from 'drizzle-orm';

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
      totalPoints: newTotalPoints
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

export async function getTopUsersByPoints(limit: number = 10): Promise<User[]> {
  try {
    const allUsers = await databaseService.getAllUsers();
    return allUsers
      .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
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

// Stats functions
export async function getStats(): Promise<{ users: number; messages: number; onlineUsers: number }> {
  return await databaseService.getStats();
}

export async function blockDevice(ipAddress: string, deviceId: string, userId: number, reason: string, blockedBy: number): Promise<void> {
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

export async function validateUserCredentials(username: string, password: string): Promise<User | null> {
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

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

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
    const allUsers = await databaseService.getAllUsers();
    return allUsers.length;
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
    const { roomUsers } = dbType === 'postgresql' ? await import('../shared/schema') : await import('../shared/sqlite-schema');
    const { eq, and } = await import('drizzle-orm');
    if (db && dbType !== 'disabled') {
      const existing = await (db as any)
        .select({ id: (roomUsers as any).id })
        .from((roomUsers as any))
        .where(and(eq((roomUsers as any).userId, userId as any), eq((roomUsers as any).roomId, String(roomId) as any)))
        .limit(1);
      if (!existing || existing.length === 0) {
        await (db as any).insert((roomUsers as any)).values({
          userId: userId as any,
          roomId: String(roomId) as any,
          joinedAt: new Date() as any
        });
      }
      return true;
    }
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
    const { roomUsers } = dbType === 'postgresql' ? await import('../shared/schema') : await import('../shared/sqlite-schema');
    const { eq, and } = await import('drizzle-orm');
    if (db && dbType !== 'disabled') {
      await (db as any)
        .delete((roomUsers as any))
        .where(and(eq((roomUsers as any).userId, userId as any), eq((roomUsers as any).roomId, String(roomId) as any)));
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
    const user = await databaseService.getUserById(id);
    return user || undefined;
  },

  async getUserByUsername(username: string) {
    const user = await databaseService.getUserByUsername(username);
    return user || undefined;
  },

  async createUser(user: any) {
    const newUser = await databaseService.createUser(user);
    if (!newUser) throw new Error('Failed to create user');
    return newUser;
  },

  async updateUser(id: number, updates: Partial<User>) {
    const user = await databaseService.updateUser(id, updates);
    return user || undefined;
  },

  async setUserOnlineStatus(id: number, isOnline: boolean) {
    await databaseService.updateUser(id, { isOnline, lastSeen: new Date() });
  },

  async createMessage(message: any) {
    const newMessage = await databaseService.createMessage(message);
    if (!newMessage) throw new Error('Failed to create message');
    return newMessage;
  },

  async getPublicMessages(limit = 50) {
    return await databaseService.getMessages('general', limit);
  },

  async getPrivateMessages(userId1: number, userId2: number, limit = 50) {
    return await databaseService.getPrivateMessages(userId1, userId2, limit);
  },

  async getRoomMessages(roomId: string, limit = 50) {
    return await databaseService.getMessages(roomId, limit);
  },

  async addFriend(userId: number, friendId: number) {
    // إنشاء صداقة مقبولة مباشرة (يستخدم في أماكن تحتاج إضافة مباشرة)
    const { db, dbType } = await import('./database-adapter');
    const { friends } = dbType === 'postgresql' ? await import('../shared/schema') : await import('../shared/sqlite-schema');
    const { and, or, eq } = await import('drizzle-orm');

    // لا تنشئ تكرار
    const existing = await (db as any)
      .select()
      .from((friends as any))
      .where(
        and(
          or(
            and(eq((friends as any).userId, userId as any), eq((friends as any).friendId, friendId as any)),
            and(eq((friends as any).userId, friendId as any), eq((friends as any).friendId, userId as any))
          )
        )
      )
      .limit(1);
    if (Array.isArray(existing) && existing.length > 0) return existing[0] as any;

    if (dbType === 'postgresql') {
      const result = await (db as any).insert((friends as any)).values({ userId, friendId, status: 'accepted', createdAt: new Date() }).returning();
      return result?.[0] as any;
    } else {
      const result = await (db as any).insert((friends as any)).values({ userId, friendId, status: 'accepted', createdAt: new Date().toISOString() });
      if ((result as any).lastInsertRowid) {
        const rows = await (db as any)
          .select()
          .from((friends as any))
          .where(eq((friends as any).id, Number((result as any).lastInsertRowid)))
          .limit(1);
        return rows?.[0] as any;
      }
      return null as any;
    }
  },

  async getFriends(userId: number) {
    try {
      const friends = await databaseService.getFriends(userId);
      const friendUsers: User[] = [];
      
      for (const friendship of friends) {
        const friendId = friendship.userId === userId ? friendship.friendId : friendship.userId;
        const friendUser = await databaseService.getUserById(friendId);
        if (friendUser) {
          friendUsers.push(friendUser);
        }
      }
      
      return friendUsers;
    } catch (error) {
      console.error('Error getting friends:', error);
      return [];
    }
  },

  async createNotification(notification: any) {
    const newNotification = await databaseService.createNotification(notification);
    if (!newNotification) throw new Error('Failed to create notification');
    return newNotification;
  },

  async getUserNotifications(userId: number, limit = 50) {
    return await databaseService.getNotifications(userId);
  },

  async markNotificationAsRead(notificationId: number) {
    try {
      // This functionality needs to be implemented in databaseService
      console.warn('markNotificationAsRead not implemented in databaseService');
      return true;
    } catch {
      return false;
    }
  },

  async getOnlineUsers() {
    return await databaseService.getOnlineUsers();
  },

  async getAllUsers() {
    return await databaseService.getAllUsers();
  },

  // Additional room-related methods
  async getRoomById(roomId: number) {
    const rooms = await databaseService.getRooms();
    return rooms.find(room => room.id === roomId) || null;
  },

  async getAllRooms() {
    return await databaseService.getRooms();
  },

  async createRoom(roomData: Partial<Room>) {
    return await databaseService.createRoom(roomData);
  },

  async getRoom(id: string | number) {
    try {
      const status = databaseService.getStatus();
      if (!status.connected) return null;
      
      if (typeof id === 'string') {
        const rooms = await databaseService.getRooms();
        return rooms.find((r: any) => r.id === id || r.name === id) || null;
      } else {
        const rooms = await databaseService.getRooms();
        return rooms.find(room => room.id === id) || null;
      }
    } catch (error) {
      console.error('Error getting room:', error);
      return null;
    }
  },

  async getBroadcastRoomInfo(roomId: string) {
    try {
      const status = databaseService.getStatus();
      if (!status.connected) return { room: null, participants: [], micQueue: [] };
      
      const room = await this.getRoom(roomId);
      if (!room) return { room: null, participants: [], micQueue: [] };
      
      const participants = await getRoomUsers(roomId);
      return {
        room,
        participants: participants || [],
        micQueue: [] // Placeholder for mic queue functionality
      };
    } catch (error) {
      console.error('Error getting broadcast room info:', error);
      return { room: null, participants: [], micQueue: [] };
    }
  },

  // Friend request methods
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

  // إضافة الطرق المفقودة لطلبات الصداقة
  async getIncomingFriendRequests(userId: number) {
    return await friendService.getIncomingFriendRequests(userId);
  },

  async getOutgoingFriendRequests(userId: number) {
    return await friendService.getOutgoingFriendRequests(userId);
  },

  async getFriendship(userId1: number, userId2: number) {
    return await friendService.getFriendship(userId1, userId2);
  },

  async getFriendRequest(senderId: number, receiverId: number) {
    return await friendService.getFriendRequest(senderId, receiverId);
  },

  async getFriendRequestById(requestId: number) {
    return await friendService.getFriendRequestById(requestId);
  },

  async createFriendRequest(senderId: number, receiverId: number) {
    return await friendService.createFriendRequest(senderId, receiverId);
  },

  async sendFriendRequest(senderId: number, receiverId: number) {
    // Alias for createFriendRequest for backward compatibility
    return await this.createFriendRequest(senderId, receiverId);
  },

  async removeFriend(userId: number, friendId: number) {
    return await friendService.removeFriend(userId, friendId);
  },

  // ========= Room helpers exposed on storage =========
  async getRooms() {
    return await databaseService.getRooms();
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

// Default export is the storage object
export default storage;

// Public interface type for storage consumers
export type IStorage = typeof storage;