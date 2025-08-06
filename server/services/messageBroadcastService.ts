import type { Server as IOServer } from "socket.io";
import { roomService, type RoomMessage, type RoomUser } from "./roomService";

export interface MessageEvent {
  type: 'newMessage' | 'userJoined' | 'userLeft' | 'onlineUsers' | 'roomJoined';
  message?: RoomMessage;
  user?: RoomUser;
  users?: RoomUser[];
  roomId: string;
  username?: string;
  userId?: number;
}

/**
 * خدمة البث المنظفة للرسائل والأحداث
 */
export class MessageBroadcastService {
  constructor(private io: IOServer) {}

  /**
   * بث رسالة جديدة في الغرفة
   */
  async broadcastMessage(roomId: string, message: RoomMessage): Promise<void> {
    const event: MessageEvent = {
      type: 'newMessage',
      message,
      roomId
    };

    console.log(`📤 بث رسالة في الغرفة ${roomId}: ${message.content.substring(0, 50)}...`);
    
    // البث فقط للمستخدمين في نفس الغرفة
    this.io.to(`room_${roomId}`).emit('message', event);
  }

  /**
   * إشعار انضمام مستخدم للغرفة
   */
  async broadcastUserJoined(roomId: string, user: RoomUser): Promise<void> {
    const event: MessageEvent = {
      type: 'userJoined',
      user,
      roomId,
      username: user.username,
      userId: user.id
    };

    console.log(`👤 ${user.username} انضم للغرفة ${roomId}`);
    
    // إشعار المستخدمين الآخرين في الغرفة
    this.io.to(`room_${roomId}`).emit('userJoinedRoom', event);
    
    // إرسال قائمة محدثة للمستخدمين
    await this.broadcastOnlineUsers(roomId);
  }

  /**
   * إشعار مغادرة مستخدم للغرفة
   */
  async broadcastUserLeft(roomId: string, username: string, userId: number): Promise<void> {
    const event: MessageEvent = {
      type: 'userLeft',
      roomId,
      username,
      userId
    };

    console.log(`👋 ${username} غادر الغرفة ${roomId}`);
    
    // إشعار المستخدمين الآخرين في الغرفة
    this.io.to(`room_${roomId}`).emit('userLeftRoom', event);
    
    // إرسال قائمة محدثة للمستخدمين
    await this.broadcastOnlineUsers(roomId);
  }

  /**
   * بث قائمة المستخدمين المتصلين في الغرفة
   */
  async broadcastOnlineUsers(roomId: string): Promise<void> {
    try {
      const users = await roomService.getOnlineUsersInRoom(roomId);
      
      const event: MessageEvent = {
        type: 'onlineUsers',
        users,
        roomId
      };

      console.log(`👥 تحديث قائمة المستخدمين في الغرفة ${roomId}: ${users.length} مستخدم`);
      
      this.io.to(`room_${roomId}`).emit('onlineUsers', event);
    } catch (error) {
      console.error('❌ خطأ في بث قائمة المستخدمين:', error);
    }
  }

  /**
   * تأكيد انضمام المستخدم للغرفة مع الرسائل الحديثة
   */
  async confirmRoomJoined(
    socketId: string, 
    roomId: string, 
    loadMessages: boolean = true
  ): Promise<void> {
    try {
      const users = await roomService.getOnlineUsersInRoom(roomId);
      
      const event: MessageEvent = {
        type: 'roomJoined',
        users,
        roomId
      };

      console.log(`✅ تأكيد انضمام للغرفة ${roomId}`);
      
      // إرسال تأكيد الانضمام للمستخدم
      this.io.to(socketId).emit('message', event);

      // تحميل آخر 50 رسالة إذا طُلب ذلك
      if (loadMessages) {
        const recentMessages = await roomService.getRecentMessages(roomId, 50);
        
        for (const message of recentMessages) {
          this.io.to(socketId).emit('message', {
            type: 'newMessage',
            message,
            roomId
          });
        }
        
        console.log(`📩 تم تحميل ${recentMessages.length} رسالة حديثة للمستخدم`);
      }

    } catch (error) {
      console.error('❌ خطأ في تأكيد انضمام الغرفة:', error);
    }
  }

  /**
   * بث رسالة نظام في الغرفة
   */
  async broadcastSystemMessage(roomId: string, content: string): Promise<void> {
    const systemMessage: RoomMessage = {
      id: Date.now(),
      senderId: -1,
      content,
      messageType: 'system',
      roomId,
      timestamp: new Date(),
      sender: {
        id: -1,
        username: 'النظام',
        userType: 'system',
        role: 'system',
        usernameColor: '#FFD700',
        isOnline: true,
        joinedAt: new Date()
      }
    };

    await this.broadcastMessage(roomId, systemMessage);
  }

  /**
   * الحصول على إحصائيات البث
   */
  getBroadcastStats(roomId: string) {
    const roomStats = roomService.getRoomStats(roomId);
    const connectedSockets = this.io.sockets.adapter.rooms.get(`room_${roomId}`)?.size || 0;
    
    return {
      ...roomStats,
      connectedSockets
    };
  }
}

// تصدير factory function
export const createMessageBroadcastService = (io: IOServer) => 
  new MessageBroadcastService(io);