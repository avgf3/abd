import {
  users,
  messages,
  friends,
  notifications,
  type User,
  type InsertUser,
  type Message,
  type InsertMessage,
  type Friend,
  type InsertFriend,
  type Notification,
  type InsertNotification,
} from "../shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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
}

// Mixed storage: Database for members, Memory for guests
export class MixedStorage implements IStorage {
  private users: Map<number, User>;
  private messages: Map<number, Message>;
  private friends: Map<number, Friend>;
  private friendRequests: Map<number, any>;
  private currentUserId: number;
  private currentMessageId: number;
  private currentFriendId: number;
  private currentRequestId: number;

  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.friends = new Map();
    this.friendRequests = new Map();
    this.currentUserId = 1000; // Start guest IDs from 1000 to avoid conflicts
    this.currentMessageId = 1;
    this.currentFriendId = 1;
    this.currentRequestId = 1;

    // Initialize owner user in database
    this.initializeOwner();
  }

  private async initializeOwner() {
    try {
      // Check if owner already exists
      const existing = await db.select().from(users).where(eq(users.username, "عبدالكريم"));
      if (existing.length === 0) {
        // Create owner user in database
        await db.insert(users).values({
          username: "عبدالكريم",
          password: "عبدالكريم22333",
          userType: "owner",
          profileImage: "/default_avatar.svg",
          status: "مالك الموقع",
          gender: "ذكر",
          age: 30,
          country: "السعودية",
          relation: "مرتبط",
          isOnline: true,
          lastSeen: new Date(),
          joinDate: new Date(),
        });
      }

      // Check if admin already exists
      const existingAdmin = await db.select().from(users).where(eq(users.username, "عبود"));
      if (existingAdmin.length === 0) {
        // Create admin user in database
        await db.insert(users).values({
          username: "عبود",
          password: "22333",
          userType: "owner",
          profileImage: "/default_avatar.svg",
          status: "مشرف مؤقت",
          gender: "ذكر",
          age: 25,
          country: "العراق",
          relation: "أعزب",
          isOnline: false,
          lastSeen: new Date(),
          joinDate: new Date(),
        });
      }
    } catch (error) {
      console.error('Error initializing owner:', error);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    // Check memory first (for guests)
    const memUser = this.users.get(id);
    if (memUser) return memUser;
    
    // Check database (for members)
    try {
      const [dbUser] = await db.select().from(users).where(eq(users.id, id));
      return dbUser || undefined;
    } catch (error) {
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Check memory first (for guests)
    const memUser = Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
    if (memUser) return memUser;
    
    // Check database (for members)
    const [dbUser] = await db.select().from(users).where(eq(users.username, username));
    return dbUser || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (insertUser.userType === 'member' || insertUser.userType === 'owner') {
      // Store members in database with profile picture support
      const [dbUser] = await db
        .insert(users)
        .values({
          username: insertUser.username,
          password: insertUser.password,
          userType: insertUser.userType,
          profileImage: insertUser.profileImage || "/default_avatar.svg",
          profileBanner: insertUser.profileBanner || null,
          status: insertUser.status,
          gender: insertUser.gender,
          age: insertUser.age,
          country: insertUser.country,
          relation: insertUser.relation,
          isOnline: true,
          lastSeen: new Date(),
          joinDate: new Date(),
          usernameColor: '#FFFFFF',
          userTheme: 'default'
        })
        .returning();
      return dbUser;
    } else {
      // Store guests in memory (temporary, no profile picture upload)
      const id = this.currentUserId++;
      const user: User = {
        id,
        username: insertUser.username,
        password: insertUser.password || null,
        userType: insertUser.userType || "guest",
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
        isMuted: false,
        muteExpiry: null,
        isBanned: false,
        banExpiry: null,
        isBlocked: false,
        ipAddress: null,
        deviceId: null,
        ignoredUsers: [],
        usernameColor: '#FFFFFF',
        userTheme: 'default',
        isHidden: false
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
        const updateData: any = { ...updates };
        
        // تأكد من أن الحقول المطلوبة موجودة
        if (updates.userTheme !== undefined) {
          updateData.userTheme = updates.userTheme;
        }
        if (updates.usernameColor !== undefined) {
          updateData.usernameColor = updates.usernameColor;
        }
        
        const [updatedUser] = await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, id))
          .returning();
        
        console.log('Updated user in database:', updatedUser);
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

    // Check database (members)
    try {
      await db
        .update(users)
        .set({ 
          isOnline: isOnline,
          lastSeen: new Date()
        })
        .where(eq(users.id, id));
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
  }

  async getOnlineUsers(): Promise<User[]> {
    const memUsers = Array.from(this.users.values()).filter(user => user.isOnline && !user.isHidden);
    
    // Get online members from database (excluding hidden)
    try {
      const dbUsers = await db.select().from(users).where(eq(users.isOnline, true));
      
      // تنظيف حالة الكتم والطرد للمستخدمين المنتهية المدة
      const now = new Date();
      const cleanedDbUsers = dbUsers.map(user => {
        let cleaned = { ...user };
        
        // إذا انتهت مدة الكتم، نلغيها
        if (user.isMuted && user.muteExpiry && new Date(user.muteExpiry) <= now) {
          console.log(`🔄 إزالة الكتم المنتهي للمستخدم: ${user.username}`);
          cleaned.isMuted = false;
          cleaned.muteExpiry = null;
          // تحديث في قاعدة البيانات بشكل غير متزامن
          this.updateUser(user.id, { 
            isMuted: false, 
            muteExpiry: null 
          }).catch(console.error);
        }
        
        // إذا انتهت مدة الطرد، نلغيها
        if (user.isBanned && user.banExpiry && new Date(user.banExpiry) <= now) {
          console.log(`🔄 إزالة الطرد المنتهي للمستخدم: ${user.username}`);
          cleaned.isBanned = false;
          cleaned.banExpiry = null;
          // تحديث في قاعدة البيانات بشكل غير متزامن
          this.updateUser(user.id, { 
            isBanned: false, 
            banExpiry: null 
          }).catch(console.error);
        }
        
        return cleaned;
      });
      
      const visibleDbUsers = cleanedDbUsers.filter(user => !user.isHidden);
      return [...memUsers, ...visibleDbUsers];
    } catch (error) {
      return memUsers;
    }
  }

  async setUserHiddenStatus(id: number, isHidden: boolean): Promise<void> {
    // Check memory first (guests)
    const memUser = this.users.get(id);
    if (memUser) {
      memUser.isHidden = isHidden;
      this.users.set(id, memUser);
      return;
    }

    // Check database (members)
    try {
      await db.update(users).set({ isHidden }).where(eq(users.id, id));
    } catch (error) {
      console.error('Error updating user hidden status:', error);
    }
  }

  async addIgnoredUser(userId: number, ignoredUserId: number): Promise<void> {
    // Check memory first (guests)
    const memUser = this.users.get(userId);
    if (memUser) {
      if (!memUser.ignoredUsers) memUser.ignoredUsers = [];
      if (!memUser.ignoredUsers.includes(ignoredUserId.toString())) {
        memUser.ignoredUsers.push(ignoredUserId.toString());
        this.users.set(userId, memUser);
      }
      return;
    }

    // Check database (members)
    try {
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (dbUser) {
        const currentIgnored = dbUser.ignoredUsers || [];
        if (!currentIgnored.includes(ignoredUserId.toString())) {
          currentIgnored.push(ignoredUserId.toString());
          await db.update(users).set({ ignoredUsers: currentIgnored }).where(eq(users.id, userId));
        }
      }
    } catch (error) {
      console.error('Error adding ignored user:', error);
    }
  }

  async removeIgnoredUser(userId: number, ignoredUserId: number): Promise<void> {
    // Check memory first (guests)
    const memUser = this.users.get(userId);
    if (memUser && memUser.ignoredUsers) {
      memUser.ignoredUsers = memUser.ignoredUsers.filter(id => id !== ignoredUserId.toString());
      this.users.set(userId, memUser);
      return;
    }

    // Check database (members)
    try {
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (dbUser && dbUser.ignoredUsers) {
        const filteredIgnored = dbUser.ignoredUsers.filter(id => id !== ignoredUserId.toString());
        await db.update(users).set({ ignoredUsers: filteredIgnored }).where(eq(users.id, userId));
      }
    } catch (error) {
      console.error('Error removing ignored user:', error);
    }
  }

  async getIgnoredUsers(userId: number): Promise<number[]> {
    // Check memory first (guests)
    const memUser = this.users.get(userId);
    if (memUser && memUser.ignoredUsers) {
      return memUser.ignoredUsers.map(id => parseInt(id));
    }
    
    // Check database (members)
    try {
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (dbUser && dbUser.ignoredUsers) {
        return dbUser.ignoredUsers.map(id => parseInt(id));
      }
    } catch (error) {
      console.error('Error getting ignored users:', error);
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
          content: insertMessage.content,
          messageType: insertMessage.messageType || 'text',
          isPrivate: insertMessage.isPrivate || false,
          timestamp: new Date(),
        })
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
      .sort((a, b) => (a.timestamp || new Date()).getTime() - (b.timestamp || new Date()).getTime());
    
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
      createdAt: new Date(),
    };
    this.friends.set(id1, friend1);

    // إضافة الصداقة في الاتجاه المعاكس
    const id2 = this.currentFriendId++;
    const friend2: Friend = {
      id: id2,
      userId: friendId,
      friendId: userId,
      status: "accepted",
      createdAt: new Date(),
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
    const incomingRequests = Array.from(this.friends.values())
      .filter(f => f.friendId === userId && f.status === 'pending');
    
    return await Promise.all(incomingRequests.map(async (request) => {
      const user = await this.getUser(request.userId!);
      return {
        ...request,
        user
      };
    }));
  }

  async getOutgoingFriendRequests(userId: number): Promise<any[]> {
    const outgoingRequests = Array.from(this.friends.values())
      .filter(f => f.userId === userId && f.status === 'pending');
    
    return await Promise.all(outgoingRequests.map(async (request) => {
      const user = await this.getUser(request.friendId!);
      return {
        ...request,
        user
      };
    }));
  }

  async acceptFriendRequest(requestId: number): Promise<boolean> {
    const request = this.friends.get(requestId);
    if (!request || request.status !== 'pending') return false;
    
    request.status = 'accepted';
    this.friends.set(requestId, request);
    return true;
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
    const request = {
      id: this.currentRequestId++,
      senderId,
      receiverId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      sender: await this.getUser(senderId),
      receiver: await this.getUser(receiverId)
    };

    this.friendRequests.set(request.id, request);
    return request;
  }

  async getFriendRequest(senderId: number, receiverId: number): Promise<any> {
    return Array.from(this.friendRequests.values()).find(
      r => r.senderId === senderId && r.receiverId === receiverId && r.status === 'pending'
    );
  }

  async getFriendRequestById(requestId: number): Promise<any> {
    return this.friendRequests.get(requestId);
  }

  async getIncomingFriendRequests(userId: number): Promise<any[]> {
    const requests = Array.from(this.friendRequests.values()).filter(
      r => r.receiverId === userId && r.status === 'pending'
    );

    for (const request of requests) {
      request.sender = await this.getUser(request.senderId);
    }

    return requests;
  }

  async getOutgoingFriendRequests(userId: number): Promise<any[]> {
    const requests = Array.from(this.friendRequests.values()).filter(
      r => r.senderId === userId && r.status === 'pending'
    );

    for (const request of requests) {
      request.receiver = await this.getUser(request.receiverId);
    }

    return requests;
  }

  async acceptFriendRequest(requestId: number): Promise<boolean> {
    const request = this.friendRequests.get(requestId);
    if (!request) return false;

    request.status = 'accepted';
    this.friendRequests.set(requestId, request);
    return true;
  }

  async declineFriendRequest(requestId: number): Promise<boolean> {
    const request = this.friendRequests.get(requestId);
    if (!request) return false;

    request.status = 'declined';
    this.friendRequests.set(requestId, request);
    return true;
  }

  async deleteFriendRequest(requestId: number): Promise<boolean> {
    return this.friendRequests.delete(requestId);
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const [newNotification] = await db
        .insert(notifications)
        .values(notification)
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
        .set({ isRead: true })
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
        .set({ isRead: true })
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
        .where(eq(notifications.userId, userId))
        .where(eq(notifications.isRead, false));
      return result.length;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }
}

export const storage = new MixedStorage();
