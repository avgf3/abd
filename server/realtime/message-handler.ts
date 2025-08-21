import type { Server as IOServer } from 'socket.io';
import type { CustomSocket } from './types';
import { sanitizeInput, validateMessageContent } from '../security';
import { spamProtection } from '../spam-protection';
import { moderationSystem } from '../moderation';
import { roomMessageService } from '../services/roomMessageService';
import { pointsService } from '../services/pointsService';
import { storage } from '../storage';

export class MessageHandler {
  constructor(private io: IOServer) {}

  async handleMessage(socket: CustomSocket, data: any) {
    if (!socket.userId || !socket.username || !socket.currentRoom) {
      socket.emit('error', { message: 'يجب تسجيل الدخول والانضمام لغرفة' });
      return;
    }

    // Validate and sanitize
    const content = sanitizeInput(data.content || '');
    if (!validateMessageContent(content)) {
      socket.emit('error', { message: 'محتوى الرسالة غير صالح' });
      return;
    }

    // Check spam
    const spamCheck = await spamProtection.checkMessage(
      socket.userId,
      content,
      socket.currentRoom
    );
    
    if (!spamCheck.allowed) {
      socket.emit('error', { 
        message: spamCheck.reason || 'تم رفض الرسالة',
        cooldown: spamCheck.cooldownRemaining,
      });
      return;
    }

    // Check moderation
    const moderationCheck = await moderationSystem.checkMessage(content);
    if (moderationCheck.blocked) {
      socket.emit('error', { 
        message: 'الرسالة تحتوي على محتوى غير مسموح',
        violations: moderationCheck.violations,
      });
      return;
    }

    try {
      // Check if user is muted
      const user = await storage.getUserById(socket.userId);
      if (user?.isMuted) {
        const now = new Date();
        const muteExpiry = user.muteExpiresAt ? new Date(user.muteExpiresAt) : null;
        
        if (!muteExpiry || muteExpiry > now) {
          socket.emit('error', { 
            message: 'أنت مكتوم ولا يمكنك إرسال رسائل',
            muteExpiresAt: muteExpiry?.toISOString(),
          });
          return;
        }
      }

      // Create message
      const message = await roomMessageService.createMessage({
        userId: socket.userId,
        username: socket.username,
        content: moderationCheck.filtered || content,
        roomId: socket.currentRoom,
        userType: socket.userType || 'member',
      });

      // Grant points
      await pointsService.grantPoints(socket.userId, 1, 'إرسال رسالة');

      // Broadcast to room
      this.io.to(`room_${socket.currentRoom}`).emit('message', {
        ...message,
        type: 'user_message',
      });

      // Update spam protection
      await spamProtection.recordMessage(socket.userId, socket.currentRoom);

    } catch (error: any) {
      socket.emit('error', { 
        message: 'فشل في إرسال الرسالة',
        details: error.message,
      });
    }
  }

  async handleEdit(socket: CustomSocket, data: any) {
    if (!socket.userId || !data.messageId || !data.content) {
      socket.emit('error', { message: 'بيانات غير صالحة' });
      return;
    }

    try {
      const message = await roomMessageService.getMessageById(data.messageId);
      
      if (!message || message.userId !== socket.userId) {
        socket.emit('error', { message: 'غير مصرح بتعديل هذه الرسالة' });
        return;
      }

      // Check if message is too old (5 minutes)
      const messageAge = Date.now() - new Date(message.createdAt).getTime();
      if (messageAge > 5 * 60 * 1000) {
        socket.emit('error', { message: 'لا يمكن تعديل رسالة قديمة' });
        return;
      }

      const content = sanitizeInput(data.content);
      const moderationCheck = await moderationSystem.checkMessage(content);
      
      if (moderationCheck.blocked) {
        socket.emit('error', { message: 'المحتوى غير مسموح' });
        return;
      }

      const updated = await roomMessageService.updateMessage(
        data.messageId,
        moderationCheck.filtered || content
      );

      this.io.to(`room_${message.roomId}`).emit('message:edited', updated);
      
    } catch (error: any) {
      socket.emit('error', { message: 'فشل في تعديل الرسالة' });
    }
  }

  async handleDelete(socket: CustomSocket, data: any) {
    if (!socket.userId || !data.messageId) {
      socket.emit('error', { message: 'بيانات غير صالحة' });
      return;
    }

    try {
      const message = await roomMessageService.getMessageById(data.messageId);
      
      // Check permissions
      const user = await storage.getUserById(socket.userId);
      const canDelete = message?.userId === socket.userId || 
                       user?.role === 'admin' || 
                       user?.role === 'moderator' ||
                       user?.role === 'owner';

      if (!message || !canDelete) {
        socket.emit('error', { message: 'غير مصرح بحذف هذه الرسالة' });
        return;
      }

      await roomMessageService.deleteMessage(data.messageId);
      
      this.io.to(`room_${message.roomId}`).emit('message:deleted', {
        messageId: data.messageId,
        roomId: message.roomId,
      });
      
    } catch (error: any) {
      socket.emit('error', { message: 'فشل في حذف الرسالة' });
    }
  }

  async handleTyping(socket: CustomSocket, data: any) {
    if (!socket.userId || !socket.username || !socket.currentRoom) return;

    socket.to(`room_${socket.currentRoom}`).emit('user:typing', {
      userId: socket.userId,
      username: socket.username,
      isTyping: data.isTyping,
    });
  }
}

export function createMessageHandler(io: IOServer) {
  return new MessageHandler(io);
}