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
  type Notification,
  type InsertNotification,
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, and, or } from "drizzle-orm";

// Clean, simple storage interface
export interface CleanStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(userData: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  setOnlineStatus(id: number, online: boolean): Promise<void>;

  // Messages
  createMessage(messageData: InsertMessage): Promise<Message>;
  getPublicMessages(limit?: number): Promise<Message[]>;
  getPrivateMessages(user1: number, user2: number, limit?: number): Promise<Message[]>;

  // Friends
  addFriend(userId: number, friendId: number): Promise<boolean>;
  removeFriend(userId: number, friendId: number): Promise<boolean>;
  getFriends(userId: number): Promise<User[]>;
  areFriends(user1: number, user2: number): Promise<boolean>;

  // Friend Requests
  sendFriendRequest(senderId: number, receiverId: number): Promise<boolean>;
  acceptFriendRequest(senderId: number, receiverId: number): Promise<boolean>;
  declineFriendRequest(senderId: number, receiverId: number): Promise<boolean>;
  getFriendRequests(userId: number): Promise<any[]>;

  // Notifications
  createNotification(data: InsertNotification): Promise<Notification>;
  getNotifications(userId: number): Promise<Notification[]>;
  markAsRead(notificationId: number): Promise<boolean>;
}

// Simple mixed storage implementation
export class SimpleMixedStorage implements CleanStorage {
  private memoryUsers = new Map<number, User>();
  private memoryMessages = new Map<number, Message>();
  private memoryFriends = new Map<string, Friend>();
  private memoryRequests = new Map<string, any>();
  private memoryNotifications = new Map<number, Notification>();
  
  private nextGuestId = 1000;
  private nextMessageId = 1;
  private nextNotificationId = 1;

  constructor() {
    this.initializeOwner();
  }

