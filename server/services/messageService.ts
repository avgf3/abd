import { eq, desc, and, or, isNull } from "drizzle-orm";
import { db } from "../database-adapter";
import { messages, users, type Message, type InsertMessage } from "../../shared/schema";

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
        .where(and(eq(messages.isPrivate, false), isNull(messages.deletedAt)))
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
        roomId: msg.roomId || 'general',
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
            ),
            isNull(messages.deletedAt)
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
        roomId: msg.roomId || 'general',
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
      console.error('خطأ في الحصول على الرسائل الخاصة:', error);
      return [];
    }
  }

  // حذف رسالة
  async deleteMessage(messageId: number, userId: number): Promise<boolean> {
    try {
      // التحقق من أن المستخدم هو صاحب الرسالة أو مدير
      const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!message) {
        return false;
      }

      // التحقق من الصلاحيات
      if (message.senderId !== userId) {
        // يمكن للمديرين حذف أي رسالة
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!user || !['admin', 'owner', 'moderator'].includes(user.userType)) {
          return false;
        }
      }

      // حذف منطقي للرسالة
      await db
        .update(messages)
        .set({ deletedAt: new Date() } as any)
        .where(eq(messages.id, messageId));
      return true;
    } catch (error) {
      console.error('خطأ في حذف الرسالة:', error);
      return false;
    }
  }

  // الحصول على عدد الرسائل الخاصة غير المقروءة
  async getUnreadPrivateMessageCount(userId: number): Promise<number> {
    try {
      // هذه وظيفة مستقبلية - نحتاج إلى إضافة حقل isRead للرسائل
      // حالياً نعيد 0
      return 0;
    } catch (error) {
      console.error('خطأ في الحصول على عدد الرسائل غير المقروءة:', error);
      return 0;
    }
  }

  // البحث في الرسائل
  async searchMessages(query: string, userId?: number, limit: number = 20): Promise<Message[]> {
    try {
      // بحث بسيط في محتوى الرسائل
      // يمكن تحسينه لاحقاً باستخدام full-text search
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
        .where(
          and(
            eq(messages.isPrivate, false),
            isNull(messages.deletedAt)
          )
        )
        .orderBy(desc(messages.timestamp))
        .limit(limit);

      return searchResults.map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        messageType: msg.messageType,
        isPrivate: msg.isPrivate,
        roomId: msg.roomId || 'general',
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

// إنشاء مثيل واحد من الخدمة
export const messageService = new MessageService();