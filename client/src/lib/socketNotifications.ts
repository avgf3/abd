import type { Socket } from 'socket.io-client';

interface NotificationData {
  notification: {
    id: number;
    userId: number;
    type: string;
    title: string;
    message: string;
    data?: any;
    isRead: boolean;
    createdAt: string;
  };
}

interface FriendRequestData {
  requestId: number;
  senderName: string;
  senderId: number;
}

interface FriendAcceptedData {
  friendName: string;
  friendId: number;
}

export function attachNotificationListeners(socket: Socket) {
  // معالج الإشعارات العامة
  socket.on('newNotification', (data: NotificationData) => {
    console.log('📬 New notification received:', data);
    
    // إطلاق حدث DOM للإشعار
    window.dispatchEvent(new CustomEvent('notificationReceived', {
      detail: data.notification
    }));

    // معالجة أنواع الإشعارات المختلفة
    switch (data.notification.type) {
      case 'friend_request':
      case 'friendRequest':
        window.dispatchEvent(new CustomEvent('friendRequestReceived', {
          detail: {
            senderName: data.notification.data?.senderName,
            senderId: data.notification.data?.senderId,
            requestId: data.notification.data?.requestId
          }
        }));
        break;

      case 'friend_accepted':
      case 'friendAccepted':
        window.dispatchEvent(new CustomEvent('friendRequestAccepted', {
          detail: {
            friendName: data.notification.data?.friendName,
            friendId: data.notification.data?.friendId
          }
        }));
        break;

      case 'message':
        window.dispatchEvent(new CustomEvent('privateMessageReceived', {
          detail: {
            senderName: data.notification.data?.senderName,
            senderId: data.notification.data?.senderId,
            message: data.notification.message
          }
        }));
        break;

      case 'points_received':
        window.dispatchEvent(new CustomEvent('pointsReceived', {
          detail: {
            points: data.notification.data?.points,
            senderName: data.notification.data?.senderName,
            senderId: data.notification.data?.senderId
          }
        }));
        break;

      case 'level_up':
        window.dispatchEvent(new CustomEvent('levelUp', {
          detail: {
            oldLevel: data.notification.data?.oldLevel,
            newLevel: data.notification.data?.newLevel,
            levelTitle: data.notification.data?.levelTitle
          }
        }));
        break;

      case 'moderation':
        window.dispatchEvent(new CustomEvent('moderationAction', {
          detail: {
            action: data.notification.data?.action,
            reason: data.notification.data?.reason,
            moderatorName: data.notification.data?.moderatorName,
            duration: data.notification.data?.duration
          }
        }));
        break;

      case 'promotion':
        window.dispatchEvent(new CustomEvent('userPromoted', {
          detail: {
            newRole: data.notification.data?.newRole,
            promotedBy: data.notification.data?.promotedBy
          }
        }));
        break;
    }
  });

  // معالج طلبات الصداقة المباشرة (للتوافق مع الكود القديم)
  socket.on('friendRequestReceived', (data: FriendRequestData) => {
    console.log('👫 Friend request received:', data);
    window.dispatchEvent(new CustomEvent('friendRequestReceived', {
      detail: data
    }));
  });

  // معالج قبول الصداقة المباشر
  socket.on('friendRequestAccepted', (data: FriendAcceptedData) => {
    console.log('✅ Friend request accepted:', data);
    window.dispatchEvent(new CustomEvent('friendRequestAccepted', {
      detail: data
    }));
  });

  // معالج إضافة صديق جديد
  socket.on('friendAdded', (data: any) => {
    console.log('➕ Friend added:', data);
    window.dispatchEvent(new CustomEvent('friendAdded', {
      detail: data
    }));
  });

  // معالج حذف صديق
  socket.on('friendRemoved', (data: any) => {
    console.log('➖ Friend removed:', data);
    window.dispatchEvent(new CustomEvent('friendRemoved', {
      detail: data
    }));
  });

  console.log('✅ Notification listeners attached to socket');
}

export function detachNotificationListeners(socket: Socket) {
  socket.off('newNotification');
  socket.off('friendRequestReceived');
  socket.off('friendRequestAccepted');
  socket.off('friendAdded');
  socket.off('friendRemoved');
  console.log('🔌 Notification listeners detached from socket');
}