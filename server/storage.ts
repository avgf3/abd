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
}

export class PostgreSQLStorage implements IStorage {
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    if (!db) {
      console.log(`⚠️ قاعدة البيانات غير متاحة للبحث عن المستخدم ${id}`);
      return undefined;
    }
    try {
      const result = await db.select().from(users).where(eq(users.id, id));
      return result[0];
    } catch (error) {
      console.error(`❌ خطأ في البحث عن المستخدم ${id}:`, error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) {
      console.log(`⚠️ قاعدة البيانات غير متاحة للبحث عن المستخدم ${username}`);
      return undefined;
    }
    try {
      const result = await db.select().from(users).where(eq(users.username, username));
      return result[0];
    } catch (error) {
      console.error(`❌ خطأ في البحث عن المستخدم ${username}:`, error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    try {
      console.log(`🔄 تحديث المستخدم ${id}:`, updates);
      
      const result = await db.update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();
      
      console.log(`✅ تم تحديث المستخدم ${id} بنجاح:`, result[0]);
      return result[0];
    } catch (error) {
      console.error(`❌ خطأ في تحديث المستخدم ${id}:`, error);
      throw error;
    }
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

  async getRoomMessages(roomId: string, limit: number = 50): Promise<Message[]> {
    return await db.select()
      .from(messages)
      .where(
        and(
          eq(messages.isPrivate, false),
          eq(messages.roomId, roomId)
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
  async createWallPost(postData: InsertWallPost): Promise<WallPost> {
    try {
      console.log('🗄️ إدراج منشور في قاعدة البيانات PostgreSQL...');
      console.log('🔍 بيانات الإدراج:', {
        userId: postData.userId,
        username: postData.username,
        userRole: postData.userRole,
        content: postData.content?.substring(0, 50) + '...',
        type: postData.type || 'public'
      });
      
      const [post] = await db.insert(wallPosts)
        .values({
          userId: postData.userId,
          username: postData.username,
          userRole: postData.userRole,
          content: postData.content || null,
          imageUrl: postData.imageUrl || null,
          type: postData.type || 'public',
          userProfileImage: postData.userProfileImage || null,
          usernameColor: postData.usernameColor || '#FFFFFF',
          totalLikes: 0,
          totalDislikes: 0,
          totalHearts: 0
        })
        .returning();
      
      console.log('✅ تم إنشاء المنشور بنجاح في PostgreSQL:', {
        id: post.id,
        userId: post.userId,
        username: post.username,
        type: post.type,
        timestamp: post.timestamp
      });
      
      return post;
    } catch (error) {
      console.error('❌ خطأ في إنشاء المنشور في قاعدة البيانات:', error);
      throw error;
    }
  }

  async getWallPosts(type: string): Promise<WallPost[]> {
    try {
      console.log(`🔍 جلب المنشورات من PostgreSQL للنوع: ${type}`);
      
      const posts = await db.select()
        .from(wallPosts)
        .where(eq(wallPosts.type, type))
        .orderBy(desc(wallPosts.timestamp));
      
      console.log(`📊 تم جلب ${posts.length} منشورات من قاعدة البيانات`);
      
      if (posts.length > 0) {
        console.log('📝 أحدث منشور:', {
          id: posts[0].id,
          username: posts[0].username,
          content: posts[0].content?.substring(0, 50) + '...',
          timestamp: posts[0].timestamp
        });
      }
      
      return posts;
    } catch (error) {
      console.error('❌ خطأ في جلب المنشورات من قاعدة البيانات:', error);
      return [];
    }
  }

  async getWallPostsByUsers(userIds: number[]): Promise<WallPost[]> {
    try {
      if (userIds.length === 0) {
        return [];
      }
      
      const posts = await db.select()
        .from(wallPosts)
        .where(inArray(wallPosts.userId, userIds))
        .orderBy(desc(wallPosts.timestamp));
      
      return posts;
    } catch (error) {
      console.error('Error getting wall posts by users:', error);
      return [];
    }
  }

  async getWallPost(postId: number): Promise<WallPost | null> {
    try {
      const [post] = await db.select()
        .from(wallPosts)
        .where(eq(wallPosts.id, postId));
      
      return post || null;
    } catch (error) {
      console.error('Error getting wall post:', error);
      return null;
    }
  }

  async deleteWallPost(postId: number): Promise<void> {
    try {
      // حذف جميع التفاعلات المرتبطة بالمنشور أولاً
      await db.delete(wallReactions)
        .where(eq(wallReactions.postId, postId));
      
      // ثم حذف المنشور نفسه
      await db.delete(wallPosts)
        .where(eq(wallPosts.id, postId));
    } catch (error) {
      console.error('Error deleting wall post:', error);
      throw error;
    }
  }

  async addWallReaction(reactionData: InsertWallReaction): Promise<WallPost | null> {
    try {
      // التحقق من وجود المنشور
      const post = await this.getWallPost(reactionData.postId);
      if (!post) {
        throw new Error('Post not found');
      }
      
      // إزالة التفاعل السابق للمستخدم إذا كان موجوداً
      await db.delete(wallReactions)
        .where(and(
          eq(wallReactions.postId, reactionData.postId),
          eq(wallReactions.userId, reactionData.userId)
        ));
      
      // إضافة التفاعل الجديد
      await db.insert(wallReactions)
        .values({
          postId: reactionData.postId,
          userId: reactionData.userId,
          username: reactionData.username,
          type: reactionData.type
        });
      
      // تحديث عدادات التفاعل في المنشور
      const reactions = await db.select()
        .from(wallReactions)
        .where(eq(wallReactions.postId, reactionData.postId));
      
      const totalLikes = reactions.filter(r => r.type === 'like').length;
      const totalDislikes = reactions.filter(r => r.type === 'dislike').length;
      const totalHearts = reactions.filter(r => r.type === 'heart').length;
      
      const [updatedPost] = await db.update(wallPosts)
        .set({
          totalLikes,
          totalDislikes,
          totalHearts,
          updatedAt: new Date()
        })
        .where(eq(wallPosts.id, reactionData.postId))
        .returning();
      
      return updatedPost;
    } catch (error) {
      console.error('Error adding wall post reaction:', error);
      throw error;
    }
  }

  async getWallPostWithReactions(postId: number): Promise<WallPost | null> {
    try {
      const post = await this.getWallPost(postId);
      if (!post) {
        return null;
      }
      
      // جلب التفاعلات مع المنشور
      const reactions = await db.select()
        .from(wallReactions)
        .where(eq(wallReactions.postId, postId))
        .orderBy(desc(wallReactions.timestamp));
      
      // إضافة التفاعلات للمنشور (للتوافق مع العميل)
      return {
        ...post,
        reactions
      } as any;
    } catch (error) {
      console.error('Error getting wall post with reactions:', error);
      return null;
    }
  }

  async getWallPostReactions(postId: number): Promise<WallReaction[]> {
    try {
      const reactions = await db.select()
        .from(wallReactions)
        .where(eq(wallReactions.postId, postId))
        .orderBy(desc(wallReactions.timestamp));
      
      return reactions;
    } catch (error) {
      console.error('Error getting wall post reactions:', error);
      return [];
    }
  }

  // Room operations
  async getRoom(roomId: string): Promise<any> {
    try {
      const result = await db.select().from(rooms).where(eq(rooms.id, roomId));
      if (result.length === 0) {
        return null;
      }
      
      const room = result[0];
      return {
        id: room.id,
        name: room.name,
        description: room.description,
        icon: room.icon,
        createdBy: room.createdBy,
        isDefault: room.isDefault,
        isActive: room.isActive,
        isBroadcast: room.isBroadcast,
        hostId: room.hostId,
        speakers: room.speakers,
        micQueue: room.micQueue,
        createdAt: room.createdAt,
        // For backward compatibility
        is_broadcast: room.isBroadcast
      };
    } catch (error) {
      console.error('خطأ في جلب الغرفة:', error);
      return null;
    }
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

  async getAllRooms(): Promise<any[]> {
    try {
      const result = await db.select({
        id: rooms.id,
        name: rooms.name,
        description: rooms.description,
        icon: rooms.icon,
        createdBy: rooms.createdBy,
        isDefault: rooms.isDefault,
        isActive: rooms.isActive,
        isBroadcast: rooms.isBroadcast,
        hostId: rooms.hostId,
        speakers: rooms.speakers,
        micQueue: rooms.micQueue,
        createdAt: rooms.createdAt,
        userCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM room_users ru 
          WHERE ru.room_id = rooms.id
        )`
      })
      .from(rooms)
      .where(eq(rooms.isActive, true))
      .orderBy(desc(rooms.isDefault), asc(rooms.createdAt));

      return result;
    } catch (error) {
      console.error('خطأ في جلب الغرف:', error);
      // إرجاع الغرف الافتراضية في حالة الخطأ
      return [
        { id: 'general', name: 'الدردشة العامة', isBroadcast: false, userCount: 0 },
        { id: 'broadcast', name: 'غرفة البث المباشر', isBroadcast: true, userCount: 0 },
        { id: 'music', name: 'أغاني وسهر', isBroadcast: false, userCount: 0 }
      ];
    }
  }

  async createRoom(roomData: any): Promise<any> {
    try {
      const roomId = `room_${Date.now()}`;
      const result = await db.insert(rooms).values({
        id: roomId,
        name: roomData.name,
        description: roomData.description || '',
        icon: roomData.icon || '',
        createdBy: roomData.createdBy,
        isDefault: roomData.isDefault || false,
        isActive: true,
        isBroadcast: roomData.isBroadcast || false,
        hostId: roomData.hostId || null,
        speakers: '[]',
        micQueue: '[]'
      }).returning();

      return result[0];
    } catch (error) {
      console.error('خطأ في إنشاء الغرفة:', error);
      throw error;
    }
  }

  async deleteRoom(roomId: string): Promise<void> {
    try {
      // حذف جميع المستخدمين من الغرفة أولاً
      await db.delete(roomUsers).where(eq(roomUsers.roomId, roomId));
      
      // حذف الغرفة
      await db.delete(rooms).where(eq(rooms.id, roomId));
    } catch (error) {
      console.error('خطأ في حذف الغرفة:', error);
      throw error;
    }
  }

  async joinRoom(userId: number, roomId: string): Promise<void> {
    try {
      console.log(`🔄 محاولة انضمام المستخدم ${userId} للغرفة ${roomId}`);
      
      // التحقق من وجود المستخدم في الغرفة مسبقاً
      const existing = await db.select()
        .from(roomUsers)
        .where(and(eq(roomUsers.userId, userId), eq(roomUsers.roomId, roomId)))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(roomUsers).values({
          userId: userId,
          roomId: roomId
        });
        console.log(`✅ تم انضمام المستخدم ${userId} للغرفة ${roomId}`);
      } else {
        console.log(`ℹ️ المستخدم ${userId} موجود بالفعل في الغرفة ${roomId}`);
      }
    } catch (error) {
      console.error('خطأ في انضمام المستخدم للغرفة:', error);
      throw error;
    }
  }

  async leaveRoom(userId: number, roomId: string): Promise<void> {
    try {
      await db.delete(roomUsers)
        .where(and(eq(roomUsers.userId, userId), eq(roomUsers.roomId, roomId)));
    } catch (error) {
      console.error('خطأ في مغادرة المستخدم للغرفة:', error);
      throw error;
    }
  }

  async getUserRooms(userId: number): Promise<string[]> {
    try {
      const result = await db.select({ roomId: roomUsers.roomId })
        .from(roomUsers)
        .where(eq(roomUsers.userId, userId));
      
      return result.map(row => row.roomId);
    } catch (error) {
      console.error('خطأ في جلب غرف المستخدم:', error);
      return ['general']; // إرجاع الغرفة العامة على الأقل
    }
  }

  async getRoomUsers(roomId: string): Promise<number[]> {
    try {
      const result = await db.select({ userId: roomUsers.userId })
        .from(roomUsers)
        .where(eq(roomUsers.roomId, roomId));
      
      return result.map(row => row.userId);
    } catch (error) {
      console.error('خطأ في جلب مستخدمي الغرفة:', error);
      return [];
    }
  }

  async getOnlineUsersInRoom(roomId: string): Promise<User[]> {
    try {
      console.log(`🔍 جلب المستخدمين المتصلين في الغرفة ${roomId}`);
      
      // جلب المستخدمين المتصلين والموجودين في الغرفة المحددة
      const result = await db.select()
        .from(users)
        .innerJoin(roomUsers, eq(users.id, roomUsers.userId))
        .where(
          and(
            eq(roomUsers.roomId, roomId),
            eq(users.isOnline, true)
          )
        );
      
      const users_list = result.map(row => row.users);
      console.log(`👥 وجد ${users_list.length} مستخدمين متصلين في الغرفة ${roomId}: ${users_list.map(u => u.username).join(', ')}`);
      
      return users_list;
    } catch (error) {
      console.error('خطأ في جلب المستخدمين المتصلين في الغرفة:', error);
      return [];
    }
  }

  async requestMic(userId: number, roomId: string): Promise<boolean> {
    try {
      // جلب معلومات الغرفة
      const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
      if (!room.length) return false;

      // تحليل قائمة الانتظار الحالية
      const currentMicQueue = JSON.parse(room[0].micQueue || '[]');
      
      // التحقق من أن المستخدم ليس في القائمة بالفعل
      if (currentMicQueue.includes(userId)) {
        return false; // المستخدم في القائمة بالفعل
      }

      // إضافة المستخدم للقائمة
      currentMicQueue.push(userId);

      // تحديث قاعدة البيانات
      await db.update(rooms)
        .set({ micQueue: JSON.stringify(currentMicQueue) })
        .where(eq(rooms.id, roomId));

      console.log(`✅ User ${userId} added to mic queue in room: ${roomId}`);
      return true;
    } catch (error) {
      console.error('خطأ في طلب المايك:', error);
      return false;
    }
  }

  async approveMicRequest(roomId: string, userId: number, approvedBy: number): Promise<boolean> {
    try {
      // جلب معلومات الغرفة
      const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
      if (!room.length) return false;

      // تحليل القوائم الحالية
      const currentMicQueue = JSON.parse(room[0].micQueue || '[]');
      const currentSpeakers = JSON.parse(room[0].speakers || '[]');

      // إزالة المستخدم من قائمة الانتظار
      const updatedMicQueue = currentMicQueue.filter((id: number) => id !== userId);
      
      // إضافة المستخدم لقائمة المتحدثين (إذا لم يكن موجود)
      if (!currentSpeakers.includes(userId)) {
        currentSpeakers.push(userId);
      }

      // تحديث قاعدة البيانات
      await db.update(rooms)
        .set({
          micQueue: JSON.stringify(updatedMicQueue),
          speakers: JSON.stringify(currentSpeakers)
        })
        .where(eq(rooms.id, roomId));

      console.log(`✅ User ${approvedBy} approved mic request for user ${userId} in room: ${roomId}`);
      return true;
    } catch (error) {
      console.error('خطأ في الموافقة على طلب المايك:', error);
      return false;
    }
  }

  async rejectMicRequest(roomId: string, userId: number, rejectedBy: number): Promise<boolean> {
    try {
      // جلب معلومات الغرفة
      const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
      if (!room.length) return false;

      // تحليل قائمة الانتظار الحالية
      const currentMicQueue = JSON.parse(room[0].micQueue || '[]');

      // إزالة المستخدم من قائمة الانتظار
      const updatedMicQueue = currentMicQueue.filter((id: number) => id !== userId);

      // تحديث قاعدة البيانات
      await db.update(rooms)
        .set({ micQueue: JSON.stringify(updatedMicQueue) })
        .where(eq(rooms.id, roomId));

      console.log(`❌ User ${rejectedBy} rejected mic request for user ${userId} in room: ${roomId}`);
      return true;
    } catch (error) {
      console.error('خطأ في رفض طلب المايك:', error);
      return false;
    }
  }

  async removeSpeaker(roomId: string, userId: number, removedBy: number): Promise<boolean> {
    try {
      // جلب معلومات الغرفة
      const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
      if (!room.length) return false;

      // تحليل قائمة المتحدثين الحالية
      const currentSpeakers = JSON.parse(room[0].speakers || '[]');

      // إزالة المستخدم من قائمة المتحدثين
      const updatedSpeakers = currentSpeakers.filter((id: number) => id !== userId);

      // تحديث قاعدة البيانات
      await db.update(rooms)
        .set({ speakers: JSON.stringify(updatedSpeakers) })
        .where(eq(rooms.id, roomId));

      console.log(`🔇 User ${removedBy} removed user ${userId} from speakers in room: ${roomId}`);
      return true;
    } catch (error) {
      console.error('خطأ في إزالة المتحدث:', error);
      return false;
    }
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