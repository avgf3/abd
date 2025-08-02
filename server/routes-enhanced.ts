import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as IOServer } from "socket.io";
import { setupEnhancedRoomsSystem } from "./enhanced-rooms-system";
import { enhancedUserManager, permissionManager } from "./enhanced-user-system";
import { performanceOptimizer, errorHandler, rateLimiter } from "./performance-optimizer";
import { storage } from "./storage";

// إعداد الـ routes المحسّن
export function registerEnhancedRoutes(app: Express): Server {
  const httpServer = createServer(app);
  
  // إعداد Socket.IO مع تحسينات الأداء
  const io = new IOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB
    transports: ['websocket', 'polling']
  });

  // إعداد نظام الغرف المحسّن
  const roomManager = setupEnhancedRoomsSystem(io);

  // إعداد معالجة متقدمة للأخطاء
  process.on('uncaughtException', (error) => {
    errorHandler.handleError(error, 'uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    errorHandler.handleError(new Error(String(reason)), 'unhandledRejection');
  });

  // Routes للمستخدمين المحسّنة
  app.get('/api/users/online', async (req, res) => {
    try {
      const onlineUsers = enhancedUserManager.getOnlineUsers();
      const formattedUsers = onlineUsers.map(session => ({
        id: session.userId,
        socketId: session.socketId,
        isOnline: session.isActive,
        lastActivity: session.lastActivity
      }));

      res.json({ users: formattedUsers });
    } catch (error) {
      errorHandler.handleError(error as Error, 'getOnlineUsers');
      res.status(500).json({ error: 'خطأ في جلب المستخدمين المتصلين' });
    }
  });

  // إحصائيات النظام
  app.get('/api/system/stats', async (req, res) => {
    try {
      const userStats = enhancedUserManager.getUserStats();
      const performanceStats = performanceOptimizer.getPerformanceStats();
      const errorStats = errorHandler.getErrorStats();
      const rateLimitStats = rateLimiter.getLimitStats();
      const roomStats = roomManager.getSystemStats();

      res.json({
        users: userStats,
        performance: performanceStats,
        errors: errorStats,
        rateLimit: rateLimitStats,
        rooms: roomStats,
        timestamp: Date.now()
      });
    } catch (error) {
      errorHandler.handleError(error as Error, 'getSystemStats');
      res.status(500).json({ error: 'خطأ في جلب الإحصائيات' });
    }
  });

  // إنشاء غرفة مع فحص الصلاحيات
  app.post('/api/rooms', async (req, res) => {
    try {
      const { name, description, userId, isPrivate } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
      }

      // فحص الحدود
      const rateLimitCheck = rateLimiter.checkLimit(userId, 'room');
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ 
          error: 'تم تجاوز حد إنشاء الغرف',
          resetTime: rateLimitCheck.resetTime 
        });
      }

      // فحص الصلاحيات
      if (!enhancedUserManager.checkPermission(userId, 'canCreateRooms')) {
        return res.status(403).json({ error: 'ليس لديك صلاحية إنشاء الغرف' });
      }

      // إنشاء الغرفة
      const room = await storage.createRoom({
        name: name,
        description: description || '',
        createdBy: userId,
        isPrivate: isPrivate || false
      });

      if (room) {
        // إشعار جميع المستخدمين
        await roomManager.broadcastToAll('roomCreated', { room });
        
        res.json({ room });
        console.log(`🏠 غرفة جديدة: ${name} من المستخدم ${userId}`);
      } else {
        res.status(500).json({ error: 'فشل في إنشاء الغرفة' });
      }

    } catch (error) {
      errorHandler.handleError(error as Error, 'createRoom');
      res.status(500).json({ error: 'خطأ في إنشاء الغرفة' });
    }
  });

  // حذف غرفة مع فحص الصلاحيات
  app.delete('/api/rooms/:roomId', async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
      }

      // فحص الصلاحيات
      if (!enhancedUserManager.checkPermission(userId, 'canDeleteRooms')) {
        return res.status(403).json({ error: 'ليس لديك صلاحية حذف الغرف' });
      }

      // حذف الغرفة
      const deleted = await storage.deleteRoom(roomId, userId);
      
      if (deleted) {
        // إشعار جميع المستخدمين
        await roomManager.broadcastToAll('roomDeleted', { roomId });
        
        res.json({ message: 'تم حذف الغرفة بنجاح' });
        console.log(`🗑️ حذف الغرفة ${roomId} من المستخدم ${userId}`);
      } else {
        res.status(404).json({ error: 'الغرفة غير موجودة أو لا يمكن حذفها' });
      }

    } catch (error) {
      errorHandler.handleError(error as Error, 'deleteRoom');
      res.status(500).json({ error: 'خطأ في حذف الغرفة' });
    }
  });

  // إرسال رسالة مع فحص الحدود
  app.post('/api/messages', async (req, res) => {
    try {
      const { content, senderId, roomId, type } = req.body;

      if (!senderId || !content) {
        return res.status(400).json({ error: 'بيانات الرسالة غير مكتملة' });
      }

      // فحص حدود الرسائل
      const rateLimitCheck = rateLimiter.checkLimit(senderId, 'message');
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ 
          error: 'تم تجاوز حد الرسائل',
          resetTime: rateLimitCheck.resetTime,
          remaining: rateLimitCheck.remaining
        });
      }

      // تحديث نشاط المستخدم
      enhancedUserManager.updateUserActivity(senderId);

      // إنشاء الرسالة
      const message = await storage.createMessage({
        content: content,
        senderId: senderId,
        roomId: roomId || 'general',
        type: type || 'text'
      });

      if (message) {
        // الحصول على بيانات المرسل
        const sender = await storage.getUser(senderId);
        
        const messageData = {
          ...message,
          sender: { username: sender?.username || 'مستخدم' }
        };

        // إرسال للغرفة المناسبة
        if (roomId && roomId !== 'general') {
          await roomManager.broadcastToRoom(roomId, 'newMessage', messageData);
        } else {
          await roomManager.broadcastToAll('newMessage', messageData);
        }

        res.json({ message: messageData });
        console.log(`💬 رسالة جديدة من ${sender?.username} في ${roomId || 'general'}`);
      } else {
        res.status(500).json({ error: 'فشل في إرسال الرسالة' });
      }

    } catch (error) {
      errorHandler.handleError(error as Error, 'sendMessage');
      res.status(500).json({ error: 'خطأ في إرسال الرسالة' });
    }
  });

  // جلب رسائل الغرفة مع تخزين مؤقت
  app.get('/api/rooms/:roomId/messages', async (req, res) => {
    try {
      const { roomId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // استخدام التخزين المؤقت
      const cacheKey = `room_messages_${roomId}_${limit}_${offset}`;
      
      const messages = await performanceOptimizer.getOrSet(
        cacheKey,
        async () => {
          return await storage.getRoomMessages(roomId, limit, offset);
        },
        60000 // دقيقة واحدة
      );

      res.json({ messages });
    } catch (error) {
      errorHandler.handleError(error as Error, 'getRoomMessages');
      res.status(500).json({ error: 'خطأ في جلب الرسائل' });
    }
  });

  // جلب قائمة الغرف مع معلومات المستخدمين
  app.get('/api/rooms', async (req, res) => {
    try {
      const cacheKey = 'all_rooms_with_users';
      
      const roomsData = await performanceOptimizer.getOrSet(
        cacheKey,
        async () => {
          const rooms = await storage.getAllRooms();
          
          // إضافة معلومات المستخدمين لكل غرفة
          const roomsWithUsers = await Promise.all(
            rooms.map(async (room) => {
              const roomInfo = roomManager.getRoomInfo(room.id);
              return {
                ...room,
                userCount: roomInfo.userCount,
                onlineUsers: roomInfo.users
              };
            })
          );
          
          return roomsWithUsers;
        },
        30000 // 30 ثانية
      );

      res.json({ rooms: roomsData });
    } catch (error) {
      errorHandler.handleError(error as Error, 'getAllRooms');
      res.status(500).json({ error: 'خطأ في جلب الغرف' });
    }
  });

  // طرد مستخدم من الغرفة
  app.post('/api/rooms/:roomId/kick/:targetUserId', async (req, res) => {
    try {
      const { roomId, targetUserId } = req.params;
      const { moderatorId } = req.body;

      if (!moderatorId) {
        return res.status(400).json({ error: 'معرف المشرف مطلوب' });
      }

      // فحص صلاحيات المشرف
      if (!enhancedUserManager.checkPermission(moderatorId, 'canKickUsers')) {
        return res.status(403).json({ error: 'ليس لديك صلاحية طرد المستخدمين' });
      }

      // طرد المستخدم
      const success = await storage.removeUserFromRoom(parseInt(targetUserId), roomId);
      
      if (success) {
        // إشعار الغرفة
        await roomManager.broadcastToRoom(roomId, 'userKicked', {
          userId: parseInt(targetUserId),
          roomId: roomId,
          moderatorId: moderatorId
        });

        res.json({ message: 'تم طرد المستخدم بنجاح' });
        console.log(`👢 طرد المستخدم ${targetUserId} من الغرفة ${roomId}`);
      } else {
        res.status(400).json({ error: 'فشل في طرد المستخدم' });
      }

    } catch (error) {
      errorHandler.handleError(error as Error, 'kickUser');
      res.status(500).json({ error: 'خطأ في طرد المستخدم' });
    }
  });

  // endpoint للتنظيف اليدوي (للمطورين)
  app.post('/api/system/cleanup', async (req, res) => {
    try {
      const { adminId } = req.body;

      if (!adminId || !enhancedUserManager.checkPermission(adminId, 'canViewAdminPanel')) {
        return res.status(403).json({ error: 'صلاحيات غير كافية' });
      }

      // تشغيل عملية تنظيف شاملة
      performanceOptimizer.addBatchOperation(async () => {
        console.log('🧹 بدء التنظيف اليدوي...');
        // تنظيف المستخدمين غير النشطين
        // تنظيف الرسائل القديمة
        // تنظيف الجلسات المنتهية
      });

      res.json({ message: 'تم بدء عملية التنظيف' });
    } catch (error) {
      errorHandler.handleError(error as Error, 'manualCleanup');
      res.status(500).json({ error: 'خطأ في التنظيف' });
    }
  });

  // إعداد middleware للتنظيف عند إغلاق الخادم
  process.on('SIGTERM', () => {
    console.log('🛑 إيقاف الخادم...');
    
    // تنظيف الموارد
    roomManager.destroy();
    enhancedUserManager.destroy();
    performanceOptimizer.destroy();
    
    httpServer.close(() => {
      console.log('✅ تم إيقاف الخادم بنجاح');
      process.exit(0);
    });
  });

  console.log('🚀 تم إعداد النظام المحسّن بنجاح');
  
  return httpServer;
}

// معالج أخطاء عام للـ routes
export function setupErrorHandling(app: Express) {
  // معالج الأخطاء العام
  app.use((error: any, req: any, res: any, next: any) => {
    errorHandler.handleError(error, `route_${req.method}_${req.path}`);
    
    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      error: 'خطأ في الخادم',
      message: process.env.NODE_ENV === 'development' ? error.message : 'حدث خطأ غير متوقع'
    });
  });

  // معالج 404
  app.use((req, res) => {
    res.status(404).json({
      error: 'الصفحة غير موجودة',
      path: req.path
    });
  });
}