import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as IOServer, Socket } from "socket.io";
import { createRoomHandlers } from "./handlers/roomHandlers";
import { AuthManager, type AuthenticatedSocket } from "./auth/authMiddleware";
import { db, checkDatabaseHealth } from "./database-adapter";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import messageRoutes from "./routes/messages";
import uploadRoutes from "./routes/uploads";

/**
 * نظام الطرق المنظف والمحسن
 * يستخدم الخدمات الجديدة لإدارة الغرف والرسائل
 */
export default function setupRoutes(app: Express): Server {
  const server = createServer(app);
  const io = new IOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === "production" 
        ? ["https://abd-ylo2.onrender.com"] 
        : ["http://localhost:5173", "http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  // إعداد المسارات API
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/uploads', uploadRoutes);

  // إنشاء معالجات الغرف
  const roomHandlers = createRoomHandlers(io);

  // معالجة اتصالات Socket.IO
  io.on('connection', async (socket: Socket) => {
    console.log(`🔌 اتصال جديد: ${socket.id}`);

    // تطبيق middleware المصادقة المحسن
    try {
      const authResult = await authenticateSocket(socket);
      if (!authResult.success) {
        console.log(`❌ فشل في المصادقة: ${authResult.error}`);
        socket.emit('authError', { 
          message: 'فشل في المصادقة، يرجى تسجيل الدخول مرة أخرى',
          code: 'AUTH_FAILED' 
        });
        socket.disconnect(true);
        return;
      }

      const authenticatedSocket = socket as AuthenticatedSocket;
      console.log(`✅ تم تأكيد هوية المستخدم: ${authenticatedSocket.username} (${authenticatedSocket.userId})`);

      // تحديث حالة المستخدم كـ متصل
      await updateUserOnlineStatus(authenticatedSocket.userId!, true);

      // تسجيل معالجات الغرف
      roomHandlers.registerHandlers(authenticatedSocket);

      // الانضمام التلقائي للغرفة العامة مع تأخير
      setTimeout(async () => {
        try {
          await roomHandlers.handleJoinRoom(authenticatedSocket, { roomId: 'general' });
        } catch (error) {
          console.error('❌ خطأ في الانضمام التلقائي للغرفة العامة:', error);
        }
      }, 1000);

      // معالجة قطع الاتصال
      socket.on('disconnect', async (reason) => {
        console.log(`🔌 انقطع الاتصال: ${authenticatedSocket.username} - السبب: ${reason}`);
        await handleDisconnection(authenticatedSocket);
      });

    } catch (error) {
      console.error('❌ خطأ في معالجة الاتصال:', error);
      socket.emit('error', { 
        message: 'خطأ في الخادم',
        code: 'SERVER_ERROR' 
      });
      socket.disconnect(true);
    }
  });

  // Routes للواجهة البرمجية
  app.get('/api/health', async (req, res) => {
    try {
      const dbHealthy = await checkDatabaseHealth();
      
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        system: 'clean-room-system',
        version: '2.1',
        database: dbHealthy ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        system: 'clean-room-system',
        version: '2.1',
        database: 'error',
        error: 'Health check failed'
      });
    }
  });

  // معلومات الخادم المحسنة
  app.get('/api/server-info', (req, res) => {
    const connectedUsers = io.sockets.sockets.size;
    const rooms = Array.from(io.sockets.adapter.rooms.keys())
      .filter(room => room.startsWith('room_'))
      .map(room => room.replace('room_', ''));

    res.json({
      connectedUsers,
      activeRooms: rooms,
      serverTime: new Date().toISOString(),
      version: '2.1-enhanced',
      environment: process.env.NODE_ENV || 'development'
    });
  });

  console.log('🚀 تم إعداد النظام المنظف للغرف والرسائل');
  
  return server;
}

/**
 * مصادقة Socket محسنة
 */
async function authenticateSocket(socket: Socket): Promise<{ success: boolean; error?: string }> {
  try {
    // استخراج token من handshake
    const token = socket.handshake.auth?.token || 
                 socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
                 socket.handshake.query?.token as string;

    if (!token) {
      return { success: false, error: 'لا يوجد token' };
    }

    // التحقق من صحة token
    const decoded = AuthManager.verifyToken(token);
    
    if (!decoded) {
      return { success: false, error: 'token غير صالح' };
    }

    // التحقق من وجود المستخدم في قاعدة البيانات
    const isValidUser = await AuthManager.validateUserInDatabase(decoded.userId);
    
    if (!isValidUser) {
      return { success: false, error: 'المستخدم غير موجود' };
    }

    // الحصول على بيانات المستخدم الكاملة
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);
    
    if (!user) {
      return { success: false, error: 'فشل في جلب بيانات المستخدم' };
    }

    // إضافة بيانات المستخدم للSocket
    const authenticatedSocket = socket as AuthenticatedSocket;
    authenticatedSocket.userId = user.id;
    authenticatedSocket.username = user.username;
    authenticatedSocket.userType = user.userType;
    authenticatedSocket.isAuthenticated = true;

    return { success: true };
    
  } catch (error) {
    console.error('❌ خطأ في مصادقة Socket:', error);
    return { success: false, error: 'خطأ في الخادم' };
  }
}

/**
 * تحديث حالة الاتصال للمستخدم
 */
async function updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void> {
  try {
    await db.update(users)
      .set({ 
        isOnline, 
        lastSeen: new Date() 
      })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error('❌ خطأ في تحديث حالة الاتصال:', error);
  }
}

/**
 * معالجة قطع الاتصال
 */
async function handleDisconnection(socket: AuthenticatedSocket): Promise<void> {
  try {
    if (socket.userId) {
      await updateUserOnlineStatus(socket.userId, false);
    }
  } catch (error) {
    console.error('❌ خطأ في معالجة قطع الاتصال:', error);
  }
}