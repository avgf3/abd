import type { IStorage } from '../storage';
import type { InsertMessage, Message, User } from '@shared/schema';
import { NotificationService } from './NotificationService';
import { SecurityManager } from '../auth/security';

/**
 * خدمة الرسائل المحسنة مع التحقق والأمان
 */
export class MessageService {
  constructor(private storage: IStorage) {}

  /**
   * إرسال رسالة مع التحقق الأمني
   */
  async sendMessage(senderId: number, messageData: Omit<InsertMessage, 'senderId'>): Promise<{success: boolean, message?: Message, error?: string}> {
    try {
      // التحقق من وجود المرسل
      const sender = await this.storage.getUser(senderId);
      if (!sender) {
        return { success: false, error: 'المرسل غير موجود' };
      }

      // فحص الصلاحيات
      if (!SecurityManager.hasPermission(sender.userType, 'send_message')) {
        return { success: false, error: 'غير مسموح لك بإرسال الرسائل' };
      }

      // التحقق من حالة الحظر/الكتم
      if (sender.isMuted && !messageData.isPrivate) {
        return { success: false, error: 'أنت مكتوم ولا يمكنك إرسال رسائل عامة' };
      }

      if (sender.isBanned) {
        return { success: false, error: 'أنت محظور من المنصة' };
      }

      // التحقق من محتوى الرسالة
      if (!messageData.content || messageData.content.trim().length === 0) {
        return { success: false, error: 'محتوى الرسالة فارغ' };
      }

      if (messageData.content.length > 1000) {
        return { success: false, error: 'الرسالة طويلة جداً (الحد الأقصى 1000 حرف)' };
      }

      // للرسائل الخاصة - التحقق من وجود المستقبل
      if (messageData.isPrivate && messageData.receiverId) {
        const receiver = await this.storage.getUser(messageData.receiverId);
        if (!receiver) {
          return { success: false, error: 'المستقبل غير موجود' };
        }

        // التحقق من التجاهل
        const ignoredUsers = await this.storage.getIgnoredUsers(messageData.receiverId);
        if (ignoredUsers.includes(senderId)) {
          // لا نخبر المرسل أنه مُتجاهل
          return { success: true, message: undefined };
        }
      }

      // إنشاء الرسالة
      const fullMessageData: InsertMessage = {
        ...messageData,
        senderId,
        content: messageData.content.trim(),
        timestamp: new Date()
      };

      const message = await this.storage.createMessage(fullMessageData);

      // إرسال إشعار للرسائل الخاصة
      if (messageData.isPrivate && messageData.receiverId) {
        const notification = await this.storage.createNotification({
          userId: messageData.receiverId,
          type: 'private_message',
          title: 'رسالة خاصة جديدة 💬',
          message: `أرسل ${sender.username} رسالة إليك`,
          data: { 
            messageId: message.id, 
            senderId, 
            senderName: sender.username,
            messagePreview: messageData.content.substring(0, 50) + (messageData.content.length > 50 ? '...' : '')
          }
        });

        // إرسال إشعار فوري
        NotificationService.getInstance().sendNotification(messageData.receiverId, notification);
      }

      return { success: true, message };

    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      return { success: false, error: 'حدث خطأ في إرسال الرسالة' };
    }
  }

  /**
   * الحصول على الرسائل العامة مع التحقق
   */
  async getPublicMessages(userId: number, limit: number = 50): Promise<{success: boolean, messages?: Message[], error?: string}> {
    try {
      const user = await this.storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'المستخدم غير موجود' };
      }

      if (!SecurityManager.hasPermission(user.userType, 'view_public')) {
        return { success: false, error: 'غير مسموح لك بمشاهدة الرسائل العامة' };
      }

      const messages = await this.storage.getPublicMessages(limit);
      
      // تصفية الرسائل من المستخدمين المُتجاهلين
      const ignoredUsers = await this.storage.getIgnoredUsers(userId);
      const filteredMessages = messages.filter(msg => !ignoredUsers.includes(msg.senderId));

      return { success: true, messages: filteredMessages };

    } catch (error) {
      console.error('خطأ في جلب الرسائل العامة:', error);
      return { success: false, error: 'حدث خطأ في جلب الرسائل' };
    }
  }

  /**
   * الحصول على الرسائل الخاصة مع التحقق
   */
  async getPrivateMessages(userId: number, otherUserId: number, limit: number = 50): Promise<{success: boolean, messages?: Message[], error?: string}> {
    try {
      const user = await this.storage.getUser(userId);
      const otherUser = await this.storage.getUser(otherUserId);
      
      if (!user || !otherUser) {
        return { success: false, error: 'أحد المستخدمين غير موجود' };
      }

      // التحقق من التجاهل
      const ignoredByOther = await this.storage.getIgnoredUsers(otherUserId);
      if (ignoredByOther.includes(userId)) {
        return { success: false, error: 'لا يمكنك مراسلة هذا المستخدم' };
      }

      const messages = await this.storage.getPrivateMessages(userId, otherUserId, limit);
      return { success: true, messages };

    } catch (error) {
      console.error('خطأ في جلب الرسائل الخاصة:', error);
      return { success: false, error: 'حدث خطأ في جلب الرسائل' };
    }
  }

  /**
   * حذف رسالة (للمرسل أو الإدمن)
   */
  async deleteMessage(messageId: number, userId: number): Promise<{success: boolean, error?: string}> {
    try {
      const user = await this.storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'المستخدم غير موجود' };
      }

      // التحقق من الصلاحيات (المرسل الأصلي أو إدمن)
      // هذا سيحتاج إلى تطبيق في storage.ts
      // const message = await this.storage.getMessage(messageId);
      // if (message.senderId !== userId && !SecurityManager.hasPermission(user.userType, 'delete_messages')) {
      //   return { success: false, error: 'غير مسموح لك بحذف هذه الرسالة' };
      // }

      // await this.storage.deleteMessage(messageId);
      return { success: true };

    } catch (error) {
      console.error('خطأ في حذف الرسالة:', error);
      return { success: false, error: 'حدث خطأ في حذف الرسالة' };
    }
  }
}