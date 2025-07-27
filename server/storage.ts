import {
  users,
  messages,
  friends,
  notifications,
  blockedDevices,
  pointsHistory,
  levelSettings,
  type User,
  type InsertUser,
  type Message,
  type InsertMessage,
  type Friend,
  type InsertFriend,
  type Notification,
  type InsertNotification,
} from "../shared/schema";
import { db } from "./database-adapter";
import { eq, desc, and, sql, or, inArray } from "drizzle-orm";

// Global in-memory storage for wall posts
declare global {
  var wallPosts: any[] | undefined;
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  setUserOnlineStatus(id: number, isOnline: boolean): Promise<void>;
  setUserHiddenStatus(id: number, isHidden: boolean): Promise<void>;
  addIgnoredUser(userId: number, ignoredUserId: number): Promise<void>;
  removeIgnoredUser(userId: number, ignoredUserId: number): Promise<void>;
  getIgnoredUsers(userId: number): Promise<number[]>;
  getOnlineUsers(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getPublicMessages(limit?: number): Promise<Message[]>;
  getPrivateMessages(userId1: number, userId2: number, limit?: number): Promise<Message[]>;

  // Friend operations
  addFriend(userId: number, friendId: number): Promise<Friend>;
  getFriends(userId: number): Promise<User[]>;
  getUserFriends(userId: number): Promise<User[]>;
  updateFriendStatus(userId: number, friendId: number, status: string): Promise<void>;
  getBlockedUsers(userId: number): Promise<User[]>;
  removeFriend(userId: number, friendId: number): Promise<boolean>;
  getFriendship(userId1: number, userId2: number): Promise<Friend | undefined>;
  
  // Friend request operations
  createFriendRequest(senderId: number, receiverId: number): Promise<any>;
  getFriendRequest(senderId: number, receiverId: number): Promise<any>;
  getFriendRequestById(requestId: number): Promise<any>;
  getIncomingFriendRequests(userId: number): Promise<any[]>;
  getOutgoingFriendRequests(userId: number): Promise<any[]>;
  acceptFriendRequest(requestId: number): Promise<boolean>;
  declineFriendRequest(requestId: number): Promise<boolean>;
  ignoreFriendRequest(requestId: number): Promise<boolean>;
  deleteFriendRequest(requestId: number): Promise<boolean>;
  
  // Wall post operations
  createWallPost(postData: any): Promise<any>;
  getWallPosts(type: string): Promise<any[]>;
  getWallPostsByUsers(userIds: number[]): Promise<any[]>;
  getWallPost(postId: number): Promise<any>;
  deleteWallPost(postId: number): Promise<void>;
  addWallPostReaction(reactionData: any): Promise<any>;
  getWallPostWithReactions(postId: number): Promise<any | null>;
  
  // Room operations
  getRoom(roomId: string): Promise<any>;
  getBroadcastRoomInfo(roomId: string): Promise<any>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number, limit?: number): Promise<Notification[]>;
  markNotificationAsRead(notificationId: number): Promise<boolean>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  deleteNotification(notificationId: number): Promise<boolean>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  
  // Blocked devices operations
  createBlockedDevice(blockData: {
    ipAddress: string;
    deviceId: string;
    userId: number;
    reason: string;
    blockedAt: Date;
    blockedBy: number;
  }): Promise<boolean>;
  isDeviceBlocked(ipAddress: string, deviceId: string): Promise<boolean>;
  getBlockedDevices(): Promise<Array<{ipAddress: string, deviceId: string}>>;
}

export class PostgreSQLStorage implements IStorage {
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async setUserOnlineStatus(id: number, isOnline: boolean): Promise<void> {
    await db.update(users)
      .set({ 
        isOnline,
        lastSeen: new Date()
      })
      .where(eq(users.id, id));
  }

  async setUserHiddenStatus(id: number, isHidden: boolean): Promise<void> {
    await db.update(users)
      .set({ isHidden })
      .where(eq(users.id, id));
  }

