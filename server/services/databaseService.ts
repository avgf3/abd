import { sql, eq, desc, asc, and, or, like, count, isNull, gte, lt, inArray } from 'drizzle-orm';

import * as pgSchema from '../../shared/schema';
import * as sqliteSchema from '../../shared/sqlite-schema';
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
          .from(pgSchema.users)
          .where(eq(pgSchema.users.id, id))
          .limit(1);
        return result[0] || null;
      } else {
        const result = await (this.db as any)
          .select()
          .from(sqliteSchema.users)
          .where(eq(sqliteSchema.users.id, id))
          .limit(1);
        return result[0] || null;
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
          .from(pgSchema.users)
          .where(eq(pgSchema.users.username, username))
          .limit(1);
        return result[0] || null;
      } else {
        const result = await (this.db as any)
          .select()
          .from(sqliteSchema.users)
          .where(eq(sqliteSchema.users.username, username))
          .limit(1);
        return result[0] || null;
      }
    } catch (error) {
      console.error('Error getting user by username:', error);
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
          .from(pgSchema.users)
          .where(inArray(pgSchema.users.id, uniqueIds));
      } else {
        return await (this.db as any)
          .select()
          .from(sqliteSchema.users)
          .where(inArray(sqliteSchema.users.id, uniqueIds));
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
        const result = await (this.db as any)
          .insert(pgSchema.users)
          .values({
            ...userData,
            joinDate: userData.joinDate || new Date(),
            createdAt: userData.createdAt || new Date(),
            lastSeen: userData.lastSeen || new Date(),
          })
          .returning();
        return result[0] || null;
      } else {
        const result = await (this.db as any).insert(sqliteSchema.users).values({
          ...userData,
          joinDate: userData.joinDate || new Date().toISOString(),
          createdAt: userData.createdAt || new Date().toISOString(),
          lastSeen: userData.lastSeen || new Date().toISOString(),
        });
        // For SQLite, get the created user by ID
        if (result.lastInsertRowid) {
          return await this.getUserById(Number(result.lastInsertRowid));
        }
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
          .update(pgSchema.users)
          .set(updates)
          .where(eq(pgSchema.users.id, id))
          .returning();
        return result[0] || null;
      } else {
        await (this.db as any)
          .update(sqliteSchema.users)
          .set(updates)
          .where(eq(sqliteSchema.users.id, id));
        return await this.getUserById(id);
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
        await (this.db as any).insert(pgSchema.pointsHistory).values({
          userId,
          points,
          reason,
          action,
          createdAt: new Date(),
        });
      } else {
        await (this.db as any).insert(sqliteSchema.pointsHistory).values({
          userId,
          points,
          reason,
          action,
          createdAt: new Date().toISOString(),
        });
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
          .from(pgSchema.pointsHistory)
          .where(eq(pgSchema.pointsHistory.userId, userId))
          .orderBy(desc(pgSchema.pointsHistory.createdAt))
          .limit(limit);
      } else {
        return await (this.db as any)
          .select()
          .from(sqliteSchema.pointsHistory)
          .where(eq(sqliteSchema.pointsHistory.userId, userId))
          .orderBy(desc(sqliteSchema.pointsHistory.createdAt))
          .limit(limit);
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
          .from(pgSchema.pointsHistory)
          .where(
            and(
              eq(pgSchema.pointsHistory.userId, userId),
              eq(pgSchema.pointsHistory.reason, reason)
            )
          )
          .orderBy(desc(pgSchema.pointsHistory.createdAt))
          .limit(1);
        return rows[0] || null;
      } else {
        const rows = await (this.db as any)
          .select()
          .from(sqliteSchema.pointsHistory)
          .where(
            and(
              eq(sqliteSchema.pointsHistory.userId, userId),
              eq(sqliteSchema.pointsHistory.reason, reason)
            )
          )
          .orderBy(desc(sqliteSchema.pointsHistory.createdAt))
          .limit(1);
        return rows[0] || null;
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
          .from(pgSchema.messages)
          .where(eq(pgSchema.messages.senderId, userId));
        return Number(rows?.[0]?.c || 0);
      } else {
        const rows = await (this.db as any)
          .select({ c: count() })
          .from(sqliteSchema.messages)
          .where(eq(sqliteSchema.messages.senderId, userId));
        return Number(rows?.[0]?.c || 0);
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
          .from(pgSchema.users)
          .orderBy(desc(pgSchema.users.totalPoints))
          .limit(limit);
      } else {
        return await (this.db as any)
          .select()
          .from(sqliteSchema.users)
          .orderBy(desc(sqliteSchema.users.totalPoints))
          .limit(limit);
      }
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
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
          .from(pgSchema.users)
          .orderBy(desc(pgSchema.users.joinDate));
      } else {
        return await (this.db as any)
          .select()
          .from(sqliteSchema.users)
          .orderBy(desc(sqliteSchema.users.joinDate));
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
          .from(pgSchema.users)
          .orderBy(desc(pgSchema.users.joinDate))
          .limit(safeLimit)
          .offset(safeOffset);
        if (search && search.trim()) {
          const pattern = `%${search.trim()}%`;
          return await (this.db as any)
            .select()
            .from(pgSchema.users)
            .where(like(pgSchema.users.username, pattern))
            .orderBy(desc(pgSchema.users.joinDate))
            .limit(safeLimit)
            .offset(safeOffset);
        }
        return await base;
      } else {
        const base = (this.db as any)
          .select()
          .from(sqliteSchema.users)
          .orderBy(desc(sqliteSchema.users.joinDate))
          .limit(safeLimit)
          .offset(safeOffset);
        if (search && search.trim()) {
          const pattern = `%${search.trim()}%`;
          return await (this.db as any)
            .select()
            .from(sqliteSchema.users)
            .where(like(sqliteSchema.users.username, pattern))
            .orderBy(desc(sqliteSchema.users.joinDate))
            .limit(safeLimit)
            .offset(safeOffset);
        }
        return await base;
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
            .from(pgSchema.users)
            .where(like(pgSchema.users.username, pattern));
          return Number(rows?.[0]?.c || 0);
        }
        const rows = await (this.db as any).select({ c: count() }).from(pgSchema.users);
        return Number(rows?.[0]?.c || 0);
      } else {
        if (search && search.trim()) {
          const pattern = `%${search.trim()}%`;
          const rows = await (this.db as any)
            .select({ c: count() })
            .from(sqliteSchema.users)
            .where(like(sqliteSchema.users.username, pattern));
          return Number(rows?.[0]?.c || 0);
        }
        const rows = await (this.db as any).select({ c: count() }).from(sqliteSchema.users);
        return Number(rows?.[0]?.c || 0);
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
          .from(pgSchema.users)
          .where(and(eq(pgSchema.users.isOnline, true), eq(pgSchema.users.isHidden, false)));
      } else {
        return await (this.db as any)
          .select()
          .from(sqliteSchema.users)
          .where(
            and(eq(sqliteSchema.users.isOnline, true), eq(sqliteSchema.users.isHidden, false))
          );
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
        const rows = await (this.db as any).execute(
          sql`SELECT u.id, u.username, u.user_type as "userType", u.role, u.profile_image as "profileImage", u.is_online as "isOnline", u.last_seen as "lastSeen", u.points, u.level, u.total_points as "totalPoints"
              FROM users u
              JOIN vip_users v ON v.user_id = u.id
              ORDER BY u.total_points DESC NULLS LAST, u.username ASC
              LIMIT ${Math.min(100, Math.max(1, limit))}`
        );
        return Array.isArray(rows) ? (rows as any) : [];
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
        await (this.db as any).execute(
          sql`INSERT INTO vip_users (user_id, created_by) VALUES (${targetUserId}, ${createdBy || null})
              ON CONFLICT (user_id) DO NOTHING`
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error addVipUser:', error);
      return false;
    }
  }

  async removeVipUser(targetUserId: number): Promise<boolean> {
    if (!this.isConnected() || !targetUserId) return false;
    try {
      if (this.type === 'postgresql') {
        await (this.db as any).execute(sql`DELETE FROM vip_users WHERE user_id = ${targetUserId}`);
        return true;
      }
      return false;
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
          .select()
          .from(pgSchema.users)
          .where(
            or(eq(pgSchema.users.userType, 'owner' as any), eq(pgSchema.users.userType, 'admin' as any))
          )
          .orderBy(asc(pgSchema.users.userType), asc(pgSchema.users.username as any))
          .limit(Math.min(200, Math.max(1, limit)));
      }
      return [];
    } catch (error) {
      console.error('Error getVipCandidates:', error);
      return [];
    }
  }

  // Message operations
  async createMessage(messageData: Partial<Message>): Promise<Message | null> {
    if (!this.isConnected()) return null;

    try {
      if (this.type === 'postgresql') {
        const result = await (this.db as any)
          .insert(pgSchema.messages)
          .values({
            ...messageData,
            timestamp: messageData.timestamp || new Date(),
          })
          .returning();
        return result[0] || null;
      } else {
        const result = await (this.db as any).insert(sqliteSchema.messages).values({
          ...messageData,
          timestamp: messageData.timestamp || new Date().toISOString(),
        });
        // For SQLite, we need to get the message by ID
        if (result.lastInsertRowid) {
          const messages = await (this.db as any)
            .select()
            .from(sqliteSchema.messages)
            .where(eq(sqliteSchema.messages.id, Number(result.lastInsertRowid)))
            .limit(1);
          return messages[0] || null;
        }
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
          .from(pgSchema.messages)
          .where(
            and(
              eq(pgSchema.messages.roomId, roomId),
              isNull(pgSchema.messages.deletedAt),
              eq(pgSchema.messages.isPrivate, false)
            )
          )
          .orderBy(desc(pgSchema.messages.timestamp))
          .limit(limit)
          .offset(offset);
      } else {
        return await (this.db as any)
          .select()
          .from(sqliteSchema.messages)
          .where(
            and(
              eq(sqliteSchema.messages.roomId, roomId),
              eq(sqliteSchema.messages.isPrivate, false)
            )
          )
          .orderBy(desc(sqliteSchema.messages.timestamp))
          .limit(limit)
          .offset(offset);
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
          .from(pgSchema.messages)
          .where(
            and(
              eq(pgSchema.messages.isPrivate, true),
              or(
                and(
                  eq(pgSchema.messages.senderId, userId1),
                  eq(pgSchema.messages.receiverId, userId2)
                ),
                and(
                  eq(pgSchema.messages.senderId, userId2),
                  eq(pgSchema.messages.receiverId, userId1)
                )
              )
            )
          )
          .orderBy(desc(pgSchema.messages.timestamp))
          .limit(limit);
      } else {
        return await (this.db as any)
          .select()
          .from(sqliteSchema.messages)
          .where(
            and(
              eq(sqliteSchema.messages.isPrivate, true),
              or(
                and(
                  eq(sqliteSchema.messages.senderId, userId1),
                  eq(sqliteSchema.messages.receiverId, userId2)
                ),
                and(
                  eq(sqliteSchema.messages.senderId, userId2),
                  eq(sqliteSchema.messages.receiverId, userId1)
                )
              )
            )
          )
          .orderBy(desc(sqliteSchema.messages.timestamp))
          .limit(limit);
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
          .from(pgSchema.messages)
          .where(applyWhere(pgSchema.messages))
          .orderBy(desc(pgSchema.messages.timestamp))
          .limit(limit);
      } else {
        return await (this.db as any)
          .select()
          .from(sqliteSchema.messages)
          .where(applyWhere(sqliteSchema.messages))
          .orderBy(desc(sqliteSchema.messages.timestamp))
          .limit(limit);
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
          .from(pgSchema.messages)
          .where(
            and(
              eq(pgSchema.messages.roomId, roomId),
              isNull(pgSchema.messages.deletedAt),
              eq(pgSchema.messages.isPrivate, false)
            )
          );
        return Number(rows?.[0]?.c || 0);
      } else {
        const rows = await (this.db as any)
          .select({ c: count() })
          .from(sqliteSchema.messages)
          .where(
            and(
              eq(sqliteSchema.messages.roomId, roomId),
              eq(sqliteSchema.messages.isPrivate, false)
            )
          );
        return Number(rows?.[0]?.c || 0);
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
          .from(pgSchema.messages)
          .where(
            and(
              eq(pgSchema.messages.roomId, roomId),
              isNull(pgSchema.messages.deletedAt),
              eq(pgSchema.messages.isPrivate, false),
              gte(pgSchema.messages.timestamp, since as any)
            )
          );
        return Number(rows?.[0]?.c || 0);
      } else {
        const sinceIso = since.toISOString();
        const rows = await (this.db as any)
          .select({ c: count() })
          .from(sqliteSchema.messages)
          .where(
            and(
              eq(sqliteSchema.messages.roomId, roomId),
              eq(sqliteSchema.messages.isPrivate, false),
              sql`${sqliteSchema.messages.timestamp} >= ${sinceIso}`
            )
          );
        return Number(rows?.[0]?.c || 0);
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
          .select({ c: sql<number>`count(distinct ${pgSchema.messages.senderId})` })
          .from(pgSchema.messages)
          .where(
            and(
              eq(pgSchema.messages.roomId, roomId),
              isNull(pgSchema.messages.deletedAt),
              eq(pgSchema.messages.isPrivate, false),
              gte(pgSchema.messages.timestamp, since as any)
            )
          );
        return Number(rows?.[0]?.c || 0);
      } else {
        const sinceIso = since.toISOString();
        const rows = await (this.db as any)
          .select({ c: sql<number>`count(distinct ${sqliteSchema.messages.senderId})` })
          .from(sqliteSchema.messages)
          .where(
            and(
              eq(sqliteSchema.messages.roomId, roomId),
              eq(sqliteSchema.messages.isPrivate, false),
              sql`${sqliteSchema.messages.timestamp} >= ${sinceIso}`
            )
          );
        return Number(rows?.[0]?.c || 0);
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
          .from(pgSchema.messages)
          .where(
            and(
              eq(pgSchema.messages.roomId, roomId),
              isNull(pgSchema.messages.deletedAt),
              eq(pgSchema.messages.isPrivate, false)
            )
          )
          .orderBy(desc(pgSchema.messages.timestamp))
          .limit(1);
        return rows?.[0] || null;
      } else {
        const rows = await (this.db as any)
          .select()
          .from(sqliteSchema.messages)
          .where(
            and(
              eq(sqliteSchema.messages.roomId, roomId),
              eq(sqliteSchema.messages.isPrivate, false)
            )
          )
          .orderBy(desc(sqliteSchema.messages.timestamp))
          .limit(1);
        return rows?.[0] || null;
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
          .from(pgSchema.messages)
          .where(
            and(
              eq(pgSchema.messages.roomId, roomId),
              isNull(pgSchema.messages.deletedAt),
              eq(pgSchema.messages.isPrivate, false),
              like(pgSchema.messages.content, pattern)
            )
          )
          .orderBy(desc(pgSchema.messages.timestamp))
          .limit(limit)
          .offset(offset);
      } else {
        return await (this.db as any)
          .select()
          .from(sqliteSchema.messages)
          .where(
            and(
              eq(sqliteSchema.messages.roomId, roomId),
              eq(sqliteSchema.messages.isPrivate, false),
              like(sqliteSchema.messages.content, pattern)
            )
          )
          .orderBy(desc(sqliteSchema.messages.timestamp))
          .limit(limit)
          .offset(offset);
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
          .from(pgSchema.messages)
          .where(
            and(
              eq(pgSchema.messages.roomId, roomId),
              isNull(pgSchema.messages.deletedAt),
              eq(pgSchema.messages.isPrivate, false),
              like(pgSchema.messages.content, pattern)
            )
          );
        return Number(rows?.[0]?.c || 0);
      } else {
        const rows = await (this.db as any)
          .select({ c: count() })
          .from(sqliteSchema.messages)
          .where(
            and(
              eq(sqliteSchema.messages.roomId, roomId),
              eq(sqliteSchema.messages.isPrivate, false),
              like(sqliteSchema.messages.content, pattern)
            )
          );
        return Number(rows?.[0]?.c || 0);
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
          .update(pgSchema.messages)
          .set({ deletedAt: new Date() })
          .where(
            and(
              eq(pgSchema.messages.roomId, roomId),
              lt(pgSchema.messages.timestamp, cutoffDate as any)
            )
          )
          .returning({ id: pgSchema.messages.id });
        return Array.isArray(updated) ? updated.length : 0;
      } else {
        const cutoffIso = cutoffDate.toISOString();
        const deleted = await (this.db as any)
          .delete(sqliteSchema.messages)
          .where(
            and(
              eq(sqliteSchema.messages.roomId, roomId),
              sql`${sqliteSchema.messages.timestamp} < ${cutoffIso}`
            )
          );
        // Drizzle for SQLite returns number of changes on run/run? Fallback to 0 if unknown
        // Attempt to read changes count if available
        return Number((deleted?.rowsAffected ?? deleted?.changes ?? 0) as any);
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
          .from(pgSchema.messages)
          .where(eq(pgSchema.messages.id, messageId))
          .limit(1);
        return rows?.[0] || null;
      } else {
        const rows = await (this.db as any)
          .select()
          .from(sqliteSchema.messages)
          .where(eq(sqliteSchema.messages.id, messageId))
          .limit(1);
        return rows?.[0] || null;
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
          .update(pgSchema.messages)
          .set({ deletedAt: new Date() })
          .where(eq(pgSchema.messages.id, messageId))
          .returning({ id: pgSchema.messages.id });
        return Array.isArray(updated) && updated.length > 0;
      } else {
        const deleted = await (this.db as any)
          .delete(sqliteSchema.messages)
          .where(eq(sqliteSchema.messages.id, messageId));
        return Boolean((deleted?.rowsAffected ?? deleted?.changes ?? 0) > 0);
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
          .from(pgSchema.messageReactions)
          .where(
            and(
              eq(pgSchema.messageReactions.messageId, messageId),
              eq(pgSchema.messageReactions.userId, userId)
            )
          )
          .limit(1);
        if (existing && existing.length > 0) {
          await (this.db as any)
            .update(pgSchema.messageReactions)
            .set({ type, timestamp: new Date() })
            .where(
              and(
                eq(pgSchema.messageReactions.messageId, messageId),
                eq(pgSchema.messageReactions.userId, userId)
              )
            );
        } else {
          await (this.db as any)
            .insert(pgSchema.messageReactions)
            .values({ messageId, userId, type, timestamp: new Date() });
        }

        // Counts per type
        const rows = await (this.db as any)
          .select({ t: pgSchema.messageReactions.type, c: count() })
          .from(pgSchema.messageReactions)
          .where(eq(pgSchema.messageReactions.messageId, messageId))
          .groupBy(pgSchema.messageReactions.type);
        const counts: any = { like: 0, dislike: 0, heart: 0 };
        for (const r of rows || []) counts[r.t as string] = Number(r.c || 0);
        return { ...counts, myReaction: type } as any;
      } else {
        // SQLite
        const existing = await (this.db as any)
          .select()
          .from(sqliteSchema.messageReactions)
          .where(
            and(
              eq(sqliteSchema.messageReactions.messageId, messageId),
              eq(sqliteSchema.messageReactions.userId, userId)
            )
          )
          .limit(1);
        if (existing && existing.length > 0) {
          await (this.db as any)
            .update(sqliteSchema.messageReactions)
            .set({ type, timestamp: new Date().toISOString() })
            .where(
              and(
                eq(sqliteSchema.messageReactions.messageId, messageId),
                eq(sqliteSchema.messageReactions.userId, userId)
              )
            );
        } else {
          await (this.db as any)
            .insert(sqliteSchema.messageReactions)
            .values({ messageId, userId, type, timestamp: new Date().toISOString() });
        }
        const rows = await (this.db as any)
          .select({ t: sqliteSchema.messageReactions.type, c: count() })
          .from(sqliteSchema.messageReactions)
          .where(eq(sqliteSchema.messageReactions.messageId, messageId))
          .groupBy(sqliteSchema.messageReactions.type);
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
          .delete(pgSchema.messageReactions)
          .where(
            and(
              eq(pgSchema.messageReactions.messageId, messageId),
              eq(pgSchema.messageReactions.userId, userId)
            )
          );
        const rows = await (this.db as any)
          .select({ t: pgSchema.messageReactions.type, c: count() })
          .from(pgSchema.messageReactions)
          .where(eq(pgSchema.messageReactions.messageId, messageId))
          .groupBy(pgSchema.messageReactions.type);
        const counts: any = { like: 0, dislike: 0, heart: 0 };
        for (const r of rows || []) counts[r.t as string] = Number(r.c || 0);
        return counts;
      } else {
        await (this.db as any)
          .delete(sqliteSchema.messageReactions)
          .where(
            and(
              eq(sqliteSchema.messageReactions.messageId, messageId),
              eq(sqliteSchema.messageReactions.userId, userId)
            )
          );
        const rows = await (this.db as any)
          .select({ t: sqliteSchema.messageReactions.type, c: count() })
          .from(sqliteSchema.messageReactions)
          .where(eq(sqliteSchema.messageReactions.messageId, messageId))
          .groupBy(sqliteSchema.messageReactions.type);
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
          .select({ t: pgSchema.messageReactions.type, c: count() })
          .from(pgSchema.messageReactions)
          .where(eq(pgSchema.messageReactions.messageId, messageId))
          .groupBy(pgSchema.messageReactions.type);
        const counts: any = { like: 0, dislike: 0, heart: 0 };
        for (const r of rows || []) counts[r.t as string] = Number(r.c || 0);
        return counts;
      } else {
        const rows = await (this.db as any)
          .select({ t: sqliteSchema.messageReactions.type, c: count() })
          .from(sqliteSchema.messageReactions)
          .where(eq(sqliteSchema.messageReactions.messageId, messageId))
          .groupBy(sqliteSchema.messageReactions.type);
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
          .select({ type: pgSchema.messageReactions.type })
          .from(pgSchema.messageReactions)
          .where(
            and(
              eq(pgSchema.messageReactions.messageId, messageId),
              eq(pgSchema.messageReactions.userId, userId)
            )
          )
          .limit(1);
        return (rows?.[0]?.type as any) || null;
      } else {
        const rows = await (this.db as any)
          .select({ type: sqliteSchema.messageReactions.type })
          .from(sqliteSchema.messageReactions)
          .where(
            and(
              eq(sqliteSchema.messageReactions.messageId, messageId),
              eq(sqliteSchema.messageReactions.userId, userId)
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
        const result = await (this.db as any)
          .insert(pgSchema.friends)
          .values(friendData)
          .returning();
        return result[0] || null;
      } else {
        const result = await (this.db as any).insert(sqliteSchema.friends).values(friendData);
        if (result.lastInsertRowid) {
          const friends = await (this.db as any)
            .select()
            .from(sqliteSchema.friends)
            .where(eq(sqliteSchema.friends.id, Number(result.lastInsertRowid)))
            .limit(1);
          return friends[0] || null;
        }
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
          .from(pgSchema.friends)
          .where(
            and(
              or(eq(pgSchema.friends.userId, userId), eq(pgSchema.friends.friendId, userId)),
              eq(pgSchema.friends.status, 'accepted')
            )
          );
      } else {
        return await (this.db as any)
          .select()
          .from(sqliteSchema.friends)
          .where(
            and(
              or(
                eq(sqliteSchema.friends.userId, userId),
                eq(sqliteSchema.friends.friendId, userId)
              ),
              eq(sqliteSchema.friends.status, 'accepted')
            )
          );
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
          .update(pgSchema.friends)
          .set({ status })
          .where(eq(pgSchema.friends.id, requestId))
          .returning();
        return result[0] || null;
      } else {
        await (this.db as any)
          .update(sqliteSchema.friends)
          .set({ status })
          .where(eq(sqliteSchema.friends.id, requestId));

        const friends = await (this.db as any)
          .select()
          .from(sqliteSchema.friends)
          .where(eq(sqliteSchema.friends.id, requestId))
          .limit(1);
        return friends[0] || null;
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
        const result = await (this.db as any).insert(pgSchema.rooms).values(room).returning();
        return result[0] || null;
      } else {
        const result = await (this.db as any).insert(sqliteSchema.rooms).values(room);
        if (result.lastInsertRowid) {
          const rooms = await (this.db as any)
            .select()
            .from(sqliteSchema.rooms)
            .where(eq(sqliteSchema.rooms.id, Number(result.lastInsertRowid)))
            .limit(1);
          return rooms[0] || null;
        }
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
          .from(pgSchema.rooms)
          .where(isNull(pgSchema.rooms.deletedAt))
          .orderBy(asc(pgSchema.rooms.name));
      } else {
        return await (this.db as any)
          .select()
          .from(sqliteSchema.rooms)
          .orderBy(asc(sqliteSchema.rooms.name));
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
          .from(pgSchema.rooms)
          .where(and(eq(pgSchema.rooms.id, roomId), isNull(pgSchema.rooms.deletedAt)))
          .limit(1);
        return rows[0] || null;
      } else {
        // SQLite uses numeric id; try to parse and fetch
        const maybeId = Number(roomId);
        if (!Number.isFinite(maybeId)) return null;
        const rows = await (this.db as any)
          .select()
          .from(sqliteSchema.rooms)
          .where(eq(sqliteSchema.rooms.id, maybeId))
          .limit(1);
        return rows[0] || null;
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
          .update(pgSchema.rooms)
          .set({ deletedAt: new Date() })
          .where(eq(pgSchema.rooms.id, roomId));
        return true;
      } else {
        const maybeId = Number(roomId);
        if (!Number.isFinite(maybeId)) return false;
        await (this.db as any).delete(sqliteSchema.rooms).where(eq(sqliteSchema.rooms.id, maybeId));
        return true;
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
          .update(pgSchema.rooms)
          .set(allowed)
          .where(eq(pgSchema.rooms.id, roomId))
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
        await (this.db as any)
          .update(sqliteSchema.rooms)
          .set(allowed)
          .where(eq(sqliteSchema.rooms.id, maybeId));
        const rows = await (this.db as any)
          .select()
          .from(sqliteSchema.rooms)
          .where(eq(sqliteSchema.rooms.id, maybeId))
          .limit(1);
        return rows[0] || null;
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
          .from(pgSchema.blockedDevices)
          .orderBy(desc(pgSchema.blockedDevices.blockedAt));
      } else {
        return await (this.db as any).select().from(sqliteSchema.blockedDevices);
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
          .insert(pgSchema.blockedDevices)
          .values(payload)
          .returning();
        return result[0] || null;
      } else {
        const payload = {
          ipAddress: data.ipAddress!,
          deviceId: data.deviceId!,
          userId: data.userId!,
          reason: data.reason || 'unspecified',
          blockedAt:
            data.blockedAt instanceof Date
              ? data.blockedAt.toISOString()
              : data.blockedAt || new Date().toISOString(),
          blockedBy: data.blockedBy!,
        } as any;
        await (this.db as any).insert(sqliteSchema.blockedDevices).values(payload);
        return { ...payload };
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
          .delete(pgSchema.blockedDevices)
          .where(eq(pgSchema.blockedDevices.userId, userId));
      } else {
        await (this.db as any)
          .delete(sqliteSchema.blockedDevices)
          .where(eq(sqliteSchema.blockedDevices.userId, userId));
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
          .insert(pgSchema.notifications)
          .values(notification)
          .returning();
        return result[0] || null;
      } else {
        const result = await (this.db as any)
          .insert(sqliteSchema.notifications)
          .values(notification);
        if (result.lastInsertRowid) {
          const notifications = await (this.db as any)
            .select()
            .from(sqliteSchema.notifications)
            .where(eq(sqliteSchema.notifications.id, Number(result.lastInsertRowid)))
            .limit(1);
          return notifications[0] || null;
        }
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
          .from(pgSchema.notifications)
          .where(eq(pgSchema.notifications.userId, userId))
          .orderBy(desc(pgSchema.notifications.createdAt));
      } else {
        return await (this.db as any)
          .select()
          .from(sqliteSchema.notifications)
          .where(eq(sqliteSchema.notifications.userId, userId))
          .orderBy(desc(sqliteSchema.notifications.createdAt));
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
        const userCount = await (this.db as any).select({ count: count() }).from(pgSchema.users);
        const messageCount = await (this.db as any)
          .select({ count: count() })
          .from(pgSchema.messages);
        const onlineCount = await (this.db as any)
          .select({ count: count() })
          .from(pgSchema.users)
          .where(eq(pgSchema.users.isOnline, true));

        stats.users = userCount[0]?.count || 0;
        stats.messages = messageCount[0]?.count || 0;
        stats.onlineUsers = onlineCount[0]?.count || 0;
      } else {
        const userCount = await (this.db as any)
          .select({ count: count() })
          .from(sqliteSchema.users);
        const messageCount = await (this.db as any)
          .select({ count: count() })
          .from(sqliteSchema.messages);
        const onlineCount = await (this.db as any)
          .select({ count: count() })
          .from(sqliteSchema.users)
          .where(eq(sqliteSchema.users.isOnline, true));

        stats.users = userCount[0]?.count || 0;
        stats.messages = messageCount[0]?.count || 0;
        stats.onlineUsers = onlineCount[0]?.count || 0;
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
      adapter: dbAdapter.type,
    };
  }

  // ===== Site Settings operations =====
  async getSiteTheme(): Promise<string> {
    if (!this.isConnected()) return 'default';
    try {
      if (this.type === 'postgresql') {
        const rows = await (this.db as any).select().from(pgSchema.siteSettings).limit(1);
        if (rows && rows.length > 0) return rows[0].siteTheme || 'default';
        const [inserted] = await (this.db as any)
          .insert(pgSchema.siteSettings)
          .values({ siteTheme: 'default' })
          .returning();
        return inserted?.siteTheme || 'default';
      } else {
        const rows = await (this.db as any).select().from(sqliteSchema.siteSettings).limit(1);
        if (rows && rows.length > 0) return rows[0].siteTheme || 'default';
        await (this.db as any)
          .insert(sqliteSchema.siteSettings)
          .values({ siteTheme: 'default', updatedAt: new Date().toISOString() });
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
        const rows = await (this.db as any).select().from(pgSchema.siteSettings).limit(1);
        if (rows && rows.length > 0) {
          const [updated] = await (this.db as any)
            .update(pgSchema.siteSettings)
            .set({ siteTheme: themeId, updatedAt: new Date() })
            .where(eq(pgSchema.siteSettings.id as any, rows[0].id))
            .returning();
          return updated?.siteTheme || themeId;
        }
        const [inserted] = await (this.db as any)
          .insert(pgSchema.siteSettings)
          .values({ siteTheme: themeId })
          .returning();
        return inserted?.siteTheme || themeId;
      } else {
        const rows = await (this.db as any).select().from(sqliteSchema.siteSettings).limit(1);
        if (rows && rows.length > 0) {
          await (this.db as any)
            .update(sqliteSchema.siteSettings)
            .set({ siteTheme: themeId, updatedAt: new Date().toISOString() })
            .where(eq(sqliteSchema.siteSettings.id as any, rows[0].id));
          return themeId;
        }
        await (this.db as any)
          .insert(sqliteSchema.siteSettings)
          .values({ siteTheme: themeId, updatedAt: new Date().toISOString() });
        return themeId;
      }
    } catch (e) {
      return themeId || 'default';
    }
  }
}

// Export the database service for direct access if needed
export const databaseService = new DatabaseService();
