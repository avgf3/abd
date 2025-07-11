import {
  users,
  messages,
  friends,
  type User,
  type InsertUser,
  type Message,
  type InsertMessage,
  type Friend,
  type InsertFriend,
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
          status: insertUser.status,
          gender: insertUser.gender,
          age: insertUser.age,
          country: insertUser.country,
          relation: insertUser.relation,
          isOnline: true,
          lastSeen: new Date(),
          joinDate: new Date(),
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
      };
      
      this.users.set(id, user);
      return user;
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    // Check if user is in memory (guest)
    const memUser = this.users.get(id);
    if (memUser) {
      // Guests cannot upload profile pictures
      if (updates.profileImage && memUser.userType === 'guest') {
        delete updates.profileImage;
      }
      const updatedUser = { ...memUser, ...updates };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    
    // Check if user is in database (member)
    try {
      const [existing] = await db.select().from(users).where(eq(users.id, id));
      if (existing && (existing.userType === 'member' || existing.userType === 'owner')) {
        // Members can upload profile pictures
        const [updatedUser] = await db
          .update(users)
          .set(updates)
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
    const memUsers = Array.from(this.users.values()).filter(user => user.isOnline);
    
    // Get online members from database
    try {
      const dbUsers = await db.select().from(users).where(eq(users.isOnline, true));
      return [...memUsers, ...dbUsers];
    } catch (error) {
      return memUsers;
    }
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    // Always store messages in memory for performance
    const id = this.currentMessageId++;
    const message: Message = {
      id,
      senderId: insertMessage.senderId || null,
      receiverId: insertMessage.receiverId || null,
      content: insertMessage.content,
      messageType: insertMessage.messageType || "text",
      isPrivate: insertMessage.isPrivate || false,
      timestamp: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async getPublicMessages(limit: number = 50): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(msg => !msg.isPrivate)
      .sort((a, b) => (a.timestamp || new Date()).getTime() - (b.timestamp || new Date()).getTime())
      .slice(-limit);
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
    const id = this.currentFriendId++;
    const friend: Friend = {
      id,
      userId,
      friendId,
      status: "pending",
      createdAt: new Date(),
    };
    this.friends.set(id, friend);
    return friend;
  }

  async getFriends(userId: number): Promise<User[]> {
    const friendships = Array.from(this.friends.values())
      .filter(f => (f.userId === userId || f.friendId === userId) && f.status === "accepted");
    
    const friendIds = friendships.map(f => 
      f.userId === userId ? f.friendId : f.userId
    );
    
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
      f => (f.userId === userId1 && f.friendId === userId2) ||
           (f.userId === userId2 && f.friendId === userId1)
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
}

export const storage = new MixedStorage();
