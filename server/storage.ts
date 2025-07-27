import {
  users,
  messages,
  friends,
  friendRequests,
  notifications,
  blockedDevices,
  pointsHistory,
  levelSettings,
  rooms,
  wallPosts,
  wallReactions,
  wallComments,
  moderationLog,
  reports,
  type User,
  type InsertUser,
  type Message,
  type InsertMessage,
  type Friend,
  type InsertFriend,
  type FriendRequest,
  type InsertFriendRequest,
  type Notification,
  type InsertNotification,
  type Room,
  type InsertRoom,
  type WallPost,
  type InsertWallPost,
  type WallReaction,
  type InsertWallReaction,
  type WallComment,
  type InsertWallComment,
  type ModerationLog,
  type InsertModerationLog,
  type Report,
  type InsertReport,
} from "../shared/schema";
import { db } from "./database-adapter";
import { eq, desc, and, sql, or, inArray, isNull, isNotNull } from "drizzle-orm";

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
  verifyUserCredentials(username: string, password: string): Promise<User | null>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getPublicMessages(limit?: number): Promise<Message[]>;
  getPrivateMessages(userId1: number, userId2: number, limit?: number): Promise<Message[]>;
  deleteMessage(messageId: number, userId: number): Promise<boolean>;
  markMessageAsRead(messageId: number): Promise<boolean>;

  // Friend operations
  addFriend(userId: number, friendId: number): Promise<Friend>;
  getFriends(userId: number): Promise<User[]>;
  getUserFriends(userId: number): Promise<User[]>;
  updateFriendStatus(userId: number, friendId: number, status: string): Promise<void>;
  getBlockedUsers(userId: number): Promise<User[]>;
  removeFriend(userId: number, friendId: number): Promise<boolean>;
  getFriendship(userId1: number, userId2: number): Promise<Friend | undefined>;
  
  // Friend request operations
  createFriendRequest(senderId: number, receiverId: number, message?: string): Promise<FriendRequest>;
  getFriendRequest(senderId: number, receiverId: number): Promise<FriendRequest | undefined>;
  getFriendRequestById(requestId: number): Promise<FriendRequest | undefined>;
  getIncomingFriendRequests(userId: number): Promise<FriendRequest[]>;
  getOutgoingFriendRequests(userId: number): Promise<FriendRequest[]>;
  acceptFriendRequest(requestId: number): Promise<boolean>;
  declineFriendRequest(requestId: number): Promise<boolean>;
  ignoreFriendRequest(requestId: number): Promise<boolean>;
  deleteFriendRequest(requestId: number): Promise<boolean>;
  
  // Room operations
  createRoom(roomData: InsertRoom): Promise<Room>;
  getRooms(): Promise<Room[]>;
  getRoom(roomId: string): Promise<Room | undefined>;
  updateRoom(roomId: string, updates: Partial<Room>): Promise<Room | undefined>;
  deleteRoom(roomId: string): Promise<boolean>;
  
  // Wall post operations
  createWallPost(postData: InsertWallPost): Promise<WallPost>;
  getWallPosts(type?: string, limit?: number): Promise<WallPost[]>;
  getWallPostsByUsers(userIds: number[]): Promise<WallPost[]>;
  getWallPost(postId: number): Promise<WallPost | undefined>;
  deleteWallPost(postId: number): Promise<void>;
  addWallPostReaction(reactionData: InsertWallReaction): Promise<WallReaction>;
  getWallPostWithReactions(postId: number): Promise<WallPost | null>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number, limit?: number): Promise<Notification[]>;
  markNotificationAsRead(notificationId: number): Promise<boolean>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  deleteNotification(notificationId: number): Promise<boolean>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  
  // Points and levels operations
  addPoints(userId: number, points: number, reason: string): Promise<void>;
  getPointsHistory(userId: number, limit?: number): Promise<any[]>;
  getLevelSettings(): Promise<any[]>;
  
  // Moderation operations
  createModerationLog(logData: InsertModerationLog): Promise<ModerationLog>;
  getModerationLog(limit?: number): Promise<ModerationLog[]>;
  
  // Report operations
  createReport(reportData: InsertReport): Promise<Report>;
  getReports(status?: string, limit?: number): Promise<Report[]>;
  updateReportStatus(reportId: number, status: string, reviewedBy: number): Promise<boolean>;
  
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
    try {
      if (!db) return undefined;
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      if (!db) return undefined;
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      if (!db) throw new Error('Database not connected');
      const [newUser] = await db.insert(users).values(user).returning();
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    try {
      if (!db) return undefined;
      const [updatedUser] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async setUserOnlineStatus(id: number, isOnline: boolean): Promise<void> {
    try {
      if (!db) return;
      await db.update(users).set({ 
        isOnline, 
        lastSeen: isOnline ? undefined : new Date() 
      }).where(eq(users.id, id));
    } catch (error) {
      console.error('Error setting user online status:', error);
    }
  }

  async setUserHiddenStatus(id: number, isHidden: boolean): Promise<void> {
    try {
      if (!db) return;
      await db.update(users).set({ isHidden }).where(eq(users.id, id));
    } catch (error) {
      console.error('Error setting user hidden status:', error);
    }
  }

  async addIgnoredUser(userId: number, ignoredUserId: number): Promise<void> {
    try {
      if (!db) return;
      const user = await this.getUser(userId);
      if (!user) return;
      
      const ignoredUsers = JSON.parse(user.ignoredUsers || '[]');
      if (!ignoredUsers.includes(ignoredUserId)) {
        ignoredUsers.push(ignoredUserId);
        await db.update(users).set({ ignoredUsers: JSON.stringify(ignoredUsers) }).where(eq(users.id, userId));
      }
    } catch (error) {
      console.error('Error adding ignored user:', error);
    }
  }

  async removeIgnoredUser(userId: number, ignoredUserId: number): Promise<void> {
    try {
      if (!db) return;
      const user = await this.getUser(userId);
      if (!user) return;
      
      const ignoredUsers = JSON.parse(user.ignoredUsers || '[]');
      const filteredIgnored = ignoredUsers.filter((id: number) => id !== ignoredUserId);
      await db.update(users).set({ ignoredUsers: JSON.stringify(filteredIgnored) }).where(eq(users.id, userId));
    } catch (error) {
      console.error('Error removing ignored user:', error);
    }
  }

  async getIgnoredUsers(userId: number): Promise<number[]> {
    try {
      if (!db) return [];
      const user = await this.getUser(userId);
      return user ? JSON.parse(user.ignoredUsers || '[]') : [];
    } catch (error) {
      console.error('Error getting ignored users:', error);
      return [];
    }
  }

  async getOnlineUsers(): Promise<User[]> {
    try {
      if (!db) return [];
      return await db.select().from(users).where(eq(users.isOnline, true));
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      if (!db) return [];
      return await db.select().from(users).orderBy(desc(users.createdAt));
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async verifyUserCredentials(username: string, password: string): Promise<User | null> {
    try {
      if (!db) return null;
      const user = await this.getUserByUsername(username);
      if (!user || !user.password) return null;
      
      const bcrypt = await import('bcrypt');
      const isValid = await bcrypt.compare(password, user.password);
      return isValid ? user : null;
    } catch (error) {
      console.error('Error verifying user credentials:', error);
      return null;
    }
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    try {
      if (!db) throw new Error('Database not connected');
      const [newMessage] = await db.insert(messages).values(message).returning();
      return newMessage;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  async getPublicMessages(limit: number = 50): Promise<Message[]> {
    try {
      if (!db) return [];
      return await db.select().from(messages)
        .where(isNull(messages.receiverId))
        .orderBy(desc(messages.timestamp))
        .limit(limit);
    } catch (error) {
      console.error('Error getting public messages:', error);
      return [];
    }
  }

  async getPrivateMessages(userId1: number, userId2: number, limit: number = 50): Promise<Message[]> {
    try {
      if (!db) return [];
      return await db.select().from(messages)
        .where(
          and(
            isNotNull(messages.receiverId),
            or(
              and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
              and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
            )
          )
        )
        .orderBy(desc(messages.timestamp))
        .limit(limit);
    } catch (error) {
      console.error('Error getting private messages:', error);
      return [];
    }
  }

  async deleteMessage(messageId: number, userId: number): Promise<boolean> {
    try {
      if (!db) return false;
      const result = await db.delete(messages)
        .where(and(eq(messages.id, messageId), eq(messages.senderId, userId)));
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  async markMessageAsRead(messageId: number): Promise<boolean> {
    try {
      if (!db) return false;
      await db.update(messages).set({ isRead: true }).where(eq(messages.id, messageId));
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }

  // Friend operations
  async addFriend(userId: number, friendId: number): Promise<Friend> {
    try {
      if (!db) throw new Error('Database not connected');
      const [newFriend] = await db.insert(friends).values({
        userId,
        friendId,
        status: 'accepted'
      }).returning();
      return newFriend;
    } catch (error) {
      console.error('Error adding friend:', error);
      throw error;
    }
  }

  async getFriends(userId: number): Promise<User[]> {
    try {
      if (!db) return [];
      const friendships = await db.select().from(friends)
        .where(and(eq(friends.userId, userId), eq(friends.status, 'accepted')));
      
      const friendIds = friendships.map(f => f.friendId);
      if (friendIds.length === 0) return [];
      
      return await db.select().from(users).where(inArray(users.id, friendIds));
    } catch (error) {
      console.error('Error getting friends:', error);
      return [];
    }
  }

  async getUserFriends(userId: number): Promise<User[]> {
    return this.getFriends(userId);
  }

  async updateFriendStatus(userId: number, friendId: number, status: string): Promise<void> {
    try {
      if (!db) return;
      await db.update(friends).set({ status }).where(
        and(eq(friends.userId, userId), eq(friends.friendId, friendId))
      );
    } catch (error) {
      console.error('Error updating friend status:', error);
    }
  }

  async getBlockedUsers(userId: number): Promise<User[]> {
    try {
      if (!db) return [];
      const blockedFriendships = await db.select().from(friends)
        .where(and(eq(friends.userId, userId), eq(friends.status, 'blocked')));
      
      const blockedIds = blockedFriendships.map(f => f.friendId);
      if (blockedIds.length === 0) return [];
      
      return await db.select().from(users).where(inArray(users.id, blockedIds));
    } catch (error) {
      console.error('Error getting blocked users:', error);
      return [];
    }
  }

  async removeFriend(userId: number, friendId: number): Promise<boolean> {
    try {
      if (!db) return false;
      await db.delete(friends).where(
        and(eq(friends.userId, userId), eq(friends.friendId, friendId))
      );
      return true;
    } catch (error) {
      console.error('Error removing friend:', error);
      return false;
    }
  }

  async getFriendship(userId1: number, userId2: number): Promise<Friend | undefined> {
    try {
      if (!db) return undefined;
      const result = await db.select().from(friends)
        .where(
          or(
            and(eq(friends.userId, userId1), eq(friends.friendId, userId2)),
            and(eq(friends.userId, userId2), eq(friends.friendId, userId1))
          )
        )
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting friendship:', error);
      return undefined;
    }
  }

  // Friend request operations
  async createFriendRequest(senderId: number, receiverId: number, message?: string): Promise<FriendRequest> {
    try {
      if (!db) throw new Error('Database not connected');
      const [newRequest] = await db.insert(friendRequests).values({
        senderId,
        receiverId,
        message,
        status: 'pending'
      }).returning();
      return newRequest;
    } catch (error) {
      console.error('Error creating friend request:', error);
      throw error;
    }
  }

  async getFriendRequest(senderId: number, receiverId: number): Promise<FriendRequest | undefined> {
    try {
      if (!db) return undefined;
      const result = await db.select().from(friendRequests)
        .where(and(eq(friendRequests.senderId, senderId), eq(friendRequests.receiverId, receiverId)))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting friend request:', error);
      return undefined;
    }
  }

  async getFriendRequestById(requestId: number): Promise<FriendRequest | undefined> {
    try {
      if (!db) return undefined;
      const result = await db.select().from(friendRequests).where(eq(friendRequests.id, requestId)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting friend request by ID:', error);
      return undefined;
    }
  }

  async getIncomingFriendRequests(userId: number): Promise<FriendRequest[]> {
    try {
      if (!db) return [];
      return await db.select().from(friendRequests)
        .where(and(eq(friendRequests.receiverId, userId), eq(friendRequests.status, 'pending')))
        .orderBy(desc(friendRequests.createdAt));
    } catch (error) {
      console.error('Error getting incoming friend requests:', error);
      return [];
    }
  }

  async getOutgoingFriendRequests(userId: number): Promise<FriendRequest[]> {
    try {
      if (!db) return [];
      return await db.select().from(friendRequests)
        .where(and(eq(friendRequests.senderId, userId), eq(friendRequests.status, 'pending')))
        .orderBy(desc(friendRequests.createdAt));
    } catch (error) {
      console.error('Error getting outgoing friend requests:', error);
      return [];
    }
  }

  async acceptFriendRequest(requestId: number): Promise<boolean> {
    try {
      if (!db) return false;
      const request = await this.getFriendRequestById(requestId);
      if (!request) return false;
      
      await db.update(friendRequests).set({ status: 'accepted' }).where(eq(friendRequests.id, requestId));
      await this.addFriend(request.receiverId, request.senderId);
      return true;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return false;
    }
  }

  async declineFriendRequest(requestId: number): Promise<boolean> {
    try {
      if (!db) return false;
      await db.update(friendRequests).set({ status: 'declined' }).where(eq(friendRequests.id, requestId));
      return true;
    } catch (error) {
      console.error('Error declining friend request:', error);
      return false;
    }
  }

  async ignoreFriendRequest(requestId: number): Promise<boolean> {
    try {
      if (!db) return false;
      await db.update(friendRequests).set({ status: 'ignored' }).where(eq(friendRequests.id, requestId));
      return true;
    } catch (error) {
      console.error('Error ignoring friend request:', error);
      return false;
    }
  }

  async deleteFriendRequest(requestId: number): Promise<boolean> {
    try {
      if (!db) return false;
      await db.delete(friendRequests).where(eq(friendRequests.id, requestId));
      return true;
    } catch (error) {
      console.error('Error deleting friend request:', error);
      return false;
    }
  }

  // Room operations
  async createRoom(roomData: InsertRoom): Promise<Room> {
    try {
      if (!db) throw new Error('Database not connected');
      const [newRoom] = await db.insert(rooms).values(roomData).returning();
      return newRoom;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  async getRooms(): Promise<Room[]> {
    try {
      if (!db) return [];
      return await db.select().from(rooms).where(eq(rooms.isActive, true)).orderBy(desc(rooms.createdAt));
    } catch (error) {
      console.error('Error getting rooms:', error);
      return [];
    }
  }

  async getRoom(roomId: string): Promise<Room | undefined> {
    try {
      if (!db) return undefined;
      const result = await db.select().from(rooms).where(eq(rooms.id, parseInt(roomId))).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting room:', error);
      return undefined;
    }
  }

  async updateRoom(roomId: string, updates: Partial<Room>): Promise<Room | undefined> {
    try {
      if (!db) return undefined;
      const [updatedRoom] = await db.update(rooms).set(updates).where(eq(rooms.id, parseInt(roomId))).returning();
      return updatedRoom;
    } catch (error) {
      console.error('Error updating room:', error);
      return undefined;
    }
  }

  async deleteRoom(roomId: string): Promise<boolean> {
    try {
      if (!db) return false;
      await db.update(rooms).set({ isActive: false }).where(eq(rooms.id, parseInt(roomId)));
      return true;
    } catch (error) {
      console.error('Error deleting room:', error);
      return false;
    }
  }

  // Wall post operations
  async createWallPost(postData: InsertWallPost): Promise<WallPost> {
    try {
      if (!db) throw new Error('Database not connected');
      const [newPost] = await db.insert(wallPosts).values(postData).returning();
      return newPost;
    } catch (error) {
      console.error('Error creating wall post:', error);
      throw error;
    }
  }

  async getWallPosts(type?: string, limit: number = 50): Promise<WallPost[]> {
    try {
      if (!db) return [];
      let query = db.select().from(wallPosts).where(eq(wallPosts.isActive, true));
      if (type) {
        query = query.where(eq(wallPosts.type, type));
      }
      return await query.orderBy(desc(wallPosts.createdAt)).limit(limit);
    } catch (error) {
      console.error('Error getting wall posts:', error);
      return [];
    }
  }

  async getWallPostsByUsers(userIds: number[]): Promise<WallPost[]> {
    try {
      if (!db || userIds.length === 0) return [];
      return await db.select().from(wallPosts)
        .where(and(eq(wallPosts.isActive, true), inArray(wallPosts.userId, userIds)))
        .orderBy(desc(wallPosts.createdAt));
    } catch (error) {
      console.error('Error getting wall posts by users:', error);
      return [];
    }
  }

  async getWallPost(postId: number): Promise<WallPost | undefined> {
    try {
      if (!db) return undefined;
      const result = await db.select().from(wallPosts).where(eq(wallPosts.id, postId)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting wall post:', error);
      return undefined;
    }
  }

  async deleteWallPost(postId: number): Promise<void> {
    try {
      if (!db) return;
      await db.update(wallPosts).set({ isActive: false }).where(eq(wallPosts.id, postId));
    } catch (error) {
      console.error('Error deleting wall post:', error);
    }
  }

  async addWallPostReaction(reactionData: InsertWallReaction): Promise<WallReaction> {
    try {
      if (!db) throw new Error('Database not connected');
      const [newReaction] = await db.insert(wallReactions).values(reactionData).returning();
      return newReaction;
    } catch (error) {
      console.error('Error adding wall post reaction:', error);
      throw error;
    }
  }

  async getWallPostWithReactions(postId: number): Promise<WallPost | null> {
    try {
      if (!db) return null;
      const post = await this.getWallPost(postId);
      if (!post) return null;
      
      // يمكن إضافة جلب التفاعلات هنا إذا لزم الأمر
      return post;
    } catch (error) {
      console.error('Error getting wall post with reactions:', error);
      return null;
    }
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      if (!db) throw new Error('Database not connected');
      const [newNotification] = await db.insert(notifications).values(notification).returning();
      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async getUserNotifications(userId: number, limit: number = 20): Promise<Notification[]> {
    try {
      if (!db) return [];
      return await db.select().from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: number): Promise<boolean> {
    try {
      if (!db) return false;
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, notificationId));
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    try {
      if (!db) return false;
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  async deleteNotification(notificationId: number): Promise<boolean> {
    try {
      if (!db) return false;
      await db.delete(notifications).where(eq(notifications.id, notificationId));
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    try {
      if (!db) return 0;
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  // Points and levels operations
  async addPoints(userId: number, points: number, reason: string): Promise<void> {
    try {
      if (!db) return;
      
      // إضافة النقاط للمستخدم
      await db.update(users).set({
        points: sql`${users.points} + ${points}`,
        totalPoints: sql`${users.totalPoints} + ${points}`
      }).where(eq(users.id, userId));
      
      // تسجيل في التاريخ
      await db.insert(pointsHistory).values({
        userId,
        points,
        reason,
        action: points > 0 ? 'earn' : 'lose'
      });
    } catch (error) {
      console.error('Error adding points:', error);
    }
  }

  async getPointsHistory(userId: number, limit: number = 50): Promise<any[]> {
    try {
      if (!db) return [];
      return await db.select().from(pointsHistory)
        .where(eq(pointsHistory.userId, userId))
        .orderBy(desc(pointsHistory.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Error getting points history:', error);
      return [];
    }
  }

  async getLevelSettings(): Promise<any[]> {
    try {
      if (!db) return [];
      return await db.select().from(levelSettings).orderBy(levelSettings.level);
    } catch (error) {
      console.error('Error getting level settings:', error);
      return [];
    }
  }

  // Moderation operations
  async createModerationLog(logData: InsertModerationLog): Promise<ModerationLog> {
    try {
      if (!db) throw new Error('Database not connected');
      const [newLog] = await db.insert(moderationLog).values(logData).returning();
      return newLog;
    } catch (error) {
      console.error('Error creating moderation log:', error);
      throw error;
    }
  }

  async getModerationLog(limit: number = 100): Promise<ModerationLog[]> {
    try {
      if (!db) return [];
      return await db.select().from(moderationLog)
        .orderBy(desc(moderationLog.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Error getting moderation log:', error);
      return [];
    }
  }

  // Report operations
  async createReport(reportData: InsertReport): Promise<Report> {
    try {
      if (!db) throw new Error('Database not connected');
      const [newReport] = await db.insert(reports).values(reportData).returning();
      return newReport;
    } catch (error) {
      console.error('Error creating report:', error);
      throw error;
    }
  }

  async getReports(status?: string, limit: number = 100): Promise<Report[]> {
    try {
      if (!db) return [];
      let query = db.select().from(reports);
      if (status) {
        query = query.where(eq(reports.status, status));
      }
      return await query.orderBy(desc(reports.createdAt)).limit(limit);
    } catch (error) {
      console.error('Error getting reports:', error);
      return [];
    }
  }

  async updateReportStatus(reportId: number, status: string, reviewedBy: number): Promise<boolean> {
    try {
      if (!db) return false;
      await db.update(reports).set({
        status,
        reviewedBy,
        reviewedAt: new Date()
      }).where(eq(reports.id, reportId));
      return true;
    } catch (error) {
      console.error('Error updating report status:', error);
      return false;
    }
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
    try {
      if (!db) return false;
      await db.insert(blockedDevices).values(blockData);
      return true;
    } catch (error) {
      console.error('Error creating blocked device:', error);
      return false;
    }
  }

  async isDeviceBlocked(ipAddress: string, deviceId: string): Promise<boolean> {
    try {
      if (!db) return false;
      const result = await db.select().from(blockedDevices)
        .where(and(eq(blockedDevices.ipAddress, ipAddress), eq(blockedDevices.deviceId, deviceId)))
        .limit(1);
      return result.length > 0;
    } catch (error) {
      console.error('Error checking if device is blocked:', error);
      return false;
    }
  }

  async getBlockedDevices(): Promise<Array<{ipAddress: string, deviceId: string}>> {
    try {
      if (!db) return [];
      const result = await db.select({ ipAddress: blockedDevices.ipAddress, deviceId: blockedDevices.deviceId })
        .from(blockedDevices);
      return result;
    } catch (error) {
      console.error('Error getting blocked devices:', error);
      return [];
    }
  }
}

// إنشاء نسخة من التخزين
export const storage = new PostgreSQLStorage();