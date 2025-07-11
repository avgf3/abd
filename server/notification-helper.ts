import { storage } from './storage';
import { WebSocketServer, WebSocket } from 'ws';
import type { InsertNotification } from '@shared/schema';

interface WebSocketClient extends WebSocket {
  userId?: number;
  username?: string;
}

// مساعد إرسال الإشعارات الذكي
export class NotificationHelper {
  private wss: WebSocketServer | null = null;

  setWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;
  }

  // إرسال إشعار ترحيب للأعضاء الجدد
  async sendWelcomeNotification(userId: number, userType: 'guest' | 'member', username: string) {
    const title = userType === 'guest' ? '🎉 أهلاً وسهلاً' : '🌟 مرحباً بعودتك';
    const message = userType === 'guest' 
      ? `مرحباً بك ${username} كضيف في منصة الدردشة العربية!`
      : `أهلاً بك ${username}! اطلع على الرسائل الجديدة والأصدقاء المتصلين`;

    return this.sendNotification({
      userId,
      type: 'welcome',
      title,
      message,
      data: { userType, welcomeTime: new Date().toISOString() }
    });
  }

  // إرسال إشعار طلب صداقة
  async sendFriendRequestNotification(senderId: number, receiverId: number, senderName: string) {
    return this.sendNotification({
      userId: receiverId,
      type: 'friend_request',
      title: 'طلب صداقة جديد 👫',
      message: `أرسل ${senderName} طلب صداقة إليك`,
      data: { senderId, senderName }
    });
  }

  // إرسال إشعار قبول صداقة
  async sendFriendAcceptedNotification(userId: number, friendName: string) {
    return this.sendNotification({
      userId,
      type: 'friend_accepted',
      title: 'تم قبول طلب الصداقة! 🎉',
      message: `${friendName} قبل طلب صداقتك`,
      data: { friendName }
    });
  }

  // إرسال إشعار رسالة خاصة
  async sendPrivateMessageNotification(userId: number, senderName: string, content: string) {
    return this.sendNotification({
      userId,
      type: 'private_message',
      title: `رسالة جديدة من ${senderName} 💬`,
      message: content.length > 50 ? content.substring(0, 50) + '...' : content,
      data: { senderName, fullContent: content }
    });
  }

  // إرسال إشعار ترقية
  async sendPromotionNotification(userId: number, newRole: string, promoterName: string) {
    const roleNames = {
      'admin': 'مشرف ⭐',
      'moderator': 'مُشرف 🛡️',
      'owner': 'مالك 👑'
    };

    return this.sendNotification({
      userId,
      type: 'promotion',
      title: 'تهانينا! تمت ترقيتك 🎉',
      message: `تمت ترقيتك إلى ${roleNames[newRole] || newRole} بواسطة ${promoterName}`,
      data: { newRole, promoterName }
    });
  }

  // إرسال إشعار إجراء إداري
  async sendModerationNotification(userId: number, action: string, reason: string, duration?: number) {
    const actionNames = {
      'mute': 'كتم 🔇',
      'kick': 'طرد ⏰',
      'ban': 'حظر 🚫'
    };

    const title = `تم ${actionNames[action] || action}`;
    const message = duration 
      ? `تم ${actionNames[action]} لمدة ${duration} دقيقة. السبب: ${reason}`
      : `تم ${actionNames[action]}. السبب: ${reason}`;

    return this.sendNotification({
      userId,
      type: 'moderation',
      title,
      message,
      data: { action, reason, duration }
    });
  }

  // الوظيفة الأساسية لإرسال الإشعارات
  private async sendNotification(notificationData: InsertNotification) {
    try {
      // حفظ في قاعدة البيانات
      const notification = await storage.createNotification(notificationData);

      // إرسال فوري عبر WebSocket
      if (this.wss) {
        this.wss.clients.forEach((client: WebSocketClient) => {
          if (client.readyState === WebSocket.OPEN && client.userId === notificationData.userId) {
            client.send(JSON.stringify({
              type: 'notificationReceived',
              notification: notification
            }));
          }
        });
      }

      return notification;
    } catch (error) {
      console.error('خطأ في إرسال الإشعار:', error);
      throw error;
    }
  }

  // إرسال إشعار عام لجميع المستخدمين
  async broadcastSystemNotification(title: string, message: string, data?: any) {
    if (!this.wss) return;

    const notification = {
      type: 'system',
      title,
      message,
      data: data || {},
      timestamp: new Date().toISOString()
    };

    this.wss.clients.forEach((client: WebSocketClient) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'systemNotification',
          notification
        }));
      }
    });
  }
}

export const notificationHelper = new NotificationHelper();