import type { Socket } from "socket.io";
import { roomService } from "../services/roomService";
import { createMessageBroadcastService, type MessageBroadcastService } from "../services/messageBroadcastService";
import type { Server as IOServer } from "socket.io";

interface AuthenticatedSocket extends Socket {
  userId?: number;
  username?: string;
}

/**
 * معالجات الغرف المنظفة والمبسطة
 */
export class RoomHandlers {
  private broadcastService: MessageBroadcastService;

  constructor(private io: IOServer) {
    this.broadcastService = createMessageBroadcastService(io);
  }

  /**
   * معالج انضمام المستخدم للغرفة
   */
  handleJoinRoom = async (socket: AuthenticatedSocket, data: { roomId: string }) => {
    try {
      const { roomId } = data;
      const userId = socket.userId;
      const username = socket.username;

      console.log(`🔄 طلب انضمام: userId=${userId}, username=${username}, roomId=${roomId}`);

      // التحقق من صحة البيانات
      if (!userId || !username) {
        socket.emit('error', { 
          message: 'جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى',
          code: 'INVALID_SESSION' 
        });
        return;
      }

      if (!roomId) {
        socket.emit('error', { 
          message: 'معرف الغرفة مطلوب',
          code: 'MISSING_ROOM_ID' 
        });
        return;
      }

      // محاولة الانضمام للغرفة
      const result = await roomService.joinRoom(userId, roomId, socket);
      
      if (!result.success) {
        socket.emit('error', { 
          message: result.error || 'فشل في الانضمام للغرفة',
          code: 'JOIN_FAILED' 
        });
        return;
      }

      // إشعار المستخدمين الآخرين بالانضمام
      const user = {
        id: userId,
        username,
        userType: 'member', // يمكن تحسينه لاحقاً
        role: 'member',
        usernameColor: '#FFFFFF',
        isOnline: true,
        joinedAt: new Date()
      };

      await this.broadcastService.broadcastUserJoined(roomId, user);

      // تأكيد الانضمام مع تحميل الرسائل الحديثة
      await this.broadcastService.confirmRoomJoined(socket.id, roomId, true);

      // رسالة ترحيب في الغرفة
      await this.broadcastService.broadcastSystemMessage(
        roomId, 
        `انضم ${username} إلى الغرفة 👋`
      );

      console.log(`✅ ${username} انضم للغرفة ${roomId} بنجاح`);

    } catch (error) {
      console.error('❌ خطأ في معالج انضمام الغرفة:', error);
      socket.emit('error', { 
        message: 'خطأ داخلي في الخادم',
        code: 'INTERNAL_ERROR' 
      });
    }
  };

  /**
   * معالج إرسال الرسائل في الغرفة
   */
  handleRoomMessage = async (socket: AuthenticatedSocket, data: { 
    content: string; 
    roomId?: string; 
    messageType?: string;
  }) => {
    try {
      const { content, messageType = 'text' } = data;
      const userId = socket.userId;
      const username = socket.username;

      // التحقق من صحة البيانات
      if (!userId || !username) {
        socket.emit('error', { 
          message: 'جلسة غير صالحة',
          code: 'INVALID_SESSION' 
        });
        return;
      }

      if (!content || content.trim().length === 0) {
        socket.emit('error', { 
          message: 'محتوى الرسالة مطلوب',
          code: 'EMPTY_MESSAGE' 
        });
        return;
      }

      // الحصول على الغرفة الحالية للمستخدم
      const currentRoom = roomService.getCurrentRoom(userId);
      if (!currentRoom) {
        socket.emit('error', { 
          message: 'يجب الانضمام لغرفة أولاً',
          code: 'NOT_IN_ROOM' 
        });
        return;
      }

      // إرسال الرسالة
      const result = await roomService.sendMessageToRoom(
        userId, 
        currentRoom, 
        content.trim(), 
        messageType
      );

      if (!result.success) {
        socket.emit('error', { 
          message: result.error || 'فشل في إرسال الرسالة',
          code: 'SEND_FAILED' 
        });
        return;
      }

      // بث الرسالة للمستخدمين في الغرفة
      if (result.message) {
        await this.broadcastService.broadcastMessage(currentRoom, result.message);
      }

      console.log(`📤 ${username} أرسل رسالة في الغرفة ${currentRoom}`);

    } catch (error) {
      console.error('❌ خطأ في معالج رسائل الغرفة:', error);
      socket.emit('error', { 
        message: 'خطأ في إرسال الرسالة',
        code: 'INTERNAL_ERROR' 
      });
    }
  };

  /**
   * معالج قطع الاتصال
   */
  handleDisconnect = async (socket: AuthenticatedSocket) => {
    try {
      const userId = socket.userId;
      const username = socket.username;

      if (!userId || !username) {
        return;
      }

      console.log(`👋 انقطع اتصال ${username} (${userId})`);

      // الحصول على الغرفة الحالية
      const currentRoom = roomService.getCurrentRoom(userId);
      
      if (currentRoom) {
        // إشعار المستخدمين الآخرين بالمغادرة
        await this.broadcastService.broadcastUserLeft(currentRoom, username, userId);
        
        // رسالة وداع
        await this.broadcastService.broadcastSystemMessage(
          currentRoom, 
          `غادر ${username} الغرفة 👋`
        );
      }

      // تنظيف بيانات المستخدم
      roomService.cleanupDisconnectedUser(userId);

      console.log(`🧹 تم تنظيف بيانات ${username}`);

    } catch (error) {
      console.error('❌ خطأ في معالج قطع الاتصال:', error);
    }
  };

  /**
   * معالج طلب قائمة المستخدمين
   */
  handleGetOnlineUsers = async (socket: AuthenticatedSocket, data: { roomId?: string }) => {
    try {
      const userId = socket.userId;
      const { roomId } = data;

      if (!userId) {
        socket.emit('error', { 
          message: 'جلسة غير صالحة',
          code: 'INVALID_SESSION' 
        });
        return;
      }

      // استخدام الغرفة المحددة أو الغرفة الحالية
      const targetRoom = roomId || roomService.getCurrentRoom(userId);
      
      if (!targetRoom) {
        socket.emit('error', { 
          message: 'لا توجد غرفة محددة',
          code: 'NO_ROOM' 
        });
        return;
      }

      // إرسال قائمة المستخدمين
      await this.broadcastService.broadcastOnlineUsers(targetRoom);

    } catch (error) {
      console.error('❌ خطأ في معالج قائمة المستخدمين:', error);
      socket.emit('error', { 
        message: 'خطأ في جلب قائمة المستخدمين',
        code: 'INTERNAL_ERROR' 
      });
    }
  };

  /**
   * تسجيل جميع معالجات الغرف
   */
  registerHandlers(socket: AuthenticatedSocket) {
    socket.on('joinRoom', (data) => this.handleJoinRoom(socket, data));
    socket.on('message', (data) => this.handleRoomMessage(socket, data));
    socket.on('roomMessage', (data) => this.handleRoomMessage(socket, data));
    socket.on('getOnlineUsers', (data) => this.handleGetOnlineUsers(socket, data));
    socket.on('disconnect', () => this.handleDisconnect(socket));

    console.log(`🔌 تم تسجيل معالجات الغرف للمستخدم ${socket.username}`);
  }
}

// تصدير factory function
export const createRoomHandlers = (io: IOServer) => new RoomHandlers(io);