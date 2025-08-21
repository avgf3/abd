import type { Server as IOServer } from 'socket.io';
import type { CustomSocket } from './types';
import { sanitizeInput, validateMessageContent } from '../security';
import { storage } from '../storage';

export class PrivateMessageHandler {
  constructor(private io: IOServer) {}

  async handleSend(socket: CustomSocket, data: any) {
    if (!socket.userId || !data.recipientId || !data.content) {
      socket.emit('error', { message: 'بيانات غير صالحة' });
      return;
    }

    const content = sanitizeInput(data.content);
    if (!validateMessageContent(content)) {
      socket.emit('error', { message: 'محتوى الرسالة غير صالح' });
      return;
    }

    try {
      // Check if recipient exists
      const recipient = await storage.getUserById(data.recipientId);
      if (!recipient) {
        socket.emit('error', { message: 'المستخدم غير موجود' });
        return;
      }

      // Check if blocked
      const blockedUsers = await storage.getBlockedUsers(data.recipientId);
      if (blockedUsers.some(b => b.blockedUserId === socket.userId)) {
        socket.emit('error', { message: 'لا يمكنك مراسلة هذا المستخدم' });
        return;
      }

      // Create message
      const message = await storage.createPrivateMessage({
        senderId: socket.userId,
        recipientId: data.recipientId,
        content,
      });

      // Send to sender
      socket.emit('private:message', message);

      // Send to recipient if online
      this.io.to(`user:${data.recipientId}`).emit('private:message', message);

      // Send notification
      await storage.createNotification({
        userId: data.recipientId,
        type: 'private_message',
        message: 'رسالة خاصة جديدة',
        relatedUserId: socket.userId,
      });

    } catch (error: any) {
      socket.emit('error', { message: 'فشل في إرسال الرسالة' });
    }
  }

  async handleTyping(socket: CustomSocket, data: any) {
    if (!socket.userId || !data.recipientId) return;

    this.io.to(`user:${data.recipientId}`).emit('private:typing', {
      userId: socket.userId,
      isTyping: data.isTyping,
    });
  }

  async handleMarkRead(socket: CustomSocket, data: any) {
    if (!socket.userId || !data.senderId) return;

    try {
      await storage.markPrivateMessagesAsRead(socket.userId, data.senderId);
      
      socket.emit('private:read:success', {
        senderId: data.senderId,
      });
    } catch (error) {
      socket.emit('error', { message: 'فشل في تحديث حالة القراءة' });
    }
  }
}

export function createPrivateMessageHandler(io: IOServer) {
  return new PrivateMessageHandler(io);
}