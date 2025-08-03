import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as IOServer, Socket } from "socket.io";
import { storage } from "./storage";
import { setupDownloadRoute } from "./download-route";
import { insertUserSchema, insertMessageSchema } from "../shared/schema";
import { spamProtection } from "./spam-protection";
import { moderationSystem } from "./moderation";
import { sanitizeInput, validateMessageContent, checkIPSecurity, authLimiter, messageLimiter, friendRequestLimiter } from "./security";
import { databaseCleanup } from "./utils/database-cleanup";

import { advancedSecurity, advancedSecurityMiddleware } from "./advanced-security";
import securityApiRoutes from "./api-security";
import apiRoutes from "./routes/index";
import { pointsService } from "./services/pointsService";
import { developmentOnly, logDevelopmentEndpoint } from "./middleware/development";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import sharp from "sharp";

// إعداد multer لرفع الصور
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'client', 'public', 'uploads', 'profiles');
    
    // التأكد من وجود المجلد
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage_multer,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1 // ملف واحد فقط
  },
  fileFilter: (req, file, cb) => {
    // التحقق من نوع الملف - دعم شامل للصور
    const allowedMimes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.log('❌ نوع ملف مرفوض:', file.mimetype);
      cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}. الأنواع المدعومة: JPG, PNG, GIF, WebP, SVG`));
    }
  }
});

// إعداد multer لرفع صور الحوائط
const wallStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'client', 'public', 'uploads', 'wall');
    
    // التأكد من وجود المجلد
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `wall-${uniqueSuffix}${ext}`);
  }
});

const wallUpload = multer({
  storage: wallStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // التحقق من نوع الملف - دعم شامل للصور
    const allowedMimes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.log('❌ نوع ملف مرفوض:', file.mimetype);
      cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}. الأنواع المدعومة: JPG, PNG, GIF, WebP, SVG`));
    }
  }
});

// إعداد multer لرفع صور البانر
const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'client', 'public', 'uploads', 'banners');
    
    // التأكد من وجود المجلد
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `banner-${uniqueSuffix}${ext}`);
  }
});

