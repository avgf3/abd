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

// إضافة نظام إدارة محسّن للمستخدمين والغرف
class EnhancedSystemManager {
  private connectedUsers = new Map<number, any>();
  private roomUsers = new Map<string, Set<number>>();
  private userRooms = new Map<number, string>();
  private errorCounts = new Map<string, number>();
  private caches = new Map<string, any>();
  private io: IOServer;

  constructor(io: IOServer) {
    this.io = io;
    this.setupCleanupSchedules();
    this.setupPerformanceMonitoring();
  }

  // إعداد جداول التنظيف
  private setupCleanupSchedules() {
    // تنظيف المستخدمين المنقطعين كل 30 ثانية
    setInterval(() => {
      this.cleanupDisconnectedUsers();
    }, 30000);

    // تنظيف قاعدة البيانات كل 10 دقائق
    setInterval(async () => {
      try {
        await databaseCleanup.performComprehensiveCleanup();
        console.log('🧹 تم تنظيف قاعدة البيانات');
      } catch (error) {
        console.error('❌ خطأ في تنظيف قاعدة البيانات:', error);
      }
    }, 600000);

    // تنظيف التخزين المؤقت كل 5 دقائق
    setInterval(() => {
      this.cleanupExpiredCaches();
    }, 300000);
  }

  // مراقبة الأداء
  private setupPerformanceMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
        console.log(`🧠 تحذير: استخدام ذاكرة عالي ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
        this.cleanupExpiredCaches();
      }
    }, 60000);
  }

  // إضافة مستخدم
  addUser(userId: number, socketId: string, username: string, roomId?: string) {
    this.connectedUsers.set(userId, {
      userId,
      socketId,
      username,
      lastSeen: Date.now(),
      isOnline: true,
      currentRoom: roomId
    });

    if (roomId) {
      this.addUserToRoom(userId, roomId);
    }

    console.log(`✅ المستخدم ${username} (${userId}) متصل`);
  }

  // إزالة مستخدم
  removeUser(userId: number) {
    const user = this.connectedUsers.get(userId);
    if (user) {
      if (user.currentRoom) {
        this.removeUserFromRoom(userId, user.currentRoom);
      }
      this.connectedUsers.delete(userId);
      this.userRooms.delete(userId);
      storage.setUserOnlineStatus(userId, false).catch(console.error);
      console.log(`🚪 المستخدم ${user.username} (${userId}) غادر`);
    }
  }

  // إضافة للغرفة
  addUserToRoom(userId: number, roomId: string) {
    const currentRoom = this.userRooms.get(userId);
    if (currentRoom && currentRoom !== roomId) {
      this.removeUserFromRoom(userId, currentRoom);
    }

    if (!this.roomUsers.has(roomId)) {
      this.roomUsers.set(roomId, new Set());
    }
    
    this.roomUsers.get(roomId)!.add(userId);
    this.userRooms.set(userId, roomId);

    const user = this.connectedUsers.get(userId);
    if (user) {
      user.currentRoom = roomId;
    }
  }

  // إزالة من الغرفة
  removeUserFromRoom(userId: number, roomId: string) {
    const roomUserSet = this.roomUsers.get(roomId);
    if (roomUserSet) {
      roomUserSet.delete(userId);
      if (roomUserSet.size === 0) {
        this.roomUsers.delete(roomId);
      }
    }
    this.userRooms.delete(userId);
  }

  // الحصول على مستخدمي الغرفة
  getRoomUsers(roomId: string) {
    const userIds = this.roomUsers.get(roomId) || new Set();
    const users: any[] = [];
    for (const userId of userIds) {
      const user = this.connectedUsers.get(userId);
      if (user && user.isOnline) {
        users.push(user);
      }
    }
    return users;
  }

  // الحصول على المستخدمين المتصلين
  getOnlineUsers() {
    return Array.from(this.connectedUsers.values()).filter(user => user.isOnline);
  }

  // تحديث نشاط المستخدم
  updateUserActivity(userId: number) {
    const user = this.connectedUsers.get(userId);
    if (user) {
      user.lastSeen = Date.now();
      user.isOnline = true;
    }
  }

  // تنظيف المستخدمين المنقطعين
  private cleanupDisconnectedUsers() {
    const now = Date.now();
    const threshold = 300000; // 5 دقائق

    for (const [userId, user] of this.connectedUsers.entries()) {
      if (now - user.lastSeen > threshold) {
        console.log(`🧹 تنظيف المستخدم المنقطع: ${user.username}`);
        this.removeUser(userId);
      }
    }
  }

  // تنظيف التخزين المؤقت
  private cleanupExpiredCaches() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.caches.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.caches.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🗑️ تم تنظيف ${cleaned} عنصر من التخزين المؤقت`);
    }
  }

  // التخزين المؤقت الذكي
  async getOrSet<T>(key: string, getter: () => Promise<T>, ttl: number = 300000): Promise<T> {
    const cached = this.caches.get(key);
    const now = Date.now();

    if (cached && now < cached.expiresAt) {
      return cached.data as T;
    }

    try {
      const data = await getter();
      this.caches.set(key, {
        data,
        expiresAt: now + ttl
      });
      return data;
    } catch (error) {
      console.error(`خطأ في التخزين المؤقت ${key}:`, error);
      throw error;
    }
  }

  // معالجة الأخطاء المحسّنة
  handleError(error: Error, context: string, socket?: any) {
    const errorKey = `${context}:${error.message}`;
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);

    if (count >= 5) {
      console.error(`🚨 خطأ متكرر في ${context} (${count + 1} مرة):`, error.message);
      if (socket) {
        socket.emit('systemError', {
          message: 'حدث خطأ تقني، يرجى إعادة المحاولة',
          context: context
        });
      }
    } else {
      console.error(`❌ خطأ في ${context}:`, error.message);
    }
  }

  // إرسال للغرفة
  broadcastToRoom(roomId: string, event: string, data: any) {
    this.io.to(`room_${roomId}`).emit(event, data);
  }

  // إرسال للجميع
  broadcastToAll(event: string, data: any) {
    this.io.emit(event, data);
  }

  // إحصائيات النظام
  getSystemStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      activeRooms: this.roomUsers.size,
      cacheEntries: this.caches.size,
      memory: process.memoryUsage()
    };
  }
}

