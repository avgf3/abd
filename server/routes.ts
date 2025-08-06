import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as IOServer, Socket } from "socket.io";
import { createRoomHandlers } from "./handlers/roomHandlers";
import { authMiddleware, socketAuthMiddleware, type AuthenticatedSocket } from "./auth/authMiddleware";
import { db } from "./database-adapter";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

/**
 * نظام الطرق المنظف والمحسن
 * يستخدم الخدمات الجديدة لإدارة الغرف والرسائل
 */
export default function setupRoutes(app: Express): Server {
  const server = createServer(app);
  const io = new IOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === "production" 
        ? ["https://your-domain.com"] 
        : ["http://localhost:5173", "http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // إنشاء معالجات الغرف
  const roomHandlers = createRoomHandlers(io);

  // معالجة اتصالات Socket.IO
  io.on('connection', async (socket: Socket) => {
    console.log(`🔌 اتصال جديد: ${socket.id}`);

    // تطبيق middleware المصادقة
    const authResult = await socketAuthMiddleware(socket);
    if (!authResult.success) {
      console.log(`❌ فشل في المصادقة: ${authResult.error}`);
      socket.emit('error', { 
        message: 'فشل في المصادقة، يرجى تسجيل الدخول مرة أخرى',
        code: 'AUTH_FAILED' 
      });
      socket.disconnect();
      return;
    }

    const authenticatedSocket = socket as AuthenticatedSocket;
    console.log(`✅ تم تأكيد هوية المستخدم: ${authenticatedSocket.username} (${authenticatedSocket.userId})`);

    // تحديث حالة المستخدم كـ متصل
    try {
      await db.update(users)
        .set({ 
          isOnline: true, 
          lastSeen: new Date() 
        })
        .where(eq(users.id, authenticatedSocket.userId!));
    } catch (error) {
      console.error('❌ خطأ في تحديث حالة الاتصال:', error);
    }

    // تسجيل معالجات الغرف
    roomHandlers.registerHandlers(authenticatedSocket);

    // الانضمام التلقائي للغرفة العامة
    setTimeout(async () => {
      try {
        await roomHandlers.handleJoinRoom(authenticatedSocket, { roomId: 'general' });
      } catch (error) {
        console.error('❌ خطأ في الانضمام التلقائي للغرفة العامة:', error);
      }
    }, 1000);

    // معالجة قطع الاتصال
    socket.on('disconnect', async () => {
      try {
        // تحديث حالة المستخدم كـ غير متصل
        if (authenticatedSocket.userId) {
          await db.update(users)
            .set({ 
              isOnline: false, 
              lastSeen: new Date() 
            })
            .where(eq(users.id, authenticatedSocket.userId));
        }

        console.log(`🔌 انقطع الاتصال: ${authenticatedSocket.username}`);
      } catch (error) {
        console.error('❌ خطأ في معالجة قطع الاتصال:', error);
      }
    });
  });

  // Routes للواجهة البرمجية
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      system: 'clean-room-system'
    });
  });

  // معلومات الخادم
  app.get('/api/server-info', (req, res) => {
    const connectedUsers = io.sockets.sockets.size;
    const rooms = Array.from(io.sockets.adapter.rooms.keys())
      .filter(room => room.startsWith('room_'))
      .map(room => room.replace('room_', ''));

    res.json({
      connectedUsers,
      activeRooms: rooms,
      serverTime: new Date().toISOString(),
      version: '2.0-clean'
    });
  });

  // Route للحصول على معلومات الغرف
  app.get('/api/rooms', authMiddleware, async (req, res) => {
    try {
      const rooms = Array.from(io.sockets.adapter.rooms.keys())
        .filter(room => room.startsWith('room_'))
        .map(roomKey => {
          const roomId = roomKey.replace('room_', '');
          const userCount = io.sockets.adapter.rooms.get(roomKey)?.size || 0;
          return {
            id: roomId,
            name: roomId === 'general' ? 'الغرفة العامة' : roomId,
            userCount,
            isActive: userCount > 0
          };
        });

      res.json({ success: true, rooms });
    } catch (error) {
      console.error('❌ خطأ في جلب معلومات الغرف:', error);
      res.status(500).json({ 
        success: false, 
        error: 'خطأ في جلب معلومات الغرف' 
      });
    }
  });

  console.log('🚀 تم إعداد النظام المنظف للغرف والرسائل');
  
  return server;
}