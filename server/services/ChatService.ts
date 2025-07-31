import { EventEmitter } from 'events';
import { z } from 'zod';
import { eq, and, desc, sql, or } from 'drizzle-orm';
import { db } from '../database-adapter';
import { messages, users } from '../../shared/schema';
import type { Message, InsertMessage, User } from '../../shared/schema';
import { roomService } from './RoomService';

// Message validation schemas
const createMessageSchema = z.object({
  senderId: z.number(),
  receiverId: z.number().optional(),
  content: z.string().min(1).max(2000),
  messageType: z.enum(['text', 'image']).default('text'),
  isPrivate: z.boolean().default(false),
  roomId: z.string().default('general'),
});

const getMessagesSchema = z.object({
  roomId: z.string().optional(),
  userId1: z.number().optional(),
  userId2: z.number().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export interface ChatMessage extends Message {
  sender?: User;
  receiver?: User;
}

export interface MessageStats {
  totalMessages: number;
  todayMessages: number;
  roomMessages: number;
  privateMessages: number;
}

// Rate limiting for messages
interface RateLimit {
  count: number;
  lastReset: number;
  isBlocked: boolean;
}

export class ChatService extends EventEmitter {
  private messageCache = new Map<string, ChatMessage[]>();
  private rateLimits = new Map<number, RateLimit>();
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private readonly RATE_LIMIT_MAX_MESSAGES = 30; // Max messages per minute
  private readonly SPAM_THRESHOLD = 10; // Messages per 10 seconds to trigger spam detection

  constructor() {
    super();
    this.setupCleanup();
  }

  // Cache and cleanup management
  private setupCleanup() {
    // Clean rate limits every 5 minutes
    setInterval(() => {
      this.cleanupRateLimits();
    }, 5 * 60 * 1000);

    // Clean message cache every 10 minutes
    setInterval(() => {
      if (this.messageCache.size > 100) {
        this.clearMessageCache();
      }
    }, 10 * 60 * 1000);
  }

  private cleanupRateLimits() {
    const now = Date.now();
    for (const [userId, rateLimit] of this.rateLimits.entries()) {
      if (now - rateLimit.lastReset > this.RATE_LIMIT_WINDOW * 2) {
        this.rateLimits.delete(userId);
      }
    }
  }

  private clearMessageCache() {
    this.messageCache.clear();
    this.emit('cache_cleared');
  }

  private getCacheKey(prefix: string, ...keys: (string | number)[]): string {
    return `${prefix}:${keys.join(':')}`;
  }

  // Rate limiting
  private checkRateLimit(userId: number): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    let rateLimit = this.rateLimits.get(userId);

    if (!rateLimit || now - rateLimit.lastReset > this.RATE_LIMIT_WINDOW) {
      // Reset or create new rate limit
      rateLimit = {
        count: 0,
        lastReset: now,
        isBlocked: false,
      };
      this.rateLimits.set(userId, rateLimit);
    }

    rateLimit.count++;

    const remaining = Math.max(0, this.RATE_LIMIT_MAX_MESSAGES - rateLimit.count);
    const resetIn = this.RATE_LIMIT_WINDOW - (now - rateLimit.lastReset);

    if (rateLimit.count > this.RATE_LIMIT_MAX_MESSAGES) {
      rateLimit.isBlocked = true;
      return { allowed: false, remaining: 0, resetIn };
    }

    return { allowed: true, remaining, resetIn };
  }

  private detectSpam(userId: number): boolean {
    const rateLimit = this.rateLimits.get(userId);
    if (!rateLimit) return false;

    const now = Date.now();
    const shortWindow = 10 * 1000; // 10 seconds
    
    // If user sent too many messages in short window
    if (rateLimit.count > this.SPAM_THRESHOLD && 
        now - rateLimit.lastReset < shortWindow) {
      return true;
    }

    return false;
  }

  // Message operations
  async createMessage(messageData: z.infer<typeof createMessageSchema>): Promise<ChatMessage> {
    const validated = createMessageSchema.parse(messageData);

    try {
      // Check rate limit
      const rateLimitCheck = this.checkRateLimit(validated.senderId);
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(rateLimitCheck.resetIn / 1000)} seconds`);
      }

      // Check for spam
      if (this.detectSpam(validated.senderId)) {
        this.emit('spam_detected', { userId: validated.senderId, content: validated.content });
        throw new Error('Spam detected. Please slow down your messaging');
      }

      // Validate room exists for room messages
      if (!validated.isPrivate && validated.roomId !== 'general') {
        const room = await roomService.getRoom(validated.roomId);
        if (!room) {
          throw new Error(`Room ${validated.roomId} does not exist`);
        }
      }

      // For private messages, ensure receiver exists
      if (validated.isPrivate && validated.receiverId) {
        const receiver = await db.select().from(users).where(eq(users.id, validated.receiverId)).limit(1);
        if (receiver.length === 0) {
          throw new Error('Receiver not found');
        }
      }

      // Create message
      const newMessage = await db.insert(messages).values({
        senderId: validated.senderId,
        receiverId: validated.receiverId,
        content: validated.content,
        messageType: validated.messageType,
        isPrivate: validated.isPrivate,
        roomId: validated.roomId,
        timestamp: new Date(),
      }).returning();

      // Get sender info
      const sender = await db.select().from(users).where(eq(users.id, validated.senderId)).limit(1);
      
      const messageWithSender: ChatMessage = {
        ...newMessage[0],
        sender: sender[0],
      };

      // Clear relevant cache
      if (validated.isPrivate && validated.receiverId) {
        const cacheKey1 = this.getCacheKey('private', validated.senderId, validated.receiverId);
        const cacheKey2 = this.getCacheKey('private', validated.receiverId, validated.senderId);
        this.messageCache.delete(cacheKey1);
        this.messageCache.delete(cacheKey2);
      } else {
        const cacheKey = this.getCacheKey('room', validated.roomId);
        this.messageCache.delete(cacheKey);
      }

      this.emit('message_created', messageWithSender);
      console.log(`✅ Message created by user ${validated.senderId} in ${validated.isPrivate ? 'private' : `room ${validated.roomId}`}`);

      return messageWithSender;
    } catch (error) {
      console.error(`❌ Error creating message:`, error);
      throw error;
    }
  }

  async getRoomMessages(roomId: string, limit = 50, offset = 0): Promise<ChatMessage[]> {
    try {
      const cacheKey = this.getCacheKey('room', roomId, limit, offset);
      
      // Check cache first (only for first page)
      if (offset === 0 && this.messageCache.has(cacheKey)) {
        return this.messageCache.get(cacheKey)!;
      }

      const roomMessages = await db.select({
        id: messages.id,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        content: messages.content,
        messageType: messages.messageType,
        isPrivate: messages.isPrivate,
        roomId: messages.roomId,
        timestamp: messages.timestamp,
        isEdited: messages.isEdited,
        editedAt: messages.editedAt,
        replyToId: messages.replyToId,
        // Sender info
        senderUsername: users.username,
        senderUserType: users.userType,
        senderRole: users.role,
        senderProfileImage: users.profileImage,
        senderUsernameColor: users.usernameColor,
        senderProfileEffect: users.profileEffect,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(and(
        eq(messages.roomId, roomId),
        eq(messages.isPrivate, false)
      ))
      .orderBy(desc(messages.timestamp))
      .limit(limit)
      .offset(offset);

      // Transform to ChatMessage format
      const formattedMessages: ChatMessage[] = roomMessages.map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        messageType: msg.messageType,
        isPrivate: msg.isPrivate,
        roomId: msg.roomId,
        timestamp: msg.timestamp,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt,
        replyToId: msg.replyToId,
        sender: {
          id: msg.senderId,
          username: msg.senderUsername,
          userType: msg.senderUserType as any,
          role: msg.senderRole as any,
          profileImage: msg.senderProfileImage,
          usernameColor: msg.senderUsernameColor,
          profileEffect: msg.senderProfileEffect,
          // Add other required User fields with defaults
          profileBackgroundColor: '#3c0d0d',
          isOnline: true,
          isHidden: false,
          lastSeen: null,
          joinDate: new Date(),
          createdAt: new Date(),
          isMuted: false,
          muteExpiry: null,
          isBanned: false,
          banExpiry: null,
          isBlocked: false,
          ignoredUsers: [],
          userTheme: 'default',
          points: 0,
          level: 1,
          totalPoints: 0,
          levelProgress: 0,
        }
      })).reverse(); // Reverse to show oldest first

      // Cache only first page
      if (offset === 0) {
        this.messageCache.set(cacheKey, formattedMessages);
      }

      return formattedMessages;
    } catch (error) {
      console.error(`❌ Error getting room messages for ${roomId}:`, error);
      throw error;
    }
  }

  async getPrivateMessages(userId1: number, userId2: number, limit = 50, offset = 0): Promise<ChatMessage[]> {
    try {
      const cacheKey = this.getCacheKey('private', Math.min(userId1, userId2), Math.max(userId1, userId2), limit, offset);
      
      // Check cache first (only for first page)
      if (offset === 0 && this.messageCache.has(cacheKey)) {
        return this.messageCache.get(cacheKey)!;
      }

      const privateMessages = await db.select({
        id: messages.id,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        content: messages.content,
        messageType: messages.messageType,
        isPrivate: messages.isPrivate,
        roomId: messages.roomId,
        timestamp: messages.timestamp,
        isEdited: messages.isEdited,
        editedAt: messages.editedAt,
        replyToId: messages.replyToId,
        // Sender info
        senderUsername: users.username,
        senderUserType: users.userType,
        senderRole: users.role,
        senderProfileImage: users.profileImage,
        senderUsernameColor: users.usernameColor,
        senderProfileEffect: users.profileEffect,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(and(
        eq(messages.isPrivate, true),
        or(
          and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
        )
      ))
      .orderBy(desc(messages.timestamp))
      .limit(limit)
      .offset(offset);

      // Transform to ChatMessage format
      const formattedMessages: ChatMessage[] = privateMessages.map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        messageType: msg.messageType,
        isPrivate: msg.isPrivate,
        roomId: msg.roomId,
        timestamp: msg.timestamp,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt,
        replyToId: msg.replyToId,
        sender: {
          id: msg.senderId,
          username: msg.senderUsername,
          userType: msg.senderUserType as any,
          role: msg.senderRole as any,
          profileImage: msg.senderProfileImage,
          usernameColor: msg.senderUsernameColor,
          profileEffect: msg.senderProfileEffect,
          // Add other required User fields with defaults
          profileBackgroundColor: '#3c0d0d',
          isOnline: true,
          isHidden: false,
          lastSeen: null,
          joinDate: new Date(),
          createdAt: new Date(),
          isMuted: false,
          muteExpiry: null,
          isBanned: false,
          banExpiry: null,
          isBlocked: false,
          ignoredUsers: [],
          userTheme: 'default',
          points: 0,
          level: 1,
          totalPoints: 0,
          levelProgress: 0,
        }
      })).reverse(); // Reverse to show oldest first

      // Cache only first page
      if (offset === 0) {
        this.messageCache.set(cacheKey, formattedMessages);
      }

      return formattedMessages;
    } catch (error) {
      console.error(`❌ Error getting private messages between ${userId1} and ${userId2}:`, error);
      throw error;
    }
  }

  async getPublicMessages(limit = 50, offset = 0): Promise<ChatMessage[]> {
    return this.getRoomMessages('general', limit, offset);
  }

  async editMessage(messageId: number, newContent: string, userId: number): Promise<ChatMessage | null> {
    try {
      // Validate content
      if (!newContent || newContent.trim().length === 0) {
        throw new Error('Message content cannot be empty');
      }

      if (newContent.length > 2000) {
        throw new Error('Message content too long');
      }

      // Get original message
      const originalMessage = await db.select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (originalMessage.length === 0) {
        throw new Error('Message not found');
      }

      const message = originalMessage[0];

      // Check if user owns the message
      if (message.senderId !== userId) {
        throw new Error('You can only edit your own messages');
      }

      // Check if message is not too old (e.g., 24 hours)
      const messageAge = Date.now() - message.timestamp.getTime();
      const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (messageAge > maxEditAge) {
        throw new Error('Message is too old to edit');
      }

      // Update message
      await db.update(messages)
        .set({
          content: newContent.trim(),
          isEdited: true,
          editedAt: new Date(),
        })
        .where(eq(messages.id, messageId));

      // Clear relevant cache
      if (message.isPrivate && message.receiverId) {
        const cacheKey1 = this.getCacheKey('private', message.senderId, message.receiverId);
        const cacheKey2 = this.getCacheKey('private', message.receiverId, message.senderId);
        this.messageCache.delete(cacheKey1);
        this.messageCache.delete(cacheKey2);
      } else {
        const cacheKey = this.getCacheKey('room', message.roomId);
        this.messageCache.delete(cacheKey);
      }

      // Get updated message with sender info
      const updatedMessage = await db.select({
        id: messages.id,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        content: messages.content,
        messageType: messages.messageType,
        isPrivate: messages.isPrivate,
        roomId: messages.roomId,
        timestamp: messages.timestamp,
        isEdited: messages.isEdited,
        editedAt: messages.editedAt,
        replyToId: messages.replyToId,
        // Sender info
        senderUsername: users.username,
        senderUserType: users.userType,
        senderRole: users.role,
        senderProfileImage: users.profileImage,
        senderUsernameColor: users.usernameColor,
        senderProfileEffect: users.profileEffect,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.id, messageId))
      .limit(1);

      if (updatedMessage.length === 0) {
        return null;
      }

      const msg = updatedMessage[0];
      const formattedMessage: ChatMessage = {
        id: msg.id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        messageType: msg.messageType,
        isPrivate: msg.isPrivate,
        roomId: msg.roomId,
        timestamp: msg.timestamp,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt,
        replyToId: msg.replyToId,
        sender: {
          id: msg.senderId,
          username: msg.senderUsername,
          userType: msg.senderUserType as any,
          role: msg.senderRole as any,
          profileImage: msg.senderProfileImage,
          usernameColor: msg.senderUsernameColor,
          profileEffect: msg.senderProfileEffect,
          // Add other required User fields with defaults
          profileBackgroundColor: '#3c0d0d',
          isOnline: true,
          isHidden: false,
          lastSeen: null,
          joinDate: new Date(),
          createdAt: new Date(),
          isMuted: false,
          muteExpiry: null,
          isBanned: false,
          banExpiry: null,
          isBlocked: false,
          ignoredUsers: [],
          userTheme: 'default',
          points: 0,
          level: 1,
          totalPoints: 0,
          levelProgress: 0,
        }
      };

      this.emit('message_edited', formattedMessage);
      console.log(`✅ Message ${messageId} edited by user ${userId}`);

      return formattedMessage;
    } catch (error) {
      console.error(`❌ Error editing message ${messageId}:`, error);
      throw error;
    }
  }

  async deleteMessage(messageId: number, userId: number): Promise<boolean> {
    try {
      // Get original message
      const originalMessage = await db.select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (originalMessage.length === 0) {
        throw new Error('Message not found');
      }

      const message = originalMessage[0];

      // Check if user owns the message
      if (message.senderId !== userId) {
        throw new Error('You can only delete your own messages');
      }

      // Delete message
      await db.delete(messages).where(eq(messages.id, messageId));

      // Clear relevant cache
      if (message.isPrivate && message.receiverId) {
        const cacheKey1 = this.getCacheKey('private', message.senderId, message.receiverId);
        const cacheKey2 = this.getCacheKey('private', message.receiverId, message.senderId);
        this.messageCache.delete(cacheKey1);
        this.messageCache.delete(cacheKey2);
      } else {
        const cacheKey = this.getCacheKey('room', message.roomId);
        this.messageCache.delete(cacheKey);
      }

      this.emit('message_deleted', { messageId, userId, message });
      console.log(`✅ Message ${messageId} deleted by user ${userId}`);

      return true;
    } catch (error) {
      console.error(`❌ Error deleting message ${messageId}:`, error);
      throw error;
    }
  }

  // Statistics
  async getMessageStats(userId?: number): Promise<MessageStats> {
    try {
      const queries = [
        // Total messages
        db.select({ count: sql<number>`count(*)` }).from(messages),
        // Today's messages
        db.select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(sql`DATE(${messages.timestamp}) = CURRENT_DATE`),
        // Room messages
        db.select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(eq(messages.isPrivate, false)),
        // Private messages
        db.select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(eq(messages.isPrivate, true)),
      ];

      if (userId) {
        // Add user-specific queries
        queries.push(
          // User's messages
          db.select({ count: sql<number>`count(*)` })
            .from(messages)
            .where(eq(messages.senderId, userId))
        );
      }

      const results = await Promise.all(queries);

      return {
        totalMessages: results[0][0]?.count || 0,
        todayMessages: results[1][0]?.count || 0,
        roomMessages: results[2][0]?.count || 0,
        privateMessages: results[3][0]?.count || 0,
      };
    } catch (error) {
      console.error('❌ Error getting message stats:', error);
      throw error;
    }
  }

  // Admin functions
  async deleteMessagesByRoom(roomId: string): Promise<number> {
    try {
      const deletedMessages = await db.delete(messages)
        .where(eq(messages.roomId, roomId))
        .returning({ id: messages.id });

      // Clear cache
      const cacheKey = this.getCacheKey('room', roomId);
      this.messageCache.delete(cacheKey);

      console.log(`✅ Deleted ${deletedMessages.length} messages from room ${roomId}`);
      return deletedMessages.length;
    } catch (error) {
      console.error(`❌ Error deleting messages from room ${roomId}:`, error);
      throw error;
    }
  }

  async deleteMessagesByUser(userId: number): Promise<number> {
    try {
      const deletedMessages = await db.delete(messages)
        .where(eq(messages.senderId, userId))
        .returning({ id: messages.id });

      // Clear all cache since we don't know which rooms/conversations were affected
      this.clearMessageCache();

      console.log(`✅ Deleted ${deletedMessages.length} messages by user ${userId}`);
      return deletedMessages.length;
    } catch (error) {
      console.error(`❌ Error deleting messages by user ${userId}:`, error);
      throw error;
    }
  }

  // Utility methods
  getUserRateLimit(userId: number): { remaining: number; resetIn: number } {
    const rateLimit = this.rateLimits.get(userId);
    if (!rateLimit) {
      return { remaining: this.RATE_LIMIT_MAX_MESSAGES, resetIn: 0 };
    }

    const now = Date.now();
    const remaining = Math.max(0, this.RATE_LIMIT_MAX_MESSAGES - rateLimit.count);
    const resetIn = Math.max(0, this.RATE_LIMIT_WINDOW - (now - rateLimit.lastReset));

    return { remaining, resetIn };
  }

  resetUserRateLimit(userId: number): void {
    this.rateLimits.delete(userId);
    console.log(`✅ Rate limit reset for user ${userId}`);
  }
}

// Create singleton instance
export const chatService = new ChatService();