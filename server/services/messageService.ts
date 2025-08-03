import { eq, desc, and, or } from "drizzle-orm";
import { db } from "../database-adapter";
import { messages, users, type Message, type InsertMessage } from "../../shared/schema";
import { sql } from "drizzle-orm";

export class MessageService {
  // إنشاء رسالة جديدة
  async createMessage(messageData: InsertMessage): Promise<Message> {
    try {
      const [newMessage] = await db
        .insert(messages)
        .values(messageData as any)
        .returning();
      
      return newMessage;
    } catch (error) {
      console.error('خطأ في إنشاء الرسالة:', error);
      throw error;
    }
  }

  // الحصول على الرسائل العامة
  async getPublicMessages(limit: number = 50): Promise<Message[]> {
    try {
      const publicMessages = await db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          receiverId: messages.receiverId,
          content: messages.content,
          messageType: messages.messageType,
          isPrivate: messages.isPrivate,
          roomId: messages.roomId,
          timestamp: messages.timestamp,
          // بيانات المرسل
          senderUsername: users.username,
          senderUserType: users.userType,
          senderProfileImage: users.profileImage,
          senderUsernameColor: users.usernameColor,
          senderProfileBackgroundColor: users.profileBackgroundColor
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.isPrivate, false))
        .orderBy(desc(messages.timestamp))
        .limit(limit);

