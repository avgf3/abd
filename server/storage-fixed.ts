import {
  users,
  messages,
  friends,
  notifications,
  blockedDevices,
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
import { eq, desc, and, sql } from "drizzle-orm";
import { userService } from "./services/userService";
import { messageService } from "./services/messageService";
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

// Helper function to convert database row to User type
function convertRowToUser(user: any): User | null {
  if (!user) return null;

  try {
    return {
      id: user.id,
      username: user.username,
      password: user.password,
      userType: user.user_type || user.userType,
      role: user.role,
      profileImage: user.profile_image || user.profileImage,
      profileBanner: user.profile_banner || user.profileBanner,
      profileBackgroundColor: user.profile_background_color || user.profileBackgroundColor || '#3c0d0d',
      status: user.status,
      gender: user.gender,
      age: user.age,
      country: user.country,
      relation: user.relation,
      bio: user.bio,
      isOnline: Boolean(user.is_online ?? user.isOnline),
      isHidden: Boolean(user.is_hidden ?? user.isHidden),
      lastSeen: user.last_seen ? new Date(user.last_seen) : (user.lastSeen ? new Date(user.lastSeen) : null),
      joinDate: user.join_date ? new Date(user.join_date) : (user.joinDate ? new Date(user.joinDate) : new Date()),
      createdAt: user.created_at ? new Date(user.created_at) : (user.createdAt ? new Date(user.createdAt) : new Date()),
      isMuted: Boolean(user.is_muted ?? user.isMuted),
      muteExpiry: user.mute_expiry ? new Date(user.mute_expiry) : (user.muteExpiry ? new Date(user.muteExpiry) : null),
      isBanned: Boolean(user.is_banned ?? user.isBanned),
      banExpiry: user.ban_expiry ? new Date(user.ban_expiry) : (user.banExpiry ? new Date(user.banExpiry) : null),
      isBlocked: Boolean(user.is_blocked ?? user.isBlocked),
      ipAddress: user.ip_address || user.ipAddress,
      deviceId: user.device_id || user.deviceId,
      ignoredUsers: typeof user.ignored_users === 'string' ? JSON.parse(user.ignored_users || '[]') : (user.ignoredUsers || []),
      usernameColor: user.username_color || user.usernameColor || '#FFFFFF',
      userTheme: user.user_theme || user.userTheme || 'default',
      profileEffect: user.profile_effect || user.profileEffect || 'none',
      points: user.points || 0,
      level: user.level || 1,
      totalPoints: user.total_points || user.totalPoints || 0,
      levelProgress: user.level_progress || user.levelProgress || 0
    };
  } catch (error) {
    console.error('Error converting row to user:', error);
    return null;
  }
}

export class FixedStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const user = await db.select().from(users).where(eq(users.id, id));
      return convertRowToUser(user[0]) || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const user = await db.select().from(users).where(eq(users.username, username));
      return convertRowToUser(user[0]) || undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Hash password if provided
      let hashedPassword = null;
      if (insertUser.password) {
        hashedPassword = await bcrypt.hash(insertUser.password, 12);
      }

      const result = await db.insert(users).values({
        username: insertUser.username,
        password: hashedPassword,
        userType: insertUser.userType || 'guest',
        role: insertUser.role || insertUser.userType || 'guest',
        profileImage: insertUser.profileImage || '/default_avatar.svg',
        profileBanner: insertUser.profileBanner || null,
        profileBackgroundColor: insertUser.profileBackgroundColor || '#3c0d0d',
        status: insertUser.status || null,
        gender: insertUser.gender || 'male',
        age: insertUser.age || null,
        country: insertUser.country || null,
        relation: insertUser.relation || null,
        bio: insertUser.bio || null,
        isOnline: insertUser.isOnline ? 1 : 0,
        isHidden: insertUser.isHidden ? 1 : 0,
        lastSeen: new Date().toISOString(),
        joinDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isMuted: insertUser.isMuted ? 1 : 0,
        muteExpiry: insertUser.muteExpiry ? (insertUser.muteExpiry instanceof Date ? insertUser.muteExpiry.toISOString() : new Date(insertUser.muteExpiry).toISOString()) : null,
        isBanned: insertUser.isBanned ? 1 : 0,
        banExpiry: insertUser.banExpiry ? (insertUser.banExpiry instanceof Date ? insertUser.banExpiry.toISOString() : new Date(insertUser.banExpiry).toISOString()) : null,
        isBlocked: insertUser.isBlocked ? 1 : 0,
        ipAddress: insertUser.ipAddress || null,
        deviceId: insertUser.deviceId || null,
        ignoredUsers: JSON.stringify(insertUser.ignoredUsers || []),
        usernameColor: insertUser.usernameColor || '#FFFFFF',
        userTheme: insertUser.userTheme || 'default',
        profileEffect: insertUser.profileEffect || 'none',
        points: insertUser.points || 0,
        level: insertUser.level || 1,
        totalPoints: insertUser.totalPoints || 0,
        levelProgress: insertUser.levelProgress || 0
      }).returning();

      const newUser = await db.select().from(users).where(eq(users.id, result[0].id));
      const convertedUser = convertRowToUser(newUser[0]);
      
      if (!convertedUser) {
        throw new Error('Failed to create user');
      }

      return convertedUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async verifyUserCredentials(username: string, password: string): Promise<User | null> {
    try {
      const user = await this.getUserByUsername(username);
      if (!user || !user.password) {
        return null;
      }

      const isValid = await bcrypt.compare(password, user.password);
      return isValid ? user : null;
    } catch (error) {
      console.error('Error verifying user credentials:', error);
      return null;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const users = await db.select().from(users);
      return users.map(convertRowToUser).filter((user): user is User => user !== null);
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    try {
      const result = await db.update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();

      return this.getUser(id);
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  // Add other required methods with proper type safety...
  async setUserOnlineStatus(id: number, isOnline: boolean): Promise<void> {
    await this.updateUser(id, { isOnline });
  }

  async setUserHiddenStatus(id: number, isHidden: boolean): Promise<void> {
    await this.updateUser(id, { isHidden });
  }

  // Placeholder methods for remaining interface requirements
  async addIgnoredUser(userId: number, ignoredUserId: number): Promise<void> {
    // Implementation needed
  }

  async removeIgnoredUser(userId: number, ignoredUserId: number): Promise<void> {
    // Implementation needed
  }

  async getIgnoredUsers(userId: number): Promise<number[]> {
    const user = await this.getUser(userId);
    return user?.ignoredUsers || [];
  }

  async getOnlineUsers(): Promise<User[]> {
    try {
      const users = await db.select().from(users).where(eq(users.isOnline, 1));
      return users.map(convertRowToUser).filter((user): user is User => user !== null);
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  }

  // Message methods (simplified)
  async createMessage(message: InsertMessage): Promise<Message> {
    const msg: Message = {
      id: Date.now(), // Simple ID generation
      senderId: message.senderId,
      receiverId: message.receiverId || null,
      roomId: message.roomId || 'general',
      content: message.content,
      messageType: message.messageType || 'text',
      isPrivate: message.isPrivate || false,
      timestamp: new Date()
    };
    return msg;
  }

  async getPublicMessages(limit: number = 50): Promise<Message[]> {
    return [];
  }

  async getPrivateMessages(userId1: number, userId2: number, limit: number = 50): Promise<Message[]> {
    return [];
  }

  // Friend methods (placeholder)
  async addFriend(userId: number, friendId: number): Promise<Friend> {
    throw new Error('Not implemented');
  }

  async getFriends(userId: number): Promise<User[]> {
    return [];
  }

  async updateFriendStatus(userId: number, friendId: number, status: string): Promise<void> {
    // Implementation needed
  }

  async getBlockedUsers(userId: number): Promise<User[]> {
    return [];
  }

  async removeFriend(userId: number, friendId: number): Promise<boolean> {
    return false;
  }

  async getFriendship(userId1: number, userId2: number): Promise<Friend | undefined> {
    return undefined;
  }

  // Friend request methods (placeholder)
  async createFriendRequest(senderId: number, receiverId: number): Promise<any> {
    return null;
  }

  async getFriendRequest(senderId: number, receiverId: number): Promise<any> {
    return null;
  }

  async getFriendRequestById(requestId: number): Promise<any> {
    return null;
  }

  async getIncomingFriendRequests(userId: number): Promise<any[]> {
    return [];
  }

  async getOutgoingFriendRequests(userId: number): Promise<any[]> {
    return [];
  }

  async acceptFriendRequest(requestId: number): Promise<boolean> {
    return false;
  }

  async declineFriendRequest(requestId: number): Promise<boolean> {
    return false;
  }

  async ignoreFriendRequest(requestId: number): Promise<boolean> {
    return false;
  }

  async deleteFriendRequest(requestId: number): Promise<boolean> {
    return false;
  }

  // Notification methods (placeholder)
  async createNotification(notification: InsertNotification): Promise<Notification> {
    throw new Error('Not implemented');
  }

  async getUserNotifications(userId: number, limit: number = 50): Promise<Notification[]> {
    return [];
  }

  async markNotificationAsRead(notificationId: number): Promise<boolean> {
    return false;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    return false;
  }

  async deleteNotification(notificationId: number): Promise<boolean> {
    return false;
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    return 0;
  }

  // Blocked devices methods (placeholder)
  async createBlockedDevice(blockData: {
    ipAddress: string;
    deviceId: string;
    userId: number;
    reason: string;
    blockedAt: Date;
    blockedBy: number;
  }): Promise<boolean> {
    return false;
  }

  async isDeviceBlocked(ipAddress: string, deviceId: string): Promise<boolean> {
    return false;
  }

  async getBlockedDevices(): Promise<Array<{ipAddress: string, deviceId: string}>> {
    return [];
  }
}

// Export the fixed storage instance
export const fixedStorage = new FixedStorage();