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
// PostgreSQL only - SQLite code removed

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
  
  // Friend request operations - محسن ومنظم
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
  
  // Broadcast Room operations - الجديدة
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

// Mixed storage: Database for members, Memory for guests
export class MixedStorage implements IStorage {
  private users: Map<number, User>;
  private messages: Map<number, Message>;
  private friends: Map<number, Friend>;
  private friendRequests: Map<number, {
    id: number;
    userId: number;
    friendId: number;
    status: string;
    createdAt: Date;
    senderUsername?: string;
    receiverUsername?: string;
  }>;
  private notifications: Map<number, Notification>;
  private blockedDevices: Map<string, {
    ipAddress: string;
    deviceId: string;
    userId: number;
    reason: string;
    blockedAt: Date;
    blockedBy: number;
  }>;
  private currentUserId: number;
  private currentMessageId: number;
  private currentFriendId: number;
  private currentRequestId: number;

  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.friends = new Map();
    this.friendRequests = new Map();
    this.notifications = new Map();
    this.blockedDevices = new Map();
    this.currentUserId = 1;
    this.currentMessageId = 1;
    this.currentFriendId = 1;
    this.currentRequestId = 1;

    this.initializeDatabase();
    this.initializeOwner();
    this.initializeBroadcastRoom(); // إضافة غرفة البث الافتراضية
  }

  private async initializeDatabase() {
    try {
      // فحص وجود قاعدة البيانات أولاً
      if (!db) {
        console.warn("⚠️ تشغيل وضع التطوير بدون قاعدة بيانات - سيتم حفظ البيانات في الذاكرة فقط");
        return;
      }
      
      // Check if owner already exists
      const existing = await db.select().from(users).where(eq(users.username, "عبدالكريم"));
      if (existing.length === 0) {
        // Create owner user in database - Fix SQLite compatibility
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
          isOnline: 0,
          isHidden: 0,
          isMuted: 0,
          isBanned: 0,
          isBlocked: 0,
          joinDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          ignoredUsers: '[]'
        } as any);
      }

      // Check if admin already exists
      const existingAdmin = await db.select().from(users).where(eq(users.username, "عبود"));
      if (existingAdmin.length === 0) {
        // Create admin user in database - Fix SQLite compatibility
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
          isOnline: 0,
          isHidden: 0,
          isMuted: 0,
          isBanned: 0,
          isBlocked: 0,
          joinDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          ignoredUsers: '[]'
        } as any);
      }
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }

  private async initializeOwner() {
    try {
      // فحص وجود قاعدة البيانات أولاً
      if (!db) {
        console.warn("⚠️ تشغيل وضع التطوير بدون قاعدة بيانات - سيتم حفظ البيانات في الذاكرة فقط");
        return;
      }
      
      // Check if owner already exists
      const existing = await db.select().from(users).where(eq(users.username, "عبدالكريم"));
      if (existing.length === 0) {
        // Create owner user in database - Fix SQLite compatibility
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
          isOnline: 0,
          isHidden: 0,
          isMuted: 0,
          isBanned: 0,
          isBlocked: 0,
          joinDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          ignoredUsers: '[]'
        } as any);
      }

      // Check if admin already exists
      const existingAdmin = await db.select().from(users).where(eq(users.username, "عبود"));
      if (existingAdmin.length === 0) {
        // Create admin user in database - Fix SQLite compatibility
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
          isOnline: 0,
          isHidden: 0,
          isMuted: 0,
          isBanned: 0,
          isBlocked: 0,
          joinDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          ignoredUsers: '[]'
        } as any);
      }
    } catch (error) {
      console.error('Error initializing owner:', error);
    }
  }

  private async initializeBroadcastRoom() {
    try {
      // إنشاء غرفة البث الافتراضية في قاعدة البيانات
      if (this.usePG) {
        // PostgreSQL
        const result = await this.pool.query(`
          INSERT INTO rooms (id, name, description, icon, created_by, is_default, is_active, is_broadcast, host_id, speakers, mic_queue, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO NOTHING
        `, [
          'broadcast',
          'غرفة البث المباشر',
          'غرفة خاصة للبث المباشر مع نظام المايك',
          '',
          1, // created_by (owner)
          false, // is_default
          true, // is_active
          true, // is_broadcast
          1, // host_id (owner)
          '[]', // speakers (empty array)
          '[]', // mic_queue (empty array)
          new Date()
        ]);
      } else {
        // SQLite - استخدام الاتصال المباشر
        const sqliteDb = getDirectSqliteConnection();
        if (sqliteDb) {
          await sqliteDb.run(`
            INSERT OR IGNORE INTO rooms (id, name, description, icon, created_by, is_default, is_active, is_broadcast, host_id, speakers, mic_queue, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            'broadcast',
            'غرفة البث المباشر',
            'غرفة خاصة للبث المباشر مع نظام المايك',
            '',
            1, // created_by (owner)
            0, // is_default (false)
            1, // is_active (true)
            1, // is_broadcast (true)
            1, // host_id (owner)
            '[]', // speakers (empty array)
            '[]', // mic_queue (empty array)
            new Date().toISOString()
          ]);
        }
      }
      console.log('✅ تم إنشاء غرفة البث المباشر بنجاح');
    } catch (error) {
      console.error('❌ خطأ في إنشاء غرفة البث المباشر:', error);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    // Check memory first (for guests)
    const memUser = this.users.get(id);
    if (memUser) return memUser;
    
    // Check database (for members) only if database is available
    if (db) {
      try {
        const [dbUser] = await db.select().from(users).where(eq(users.id, id));
        return dbUser || undefined;
      } catch (error: any) {
        console.error('Database query error in getUser:', error);
        
        // If it's a missing column error, provide a helpful message and try without role column
        if (error.code === '42703' && error.message?.includes('role')) {
          console.error('❌ CRITICAL: Missing "role" column in users table!');
          console.error('💡 Run: npm run db:fix-production to fix this issue');
          
          // Try query without role column as temporary fix
          try {
            const [basicUser] = await db.select({
              id: users.id,
              username: users.username,
              password: users.password,
              userType: users.userType,
              profileImage: users.profileImage,
              status: users.status,
              gender: users.gender,
              age: users.age,
              country: users.country,
              relation: users.relation,
              isOnline: users.isOnline,
              lastSeen: users.lastSeen,
              joinDate: users.joinDate,
              createdAt: users.createdAt,
              isMuted: users.isMuted,
              isBanned: users.isBanned
            }).from(users).where(eq(users.id, id));
            
            if (basicUser) {
              // Add role field based on userType as fallback
              return { ...basicUser, role: basicUser.userType || 'guest' } as any;
            }
          } catch (fallbackError) {
            console.error('❌ Fallback query also failed:', fallbackError);
          }
        }
        
        return undefined;
      }
    }
    
    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Check memory first (for guests)
    const memUser = Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
    if (memUser) return memUser;
    
    // إصلاح مؤقت: استخدام SQLite مباشرة
    try {
      const directDb = getDirectSqliteConnection();
      const user = directDb.prepare('SELECT * FROM users WHERE username = ?').get(username);
      
      if (user) {
        // تحويل البيانات من SQLite إلى تنسيق TypeScript
        return {
          id: user.id,
          username: user.username,
          password: user.password,
          userType: user.userType,
          role: user.role,
          profileImage: user.profile_image,
          profileBanner: user.profile_banner,
          profileBackgroundColor: user.profile_background_color,
          status: user.status,
          gender: user.gender,
          age: user.age,
          country: user.country,
          relation: user.relation,
          bio: user.bio,
          isOnline: Boolean(user.is_online),
          isHidden: Boolean(user.is_hidden),
          lastSeen: user.last_seen ? new Date(user.last_seen) : null,
          joinDate: user.join_date ? new Date(user.join_date) : new Date(),
          createdAt: user.created_at ? new Date(user.created_at) : new Date(),
          isMuted: Boolean(user.is_muted),
          muteExpiry: user.mute_expiry ? new Date(user.mute_expiry) : null,
          isBanned: Boolean(user.is_banned),
          banExpiry: user.ban_expiry ? new Date(user.ban_expiry) : null,
          isBlocked: Boolean(user.is_blocked),
          ipAddress: user.ip_address,
          deviceId: user.device_id,
          ignoredUsers: JSON.parse(user.ignored_users || '[]'),
          usernameColor: user.username_color || '#FFFFFF',
          userTheme: user.user_theme || 'default',
          profileEffect: user.profile_effect || 'none',
          points: user.points || 0,
          level: user.level || 1,
          totalPoints: user.total_points || 0,
          levelProgress: user.level_progress || 0
        } as User;
      }
      
      return undefined;
    } catch (error: any) {
      console.error('Direct SQLite query error in getUserByUsername:', error);
    }
    
    // Check database (for members) only if database is available - الطريقة القديمة كبديل
    if (db) {
      try {
        const [dbUser] = await db.select().from(users).where(eq(users.username, username));
        return dbUser || undefined;
      } catch (error: any) {
        console.error('Database query error in getUserByUsername:', error);
        
        // If it's a missing column error, provide a helpful message and try without role column
        if (error.code === '42703' && error.message?.includes('role')) {
          console.error('❌ CRITICAL: Missing "role" column in users table!');
          console.error('💡 Run: npm run db:fix-production to fix this issue');
          
          // Try query without role column as temporary fix
          try {
            const [basicUser] = await db.select({
              id: users.id,
              username: users.username,
              password: users.password,
              userType: users.userType,
              profileImage: users.profileImage,
              status: users.status,
              gender: users.gender,
              age: users.age,
              country: users.country,
              relation: users.relation,
              isOnline: users.isOnline,
              lastSeen: users.lastSeen,
              joinDate: users.joinDate,
              createdAt: users.createdAt,
              isMuted: users.isMuted,
              isBanned: users.isBanned
            }).from(users).where(eq(users.username, username));
            
            if (basicUser) {
              // Add role field based on userType as fallback
              return { ...basicUser, role: basicUser.userType || 'guest' } as any;
            }
          } catch (fallbackError) {
            console.error('❌ Fallback query also failed:', fallbackError);
          }
        }
        
        return undefined;
      }
    }
    
    return undefined;
  }

  async verifyUserCredentials(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    
    if (user.password === password) {
      return user;
    }
    
    return null;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if ((insertUser.userType === 'member' || insertUser.userType === 'owner') && db) {
      try {
        // تحضير البيانات مع إصلاح ربط SQLite
        const userData = {
          username: insertUser.username,
          password: insertUser.password,
          userType: insertUser.userType,
          role: insertUser.role || insertUser.userType || "member",
          profileImage: insertUser.profileImage || "/default_avatar.svg",
          profileBanner: insertUser.profileBanner,
          profileBackgroundColor: insertUser.profileBackgroundColor || "#3c0d0d",
          status: insertUser.status,
          gender: insertUser.gender || "male",
          age: insertUser.age,
          country: insertUser.country,
          relation: insertUser.relation,
          bio: insertUser.bio,
          usernameColor: insertUser.usernameColor || '#FFFFFF',
          userTheme: insertUser.userTheme || 'default',
          profileEffect: insertUser.profileEffect || 'none',
          // إضافة نظام النقاط والمستويات
          points: insertUser.points || 0,
          level: insertUser.level || 1,
          totalPoints: insertUser.totalPoints || 0,
          levelProgress: insertUser.levelProgress || 0,
          // إصلاح القيم المنطقية لـ SQLite
          isOnline: 1, // SQLite يستخدم integers للقيم المنطقية
          isHidden: 0,
          isMuted: insertUser.isMuted ? 1 : 0,
          isBanned: insertUser.isBanned ? 1 : 0,
          isBlocked: insertUser.isBlocked ? 1 : 0,
          // إصلاح التواريخ لـ SQLite
          lastSeen: new Date().toISOString(),
          joinDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          muteExpiry: insertUser.muteExpiry ? insertUser.muteExpiry.toISOString() : null,
          banExpiry: insertUser.banExpiry ? insertUser.banExpiry.toISOString() : null,
          ipAddress: insertUser.ipAddress,
          deviceId: insertUser.deviceId,
          ignoredUsers: '[]' // JSON string للتوافق مع SQLite
        };

        // إزالة القيم undefined لتجنب مشاكل الربط
        const cleanUserData = Object.fromEntries(
          Object.entries(userData).filter(([_, value]) => value !== undefined)
        );

        const [dbUser] = await db
          .insert(users)
          .values(cleanUserData as any)
          .returning();
        
        return dbUser;
      } catch (error: any) {
        console.error('❌ خطأ في إنشاء المستخدم في قاعدة البيانات:', error);
        
        // معالجة مخصصة للأخطاء الشائعة
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint failed')) {
          throw new Error('اسم المستخدم موجود بالفعل');
        }
        
        if (error.code === '42703' && error.message?.includes('role')) {
          console.error('⚠️ عمود role مفقود، محاولة بدونه...');
          try {
            // إعادة المحاولة بدون عمود role
            const basicUserData = { ...userData };
            delete (basicUserData as any).role;
            
            const [basicUser] = await db
              .insert(users)
              .values(basicUserData as any)
              .returning();
            
            // إضافة role يدوياً
            return { ...basicUser, role: basicUser.userType || 'member' } as any;
          } catch (fallbackError) {
            console.error('❌ فشل في الإنشاء حتى بدون عمود role:', fallbackError);
            throw new Error('خطأ في قاعدة البيانات - يرجى المحاولة لاحقاً');
          }
        }
        
        // إذا كانت قاعدة البيانات غير متاحة، استخدم الذاكرة
        console.warn('⚠️ قاعدة البيانات غير متاحة، استخدام الذاكرة للعضو');
        const id = this.currentUserId++;
        const user: User = {
          id,
          username: insertUser.username,
          password: insertUser.password || null,
          userType: insertUser.userType || "member",
          role: insertUser.role || insertUser.userType || "member",
          profileImage: insertUser.profileImage || "/default_avatar.svg",
          profileBanner: insertUser.profileBanner || null,
          profileBackgroundColor: insertUser.profileBackgroundColor || "#3c0d0d",
          status: insertUser.status || null,
          gender: insertUser.gender || "male",
          age: insertUser.age || null,
          country: insertUser.country || null,
          relation: insertUser.relation || null,
          bio: insertUser.bio || null,
          isOnline: true,
          isHidden: false,
          lastSeen: new Date(),
          joinDate: new Date(),
          createdAt: new Date(),
          isMuted: false,
          muteExpiry: null,
          isBanned: false,
          banExpiry: null,
          isBlocked: false,
          ipAddress: insertUser.ipAddress || null,
          deviceId: insertUser.deviceId || null,
          ignoredUsers: '[]',
          usernameColor: insertUser.usernameColor || '#FFFFFF',
          userTheme: insertUser.userTheme || 'default'
        };
        
        this.users.set(id, user);
        return user;
      }
    } else {
      // Store guests in memory (temporary, no profile picture upload)
      const id = this.currentUserId++;
      const user: User = {
        id,
        username: insertUser.username,
        password: insertUser.password || null,
        userType: insertUser.userType || "guest",
        role: insertUser.role || insertUser.userType || "guest",
        bio: insertUser.bio || null,
        profileBackgroundColor: "#3c0d0d",
        profileImage: "/default_avatar.svg", // Guests always use default
        profileBanner: null, // Guests cannot have banners
        status: insertUser.status || null,
        gender: insertUser.gender || null,
        age: insertUser.age || null,
        country: insertUser.country || null,
        relation: insertUser.relation || null,
        isOnline: true,
        lastSeen: new Date(),
        joinDate: new Date(),
        createdAt: new Date(),
        isMuted: false,
        muteExpiry: null,
        isBanned: false,
        banExpiry: null,
        isBlocked: false,
        ipAddress: null,
        deviceId: null,
        ignoredUsers: '[]',
        usernameColor: '#FFFFFF',
        userTheme: 'default',
        isHidden: 0
      };
      
      this.users.set(id, user);
      return user;
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    // Check if user is in memory (guest)
    const memUser = this.users.get(id);
    if (memUser) {
      // Guests cannot upload profile pictures or banners
      if (updates.profileImage && memUser.userType === 'guest') {
        delete updates.profileImage;
      }
      if (updates.profileBanner && memUser.userType === 'guest') {
        delete updates.profileBanner;
      }
      const updatedUser = { ...memUser, ...updates };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    
    // Check if user is in database (member)
    try {
      const [existing] = await db.select().from(users).where(eq(users.id, id));
      if (existing && (existing.userType === 'member' || existing.userType === 'owner')) {
        // Members can upload profile pictures and change themes
        const updateData: Partial<User> = { ...updates };
        
        // تأكد من أن الحقول المطلوبة موجودة
              if (updates.userTheme !== undefined) {
        updateData.userTheme = updates.userTheme;
      }
      
      if (updates.profileEffect !== undefined) {
        updateData.profileEffect = updates.profileEffect;
      }
        if (updates.usernameColor !== undefined) {
          updateData.usernameColor = updates.usernameColor;
        }
        
        const [updatedUser] = await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, id))
          .returning();
        
        return updatedUser;
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
    
    return undefined;
  }

  async setUserOnlineStatus(id: number, isOnline: boolean): Promise<void> {
    // Check memory first (guests)
    const memUser = this.users.get(id);
    if (memUser) {
      memUser.isOnline = isOnline;
      memUser.lastSeen = new Date();
      this.users.set(id, memUser);
      return;
    }

    // Check database (members) - Fix SQLite binding issues
    if (db) {
      try {
        await db
          .update(users)
          .set({ 
            isOnline: isOnline ? 1 : 0,  // Convert boolean to number for SQLite
            lastSeen: new Date().toISOString()  // Convert to ISO string for SQLite
          })
          .where(eq(users.id, id));
      } catch (error) {
        console.error('Error updating user online status:', error);
      }
    }
  }

  async getOnlineUsers(): Promise<User[]> {
    const memUsers = Array.from(this.users.values()).filter(user => user.isOnline && !user.isHidden);
    
    // Get online members from database (excluding hidden)
    if (db) {
      try {
        const dbUsers = await db.select().from(users).where(eq(users.isOnline, true));
        const visibleDbUsers = dbUsers.filter(user => !user.isHidden);
        
        // Convert SQLite integer booleans to JavaScript booleans for consistency
        const convertedDbUsers = visibleDbUsers.map(user => ({
          ...user,
          isOnline: !!user.isOnline,
          isHidden: !!user.isHidden,
          isMuted: !!user.isMuted,
          isBanned: !!user.isBanned,
          isBlocked: !!user.isBlocked,
          lastSeen: user.lastSeen ? new Date(user.lastSeen) : null,
          joinDate: user.joinDate ? new Date(user.joinDate) : new Date(),
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
          muteExpiry: user.muteExpiry ? new Date(user.muteExpiry) : null,
          banExpiry: user.banExpiry ? new Date(user.banExpiry) : null,
          ignoredUsers: user.ignoredUsers ? JSON.parse(user.ignoredUsers) : []
        }));
        
        return [...memUsers, ...convertedDbUsers];
      } catch (error) {
        console.error('Error getting online users from database:', error);
        return memUsers;
      }
    }
    return memUsers;
  }

  async setUserHiddenStatus(id: number, isHidden: boolean): Promise<void> {
    // Check memory first (guests)
    const memUser = this.users.get(id);
    if (memUser) {
      memUser.isHidden = isHidden;
      this.users.set(id, memUser);
      return;
    }

    // Check database (members) - Fix SQLite binding
    if (db) {
      try {
        await db.update(users).set({ isHidden: isHidden ? 1 : 0 } as any).where(eq(users.id, id));
      } catch (error) {
        console.error('Error updating user hidden status:', error);
      }
    }
  }

  async addIgnoredUser(userId: number, ignoredUserId: number): Promise<void> {
    // Check memory first (guests)
    const memUser = this.users.get(userId);
    if (memUser) {
      if (!memUser.ignoredUsers) memUser.ignoredUsers = '[]';
      const ignoredArray = JSON.parse(memUser.ignoredUsers as string);
      if (!ignoredArray.includes(ignoredUserId.toString())) {
        ignoredArray.push(ignoredUserId.toString());
        memUser.ignoredUsers = JSON.stringify(ignoredArray);
        this.users.set(userId, memUser);
      }
      return;
    }

    // Check database (members) - Fix array handling for SQLite
    if (db) {
      try {
        const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
        if (dbUser) {
          let currentIgnored: string[] = [];
          try {
            currentIgnored = Array.isArray(dbUser.ignoredUsers) ? dbUser.ignoredUsers : 
                           (typeof dbUser.ignoredUsers === 'string' ? JSON.parse(dbUser.ignoredUsers) : []);
          } catch {
            currentIgnored = [];
          }
          
          if (!currentIgnored.includes(ignoredUserId.toString())) {
            currentIgnored.push(ignoredUserId.toString());
            await db.update(users).set({ ignoredUsers: JSON.stringify(currentIgnored) } as any).where(eq(users.id, userId));
          }
        }
      } catch (error) {
        console.error('Error adding ignored user:', error);
      }
    }
  }

  async removeIgnoredUser(userId: number, ignoredUserId: number): Promise<void> {
    // Check memory first (guests)
    const memUser = this.users.get(userId);
    if (memUser && memUser.ignoredUsers) {
      const ignoredArray = JSON.parse(memUser.ignoredUsers as string);
      const filteredArray = ignoredArray.filter((id: string) => id !== ignoredUserId.toString());
      memUser.ignoredUsers = JSON.stringify(filteredArray);
      this.users.set(userId, memUser);
      return;
    }

    // Check database (members) - Fix array handling for SQLite
    if (db) {
      try {
        const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
        if (dbUser && dbUser.ignoredUsers) {
          let currentIgnored: string[] = [];
          try {
            currentIgnored = Array.isArray(dbUser.ignoredUsers) ? dbUser.ignoredUsers : 
                           (typeof dbUser.ignoredUsers === 'string' ? JSON.parse(dbUser.ignoredUsers) : []);
          } catch {
            currentIgnored = [];
          }
          
          const filteredIgnored = currentIgnored.filter(id => id !== ignoredUserId.toString());
          await db.update(users).set({ ignoredUsers: JSON.stringify(filteredIgnored) } as any).where(eq(users.id, userId));
        }
      } catch (error) {
        console.error('Error removing ignored user:', error);
      }
    }
  }

  async getIgnoredUsers(userId: number): Promise<number[]> {
    // Check memory first (guests)
    const memUser = this.users.get(userId);
    if (memUser && memUser.ignoredUsers) {
      const ignoredArray = JSON.parse(memUser.ignoredUsers as string);
      return ignoredArray.map((id: string) => parseInt(id));
    }
    
    // Check database (members) - Fix array parsing for SQLite
    if (db) {
      try {
        const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
        if (dbUser && dbUser.ignoredUsers) {
          let ignoredArray: string[] = [];
          try {
            ignoredArray = Array.isArray(dbUser.ignoredUsers) ? dbUser.ignoredUsers : 
                          (typeof dbUser.ignoredUsers === 'string' ? JSON.parse(dbUser.ignoredUsers) : []);
          } catch {
            ignoredArray = [];
          }
          return ignoredArray.map(id => parseInt(id));
        }
      } catch (error) {
        console.error('Error getting ignored users:', error);
      }
    }
    
    return [];
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    try {
      // Always try database first for persistence
      const [dbMessage] = await db
        .insert(messages)
        .values({
          senderId: insertMessage.senderId,
          receiverId: insertMessage.receiverId,
          roomId: (insertMessage as any).roomId || 'general',
          content: insertMessage.content,
          messageType: insertMessage.messageType || 'text',
          isPrivate: insertMessage.isPrivate || false,
        } as any)
        .returning();
      
      return dbMessage;
    } catch (error) {
      console.error('Database insert failed, using memory:', error);
      // Fallback to memory for guests or if database fails
      const message: Message = {
        id: this.currentMessageId++,
        senderId: insertMessage.senderId,
        receiverId: insertMessage.receiverId,
        content: insertMessage.content,
        messageType: insertMessage.messageType || 'text',
        isPrivate: insertMessage.isPrivate || false,
        timestamp: new Date(),
      };
      
      this.messages.set(message.id, message);
      return message;
    }
  }

  async getPublicMessages(limit: number = 50): Promise<Message[]> {
    // Get from memory first
    const memMessages = Array.from(this.messages.values())
      .filter(msg => !msg.isPrivate)
      .sort((a, b) => {
        const aTime = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : (a.timestamp || new Date()).getTime();
        const bTime = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : (b.timestamp || new Date()).getTime();
        return aTime - bTime;
      });
    
    // Try to get from database as well
    try {
      const dbMessages = await db.select().from(messages)
        .where(eq(messages.isPrivate, false))
        .orderBy(desc(messages.timestamp))
        .limit(limit);
      
      // Combine both sources and remove duplicates
      const allMessages = [...memMessages, ...dbMessages];
      const uniqueMessages = allMessages.filter((msg, index, arr) => 
        index === arr.findIndex(m => m.id === msg.id)
      );
      
      return uniqueMessages
        .sort((a, b) => (a.timestamp || new Date()).getTime() - (b.timestamp || new Date()).getTime())
        .slice(-limit);
    } catch (error) {
      console.error('Error getting database messages:', error);
      return memMessages.slice(-limit);
    }
  }

  async getPrivateMessages(userId1: number, userId2: number, limit: number = 50): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(msg => 
        msg.isPrivate && 
        ((msg.senderId === userId1 && msg.receiverId === userId2) ||
         (msg.senderId === userId2 && msg.receiverId === userId1))
      )
      .sort((a, b) => (a.timestamp || new Date()).getTime() - (b.timestamp || new Date()).getTime())
      .slice(-limit);
  }

  async addFriend(userId: number, friendId: number): Promise<Friend> {
    // إضافة الصداقة في الاتجاه الأول
    const id1 = this.currentFriendId++;
    const friend1: Friend = {
      id: id1,
      userId,
      friendId,
      status: "accepted",
      createdAt: new Date().toISOString(),
    };
    this.friends.set(id1, friend1);

    // إضافة الصداقة في الاتجاه المعاكس
    const id2 = this.currentFriendId++;
    const friend2: Friend = {
      id: id2,
      userId: friendId,
      friendId: userId,
      status: "accepted",
      createdAt: new Date().toISOString(),
    };
    this.friends.set(id2, friend2);

    return friend1;
  }

  async getFriends(userId: number): Promise<User[]> {
    const friendships = Array.from(this.friends.values())
      .filter(f => (f.userId === userId || f.friendId === userId) && f.status === "accepted");
    
    const friendIds = [...new Set(friendships.map(f => 
      f.userId === userId ? f.friendId : f.userId
    ))]; // إزالة التكرار
    
    const friends: User[] = [];
    
    for (const friendId of friendIds) {
      if (friendId) {
        // Check memory first
        const memFriend = this.users.get(friendId);
        if (memFriend) {
          friends.push(memFriend);
        } else {
          // Check database
          try {
            const [dbFriend] = await db.select().from(users).where(eq(users.id, friendId));
            if (dbFriend) friends.push(dbFriend);
          } catch (error) {
            console.error('Error fetching friend from database:', error);
          }
        }
      }
    }
    
    return friends;
  }

  async updateFriendStatus(userId: number, friendId: number, status: string): Promise<void> {
    const friendship = Array.from(this.friends.values())
      .find(f => (f.userId === userId && f.friendId === friendId) || 
                  (f.userId === friendId && f.friendId === userId));
    
    if (friendship) {
      friendship.status = status;
      this.friends.set(friendship.id, friendship);
    }
  }

  async getBlockedUsers(userId: number): Promise<User[]> {
    const blockedFriendships = Array.from(this.friends.values())
      .filter(f => f.userId === userId && f.status === "blocked");
    
    const blockedIds = blockedFriendships.map(f => f.friendId);
    return blockedIds.map(id => this.users.get(id!)).filter(Boolean) as User[];
  }

  // Enhanced friend request operations
  async getIncomingFriendRequests(userId: number): Promise<any[]> {
    try {
      if (!db) {
        const incomingRequests = Array.from(this.friendRequests.values())
          .filter(r => r.friendId === userId && r.status === 'pending');
        
                  return await Promise.all(incomingRequests.map(async (request) => {
            const sender = await this.getUser(request.userId);
          return {
            ...request,
            sender
          };
        }));
      }

      const requests = await db
        .select()
        .from(friends)
        .where(and(
          eq(friends.friendId, userId),
          eq(friends.status, 'pending')
        ));

              return await Promise.all(requests.map(async (request) => {
          const sender = await this.getUser(request.userId);
        return {
          ...request,
          sender
        };
      }));
    } catch (error) {
      console.error('Error getting incoming friend requests:', error);
      return [];
    }
  }

  async getOutgoingFriendRequests(userId: number): Promise<any[]> {
    try {
      if (!db) {
        const outgoingRequests = Array.from(this.friendRequests.values())
          .filter(r => r.userId === userId && r.status === 'pending');
        
                  return await Promise.all(outgoingRequests.map(async (request) => {
            const receiver = await this.getUser(request.friendId);
          return {
            ...request,
            receiver
          };
        }));
      }

      const requests = await db
        .select()
        .from(friends)
        .where(and(
          eq(friends.userId, userId),
          eq(friends.status, 'pending')
        ));

              return await Promise.all(requests.map(async (request) => {
          const receiver = await this.getUser(request.friendId);
        return {
          ...request,
          receiver
        };
      }));
    } catch (error) {
      console.error('Error getting outgoing friend requests:', error);
      return [];
    }
  }

  async acceptFriendRequest(requestId: number): Promise<boolean> {
    try {
      if (!db) {
        const request = this.friendRequests.get(requestId);
        if (!request || request.status !== 'pending') return false;
        
        request.status = 'accepted';
        this.friendRequests.set(requestId, request);
        
        // Add to friends list
        await this.addFriend(request.userId, request.friendId);
        return true;
      }

      const [request] = await db
        .select()
        .from(friends)
        .where(eq(friends.id, requestId));

      if (!request || request.status !== 'pending') return false;

      // Update request status
      await db
        .update(friends)
        .set({ 
          status: 'accepted',
          createdAt: new Date()
        })
        .where(eq(friends.id, requestId));

      // Add to friends list
      await this.addFriend(request.userId, request.friendId);
      return true;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return false;
    }
  }

  async declineFriendRequest(requestId: number): Promise<boolean> {
    const request = this.friendRequests.get(requestId);
    if (!request || request.status !== 'pending') return false;
    
    request.status = 'declined';
    this.friendRequests.set(requestId, request);
    return true;
  }

  async ignoreFriendRequest(requestId: number): Promise<boolean> {
    const request = this.friendRequests.get(requestId);
    if (!request || request.status !== 'pending') return false;
    
    request.status = 'ignored';
    this.friendRequests.set(requestId, request);
    return true;
  }

  async deleteFriendRequest(requestId: number): Promise<boolean> {
    const request = this.friendRequests.get(requestId);
    if (!request) return false;
    
    this.friendRequests.delete(requestId);
    return true;
  }

  async removeFriend(userId: number, friendId: number): Promise<boolean> {
    const friendship = Array.from(this.friends.values())
      .find(f => (f.userId === userId && f.friendId === friendId) || 
                 (f.userId === friendId && f.friendId === userId));
    
    if (!friendship) return false;
    
    this.friends.delete(friendship.id);
    return true;
  }

  // Friend Request Operations
  async getAllUsers(): Promise<User[]> {
    try {
      const dbUsers = await db.select().from(users);
      const memoryUsers = Array.from(this.users.values());
      return [...dbUsers, ...memoryUsers];
    } catch (error) {
      console.error("خطأ في الحصول على جميع المستخدمين:", error);
      return Array.from(this.users.values());
    }
  }

  async getFriendship(userId1: number, userId2: number): Promise<Friend | undefined> {
    return Array.from(this.friends.values()).find(
      f => ((f.userId === userId1 && f.friendId === userId2) ||
           (f.userId === userId2 && f.friendId === userId1)) &&
           f.status === "accepted"
    );
  }

  async createFriendRequest(senderId: number, receiverId: number): Promise<any> {
    try {
      if (!db) {
        // Fallback to memory storage
        const request = {
          id: this.currentRequestId++,
          userId: senderId,
          friendId: receiverId,
          status: 'pending',
          createdAt: new Date().toISOString(),
          sender: await this.getUser(senderId),
          receiver: await this.getUser(receiverId)
        };
        this.friendRequests.set(request.id, request);
        return request;
      }

      const [newRequest] = await db
        .insert(friends)
        .values({
          userId: senderId,
          friendId: receiverId,
          status: 'pending'
        })
        .returning();

      return {
        ...newRequest,
        sender: await this.getUser(newRequest.userId),
        receiver: await this.getUser(newRequest.friendId)
      };
    } catch (error) {
      console.error('Error creating friend request:', error);
      throw error;
    }
  }

  async getFriendRequest(senderId: number, receiverId: number): Promise<any> {
    try {
      if (!db) {
        return Array.from(this.friendRequests.values()).find(
          r => r.userId === senderId && r.friendId === receiverId && r.status === 'pending'
        );
      }

      const [request] = await db
        .select()
        .from(friends)
        .where(and(
          eq(friends.userId, senderId),
          eq(friends.friendId, receiverId),
          eq(friends.status, 'pending')
        ));

      return request;
    } catch (error) {
      console.error('Error getting friend request:', error);
      return null;
    }
  }

  async getFriendRequestById(requestId: number): Promise<any> {
    try {
      if (!db) {
        return this.friendRequests.get(requestId);
      }

      const [request] = await db
        .select()
        .from(friends)
        .where(eq(friends.id, requestId));

      if (request) {
        return {
          ...request,
          sender: await this.getUser(request.userId),
          receiver: await this.getUser(request.friendId)
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting friend request by ID:', error);
      return null;
    }
  }



  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const [newNotification] = await db
        .insert(notifications)
        .values(notification as any)
        .returning();
      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async getUserNotifications(userId: number, limit: number = 50): Promise<Notification[]> {
    try {
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
      return userNotifications;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: number): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true } as any)
        .where(eq(notifications.id, notificationId));
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true } as any)
        .where(eq(notifications.userId, userId));
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  async deleteNotification(notificationId: number): Promise<boolean> {
    try {
      await db.delete(notifications).where(eq(notifications.id, notificationId));
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    try {
      const result = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId));
      return result.length;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
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
      if (!db) {
        // في وضع الذاكرة، لا يمكن حفظ الأجهزة المحجوبة
        console.warn('Cannot block device in memory mode');
        return false;
      }
      
      // Table should already exist from database initialization

      await db.execute(sql`
        INSERT INTO blocked_devices 
        (ip_address, device_id, user_id, reason, blocked_at, blocked_by)
        VALUES (${blockData.ipAddress}, ${blockData.deviceId}, ${blockData.userId}, 
                ${blockData.reason}, ${blockData.blockedAt.toISOString()}, ${blockData.blockedBy})
        ON CONFLICT (ip_address, device_id) DO UPDATE SET
        reason = EXCLUDED.reason,
        blocked_at = EXCLUDED.blocked_at,
        blocked_by = EXCLUDED.blocked_by
      `);
      
      return true;
    } catch (error) {
      console.error('Error creating blocked device:', error);
      return false;
    }
  }

  async isDeviceBlocked(ipAddress: string, deviceId: string): Promise<boolean> {
    try {
      if (!db) {
        // في وضع الذاكرة، لا توجد أجهزة محجوبة
        return false;
      }
      
      const result = await db.execute(sql`
        SELECT COUNT(*) as count FROM blocked_devices 
        WHERE ip_address = ${ipAddress} OR device_id = ${deviceId}
      `);
      
      return ((result as any)?.count || 0) > 0;
    } catch (error) {
      console.error('Error checking blocked device:', error);
      return false;
    }
  }

  async getBlockedDevices(): Promise<Array<{ipAddress: string, deviceId: string}>> {
    try {
      if (!db) {
        // في وضع الذاكرة، لا توجد أجهزة محجوبة
        return [];
      }
      
      // Use Drizzle ORM select query instead of raw SQL
      try {
        const result = await db.select({
          ipAddress: blockedDevices.ipAddress,
          deviceId: blockedDevices.deviceId
        }).from(blockedDevices);
        
        return result || [];
      } catch (queryError) {
        // Fallback for empty table or table doesn't exist
        return [];
      }
    } catch (error) {
      console.error('Error getting blocked devices:', error);
      return [];
    }
  }

  // Points system methods
  async updateUserPoints(userId: number, pointsData: {
    points: number;
    level: number;
    totalPoints: number;
    levelProgress: number;
  }): Promise<void> {
    try {
      const user = await this.getUser(userId);
      if (!user) return;

      if (user.userType === 'guest') {
        // تحديث المستخدم الضيف في الذاكرة
        const userData = this.users.get(userId);
        if (userData) {
          Object.assign(userData, pointsData);
        }
      } else {
        // تحديث المستخدم العضو في قاعدة البيانات
        await db.update(users)
          .set(pointsData)
          .where(eq(users.id, userId));
      }
    } catch (error) {
      console.error('Error updating user points:', error);
    }
  }

  async addPointsHistory(userId: number, points: number, reason: string, action: string): Promise<void> {
    try {
      const user = await this.getUser(userId);
      if (!user || user.userType === 'guest') return; // لا نحفظ تاريخ نقاط الضيوف

      // إضافة سجل في تاريخ النقاط للأعضاء فقط
      await db.execute(sql`
        INSERT INTO points_history (user_id, points, reason, action, created_at)
        VALUES (${userId}, ${points}, ${reason}, ${action}, ${new Date().toISOString()})
      `);
    } catch (error) {
      console.error('Error adding points history:', error);
    }
  }

  async getPointsHistory(userId: number, limit: number = 50): Promise<any[]> {
    try {
      const user = await this.getUser(userId);
      if (!user || user.userType === 'guest') return [];

      const result = await db.execute(sql`
        SELECT * FROM points_history 
        WHERE user_id = ${userId} 
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `);
      return result || [];
    } catch (error) {
      console.error('Error getting points history:', error);
      return [];
    }
  }

  async getTopUsersByPoints(limit: number = 20): Promise<User[]> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM users 
        WHERE user_type != 'guest'
        ORDER BY total_points DESC 
        LIMIT ${limit}
      `);
      return result || [];
    } catch (error) {
      console.error('Error getting top users by points:', error);
      return [];
    }
  }

  async getUserMessageCount(userId: number): Promise<number> {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count FROM messages 
        WHERE sender_id = ${userId}
      `);
      return result?.[0]?.count || 0;
    } catch (error) {
      console.error('Error getting user message count:', error);
      return 0;
    }
  }

  async getUserLastDailyLogin(userId: number): Promise<string | null> {
    try {
      const user = await this.getUser(userId);
      if (!user) return null;

      // نحفظ آخر تسجيل دخول يومي في حقل منفصل أو نستخدم last_seen
      // هنا سنستخدم طريقة بسيطة بحفظها في الذاكرة للضيوف
      if (user.userType === 'guest') {
        // للضيوف، نحفظ في الذاكرة (لن يحصلوا على نقاط يومية فعلياً)
        return null;
      }

      // للأعضاء، يمكن استخدام last_seen أو إضافة حقل جديد
      return user.lastSeen ? new Date(user.lastSeen).toDateString() : null;
    } catch (error) {
      console.error('Error getting user last daily login:', error);
      return null;
    }
  }

  async updateUserLastDailyLogin(userId: number, date: string): Promise<void> {
    try {
      const user = await this.getUser(userId);
      if (!user || user.userType === 'guest') return;

      // تحديث تاريخ آخر تسجيل دخول يومي
      await db.update(users)
        .set({ lastSeen: new Date() })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Error updating user last daily login:', error);
    }
  }

  // ============ دوال الحوائط ============

  // إنشاء منشور جديد
  async createWallPost(postData: {
    userId: number;
    username: string;
    userRole: string;
    content: string;
    imageUrl?: string | null;
    type: string;
    timestamp: Date;
    userProfileImage?: string | null;
    usernameColor?: string;
  }): Promise<{
    id: number;
    userId: number;
    username: string;
    userRole: string;
    content: string;
    imageUrl?: string | null;
    type: string;
    timestamp: Date;
    userProfileImage?: string | null;
    usernameColor?: string;
    reactions: any[];
    totalLikes: number;
    totalDislikes: number;
    totalHearts: number;
  }> {
    try {
      // في الوقت الحالي، سنحفظ البيانات في الذاكرة
      // يمكن إضافة جدول قاعدة بيانات لاحقاً
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

  // جلب منشورات الحائط
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

  // جلب منشورات مستخدمين محددين
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

  // جلب منشور واحد
  async getWallPost(postId: number): Promise<{
    id: number;
    userId: number;
    username: string;
    userRole: string;
    content: string;
    imageUrl?: string | null;
    type: string;
    timestamp: Date;
    userProfileImage?: string | null;
    usernameColor?: string;
    reactions: any[];
    totalLikes: number;
    totalDislikes: number;
    totalHearts: number;
  } | null> {
    try {
      if (!global.wallPosts) {
        return null;
      }
      
      return global.wallPosts.find(post => post.id === postId) || null;
    } catch (error) {
      console.error('Error getting wall post:', error);
      return null;
    }
  }

  // حذف منشور
  async deleteWallPost(postId: number): Promise<void> {
    try {
      if (!global.wallPosts) {
        return;
      }
      
      global.wallPosts = global.wallPosts.filter(post => post.id !== postId);
    } catch (error) {
      console.error('Error deleting wall post:', error);
      throw error;
    }
  }

  // إضافة تفاعل
  async addWallReaction(reactionData: {
    postId: number;
    userId: number;
    username: string;
    type: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      if (!global.wallPosts) {
        global.wallPosts = [];
      }
      
      const postIndex = global.wallPosts.findIndex(post => post.id === reactionData.postId);
      if (postIndex === -1) {
        throw new Error('المنشور غير موجود');
      }
      
      const post = global.wallPosts[postIndex];
      
      // إزالة التفاعل السابق للمستخدم إن وجد
      post.reactions = post.reactions.filter(r => r.userId !== reactionData.userId);
      
      // إضافة التفاعل الجديد
      post.reactions.push({
        id: Date.now(),
        ...reactionData
      });
      
      // إعادة حساب التفاعلات
      post.totalLikes = post.reactions.filter(r => r.type === 'like').length;
      post.totalDislikes = post.reactions.filter(r => r.type === 'dislike').length;
      post.totalHearts = post.reactions.filter(r => r.type === 'heart').length;
      
    } catch (error) {
      console.error('Error adding wall reaction:', error);
      throw error;
    }
  }

  // جلب منشور مع التفاعلات
  async getWallPostWithReactions(postId: number): Promise<any | null> {
    try {
      return await this.getWallPost(postId);
    } catch (error) {
      console.error('Error getting wall post with reactions:', error);
      return null;
    }
  }

  // جلب أصدقاء المستخدم (دالة مساعدة للحوائط)
  async getUserFriends(userId: number): Promise<any[]> {
    try {
      return await this.getFriends(userId);
    } catch (error) {
      console.error('Error getting user friends:', error);
      return [];
    }
  }

  // ===================
  // وظائف الغرف
  // ===================

  async getAllRooms(): Promise<any[]> {
    if (this.usePG) {
      try {
        const result = await this.pool.query(`
          SELECT 
            r.*,
            COUNT(DISTINCT ru.user_id) as user_count
          FROM rooms r 
          LEFT JOIN room_users ru ON r.id = ru.room_id 
          WHERE r.is_active = true
          GROUP BY r.id
          ORDER BY r.is_default DESC, r.created_at ASC
        `);
        return result.rows;
      } catch (error) {
        console.error('خطأ في جلب الغرف من PostgreSQL:', error);
        throw error;
      }
    } else {
      // SQLite fallback
      try {
        const sqliteDb = getDirectSqliteConnection();
        if (sqliteDb) {
          const rooms = await sqliteDb.all(`
            SELECT 
              r.*,
              COUNT(DISTINCT ru.user_id) as user_count
            FROM rooms r 
            LEFT JOIN room_users ru ON r.id = ru.room_id 
            WHERE r.is_active = 1
            GROUP BY r.id
            ORDER BY r.is_default DESC, r.created_at ASC
          `);
          return rooms || [];
        }
      } catch (error) {
        console.error('خطأ في جلب الغرف:', error);
        // إرجاع الغرف الافتراضية مع غرفة البث
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
    }
  }

  async getRoom(roomId: string): Promise<any | null> {
    if (this.usePG) {
      try {
        const result = await this.pool.query(`
          SELECT 
            r.*,
            COUNT(DISTINCT ru.user_id) as user_count
          FROM rooms r 
          LEFT JOIN room_users ru ON r.id = ru.room_id 
          WHERE r.id = $1
          GROUP BY r.id
        `, [roomId]);
        return result.rows[0] || null;
      } catch (error) {
        console.error('خطأ في جلب الغرفة من PostgreSQL:', error);
        throw error;
      }
    } else {
      try {
        const sqliteDb = getDirectSqliteConnection();
        if (sqliteDb) {
          const room = await sqliteDb.get(`
            SELECT 
              r.*,
              COUNT(DISTINCT ru.user_id) as user_count
            FROM rooms r 
            LEFT JOIN room_users ru ON r.id = ru.room_id 
            WHERE r.id = ?
            GROUP BY r.id
          `, [roomId]);
          return room || null;
        }
      } catch (error) {
        console.error('خطأ في جلب الغرفة:', error);
        return null;
      }
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
  }): Promise<{
    id: string;
    name: string;
    description: string;
    icon: string;
    createdBy: number;
    isDefault: boolean;
    isActive: boolean;
    isBroadcast?: boolean;
    hostId?: number;
    speakers?: string;
    micQueue?: string;
    createdAt: Date;
    userCount?: number;
  }> {
    if (this.usePG) {
      try {
        const result = await this.pool.query(`
          INSERT INTO rooms (id, name, description, icon, created_by, is_default, is_active, is_broadcast, host_id, speakers, mic_queue, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *
        `, [
          `room_${Date.now()}`,
          roomData.name,
          roomData.description,
          roomData.icon,
          roomData.createdBy,
          roomData.isDefault,
          roomData.isActive,
          roomData.isBroadcast || false,
          roomData.hostId || roomData.createdBy,
          '[]', // speakers (empty array)
          '[]', // mic_queue (empty array)
          new Date()
        ]);
        return result.rows[0];
      } catch (error) {
        console.error('خطأ في إنشاء الغرفة في PostgreSQL:', error);
        throw error;
      }
    } else {
      try {
        const sqliteDb = getDirectSqliteConnection();
        if (sqliteDb) {
          const roomId = `room_${Date.now()}`;
          await sqliteDb.run(`
            INSERT INTO rooms (id, name, description, icon, created_by, is_default, is_active, is_broadcast, host_id, speakers, mic_queue, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            roomId,
            roomData.name,
            roomData.description,
            roomData.icon,
            roomData.createdBy,
            roomData.isDefault ? 1 : 0,
            roomData.isActive ? 1 : 0,
            roomData.isBroadcast ? 1 : 0,
            roomData.hostId || roomData.createdBy,
            '[]', // speakers (empty array)
            '[]', // mic_queue (empty array)
            new Date().toISOString()
          ]);

          return {
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
            created_at: new Date(),
            user_count: 0
          };
        }
      } catch (error) {
        console.error('خطأ في إنشاء الغرفة:', error);
        throw error;
      }
    }
  }

  async deleteRoom(roomId: string): Promise<void> {
    if (this.usePG) {
      try {
        await this.pool.query('DELETE FROM room_users WHERE room_id = $1', [roomId]);
        await this.pool.query('DELETE FROM rooms WHERE id = $1', [roomId]);
      } catch (error) {
        console.error('خطأ في حذف الغرفة من PostgreSQL:', error);
        throw error;
      }
    } else {
      try {
        const sqliteDb = getDirectSqliteConnection();
        if (sqliteDb) {
          await sqliteDb.run('DELETE FROM room_users WHERE room_id = ?', [roomId]);
          await sqliteDb.run('DELETE FROM rooms WHERE id = ?', [roomId]);
        }
      } catch (error) {
        console.error('خطأ في حذف الغرفة:', error);
        throw error;
      }
    }
  }

  async joinRoom(userId: number, roomId: string): Promise<void> {
    if (this.usePG) {
      try {
        await this.pool.query(`
          INSERT INTO room_users (user_id, room_id, joined_at)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, room_id) DO UPDATE SET joined_at = $3
        `, [userId, roomId, new Date()]);
      } catch (error) {
        console.error('خطأ في الانضمام للغرفة في PostgreSQL:', error);
        throw error;
      }
    } else {
      try {
        const sqliteDb = getDirectSqliteConnection();
        if (sqliteDb) {
          await sqliteDb.run(`
            INSERT OR REPLACE INTO room_users (user_id, room_id, joined_at)
            VALUES (?, ?, ?)
          `, [userId, roomId, new Date().toISOString()]);
        }
      } catch (error) {
        console.error('خطأ في الانضمام للغرفة:', error);
        throw error;
      }
    }
  }

  async leaveRoom(userId: number, roomId: string): Promise<void> {
    if (this.usePG) {
      try {
        await this.pool.query('DELETE FROM room_users WHERE user_id = $1 AND room_id = $2', [userId, roomId]);
      } catch (error) {
        console.error('خطأ في مغادرة الغرفة في PostgreSQL:', error);
        throw error;
      }
    } else {
      try {
        const sqliteDb = getDirectSqliteConnection();
        if (sqliteDb) {
          await sqliteDb.run('DELETE FROM room_users WHERE user_id = ? AND room_id = ?', [userId, roomId]);
        }
      } catch (error) {
        console.error('خطأ في مغادرة الغرفة:', error);
        throw error;
      }
    }
  }

  // Broadcast Room operations - الجديدة
  async requestMic(userId: number, roomId: string): Promise<boolean> {
    try {
      const room = await this.getRoom(roomId);
      if (!room || !room.is_broadcast) {
        return false;
      }

      // التحقق من أن المستخدم ليس في قائمة المتحدثين أو في قائمة الانتظار
      const currentInfo = await this.getBroadcastRoomInfo(roomId);
      if (!currentInfo) {
        return false;
      }

      if (currentInfo.speakers.includes(userId) || currentInfo.micQueue.includes(userId)) {
        return false;
      }

      // إضافة المستخدم لقائمة الانتظار
      const newQueue = [...currentInfo.micQueue, userId];
      
      if (this.usePG) {
        await this.pool.query(
          'UPDATE rooms SET mic_queue = $1 WHERE id = $2',
          [JSON.stringify(newQueue), roomId]
        );
      } else {
        const sqliteDb = getDirectSqliteConnection();
        if (sqliteDb) {
          await sqliteDb.run(
            'UPDATE rooms SET mic_queue = ? WHERE id = ?',
            [JSON.stringify(newQueue), roomId]
          );
        }
      }

      return true;
    } catch (error) {
      console.error('خطأ في طلب المايك:', error);
      return false;
    }
  }

  async approveMicRequest(roomId: string, userId: number, approvedBy: number): Promise<boolean> {
    try {
      const room = await this.getRoom(roomId);
      if (!room || !room.is_broadcast) {
        return false;
      }

      const currentInfo = await this.getBroadcastRoomInfo(roomId);
      if (!currentInfo) {
        return false;
      }

      // التحقق من أن المستخدم في قائمة الانتظار
      if (!currentInfo.micQueue.includes(userId)) {
        return false;
      }

      // إزالة المستخدم من قائمة الانتظار وإضافته للمتحدثين
      const newQueue = currentInfo.micQueue.filter(id => id !== userId);
      const newSpeakers = [...currentInfo.speakers, userId];

      if (this.usePG) {
        await this.pool.query(
          'UPDATE rooms SET mic_queue = $1, speakers = $2 WHERE id = $3',
          [JSON.stringify(newQueue), JSON.stringify(newSpeakers), roomId]
        );
      } else {
        const sqliteDb = getDirectSqliteConnection();
        if (sqliteDb) {
          await sqliteDb.run(
            'UPDATE rooms SET mic_queue = ?, speakers = ? WHERE id = ?',
            [JSON.stringify(newQueue), JSON.stringify(newSpeakers), roomId]
          );
        }
      }

      return true;
    } catch (error) {
      console.error('خطأ في الموافقة على طلب المايك:', error);
      return false;
    }
  }

  async rejectMicRequest(roomId: string, userId: number, rejectedBy: number): Promise<boolean> {
    try {
      const room = await this.getRoom(roomId);
      if (!room || !room.is_broadcast) {
        return false;
      }

      const currentInfo = await this.getBroadcastRoomInfo(roomId);
      if (!currentInfo) {
        return false;
      }

      // إزالة المستخدم من قائمة الانتظار
      const newQueue = currentInfo.micQueue.filter(id => id !== userId);

      if (this.usePG) {
        await this.pool.query(
          'UPDATE rooms SET mic_queue = $1 WHERE id = $2',
          [JSON.stringify(newQueue), roomId]
        );
      } else {
        const sqliteDb = getDirectSqliteConnection();
        if (sqliteDb) {
          await sqliteDb.run(
            'UPDATE rooms SET mic_queue = ? WHERE id = ?',
            [JSON.stringify(newQueue), roomId]
          );
        }
      }

      return true;
    } catch (error) {
      console.error('خطأ في رفض طلب المايك:', error);
      return false;
    }
  }

  async removeSpeaker(roomId: string, userId: number, removedBy: number): Promise<boolean> {
    try {
      const room = await this.getRoom(roomId);
      if (!room || !room.is_broadcast) {
        return false;
      }

      const currentInfo = await this.getBroadcastRoomInfo(roomId);
      if (!currentInfo) {
        return false;
      }

      // إزالة المستخدم من المتحدثين
      const newSpeakers = currentInfo.speakers.filter(id => id !== userId);

      if (this.usePG) {
        await this.pool.query(
          'UPDATE rooms SET speakers = $1 WHERE id = $2',
          [JSON.stringify(newSpeakers), roomId]
        );
      } else {
        const sqliteDb = getDirectSqliteConnection();
        if (sqliteDb) {
          await sqliteDb.run(
            'UPDATE rooms SET speakers = ? WHERE id = ?',
            [JSON.stringify(newSpeakers), roomId]
          );
        }
      }

      return true;
    } catch (error) {
      console.error('خطأ في إزالة المتحدث:', error);
      return false;
    }
  }

  async getBroadcastRoomInfo(roomId: string): Promise<{
    hostId: number;
    speakers: number[];
    micQueue: number[];
  } | null> {
    try {
      const room = await this.getRoom(roomId);
      if (!room || !room.is_broadcast) {
        return null;
      }

      return {
        hostId: room.host_id || room.created_by,
        speakers: room.speakers ? JSON.parse(room.speakers) : [],
        micQueue: room.mic_queue ? JSON.parse(room.mic_queue) : []
      };
    } catch (error) {
      console.error('خطأ في جلب معلومات غرفة البث:', error);
      return null;
    }
  }
}

export const storage = new MixedStorage();
