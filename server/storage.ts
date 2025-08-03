import {
  users,
  messages,
  friends,
  notifications,
  blockedDevices,
  pointsHistory,
  levelSettings,
  rooms,
  roomUsers,
  wallPosts,
  wallReactions,
  type User,
  type InsertUser,
  type Message,
  type InsertMessage,
  type Friend,
  type InsertFriend,
  type Notification,
  type InsertNotification,
  type WallPost,
  type InsertWallPost,
  type WallReaction,
  type InsertWallReaction,
} from "../shared/schema";
import { db } from "./database-adapter";
import { eq, desc, asc, and, sql, or, inArray } from "drizzle-orm";

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
  getRoomMessages(roomId: string, limit?: number): Promise<Message[]>;

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
  getAllRooms(): Promise<any[]>;
  createRoom(roomData: any): Promise<any>;
  deleteRoom(roomId: string): Promise<void>;
  joinRoom(userId: number, roomId: string): Promise<void>;
  leaveRoom(userId: number, roomId: string): Promise<void>;
  getUserRooms(userId: number): Promise<string[]>;
  getRoomUsers(roomId: string): Promise<number[]>;
  
  // Broadcast Room operations
  requestMic(userId: number, roomId: string): Promise<boolean>;
  approveMicRequest(roomId: string, userId: number, approvedBy: number): Promise<boolean>;
  rejectMicRequest(roomId: string, userId: number, rejectedBy: number): Promise<boolean>;
  removeSpeaker(roomId: string, userId: number, removedBy: number): Promise<boolean>;
  
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
  
  // Points system operations
  updateUserPoints(userId: number, updates: { points?: number; level?: number; totalPoints?: number; levelProgress?: number }): Promise<void>;
  addPointsHistory(userId: number, points: number, reason: string, action: 'earn' | 'spend'): Promise<void>;
  getUserLastDailyLogin(userId: number): Promise<string | null>;
  updateUserLastDailyLogin(userId: number, dateString: string): Promise<void>;
  getPointsHistory(userId: number, limit?: number): Promise<any[]>;
  getTopUsersByPoints(limit?: number): Promise<User[]>;
  getUserMessageCount(userId: number): Promise<number>;
}

