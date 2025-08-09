import { storage } from '../storage';

export interface NotificationData {
  userId: number;
  type: string;
  title: string;
  message: string;
  data?: any;
}

export class NotificationHelpers {
  // Create a friend request notification
  static async createFriendRequestNotification(
    receiverId: number,
    senderName: string,
    senderId: number,
    requestId: number
  ) {
    return await storage.createNotification({
      userId: receiverId,
      type: 'friendRequest',
      title: '👫 طلب صداقة جديد',
      message: `أرسل ${senderName} طلب صداقة إليك`,
      data: { requestId, senderId, senderName }
    });
  }

  // Create a friend accepted notification
  static async createFriendAcceptedNotification(
    userId: number,
    friendName: string,
    friendId: number
  ) {
    return await storage.createNotification({
      userId,
      type: 'friendAccepted',
      title: '✅ تم قبول طلب الصداقة',
      message: `قبل ${friendName} طلب صداقتك`,
      data: { friendId, friendName }
    });
  }

  // Create a system notification
  static async createSystemNotification(
    userId: number,
    title: string,
    message: string,
    data?: any
  ) {
    return await storage.createNotification({
      userId,
      type: 'system',
      title,
      message,
      data
    });
  }

  // Create a message notification
  static async createMessageNotification(
    userId: number,
    senderName: string,
    senderId: number,
    messagePreview: string
  ) {
    return await storage.createNotification({
      userId,
      type: 'message',
      title: `رسالة من ${senderName}`,
      message: messagePreview.length > 50 
        ? messagePreview.substring(0, 50) + '...'
        : messagePreview,
      data: { senderId, senderName }
    });
  }

  // Create a moderation notification
  static async createModerationNotification(
    userId: number,
    action: string,
    reason: string,
    moderatorName: string,
    duration?: number
  ) {
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

    return await storage.createNotification({
      userId,
      type: 'moderation',
      title,
      message,
      data: { action, reason, moderatorName, duration }
    });
  }

  // Create a promotion notification
  static async createPromotionNotification(
    userId: number,
    newRole: string,
    promotedBy: string
  ) {
    return await storage.createNotification({
      userId,
      type: 'promotion',
      title: 'تهانينا! تمت ترقيتك',
      message: `تمت ترقيتك إلى ${newRole} من قبل ${promotedBy}`,
      data: { newRole, promotedBy }
    });
  }
}

// Export individual functions for easier importing
export const {
  createFriendRequestNotification,
  createFriendAcceptedNotification,
  createSystemNotification,
  createMessageNotification,
  createModerationNotification,
  createPromotionNotification
} = NotificationHelpers;