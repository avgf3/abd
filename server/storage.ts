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
    if (dbType === 'postgresql') {
      const { roomMembers } = await import('../shared/schema');
      const { eq, and } = await import('drizzle-orm');
      const exists = await (db as any)
        .select({ userId: (roomMembers as any).userId })
        .from((roomMembers as any))
        .where(and(eq((roomMembers as any).roomId, String(roomId) as any), eq((roomMembers as any).userId, userId as any)))
        .limit(1);
      if (!exists || exists.length === 0) {
        await (db as any).insert((roomMembers as any)).values({ roomId: String(roomId) as any, userId: userId as any });
      }
      return true;
    }
    // fallback to legacy room_users for sqlite
    const { roomUsers } = await import('../shared/sqlite-schema');
    const { eq, and } = await import('drizzle-orm');
    const existing = await (db as any)
      .select({ id: (roomUsers as any).id })
      .from((roomUsers as any))
      .where(and(eq((roomUsers as any).userId, userId as any), eq((roomUsers as any).roomId, String(roomId) as any)))
      .limit(1);
    if (!existing || existing.length === 0) {
      await (db as any).insert((roomUsers as any)).values({ userId: userId as any, roomId: String(roomId) as any, joinedAt: new Date() as any });
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
    if (dbType === 'postgresql') {
      const { roomMembers } = await import('../shared/schema');
      const { eq, and } = await import('drizzle-orm');
      await (db as any)
        .delete((roomMembers as any))
        .where(and(eq((roomMembers as any).roomId, String(roomId) as any), eq((roomMembers as any).userId, userId as any)));
      return true;
    }
    const { roomUsers } = await import('../shared/sqlite-schema');
    const { eq, and } = await import('drizzle-orm');
    await (db as any)
      .delete((roomUsers as any))
      .where(and(eq((roomUsers as any).userId, userId as any), eq((roomUsers as any).roomId, String(roomId) as any)));
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
        .from((roomMembers as any))
        .where(eq((roomMembers as any).roomId, String(roomId) as any));
      return (rows || []).map((r: any) => r.userId);
    }
    const { roomUsers } = await import('../shared/sqlite-schema');
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
    if (dbType === 'postgresql') {
      const { roomMembers } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      const rows = await (db as any)
        .select({ roomId: (roomMembers as any).roomId })
        .from((roomMembers as any))
        .where(eq((roomMembers as any).userId, userId as any));
      return (rows || []).map((r: any) => String(r.roomId));
    }
    const { roomUsers } = await import('../shared/sqlite-schema');
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
    if (dbType === 'postgresql') {
      const { roomMembers } = await import('../shared/schema');
      const { eq, and } = await import('drizzle-orm');
      const rows = await (db as any)
        .select({ uid: (roomMembers as any).userId })
        .from((roomMembers as any))
        .where(and(eq((roomMembers as any).userId, userId as any), eq((roomMembers as any).roomId, String(roomId) as any)))
        .limit(1);
      return Array.isArray(rows) && rows.length > 0;
    }
    const { roomUsers } = await import('../shared/sqlite-schema');
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
  try {
    const { db, dbType } = await import('./database-adapter');
    if (!db || dbType === 'disabled') return [];
    if (dbType === 'postgresql') {
      const { wallPosts } = await import('../shared/schema');
      const { desc } = await import('drizzle-orm');
      const rows = await (db as any)
        .select()
        .from((wallPosts as any))
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

export async function getWallPostsByUsers(userIds: number[], limit: number = 10): Promise<any[]> {
  try {
    const { db, dbType } = await import('./database-adapter');
    if (!db || dbType === 'disabled') return [];
    if (dbType === 'postgresql') {
      const { wallPosts } = await import('../shared/schema');
      const { inArray, desc } = await import('drizzle-orm');
      const rows = await (db as any)
        .select()
        .from((wallPosts as any))
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
    // If public message to room, validate per-room moderation (PostgreSQL only)
    if (!message.isPrivate && message.roomId && typeof message.senderId === 'number') {
      const can = await databaseService.canSendInRoom(message.roomId, message.senderId);
      if (!can.allowed) {
        throw new Error('المرسل غير مسموح له بالإرسال في هذه الغرفة');
      }
    }
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

  // Friends
  async addFriend(userId: number, friendId: number) {
    return await friendService.addFriend(userId, friendId);
  },

  async getFriends(userId: number) {
    return await friendService.getFriends(userId);
  },

  // Notifications
  async createNotification(notification: any) {
    const result = await notificationService.createNotification(notification);
    if (!result) throw new Error('Failed to create notification');
    return result;
  },

  async getUserNotifications(userId: number, limit = 50) {
    return await notificationService.getUserNotifications(userId, limit);
  },

  async markNotificationAsRead(notificationId: number) {
    return await notificationService.markNotificationAsRead(notificationId);
  },

  async getOnlineUsers() {
    return await databaseService.getOnlineUsers();
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

  // Provide blocked devices for moderation bootstrap
  async getBlockedDevices() {
    return await databaseService.getBlockedDevices();
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
      if (dbType === 'postgresql') {
        const { roomMembers } = await import('../shared/schema');
        const { eq } = await import('drizzle-orm');
        const rows = await (db as any)
          .select({ userId: (roomMembers as any).userId })
          .from((roomMembers as any))
          .where(eq((roomMembers as any).roomId, String(roomId) as any));
        const userIds = (rows || []).map((r: any) => r.userId);
        const users: any[] = [];
        for (const id of userIds) {
          const u = await databaseService.getUserById(id);
          // تضمين فقط المستخدمين المتصلين فعلياً وغير المخفيين
          if (u && u.isOnline && !(u as any).isHidden) {
            users.push(u as any);
          }
        }
        return users;
      }
      const { roomUsers } = await import('../shared/sqlite-schema');
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
          if (u && u.isOnline && !(u as any).isHidden) {
            users.push(u as any);
          }
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
  },

  // ========= Broadcast Room / Mic Management =========
  
  // دوال مساعدة لتحليل JSON - لتجنب تكرار الكود
  parseMicQueue(micQueueData: any): number[] {
    if (!micQueueData) return [];
    try {
      return typeof micQueueData === 'string' ? JSON.parse(micQueueData) : micQueueData;
    } catch (e) {
      console.error('خطأ في تحليل قائمة انتظار المايك:', e);
      return [];
    }
  },

  parseSpeakers(speakersData: any): number[] {
    if (!speakersData) return [];
    try {
      return typeof speakersData === 'string' ? JSON.parse(speakersData) : speakersData;
    } catch (e) {
      console.error('خطأ في تحليل قائمة المتحدثين:', e);
      return [];
    }
  },

  // تعيين/تحديث مضيف غرفة البث
  async setRoomHost(roomId: string, hostId: number | null): Promise<boolean> {
    try {
      const { db, dbType } = await import('./database-adapter');
      if (!db) return false;

      if (dbType === 'postgresql') {
        const { rooms } = await import('../shared/schema');
        const { eq } = await import('drizzle-orm');
        await (db as any).update(rooms).set({ hostId }).where(eq((rooms as any).id, roomId as any));
      } else if (dbType === 'sqlite') {
        (db as any).run?.("UPDATE rooms SET host_id = ? WHERE id = ?", [hostId, roomId]);
      }

      return true;
    } catch (error) {
      console.error('Error setting room host:', error);
      return false;
    }
  },

  // دالة مساعدة للتحقق من صحة غرفة البث - محدثة للسماح للمشرفين والإدمن
  async validateBroadcastRoom(roomId: string, actionBy?: number) {
    const status = databaseService.getStatus();
    if (!status.connected) {
      return { isValid: false, error: 'قاعدة البيانات غير متصلة' };
    }
    
    // التحقق من وجود الغرفة وأنها غرفة بث
    const room = await this.getRoom(roomId);
    if (!room || !(room as any).isBroadcast) {
      console.log(`Room ${roomId} is not a broadcast room`);
      return { isValid: false, error: 'الغرفة ليست غرفة بث مباشر' };
    }
    
    // التحقق من صلاحيات المستخدم إذا تم تمرير actionBy
    if (actionBy !== undefined) {
      const user = await this.getUser(actionBy);
      if (!user) {
        return { isValid: false, error: 'المستخدم غير موجود' };
      }

      // السماح للمضيف والمشرفين والإدمن بإدارة المايك
      const isHost = (room as any).hostId === actionBy;
      const isAdmin = user.userType === 'admin';
      const isModerator = user.userType === 'moderator';
      const isOwner = user.userType === 'owner';

      if (!isHost && !isAdmin && !isModerator && !isOwner) {
        console.log(`User ${actionBy} does not have permission to manage mic in room ${roomId}`);
        return { isValid: false, error: 'المستخدم ليس لديه صلاحية لإدارة المايك في هذه الغرفة' };
      }
    }
    
    return { isValid: true, room };
  },
  
  async requestMic(userId: number, roomId: string) {
    try {
      // استخدام الدالة المساعدة للتحقق
      const validation = await this.validateBroadcastRoom(roomId);
      if (!validation.isValid) {
        return false;
      }
      
      const room = validation.room;
      
      // التحقق من وجود المستخدم
      const user = await databaseService.getUserById(userId);
      if (!user) {
        console.log(`User ${userId} not found`);
        return false;
      }
      
      // جلب قائمة الانتظار الحالية
      let micQueue = this.parseMicQueue((room as any).micQueue ?? (room as any).mic_queue);
      
      // جلب قائمة المتحدثين الحالية
      let speakers = this.parseSpeakers((room as any).speakers);
      
      // التحقق من أن المستخدم ليس مضيف أو متحدث أو في قائمة الانتظار
      if ((room as any).hostId === userId) {
        console.log(`User ${userId} is already the host`);
        return false;
      }
      
      if (speakers.includes(userId)) {
        console.log(`User ${userId} is already a speaker`);
        return false;
      }
      
      if (micQueue.includes(userId)) {
        console.log(`User ${userId} is already in mic queue`);
        return false;
      }
      
      // إضافة المستخدم لقائمة الانتظار
      micQueue.push(userId);
      
      // تحديث قاعدة البيانات
      const { db, dbType } = await import('./database-adapter');
      if (db && dbType === 'postgresql') {
        const { rooms } = await import('../shared/schema');
        const { eq } = await import('drizzle-orm');
        await (db as any).update(rooms).set({ micQueue: JSON.stringify(micQueue) }).where(eq((rooms as any).id, roomId as any));
      } else if (db && dbType === 'sqlite') {
        (db as any).run?.("UPDATE rooms SET mic_queue = ? WHERE id = ?", [JSON.stringify(micQueue), roomId]);
      }
      
      console.log(`User ${userId} added to mic queue for room ${roomId}`);
      return true;
      
    } catch (error) {
      console.error('Error in requestMic:', error);
      return false;
    }
  },

  async approveMicRequest(roomId: string, userId: number, approvedBy: number) {
    try {
      // استخدام الدالة المساعدة للتحقق
      const validation = await this.validateBroadcastRoom(roomId, approvedBy);
      if (!validation.isValid) {
        return false;
      }
      
      const room = validation.room;
      
      // جلب قائمة الانتظار الحالية
      let micQueue = this.parseMicQueue((room as any).micQueue ?? (room as any).mic_queue);
      
      // جلب قائمة المتحدثين الحالية
      let speakers = this.parseSpeakers((room as any).speakers);
      
      // التحقق من وجود المستخدم في قائمة الانتظار
      const queueIndex = micQueue.indexOf(userId);
      if (queueIndex === -1) {
        console.log(`User ${userId} is not in mic queue`);
        return false;
      }
      
      // إزالة المستخدم من قائمة الانتظار وإضافته للمتحدثين
      micQueue.splice(queueIndex, 1);
      if (!speakers.includes(userId)) {
        speakers.push(userId);
      }
      
      // تحديث قاعدة البيانات
      const { db, dbType } = await import('./database-adapter');
      if (db && dbType === 'postgresql') {
        const { rooms } = await import('../shared/schema');
        const { eq } = await import('drizzle-orm');
        await (db as any).update(rooms).set({ micQueue: JSON.stringify(micQueue), speakers: JSON.stringify(speakers) }).where(eq((rooms as any).id, roomId as any));
      } else if (db && dbType === 'sqlite') {
        (db as any).run?.("UPDATE rooms SET mic_queue = ?, speakers = ? WHERE id = ?", [JSON.stringify(micQueue), JSON.stringify(speakers), roomId]);
      }
      
      console.log(`User ${userId} approved as speaker in room ${roomId} by ${approvedBy}`);
      return true;
      
    } catch (error) {
      console.error('Error in approveMicRequest:', error);
      return false;
    }
  },

  async rejectMicRequest(roomId: string, userId: number, rejectedBy: number) {
    try {
      // استخدام الدالة المساعدة للتحقق
      const validation = await this.validateBroadcastRoom(roomId, rejectedBy);
      if (!validation.isValid) {
        return false;
      }
      
      const room = validation.room;
      
      // جلب قائمة الانتظار الحالية
      let micQueue = this.parseMicQueue((room as any).micQueue ?? (room as any).mic_queue);
      
      // التحقق من وجود المستخدم في قائمة الانتظار
      const queueIndex = micQueue.indexOf(userId);
      if (queueIndex === -1) {
        console.log(`User ${userId} is not in mic queue`);
        return false;
      }
      
      // إزالة المستخدم من قائمة الانتظار
      micQueue.splice(queueIndex, 1);
      
      // تحديث قاعدة البيانات
      const { db, dbType } = await import('./database-adapter');
      if (db && dbType === 'postgresql') {
        const { rooms } = await import('../shared/schema');
        const { eq } = await import('drizzle-orm');
        await (db as any).update(rooms).set({ micQueue: JSON.stringify(micQueue) }).where(eq((rooms as any).id, roomId as any));
      } else if (db && dbType === 'sqlite') {
        (db as any).run?.("UPDATE rooms SET mic_queue = ? WHERE id = ?", [JSON.stringify(micQueue), roomId]);
      }
      
      console.log(`User ${userId} rejected from mic queue in room ${roomId} by ${rejectedBy}`);
      return true;
      
    } catch (error) {
      console.error('Error in rejectMicRequest:', error);
      return false;
    }
  },

  async removeSpeaker(roomId: string, userId: number, removedBy: number) {
    try {
      // استخدام الدالة المساعدة للتحقق
      const validation = await this.validateBroadcastRoom(roomId, removedBy);
      if (!validation.isValid) {
        return false;
      }
      
      const room = validation.room;
      
      // التحقق من أن المستخدم المراد إزالته ليس المضيف نفسه
      if ((room as any).hostId === userId) {
        console.log(`Cannot remove host ${userId} from speakers`);
        return false;
      }
      
      // جلب قائمة المتحدثين الحالية
      let speakers = this.parseSpeakers((room as any).speakers);
      
      // التحقق من وجود المستخدم في قائمة المتحدثين
      const speakerIndex = speakers.indexOf(userId);
      if (speakerIndex === -1) {
        console.log(`User ${userId} is not a speaker`);
        return false;
      }
      
      // إزالة المستخدم من قائمة المتحدثين
      speakers.splice(speakerIndex, 1);
      
      // تحديث قاعدة البيانات
      const { db, dbType } = await import('./database-adapter');
      if (db && dbType === 'postgresql') {
        const { rooms } = await import('../shared/schema');
        const { eq } = await import('drizzle-orm');
        await (db as any).update(rooms).set({ speakers: JSON.stringify(speakers) }).where(eq((rooms as any).id, roomId as any));
      } else if (db && dbType === 'sqlite') {
        (db as any).run?.("UPDATE rooms SET speakers = ? WHERE id = ?", [JSON.stringify(speakers), roomId]);
      }
      
      console.log(`User ${userId} removed from speakers in room ${roomId} by ${removedBy}`);
      return true;
      
    } catch (error) {
      console.error('Error in removeSpeaker:', error);
      return false;
    }
  },

  // Per-room moderation helpers (PostgreSQL only)
  async muteUserInRoom(roomId: string, targetUserId: number, minutes: number): Promise<boolean> {
    try {
      const { db, dbType } = await import('./database-adapter');
      if (db && dbType === 'postgresql') {
        const { roomMembers } = await import('../shared/schema');
        const { eq, and } = await import('drizzle-orm');
        await (db as any)
          .update((roomMembers as any))
          .set({ mutedUntil: new Date(Date.now() + minutes * 60000) } as any)
          .where(and(eq((roomMembers as any).roomId, roomId as any), eq((roomMembers as any).userId, targetUserId as any)));
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
          .update((roomMembers as any))
          .set({ mutedUntil: null } as any)
          .where(and(eq((roomMembers as any).roomId, roomId as any), eq((roomMembers as any).userId, targetUserId as any)));
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
          .update((roomMembers as any))
          .set({ bannedUntil: new Date(Date.now() + minutes * 60000) } as any)
          .where(and(eq((roomMembers as any).roomId, roomId as any), eq((roomMembers as any).userId, targetUserId as any)));
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
          .update((roomMembers as any))
          .set({ bannedUntil: null } as any)
          .where(and(eq((roomMembers as any).roomId, roomId as any), eq((roomMembers as any).userId, targetUserId as any)));
        return true;
      }
      return false;
    } catch (e) {
      console.error('unbanUserInRoom error:', e);
      return false;
    }
  }
};

// Export the database service for direct access if needed
export { databaseService };

// Default export is the storage object
export default storage;

// Public interface type for storage consumers
export type IStorage = typeof storage;