export class PostgreSQLStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    if (!db) return undefined;
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) return undefined;
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
    
    // التأكد من وجود الحقول المطلوبة
    if (!user.username) {
      throw new Error("اسم المستخدم مطلوب");
    }
    
    const [newUser] = await db.insert(users).values({
      username: user.username,
      password: user.password,
      userType: user.userType || 'guest',
      role: user.role || 'guest',
      profileImage: user.profileImage,
      profileBanner: user.profileBanner,
      profileBackgroundColor: user.profileBackgroundColor || '#3c0d0d',
      status: user.status,
      gender: user.gender,
      age: user.age,
      country: user.country,
      relation: user.relation,
      bio: user.bio,
      isOnline: user.isOnline || false,
      isHidden: user.isHidden || false,
      lastSeen: user.lastSeen,
      isMuted: user.isMuted || false,
      muteExpiry: user.muteExpiry,
      isBanned: user.isBanned || false,
      banExpiry: user.banExpiry,
      isBlocked: user.isBlocked || false,
      ipAddress: user.ipAddress,
      deviceId: user.deviceId,
      ignoredUsers: user.ignoredUsers || '[]',
      usernameColor: user.usernameColor || '#FFFFFF',
      userTheme: user.userTheme || 'default',
      profileEffect: user.profileEffect || 'none',
      points: user.points || 0,
      level: user.level || 1,
      totalPoints: user.totalPoints || 0,
      levelProgress: user.levelProgress || 0,
    }).returning();
    return newUser;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    if (!db) return undefined;
    const [updatedUser] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updatedUser;
  }

  async setUserOnlineStatus(id: number, isOnline: boolean): Promise<void> {
    if (!db) return;
    await db.update(users).set({ isOnline }).where(eq(users.id, id));
  }

  async setUserHiddenStatus(id: number, isHidden: boolean): Promise<void> {
    if (!db) return;
    await db.update(users).set({ isHidden }).where(eq(users.id, id));
  }

  async addIgnoredUser(userId: number, ignoredUserId: number): Promise<void> {
    if (!db) return;
    const user = await this.getUser(userId);
    if (!user) return;
    
    const ignoredUsers = JSON.parse(user.ignoredUsers || '[]');
    if (!ignoredUsers.includes(ignoredUserId)) {
      ignoredUsers.push(ignoredUserId);
      await db.update(users).set({ ignoredUsers: JSON.stringify(ignoredUsers) }).where(eq(users.id, userId));
    }
  }

  async removeIgnoredUser(userId: number, ignoredUserId: number): Promise<void> {
    if (!db) return;
    const user = await this.getUser(userId);
    if (!user) return;
    
    const ignoredUsers = JSON.parse(user.ignoredUsers || '[]');
    const filteredUsers = ignoredUsers.filter((id: number) => id !== ignoredUserId);
    await db.update(users).set({ ignoredUsers: JSON.stringify(filteredUsers) }).where(eq(users.id, userId));
  }

  async getIgnoredUsers(userId: number): Promise<number[]> {
    if (!db) return [];
    const user = await this.getUser(userId);
    if (!user) return [];
    return JSON.parse(user.ignoredUsers || '[]');
  }

  async getOnlineUsers(): Promise<User[]> {
    if (!db) return [];
    return await db.select().from(users).where(eq(users.isOnline, true));
  }

  async getAllUsers(): Promise<User[]> {
    if (!db) return [];
    return await db.select().from(users);
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
    
    // التأكد من وجود الحقول المطلوبة
    if (!message.content) {
      throw new Error("محتوى الرسالة مطلوب");
    }
    
    const [newMessage] = await db.insert(messages).values({
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      messageType: message.messageType || 'text',
      isPrivate: message.isPrivate || false,
      roomId: message.roomId || 'general',
    }).returning();
    return newMessage;
  }

  async getPublicMessages(limit: number = 50): Promise<Message[]> {
    if (!db) return [];
    return await db.select().from(messages).where(eq(messages.isPrivate, false)).orderBy(desc(messages.timestamp)).limit(limit);
  }

  async getPrivateMessages(userId1: number, userId2: number, limit: number = 50): Promise<Message[]> {
    if (!db) return [];
    return await db.select().from(messages).where(
      and(
        eq(messages.isPrivate, true),
        or(
          and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
        )
      )
    ).orderBy(desc(messages.timestamp)).limit(limit);
  }

  async getRoomMessages(roomId: string, limit: number = 50): Promise<Message[]> {
    if (!db) return [];
    return await db.select().from(messages).where(eq(messages.roomId, roomId)).orderBy(desc(messages.timestamp)).limit(limit);
  }

  // Friend operations
  async addFriend(userId: number, friendId: number): Promise<Friend> {
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
    const [newFriend] = await db.insert(friends).values({ userId, friendId, status: 'accepted' }).returning();
    return newFriend;
  }

  async getFriends(userId: number): Promise<User[]> {
    if (!db) return [];
    const friendships = await db.select().from(friends).where(eq(friends.userId, userId));
    const friendIds = friendships.map(f => f.friendId);
    if (friendIds.length === 0) return [];
    return await db.select().from(users).where(inArray(users.id, friendIds));
  }

  async getUserFriends(userId: number): Promise<User[]> {
    return this.getFriends(userId);
  }

  async updateFriendStatus(userId: number, friendId: number, status: string): Promise<void> {
    if (!db) return;
    await db.update(friends).set({ status }).where(and(eq(friends.userId, userId), eq(friends.friendId, friendId)));
  }

  async getBlockedUsers(userId: number): Promise<User[]> {
    if (!db) return [];
    const friendships = await db.select().from(friends).where(and(eq(friends.userId, userId), eq(friends.status, 'blocked')));
    const blockedIds = friendships.map(f => f.friendId);
    if (blockedIds.length === 0) return [];
    return await db.select().from(users).where(inArray(users.id, blockedIds));
  }

  async removeFriend(userId: number, friendId: number): Promise<boolean> {
    if (!db) return false;
    await db.delete(friends).where(and(eq(friends.userId, userId), eq(friends.friendId, friendId)));
    return true;
  }

  async getFriendship(userId1: number, userId2: number): Promise<Friend | undefined> {
    if (!db) return undefined;
    const result = await db.select().from(friends).where(
      or(
        and(eq(friends.userId, userId1), eq(friends.friendId, userId2)),
        and(eq(friends.userId, userId2), eq(friends.friendId, userId1))
      )
    ).limit(1);
    return result[0];
  }

  // Friend request operations
  async createFriendRequest(senderId: number, receiverId: number): Promise<any> {
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
    const [request] = await db.insert(friends).values({ userId: senderId, friendId: receiverId, status: 'pending' }).returning();
    return request;
  }

  async getFriendRequest(senderId: number, receiverId: number): Promise<any> {
    if (!db) return undefined;
    const result = await db.select().from(friends).where(
      and(eq(friends.userId, senderId), eq(friends.friendId, receiverId), eq(friends.status, 'pending'))
    ).limit(1);
    return result[0];
  }

  async getFriendRequestById(requestId: number): Promise<any> {
    if (!db) return undefined;
    const result = await db.select().from(friends).where(eq(friends.id, requestId)).limit(1);
    return result[0];
  }

  async getIncomingFriendRequests(userId: number): Promise<any[]> {
    if (!db) return [];
    return await db.select().from(friends).where(and(eq(friends.friendId, userId), eq(friends.status, 'pending')));
  }

  async getOutgoingFriendRequests(userId: number): Promise<any[]> {
    if (!db) return [];
    return await db.select().from(friends).where(and(eq(friends.userId, userId), eq(friends.status, 'pending')));
  }

  async acceptFriendRequest(requestId: number): Promise<boolean> {
    if (!db) return false;
    await db.update(friends).set({ status: 'accepted' }).where(eq(friends.id, requestId));
    return true;
  }

  async declineFriendRequest(requestId: number): Promise<boolean> {
    if (!db) return false;
    await db.delete(friends).where(eq(friends.id, requestId));
    return true;
  }

  async ignoreFriendRequest(requestId: number): Promise<boolean> {
    return this.declineFriendRequest(requestId);
  }

  async deleteFriendRequest(requestId: number): Promise<boolean> {
    return this.declineFriendRequest(requestId);
  }

  // Wall post operations
  async createWallPost(postData: InsertWallPost): Promise<WallPost> {
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
    
    // التأكد من وجود الحقول المطلوبة
    if (!postData.content || !postData.userId || !postData.username || !postData.userRole) {
      throw new Error("محتوى المنشور ومعرف المستخدم واسم المستخدم ودور المستخدم مطلوبة");
    }
    
    const [newPost] = await db.insert(wallPosts).values({
      content: postData.content,
      userId: postData.userId,
      username: postData.username,
      userRole: postData.userRole,
      type: postData.type || 'public',
      imageUrl: postData.imageUrl,
      userProfileImage: postData.userProfileImage,
      usernameColor: postData.usernameColor,
      totalLikes: postData.totalLikes || 0,
      totalDislikes: postData.totalDislikes || 0,
      totalHearts: postData.totalHearts || 0,
    }).returning();
    return newPost;
  }

  async getWallPosts(type: string): Promise<WallPost[]> {
    if (!db) return [];
    return await db.select().from(wallPosts).where(eq(wallPosts.type, type)).orderBy(desc(wallPosts.createdAt));
  }

  async getWallPostsByUsers(userIds: number[]): Promise<WallPost[]> {
    if (!db || userIds.length === 0) return [];
    return await db.select().from(wallPosts).where(inArray(wallPosts.userId, userIds)).orderBy(desc(wallPosts.createdAt));
  }

  async getWallPost(postId: number): Promise<WallPost | null> {
    if (!db) return null;
    const result = await db.select().from(wallPosts).where(eq(wallPosts.id, postId)).limit(1);
    return result[0] || null;
  }

  async deleteWallPost(postId: number): Promise<void> {
    if (!db) return;
    await db.delete(wallPosts).where(eq(wallPosts.id, postId));
  }

  async addWallPostReaction(reactionData: InsertWallReaction): Promise<WallPost | null> {
    if (!db) return null;
    
    // التأكد من وجود الحقول المطلوبة
    if (!reactionData.type || !reactionData.username || !reactionData.userId || !reactionData.postId) {
      throw new Error("نوع التفاعل واسم المستخدم ومعرف المستخدم ومعرف المنشور مطلوبة");
    }
    
    await db.insert(wallReactions).values({
      type: reactionData.type,
      username: reactionData.username,
      userId: reactionData.userId,
      postId: reactionData.postId,
    });
    return this.getWallPost(reactionData.postId);
  }

  async getWallPostWithReactions(postId: number): Promise<WallPost | null> {
    return this.getWallPost(postId);
  }

  async getWallPostReactions(postId: number): Promise<WallReaction[]> {
    if (!db) return [];
    return await db.select().from(wallReactions).where(eq(wallReactions.postId, postId));
  }

  // Room operations
  async getRoom(roomId: string): Promise<any> {
    if (!db) return null;
    const result = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
    return result[0] || null;
  }

  async getBroadcastRoomInfo(roomId: string): Promise<any> {
    return this.getRoom(roomId);
  }

  async getAllRooms(): Promise<any[]> {
    if (!db) return [];
    return await db.select().from(rooms);
  }

  async createRoom(roomData: any): Promise<any> {
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
    const [newRoom] = await db.insert(rooms).values(roomData).returning();
    return newRoom;
  }

  async deleteRoom(roomId: string): Promise<void> {
    if (!db) return;
    await db.delete(rooms).where(eq(rooms.id, roomId));
  }

  async joinRoom(userId: number, roomId: string): Promise<void> {
    if (!db) return;
    await db.insert(roomUsers).values({ userId, roomId });
  }

  async leaveRoom(userId: number, roomId: string): Promise<void> {
    if (!db) return;
    await db.delete(roomUsers).where(and(eq(roomUsers.userId, userId), eq(roomUsers.roomId, roomId)));
  }

  async getUserRooms(userId: number): Promise<string[]> {
    if (!db) return [];
    const userRooms = await db.select().from(roomUsers).where(eq(roomUsers.userId, userId));
    return userRooms.map(ur => ur.roomId);
  }

  async getRoomUsers(roomId: string): Promise<number[]> {
    if (!db) return [];
    const roomUsersList = await db.select().from(roomUsers).where(eq(roomUsers.roomId, roomId));
    return roomUsersList.map(ru => ru.userId);
  }

  async getOnlineUsersInRoom(roomId: string): Promise<User[]> {
    if (!db) return [];
    const roomUserIds = await this.getRoomUsers(roomId);
    if (roomUserIds.length === 0) return [];
    return await db.select().from(users).where(and(inArray(users.id, roomUserIds), eq(users.isOnline, true)));
  }

  // Broadcast Room operations
  async requestMic(userId: number, roomId: string): Promise<boolean> {
    // تنفيذ بسيط - يمكن تحسينه لاحقاً
    return true;
  }

  async approveMicRequest(roomId: string, userId: number, approvedBy: number): Promise<boolean> {
    // تنفيذ بسيط - يمكن تحسينه لاحقاً
    return true;
  }

  async rejectMicRequest(roomId: string, userId: number, rejectedBy: number): Promise<boolean> {
    // تنفيذ بسيط - يمكن تحسينه لاحقاً
    return true;
  }

  async removeSpeaker(roomId: string, userId: number, removedBy: number): Promise<boolean> {
    // تنفيذ بسيط - يمكن تحسينه لاحقاً
    return true;
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
    
    // التأكد من وجود الحقول المطلوبة
    if (!notification.userId || !notification.type || !notification.title || !notification.message) {
      throw new Error("معرف المستخدم ونوع الإشعار والعنوان والرسالة مطلوبة");
    }
    
    const [newNotification] = await db.insert(notifications).values({
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      isRead: false,
    }).returning();
    return newNotification;
  }

  async getUserNotifications(userId: number, limit: number = 20): Promise<Notification[]> {
    if (!db) return [];
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
  }

  async markNotificationAsRead(notificationId: number): Promise<boolean> {
    if (!db) return false;
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, notificationId));
    return true;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    if (!db) return false;
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
    return true;
  }

  async deleteNotification(notificationId: number): Promise<boolean> {
    if (!db) return false;
    await db.delete(notifications).where(eq(notifications.id, notificationId));
    return true;
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    if (!db) return 0;
    const result = await db.select({ count: sql<number>`count(*)` }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result[0]?.count || 0;
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
    if (!db) return false;
    await db.insert(blockedDevices).values(blockData);
    return true;
  }

  async isDeviceBlocked(ipAddress: string, deviceId: string): Promise<boolean> {
    if (!db) return false;
    const result = await db.select().from(blockedDevices).where(
      or(eq(blockedDevices.ipAddress, ipAddress), eq(blockedDevices.deviceId, deviceId))
    ).limit(1);
    return result.length > 0;
  }

  async getBlockedDevices(): Promise<Array<{ipAddress: string, deviceId: string}>> {
    if (!db) return [];
    const devices = await db.select({ ipAddress: blockedDevices.ipAddress, deviceId: blockedDevices.deviceId }).from(blockedDevices);
    return devices;
  }

  // Points system operations
  async updateUserPoints(userId: number, updates: { points?: number; level?: number; totalPoints?: number; levelProgress?: number }): Promise<void> {
    if (!db) return;
    await db.update(users).set(updates).where(eq(users.id, userId));
  }

  async addPointsHistory(userId: number, points: number, reason: string, action: 'earn' | 'spend'): Promise<void> {
    if (!db) return;
    await db.insert(pointsHistory).values({
      userId,
      points,
      reason,
      action,
      createdAt: new Date()
    });
  }

  async getUserLastDailyLogin(userId: number): Promise<string | null> {
    if (!db) return null;
    const user = await this.getUser(userId);
    return user?.lastSeen?.toDateString() || null;
  }

  async updateUserLastDailyLogin(userId: number, dateString: string): Promise<void> {
    if (!db) return;
    await db.update(users).set({ lastSeen: new Date(dateString) }).where(eq(users.id, userId));
  }

  async getPointsHistory(userId: number, limit: number = 50): Promise<any[]> {
    if (!db) return [];
    return await db.select().from(pointsHistory).where(eq(pointsHistory.userId, userId)).orderBy(desc(pointsHistory.createdAt)).limit(limit);
  }

  async getTopUsersByPoints(limit: number = 20): Promise<User[]> {
    if (!db) return [];
    return await db.select().from(users).orderBy(desc(users.points)).limit(limit);
  }

  async getUserMessageCount(userId: number): Promise<number> {
    if (!db) return 0;
    const result = await db.select({ count: sql<number>`count(*)` }).from(messages).where(eq(messages.senderId, userId));
    return result[0]?.count || 0;
  }
}

// إنشاء instance واحد للاستخدام
export const storage = new PostgreSQLStorage();