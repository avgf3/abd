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
import { eq, desc, and, sql, or } from "drizzle-orm";

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
  updateFriendStatus(userId: number, friendId: number, status: string): Promise<void>;
  getBlockedUsers(userId: number): Promise<User[]>;
  removeFriend(userId: number, friendId: number): Promise<boolean>;
  getFriendship(userId1: number, userId2: number): Promise<Friend | undefined>;
  
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