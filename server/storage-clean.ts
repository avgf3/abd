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
  
  // User verification and security
  verifyUserCredentials(username: string, password: string): Promise<User | null>;

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
  
  // Broadcast Room operations
  getAllRooms(): Promise<any[]>;
  getRoom(roomId: string): Promise<any | null>;
  createRoom(roomData: {
    name: string;
    description: string;
    icon: string;
    createdBy: number;
    isDefault: boolean;
    isActive: boolean;
    isBroadcast?: boolean;
    hostId?: number;
  }): Promise<any>;
  deleteRoom(roomId: string): Promise<void>;
  joinRoom(userId: number, roomId: string): Promise<void>;
  leaveRoom(userId: number, roomId: string): Promise<void>;
  requestMic(userId: number, roomId: string): Promise<boolean>;
  approveMicRequest(roomId: string, userId: number, approvedBy: number): Promise<boolean>;
  rejectMicRequest(roomId: string, userId: number, rejectedBy: number): Promise<boolean>;
  removeSpeaker(roomId: string, userId: number, removedBy: number): Promise<boolean>;
  getBroadcastRoomInfo(roomId: string): Promise<{
    hostId: number;
    speakers: number[];
    micQueue: number[];
  } | null>;
}

// PostgreSQL Storage: يعتمد فقط على قاعدة البيانات الحقيقية
export class PostgreSQLStorage implements IStorage {
  private users: Map<number, User>;
  private messages: Map<number, Message>;
  private friends: Map<number, Friend>;
  private friendRequests: Map<number, any>;
  private notifications: Map<number, Notification>;
  private blockedDevices: Map<string, any>;

  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.friends = new Map();
    this.friendRequests = new Map();
    this.notifications = new Map();
    this.blockedDevices = new Map();

    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      if (!db) {
        console.warn("⚠️ قاعدة البيانات غير متوفرة");
        return;
      }
      
      // إنشاء المستخدمين الأساسيين إذا لم يكونوا موجودين
      const existingOwner = await db.select().from(users).where(eq(users.username, "عبدالكريم"));
      if (existingOwner.length === 0) {
        await db.insert(users).values({
          username: "عبدالكريم",
          password: "عبدالكريم22333",
          userType: "owner",
          role: "owner",
          profileImage: "/default_avatar.svg",
          status: "مالك الموقع",
          gender: "ذكر",
          age: 30,
          country: "السعودية",
          relation: "مرتبط",
          bio: "مالك الموقع",
          profileBackgroundColor: "#3c0d0d",
          usernameColor: "#FFFFFF",
          userTheme: "default",
          isOnline: false,
          isHidden: false,
          isMuted: false,
          isBanned: false,
          isBlocked: false,
          joinDate: new Date(),
          createdAt: new Date(),
          lastSeen: new Date(),
          ignoredUsers: '[]'
        });
      }

      const existingAdmin = await db.select().from(users).where(eq(users.username, "عبود"));
      if (existingAdmin.length === 0) {
        await db.insert(users).values({
          username: "عبود",
          password: "22333",
          userType: "owner",
          role: "owner",
          profileImage: "/default_avatar.svg",
          status: "مشرف مؤقت",
          gender: "ذكر",
          age: 25,
          country: "العراق",
          relation: "أعزب",
          bio: "مشرف مؤقت",
          profileBackgroundColor: "#3c0d0d",
          usernameColor: "#FFFFFF",
          userTheme: "default",
          isOnline: false,
          isHidden: false,
          isMuted: false,
          isBanned: false,
          isBlocked: false,
          joinDate: new Date(),
          createdAt: new Date(),
          lastSeen: new Date(),
          ignoredUsers: '[]'
        });
      }

