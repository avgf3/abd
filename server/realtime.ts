import type { Server as HttpServer } from 'http';
import { Server as IOServer } from 'socket.io';

import type { 
  CustomSocket,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData
} from './types/socket';

import { moderationSystem } from './moderation';
import { sanitizeInput, validateMessageContent } from './security';
import { pointsService } from './services/pointsService';
import { roomMessageService } from './services/roomMessageService';
import { formatRoomEventMessage } from './utils/roomEventFormatter';
import { roomService } from './services/roomService';
import { voiceService } from './services/voiceService';
import { storage } from './storage';
import { sanitizeUsersArray } from './utils/data-sanitizer';
import { getClientIpFromHeaders, getDeviceIdFromHeaders } from './utils/device';
import { verifyAuthToken } from './utils/auth-token';

const GENERAL_ROOM = 'general';

// متغيرات عامة
let ioInstance: IOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null;

// دالة بسيطة لجلب المستخدمين المتصلين من قاعدة البيانات
export async function getOnlineUsersForRoom(roomId: string) {
  try {
    const users = await storage.getOnlineUsersInRoom(roomId);
    return users || [];
  } catch (error) {
    console.error('Error getting online users for room:', error);
    return [];
  }
}

// دالة بسيطة لتحديث حالة المستخدم
export async function updateUserStatus(userId: number, isOnline: boolean) {
  try {
    await storage.setUserOnlineStatus(userId, isOnline);
  } catch (error) {
    console.error('Error updating user status:', error);
  }
}

// دالة بسيطة لإرسال رسالة
export async function sendMessage(socket: CustomSocket, messageData: any) {
  try {
    const message = await storage.createMessage(messageData);
    if (message && ioInstance) {
      ioInstance.to(`room_${messageData.roomId}`).emit('message', {
        type: 'message',
        message,
        roomId: messageData.roomId,
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// دالة بسيطة للانضمام للغرفة
export async function joinRoom(
  io: IOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: CustomSocket,
  userId: number,
  username: string,
  roomId: string
) {
  try {
    // الانضمام للغرفة في قاعدة البيانات
    await roomService.joinRoom(userId, roomId);
    
    // الانضمام للغرفة في Socket.IO
    socket.join(`room_${roomId}`);
    socket.currentRoom = roomId;
    
    // تحديث حالة المستخدم
    await updateUserStatus(userId, true);
    
    // إرسال قائمة المستخدمين المحدثة
    const users = await getOnlineUsersForRoom(roomId);
    io.to(`room_${roomId}`).emit('message', {
      type: 'onlineUsers',
      users,
      roomId,
      timestamp: Date.now(),
    });
    
    console.log(`✅ المستخدم ${username} انضم للغرفة ${roomId}`);
  } catch (error) {
    console.error('Error joining room:', error);
    socket.emit('message', {
      type: 'error',
      message: 'فشل الانضمام للغرفة',
      roomId,
    });
  }
}

// دالة بسيطة لمغادرة الغرفة
export async function leaveRoom(
  io: IOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: CustomSocket,
  userId: number,
  username: string,
  roomId: string
) {
  try {
    // مغادرة الغرفة في Socket.IO
    socket.leave(`room_${roomId}`);
    socket.currentRoom = null;
    
    // تحديث حالة المستخدم
    await updateUserStatus(userId, false);
    
    // إرسال قائمة المستخدمين المحدثة
    const users = await getOnlineUsersForRoom(roomId);
    io.to(`room_${roomId}`).emit('message', {
      type: 'onlineUsers',
      users,
      roomId,
      timestamp: Date.now(),
    });
    
    console.log(`👋 المستخدم ${username} غادر الغرفة ${roomId}`);
  } catch (error) {
    console.error('Error leaving room:', error);
  }
}

// دالة بسيطة لقطع الاتصال
export async function handleDisconnect(
  io: IOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: CustomSocket,
  userId: number,
  username: string,
  roomId: string
) {
  try {
    if (roomId) {
      await leaveRoom(io, socket, userId, username, roomId);
    }
    
    // تحديث حالة المستخدم
    await updateUserStatus(userId, false);
    
    console.log(`🔌 المستخدم ${username} قطع الاتصال`);
  } catch (error) {
    console.error('Error handling disconnect:', error);
  }
}

// دالة إعداد Socket.IO
export function setupSocketIO(server: HttpServer) {
  ioInstance = new IOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  ioInstance.on('connection', async (socket: CustomSocket) => {
    try {
      // التحقق من التوثيق
      const token = socket.handshake.auth?.token;
      if (!token) {
        socket.emit('message', {
          type: 'error',
          message: 'مطلوب توثيق',
        });
        socket.disconnect();
        return;
      }

      // التحقق من صحة التوكن
      const user = await verifyAuthToken(token);
      if (!user) {
        socket.emit('message', {
          type: 'error',
          message: 'توكن غير صالح',
        });
        socket.disconnect();
        return;
      }

      // تعيين بيانات المستخدم
      socket.userId = user.id;
      socket.username = user.username;
      socket.userType = user.userType;
      socket.currentRoom = null;

      console.log(`🔗 اتصال جديد: ${socket.id} للمستخدم ${user.username}`);

      // معالجة الرسائل
      socket.on('message', async (data) => {
        try {
          if (!data.content || !data.roomId) return;

          // التحقق من صحة المحتوى
          const sanitizedContent = sanitizeInput(data.content);
          if (!validateMessageContent(sanitizedContent)) {
            socket.emit('message', {
              type: 'error',
              message: 'محتوى الرسالة غير صالح',
            });
            return;
          }

          // إنشاء الرسالة
          const messageData = {
            senderId: user.id,
            content: sanitizedContent,
            messageType: 'text',
            isPrivate: false,
            roomId: data.roomId,
            timestamp: new Date(),
          };

          await sendMessage(socket, messageData);
        } catch (error) {
          console.error('Error handling message:', error);
        }
      });

      // معالجة الانضمام للغرفة
      socket.on('joinRoom', async (data) => {
        try {
          if (!data.roomId) return;
          await joinRoom(ioInstance!, socket, user.id, user.username, data.roomId);
        } catch (error) {
          console.error('Error joining room:', error);
        }
      });

      // معالجة مغادرة الغرفة
      socket.on('leaveRoom', async (data) => {
        try {
          if (!data.roomId) return;
          await leaveRoom(ioInstance!, socket, user.id, user.username, data.roomId);
        } catch (error) {
          console.error('Error leaving room:', error);
        }
      });

      // معالجة قطع الاتصال
      socket.on('disconnect', async (reason) => {
        try {
          await handleDisconnect(ioInstance!, socket, user.id, user.username, socket.currentRoom || '');
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      });

    } catch (error) {
      console.error('Error in socket connection:', error);
      socket.disconnect();
    }
  });

  return ioInstance;
}

export default setupSocketIO;