  private async initializeOwner() {
    try {
      const existing = await db.select().from(users).where(eq(users.username, "عبود"));
      if (existing.length === 0) {
        await db.insert(users).values({
          id: 1,
          username: "عبود",
          password: "22333",
          userType: "owner",
          profileImage: "/default_avatar.svg",
          isOnline: false,
          joinDate: new Date(),
        });
      }
    } catch (error) {
      console.log("Owner initialization:", error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    // Check memory first (guests)
    if (this.memoryUsers.has(id)) {
      return this.memoryUsers.get(id);
    }

    // Check database (members)
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch {
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Check memory users
    for (const user of this.memoryUsers.values()) {
      if (user.username === username) return user;
    }

    // Check database
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch {
      return undefined;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    if (userData.userType === 'guest') {
      const user: User = {
        id: this.nextGuestId++,
        username: userData.username,
        password: userData.password || '',
        userType: 'guest',
        profileImage: '/default_avatar.svg',
        profileBanner: null,
        status: null,
        gender: 'male',
        age: null,
        country: null,
        relation: null,
        isOnline: true,
        isHidden: false,
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
        userTheme: 'default'
      };
      this.memoryUsers.set(user.id, user);
      return user;
    }

    // Members go to database
    try {
      const [user] = await db.insert(users).values({
        ...userData,
        isOnline: true,
        joinDate: new Date(),
        profileImage: '/default_avatar.svg',
        usernameColor: '#FFFFFF',
        userTheme: 'default'
      }).returning();
      return user;
    } catch (error) {
      throw new Error("فشل في إنشاء المستخدم");
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    // Check memory first
    const memUser = this.memoryUsers.get(id);
    if (memUser) {
      const updated = { ...memUser, ...updates };
      this.memoryUsers.set(id, updated);
      return updated;
    }

    // Update in database
    try {
      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();
      return updated;
    } catch {
      return undefined;
    }
  }

  async getAllUsers(): Promise<User[]> {
    const memUsers = Array.from(this.memoryUsers.values());
    try {
      const dbUsers = await db.select().from(users);
      return [...memUsers, ...dbUsers];
    } catch {
      return memUsers;
    }
  }

  async setOnlineStatus(id: number, online: boolean): Promise<void> {
    await this.updateUser(id, { isOnline: online, lastSeen: new Date() });
  }

  // Message operations
  async createMessage(messageData: InsertMessage): Promise<Message> {
    const message: Message = {
      id: this.nextMessageId++,
      senderId: messageData.senderId,
      recipientId: messageData.recipientId,
      content: messageData.content,
      messageType: messageData.messageType || 'text',
      isPublic: messageData.isPublic !== false,
      timestamp: new Date(),
      fileUrl: messageData.fileUrl,
      fileName: messageData.fileName,
      fileSize: messageData.fileSize
    };

    this.memoryMessages.set(message.id, message);
    return message;
  }

  async getPublicMessages(limit = 50): Promise<Message[]> {
    return Array.from(this.memoryMessages.values())
      .filter(msg => msg.isPublic)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
      .reverse();
  }

  async getPrivateMessages(user1: number, user2: number, limit = 50): Promise<Message[]> {
    return Array.from(this.memoryMessages.values())
      .filter(msg => 
        !msg.isPublic && 
        ((msg.senderId === user1 && msg.recipientId === user2) ||
         (msg.senderId === user2 && msg.recipientId === user1))
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
      .reverse();
  }

  // Friend operations
  async addFriend(userId: number, friendId: number): Promise<boolean> {
    const key1 = `${userId}-${friendId}`;
    const key2 = `${friendId}-${userId}`;
    
    this.memoryFriends.set(key1, {
      id: Date.now(),
      userId,
      friendId,
      status: 'accepted',
      createdAt: new Date()
    });
    
    this.memoryFriends.set(key2, {
      id: Date.now() + 1,
      userId: friendId,
      friendId: userId,
      status: 'accepted',
      createdAt: new Date()
    });
    
    return true;
  }

  async removeFriend(userId: number, friendId: number): Promise<boolean> {
    const key1 = `${userId}-${friendId}`;
    const key2 = `${friendId}-${userId}`;
    
    this.memoryFriends.delete(key1);
    this.memoryFriends.delete(key2);
    
    return true;
  }

  async getFriends(userId: number): Promise<User[]> {
    const friendIds: number[] = [];
    
    for (const [key, friendship] of this.memoryFriends.entries()) {
      if (friendship.userId === userId && friendship.status === 'accepted') {
        friendIds.push(friendship.friendId);
      }
    }
    
    const friends: User[] = [];
    for (const friendId of friendIds) {
      const friend = await this.getUser(friendId);
      if (friend) friends.push(friend);
    }
    
    return friends;
  }

  async areFriends(user1: number, user2: number): Promise<boolean> {
    const key = `${user1}-${user2}`;
    return this.memoryFriends.has(key);
  }

  // Friend Request operations
  async sendFriendRequest(senderId: number, receiverId: number): Promise<boolean> {
    const key = `${senderId}-${receiverId}`;
    this.memoryRequests.set(key, {
      id: Date.now(),
      senderId,
      receiverId,
      status: 'pending',
      createdAt: new Date()
    });
    return true;
  }

  async acceptFriendRequest(senderId: number, receiverId: number): Promise<boolean> {
    const key = `${senderId}-${receiverId}`;
    if (this.memoryRequests.has(key)) {
      this.memoryRequests.delete(key);
      return await this.addFriend(senderId, receiverId);
    }
    return false;
  }

  async declineFriendRequest(senderId: number, receiverId: number): Promise<boolean> {
    const key = `${senderId}-${receiverId}`;
    this.memoryRequests.delete(key);
    return true;
  }

  async getFriendRequests(userId: number): Promise<any[]> {
    return Array.from(this.memoryRequests.values())
      .filter(req => req.receiverId === userId && req.status === 'pending');
  }

  // Notification operations
  async createNotification(data: InsertNotification): Promise<Notification> {
    const notification: Notification = {
      id: this.nextNotificationId++,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      isRead: false,
      data: data.data || {},
      createdAt: new Date()
    };
    
    this.memoryNotifications.set(notification.id, notification);
    return notification;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.memoryNotifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markAsRead(notificationId: number): Promise<boolean> {
    const notification = this.memoryNotifications.get(notificationId);
    if (notification) {
      notification.isRead = true;
      this.memoryNotifications.set(notificationId, notification);
      return true;
    }
    return false;
  }
}

export const cleanStorage = new SimpleMixedStorage();