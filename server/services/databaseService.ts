import { sql, eq, desc, asc, and, or, like, count, isNull, gte, lt, inArray } from 'drizzle-orm';

import * as schema from '../../shared/schema';
import { dbAdapter, dbType } from '../database-adapter';

// Type definitions for database operations
export interface User {
  id: number;
  username: string;
  password?: string;
  userType: string;
  role: string;
  profileImage?: string;
  profileBanner?: string;
  profileBackgroundColor: string;
  avatarHash?: string;
  avatarVersion?: number;
  status?: string;
  gender?: string;
  age?: number;
  country?: string;
  relation?: string;
  bio?: string;
  isOnline: boolean;
  isHidden: boolean;
  lastSeen?: Date | string;
  joinDate?: Date | string;
  createdAt?: Date | string;
  isMuted: boolean;
  muteExpiry?: Date | string;
  isBanned: boolean;
  banExpiry?: Date | string;
  isBlocked: boolean;
  ipAddress?: string;
  deviceId?: string;
  ignoredUsers: string;
  usernameColor: string;
  profileEffect: string;
  points: number;
  level: number;
  totalPoints: number;
  levelProgress: number;
  // موسيقى البروفايل
  profileMusicUrl?: string | null;
  profileMusicTitle?: string | null;
  profileMusicEnabled?: boolean;
  profileMusicVolume?: number;
}

export interface Message {
  id: number;
  senderId?: number;
  receiverId?: number;
  content: string;
  messageType: string;
  isPrivate: boolean;
  roomId: string;
  timestamp?: Date | string;
}

export interface Friend {
  id: number;
  userId?: number;
  friendId?: number;
  status: string;
  createdAt?: Date | string;
}

export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: unknown;
  createdAt?: Date | string;
}

export interface Room {
  id: string | number;
  name: string;
  description?: string;
  type: string;
  ownerId?: number;
  maxUsers: number;
  isPrivate: boolean;
  password?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  // Cross-DB optional fields (PostgreSQL schema)
  createdBy?: number;
  isDefault?: boolean;
  isActive?: boolean;
  isBroadcast?: boolean;
  hostId?: number | null;
  speakers?: string | any[];
  micQueue?: string | any[];
  icon?: string | null;
}

export interface Story {
  id: number;
  userId: number;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  durationSec: number;
  expiresAt: Date | string;
  createdAt?: Date | string;
  // Optional field: current viewer reaction type (for feeds)
  myReaction?: 'like' | 'heart' | 'dislike' | null;
}

export interface StoryView {
  id: number;
  storyId: number;
  viewerId: number;
  viewedAt?: Date | string;
}

export interface StoryReaction {
  id: number;
  storyId: number;
  userId: number;
  type: 'like' | 'heart' | 'dislike';
  reactedAt?: Date | string;
}

// Blocked device type for moderation persistence
export interface BlockedDevice {
  id: number;
  ipAddress: string;
  deviceId: string;
  userId: number;
  reason: string;
  blockedAt: Date | string;
  blockedBy: number;
}

// إعدادات الموقع
export interface SiteSettings {
  id: number;
  siteTheme: string;
  updatedAt?: Date | string;
}

// Database Service Class
export class DatabaseService {
  private get db() {
    return dbAdapter.db;
  }

  private get type() {
    return dbType;
  }

  private isConnected(): boolean {
    return !!this.db && this.type !== 'disabled';
  }

  // User operations
  async getUserById(id: number): Promise<User | null> {
    if (!this.isConnected()) return null;

    try {
      if (this.type === 'postgresql') {
        const result = await (this.db as any)
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, id))
          .limit(1);
        return result[0] || null;
      } else {
        // SQLite has no users table, so this will return null
        return null;
      }
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    if (!this.isConnected()) return null;

