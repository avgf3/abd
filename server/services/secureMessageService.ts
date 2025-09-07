import { storage } from '../storage';
import { roomMessageService } from './roomMessageService';
import { getIO } from '../realtime';
import { log } from '../utils/productionLogger';

/**
 * خدمة الرسائل الآمنة - تضمن أن المالك الحقيقي فقط يمكنه إرسال رسائل للبوت
 */
export class SecureMessageService {
  /**
   * إرسال رسالة آمنة من المالك إلى البوت
   */
  static async sendSecureMessage(
    ownerId: number,
    botId: number,
    content: string,
    roomId: string,
    messageType: 'text' | 'image' | 'sticker' = 'text'
  ): Promise<{ success: boolean; message?: any; error?: string }> {
    try {
      // التحقق الأول: التأكد من أن المرسل هو المالك الحقيقي
      const owner = await storage.getUser(ownerId);
      if (!owner || owner.userType !== 'owner') {
        log.security('محاولة إرسال رسالة بوت من غير المالك', {
          userId: ownerId,
          botId,
          ownerType: owner?.userType,
          timestamp: new Date().toISOString(),
        });
        return { success: false, error: 'غير مصرح لك بإرسال رسائل البوت' };
      }

      // التحقق الثاني: التأكد من وجود البوت وأنه نشط
      const { db } = await import('../database-adapter');
      const { bots } = await import('../../shared/schema');
      const { eq } = await import('drizzle-orm');

      if (!db) {
        return { success: false, error: 'قاعدة البيانات غير متصلة' };
      }

      const [bot] = await db.select().from(bots).where(eq(bots.id, botId)).limit(1);
      if (!bot) {
        return { success: false, error: 'البوت غير موجود' };
      }

      if (!bot.isActive) {
        return { success: false, error: 'البوت غير نشط' };
      }

      // التحقق الثالث: التأكد من أن البوت في نفس الغرفة المطلوبة
      if (bot.currentRoom !== roomId) {
        return { success: false, error: 'البوت ليس في هذه الغرفة' };
      }

      // إرسال الرسالة كما لو أنها من البوت
      const message = await roomMessageService.sendMessage({
        senderId: botId,
        roomId,
        content,
        messageType,
        isPrivate: false,
      });

      if (!message) {
        return { success: false, error: 'فشل في إرسال الرسالة' };
      }

      // إرسال الرسالة عبر Socket.IO مع معلومات البوت
      const io = getIO();
      if (io) {
        const botUser = {
          id: bot.id,
          username: bot.username,
          userType: 'bot',
          profileImage: bot.profileImage,
          usernameColor: bot.usernameColor,
          profileEffect: bot.profileEffect,
        };

        io.to(`room_${roomId}`).emit('message', {
          type: 'newMessage',
          message: {
            ...message,
            sender: botUser,
            roomId,
            reactions: { like: 0, dislike: 0, heart: 0 },
            myReaction: null,
          },
        });
      }

      // تسجيل العملية الناجحة
      log.security('تم إرسال رسالة بوت بنجاح', {
        ownerId,
        botId,
        botUsername: bot.username,
        roomId,
        messageLength: content.length,
        timestamp: new Date().toISOString(),
      });

      return { success: true, message };
    } catch (error: any) {
      log.security('خطأ في إرسال رسالة البوت الآمنة', {
        ownerId,
        botId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      return { success: false, error: 'خطأ في النظام' };
    }
  }

  /**
   * التحقق من صلاحية المالك للتحكم في البوت
   */
  static async verifyOwnerPermission(userId: number, botId: number): Promise<boolean> {
    try {
      // التحقق من أن المستخدم هو المالك
      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'owner') {
        return false;
      }

      // التحقق من وجود البوت (اختياري - للتأكد)
      const { db } = await import('../database-adapter');
      const { bots } = await import('../../shared/schema');
      const { eq } = await import('drizzle-orm');

      if (!db) return false;

      const [bot] = await db.select().from(bots).where(eq(bots.id, botId)).limit(1);
      return !!bot;
    } catch {
      return false;
    }
  }

  /**
   * منع أي شخص آخر من إرسال رسائل للبوت
   */
  static async blockUnauthorizedBotMessage(
    senderId: number,
    recipientId: number
  ): Promise<{ blocked: boolean; reason?: string }> {
    try {
      // التحقق من أن المستقبل بوت
      const { db } = await import('../database-adapter');
      const { bots } = await import('../../shared/schema');
      const { eq } = await import('drizzle-orm');

      if (!db) return { blocked: false };

      const [bot] = await db.select().from(bots).where(eq(bots.id, recipientId)).limit(1);
      if (!bot) {
        return { blocked: false }; // ليس بوت، السماح بالرسالة العادية
      }

      // التحقق من أن المرسل هو المالك
      const sender = await storage.getUser(senderId);
      if (!sender || sender.userType !== 'owner') {
        log.security('محاولة إرسال رسالة غير مصرح بها للبوت', {
          senderId,
          recipientId,
          senderType: sender?.userType,
          botUsername: bot.username,
          timestamp: new Date().toISOString(),
        });

        return {
          blocked: true,
          reason: 'لا يمكن إرسال رسائل للبوتات إلا من المالك',
        };
      }

      return { blocked: false }; // المالك يمكنه الإرسال
    } catch {
      return { blocked: true, reason: 'خطأ في التحقق من الصلاحيات' };
    }
  }
}