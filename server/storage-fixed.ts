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
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

// إضافة اتصال SQLite مباشر كبديل
let directSqliteDb: Database.Database | null = null;

function getDirectSqliteConnection() {
  if (!directSqliteDb) {
    const databaseUrl = process.env.DATABASE_URL || 'sqlite:./data/chatapp.db';
    let dbPath = './data/chatapp.db';
    if (databaseUrl.startsWith('sqlite:')) {
      dbPath = databaseUrl.replace('sqlite:', '');
    }
    
    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    directSqliteDb = new Database(dbPath);
    
    // Initialize tables if they don't exist
    directSqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT,
        user_type TEXT NOT NULL DEFAULT 'guest',
        role TEXT NOT NULL DEFAULT 'guest',
        profile_image TEXT,
        profile_banner TEXT,
        profile_background_color TEXT DEFAULT '#3c0d0d',
        status TEXT,
        gender TEXT,
        age INTEGER,
        country TEXT,
        relation TEXT,
        bio TEXT,
        is_online INTEGER DEFAULT 0,
        is_hidden INTEGER DEFAULT 0,
        last_seen TEXT,
        join_date TEXT,
        created_at TEXT,
        is_muted INTEGER DEFAULT 0,
        mute_expiry TEXT,
        is_banned INTEGER DEFAULT 0,
        ban_expiry TEXT,
        is_blocked INTEGER DEFAULT 0,
        ip_address TEXT,
        device_id TEXT,
        ignored_users TEXT DEFAULT '[]',
        username_color TEXT DEFAULT '#FFFFFF',
        user_theme TEXT DEFAULT 'default',
        profile_effect TEXT DEFAULT 'none',
        points INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        total_points INTEGER DEFAULT 0,
        level_progress INTEGER DEFAULT 0
      );
    `);
  }
  return directSqliteDb;
}

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
      const directDb = getDirectSqliteConnection();
      const user = directDb.prepare('SELECT * FROM users WHERE id = ?').get(id);
      return convertRowToUser(user) || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const directDb = getDirectSqliteConnection();
      const user = directDb.prepare('SELECT * FROM users WHERE username = ?').get(username);
      return convertRowToUser(user) || undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const directDb = getDirectSqliteConnection();
      
      // Hash password if provided
      let hashedPassword = null;
      if (insertUser.password) {
        hashedPassword = await bcrypt.hash(insertUser.password, 12);
      }

      const stmt = directDb.prepare(`
        INSERT INTO users (
          username, password, user_type, role, profile_image, profile_banner,
          profile_background_color, status, gender, age, country, relation, bio,
          is_online, is_hidden, last_seen, join_date, created_at, is_muted,
          mute_expiry, is_banned, ban_expiry, is_blocked, ip_address, device_id,
          ignored_users, username_color, user_theme, profile_effect, points,
          level, total_points, level_progress
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const now = new Date().toISOString();
      const result = stmt.run(
        insertUser.username,
        hashedPassword,
        insertUser.userType || 'guest',
        insertUser.role || insertUser.userType || 'guest',
        insertUser.profileImage || '/default_avatar.svg',
        insertUser.profileBanner || null,
        insertUser.profileBackgroundColor || '#3c0d0d',
        insertUser.status || null,
        insertUser.gender || 'male',
        insertUser.age || null,
        insertUser.country || null,
        insertUser.relation || null,
        insertUser.bio || null,
        insertUser.isOnline ? 1 : 0,
        insertUser.isHidden ? 1 : 0,
        now,
        now,
        now,
        insertUser.isMuted ? 1 : 0,
        insertUser.muteExpiry ? insertUser.muteExpiry.toISOString() : null,
        insertUser.isBanned ? 1 : 0,
        insertUser.banExpiry ? insertUser.banExpiry.toISOString() : null,
        insertUser.isBlocked ? 1 : 0,
        insertUser.ipAddress || null,
        insertUser.deviceId || null,
        JSON.stringify(insertUser.ignoredUsers || []),
        insertUser.usernameColor || '#FFFFFF',
        insertUser.userTheme || 'default',
        insertUser.profileEffect || 'none',
        insertUser.points || 0,
        insertUser.level || 1,
        insertUser.totalPoints || 0,
        insertUser.levelProgress || 0
      );

      const newUser = directDb.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      const convertedUser = convertRowToUser(newUser);
      
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
      const directDb = getDirectSqliteConnection();
      const users = directDb.prepare('SELECT * FROM users').all();
      return users.map(convertRowToUser).filter((user): user is User => user !== null);
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    try {
      const directDb = getDirectSqliteConnection();
      
      // Build dynamic update query
      const setClause = [];
      const values = [];
      
      if (updates.isOnline !== undefined) {
        setClause.push('is_online = ?');
        values.push(updates.isOnline ? 1 : 0);
      }
      
      if (updates.lastSeen !== undefined) {
        setClause.push('last_seen = ?');
        values.push(updates.lastSeen ? updates.lastSeen.toISOString() : null);
      }

      if (setClause.length === 0) {
        return this.getUser(id);
      }

      values.push(id);
      const stmt = directDb.prepare(`UPDATE users SET ${setClause.join(', ')} WHERE id = ?`);
      stmt.run(...values);

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
      const directDb = getDirectSqliteConnection();
      const users = directDb.prepare('SELECT * FROM users WHERE is_online = 1').all();
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