    try {
      if (this.type === 'postgresql') {
        const result = await (this.db as any)
          .select()
          .from(schema.users)
          .where(eq(schema.users.username, username))
          .limit(1);
        return result[0] || null;
      } else {
        // SQLite has no users table, so this will return null
        return null;
      }
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  // Lookup user by email (optional field). Returns null if not connected or not found
  async getUserByEmail(email: string): Promise<User | null> {
    if (!this.isConnected()) return null;

    try {
      if (this.type === 'postgresql') {
        const result = await (this.db as any)
          .select()
          .from(schema.users)
          .where(eq((schema as any).users.email, email))
          .limit(1);
        return result[0] || null;
      } else {
        // SQLite has no users table, so this will return null
        return null;
      }
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  // Batch fetch users by IDs to avoid N+1 queries
  async getUsersByIds(userIds: number[]): Promise<User[]> {
    if (!this.isConnected()) return [];
    const uniqueIds = Array.from(new Set((userIds || []).filter((id) => typeof id === 'number')));
    if (uniqueIds.length === 0) return [];
    try {
      if (this.type === 'postgresql') {
        return await (this.db as any)
          .select()
          .from(schema.users)
          .where(inArray(schema.users.id, uniqueIds));
      } else {
        // SQLite has no users table, so this will return empty array
        return [];
      }
    } catch (error) {
      console.error('Error getUsersByIds:', error);
      return [];
    }
  }

  async createUser(userData: Partial<User>): Promise<User | null> {
    if (!this.isConnected()) return null;

    try {
      if (this.type === 'postgresql') {
        // التحقق من عدد المستخدمين الحاليين
        const userCount = await (this.db as any)
          .select({ count: sql`count(*)::int` })
          .from(schema.users);

        const isFirstUser = userCount[0]?.count === 0;

        // إذا كان هذا أول مستخدم، اجعله المالك
        const finalUserData = {
          ...userData,
          userType: isFirstUser ? 'owner' : userData.userType || 'guest',
          role: isFirstUser ? 'owner' : userData.role || userData.userType || 'guest',
          joinDate: userData.joinDate || new Date(),
          createdAt: userData.createdAt || new Date(),
          lastSeen: userData.lastSeen || new Date(),
        };

        if (isFirstUser) {
          }

        const result = await (this.db as any)
          .insert(schema.users)
          .values(finalUserData)
          .returning();
        return result[0] || null;
      } else {
        // SQLite has no users table, so this will return null
        return null;
      }
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | null> {
    if (!this.isConnected()) return null;

    try {
      if (this.type === 'postgresql') {
        const result = await (this.db as any)
          .update(schema.users)
          .set(updates)
          .where(eq(schema.users.id, id))
          .returning();
        return result[0] || null;
      } else {
        // SQLite has no users table, so this will return null
        return null;
      }
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  async updateUserPoints(userId: number, updates: Partial<User>): Promise<User | null> {
    if (!this.isConnected()) return null;
    try {
      return await this.updateUser(userId, updates);
    } catch (error) {
      console.error('Error updating user points:', error);
      return null;
    }
  }

  async addPointsHistory(
    userId: number,
    points: number,
    reason: string,
    action: 'earn' | 'spend'
  ): Promise<void> {
    if (!this.isConnected()) return;
    try {
      if (this.type === 'postgresql') {
        await (this.db as any).insert(schema.pointsHistory).values({
          userId,
          points,
          reason,
          action,
          createdAt: new Date(),
        });
      } else {
        // SQLite has no pointsHistory table, so this will do nothing
      }
    } catch (error) {
      console.error('Error adding points history:', error);
    }
  }

  async getUserPointsHistory(userId: number, limit: number = 50): Promise<any[]> {
    if (!this.isConnected()) return [];
    try {
      if (this.type === 'postgresql') {
        return await (this.db as any)
          .select()
          .from(schema.pointsHistory)
          .where(eq(schema.pointsHistory.userId, userId))
          .orderBy(desc(schema.pointsHistory.createdAt))
          .limit(limit);
      } else {
        // SQLite has no pointsHistory table, so this will return empty array
        return [];
      }
    } catch (error) {
      console.error('Error getting points history:', error);
      return [];
    }
  }

  async getLatestPointsHistoryByReason(
    userId: number,
    reason: string
  ): Promise<{ createdAt: Date | string } | null> {
    if (!this.isConnected()) return null;
    try {
      if (this.type === 'postgresql') {
        const rows = await (this.db as any)
          .select()
          .from(schema.pointsHistory)
          .where(
            and(eq(schema.pointsHistory.userId, userId), eq(schema.pointsHistory.reason, reason))
          )
          .orderBy(desc(schema.pointsHistory.createdAt))
          .limit(1);
        return rows[0] || null;
      } else {
        // SQLite has no pointsHistory table, so this will return null
        return null;
      }
    } catch (error) {
      console.error('Error getting latest points history by reason:', error);
      return null;
    }
  }

  async getUserMessageCount(userId: number): Promise<number> {
    if (!this.isConnected()) return 0;
    try {
      if (this.type === 'postgresql') {
        const rows = await (this.db as any)
          .select({ c: count() })
          .from(schema.messages)
          .where(eq(schema.messages.senderId, userId));
        return Number(rows?.[0]?.c || 0);
      } else {
        // SQLite has no messages table, so this will return 0
        return 0;
      }
    } catch (error) {
      console.error('Error counting user messages:', error);
      return 0;
    }
  }

  async getTopUsersByPoints(limit: number = 20): Promise<User[]> {
    if (!this.isConnected()) return [];
    try {
      if (this.type === 'postgresql') {
        return await (this.db as any)
          .select()
          .from(schema.users)
          .orderBy(desc(schema.users.totalPoints))
          .limit(limit);
      } else {
        // SQLite has no users table, so this will return empty array
        return [];
      }
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  // Delete a guest user and all related data, freeing the username for reuse
  async deleteGuestUserAndData(userId: number): Promise<boolean> {
    if (!this.isConnected()) return false;
    try {
      const user = await this.getUserById(userId);
      if (!user || user.userType !== 'guest') {
        return false;
      }

      if (this.type === 'postgresql') {
        await (this.db as any).transaction(async (tx: any) => {
          // Remove reactions and relations first
          await tx.delete((schema as any).messageReactions).where(eq((schema as any).messageReactions.userId, userId));
          await tx.delete((schema as any).storyReactions).where(eq((schema as any).storyReactions.userId, userId));
          await tx.delete((schema as any).storyViews).where(eq((schema as any).storyViews.viewerId, userId));
          await tx.delete((schema as any).wallReactions).where(eq((schema as any).wallReactions.userId, userId));

          // Remove content authored by the user
          await tx.delete((schema as any).stories).where(eq((schema as any).stories.userId, userId));
          await tx.delete((schema as any).wallPosts).where(eq((schema as any).wallPosts.userId, userId));

          // Remove messages involving the user (public/private)
          await tx
            .delete((schema as any).messages)
            .where(
              or(
                eq((schema as any).messages.senderId, userId),
                eq((schema as any).messages.receiverId, userId)
              )
            );

          // Remove social relations and notifications
          await tx
            .delete((schema as any).friends)
            .where(
              or(
                eq((schema as any).friends.userId, userId),
                eq((schema as any).friends.friendId, userId)
              )
            );
          await tx.delete((schema as any).notifications).where(eq((schema as any).notifications.userId, userId));

          // Remove room memberships and points history
          await tx.delete((schema as any).roomMembers).where(eq((schema as any).roomMembers.userId, userId));
          await tx.delete((schema as any).pointsHistory).where(eq((schema as any).pointsHistory.userId, userId));

          // Remove VIP and device blocks if any
          await tx.delete((schema as any).vipUsers).where(eq((schema as any).vipUsers.userId, userId));
          try {
            await tx.delete((schema as any).blockedDevices).where(eq((schema as any).blockedDevices.userId, userId));
          } catch {}

          // Finally remove the user
          await tx.delete((schema as any).users).where(eq((schema as any).users.id, userId));
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleteGuestUserAndData:', error);
      return false;
    }
  }

  async updateUserLastDailyLogin(_userId: number, _today: string): Promise<void> {
    // نستخدم points_history كمرجع لآخر دخول يومي، لا حاجة لتحديث users
    return;
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.isConnected()) return [];

    try {
      if (this.type === 'postgresql') {
        return await (this.db as any)
          .select()
          .from(schema.users)
          .orderBy(desc(schema.users.joinDate));
      } else {
        // SQLite has no users table, so this will return empty array
        return [];
      }
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  // New: paginated and optional search user listing to avoid full scans
  async listUsers(limit: number = 50, offset: number = 0, search?: string): Promise<User[]> {
    if (!this.isConnected()) return [];
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const safeOffset = Math.max(0, Number(offset) || 0);

    try {
      if (this.type === 'postgresql') {
        const base = (this.db as any)
          .select()
          .from(schema.users)
          .orderBy(desc(schema.users.joinDate))
          .limit(safeLimit)
          .offset(safeOffset);
        if (search && search.trim()) {
          const pattern = `%${search.trim()}%`;
          return await (this.db as any)
            .select()
            .from(schema.users)
            .where(like(schema.users.username, pattern))
            .orderBy(desc(schema.users.joinDate))
            .limit(safeLimit)
            .offset(safeOffset);
        }
        return await base;
      } else {
        // SQLite has no users table, so this will return empty array
        return [];
      }
    } catch (error) {
      console.error('Error listing users:', error);
      return [];
    }
  }

  // New: count for pagination
  async countUsers(search?: string): Promise<number> {
    if (!this.isConnected()) return 0;
    try {
      if (this.type === 'postgresql') {
        if (search && search.trim()) {
          const pattern = `%${search.trim()}%`;
          const rows = await (this.db as any)
            .select({ c: count() })
            .from(schema.users)
            .where(like(schema.users.username, pattern));
          return Number(rows?.[0]?.c || 0);
        }
        const rows = await (this.db as any).select({ c: count() }).from(schema.users);
        return Number(rows?.[0]?.c || 0);
      } else {
        // SQLite has no users table, so this will return 0
        return 0;
      }
    } catch (error) {
      console.error('Error counting users:', error);
      return 0;
    }
  }

  async getOnlineUsers(): Promise<User[]> {
    if (!this.isConnected()) return [];

    try {
      if (this.type === 'postgresql') {
        return await (this.db as any)
          .select()
          .from(schema.users)
          .where(and(eq(schema.users.isOnline, true), eq(schema.users.isHidden, false)));
      } else {
        // SQLite has no users table, so this will return empty array
        return [];
      }
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  }

  // ===== VIP management =====
  async getVipUsers(limit: number = 50): Promise<User[]> {
    if (!this.isConnected()) return [];
    try {
      if (this.type === 'postgresql') {
        const result = await (this.db as any)
          .select({
            id: schema.users.id,
            username: schema.users.username,
            userType: schema.users.userType,
            role: schema.users.role,
            profileImage: schema.users.profileImage,
            profileBackgroundColor: schema.users.profileBackgroundColor,
            profileEffect: schema.users.profileEffect,
            usernameColor: schema.users.usernameColor,
            isOnline: schema.users.isOnline,
            lastSeen: schema.users.lastSeen,
            points: schema.users.points,
            level: schema.users.level,
            totalPoints: schema.users.totalPoints,
            gender: schema.users.gender,
            country: schema.users.country,
            isMuted: schema.users.isMuted,
          })
          .from(schema.users)
          .innerJoin(schema.vipUsers, eq(schema.vipUsers.userId, schema.users.id))
          .orderBy(desc(schema.users.totalPoints), asc(schema.users.username))
          .limit(Math.min(100, Math.max(1, limit)));

        return result || [];
      }
      return [];
    } catch (error) {
      console.error('Error getVipUsers:', error);
      return [];
    }
  }

  async addVipUser(targetUserId: number, createdBy?: number): Promise<boolean> {
    if (!this.isConnected() || !targetUserId) return false;
    try {
      if (this.type === 'postgresql') {
        await (this.db as any)
          .insert(schema.vipUsers)
          .values({
            userId: targetUserId,
            createdBy: createdBy || null,
          })
          .onConflictDoNothing();
        return true;
      } else {
        // SQLite has no vipUsers table, so this will return false
        return false;
      }
    } catch (error) {
      console.error('Error addVipUser:', error);
      return false;
    }
  }

  async removeVipUser(targetUserId: number): Promise<boolean> {
    if (!this.isConnected() || !targetUserId) return false;
    try {
      if (this.type === 'postgresql') {
        await (this.db as any)
          .delete(schema.vipUsers)
          .where(eq(schema.vipUsers.userId, targetUserId));
        return true;
      } else {
        // SQLite has no vipUsers table, so this will return false
        return false;
      }
    } catch (error) {
      console.error('Error removeVipUser:', error);
      return false;
    }
  }

  // اقتراح مرشحين لإضافة VIP: فقط owners/admins
  async getVipCandidates(limit: number = 100): Promise<User[]> {
    if (!this.isConnected()) return [];
    try {
      if (this.type === 'postgresql') {
        return await (this.db as any)
          .select({
            id: schema.users.id,
            username: schema.users.username,
            userType: schema.users.userType,
            role: schema.users.role,
            profileImage: schema.users.profileImage,
            profileBackgroundColor: schema.users.profileBackgroundColor,
            profileEffect: schema.users.profileEffect,
            usernameColor: schema.users.usernameColor,
            isOnline: schema.users.isOnline,
            lastSeen: schema.users.lastSeen,
            points: schema.users.points,
            level: schema.users.level,
            totalPoints: schema.users.totalPoints,
            gender: schema.users.gender,
            country: schema.users.country,
            isMuted: schema.users.isMuted,
          })
          .from(schema.users)
          .where(
            or(eq(schema.users.userType, 'owner' as any), eq(schema.users.userType, 'admin' as any))
          )
          .orderBy(asc(schema.users.userType), asc(schema.users.username as any))
          .limit(Math.min(200, Math.max(1, limit)));
      } else {
        // SQLite has no users table, so this will return empty array
        return [];
      }
    } catch (error) {
      console.error('Error getVipCandidates:', error);
      return [];
    }
  }

  // Message operations
  // ===================== Stories operations =====================
  async createStory(data: Omit<Story, 'id' | 'createdAt'>): Promise<Story | null> {
    if (!this.isConnected()) return null;
    try {
      if (this.type === 'postgresql') {
        const values: any = {
          userId: data.userId,
          mediaUrl: data.mediaUrl,
          mediaType: data.mediaType,
          caption: data.caption || null,
          durationSec: Math.min(30, Math.max(0, Number(data.durationSec) || 0)),
          expiresAt: data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        };
        const [row] = await (this.db as any).insert((schema as any).stories).values(values).returning();
        return row || null;
      }
      return null;
    } catch (error) {
      console.error('Error createStory:', error);
      return null;
    }
  }

  async getStoryById(storyId: number): Promise<Story | null> {
    if (!this.isConnected()) return null;
    try {
      if (this.type === 'postgresql') {
        const rows = await (this.db as any)
          .select()
          .from((schema as any).stories)
          .where(eq((schema as any).stories.id, storyId))
          .limit(1);
        return rows?.[0] || null;
      }
      return null;
    } catch (error) {
      console.error('Error getStoryById:', error);
      return null;
    }
  }

  async getUserStories(userId: number, includeExpired = false): Promise<Story[]> {
    if (!this.isConnected()) return [];
    try {
      if (this.type === 'postgresql') {
        const now = new Date();
        if (includeExpired) {
          return await (this.db as any)
            .select()
            .from((schema as any).stories)
            .where(eq((schema as any).stories.userId, userId))
            .orderBy(desc((schema as any).stories.createdAt));
        }
        return await (this.db as any)
          .select()
          .from((schema as any).stories)
          .where(and(eq((schema as any).stories.userId, userId), gte((schema as any).stories.expiresAt, now as any)))
          .orderBy(desc((schema as any).stories.createdAt));
      }
      return [];
    } catch (error) {
      console.error('Error getUserStories:', error);
      return [];
    }
  }

  async getStoriesFeedForUser(viewerId: number): Promise<Story[]> {
    if (!this.isConnected()) return [];
    try {
      if (this.type === 'postgresql') {
        const now = new Date();
        const rows = await (this.db as any)
          .select({
            id: (schema as any).stories.id,
            userId: (schema as any).stories.userId,
            mediaUrl: (schema as any).stories.mediaUrl,
            mediaType: (schema as any).stories.mediaType,
            caption: (schema as any).stories.caption,
            durationSec: (schema as any).stories.durationSec,
            expiresAt: (schema as any).stories.expiresAt,
            createdAt: (schema as any).stories.createdAt,
            myReaction: (schema as any).storyReactions.type,
          })
          .from((schema as any).stories)
          .leftJoin(
            (schema as any).storyReactions,
            and(
              eq((schema as any).storyReactions.storyId, (schema as any).stories.id),
              eq((schema as any).storyReactions.userId, viewerId)
            )
          )
          .where(gte((schema as any).stories.expiresAt, now as any))
          .orderBy(desc((schema as any).stories.createdAt))
          .limit(200);
        return (rows || []).map((r: any) => ({
          id: r.id,
          userId: r.userId,
          mediaUrl: r.mediaUrl,
          mediaType: r.mediaType,
          caption: r.caption ?? undefined,
          durationSec: r.durationSec,
          expiresAt: r.expiresAt,
          createdAt: r.createdAt,
          myReaction: (r.myReaction as any) ?? null,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getStoriesFeedForUser:', error);
      return [];
    }
  }

  async addStoryView(storyId: number, viewerId: number): Promise<boolean> {
    if (!this.isConnected()) return false;
    try {
      if (this.type === 'postgresql') {
        await (this.db as any)
          .insert((schema as any).storyViews)
          .values({ storyId, viewerId, viewedAt: new Date() })
          .onConflictDoNothing();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error addStoryView:', error);
      return false;
    }
  }

  async getStoryViews(storyId: number): Promise<StoryView[]> {
    if (!this.isConnected()) return [];
    try {
      if (this.type === 'postgresql') {
        return await (this.db as any)
          .select()
          .from((schema as any).storyViews)
          .where(eq((schema as any).storyViews.storyId, storyId))
          .orderBy(desc((schema as any).storyViews.viewedAt));
      }
      return [];
    } catch (error) {
      console.error('Error getStoryViews:', error);
      return [];
    }
  }

  async deleteStory(storyId: number, requesterId: number): Promise<boolean> {
    if (!this.isConnected()) return true; // no-op
    try {
      if (this.type === 'postgresql') {
        // Ensure ownership
        const rows = await (this.db as any)
          .select({ userId: (schema as any).stories.userId })
          .from((schema as any).stories)
          .where(eq((schema as any).stories.id, storyId))
          .limit(1);
        const ownerId = rows?.[0]?.userId;
        if (ownerId !== requesterId) return false;

        await (this.db as any)
          .delete((schema as any).stories)
          .where(eq((schema as any).stories.id, storyId));
        return true;
      }
      return true;
    } catch (error) {
      console.error('Error deleteStory:', error);
      return false;
    }
  }

  // ===================== Story Reactions =====================
  async upsertStoryReaction(
    storyId: number,
    userId: number,
    type: 'like' | 'heart' | 'dislike'
  ): Promise<boolean> {
    if (!this.isConnected()) return false;
    try {
      if (this.type === 'postgresql') {
        await (this.db as any)
          .delete((schema as any).storyReactions)
          .where(and(eq((schema as any).storyReactions.storyId, storyId), eq((schema as any).storyReactions.userId, userId)));

        await (this.db as any)
          .insert((schema as any).storyReactions)
          .values({ storyId, userId, type, reactedAt: new Date() });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error upsertStoryReaction:', error);
      return false;
    }
  }

  async removeStoryReaction(storyId: number, userId: number): Promise<boolean> {
    if (!this.isConnected()) return false;
    try {
      if (this.type === 'postgresql') {
        await (this.db as any)
          .delete((schema as any).storyReactions)
          .where(and(eq((schema as any).storyReactions.storyId, storyId), eq((schema as any).storyReactions.userId, userId)));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removeStoryReaction:', error);
      return false;
    }
  }

  async getStoryReactions(storyId: number): Promise<StoryReaction[]> {
    if (!this.isConnected()) return [];
    try {
      if (this.type === 'postgresql') {
        return await (this.db as any)
          .select()
          .from((schema as any).storyReactions)
          .where(eq((schema as any).storyReactions.storyId, storyId))
          .orderBy(desc((schema as any).storyReactions.reactedAt));
      }
      return [];
    } catch (error) {
      console.error('Error getStoryReactions:', error);
      return [];
    }
  }
  async createMessage(messageData: Partial<Message>): Promise<Message | null> {
    if (!this.isConnected()) return null;

    try {
      if (this.type === 'postgresql') {
        const result = await (this.db as any)
          .insert(schema.messages)
          .values({
            ...messageData,
            timestamp: messageData.timestamp || new Date(),
          })
          .returning();
        return result[0] || null;
      } else {
        // SQLite has no messages table, so this will return null
        return null;
      }
    } catch (error) {
      console.error('Error creating message:', error);
      return null;
    }
  }

  async getMessages(roomId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    if (!this.isConnected()) return [];

    try {
      if (this.type === 'postgresql') {
        return await (this.db as any)
          .select()
          .from(schema.messages)
          .where(
            and(
              eq(schema.messages.roomId, roomId),
              isNull(schema.messages.deletedAt),
              eq(schema.messages.isPrivate, false)
            )
          )
          .orderBy(desc(schema.messages.timestamp))
          .limit(limit)
          .offset(offset);
      } else {
        // SQLite has no messages table, so this will return empty array
        return [];
      }
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  async getPrivateMessages(
    userId1: number,
    userId2: number,
    limit: number = 50
  ): Promise<Message[]> {
    if (!this.isConnected()) return [];

    try {
      if (this.type === 'postgresql') {
        return await (this.db as any)
          .select()
          .from(schema.messages)
          .where(
            and(
              eq(schema.messages.isPrivate, true),
              or(
                and(eq(schema.messages.senderId, userId1), eq(schema.messages.receiverId, userId2)),
                and(eq(schema.messages.senderId, userId2), eq(schema.messages.receiverId, userId1))
              )
            )
          )
          .orderBy(desc(schema.messages.timestamp))
          .limit(limit);
      } else {
        // SQLite has no messages table, so this will return empty array
        return [];
      }
    } catch (error) {
      console.error('Error getting private messages:', error);
      return [];
    }
  }

  async getPrivateMessagesBefore(
    userId1: number,
    userId2: number,
    limit: number = 50,
    beforeTimestamp?: Date,
    beforeId?: number
  ): Promise<Message[]> {
    if (!this.isConnected()) return [];

    const applyWhere = (table: any) => {
      const base = and(
        eq(table.isPrivate, true),
        or(
          and(eq(table.senderId, userId1), eq(table.receiverId, userId2)),
          and(eq(table.senderId, userId2), eq(table.receiverId, userId1))
        )
      );
      if (beforeTimestamp) {
        return and(base, lt(table.timestamp, beforeTimestamp as any));
      }
      if (typeof beforeId === 'number' && !isNaN(beforeId)) {
        return and(base, lt(table.id, beforeId as any));
      }
      return base;
    };

    try {
      if (this.type === 'postgresql') {
        return await (this.db as any)
          .select()
          .from(schema.messages)
          .where(applyWhere(schema.messages))
          .orderBy(desc(schema.messages.timestamp))
          .limit(limit);
      } else {
        // SQLite has no messages table, so this will return empty array
        return [];
      }
    } catch (error) {
      console.error('Error getting older private messages:', error);
      return [];
    }
  }

  // ===================== Room message helpers (counts/search/stats) =====================
  async getRoomMessageCount(roomId: string): Promise<number> {
    if (!this.isConnected()) return 0;
    try {
      if (this.type === 'postgresql') {
        const rows = await (this.db as any)
          .select({ c: count() })
          .from(schema.messages)
          .where(
            and(
              eq(schema.messages.roomId, roomId),
              isNull(schema.messages.deletedAt),
              eq(schema.messages.isPrivate, false)
            )
          );
        return Number(rows?.[0]?.c || 0);
      } else {
        // SQLite has no messages table, so this will return 0
        return 0;
      }
    } catch (error) {
      console.error('Error getRoomMessageCount:', error);
      return 0;
    }
  }

  async getRoomMessageCountSince(roomId: string, since: Date): Promise<number> {
    if (!this.isConnected()) return 0;
    try {
      if (this.type === 'postgresql') {
        const rows = await (this.db as any)
          .select({ c: count() })
          .from(schema.messages)
          .where(
            and(
              eq(schema.messages.roomId, roomId),
              isNull(schema.messages.deletedAt),
              eq(schema.messages.isPrivate, false),
              gte(schema.messages.timestamp, since as any)
            )
          );
        return Number(rows?.[0]?.c || 0);
      } else {
        // SQLite has no messages table, so this will return 0
        return 0;
      }
    } catch (error) {
      console.error('Error getRoomMessageCountSince:', error);
      return 0;
    }
  }

  async getRoomActiveUserCount(roomId: string, since: Date): Promise<number> {
    if (!this.isConnected()) return 0;
    try {
      if (this.type === 'postgresql') {
        const rows = await (this.db as any)
          .select({ c: sql<number>`count(distinct ${schema.messages.senderId})` })
          .from(schema.messages)
          .where(
            and(
              eq(schema.messages.roomId, roomId),
              isNull(schema.messages.deletedAt),
              eq(schema.messages.isPrivate, false),
              gte(schema.messages.timestamp, since as any)
            )
          );
        return Number(rows?.[0]?.c || 0);
      } else {
        // SQLite has no messages table, so this will return 0
        return 0;
      }
    } catch (error) {
      console.error('Error getRoomActiveUserCount:', error);
      return 0;
    }
  }

  async getLastRoomMessage(roomId: string): Promise<Message | null> {
    if (!this.isConnected()) return null;
    try {
      if (this.type === 'postgresql') {
        const rows = await (this.db as any)
          .select()
          .from(schema.messages)
          .where(
            and(
              eq(schema.messages.roomId, roomId),
              isNull(schema.messages.deletedAt),
              eq(schema.messages.isPrivate, false)
            )
          )
          .orderBy(desc(schema.messages.timestamp))
          .limit(1);
        return rows?.[0] || null;
      } else {
        // SQLite has no messages table, so this will return null
        return null;
      }
    } catch (error) {
      console.error('Error getLastRoomMessage:', error);
      return null;
    }
  }

  async searchRoomMessages(
    roomId: string,
    searchQuery: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Message[]> {
    if (!this.isConnected()) return [];
    const pattern = `%${searchQuery}%`;
    try {
      if (this.type === 'postgresql') {
        return await (this.db as any)
          .select()
          .from(schema.messages)
          .where(
            and(
              eq(schema.messages.roomId, roomId),
              isNull(schema.messages.deletedAt),
              eq(schema.messages.isPrivate, false),
              like(schema.messages.content, pattern)
            )
          )
          .orderBy(desc(schema.messages.timestamp))
          .limit(limit)
          .offset(offset);
      } else {
        // SQLite has no messages table, so this will return empty array
        return [];
      }
    } catch (error) {
      console.error('Error searchRoomMessages:', error);
      return [];
    }
  }

  async countSearchRoomMessages(roomId: string, searchQuery: string): Promise<number> {
    if (!this.isConnected()) return 0;
    const pattern = `%${searchQuery}%`;
    try {
      if (this.type === 'postgresql') {
        const rows = await (this.db as any)
          .select({ c: count() })
          .from(schema.messages)
          .where(
            and(
              eq(schema.messages.roomId, roomId),
              isNull(schema.messages.deletedAt),
              eq(schema.messages.isPrivate, false),
              like(schema.messages.content, pattern)
            )
          );
        return Number(rows?.[0]?.c || 0);
      } else {
        // SQLite has no messages table, so this will return 0
        return 0;
      }
    } catch (error) {
      console.error('Error countSearchRoomMessages:', error);
      return 0;
    }
  }

  async deleteOldRoomMessages(roomId: string, cutoffDate: Date): Promise<number> {
    if (!this.isConnected()) return 0;
    try {
      if (this.type === 'postgresql') {
        const updated = await (this.db as any)
          .update(schema.messages)
          .set({ deletedAt: new Date() })
          .where(
            and(
              eq(schema.messages.roomId, roomId),
              lt(schema.messages.timestamp, cutoffDate as any)
            )
          )
          .returning({ id: schema.messages.id });
        return Array.isArray(updated) ? updated.length : 0;
      } else {
        // SQLite has no messages table, so this will return 0
        return 0;
      }
    } catch (error) {
      console.error('Error deleteOldRoomMessages:', error);
      return 0;
    }
  }

  async getMessageById(messageId: number): Promise<Message | null> {
    if (!this.isConnected()) return null;
    try {
      if (this.type === 'postgresql') {
        const rows = await (this.db as any)
          .select()
          .from(schema.messages)
          .where(eq(schema.messages.id, messageId))
          .limit(1);
        return rows?.[0] || null;
      } else {
        // SQLite has no messages table, so this will return null
        return null;
      }
    } catch (error) {
      console.error('Error getMessageById:', error);
      return null;
    }
  }

  async deleteMessage(messageId: number): Promise<boolean> {
    if (!this.isConnected()) return false;
    try {
      if (this.type === 'postgresql') {
        const updated = await (this.db as any)
          .update(schema.messages)
          .set({ deletedAt: new Date() })
          .where(eq(schema.messages.id, messageId))
          .returning({ id: schema.messages.id });
        return Array.isArray(updated) && updated.length > 0;
      } else {
        // SQLite has no messages table, so this will return false
        return false;
      }
    } catch (error) {
      console.error('Error deleteMessage:', error);
      return false;
    }
  }

  // ===================== Message Reactions =====================
  async upsertMessageReaction(
    messageId: number,
    userId: number,
    type: 'like' | 'dislike' | 'heart'
  ): Promise<{ like: number; dislike: number; heart: number; myReaction: typeof type } | null> {
    if (!this.isConnected()) return null;
    try {
      if (this.type === 'postgresql') {
        // Upsert by (messageId,userId)
        const existing = await (this.db as any)
          .select()
          .from(schema.messageReactions)
          .where(
            and(
              eq(schema.messageReactions.messageId, messageId),
              eq(schema.messageReactions.userId, userId)
            )
          )
          .limit(1);
        if (existing && existing.length > 0) {
          await (this.db as any)
            .update(schema.messageReactions)
            .set({ type, timestamp: new Date() })
            .where(
              and(
                eq(schema.messageReactions.messageId, messageId),
                eq(schema.messageReactions.userId, userId)
              )
            );
        } else {
          await (this.db as any)
            .insert(schema.messageReactions)
            .values({ messageId, userId, type, timestamp: new Date() });
        }

        // Counts per type
        const rows = await (this.db as any)
          .select({ t: schema.messageReactions.type, c: count() })
          .from(schema.messageReactions)
          .where(eq(schema.messageReactions.messageId, messageId))
          .groupBy(schema.messageReactions.type);
        const counts: any = { like: 0, dislike: 0, heart: 0 };
        for (const r of rows || []) counts[r.t as string] = Number(r.c || 0);
        return { ...counts, myReaction: type } as any;
      } else {
        // SQLite
        const existing = await (this.db as any)
          .select()
          .from(schema.messageReactions)
          .where(
            and(
              eq(schema.messageReactions.messageId, messageId),
              eq(schema.messageReactions.userId, userId)
            )
          )
          .limit(1);
        if (existing && existing.length > 0) {
          await (this.db as any)
            .update(schema.messageReactions)
            .set({ type, timestamp: new Date().toISOString() })
            .where(
              and(
                eq(schema.messageReactions.messageId, messageId),
                eq(schema.messageReactions.userId, userId)
              )
            );
        } else {
          await (this.db as any)
            .insert(schema.messageReactions)
            .values({ messageId, userId, type, timestamp: new Date().toISOString() });
        }
        const rows = await (this.db as any)
          .select({ t: schema.messageReactions.type, c: count() })
          .from(schema.messageReactions)
          .where(eq(schema.messageReactions.messageId, messageId))
          .groupBy(schema.messageReactions.type);
        const counts: any = { like: 0, dislike: 0, heart: 0 };
        for (const r of rows || []) counts[r.t as string] = Number(r.c || 0);
        return { ...counts, myReaction: type } as any;
      }
    } catch (error) {
      console.error('Error upsertMessageReaction:', error);
      return null;
    }
  }

  async deleteMessageReaction(
    messageId: number,
    userId: number
  ): Promise<{ like: number; dislike: number; heart: number } | null> {
    if (!this.isConnected()) return null;
    try {
      if (this.type === 'postgresql') {
        await (this.db as any)
          .delete(schema.messageReactions)
          .where(
            and(
              eq(schema.messageReactions.messageId, messageId),
              eq(schema.messageReactions.userId, userId)
            )
          );
        const rows = await (this.db as any)
          .select({ t: schema.messageReactions.type, c: count() })
          .from(schema.messageReactions)
          .where(eq(schema.messageReactions.messageId, messageId))
          .groupBy(schema.messageReactions.type);
        const counts: any = { like: 0, dislike: 0, heart: 0 };
        for (const r of rows || []) counts[r.t as string] = Number(r.c || 0);
        return counts;
      } else {
        await (this.db as any)
          .delete(schema.messageReactions)
          .where(
            and(
              eq(schema.messageReactions.messageId, messageId),
              eq(schema.messageReactions.userId, userId)
            )
          );
        const rows = await (this.db as any)
          .select({ t: schema.messageReactions.type, c: count() })
          .from(schema.messageReactions)
          .where(eq(schema.messageReactions.messageId, messageId))
          .groupBy(schema.messageReactions.type);
        const counts: any = { like: 0, dislike: 0, heart: 0 };
        for (const r of rows || []) counts[r.t as string] = Number(r.c || 0);
        return counts;
      }
    } catch (error) {
      console.error('Error deleteMessageReaction:', error);
      return null;
    }
  }

  async getMessageReactionCounts(
    messageId: number
  ): Promise<{ like: number; dislike: number; heart: number } | null> {
    if (!this.isConnected()) return null;
    try {
      if (this.type === 'postgresql') {
        const rows = await (this.db as any)
          .select({ t: schema.messageReactions.type, c: count() })
          .from(schema.messageReactions)
          .where(eq(schema.messageReactions.messageId, messageId))
          .groupBy(schema.messageReactions.type);
        const counts: any = { like: 0, dislike: 0, heart: 0 };
        for (const r of rows || []) counts[r.t as string] = Number(r.c || 0);
        return counts;
      } else {
        const rows = await (this.db as any)
          .select({ t: schema.messageReactions.type, c: count() })
          .from(schema.messageReactions)
          .where(eq(schema.messageReactions.messageId, messageId))
          .groupBy(schema.messageReactions.type);
        const counts: any = { like: 0, dislike: 0, heart: 0 };
        for (const r of rows || []) counts[r.t as string] = Number(r.c || 0);
        return counts;
      }
    } catch (error) {
      console.error('Error getMessageReactionCounts:', error);
      return null;
    }
  }

  async getUserMessageReaction(
    messageId: number,
    userId: number
  ): Promise<'like' | 'dislike' | 'heart' | null> {
    if (!this.isConnected()) return null;
    try {
      if (this.type === 'postgresql') {
        const rows = await (this.db as any)
          .select({ type: schema.messageReactions.type })
          .from(schema.messageReactions)
          .where(
            and(
              eq(schema.messageReactions.messageId, messageId),
              eq(schema.messageReactions.userId, userId)
            )
          )
          .limit(1);
        return (rows?.[0]?.type as any) || null;
      } else {
        const rows = await (this.db as any)
          .select({ type: schema.messageReactions.type })
          .from(schema.messageReactions)
          .where(
            and(
              eq(schema.messageReactions.messageId, messageId),
              eq(schema.messageReactions.userId, userId)
            )
          )
          .limit(1);
        return (rows?.[0]?.type as any) || null;
      }
    } catch (error) {
      console.error('Error getUserMessageReaction:', error);
      return null;
    }
  }

  // Friend operations
  async sendFriendRequest(userId: number, friendId: number): Promise<Friend | null> {
    if (!this.isConnected()) return null;

    try {
      const friendData = {
        userId,
        friendId,
        status: 'pending',
        createdAt: this.type === 'postgresql' ? new Date() : new Date().toISOString(),
      };

      if (this.type === 'postgresql') {
        const result = await (this.db as any).insert(schema.friends).values(friendData).returning();
        return result[0] || null;
      } else {
        // SQLite has no friends table, so this will return null
        return null;
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      return null;
    }
  }

  async getFriends(userId: number): Promise<Friend[]> {
    if (!this.isConnected()) return [];

    try {
      if (this.type === 'postgresql') {
        return await (this.db as any)
          .select()
          .from(schema.friends)
          .where(
            and(
              or(eq(schema.friends.userId, userId), eq(schema.friends.friendId, userId)),
              eq(schema.friends.status, 'accepted')
            )
          );
      } else {
        // SQLite has no friends table, so this will return empty array
        return [];
      }
    } catch (error) {
      console.error('Error getting friends:', error);
      return [];
    }
  }

  async updateFriendRequest(requestId: number, status: string): Promise<Friend | null> {
    if (!this.isConnected()) return null;

    try {
      if (this.type === 'postgresql') {
        const result = await (this.db as any)
          .update(schema.friends)
          .set({ status })
          .where(eq(schema.friends.id, requestId))
          .returning();
        return result[0] || null;
      } else {
        // SQLite has no friends table, so this will return null
        return null;
      }
    } catch (error) {
      console.error('Error updating friend request:', error);
      return null;
    }
  }

  // Room operations
  async createRoom(roomData: Partial<Room>): Promise<Room | null> {
    if (!this.isConnected()) return null;

    try {
      // Generate stable id/slug for PostgreSQL schema (id is text PK, no default)
      let generatedId: string | number | undefined = roomData.id;
      let generatedSlug: string | undefined = (roomData as any).slug as any;

      const genSlug = (name?: string) => {
        try {
          const base = (name || 'room')
            .toString()
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s-]+/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .toLowerCase();
          return base || 'room';
        } catch {
          return 'room';
        }
      };

      const genId = (name?: string) => {
        const slugPart = genSlug(name);
        const suffix = Math.random().toString(36).slice(2, 8);
        return `${slugPart}-${suffix}`;
      };

      if (this.type === 'postgresql') {
        if (!generatedId || generatedId === (undefined as any)) {
          generatedId = genId(roomData.name as any);
        }
        if (!generatedSlug || generatedSlug === (undefined as any)) {
          generatedSlug = genSlug(roomData.name as any);
        }
      }

      const room = {
        ...roomData,
        id: generatedId ?? roomData.id, // SQLite will ignore if numeric auto-increment is used elsewhere
        // Defaults for PG schema columns
        speakers: roomData.speakers ?? (this.type === 'postgresql' ? '[]' : roomData.speakers),
        micQueue: roomData.micQueue ?? (this.type === 'postgresql' ? '[]' : roomData.micQueue),
        createdAt: this.type === 'postgresql' ? new Date() : new Date().toISOString(),
        updatedAt: this.type === 'postgresql' ? new Date() : new Date().toISOString(),
        ...(this.type === 'postgresql' ? { slug: generatedSlug } : {}),
      } as any;

      if (this.type === 'postgresql') {
        const result = await (this.db as any).insert(schema.rooms).values(room).returning();
        return result[0] || null;
      } else {
        // SQLite has no rooms table, so this will return null
        return null;
      }
    } catch (error) {
      console.error('Error creating room:', error);
      return null;
    }
  }

  async getRooms(): Promise<Room[]> {
    if (!this.isConnected()) return [];

    try {
      if (this.type === 'postgresql') {
        // ignore soft-deleted rooms when column exists
        return await (this.db as any)
          .select()
          .from(schema.rooms)
          .where(isNull(schema.rooms.deletedAt))
          .orderBy(asc(schema.rooms.name));
      } else {
        // SQLite has no rooms table, so this will return empty array
        return [];
      }
    } catch (error) {
      console.error('Error getting rooms:', error);
      return [];
    }
  }

  // Fetch single room by id
  async getRoomById(roomId: string): Promise<Room | null> {
    if (!this.isConnected()) return null;

    try {
      if (this.type === 'postgresql') {
        const rows = await (this.db as any)
          .select()
          .from(schema.rooms)
          .where(and(eq(schema.rooms.id, roomId), isNull(schema.rooms.deletedAt)))
          .limit(1);
        return rows[0] || null;
      } else {
        // SQLite uses numeric id; try to parse and fetch
        const maybeId = Number(roomId);
        if (!Number.isFinite(maybeId)) return null;
        // SQLite has no rooms table, so this will return null
        return null;
      }
    } catch (error) {
      console.error('Error getting room by id:', error);
      return null;
    }
  }

  // Soft-delete in PostgreSQL, hard-delete in SQLite
  async deleteRoom(roomId: string): Promise<boolean> {
    if (!this.isConnected()) return false;

    try {
      if (this.type === 'postgresql') {
        await (this.db as any)
          .update(schema.rooms)
          .set({ deletedAt: new Date() })
          .where(eq(schema.rooms.id, roomId));
        return true;
      } else {
        // SQLite has no rooms table, so this will return false
        return false;
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      return false;
    }
  }

  // Update specific room fields (e.g., icon) by id
  async updateRoomById(roomId: string, updates: Partial<Room>): Promise<Room | null> {
    if (!this.isConnected()) return null;

    try {
      if (this.type === 'postgresql') {
        // Build a minimal updates object allowed in PG schema
        const allowed: any = {};
        if (typeof updates.name === 'string') allowed.name = updates.name;
        if (typeof updates.description === 'string') allowed.description = updates.description;
        if (typeof (updates as any).icon === 'string') allowed.icon = (updates as any).icon;
        if (typeof (updates as any).isActive === 'boolean')
          allowed.isActive = (updates as any).isActive;
        if (typeof (updates as any).isBroadcast === 'boolean')
          allowed.isBroadcast = (updates as any).isBroadcast;
        if (typeof (updates as any).hostId !== 'undefined')
          allowed.hostId = (updates as any).hostId;
        if (Object.keys(allowed).length === 0) {
          // Nothing to update
          const row = await this.getRoomById(roomId);
          return row;
        }
        const result = await (this.db as any)
          .update(schema.rooms)
          .set(allowed)
          .where(eq(schema.rooms.id, roomId))
          .returning();
        return result[0] || null;
      } else {
        // SQLite schema may not contain icon; update what exists
        const allowed: any = {};
        if (typeof updates.name === 'string') allowed.name = updates.name;
        if (typeof updates.description === 'string') allowed.description = updates.description;
        if (Object.keys(allowed).length === 0) {
          const rows = await this.getRoomById(roomId);
          return rows;
        }
        const maybeId = Number(roomId);
        if (!Number.isFinite(maybeId)) return null;
        // SQLite has no rooms table, so this will return null
        return null;
      }
    } catch (error) {
      console.error('Error updating room:', error);
      return null;
    }
  }

  // Helper: check room membership and moderation status
  async canSendInRoom(
    roomId: string,
    userId: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (!this.isConnected()) return { allowed: true };

    try {
      if (this.type === 'postgresql') {
        // Bind parameters correctly and return a count for robust checking
        const result = await (this.db as any).execute(sql`SELECT count(*)::int AS c
          FROM room_members rm
          JOIN rooms r ON r.id = rm.room_id AND (r.deleted_at IS NULL)
          WHERE rm.room_id = ${roomId} AND rm.user_id = ${userId}
            AND (rm.banned_until IS NULL OR rm.banned_until < now())
            AND (rm.muted_until  IS NULL OR rm.muted_until  < now())`);
        const countVal = (result?.rows?.[0]?.c ?? result?.[0]?.c ?? 0) as number;
        return { allowed: Number(countVal) > 0 };
      }
      // SQLite has no per-room moderation implemented
      return { allowed: true };
    } catch (error) {
      console.error('Error canSendInRoom:', error);
      return { allowed: false, reason: 'error' };
    }
  }

  // Blocked devices operations
  async getBlockedDevices(): Promise<BlockedDevice[]> {
    if (!this.isConnected()) return [];

    try {
      if (this.type === 'postgresql') {
        return await (this.db as any)
          .select()
          .from(schema.blockedDevices)
          .orderBy(desc(schema.blockedDevices.blockedAt));
      } else {
        // SQLite has no blockedDevices table, so this will return empty array
        return [];
      }
    } catch (error) {
      console.error('Error getting blocked devices:', error);
      return [];
    }
  }

  async createBlockedDevice(data: Partial<BlockedDevice>): Promise<BlockedDevice | null> {
    if (!this.isConnected()) return null;

    try {
      if (this.type === 'postgresql') {
        const payload = {
          ipAddress: data.ipAddress!,
          deviceId: data.deviceId!,
          userId: data.userId!,
          reason: data.reason || 'unspecified',
          blockedAt: data.blockedAt instanceof Date ? data.blockedAt : new Date(),
          blockedBy: data.blockedBy!,
        } as any;
        const result = await (this.db as any)
          .insert(schema.blockedDevices)
          .values(payload)
          .returning();
        return result[0] || null;
      } else {
        // SQLite has no blockedDevices table, so this will return null
        return null;
      }
    } catch (error) {
      console.error('Error creating blocked device:', error);
      return null;
    }
  }

  async deleteBlockedDevice(userId: number): Promise<boolean> {
    if (!this.isConnected()) return false;

    try {
      if (this.type === 'postgresql') {
        await (this.db as any)
          .delete(schema.blockedDevices)
          .where(eq(schema.blockedDevices.userId, userId));
      } else {
        // SQLite has no blockedDevices table, so this will return false
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error deleting blocked device:', error);
      return false;
    }
  }

  // Notification operations
  async createNotification(notificationData: Partial<Notification>): Promise<Notification | null> {
    if (!this.isConnected()) return null;

    try {
      const notification = {
        ...notificationData,
        createdAt: this.type === 'postgresql' ? new Date() : new Date().toISOString(),
      };

      if (this.type === 'postgresql') {
        const result = await (this.db as any)
          .insert(schema.notifications)
          .values(notification)
          .returning();
        return result[0] || null;
      } else {
        // SQLite has no notifications table, so this will return null
        return null;
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    if (!this.isConnected()) return [];

    try {
      if (this.type === 'postgresql') {
        return await (this.db as any)
          .select()
          .from(schema.notifications)
          .where(eq(schema.notifications.userId, userId))
          .orderBy(desc(schema.notifications.createdAt));
      } else {
        // SQLite has no notifications table, so this will return empty array
        return [];
      }
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  // Utility methods
  async getStats(): Promise<{ users: number; messages: number; onlineUsers: number }> {
    if (!this.isConnected()) return { users: 0, messages: 0, onlineUsers: 0 };

    try {
      const stats = { users: 0, messages: 0, onlineUsers: 0 };

      if (this.type === 'postgresql') {
        const userCount = await (this.db as any).select({ count: count() }).from(schema.users);
        const messageCount = await (this.db as any)
          .select({ count: count() })
          .from(schema.messages);
        const onlineCount = await (this.db as any)
          .select({ count: count() })
          .from(schema.users)
          .where(eq(schema.users.isOnline, true));

        stats.users = userCount[0]?.count || 0;
        stats.messages = messageCount[0]?.count || 0;
        stats.onlineUsers = onlineCount[0]?.count || 0;
      } else {
        // SQLite has no users table, so this will return 0
        stats.users = 0;
        stats.messages = 0;
        stats.onlineUsers = 0;
      }

      return stats;
    } catch (error) {
      console.error('Error getting stats:', error);
      return { users: 0, messages: 0, onlineUsers: 0 };
    }
  }

  // Status method
  getStatus() {
    return {
      connected: this.isConnected(),
      type: this.type,
      adapter: dbType,
    };
  }

  // ===== Site Settings operations =====
  async getSiteTheme(): Promise<string> {
    if (!this.isConnected()) return 'default';
    try {
      if (this.type === 'postgresql') {
        const rows = await (this.db as any).select().from(schema.siteSettings).limit(1);
        if (rows && rows.length > 0) return rows[0].siteTheme || 'default';
        const [inserted] = await (this.db as any)
          .insert(schema.siteSettings)
          .values({ siteTheme: 'default' })
          .returning();
        return inserted?.siteTheme || 'default';
      } else {
        // SQLite has no siteSettings table, so this will return 'default'
        return 'default';
      }
    } catch (e) {
      return 'default';
    }
  }

  async setSiteTheme(themeId: string): Promise<string> {
    if (!this.isConnected()) return 'default';
    try {
      if (this.type === 'postgresql') {
        const rows = await (this.db as any).select().from(schema.siteSettings).limit(1);
        if (rows && rows.length > 0) {
          const [updated] = await (this.db as any)
            .update(schema.siteSettings)
            .set({ siteTheme: themeId, updatedAt: new Date() })
            .where(eq(schema.siteSettings.id as any, rows[0].id))
            .returning();
          return updated?.siteTheme || themeId;
        }
        const [inserted] = await (this.db as any)
          .insert(schema.siteSettings)
          .values({ siteTheme: themeId })
          .returning();
        return inserted?.siteTheme || themeId;
      } else {
        // SQLite has no siteSettings table, so this will return 'default'
        return 'default';
      }
    } catch (e) {
      return themeId || 'default';
    }
  }
}

// Export the database service for direct access if needed
export const databaseService = new DatabaseService();