const bannerUpload = multer({
  storage: bannerStorage,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // التحقق من نوع الملف - دعم شامل للصور
    const allowedMimes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.log('❌ نوع ملف مرفوض:', file.mimetype);
      cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}. الأنواع المدعومة: JPG, PNG, GIF, WebP, SVG`));
    }
  }
});

// تعريف نوع Socket المخصص
interface CustomSocket extends Socket {
  userId?: number;
  username?: string;
  userType?: string;
  isAuthenticated?: boolean;
}

// دالة البث للجميع
function broadcast(message: any) {
  if (io) {
    io.emit('message', message);
  }
}

// خدمات المصادقة والرسائل والأصدقاء
const authService = new (class AuthService {
  async login(username: string, password: string) {
    const user = await storage.getUserByUsername(username);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password || '');
    if (!isValid) return null;
    
    return user;
  }

  async register(userData: any) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    return await storage.createUser({ ...userData, password: hashedPassword });
  }
})();

const messageService = new (class MessageService {
  async sendMessage(senderId: number, messageData: any) {
    return await storage.createMessage({
      senderId,
      receiverId: messageData.receiverId,
      content: messageData.content,
      messageType: messageData.messageType || 'text',
      isPrivate: messageData.isPrivate || false,
      roomId: messageData.roomId || 'general'
    });
  }
})();

const friendService = new (class FriendService {
  async sendFriendRequest(senderId: number, receiverId: number) {
    return await storage.createFriendRequest(senderId, receiverId);
  }
})();

// متغيرات عامة
let io: IOServer | null = null;
const connectedUsers = new Map<number, CustomSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // إعداد Socket.IO
  io = new IOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
  });

  // إعداد Socket.IO events
  io.on('connection', (socket: CustomSocket) => {
    console.log('🔌 New socket connection:', socket.id);

    // مصادقة المستخدم
    socket.on('auth', async (data: { userId: number; username: string; userType: string }) => {
      try {
        const user = await storage.getUser(data.userId);
        if (user) {
          socket.userId = data.userId;
          socket.username = data.username;
          socket.userType = data.userType;
          socket.isAuthenticated = true;
          
          // تحديث حالة الاتصال
          await storage.setUserOnlineStatus(data.userId, true);
          connectedUsers.set(data.userId, socket);
          
          // إضافة نقاط تسجيل الدخول اليومي
          await pointsService.addDailyLoginPoints(data.userId);
          
          // إشعار المستخدمين الآخرين
          socket.broadcast.emit('userJoined', {
            user: {
              id: user.id,
              username: user.username,
              userType: user.userType,
              profileImage: user.profileImage,
              isOnline: true
            }
          });
          
          socket.emit('authSuccess', { user });
        }
      } catch (error) {
        console.error('خطأ في مصادقة Socket:', error);
        socket.emit('authError', { error: 'فشل في المصادقة' });
      }
    });

    // إرسال رسالة عامة
    socket.on('publicMessage', async (data: { content: string; messageType?: string }) => {
      if (!socket.isAuthenticated || !socket.userId) {
        socket.emit('error', { message: 'يجب تسجيل الدخول أولاً' });
        return;
      }

      try {
        // فحص السبام
        const spamCheck = spamProtection.checkMessage(socket.userId, data.content);
        if (!spamCheck.isAllowed) {
          socket.emit('error', { message: spamCheck.reason });
          return;
        }

        // إنشاء الرسالة
        const message = await messageService.sendMessage(socket.userId, {
          content: sanitizeInput(data.content),
          messageType: data.messageType || 'text',
          isPrivate: false,
          roomId: 'general'
        });

        // إضافة نقاط للرسالة
        await pointsService.addMessagePoints(socket.userId);

        // بث الرسالة للجميع
        io?.emit('newMessage', {
          message: {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            timestamp: message.timestamp,
            messageType: message.messageType
          }
        });
      } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
        socket.emit('error', { message: 'فشل في إرسال الرسالة' });
      }
    });

    // إرسال رسالة خاصة
    socket.on('privateMessage', async (data: { receiverId: number; content: string; messageType?: string }) => {
      if (!socket.isAuthenticated || !socket.userId) {
        socket.emit('error', { message: 'يجب تسجيل الدخول أولاً' });
        return;
      }

      try {
        const message = await messageService.sendMessage(socket.userId, {
          receiverId: data.receiverId,
          content: sanitizeInput(data.content),
          messageType: data.messageType || 'text',
          isPrivate: true
        });

        // إرسال الرسالة للمستقبل إذا كان متصل
        const receiverSocket = connectedUsers.get(data.receiverId);
        if (receiverSocket) {
          receiverSocket.emit('privateMessage', {
            message: {
              id: message.id,
              content: message.content,
              senderId: message.senderId,
              timestamp: message.timestamp,
              messageType: message.messageType
            }
          });
        }

        socket.emit('messageSent', { success: true });
      } catch (error) {
        console.error('خطأ في إرسال الرسالة الخاصة:', error);
        socket.emit('error', { message: 'فشل في إرسال الرسالة الخاصة' });
      }
    });

    // طلب صداقة
    socket.on('friendRequest', async (data: { receiverId: number }) => {
      if (!socket.isAuthenticated || !socket.userId) {
        socket.emit('error', { message: 'يجب تسجيل الدخول أولاً' });
        return;
      }

      try {
        const request = await friendService.sendFriendRequest(socket.userId, data.receiverId);
        
        // إشعار المستقبل
        const receiverSocket = connectedUsers.get(data.receiverId);
        if (receiverSocket) {
          receiverSocket.emit('friendRequest', {
            senderId: socket.userId,
            senderUsername: socket.username
          });
        }

        socket.emit('friendRequestSent', { success: true });
      } catch (error) {
        console.error('خطأ في إرسال طلب الصداقة:', error);
        socket.emit('error', { message: 'فشل في إرسال طلب الصداقة' });
      }
    });

    // قطع الاتصال
    socket.on('disconnect', async () => {
      console.log('🔌 Socket disconnected:', socket.id);
      
      if (socket.userId) {
        // تحديث حالة الاتصال
        await storage.setUserOnlineStatus(socket.userId, false);
        connectedUsers.delete(socket.userId);
        
        // إشعار المستخدمين الآخرين
        socket.broadcast.emit('userLeft', {
          userId: socket.userId,
          username: socket.username
        });
      }
    });
  });

  // إعداد API routes
  app.use('/api', apiRoutes);
  app.use('/api/security', securityApiRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // إعداد routes رفع الصور
  app.post('/api/upload/profile-image', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
      }

      const userId = parseInt(req.body.userId);
      if (!userId) {
        return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
      }

      // تحويل الصورة إلى base64 للتوافق مع Render
      const fileBuffer = fs.readFileSync(req.file.path);
      const base64Image = fileBuffer.toString('base64');
      const mimeType = req.file.mimetype;
      const imageUrl = `data:${mimeType};base64,${base64Image}`;

      // تحديث صورة المستخدم
      await storage.updateUser(userId, { profileImage: imageUrl });

      // حذف الملف المؤقت
      fs.unlinkSync(req.file.path);

      res.json({ 
        success: true, 
        imageUrl,
        message: 'تم رفع الصورة بنجاح' 
      });
    } catch (error) {
      console.error('خطأ في رفع صورة البروفايل:', error);
      res.status(500).json({ error: 'فشل في رفع الصورة' });
    }
  });

  app.post('/api/upload/wall-image', wallUpload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
      }

      const userId = parseInt(req.body.userId);
      if (!userId) {
        return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
      }

      // تحويل الصورة إلى base64
      const fileBuffer = fs.readFileSync(req.file.path);
      const base64Image = fileBuffer.toString('base64');
      const mimeType = req.file.mimetype;
      const imageUrl = `data:${mimeType};base64,${base64Image}`;

      // حذف الملف المؤقت
      fs.unlinkSync(req.file.path);

      res.json({ 
        success: true, 
        imageUrl,
        message: 'تم رفع الصورة بنجاح' 
      });
    } catch (error) {
      console.error('خطأ في رفع صورة الحائط:', error);
      res.status(500).json({ error: 'فشل في رفع الصورة' });
    }
  });

  // إعداد download route
  setupDownloadRoute(app);

  // إعداد التنظيف الدوري
  const cleanupInterval = setInterval(async () => {
    try {
      await databaseCleanup.performFullCleanup();
    } catch (error) {
      console.error('خطأ في التنظيف الدوري:', error);
    }
  }, 6 * 60 * 60 * 1000); // كل 6 ساعات

  // تنظيف عند إغلاق الخادم
  process.on('SIGTERM', () => {
    clearInterval(cleanupInterval);
  });

  return httpServer;
}
