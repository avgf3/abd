import { eq, desc, and, not } from 'drizzle-orm';

import { notifications, type Notification, type InsertNotification } from '../../shared/schema';
import { db } from '../database-adapter';

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
        .where(and(eq(notifications.userId, userId), not(eq(notifications.type, 'message' as any))))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);

      return userNotifications;
    } catch (error) {
      console.error('خطأ في الحصول على إشعارات المستخدم:', error);
      return [];
    }
  }

  // الحصول على إشعارات المستخدم بعد وقت معين
  async getUserNotificationsSince(
    userId: number,
    after: Date,
    limit: number = 50
  ): Promise<Notification[]> {
    try {
      const all = await this.getUserNotifications(userId, limit * 4);
      const filtered = (all || []).filter((n) => {
        try {
          const created = n?.createdAt ? new Date(n.createdAt as any) : null;
          return created ? created > after : false;
        } catch {
          return false;
        }
      });
      return filtered.slice(0, limit);
    } catch (error) {
      console.error('خطأ في الحصول على إشعارات المستخدم (since):', error);
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

  // إنشاء إشعار "أهلاً بعودتك" عند الحاجة فقط (منع التكرار خلال مدة محددة)
  async createWelcomeBackIfNeeded(
    userId: number,
    minHours: number = 12,
    username?: string
  ): Promise<Notification | null> {
    try {
      const cutoff = new Date(Date.now() - minHours * 60 * 60 * 1000);

      // آخر إشعار welcome_back للمستخدم
      const last = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.type, 'welcome_back' as any)))
        .orderBy(desc(notifications.createdAt))
        .limit(1);

      const lastNotif = last?.[0];
      if (lastNotif && lastNotif.createdAt && new Date(lastNotif.createdAt as any) > cutoff) {
        // تم إرسال إشعار ترحيب مؤخراً - لا ننشئ جديداً
        return null;
      }

      const title = '🎉 أهلاً بعودتك';
      const message = username
        ? `مرحباً بك مرة أخرى ${username}! نسعد بعودتك إلى المنصة.`
        : 'مرحباً بك مرة أخرى! نسعد بعودتك إلى المنصة.';

      const created = await this.createNotification({
        userId,
        type: 'welcome_back',
        title,
        message,
      } as any);

      return created;
    } catch (error) {
      console.error('خطأ في إنشاء إشعار أهلاً بعودتك بشكل آمن:', error);
      return null;
    }
  }

  // تمييز جميع إشعارات المستخدم كمقروءة
  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true } as any)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

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
            eq(notifications.isRead, false),
            not(eq(notifications.type, 'message' as any))
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
      data,
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
      data: { senderId, senderName },
    });
  }

  // إنشاء إشعار قبول صداقة
  async createFriendAcceptedNotification(
    userId: number,
    friendName: string,
    friendId: number
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'friend_accepted',
      title: 'تم قبول طلب الصداقة',
      message: `${friendName} قبل طلب صداقتك`,
      data: { friendId, friendName },
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
      message:
        messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview,
      data: { senderId, senderName },
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
      data: { action, reason, moderatorName, duration },
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
      data: { newRole, promotedBy },
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
            eq(notifications.isRead, true)
            // يحتاج تنفيذ مقارنة التاريخ حسب نوع قاعدة البيانات
          )
        );

      // حذف الإشعارات القديمة المقروءة
      await db.delete(notifications).where(
        and(
          eq(notifications.isRead, true)
          // يحتاج تنفيذ مقارنة التاريخ
        )
      );

      return oldNotifications.length;
    } catch (error) {
      console.error('خطأ في تنظيف الإشعارات القديمة:', error);
      return 0;
    }
  }

  // إنشاء إشعار ترقية مستوى
  async createLevelUpNotification(
    userId: number,
    oldLevel: number,
    newLevel: number,
    levelTitle: string
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'level_up',
      title: '🎉 ترقية مستوى!',
      message: `تهانينا! لقد وصلت إلى المستوى ${newLevel} - ${levelTitle}`,
      data: { oldLevel, newLevel, levelTitle },
    });
  }

  // إنشاء إشعار الحصول على نقاط
  async createPointsReceivedNotification(
    userId: number,
    points: number,
    senderName: string,
    senderId: number
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'points_received',
      title: '💰 استلمت نقاط!',
      message: `أرسل لك ${senderName} ${points} نقطة`,
      data: { points, senderName, senderId },
    });
  }

  // إنشاء إشعار مكافأة يومية
  async createDailyBonusNotification(
    userId: number,
    points: number,
    bonusType: string = 'daily'
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'daily_bonus',
      title: '🎁 مكافأة يومية!',
      message: `حصلت على ${points} نقطة كمكافأة ${bonusType === 'daily' ? 'يومية' : bonusType}`,
      data: { points, bonusType },
    });
  }

  // إنشاء إشعار إنجاز
  async createAchievementNotification(
    userId: number,
    achievementName: string,
    achievementDescription: string,
    reward?: number
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'achievement',
      title: '🏆 إنجاز جديد!',
      message: achievementDescription,
      data: { achievementName, reward },
    });
  }
}

// إنشاء مثيل واحد من الخدمة
export const notificationService = new NotificationService();