// Rate Limiting محسّن
class RateLimiter {
  private requests = new Map<string, number[]>();
  private limits = new Map<string, any>();

  constructor() {
    this.setLimit('message', { max: 30, window: 60000 });
    this.setLimit('auth', { max: 5, window: 300000 });
    this.setLimit('room', { max: 10, window: 60000 });
  }

  setLimit(operation: string, limit: { max: number; window: number }) {
    this.limits.set(operation, limit);
  }

  checkLimit(userId: number, operation: string): { allowed: boolean; remaining: number; resetTime?: number } {
    const key = `${userId}:${operation}`;
    const limit = this.limits.get(operation);
    
    if (!limit) {
      return { allowed: true, remaining: Infinity };
    }

    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    const validRequests = requests.filter(time => now - time < limit.window);
    
    if (validRequests.length >= limit.max) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.min(...validRequests) + limit.window
      };
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);

    return {
      allowed: true,
      remaining: limit.max - validRequests.length
    };
  }
}

// إعداد multer لرفع الصور (محفوظ من النظام الأصلي)
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'client', 'public', 'uploads', 'profiles');
    
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
    files: 1
  },
  fileFilter: (req, file, cb) => {
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
      cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}`));
    }
  }
});

// إعداد multer للحوائط
const wallStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'client', 'public', 'uploads', 'wall');
    
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
      cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}`));
    }
  }
});

