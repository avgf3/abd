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

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getPublicMessages(limit?: number): Promise<Message[]>;
  getPrivateMessages(userId1: number, userId2: number, limit?: number): Promise<Message[]>;

  // Friend operations
  addFriend(userId: number, friendId: number): Promise<Friend>;
  getFriends(userId: number): Promise<User[]>;
  updateFriendStatus(userId: number, friendId: number, status: string): Promise<void>;
  getBlockedUsers(userId: number): Promise<User[]>;
}

// Mixed storage: Database for members, Memory for guests
export class MixedStorage implements IStorage {
  private users: Map<number, User>;
  private messages: Map<number, Message>;
  private friends: Map<number, Friend>;
  private currentUserId: number;
  private currentMessageId: number;
  private currentFriendId: number;

  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.friends = new Map();
    this.currentUserId = 1;
    this.currentMessageId = 1;
    this.currentFriendId = 1;

    // Create owner user
    const owner: User = {
      id: this.currentUserId++,
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
    };
    this.users.set(owner.id, owner);
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
}

export const storage = new MixedStorage();