      console.log('✅ تم تهيئة قاعدة البيانات بنجاح');
    } catch (error) {
      console.error('❌ خطأ في تهيئة قاعدة البيانات:', error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    if (!db) return undefined;
    
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error('خطأ في جلب المستخدم:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) return undefined;
    
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
    } catch (error) {
      console.error('خطأ في جلب المستخدم بالاسم:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!db) {
      throw new Error('قاعدة البيانات غير متوفرة');
    }

    try {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (error: any) {
      console.error('خطأ في إنشاء المستخدم:', error);
      
      if (error.code === '23505' || error.message?.includes('UNIQUE constraint failed')) {
        throw new Error('اسم المستخدم موجود بالفعل');
      }
      
      throw new Error('خطأ في إنشاء المستخدم');
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    if (!db) return undefined;
    
    try {
      const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
      return user || undefined;
    } catch (error) {
      console.error('خطأ في تحديث المستخدم:', error);
      return undefined;
    }
  }

  async setUserOnlineStatus(id: number, isOnline: boolean): Promise<void> {
    if (!db) return;
    
    try {
      await db.update(users)
        .set({ 
          isOnline: isOnline,
          lastSeen: new Date()
        })
        .where(eq(users.id, id));
    } catch (error) {
      console.error('خطأ في تحديث حالة الاتصال:', error);
    }
  }

  async getOnlineUsers(): Promise<User[]> {
    if (!db) return [];
    
    try {
      return await db.select().from(users).where(eq(users.isOnline, true));
    } catch (error) {
      console.error('خطأ في جلب المستخدمين المتصلين:', error);
      return [];
    }
  }

  async getAllUsers(): Promise<User[]> {
    if (!db) return [];
    
    try {
      return await db.select().from(users);
    } catch (error) {
      console.error('خطأ في جلب جميع المستخدمين:', error);
      return [];
    }
  }

  async verifyUserCredentials(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    
    if (user.password === password) {
      return user;
    }
    
    return null;
  }

  // Message operations
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    if (!db) {
      throw new Error('قاعدة البيانات غير متوفرة');
    }

    try {
      const [message] = await db.insert(messages).values(insertMessage).returning();
      return message;
    } catch (error) {
      console.error('خطأ في إنشاء الرسالة:', error);
      throw new Error('خطأ في إنشاء الرسالة');
    }
  }

  async getPublicMessages(limit: number = 50): Promise<Message[]> {
    if (!db) return [];
    
    try {
      return await db.select()
        .from(messages)
        .where(eq(messages.isPrivate, false))
        .orderBy(desc(messages.timestamp))
        .limit(limit);
    } catch (error) {
      console.error('خطأ في جلب الرسائل العامة:', error);
      return [];
    }
  }

  async getPrivateMessages(userId1: number, userId2: number, limit: number = 50): Promise<Message[]> {
    if (!db) return [];
    
    try {
      return await db.select()
        .from(messages)
        .where(
          and(
            eq(messages.isPrivate, true),
            sql`(sender_id = ${userId1} AND receiver_id = ${userId2}) OR (sender_id = ${userId2} AND receiver_id = ${userId1})`
          )
        )
        .orderBy(desc(messages.timestamp))
        .limit(limit);
    } catch (error) {
      console.error('خطأ في جلب الرسائل الخاصة:', error);
      return [];
    }
  }

  // Room operations
  async getAllRooms(): Promise<any[]> {
    if (!db) {
      // إرجاع الغرف الافتراضية إذا لم تكن قاعدة البيانات متوفرة
      return [
        { 
          id: 'general', 
          name: 'الدردشة العامة', 
          description: 'الغرفة الرئيسية للدردشة', 
          is_default: true, 
          created_by: 1, 
          created_at: new Date(), 
          is_active: true, 
          user_count: 0, 
          icon: '',
          is_broadcast: false,
          host_id: null,
          speakers: '[]',
          mic_queue: '[]'
        },
        { 
          id: 'broadcast', 
          name: 'غرفة البث المباشر', 
          description: 'غرفة خاصة للبث المباشر مع نظام المايك', 
          is_default: false, 
          created_by: 1, 
          created_at: new Date(), 
          is_active: true, 
          user_count: 0, 
          icon: '',
          is_broadcast: true,
          host_id: 1,
          speakers: '[]',
          mic_queue: '[]'
        },
        { 
          id: 'music', 
          name: 'أغاني وسهر', 
          description: 'غرفة للموسيقى والترفيه', 
          is_default: false, 
          created_by: 1, 
          created_at: new Date(), 
          is_active: true, 
          user_count: 0, 
          icon: '',
          is_broadcast: false,
          host_id: null,
          speakers: '[]',
          mic_queue: '[]'
        }
      ];
    }

    try {
      // استخدام Drizzle ORM لجلب الغرف من قاعدة البيانات
      const result = await db.select({
        id: sql`r.id`,
        name: sql`r.name`,
        description: sql`r.description`,
        icon: sql`r.icon`,
        createdBy: sql`r.created_by`,
        isDefault: sql`r.is_default`,
        isActive: sql`r.is_active`,
        isBroadcast: sql`r.is_broadcast`,
        hostId: sql`r.host_id`,
        speakers: sql`r.speakers`,
        micQueue: sql`r.mic_queue`,
        createdAt: sql`r.created_at`,
        userCount: sql`COUNT(DISTINCT ru.user_id)`
      })
      .from(sql`rooms r`)
      .leftJoin(sql`room_users ru`, sql`r.id = ru.room_id`)
      .where(sql`r.is_active = true`)
      .groupBy(sql`r.id`)
      .orderBy(sql`r.is_default DESC, r.created_at ASC`);
      
      return result;
    } catch (error) {
      console.error('خطأ في جلب الغرف من قاعدة البيانات:', error);
      // إرجاع الغرف الافتراضية في حالة الخطأ
      return [
        { 
          id: 'general', 
          name: 'الدردشة العامة', 
          description: 'الغرفة الرئيسية للدردشة', 
          is_default: true, 
          created_by: 1, 
          created_at: new Date(), 
          is_active: true, 
          user_count: 0, 
          icon: '',
          is_broadcast: false,
          host_id: null,
          speakers: '[]',
          mic_queue: '[]'
        },
        { 
          id: 'broadcast', 
          name: 'غرفة البث المباشر', 
          description: 'غرفة خاصة للبث المباشر مع نظام المايك', 
          is_default: false, 
          created_by: 1, 
          created_at: new Date(), 
          is_active: true, 
          user_count: 0, 
          icon: '',
          is_broadcast: true,
          host_id: 1,
          speakers: '[]',
          mic_queue: '[]'
        }
      ];
    }
  }

  async getRoom(roomId: string): Promise<any | null> {
    if (!db) return null;
    
    try {
      const result = await db.select({
        id: sql`r.id`,
        name: sql`r.name`,
        description: sql`r.description`,
        icon: sql`r.icon`,
        createdBy: sql`r.created_by`,
        isDefault: sql`r.is_default`,
        isActive: sql`r.is_active`,
        isBroadcast: sql`r.is_broadcast`,
        hostId: sql`r.host_id`,
        speakers: sql`r.speakers`,
        micQueue: sql`r.mic_queue`,
        createdAt: sql`r.created_at`,
        userCount: sql`COUNT(DISTINCT ru.user_id)`
      })
      .from(sql`rooms r`)
      .leftJoin(sql`room_users ru`, sql`r.id = ru.room_id`)
      .where(sql`r.id = ${roomId}`)
      .groupBy(sql`r.id`);
      
      return result[0] || null;
    } catch (error) {
      console.error('خطأ في جلب الغرفة من قاعدة البيانات:', error);
      return null;
    }
  }

  async createRoom(roomData: {
    name: string;
    description: string;
    icon: string;
    createdBy: number;
    isDefault: boolean;
    isActive: boolean;
    isBroadcast?: boolean;
    hostId?: number;
  }): Promise<any> {
    if (!db) {
      throw new Error('قاعدة البيانات غير متوفرة');
    }

    try {
      const roomId = `room_${Date.now()}`;
      
      const result = await db.insert(sql`rooms`).values({
        id: roomId,
        name: roomData.name,
        description: roomData.description,
        icon: roomData.icon,
        created_by: roomData.createdBy,
        is_default: roomData.isDefault,
        is_active: roomData.isActive,
        is_broadcast: roomData.isBroadcast || false,
        host_id: roomData.hostId || roomData.createdBy,
        speakers: '[]',
        mic_queue: '[]',
        created_at: new Date()
      }).returning();

      return {
        id: roomId,
        name: roomData.name,
        description: roomData.description,
        icon: roomData.icon,
        createdBy: roomData.createdBy,
        isDefault: roomData.isDefault,
        isActive: roomData.isActive,
        isBroadcast: roomData.isBroadcast || false,
        hostId: roomData.hostId || roomData.createdBy,
        speakers: '[]',
        micQueue: '[]',
        createdAt: new Date(),
        userCount: 0
      };
    } catch (error) {
      console.error('خطأ في إنشاء الغرفة:', error);
      throw new Error('خطأ في إنشاء الغرفة');
    }
  }

  // Placeholder implementations for other methods
  async setUserHiddenStatus(id: number, isHidden: boolean): Promise<void> {}
  async addIgnoredUser(userId: number, ignoredUserId: number): Promise<void> {}
  async removeIgnoredUser(userId: number, ignoredUserId: number): Promise<void> {}
  async getIgnoredUsers(userId: number): Promise<number[]> { return []; }
  async addFriend(userId: number, friendId: number): Promise<Friend> { throw new Error('Not implemented'); }
  async getFriends(userId: number): Promise<User[]> { return []; }
  async updateFriendStatus(userId: number, friendId: number, status: string): Promise<void> {}
  async getBlockedUsers(userId: number): Promise<User[]> { return []; }
  async removeFriend(userId: number, friendId: number): Promise<boolean> { return false; }
  async getFriendship(userId1: number, userId2: number): Promise<Friend | undefined> { return undefined; }
  async createFriendRequest(senderId: number, receiverId: number): Promise<any> { throw new Error('Not implemented'); }
  async getFriendRequest(senderId: number, receiverId: number): Promise<any> { return null; }
  async getFriendRequestById(requestId: number): Promise<any> { return null; }
  async getIncomingFriendRequests(userId: number): Promise<any[]> { return []; }
  async getOutgoingFriendRequests(userId: number): Promise<any[]> { return []; }
  async acceptFriendRequest(requestId: number): Promise<boolean> { return false; }
  async declineFriendRequest(requestId: number): Promise<boolean> { return false; }
  async ignoreFriendRequest(requestId: number): Promise<boolean> { return false; }
  async deleteFriendRequest(requestId: number): Promise<boolean> { return false; }
  async createNotification(notification: InsertNotification): Promise<Notification> { throw new Error('Not implemented'); }
  async getUserNotifications(userId: number, limit: number = 50): Promise<Notification[]> { return []; }
  async markNotificationAsRead(notificationId: number): Promise<boolean> { return false; }
  async markAllNotificationsAsRead(userId: number): Promise<boolean> { return false; }
  async deleteNotification(notificationId: number): Promise<boolean> { return false; }
  async getUnreadNotificationCount(userId: number): Promise<number> { return 0; }
  async createBlockedDevice(blockData: any): Promise<boolean> { return false; }
  async isDeviceBlocked(ipAddress: string, deviceId: string): Promise<boolean> { return false; }
  async getBlockedDevices(): Promise<Array<{ipAddress: string, deviceId: string}>> { return []; }
  async deleteRoom(roomId: string): Promise<void> {}
  async joinRoom(userId: number, roomId: string): Promise<void> {}
  async leaveRoom(userId: number, roomId: string): Promise<void> {}
  async requestMic(userId: number, roomId: string): Promise<boolean> { return false; }
  async approveMicRequest(roomId: string, userId: number, approvedBy: number): Promise<boolean> { return false; }
  async rejectMicRequest(roomId: string, userId: number, rejectedBy: number): Promise<boolean> { return false; }
  async removeSpeaker(roomId: string, userId: number, removedBy: number): Promise<boolean> { return false; }
  async getBroadcastRoomInfo(roomId: string): Promise<{hostId: number; speakers: number[]; micQueue: number[]} | null> { return null; }
}

// تصدير نسخة نظيفة تعتمد فقط على PostgreSQL
export const storage = new PostgreSQLStorage();