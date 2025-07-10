import { users, messages, friends, type User, type InsertUser, type Message, type InsertMessage, type Friend, type InsertFriend } from "@shared/schema";

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

export class MemStorage implements IStorage {
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
      profileImage: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40",
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
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password || null,
      userType: insertUser.userType || "guest",
      profileImage: insertUser.profileImage || null,
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

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async setUserOnlineStatus(id: number, isOnline: boolean): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.isOnline = isOnline;
      user.lastSeen = new Date();
      this.users.set(id, user);
    }
  }

  async getOnlineUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.isOnline);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
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
    
    return friendIds.map(id => this.users.get(id!)).filter(Boolean) as User[];
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

export const storage = new MemStorage();