// إعداد multer للبانر
const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'client', 'public', 'uploads', 'banners');
    
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
      cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}`));
    }
  }
});

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  
  // إعداد Socket.IO محسّن
  const io = new IOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6,
    transports: ['websocket', 'polling']
  });

  // إنشاء النظام المحسّن
  const systemManager = new EnhancedSystemManager(io);
  const rateLimiter = new RateLimiter();

  // إعداد معالجة الأخطاء العامة
  process.on('uncaughtException', (error) => {
    systemManager.handleError(error, 'uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    systemManager.handleError(new Error(String(reason)), 'unhandledRejection');
  });

  // إعداد API routes محسّنة
  setupEnhancedAPIRoutes(app, systemManager, rateLimiter);

  // معالجة Socket.IO محسّنة
  io.on('connection', (socket: any) => {
    console.log(`🔌 Socket connected: ${socket.id}`);
    
    let isAuthenticated = false;
    let heartbeatInterval: NodeJS.Timeout | null = null;
    
    // دالة تنظيف الموارد
    const cleanup = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };
    
    // heartbeat للحفاظ على الاتصال
    const startHeartbeat = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      
      heartbeatInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit('ping', { timestamp: Date.now() });
        } else {
          cleanup();
        }
      }, 25000);
    };

    // معالج المصادقة محسّن
    socket.on('auth', async (userData: { userId?: number; username?: string; userType?: string }) => {
      try {
        if (!userData.userId) {
          socket.emit('error', { message: 'بيانات المصادقة غير مكتملة' });
          return;
        }

        const user = await storage.getUser(userData.userId);
        if (!user) {
          socket.emit('error', { message: 'المستخدم غير موجود' });
          return;
        }

        // إضافة المستخدم للنظام المحسّن
        systemManager.addUser(user.id, socket.id, user.username);
        
        socket.userId = user.id;
        socket.username = user.username;
        socket.userType = user.userType;
        isAuthenticated = true;

        await storage.setUserOnlineStatus(user.id, true);

        socket.emit('authenticated', { 
          message: 'تم الاتصال بنجاح',
          user: user 
        });

        // بدء heartbeat
        startHeartbeat();

        console.log(`✅ تمت مصادقة المستخدم: ${user.username} (${user.userType})`);

      } catch (error) {
        systemManager.handleError(error as Error, 'auth', socket);
      }
    });

    // إرسال رسالة عامة
    socket.on('publicMessage', async (data) => {
      try {
        if (!socket.userId || !isAuthenticated) return;
        
        // فحص rate limiting
        const rateCheck = rateLimiter.checkLimit(socket.userId, 'message');
        if (!rateCheck.allowed) {
          socket.emit('error', { 
            message: `تم تجاوز الحد الأقصى للرسائل. حاول مرة أخرى خلال ${Math.ceil((rateCheck.resetTime! - Date.now()) / 60000)} دقيقة`,
            resetTime: rateCheck.resetTime
          });
          return;
        }

        const user = await storage.getUser(socket.userId);
        if (!user) {
          socket.emit('error', { message: 'المستخدم غير موجود' });
          return;
        }

        if (user.isBanned || user.isMuted) {
          socket.emit('error', { 
            message: user.isBanned ? 'أنت محظور' : 'أنت مكتوم' 
          });
          return;
        }

        const roomId = data.roomId || 'general';
        
        const newMessage = await storage.createMessage({
          senderId: socket.userId,
          content: data.content.trim(),
          messageType: data.messageType || 'text',
          isPrivate: false,
          roomId: roomId,
        });

        // تحديث نشاط المستخدم
        systemManager.updateUserActivity(socket.userId);

        // إرسال الرسالة للغرفة
        systemManager.broadcastToRoom(roomId, 'message', { 
          envelope: {
            type: 'newMessage',
            message: { ...newMessage, sender: user, roomId }
          }
        });

      } catch (error) {
        systemManager.handleError(error as Error, 'publicMessage', socket);
      }
    });

    // إرسال رسالة خاصة
    socket.on('privateMessage', async (data) => {
      try {
        if (!socket.userId || !isAuthenticated) return;
        
        const { receiverId, content, messageType = 'text' } = data;
        
        const receiver = await storage.getUser(receiverId);
        if (!receiver) {
          socket.emit('error', { message: 'المستقبل غير موجود' });
          return;
        }
        
        const newMessage = await storage.createMessage({
          senderId: socket.userId,
          receiverId: receiverId,
          content: content.trim(),
          messageType,
          isPrivate: true
        });
        
        const sender = await storage.getUser(socket.userId);
        const messageWithSender = { ...newMessage, sender };
        
        // إرسال للمستقبل والمرسل
        io.to(receiverId.toString()).emit('message', {
          envelope: {
            type: 'privateMessage',
            message: messageWithSender
          }
        });
        
        socket.emit('message', {
          envelope: {
            type: 'privateMessage',
            message: messageWithSender
          }
        });
        
      } catch (error) {
        systemManager.handleError(error as Error, 'privateMessage', socket);
      }
    });

    // انضمام للغرفة
    socket.on('joinRoom', async (data) => {
      try {
        const { roomId } = data;
        const userId = socket.userId;
        
        if (!userId || !isAuthenticated) {
          socket.emit('error', { message: 'يجب تسجيل الدخول أولاً' });
          return;
        }

        // إضافة للغرفة في النظام المحسّن
        systemManager.addUserToRoom(userId, roomId);
        
        // انضمام في Socket.IO
        socket.join(`room_${roomId}`);
        
        // حفظ في قاعدة البيانات
        await storage.joinRoom(userId, roomId);
        
        const roomUsers = systemManager.getRoomUsers(roomId);
        
        socket.emit('message', {
          type: 'roomJoined',
          roomId: roomId,
          users: roomUsers
        });
        
        // إشعار باقي المستخدمين
        socket.to(`room_${roomId}`).emit('message', {
          type: 'userJoinedRoom',
          username: socket.username,
          userId: userId,
          roomId: roomId
        });

        console.log(`✅ المستخدم ${socket.username} انضم للغرفة ${roomId}`);
        
      } catch (error) {
        systemManager.handleError(error as Error, 'joinRoom', socket);
      }
    });

    // مغادرة الغرفة
    socket.on('leaveRoom', async (data) => {
      try {
        const { roomId } = data;
        const userId = socket.userId;
        
        if (!userId || !isAuthenticated) return;

        // إزالة من الغرفة في النظام المحسّن
        systemManager.removeUserFromRoom(userId, roomId);
        
        // مغادرة في Socket.IO
        socket.leave(`room_${roomId}`);
        
        // حذف من قاعدة البيانات
        await storage.leaveRoom(userId, roomId);
        
        socket.emit('message', {
          type: 'roomLeft',
          roomId: roomId
        });
        
        // إشعار باقي المستخدمين
        socket.to(`room_${roomId}`).emit('message', {
          type: 'userLeftRoom',
          username: socket.username,
          userId: userId,
          roomId: roomId
        });
        
      } catch (error) {
        systemManager.handleError(error as Error, 'leaveRoom', socket);
      }
    });

    // معالج الكتابة
    socket.on('typing', (data) => {
      const { isTyping, roomId } = data;
      if (socket.userId && isAuthenticated) {
        const targetRoom = roomId ? `room_${roomId}` : null;
        const emitTarget = targetRoom ? socket.to(targetRoom) : socket.broadcast;
        
        emitTarget.emit('message', {
          type: 'typing',
          username: socket.username,
          userId: socket.userId,
          isTyping,
          roomId
        });
      }
    });

    // طلب قائمة المستخدمين المتصلين
    socket.on('requestOnlineUsers', async () => {
      try {
        if (!isAuthenticated) return;

        const onlineUsers = systemManager.getOnlineUsers();
        socket.emit('message', { 
          type: 'onlineUsers', 
          users: onlineUsers 
        });
      } catch (error) {
        systemManager.handleError(error as Error, 'requestOnlineUsers', socket);
      }
    });

    // معالج قطع الاتصال
    socket.on('disconnect', async (reason) => {
      cleanup();
      
      if (socket.userId && isAuthenticated) {
        try {
          // إزالة المستخدم من النظام المحسّن
          systemManager.removeUser(socket.userId);
          
          // تحديث قاعدة البيانات
          await storage.setUserOnlineStatus(socket.userId, false);
          
          // إشعار المستخدمين الآخرين
          io.emit('message', {
            type: 'userLeft',
            userId: socket.userId,
            username: socket.username,
            timestamp: new Date().toISOString()
          });
          
          console.log(`🚪 المستخدم ${socket.username} (${socket.userId}) غادر`);
          
        } catch (error) {
          console.error(`❌ خطأ في تنظيف جلسة ${socket.username}:`, error);
        }
      }
    });

    // معالج الأخطاء
    socket.on('error', (error) => {
      console.error(`❌ خطأ Socket.IO للمستخدم ${socket.username || socket.id}:`, error);
      cleanup();
    });

    // معالج pong للheartbeat
    socket.on('pong', () => {
      if (socket.userId && isAuthenticated) {
        systemManager.updateUserActivity(socket.userId);
      }
    });
  });

  return httpServer;
}

// دالة إعداد API routes المحسّنة
function setupEnhancedAPIRoutes(app: Express, systemManager: EnhancedSystemManager, rateLimiter: RateLimiter) {
  
  // صحة النظام
  app.get('/api/health', (req, res) => {
    const stats = systemManager.getSystemStats();
    res.json({ 
      status: 'ok', 
      timestamp: new Date(),
      ...stats
    });
  });

  // إحصائيات النظام للإدارة
  app.get('/api/system/stats', async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(401).json({ error: 'غير مسموح' });
      }
      
      const user = await storage.getUser(parseInt(userId as string));
      if (!user || !['admin', 'owner'].includes(user.userType)) {
        return res.status(403).json({ error: 'غير مسموح - للإدارة فقط' });
      }
      
      const stats = systemManager.getSystemStats();
      const onlineUsers = systemManager.getOnlineUsers();
      
      res.json({
        ...stats,
        onlineUsers: onlineUsers.length,
        usersList: onlineUsers
      });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // تنظيف النظام (للإدارة)
  app.post('/api/system/cleanup', async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: 'غير مسموح' });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'owner') {
        return res.status(403).json({ error: 'غير مسموح - للمالك فقط' });
      }
      
      // تنظيف قاعدة البيانات
      await databaseCleanup.performComprehensiveCleanup();
      
      res.json({ 
        message: 'تم تنظيف النظام بنجاح',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // رفع صورة البروفايل
  app.post('/api/upload/profile-image', upload.single('profileImage'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "لم يتم رفع أي ملف" });
      }

      const userId = parseInt(req.body.userId);
      if (!userId || isNaN(userId)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
        return res.status(400).json({ error: "معرف المستخدم مطلوب ويجب أن يكون رقم صحيح" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      // تحويل الصورة إلى base64
      let imageUrl: string;
      
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const base64Image = fileBuffer.toString('base64');
        const mimeType = req.file.mimetype;
        
        imageUrl = `data:${mimeType};base64,${base64Image}`;
        
        fs.unlinkSync(req.file.path);
        
      } catch (fileError) {
        console.error('❌ خطأ في معالجة الملف:', fileError);
        imageUrl = `/uploads/profiles/${req.file.filename}`;
      }
      
      const updatedUser = await storage.updateUser(userId, { profileImage: imageUrl });
      
      if (!updatedUser) {
        return res.status(500).json({ error: "فشل في تحديث صورة البروفايل" });
      }

      // تحديث في النظام المحسّن
      systemManager.updateUserActivity(userId);

      res.json({
        success: true,
        message: "تم رفع الصورة بنجاح",
        imageUrl: imageUrl,
        user: updatedUser
      });

    } catch (error) {
      console.error('❌ خطأ في رفع صورة البروفايل:', error);
      
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
      }

      res.status(500).json({ 
        error: "خطأ في رفع الصورة",
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  });

  // إعدادات إضافية للشبكة الموثوقة
  setupDownloadRoute(app);
}
}
