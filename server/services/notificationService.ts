import { eq, desc, and } from "drizzle-orm";
import { db } from "../db";
import { notifications, type Notification, type InsertNotification } from "../../shared/schema";

export class NotificationService {
  // إنشاء إشعار جديد
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    try {
      const [newNotification] = await db
        .insert(notifications)
        .values(notificationData as any)
        .returning();

      return newNotification;
    } catch (error) {
      console.error('خطأ في إنشاء الإشعار:', error);
      throw error;
    }
  }

  // الحصول على إشعارات المستخدم
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
      console.error('خطأ في الحصول على إشعارات المستخدم:', error);
      return [];
    }
  }

  // تمييز إشعار كمقروء
  async markNotificationAsRead(notificationId: number): Promise<boolean> {
    try {
      const [updatedNotification] = await db
        .update(notifications)
        .set({ isRead: true } as any)
        .where(eq(notifications.id, notificationId))
        .returning();

      return !!updatedNotification;
    } catch (error) {
      console.error('خطأ في تمييز الإشعار كمقروء:', error);
      return false;
    }
  }

  // تمييز جميع إشعارات المستخدم كمقروءة
  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true } as any)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );

      return true;
    } catch (error) {
      console.error('خطأ في تمييز جميع الإشعارات كمقروءة:', error);
      return false;
    }
  }

  // حذف إشعار
  async deleteNotification(notificationId: number): Promise<boolean> {
    try {
      await db.delete(notifications).where(eq(notifications.id, notificationId));
      return true;
    } catch (error) {
      console.error('خطأ في حذف الإشعار:', error);
      return false;
    }
  }

  // الحصول على عدد الإشعارات غير المقروءة
  async getUnreadNotificationCount(userId: number): Promise<number> {
    try {
      const unreadNotifications = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );

      return unreadNotifications.length;
    } catch (error) {
      console.error('خطأ في الحصول على عدد الإشعارات غير المقروءة:', error);
      return 0;
    }
  }

  // إنشاء إشعار نظام
  async createSystemNotification(
    userId: number, 
    title: string, 
    message: string, 
    data?: any
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'system',
      title,
      message,
      data
    });
  }

  // إنشاء إشعار طلب صداقة
  async createFriendRequestNotification(
    userId: number,
    senderName: string,
    senderId: number
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'friend_request',
      title: 'طلب صداقة جديد',
      message: `${senderName} أرسل لك طلب صداقة`,
      data: { senderId, senderName }
    });
  }

  // إنشاء إشعار رسالة خاصة
  async createMessageNotification(
    userId: number,
    senderName: string,
    senderId: number,
    messagePreview: string
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'message',
      title: `رسالة من ${senderName}`,
      message: messagePreview.length > 50 
        ? messagePreview.substring(0, 50) + '...'
        : messagePreview,
      data: { senderId, senderName }
    });
  }

  // إنشاء إشعار إجراء إداري
  async createModerationNotification(
    userId: number,
    action: string,
    reason: string,
    moderatorName: string,
    duration?: number
  ): Promise<Notification> {
    let title = '';
    let message = '';

    switch (action) {
      case 'mute':
        title = 'تم كتمك';
        message = duration 
          ? `تم كتمك لمدة ${duration} دقيقة. السبب: ${reason}`
          : `تم كتمك. السبب: ${reason}`;
        break;
      case 'kick':
        title = 'تم طردك';
        message = duration 
          ? `تم طردك لمدة ${duration} دقيقة. السبب: ${reason}`
          : `تم طردك. السبب: ${reason}`;
        break;
      case 'ban':
        title = 'تم حظرك';
        message = `تم حظرك من الموقع. السبب: ${reason}`;
        break;
      default:
        title = 'إجراء إداري';
        message = `تم اتخاذ إجراء إداري ضدك. السبب: ${reason}`;
    }

    return this.createNotification({
      userId,
      type: 'moderation',
      title,
      message,
      data: { action, reason, moderatorName, duration }
    });
  }

  // إنشاء إشعار ترقية
  async createPromotionNotification(
    userId: number,
    newRole: string,
    promotedBy: string
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'promotion',
      title: 'تهانينا! تمت ترقيتك',
      message: `تمت ترقيتك إلى ${newRole} من قبل ${promotedBy}`,
      data: { newRole, promotedBy }
    });
  }

  // حذف الإشعارات القديمة (تنظيف دوري)
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldNotifications = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.isRead, true),
            // يحتاج تنفيذ مقارنة التاريخ حسب نوع قاعدة البيانات
          )
        );

      // حذف الإشعارات القديمة المقروءة
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.isRead, true),
            // يحتاج تنفيذ مقارنة التاريخ
          )
        );

      return oldNotifications.length;
    } catch (error) {
      console.error('خطأ في تنظيف الإشعارات القديمة:', error);
      return 0;
    }
  }
}

// إنشاء مثيل واحد من الخدمة
export const notificationService = new NotificationService();