      // تحويل النتائج إلى تنسيق Message مع بيانات المرسل
      return publicMessages.map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        messageType: msg.messageType,
        isPrivate: msg.isPrivate,
        roomId: msg.roomId,
        timestamp: msg.timestamp,
        sender: msg.senderId ? {
          id: msg.senderId,
          username: msg.senderUsername || 'مستخدم محذوف',
          userType: msg.senderUserType || 'guest',
          role: msg.senderUserType || 'guest',
          profileImage: msg.senderProfileImage,
          usernameColor: msg.senderUsernameColor || '#FFFFFF',
          profileBackgroundColor: msg.senderProfileBackgroundColor || '#3c0d0d',
          isOnline: false // سيتم تحديثها من مكان آخر
        } : undefined
      })) as Message[];
    } catch (error) {
      console.error('خطأ في الحصول على الرسائل العامة:', error);
      return [];
    }
  }

  // الحصول على الرسائل الخاصة بين مستخدمين
  async getPrivateMessages(userId1: number, userId2: number, limit: number = 50): Promise<Message[]> {
    try {
      const privateMessages = await db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          receiverId: messages.receiverId,
          content: messages.content,
          messageType: messages.messageType,
          isPrivate: messages.isPrivate,
          roomId: messages.roomId,
          timestamp: messages.timestamp,
          // بيانات المرسل
          senderUsername: users.username,
          senderUserType: users.userType,
          senderProfileImage: users.profileImage,
          senderUsernameColor: users.usernameColor,
          senderProfileBackgroundColor: users.profileBackgroundColor
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
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

      // تحويل النتائج إلى تنسيق Message مع بيانات المرسل
      return privateMessages.map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        messageType: msg.messageType,
        isPrivate: msg.isPrivate,
        roomId: msg.roomId,
        timestamp: msg.timestamp,
        sender: msg.senderId ? {
          id: msg.senderId,
          username: msg.senderUsername || 'مستخدم محذوف',
          userType: msg.senderUserType || 'guest',
          role: msg.senderUserType || 'guest',
          profileImage: msg.senderProfileImage,
          usernameColor: msg.senderUsernameColor || '#FFFFFF',
          profileBackgroundColor: msg.senderProfileBackgroundColor || '#3c0d0d',
          isOnline: false
        } : undefined
      })) as Message[];
    } catch (error) {
      console.error('خطأ في الحصول على الرسائل الخاصة:', error);
      return [];
    }
  }

  // الحصول على رسائل الغرفة
  async getRoomMessages(roomId: string, limit: number = 50): Promise<Message[]> {
    try {
      const roomMessages = await db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          receiverId: messages.receiverId,
          content: messages.content,
          messageType: messages.messageType,
          isPrivate: messages.isPrivate,
          roomId: messages.roomId,
          timestamp: messages.timestamp,
          // بيانات المرسل
          senderUsername: users.username,
          senderUserType: users.userType,
          senderProfileImage: users.profileImage,
          senderUsernameColor: users.usernameColor,
          senderProfileBackgroundColor: users.profileBackgroundColor
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.roomId, roomId))
        .orderBy(desc(messages.timestamp))
        .limit(limit);

      // تحويل النتائج إلى تنسيق Message مع بيانات المرسل
      return roomMessages.map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        messageType: msg.messageType,
        isPrivate: msg.isPrivate,
        roomId: msg.roomId,
        timestamp: msg.timestamp,
        sender: msg.senderId ? {
          id: msg.senderId,
          username: msg.senderUsername || 'مستخدم محذوف',
          userType: msg.senderUserType || 'guest',
          role: msg.senderUserType || 'guest',
          profileImage: msg.senderProfileImage,
          usernameColor: msg.senderUsernameColor || '#FFFFFF',
          profileBackgroundColor: msg.senderProfileBackgroundColor || '#3c0d0d',
          isOnline: false
        } : undefined
      })) as Message[];
    } catch (error) {
      console.error('خطأ في الحصول على رسائل الغرفة:', error);
      return [];
    }
  }

  // حذف رسالة
  async deleteMessage(messageId: number, userId: number): Promise<boolean> {
    try {
      // التحقق من أن المستخدم هو مرسل الرسالة
      const message = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!message[0] || message[0].senderId !== userId) {
        return false; // المستخدم ليس مرسل الرسالة
      }

      await db.delete(messages).where(eq(messages.id, messageId));
      return true;
    } catch (error) {
      console.error('خطأ في حذف الرسالة:', error);
      return false;
    }
  }

  // الحصول على عدد الرسائل الخاصة غير المقروءة
  async getUnreadPrivateMessageCount(userId: number): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.receiverId, userId),
            eq(messages.isPrivate, true)
          )
        );
      
      return result[0]?.count || 0;
    } catch (error) {
      console.error('خطأ في حساب الرسائل غير المقروءة:', error);
      return 0;
    }
  }

  // البحث في الرسائل
  async searchMessages(query: string, userId?: number, limit: number = 20): Promise<Message[]> {
    try {
      let whereCondition = sql`${messages.content} ILIKE ${`%${query}%`}`;
      
      if (userId) {
        whereCondition = and(
          sql`${messages.content} ILIKE ${`%${query}%`}`,
          or(
            eq(messages.senderId, userId),
            eq(messages.receiverId, userId)
          )
        );
      }

      const searchResults = await db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          receiverId: messages.receiverId,
          content: messages.content,
          messageType: messages.messageType,
          isPrivate: messages.isPrivate,
          roomId: messages.roomId,
          timestamp: messages.timestamp,
          // بيانات المرسل
          senderUsername: users.username,
          senderUserType: users.userType,
          senderProfileImage: users.profileImage,
          senderUsernameColor: users.usernameColor,
          senderProfileBackgroundColor: users.profileBackgroundColor
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(whereCondition)
        .orderBy(desc(messages.timestamp))
        .limit(limit);

      // تحويل النتائج إلى تنسيق Message مع بيانات المرسل
      return searchResults.map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        messageType: msg.messageType,
        isPrivate: msg.isPrivate,
        roomId: msg.roomId,
        timestamp: msg.timestamp,
        sender: msg.senderId ? {
          id: msg.senderId,
          username: msg.senderUsername || 'مستخدم محذوف',
          userType: msg.senderUserType || 'guest',
          role: msg.senderUserType || 'guest',
          profileImage: msg.senderProfileImage,
          usernameColor: msg.senderUsernameColor || '#FFFFFF',
          profileBackgroundColor: msg.senderProfileBackgroundColor || '#3c0d0d',
          isOnline: false
        } : undefined
      })) as Message[];
    } catch (error) {
      console.error('خطأ في البحث في الرسائل:', error);
      return [];
    }
  }
}

// إنشاء instance واحد للاستخدام
export const messageService = new MessageService();