  async addIgnoredUser(userId: number, ignoredUserId: number): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      const ignoredUsers = JSON.parse(user.ignoredUsers || '[]');
      if (!ignoredUsers.includes(ignoredUserId)) {
        ignoredUsers.push(ignoredUserId);
        await this.updateUser(userId, { ignoredUsers: JSON.stringify(ignoredUsers) });
      }
    }
  }

  async removeIgnoredUser(userId: number, ignoredUserId: number): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      const ignoredUsers = JSON.parse(user.ignoredUsers || '[]');
      const filteredUsers = ignoredUsers.filter((id: number) => id !== ignoredUserId);
      await this.updateUser(userId, { ignoredUsers: JSON.stringify(filteredUsers) });
    }
  }

  async getIgnoredUsers(userId: number): Promise<number[]> {
    const user = await this.getUser(userId);
    return user ? JSON.parse(user.ignoredUsers || '[]') : [];
  }

  async getOnlineUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isOnline, true));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }

  async getPublicMessages(limit: number = 50): Promise<Message[]> {
    return await db.select()
      .from(messages)
      .where(eq(messages.isPrivate, false))
      .orderBy(desc(messages.timestamp))
      .limit(limit);
  }

  async getPrivateMessages(userId1: number, userId2: number, limit: number = 50): Promise<Message[]> {
    return await db.select()
      .from(messages)
      .where(
        and(
          eq(messages.isPrivate, true),
          or(
            and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
            and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
          )
        )
      )
      .orderBy(desc(messages.timestamp))
      .limit(limit);
  }

  // Friend operations
  async addFriend(userId: number, friendId: number): Promise<Friend> {
    const result = await db.insert(friends).values({
      userId,
      friendId,
      status: 'pending'
    }).returning();
    return result[0];
  }

  async getFriends(userId: number): Promise<User[]> {
    const friendsResult = await db.select()
      .from(friends)
      .leftJoin(users, eq(friends.friendId, users.id))
      .where(and(eq(friends.userId, userId), eq(friends.status, 'accepted')));
    
    return friendsResult.map(f => f.users!).filter(Boolean);
  }

  async getUserFriends(userId: number): Promise<User[]> {
    const friendsResult = await db.select()
      .from(friends)
      .leftJoin(users, eq(friends.userId, users.id))
      .where(and(eq(friends.friendId, userId), eq(friends.status, 'accepted')));
    
    return friendsResult.map(f => f.users!).filter(Boolean);
  }

  async updateFriendStatus(userId: number, friendId: number, status: string): Promise<void> {
    await db.update(friends)
      .set({ status })
      .where(and(eq(friends.userId, userId), eq(friends.friendId, friendId)));
  }

  async getBlockedUsers(userId: number): Promise<User[]> {
    const blockedResult = await db.select()
      .from(friends)
      .leftJoin(users, eq(friends.friendId, users.id))
      .where(and(eq(friends.userId, userId), eq(friends.status, 'blocked')));
    
    return blockedResult.map(f => f.users!).filter(Boolean);
  }

  async removeFriend(userId: number, friendId: number): Promise<boolean> {
    const result = await db.delete(friends)
      .where(and(eq(friends.userId, userId), eq(friends.friendId, friendId)));
    return true;
  }

  async getFriendship(userId1: number, userId2: number): Promise<Friend | undefined> {
    const result = await db.select()
      .from(friends)
      .where(
        or(
          and(eq(friends.userId, userId1), eq(friends.friendId, userId2)),
          and(eq(friends.userId, userId2), eq(friends.friendId, userId1))
        )
      );
    return result[0];
  }

  // Friend request operations
  async createFriendRequest(senderId: number, receiverId: number): Promise<any> {
    const result = await db.insert(friends).values({
      userId: senderId,
      friendId: receiverId,
      status: 'pending'
    }).returning();
    return result[0];
  }

  async getFriendRequest(senderId: number, receiverId: number): Promise<any> {
    const result = await db.select()
      .from(friends)
      .where(
        and(
          eq(friends.userId, senderId),
          eq(friends.friendId, receiverId),
          eq(friends.status, 'pending')
        )
      );
    return result[0];
  }

  async getFriendRequestById(requestId: number): Promise<any> {
    const result = await db.select()
      .from(friends)
      .where(eq(friends.id, requestId));
    return result[0];
  }

  async getIncomingFriendRequests(userId: number): Promise<any[]> {
    const result = await db.select()
      .from(friends)
      .leftJoin(users, eq(friends.userId, users.id))
      .where(and(eq(friends.friendId, userId), eq(friends.status, 'pending')));
    return result.map(f => f.users!).filter(Boolean);
  }

  async getOutgoingFriendRequests(userId: number): Promise<any[]> {
    const result = await db.select()
      .from(friends)
      .leftJoin(users, eq(friends.friendId, users.id))
      .where(and(eq(friends.userId, userId), eq(friends.status, 'pending')));
    return result.map(f => f.users!).filter(Boolean);
  }

  async acceptFriendRequest(requestId: number): Promise<boolean> {
    const result = await db.update(friends)
      .set({ status: 'accepted' })
      .where(eq(friends.id, requestId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async declineFriendRequest(requestId: number): Promise<boolean> {
    const result = await db.update(friends)
      .set({ status: 'declined' })
      .where(eq(friends.id, requestId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async ignoreFriendRequest(requestId: number): Promise<boolean> {
    const result = await db.update(friends)
      .set({ status: 'ignored' })
      .where(eq(friends.id, requestId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async deleteFriendRequest(requestId: number): Promise<boolean> {
    const result = await db.delete(friends).where(eq(friends.id, requestId));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  
  // Wall post operations
  async createWallPost(postData: any): Promise<any> {
    try {
      const post = {
        id: Date.now(), // معرف مؤقت
        ...postData,
        reactions: [],
        totalLikes: 0,
        totalDislikes: 0,
        totalHearts: 0
      };
      
      // حفظ في الذاكرة المؤقتة
      if (!global.wallPosts) {
        global.wallPosts = [];
      }
      global.wallPosts.unshift(post);
      
      return post;
    } catch (error) {
      console.error('Error creating wall post:', error);
      throw error;
    }
  }

  async getWallPosts(type: string): Promise<any[]> {
    try {
      if (!global.wallPosts) {
        global.wallPosts = [];
      }
      
      return global.wallPosts
        .filter(post => post.type === type)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Error getting wall posts:', error);
      return [];
    }
  }

  async getWallPostsByUsers(userIds: number[]): Promise<any[]> {
    try {
      if (!global.wallPosts) {
        global.wallPosts = [];
      }
      
      return global.wallPosts
        .filter(post => userIds.includes(post.userId))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Error getting wall posts by users:', error);
      return [];
    }
  }

  async getWallPost(postId: number): Promise<any> {
    try {
      if (!global.wallPosts) {
        global.wallPosts = [];
      }
      
      return global.wallPosts.find(post => post.id === postId) || null;
    } catch (error) {
      console.error('Error getting wall post:', error);
      return null;
    }
  }

  async deleteWallPost(postId: number): Promise<void> {
    try {
      if (!global.wallPosts) {
        global.wallPosts = [];
      }
      
      global.wallPosts = global.wallPosts.filter(post => post.id !== postId);
    } catch (error) {
      console.error('Error deleting wall post:', error);
    }
  }

  async addWallPostReaction(reactionData: any): Promise<any> {
    try {
      if (!global.wallPosts) {
        global.wallPosts = [];
      }
      
      const postIndex = global.wallPosts.findIndex(post => post.id === reactionData.postId);
      if (postIndex === -1) {
        throw new Error('Post not found');
      }
      
      const post = global.wallPosts[postIndex];
      if (!post.reactions) {
        post.reactions = [];
      }
      
      // إزالة التفاعل السابق للمستخدم إذا كان موجوداً
      post.reactions = post.reactions.filter((r: any) => r.userId !== reactionData.userId);
      
      // إضافة التفاعل الجديد
      post.reactions.push(reactionData);
      
      // تحديث عدادات التفاعل
      post.totalLikes = post.reactions.filter((r: any) => r.type === 'like').length;
      post.totalDislikes = post.reactions.filter((r: any) => r.type === 'dislike').length;
      post.totalHearts = post.reactions.filter((r: any) => r.type === 'heart').length;
      
      return post;
    } catch (error) {
      console.error('Error adding wall post reaction:', error);
      throw error;
    }
  }

  async getWallPostWithReactions(postId: number): Promise<any | null> {
    try {
      return await this.getWallPost(postId);
    } catch (error) {
      console.error('Error getting wall post with reactions:', error);
      return null;
    }
  }

  // Room operations
  async getRoom(roomId: string): Promise<any> {
    // For now, returning predefined rooms
    const predefinedRooms = {
      'general': { id: 'general', name: 'الدردشة العامة', is_broadcast: false },
      'broadcast': { id: 'broadcast', name: 'غرفة البث المباشر', is_broadcast: true },
      'music': { id: 'music', name: 'أغاني وسهر', is_broadcast: false }
    };
    return predefinedRooms[roomId as keyof typeof predefinedRooms] || null;
  }

  async getBroadcastRoomInfo(roomId: string): Promise<any> {
    const room = await this.getRoom(roomId);
    if (!room || !room.is_broadcast) {
      return null;
    }
    
    // Return basic broadcast room info
    return {
      roomId: roomId,
      hostId: 1, // Default host
      speakers: [],
      micQueue: [],
      isLive: false
    };
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values(notification).returning();
    return result[0];
  }

  async getUserNotifications(userId: number, limit: number = 20): Promise<Notification[]> {
    return await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async markNotificationAsRead(notificationId: number): Promise<boolean> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
    return true;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
    return true;
  }

  async deleteNotification(notificationId: number): Promise<boolean> {
    await db.delete(notifications).where(eq(notifications.id, notificationId));
    return true;
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const result = await db.select({ count: sql`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return Number(result[0]?.count || 0);
  }

  // Blocked devices operations
  async createBlockedDevice(blockData: {
    ipAddress: string;
    deviceId: string;
    userId: number;
    reason: string;
    blockedAt: Date;
    blockedBy: number;
  }): Promise<boolean> {
    await db.insert(blockedDevices).values(blockData);
    return true;
  }

  async isDeviceBlocked(ipAddress: string, deviceId: string): Promise<boolean> {
    const result = await db.select()
      .from(blockedDevices)
      .where(
        or(
          eq(blockedDevices.ipAddress, ipAddress),
          eq(blockedDevices.deviceId, deviceId)
        )
      );
    return result.length > 0;
  }

  async getBlockedDevices(): Promise<Array<{ipAddress: string, deviceId: string}>> {
    const result = await db.select({
      ipAddress: blockedDevices.ipAddress,
      deviceId: blockedDevices.deviceId
    }).from(blockedDevices);
    return result;
  }
}

// Export instance
export const storage = new PostgreSQLStorage();