import fs from 'fs';
import { promises as fsp } from 'fs';
import { createServer, type Server } from 'http';
import path from 'path';
// removed chunked upload crypto import per user request

import roomRoutes from './routes/rooms';
import messageRoutes from './routes/messages';
import storiesRoutes from './routes/stories';
import voiceRoutes from './routes/voice';
import { pointsService } from './services/pointsService';
import { roomService } from './services/roomService';
import { roomMessageService } from './services/roomMessageService';
import { friendService } from './services/friendService';
import { developmentOnly, logDevelopmentEndpoint } from './middleware/development';
import { sanitizeUserData, sanitizeUsersArray } from './utils/data-sanitizer';

import bcrypt from 'bcrypt';
import type { Express } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

// import { trackClick } from "./middleware/analytics"; // commented out as file doesn't exist
import { DEFAULT_LEVELS, recalculateUserStats } from '../shared/points-system';
import { insertUserSchema } from '../shared/schema';
import { advancedSecurity, advancedSecurityMiddleware } from './advanced-security';
import securityApiRoutes from './api-security';

import { db, dbType } from './database-adapter';
import { protect } from './middleware/enhancedSecurity';
import { requireUser, requireBotOperation, validateEntityType, validateEntityIdParam } from './middleware/entityValidation';
import { parseEntityId, formatEntityId } from './types/entities';
import { moderationSystem } from './moderation';
import { getIO } from './realtime';
import { emitOnlineUsersForRoom } from './realtime';
import { getUserActiveRooms } from './realtime';
import { formatRoomEventMessage } from './utils/roomEventFormatter';
import { spamProtection } from './spam-protection';
import { storage } from './storage';
import { databaseCleanup } from './utils/database-cleanup';
import { getClientIpFromHeaders, getDeviceIdFromHeaders } from './utils/device';
import { limiters, SecurityConfig } from './security';
import { updateConnectedUserCache } from './realtime';

import {
  sanitizeInput,
  validateMessageContent,
  checkIPSecurity,
} from './security';
import { databaseService } from './services/databaseService';
import { notificationService } from './services/notificationService';
import { issueAuthToken, getAuthTokenFromRequest, verifyAuthToken } from './utils/auth-token';
import { setupDownloadRoute } from './download-route';
import { setupCompleteDownload } from './download-complete';
import { socketPerformanceMonitor } from './utils/socket-performance';
import { getUserListOptimizer } from './utils/user-list-optimizer';

// إعداد multer موحد لرفع الصور
const createMulterConfig = (
  destination: string,
  prefix: string,
  maxSize: number = 5 * 1024 * 1024
) => {
  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        const uploadDir = path.join(process.cwd(), 'client', 'public', 'uploads', destination);
        
        // إنشاء المجلد بشكل آمن
        await fsp.mkdir(uploadDir, { recursive: true }).catch(() => {});
        
        // التحقق من وجود المجلد
        const exists = await fsp.stat(uploadDir).then(() => true).catch(() => false);
        if (!exists) {
          // إذا فشل إنشاء المجلد، استخدم مجلد temp
          const tempDir = path.join(process.cwd(), 'temp', 'uploads', destination);
          await fsp.mkdir(tempDir, { recursive: true });
          cb(null, tempDir);
        } else {
          cb(null, uploadDir);
        }
      } catch (error) {
        console.error('خطأ في إعداد مجلد الرفع:', error);
        cb(error as Error, '');
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      // تنظيف اسم الملف من الأحرف الخاصة
      const cleanPrefix = prefix.replace(/[^a-z0-9]/gi, '_');
      cb(null, `${cleanPrefix}-${uniqueSuffix}${ext}`);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: maxSize,
      files: 1,
      fieldSize: maxSize, // حد حجم الحقل
      parts: 10, // حد عدد الأجزاء
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/tiff',
        'image/svg+xml',
      ];

      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            `نوع الملف غير مدعوم: ${file.mimetype}. الأنواع المدعومة: JPG, PNG, GIF, WebP, SVG`
          )
        );
      }
    },
  });
};

// إعداد multer للصور المختلفة
const upload = createMulterConfig('profiles', 'profile', 5 * 1024 * 1024);
const wallUpload = createMulterConfig('wall', 'wall', 10 * 1024 * 1024);

const bannerUpload = createMulterConfig('banners', 'banner', 8 * 1024 * 1024);

// إعداد رفع موسيقى البروفايل (mp3/ogg/webm/wav حتى 10MB)
const musicStorage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      const uploadDir = path.join(process.cwd(), 'client', 'public', 'uploads', 'music');
      await fsp.mkdir(uploadDir, { recursive: true }).catch(() => {});
      
      // التحقق من وجود المجلد وإمكانية الكتابة فيه
      const exists = await fsp.stat(uploadDir).then(() => true).catch(() => false);
      if (!exists) {
        // إذا فشل إنشاء المجلد، استخدم مجلد temp
        const tempDir = path.join(process.cwd(), 'temp', 'uploads', 'music');
        await fsp.mkdir(tempDir, { recursive: true });
        cb(null, tempDir);
      } else {
        cb(null, uploadDir);
      }
    } catch (err) {
      console.error('خطأ في إعداد مجلد رفع الموسيقى:', err);
      // استخدام مجلد temp كبديل آمن
      const tempDir = path.join(process.cwd(), 'temp', 'uploads', 'music');
      try {
        await fsp.mkdir(tempDir, { recursive: true });
        cb(null, tempDir);
      } catch (tempErr) {
        console.error('خطأ في إنشاء مجلد temp:', tempErr);
        cb(err as any, '');
      }
    }
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // تنظيف اسم الملف من الأحرف الخاصة
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `music-${uniqueSuffix}${ext}`);
  },
});

const musicUpload = multer({
  storage: musicStorage,
  limits: { 
    fileSize: 3 * 1024 * 1024, // 3MB limit due to server constraints
    files: 1, 
    fieldSize: 256 * 1024, 
    parts: 20 
  },
  fileFilter: (_req, file, cb) => {
    console.log(`🔍 فحص ملف: ${file.originalname}, نوع MIME: ${file.mimetype}`);
    
    // قائمة أنواع الملفات المدعومة - محسنة
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/ogg',
      'audio/webm',
      'audio/wav',
      'audio/m4a',
      'audio/aac',
      'audio/x-m4a',
      'audio/mp4'
    ];
    
    const allowedExtensions = ['.mp3', '.wav', '.ogg', '.webm', '.m4a', '.aac', '.mp4'];
    
    // التحقق من نوع MIME
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype.toLowerCase());
    
    // التحقق من امتداد الملف
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const isValidExtension = allowedExtensions.includes(fileExtension);
    
    console.log(`🔍 نوع MIME صحيح: ${isValidMimeType}, امتداد صحيح: ${isValidExtension}`);
    
    if (!isValidMimeType && !isValidExtension) {
      console.log(`❌ رفض الملف في الفلتر: نوع غير مدعوم ${file.mimetype}`);
      return cb(new Error(`Unsupported audio file type: ${file.mimetype}. Supported types: MP3, WAV, OGG, M4A, AAC`));
    }
    
    console.log(`✅ قبول الملف في الفلتر: ${file.originalname}`);
    cb(null, true);
  },
});

// Storage initialization - using imported storage instance

// I/O interface
// Removed direct Socket.IO setup from this file; handled in realtime.ts

// دالة broadcast للإرسال لجميع المستخدمين
// removed duplicate broadcast; use io.emit('message', ...) or io.to(...).emit('message', ...) directly

// تم نقل إدارة قائمة المتصلين وتحديثات الغرف إلى وحدة realtime الموحدة

// إنشاء خدمات محسنة ومنظمة
const authService = new (class AuthService {
  async login(username: string, password: string) {
    const user = await storage.getUserByUsername(username.trim());
    if (!user) {
      throw new Error('بيانات الدخول غير صحيحة');
    }

    // التحقق من كلمة المرور - دعم التشفير والنص العادي
    let passwordValid = false;
    if (user.password) {
      const isBcryptHash = /^(\$2[aby]\$|\$2\$)/.test(user.password);
      if (isBcryptHash) {
        // كلمة مرور مشفرة - استخدام bcrypt
        passwordValid = await bcrypt.compare(password.trim(), user.password);
      } else {
        // كلمة مرور غير مشفرة - مقارنة مباشرة
        passwordValid = user.password === password.trim();
      }
    }

    if (!passwordValid) {
      throw new Error('بيانات الدخول غير صحيحة');
    }

    await storage.setUserOnlineStatus(user.id, true);
    return user;
  }

  async register(userData: any) {
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      throw new Error('اسم المستخدم موجود مسبقاً');
    }
    return await storage.createUser(userData);
  }
})();

const messageService = new (class MessageService {
  async sendMessage(senderId: number, messageData: any) {
    const sender = await storage.getUser(senderId);
    if (!sender) throw new Error('المرسل غير موجود');

    if (sender.isMuted && !messageData.isPrivate) {
      throw new Error('أنت مكتوم ولا يمكنك إرسال رسائل عامة');
    }

    return await storage.createMessage({ ...messageData, senderId });
  }
})();

export async function registerRoutes(app: Express): Promise<Server> {
  // استخدام مسارات الغرف المنفصلة
  app.use('/api/rooms', roomRoutes);

  // استخدام مسارات الرسائل المنفصلة والمحسنة
  app.use('/api/messages', messageRoutes);
  // حالات (Stories)
  app.use('/api/stories', storiesRoutes);
  // الغرف الصوتية
  app.use('/api/voice', voiceRoutes);
  // مسارات الرسائل الخاصة مفصولة بالكامل
  app.use('/api/private-messages', (await import('./routes/privateMessages')).default);

  // Unified download routes under /api + legacy redirect
  setupDownloadRoute(app);
  setupCompleteDownload(app);

  // رفع صور البروفايل - نظام ذكي متقدم مع حل شامل لجميع المشاكل
  app.post(
    '/api/upload/profile-image',
    protect.auth,
    limiters.upload,
    upload.single('profileImage'),
    async (req, res) => {
      try {
        res.set('Cache-Control', 'no-store');
        
        if (!req.file) {
          return res.status(400).json({
            error: 'لم يتم رفع أي ملف',
            details: "تأكد من إرسال الملف في حقل 'profileImage'",
          });
        }

        const userId = (req as any).user?.id as number;
        if (!userId || isNaN(userId)) {
          // تنظيف الملف المؤقت
          try {
            await fsp.unlink(req.file.path);
          } catch (unlinkError) {
            console.error('خطأ في حذف الملف:', unlinkError);
          }
          return res.status(401).json({ error: 'يجب تسجيل الدخول' });
        }

        // التحقق من وجود المستخدم
        const user = await storage.getUser(userId);
        if (!user) {
          try {
            await fsp.unlink(req.file.path);
          } catch (unlinkError) {
            console.error('خطأ في حذف الملف:', unlinkError);
          }
          return res.status(404).json({ error: 'المستخدم غير موجود' });
        }

        // التحقق من الصلاحيات - الأعضاء والمشرفين يمكنهم رفع الصور، الزوار لا يمكنهم
        if (user.userType === 'guest') {
          try {
            await fsp.unlink(req.file.path);
          } catch (unlinkError) {
            console.error('خطأ في حذف الملف:', unlinkError);
          }
          return res.status(403).json({ error: 'هذه الميزة غير متاحة للزوار' });
        }

        // 🧠 استخدام النظام الذكي الجديد لمعالجة الصور
        const { smartImageService } = await import('./services/smartImageService');
        const { advancedCacheService } = await import('./services/advancedCacheService');
        
        // قراءة الملف
        const inputBuffer = await fsp.readFile(req.file.path);
        
        // معالجة ذكية للصورة
        const processedImage = await smartImageService.processImage(inputBuffer, {
          userId,
          type: 'avatar',
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          priority: 'balanced' as any
        });

        // تنظيف الملف المؤقت
        try {
          await fsp.unlink(req.file.path);
        } catch {}

        // تحديث المستخدم في قاعدة البيانات
        const updatedUser = await storage.updateUser(userId, {
          profileImage: processedImage.url,
          avatarHash: processedImage.metadata.hash,
        } as any);

        if (!updatedUser) {
          return res.status(500).json({ error: 'فشل في تحديث بيانات المستخدم' });
        }

        // تحديث Cache المتقدم
        await advancedCacheService.setImage(userId, 'avatar', processedImage.url, {
          priority: 'high',
          metadata: processedImage.metadata
        });

        // تحديث cache المستخدمين المتصلين
        try {
          await updateConnectedUserCache(updatedUser);
        } catch {}

        // بث فوري عبر Socket لتحديث الأفاتار في جميع الواجهات
        try {
          const { getIO } = await import('./realtime');
          const io = getIO();
          // إرسال حدث خاص بالأفاتار لتسريع التزامن مع تقليل الحمولة
          io.to(userId.toString()).emit('message', {
            type: 'selfAvatarUpdated',
            avatarHash: processedImage.metadata.hash,
            avatarVersion: (processedImage.metadata as any).version || undefined,
          });
          // بث إلى الغرف التي يتواجد فيها المستخدم قائمة المتصلين المحدّثة
          try {
            const { roomService } = await import('./services/roomService');
            const realtime = await import('./realtime');
          } catch {}
        } catch {}

        // إرسال الاستجابة (بدون ترويسات كاش طويلة على JSON)
        res.set('Cache-Control', 'no-store');
        res.json({ 
          success: true, 
          imageUrl: processedImage.url,
          avatarHash: processedImage.metadata.hash,
          storageType: processedImage.storageType,
          fallbackUrl: processedImage.fallbackUrl,
          metadata: {
            size: processedImage.metadata.size,
            compressionRatio: processedImage.metadata.compressionRatio,
            qualityScore: processedImage.metadata.qualityScore
          }
        });

        } catch (error: any) {
        console.error('❌ خطأ في رفع صورة البروفايل:', error);
        
        // تنظيف الملف المؤقت في حالة الخطأ
        if (req.file?.path) {
          try {
            await fsp.unlink(req.file.path);
          } catch {}
        }
        
        res.status(500).json({ 
          error: 'خطأ في الخادم أثناء رفع الصورة',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
  );

  // رفع صورة البانر - نظام ذكي متقدم
  app.post(
    '/api/upload/profile-banner',
    protect.auth,
    limiters.upload,
    bannerUpload.single('banner'),
    async (req, res) => {
      try {
        res.set('Cache-Control', 'no-store');
        
        if (!req.file) {
          return res.status(400).json({
            error: 'لم يتم رفع أي ملف',
            details: "تأكد من إرسال الملف في حقل 'banner'",
          });
        }

        const userId = (req as any).user?.id as number;
        if (!userId || isNaN(userId)) {
          try {
            await fsp.unlink(req.file.path);
          } catch {}
          return res.status(401).json({ error: 'يجب تسجيل الدخول' });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          try {
            await fsp.unlink(req.file.path);
          } catch {}
          return res.status(404).json({ error: 'المستخدم غير موجود' });
        }

        // التحقق من الصلاحيات - المشرفون أو المستخدمون بمستوى 20+
        const isModerator = user.userType === 'owner' || user.userType === 'admin' || user.userType === 'moderator';
        const userLevel = Number((user as any).level || 1);
        if (!isModerator && userLevel < 20) {
          try {
            await fsp.unlink(req.file.path);
          } catch {}
          return res.status(403).json({ error: 'هذه الميزة متاحة للمشرفين أو للمستوى 20 فما فوق' });
        }

        // 🧠 استخدام النظام الذكي الجديد لمعالجة البانر
        const { smartImageService } = await import('./services/smartImageService');
        const { advancedCacheService } = await import('./services/advancedCacheService');
        
        // قراءة الملف
        const inputBuffer = await fsp.readFile(req.file.path);
        
        // معالجة ذكية للبانر
        const processedImage = await smartImageService.processImage(inputBuffer, {
          userId,
          type: 'banner',
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          priority: 'balanced' as any
        });

        // تنظيف الملف المؤقت
        try {
          await fsp.unlink(req.file.path);
        } catch {}

        // تحديث المستخدم في قاعدة البيانات
        const updatedUser = await storage.updateUser(userId, { 
          profileBanner: processedImage.url,
          bannerHash: processedImage.metadata.hash
        } as any);
        
        if (!updatedUser) {
          return res.status(500).json({ error: 'فشل في تحديث صورة البانر في قاعدة البيانات' });
        }

        // تحديث Cache المتقدم
        await advancedCacheService.setImage(userId, 'banner', processedImage.url, {
          priority: 'normal',
          metadata: processedImage.metadata
        });

        // تحديث cache المستخدمين المتصلين
        try {
          await updateConnectedUserCache(updatedUser);
        } catch {}

        // إرسال الاستجابة (بدون ترويسات كاش طويلة على JSON)
        res.set('Cache-Control', 'no-store');
        res.json({ 
          success: true, 
          bannerUrl: processedImage.url,
          bannerHash: processedImage.metadata.hash,
          storageType: processedImage.storageType,
          fallbackUrl: processedImage.fallbackUrl,
          metadata: {
            size: processedImage.metadata.size,
            compressionRatio: processedImage.metadata.compressionRatio,
            qualityScore: processedImage.metadata.qualityScore
          }
        });

        } catch (error: any) {
        console.error('❌ خطأ في رفع صورة البانر:', error);
        
        // تنظيف الملف المؤقت في حالة الخطأ
        if (req.file?.path) {
          try {
            await fsp.unlink(req.file.path);
          } catch {}
        }
        
        res.status(500).json({ 
          error: 'خطأ في الخادم أثناء رفع صورة البانر',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
  );

  // رفع موسيقى البروفايل - محسّن مع معالجة أفضل للأخطاء
  app.post(
    '/api/upload/profile-music',
    protect.auth,
    limiters.upload,
    // middleware للتعامل مع خطأ 413 من nginx
    (req, res, next) => {
      console.log(`🔍 بدء رفع الملف - Content-Length: ${req.get('Content-Length')} بايت`);
      
      const contentLength = parseInt(req.get('Content-Length') || '0');
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (contentLength > maxSize) {
        console.log(`❌ رفض الملف قبل المعالجة: ${(contentLength / (1024 * 1024)).toFixed(2)} ميجابايت > 10MB`);
        return res.status(413).json({
          success: false,
          error: `حجم الملف كبير جداً (${(contentLength / (1024 * 1024)).toFixed(2)} ميجابايت). الحد الأقصى 10 ميجابايت`
        });
      }
      
      next();
    },
    (req, res, next) => {
      // معالج multer مع معالجة أفضل للأخطاء
      musicUpload.single('music')(req, res, (err) => {
        if (err) {
          console.error('خطأ في رفع الملف:', err);
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(413).json({ 
                success: false,
                error: 'حجم الملف كبير جداً. الحد الأقصى الآمن هو 3 ميجابايت بسبب قيود الخادم. جرّب ضغط الملف أو تقليل الجودة.',
                details: {
                  maxSize: '3MB',
                  suggestions: [
                    'استخدم جودة أقل (128 kbps)',
                    'حول الملف إلى MP3',
                    'اقطع الملف لجزء أقصر'
                  ]
                }
              });
            }
            return res.status(400).json({ 
              success: false,
              error: `خطأ في رفع الملف: ${err.message}` 
            });
          }
          return res.status(400).json({ 
            success: false,
            error: err.message || 'خطأ في رفع الملف' 
          });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        res.set('Cache-Control', 'no-store');

        if (!req.file) {
          return res.status(400).json({ 
            success: false,
            error: 'لم يتم رفع أي ملف صوت' 
          });
        }

        // enforce business max size of 10MB while allowing a transport margin above (multipart overhead)
        try {
          const uploadedSize = (req.file as any)?.size || 0;
          const maxUserFileSize = 10 * 1024 * 1024;
          
          console.log(`📊 تحقق من حجم الملف: ${uploadedSize} بايت = ${(uploadedSize / (1024 * 1024)).toFixed(2)} ميجابايت`);
          console.log(`📊 نوع الملف: ${req.file?.mimetype}`);
          console.log(`📊 اسم الملف الأصلي: ${req.file?.originalname}`);
          
          // التحقق من الحد الأدنى للحجم (يجب أن يكون أكبر من 0)
          if (uploadedSize === 0) {
            console.log('❌ رفض الملف: حجم صفر');
            try { await fsp.unlink(req.file.path).catch(() => {}); } catch {}
            return res.status(400).json({
              success: false,
              error: 'الملف فارغ أو تالف'
            });
          }
          
          // التحقق من الحد الأقصى للحجم
          if (uploadedSize > maxUserFileSize) {
            console.log(`❌ رفض الملف: حجم كبير جداً (${(uploadedSize / (1024 * 1024)).toFixed(2)} ميجابايت)`);
            try { await fsp.unlink(req.file.path).catch(() => {}); } catch {}
            return res.status(413).json({
              success: false,
              error: `حجم الملف يتجاوز الحد المسموح (10 ميجابايت). حجم الملف: ${(uploadedSize / (1024 * 1024)).toFixed(2)} ميجابايت`
            });
          }
          
          console.log('✅ تم قبول الملف: الحجم والنوع صحيحان');
        } catch (sizeCheckError) {
          console.error('❌ خطأ في فحص حجم الملف:', sizeCheckError);
        }

        const userId = (req as any).user?.id as number;
        if (!userId || isNaN(userId)) {
          // حذف الملف المرفوع في حالة الخطأ
          try { await fsp.unlink(req.file.path).catch(() => {}); } catch {}
          return res.status(401).json({ 
            success: false,
            error: 'يجب تسجيل الدخول' 
          });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          try { await fsp.unlink(req.file.path).catch(() => {}); } catch {}
          return res.status(404).json({ 
            success: false,
            error: 'المستخدم غير موجود' 
          });
        }

        // التحقق من الصلاحيات - فقط المشرفين يمكنهم رفع الموسيقى
        if (user.userType !== 'owner' && user.userType !== 'admin' && user.userType !== 'moderator') {
          try { await fsp.unlink(req.file.path).catch(() => {}); } catch {}
          return res.status(403).json({ 
            success: false,
            error: 'هذه الميزة متاحة للمشرفين فقط' 
          });
        }

        // حذف الملف القديم إن وجد - مع معالجة أفضل للأخطاء
        if (user.profileMusicUrl) {
          // احسب المسار الكامل بأمان حتى لو كان الرابط يبدأ بـ '/'
          const uploadsRoot = path.join(process.cwd(), 'client', 'public');
          const relative = String(user.profileMusicUrl).replace(/^\/+/, '');
          const oldPath = path.resolve(uploadsRoot, relative);
          try {
            if (oldPath.startsWith(uploadsRoot)) {
              await fsp.unlink(oldPath);
              console.log(`✅ تم حذف الملف القديم: ${oldPath}`);
            } else {
              console.warn('⚠️ تم تجاهل حذف ملف خارج مجلد الرفع:', oldPath);
            }
          } catch (unlinkErr) {
            console.warn(`⚠️ تعذر حذف الملف القديم: ${oldPath}`, unlinkErr);
            // لا نوقف العملية إذا فشل حذف الملف القديم
          }
        }

        // تكون الملفات ضمن /uploads/music
        const fileUrl = `/uploads/music/${req.file.filename}`;
        const titleCandidate = (req.body?.title as string) || req.file.originalname;
        const profileMusicTitle = String(titleCandidate || 'موسيقى البروفايل')
          .replace(/\.[^/.]+$/, '') // إزالة الامتداد
          .slice(0, 200);

        const updated = await storage.updateUser(userId, {
          profileMusicUrl: fileUrl,
          profileMusicTitle,
          profileMusicEnabled: true,
          profileMusicVolume: 70, // قيمة افتراضية
        } as any);

        if (!updated) {
          // حذف الملف في حالة فشل التحديث
          try { 
            await fsp.unlink(req.file.path);
            console.log(`✅ تم حذف الملف بعد فشل التحديث: ${req.file.path}`);
          } catch (cleanupErr) {
            console.warn(`⚠️ تعذر حذف الملف بعد فشل التحديث: ${req.file.path}`, cleanupErr);
          }
          return res.status(500).json({ 
            success: false,
            error: 'فشل تحديث بيانات المستخدم' 
          });
        }

        // بث تحديث محسن مع معالجة أفضل للأخطاء
        try { 
          const sanitizedUser = sanitizeUserData(updated);
          emitUserUpdatedToUser(userId, sanitizedUser); 
          emitUserUpdatedToAll(sanitizedUser); 
          
          console.log(`✅ تم بث تحديث موسيقى البروفايل للمستخدم ${userId}`);
        } catch (broadcastErr) {
          console.error('❌ خطأ في بث التحديث:', broadcastErr);
          // لا نوقف العملية إذا فشل البث
        }

        return res.json({ 
          success: true, 
          url: fileUrl, 
          title: profileMusicTitle,
          message: 'تم رفع الموسيقى بنجاح'
        });
      } catch (error: any) {
        console.error('❌ خطأ في رفع موسيقى البروفايل:', error);
        
        // حذف الملف في حالة حدوث خطأ
        if (req.file) {
          try { 
            await fsp.unlink(req.file.path);
            console.log(`✅ تم حذف الملف بعد حدوث خطأ: ${req.file.path}`);
          } catch (cleanupErr) {
            console.warn(`⚠️ تعذر حذف الملف بعد حدوث خطأ: ${req.file.path}`, cleanupErr);
          }
        }
        
        // معالجة أفضل للأخطاء
        let errorMessage = 'خطأ في الخادم أثناء رفع الملف الصوتي';
        let statusCode = 500;
        
        if (error.code === 'LIMIT_FILE_SIZE') {
          errorMessage = 'حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)';
          statusCode = 413;
        } else if (error.message?.includes('Unsupported audio file type')) {
          errorMessage = 'نوع الملف غير مدعوم';
          statusCode = 415;
        } else if (error.message?.includes('هذه الميزة متاحة للمشرفين فقط')) {
          errorMessage = 'ليس لديك صلاحية لرفع الموسيقى';
          statusCode = 403;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        res.status(statusCode).json({ 
          success: false,
          error: errorMessage
        });
      }
    }
  );

  // تم إزالة الرفع المجزّأ بناءً على طلب المستخدم

  // 🎛️ لوحة تحكم الصور المتقدمة - للمطورين والإدارة
  app.get('/api/admin/images/dashboard', developmentOnly, async (req, res) => {
    logDevelopmentEndpoint('/api/admin/images/dashboard');
    try {
      const { imageMonitoringService } = await import('./services/imageMonitoringService');
      const { advancedCacheService } = await import('./services/advancedCacheService');
      const { smartImageService } = await import('./services/smartImageService');
      
      const [health, usageStats, cacheStats, smartStats] = await Promise.all([
        imageMonitoringService.checkSystemHealth(),
        imageMonitoringService.getUsageStats('24h'),
        advancedCacheService.getStats(),
        smartImageService.getPerformanceMetrics()
      ]);

      res.json({
        success: true,
        dashboard: {
          health,
          usage: usageStats,
          cache: cacheStats,
          smart: smartStats,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ خطأ في لوحة تحكم الصور:', error);
      res.status(500).json({ 
        success: false, 
        error: 'خطأ في الحصول على بيانات لوحة التحكم' 
      });
    }
  });

  // 🔧 تشغيل Migration للصور
  app.post('/api/admin/images/migrate', developmentOnly, async (req, res) => {
    logDevelopmentEndpoint('/api/admin/images/migrate');
    try {
      const { imageMigrationService } = await import('./services/imageMigrationService');
      const { dryRun = true, forceBase64 = false } = req.body;
      
      const stats = await imageMigrationService.runFullMigration({
        dryRun,
        forceBase64,
        batchSize: 25,
        backupFirst: true
      });

      res.json({
        success: true,
        migration: stats,
        message: dryRun ? 'محاكاة Migration مكتملة' : 'Migration حقيقي مكتمل'
      });
    } catch (error) {
      console.error('❌ خطأ في Migration:', error);
      res.status(500).json({ 
        success: false, 
        error: 'خطأ في تنفيذ Migration' 
      });
    }
  });

  // 🔍 تحليل حالة الصور
  app.get('/api/admin/images/analyze', developmentOnly, async (req, res) => {
    logDevelopmentEndpoint('/api/admin/images/analyze');
    try {
      const { imageMigrationService } = await import('./services/imageMigrationService');
      const analysis = await imageMigrationService.analyzeImageState();

      res.json({
        success: true,
        analysis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ خطأ في تحليل الصور:', error);
      res.status(500).json({ 
        success: false, 
        error: 'خطأ في تحليل حالة الصور' 
      });
    }
  });

  // 🧹 تنظيف الملفات التالفة
  app.post('/api/admin/images/cleanup', developmentOnly, async (req, res) => {
    logDevelopmentEndpoint('/api/admin/images/cleanup');
    try {
      const { imageMigrationService } = await import('./services/imageMigrationService');
      const { smartImageService } = await import('./services/smartImageService');
      
      const [cleanupResult, diagnosticResult] = await Promise.all([
        imageMigrationService.cleanupBrokenFiles(),
        smartImageService.diagnoseAndFixImages()
      ]);

      res.json({
        success: true,
        cleanup: cleanupResult,
        diagnostic: diagnosticResult,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ خطأ في تنظيف الصور:', error);
      res.status(500).json({ 
        success: false, 
        error: 'خطأ في تنظيف الملفات' 
      });
    }
  });

  // 📊 إحصائيات المراقبة
  app.get('/api/admin/images/monitoring', developmentOnly, async (req, res) => {
    logDevelopmentEndpoint('/api/admin/images/monitoring');
    try {
      const { imageMonitoringService } = await import('./services/imageMonitoringService');
      const { timeframe = '24h', metric, type, severity } = req.query;
      
      const [metrics, errors] = await Promise.all([
        imageMonitoringService.getMetrics({ 
          metric: metric as string,
          timeframe: timeframe as any,
          limit: 100 
        }),
        imageMonitoringService.getErrors({ 
          type: type as any,
          severity: severity as any,
          timeframe: timeframe as any,
          limit: 50 
        })
      ]);

      res.json({
        success: true,
        monitoring: {
          metrics,
          errors,
          timeframe
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ خطأ في بيانات المراقبة:', error);
      res.status(500).json({ 
        success: false, 
        error: 'خطأ في الحصول على بيانات المراقبة' 
      });
    }
  });

  // 🗑️ مسح Cache
  app.post('/api/admin/images/cache/clear', developmentOnly, async (req, res) => {
    logDevelopmentEndpoint('/api/admin/images/cache/clear');
    try {
      const { advancedCacheService } = await import('./services/advancedCacheService');
      const { userId, type } = req.body;
      
      if (userId) {
        advancedCacheService.clearUserImages(userId);
        res.json({ success: true, message: `تم مسح cache المستخدم ${userId}` });
      } else {
        advancedCacheService.clearAll();
        res.json({ success: true, message: 'تم مسح جميع Cache' });
      }
    } catch (error) {
      console.error('❌ خطأ في مسح Cache:', error);
      res.status(500).json({ 
        success: false, 
        error: 'خطأ في مسح Cache' 
      });
    }
  });

  // Debug endpoint للتحقق من الصور - متاح في التطوير فقط (Legacy)
  app.get('/api/debug/images', developmentOnly, async (req, res) => {
    logDevelopmentEndpoint('/api/debug/images');
    try {
      const uploadsDir = path.join(process.cwd(), 'client', 'public', 'uploads');
      const profilesDir = path.join(uploadsDir, 'profiles');
      const bannersDir = path.join(uploadsDir, 'banners');
      const avatarsDir = path.join(uploadsDir, 'avatars');

      const debugInfo = {
        uploadsDir: uploadsDir,
        profilesDir: profilesDir,
        bannersDir: bannersDir,
        avatarsDir: avatarsDir,
        uploadsExists: fs.existsSync(uploadsDir),
        profilesExists: fs.existsSync(profilesDir),
        bannersExists: fs.existsSync(bannersDir),
        avatarsExists: fs.existsSync(avatarsDir),
        profileFiles: [],
        bannerFiles: [],
        avatarFiles: [],
        dbImages: [],
      };

      // قائمة ملفات البروفايل
      if (debugInfo.profilesExists) {
        const files = await fsp.readdir(profilesDir);
        debugInfo.profileFiles = await Promise.all(
          files.map(async (file) => {
            const stat = await fsp.stat(path.join(profilesDir, file));
            return {
              name: file,
              path: `/uploads/profiles/${file}`,
              size: stat.size,
            };
          })
        );
      }

      // قائمة ملفات البانر
      if (debugInfo.bannersExists) {
        const files = await fsp.readdir(bannersDir);
        debugInfo.bannerFiles = await Promise.all(
          files.map(async (file) => {
            const stat = await fsp.stat(path.join(bannersDir, file));
            return {
              name: file,
              path: `/uploads/banners/${file}`,
              size: stat.size,
            };
          })
        );
      }

      // قائمة ملفات الأفترار
      if (debugInfo.avatarsExists) {
        const files = await fsp.readdir(avatarsDir);
        debugInfo.avatarFiles = await Promise.all(
          files.map(async (file) => {
            const stat = await fsp.stat(path.join(avatarsDir, file));
            return {
              name: file,
              path: `/uploads/avatars/${file}`,
              size: stat.size,
            };
          })
        );
      }

      // جلب الصور من قاعدة البيانات
      try {
        const users = await storage.getAllUsers();
        debugInfo.dbImages = users
          .filter((user) => user.profileImage || user.profileBanner)
          .map((user) => ({
            id: user.id,
            username: user.username,
            profileImage: user.profileImage,
            profileBanner: user.profileBanner,
          }));
      } catch (dbError) {
        debugInfo.dbImages = [`خطأ في قاعدة البيانات: ${(dbError as Error).message}`];
      }

      res.json(debugInfo);
    } catch (error) {
      console.error('خطأ في debug endpoint:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'خطأ في تشغيل endpoint التشخيص',
      });
    }
  });

  // تحديث بيانات المستخدم - للإصلاح
  app.patch('/api/users/:userId', protect.ownership, async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'معرف المستخدم مطلوب ويجب أن يكون رقم صحيح' });
      }

      // التحقق من وجود المستخدم
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      // فلترة البيانات المسموح بتحديثها
      const allowedUpdates = [
        'profileImage',
        'profileBanner',
        // موسيقى البروفايل
        // ملاحظة: يمنع تحديث profileMusicUrl يدوياً — يجب الرفع عبر /api/upload/profile-music
        'profileMusicTitle',
        'profileMusicEnabled',
        'profileMusicVolume',
      ];
      const updateData: Record<string, any> = {};

      for (const key of allowedUpdates) {
        if (Object.prototype.hasOwnProperty.call(req.body, key)) {
          updateData[key] = (req.body as any)[key];
        }
      }

      // منع تحديث رابط الموسيقى يدوياً عبر هذا المسار
      if (Object.prototype.hasOwnProperty.call(req.body, 'profileMusicUrl')) {
        return res.status(400).json({ error: 'غير مسموح بتحديث رابط الموسيقى يدوياً. استخدم رفع الملف.' });
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'لا توجد بيانات للتحديث' });
      }

      // ضبط القيم
      if (Object.prototype.hasOwnProperty.call(updateData, 'profileMusicVolume')) {
        const vol = parseInt(String(updateData.profileMusicVolume));
        updateData.profileMusicVolume = Number.isFinite(vol)
          ? Math.max(0, Math.min(100, vol))
          : 70;
      }
      if (Object.prototype.hasOwnProperty.call(updateData, 'profileMusicEnabled')) {
        updateData.profileMusicEnabled = Boolean(updateData.profileMusicEnabled);
      }

      // تحديث المستخدم
      const updatedUser = await storage.updateUser(userId, updateData);

      if (!updatedUser) {
        return res.status(500).json({ error: 'فشل في تحديث بيانات المستخدم' });
      }

      res.json({
        success: true,
        message: 'تم تحديث بيانات المستخدم بنجاح',
        user: buildUserBroadcastPayload(updatedUser),
      });
    } catch (error) {
      console.error('❌ خطأ في تحديث المستخدم:', error);
      res.status(500).json({ error: 'خطأ في الخادم أثناء تحديث المستخدم' });
    }
  });

  // تحديث إعداد خصوصية الرسائل الخاصة للمستخدم
  const dmPrivacySchema = z.object({
    dmPrivacy: z.enum(['all', 'friends', 'none']),
  });
  const userPrefsSchema = z.object({
    showPointsToOthers: z.boolean().optional(),
    showSystemMessages: z.boolean().optional(),
    globalSoundEnabled: z.boolean().optional(),
  });
  app.post('/api/users/:userId/dm-privacy', protect.ownership, async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'معرف المستخدم غير صالح' });
      }

      const parsed = dmPrivacySchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'قيمة خصوصية غير صالحة' });
      }

      const updated = await storage.updateUser(userId, { dmPrivacy: parsed.data.dmPrivacy } as any);
      if (!updated) {
        return res.status(500).json({ error: 'فشل في تحديث الإعداد' });
      }

      // بث التحديث للمستخدم والجميع لتحديث الواجهات
      try { emitUserUpdatedToUser(userId, updated); } catch {}
      try { emitUserUpdatedToAll(updated); } catch {}

      res.json({ success: true, dmPrivacy: (updated as any).dmPrivacy || 'all' });
    } catch (error: any) {
      console.error('❌ خطأ في تحديث dmPrivacy:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // تحديث تفضيلات المستخدم العامة (عرض النقاط/رسائل النظام/الأصوات)
  app.post('/api/users/:userId/preferences', protect.ownership, async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'معرّف المستخدم غير صالح' });
      }

      const parsed = userPrefsSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'بيانات تفضيلات غير صالحة' });
      }

      const updates: any = {};
      if (Object.prototype.hasOwnProperty.call(parsed.data, 'showPointsToOthers')) {
        updates.showPointsToOthers = Boolean(parsed.data.showPointsToOthers);
      }
      if (Object.prototype.hasOwnProperty.call(parsed.data, 'showSystemMessages')) {
        updates.showSystemMessages = Boolean(parsed.data.showSystemMessages);
      }
      if (Object.prototype.hasOwnProperty.call(parsed.data, 'globalSoundEnabled')) {
        updates.globalSoundEnabled = Boolean(parsed.data.globalSoundEnabled);
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'لا توجد بيانات للتحديث' });
      }

      const updated = await storage.updateUser(userId, updates);
      if (!updated) {
        return res.status(500).json({ error: 'فشل في تحديث التفضيلات' });
      }

      try { emitUserUpdatedToUser(userId, updated); } catch {}
      try { emitUserUpdatedToAll(updated); } catch {}

      res.json({ success: true, preferences: {
        showPointsToOthers: (updated as any).showPointsToOthers,
        showSystemMessages: (updated as any).showSystemMessages,
        globalSoundEnabled: (updated as any).globalSoundEnabled,
      }});
    } catch (error) {
      console.error('❌ خطأ في تحديث تفضيلات المستخدم:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // API endpoints للإدارة
  // Removed duplicate moderation actions endpoint - kept the more detailed one below

  app.get('/api/moderation/reports', protect.admin, async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(401).json({ error: 'غير مسموح - للإدمن والمالك فقط' });
      }

      const user = await storage.getUser(parseInt(userId as string));
      if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
        return res.status(403).json({ error: 'غير مسموح - للإدمن والمالك فقط' });
      }

      const reports = spamProtection.getPendingReports();
      res.json({ reports });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في جلب التقارير' });
    }
  });

  const modReportSchema = z.object({
    reporterId: z
      .union([z.number().int().positive(), z.string().regex(/^\d+$/)])
      .optional()
      .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
    reportedUserId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
    reason: z.string().trim().min(3, 'السبب قصير جداً').max(200),
    content: z.string().trim().max(1000).optional(),
    messageId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).optional().transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
  });
  app.post('/api/moderation/report', protect.auth, limiters.modReport, async (req, res) => {
    try {
      const parsed = modReportSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'بيانات غير صحيحة' });
      }
      const { reportedUserId, reason, content, messageId } = parsed.data as any;
      const reporterId = (req as any).user?.id as number;

      const report = spamProtection.addReport(
        reporterId,
        reportedUserId,
        reason,
        content,
        messageId
      );
      res.json({ message: 'تم إرسال التقرير بنجاح', report });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في إرسال التقرير' });
    }
  });

  const muteSchema = z.object({
    targetUserId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
    reason: z.string().trim().min(3).max(200),
    duration: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).optional().transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
  });
  app.post('/api/moderation/mute', protect.moderator, protect.log('moderation:mute'), async (req, res) => {
    try {
      const parsed = muteSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'بيانات غير صحيحة' });
      }
      const moderatorId = (req as any).user?.id as number;
      const { targetUserId, reason, duration } = parsed.data as any;

      // التحقق من المعاملات المطلوبة
      if (!moderatorId || !targetUserId || !reason) {
        return res
          .status(400)
          .json({ error: 'معاملات ناقصة: moderatorId, targetUserId, reason مطلوبة' });
      }

      // التحقق من صحة المدة
      const muteDuration = duration && !isNaN(duration) ? parseInt(duration) : 30;
      if (muteDuration < 1 || muteDuration > 1440) {
        // بين دقيقة و24 ساعة
        return res.status(400).json({ error: 'المدة يجب أن تكون بين 1 و 1440 دقيقة' });
      }

      // استخدم IP والجهاز الخاصين بالمستخدم المستهدف فقط (بدون الرجوع إلى هيدر طلب المشرف)
      const target = await storage.getUser(targetUserId);
      const clientIP =
        target?.ipAddress && target.ipAddress !== 'unknown'
          ? target.ipAddress
          : undefined;
      const deviceId =
        target?.deviceId && target.deviceId !== 'unknown'
          ? target.deviceId
          : undefined;

      const success = await moderationSystem.muteUser(
        moderatorId,
        targetUserId,
        reason,
        muteDuration,
        clientIP,
        deviceId
      );
      if (success) {
        // إنشاء إشعار في قاعدة البيانات
        const moderator = await storage.getUser(moderatorId);
        if (moderator) {
          await notificationService.createModerationNotification(
            targetUserId,
            'mute',
            reason,
            moderator.username,
            muteDuration
          );
        }

        res.json({
          success: true,
          message: 'تم كتم المستخدم بنجاح',
          duration: muteDuration,
        });
      } else {
        res.status(400).json({ error: 'فشل في كتم المستخدم - تحقق من الصلاحيات أو حالة المستخدم' });
      }
    } catch (error) {
      console.error('خطأ في كتم المستخدم:', error);
      res.status(500).json({ error: 'خطأ في كتم المستخدم: ' + (error as any).message });
    }
  });

  const banSchema = z.object({
    targetUserId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
    reason: z.string().trim().min(3).max(200),
    duration: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).optional().transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
  });
  app.post('/api/moderation/ban', protect.admin, protect.log('moderation:ban'), async (req, res) => {
    try {
      const parsed = banSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'بيانات غير صحيحة' });
      }
      const moderatorId = (req as any).user?.id as number;
      const { targetUserId, reason, duration } = parsed.data as any;

      // التحقق من المعاملات المطلوبة
      if (!moderatorId || !targetUserId || !reason) {
        return res
          .status(400)
          .json({ error: 'معاملات ناقصة: moderatorId, targetUserId, reason مطلوبة' });
      }

      // للأدمن: المدة الافتراضية 15 دقيقة
      const banDuration = duration && !isNaN(duration) ? parseInt(duration) : 15;
      if (banDuration < 5 || banDuration > 60) {
        // بين 5 دقائق وساعة
        return res.status(400).json({ error: 'مدة الطرد يجب أن تكون بين 5 و 60 دقيقة' });
      }

      // استخدم IP والجهاز الخاصين بالمستخدم المستهدف لضمان دقة الحظر
      const target = await storage.getUser(targetUserId);
      const clientIP =
        target?.ipAddress && target.ipAddress !== 'unknown'
          ? target.ipAddress
          : getClientIpFromHeaders(
              req.headers as any,
              (req.ip || (req.connection as any)?.remoteAddress) as any
            );
      const deviceId =
        target?.deviceId && target.deviceId !== 'unknown'
          ? target.deviceId
          : getDeviceIdFromHeaders(req.headers as any);

      const success = await moderationSystem.banUser(
        moderatorId,
        targetUserId,
        reason,
        banDuration,
        clientIP,
        deviceId
      );

      if (success) {
        const target = await storage.getUser(targetUserId);
        const moderator = await storage.getUser(moderatorId);

        // إشعار المستخدم المطرود
        getIO()
          .to(targetUserId.toString())
          .emit('kicked', {
            moderator: moderator?.username || 'مشرف',
            reason: reason,
            duration: banDuration,
          });

        // إنشاء إشعار في قاعدة البيانات
        if (moderator) {
          await notificationService.createModerationNotification(
            targetUserId,
            'kick',
            reason,
            moderator.username,
            banDuration
          );
        }

        res.json({
          success: true,
          message: 'تم طرد المستخدم بنجاح',
          duration: banDuration,
        });
      } else {
        res.status(400).json({ error: 'فشل في طرد المستخدم - تحقق من الصلاحيات أو حالة المستخدم' });
      }
    } catch (error) {
      console.error('خطأ في طرد المستخدم:', error);
      res.status(500).json({ error: 'خطأ في طرد المستخدم: ' + (error as any).message });
    }
  });

  const blockSchema = z.object({
    targetUserId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
    reason: z.string().trim().min(3).max(200),
  });
  app.post('/api/moderation/block', protect.owner, protect.log('moderation:block'), async (req, res) => {
    try {
      const parsed = blockSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'بيانات غير صحيحة' });
      }
      const moderatorId = (req as any).user?.id as number;
      const { targetUserId, reason } = parsed.data as any;

      // التحقق من المعاملات المطلوبة
      if (!moderatorId || !targetUserId || !reason) {
        return res
          .status(400)
          .json({ error: 'معاملات ناقصة: moderatorId, targetUserId, reason مطلوبة' });
      }

      // التحقق من أن المستخدم لا يحاول حجب نفسه
      if (moderatorId === targetUserId) {
        return res.status(400).json({ error: 'لا يمكنك حجب نفسك' });
      }

      // الحصول على IP والجهاز الخاصين بالمستخدم المستهدف فقط (بدون الرجوع إلى هيدر طلب المشرف)
      const target = await storage.getUser(targetUserId);
      const clientIP =
        target?.ipAddress && target.ipAddress !== 'unknown'
          ? target.ipAddress
          : undefined;
      const deviceId =
        target?.deviceId && target.deviceId !== 'unknown'
          ? target.deviceId
          : undefined;

      const success = await moderationSystem.blockUser(
        moderatorId,
        targetUserId,
        reason,
        clientIP,
        deviceId
      );
      if (success) {
        const target = await storage.getUser(targetUserId);
        const moderator = await storage.getUser(moderatorId);

        // إشعار المستخدم المحجوب
        getIO()
          .to(targetUserId.toString())
          .emit('blocked', {
            moderator: moderator?.username || 'مشرف',
            reason: reason,
            permanent: true,
          });

        // فصل المستخدم المحجوب فوراً
        getIO().to(targetUserId.toString()).disconnectSockets();

        res.json({
          success: true,
          message: 'تم حجب المستخدم بنجاح',
          blocked: {
            userId: targetUserId,
            username: target?.username,
            ipAddress: clientIP,
            deviceId: deviceId,
          },
        });
      } else {
        res.status(400).json({ error: 'فشل في حجب المستخدم - تحقق من الصلاحيات أو حالة المستخدم' });
      }
    } catch (error) {
      console.error('خطأ في حجب المستخدم:', error);
      res.status(500).json({ error: 'خطأ في حجب المستخدم: ' + (error as any).message });
    }
  });

  const promoteSchema = z.object({
    targetUserId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
    newRole: z.enum(['admin', 'moderator']),
  });
  app.post('/api/moderation/promote', protect.owner, protect.log('moderation:promote'), async (req, res) => {
    try {
      const parsed = promoteSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'بيانات غير صحيحة' });
      }
      const moderatorId = (req as any).user?.id as number;
      const { targetUserId, newRole } = parsed.data as any;

      // التحقق من وجود المعاملات المطلوبة
      if (!moderatorId || !targetUserId || !newRole) {
        return res.status(400).json({ error: 'معاملات ناقصة' });
      }

      const success = await moderationSystem.promoteUser(moderatorId, targetUserId, newRole);

      if (success) {
        // إرسال إشعار عبر WebSocket
        const target = await storage.getUser(targetUserId);
        const moderator = await storage.getUser(moderatorId);

        if (target && moderator) {
          const promotionMessage = {
            type: 'systemNotification',
            message: `🎉 تم ترقية ${target.username} إلى ${newRole === 'admin' ? 'إدمن' : 'مشرف'} بواسطة ${moderator.username}`,
            timestamp: new Date().toISOString(),
          };

          getIO().emit('message', promotionMessage);

          // إنشاء إشعار في قاعدة البيانات للمستخدم المُرقى
          await notificationService.createPromotionNotification(
            targetUserId,
            newRole === 'admin' ? 'إدمن' : 'مشرف',
            moderator.username
          );
        }

        res.json({ message: 'تم ترقية المستخدم بنجاح' });
      } else {
        res.status(400).json({ error: 'فشل في ترقية المستخدم' });
      }
    } catch (error) {
      console.error('[PROMOTE_ENDPOINT] خطأ في ترقية المستخدم:', error);
      res.status(500).json({ error: 'خطأ في ترقية المستخدم' });
    }
  });

  // مسار جديد لإلغاء الإشراف (تنزيل الرتبة) - للمالك فقط
  const demoteSchema = z.object({
    targetUserId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
  });
  app.post('/api/moderation/demote', protect.owner, protect.log('moderation:demote'), async (req, res) => {
    try {
      const parsed = demoteSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'بيانات غير صحيحة' });
      }
      const moderatorId = (req as any).user?.id as number;
      const { targetUserId } = parsed.data as any;
      if (!moderatorId || !targetUserId) {
        return res.status(400).json({ error: 'معاملات ناقصة' });
      }

      const success = await moderationSystem.demoteUser(moderatorId, targetUserId);
      if (success) {
        const target = await storage.getUser(targetUserId);
        const moderator = await storage.getUser(moderatorId);
        if (target && moderator) {
          getIO().emit('message', {
            type: 'systemNotification',
            message: `ℹ️ تم تنزيل ${target.username} إلى عضو بواسطة ${moderator.username}`,
            timestamp: new Date().toISOString(),
          });

          // بث تحديث ملف المستخدم للجميع لضمان تزامن الواجهة فوراً
          try {
            emitUserUpdatedToAll(target);
            emitUserUpdatedToUser(target.id, target);
          } catch {}
        }
        res.json({ message: 'تم إلغاء الإشراف بنجاح', user: target });
      } else {
        res.status(400).json({ error: 'فشل في إلغاء الإشراف' });
      }
    } catch (error) {
      console.error('[DEMOTE_ENDPOINT] خطأ في إلغاء الإشراف:', error);
      res.status(500).json({ error: 'خطأ في إلغاء الإشراف' });
    }
  });

  const unmuteSchema = z.object({
    targetUserId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
  });
  app.post('/api/moderation/unmute', protect.moderator, protect.log('moderation:unmute'), async (req, res) => {
    try {
      const parsed = unmuteSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'بيانات غير صحيحة' });
      }
      const moderatorId = (req as any).user?.id as number;
      const { targetUserId } = parsed.data as any;

      const success = await moderationSystem.unmuteUser(moderatorId, targetUserId);
      if (success) {
        res.json({ message: 'تم إلغاء الكتم بنجاح' });
      } else {
        res.status(400).json({ error: 'فشل في إلغاء الكتم' });
      }
    } catch (error) {
      res.status(500).json({ error: 'خطأ في إلغاء الكتم' });
    }
  });

  const unblockSchema = z.object({
    targetUserId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
  });
  app.post('/api/moderation/unblock', protect.owner, protect.log('moderation:unblock'), async (req, res) => {
    try {
      const parsed = unblockSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'بيانات غير صحيحة' });
      }
      const moderatorId = (req as any).user?.id as number;
      const { targetUserId } = parsed.data as any;

      const success = await moderationSystem.unblockUser(moderatorId, targetUserId);
      if (success) {
        res.json({ message: 'تم إلغاء الحجب بنجاح' });
      } else {
        res.status(400).json({ error: 'فشل في إلغاء الحجب' });
      }
    } catch (error) {
      res.status(500).json({ error: 'خطأ في إلغاء الحجب' });
    }
  });

  // API لتحديث لون اسم المستخدم
  app.post('/api/users/:userId/username-color', protect.ownership, async (req, res) => {
    try {
      const { userId } = req.params;
      const { color } = req.body;
      const userIdNum = parseInt(userId);

      // التحقق من صحة اللون (hex color)
      if (!color || !/^#[0-9A-F]{6}$/i.test(color)) {
        return res.status(400).json({ error: 'لون غير صحيح' });
      }

      // التحقق من وجود المستخدم
      const user = await storage.getUser(userIdNum);
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      // فتح تغيير لون الاسم للجميع (مع حماية الملكية)

      // تحديث لون الاسم
      await storage.updateUser(userIdNum, { usernameColor: color });

      // بث خفيف مخصص للغرف + كامل لصاحب التعديل
      const updated = await storage.getUser(userIdNum);
      emitUserUpdatedToUser(userIdNum, updated);
      await emitToUserRooms(userIdNum, { type: 'usernameColorChanged', userId: userIdNum, color });

      res.json({
        message: 'تم تحديث لون اسم المستخدم بنجاح',
        color: color,
      });
    } catch (error) {
      console.error('خطأ في تحديث لون الاسم:', error);
      res.status(500).json({ error: 'خطأ في تحديث لون الاسم' });
    }
  });

  // إضافة endpoint لفحص حالة المستخدم
  app.get('/api/user-status/:userId', protect.ownership, async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'مستخدم غير موجود' });
      }

      const userStatus = await moderationSystem.checkUserStatus(userId);

      res.json({
        user: {
          id: user.id,
          username: user.username,
          userType: user.userType,
          isMuted: user.isMuted,
          muteExpiry: user.muteExpiry,
          isBanned: user.isBanned,
          banExpiry: user.banExpiry,
          isBlocked: user.isBlocked,
        },
        status: userStatus,
      });
    } catch (error) {
      console.error('خطأ في فحص حالة المستخدم:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // إضافة endpoint لإصلاح حالة المراقبة
  app.post('/api/fix-moderation/:userId', protect.admin, async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'مستخدم غير موجود' });
      }

      // إزالة جميع قيود المراقبة للمستخدمين العاديين
      if (user.userType === 'guest' || user.userType === 'member') {
        await storage.updateUser(userId, {
          isMuted: false,
          muteExpiry: null,
          isBanned: false,
          banExpiry: null,
          isBlocked: false,
        });

        res.json({
          success: true,
          message: `تم إصلاح حالة المراقبة للمستخدم ${user.username}`,
        });
      } else {
        res.json({
          success: false,
          message: 'هذا المستخدم من الإدارة - لا يمكن تعديل حالته',
        });
      }
    } catch (error) {
      console.error('خطأ في إصلاح حالة المراقبة:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  const httpServer = createServer(app);
  
  // تحسين مهلات HTTP للأداء العالي تحت الضغط
  try {
    // Keep-Alive timeout: مدة الانتظار قبل إغلاق الاتصال الخامل
    (httpServer as any).keepAliveTimeout = 65_000; // 65 ثانية
    
    // Headers timeout: يجب أن يكون أكبر من keepAliveTimeout
    (httpServer as any).headersTimeout = 70_000; // 70 ثانية
    
    // تعطيل مهلات الطلب والاتصال للسماح برفع الملفات بدون انقطاع
    try {
      (httpServer as any).requestTimeout = 0; // 0 = بدون مهلة للطلب
    } catch {}
    
    (httpServer as any).maxHeadersCount = 100; // حد أقصى لعدد الرؤوس
    (httpServer as any).timeout = 0; // 0 = بدون مهلة سوكت
  } catch (error) {
    console.warn('تحذير: لم يتم تطبيق بعض إعدادات HTTP timeout:', error);
  }

  // إعداد Socket.IO من خلال وحدة realtime الموحدة
  const { setupRealtime } = await import('./realtime');
  const io = setupRealtime(httpServer);

  // تطبيق فحص الأمان على جميع الطلبات
  app.use(checkIPSecurity);
  app.use(advancedSecurityMiddleware);

  // Helper: يبني ترويسة الكوكي auth_token وفق بروتوكول الطلب وSameSite الصحيح
  function buildAuthCookieHeader(req: any, token: string | null, maxAgeSec: number): string {
    try {
      const xfProtoRaw = (req.headers['x-forwarded-proto'] as string | undefined) || '';
      const xfProto = xfProtoRaw.split(',')[0]?.trim().toLowerCase();
      const isHttps = !!req.secure || xfProto === 'https';

      const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin : '';
      const hostHeader = typeof req.headers.host === 'string' ? req.headers.host : '';
      let sameSite = 'Lax';
      if (originHeader) {
        try {
          const originHost = new URL(originHeader).host.split(':')[0];
          const hostOnly = (hostHeader || '').split(':')[0];
          if (originHost && hostOnly && originHost !== hostOnly) {
            sameSite = 'None';
          }
        } catch {}
      }

      const secureAttr = (sameSite === 'None' || isHttps) ? '; Secure' : '';
      if (token) {
        return `auth_token=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=${sameSite}; Max-Age=${maxAgeSec}${secureAttr}`;
      }
      return `auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=${sameSite}${secureAttr}`;
    } catch {
      // Fallback إلى السلوك السابق إذا حدث خطأ غير متوقع
      const base = token
        ? `auth_token=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSec}`
        : 'auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax';
      return `${base}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
    }
  }

  // Member registration route - مع أمان محسن
  app.post('/api/auth/register', limiters.auth, async (req, res) => {
    try {
      const { username, password, confirmPassword, gender, age, country, status, relation } =
        req.body;

      // فحص الأمان الأساسي
      if (!username?.trim() || !password?.trim() || !confirmPassword?.trim()) {
        return res.status(400).json({ error: 'جميع الحقول المطلوبة' });
      }

      // فحص اسم المستخدم - شرط الطول فقط (1-14)
      if (username.trim().length < 1 || username.trim().length > 14) {
        return res
          .status(400)
          .json({ error: 'اسم المستخدم يجب أن يكون بين 1 و 14 حرف' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'كلمات المرور غير متطابقة' });
      }

      // فحص قوة كلمة المرور
      if (password.length < 6) {
        return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
      }

      if (!/(?=.*[0-9])/.test(password)) {
        return res.status(400).json({ error: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل' });
      }

      // فحص العمر إذا تم إدخاله
      if (age && (age < 18 || age > 100)) {
        return res.status(400).json({ error: 'العمر يجب أن يكون بين 18 و 100 سنة' });
      }

      // Check if username already exists
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
      }

      const totalUsers = await databaseService.countUsers();
      const isFirstUser = Number(totalUsers) === 0;
      const assignedUserType = isFirstUser ? 'owner' : 'member';
      const assignedRole = isFirstUser ? 'owner' : 'member';

      // تشفير كلمة المرور قبل حفظها
      const hashedPassword = await bcrypt.hash(password.trim(), 12);

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        userType: assignedUserType,
        role: assignedRole,
        usernameColor: '#4A90E2',
        gender: gender || 'male',
        age: age || undefined,
        country: country?.trim() || undefined,
        status: status?.trim() || undefined,
        relation: relation?.trim() || undefined,
        profileImage: '/default_avatar.svg',
      });

      try {
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const token = issueAuthToken(user.id, THIRTY_DAYS_MS);
        const maxAgeSec = Math.floor(THIRTY_DAYS_MS / 1000);
        res.setHeader('Set-Cookie', buildAuthCookieHeader(req, token, maxAgeSec));
      } catch {}
      res.json({ user: buildUserBroadcastPayload(user), message: 'تم التسجيل بنجاح' });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // Authentication routes
  app.post('/api/auth/guest', limiters.auth, async (req, res) => {
    try {
      const { username, gender } = req.body;

      if (!username?.trim() || username.trim().length > 14) {
        return res.status(400).json({ error: 'اسم المستخدم يجب أن يكون بين 1 و 14 حرف' });
      }

      // Check if username already exists
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: 'الاسم مستخدم بالفعل' });
      }

      const user = await storage.createUser({
        username,
        userType: 'guest',
        usernameColor: '#4A90E2',
        gender: gender || 'male',
        profileImage: '/default_avatar.svg',
      });

      try {
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const token = issueAuthToken(user.id, THIRTY_DAYS_MS);
        const maxAgeSec = Math.floor(THIRTY_DAYS_MS / 1000);
        res.setHeader('Set-Cookie', buildAuthCookieHeader(req, token, maxAgeSec));
      } catch {}
      res.json({ user: buildUserBroadcastPayload(user) });
    } catch (error) {
      console.error('Guest login error:', error);
      console.error('Error details:', error.message, error.stack);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // Logout route - يمسح التوكن ويحدث حالة الاتصال
  app.post('/api/auth/logout', protect.auth, async (req, res) => {
    try {
      const token = getAuthTokenFromRequest(req as any);
      if (token) {
        const verified = verifyAuthToken(token);
        if (verified?.userId) {
          try {
            await storage.setUserOnlineStatus(verified.userId, false);
          } catch {}

          // إزالة المستخدم من قائمة المتصلين والبث برسالة "المستخدم غادر الموقع"
          try {
            const user = await storage.getUser(verified.userId);
            // اعتمد على الغرف النشطة المتصلة حالياً لتفادي إرسال الرسالة لغرف قديمة محفوظة في DB
            const roomIds = getUserActiveRooms(verified.userId);
            // إزالة من كاش المتصلين فوراً
            try { await updateConnectedUserCache(verified.userId, null); } catch {}

            if (Array.isArray(roomIds)) {
              for (const roomId of roomIds) {
                try {
                  const content = formatRoomEventMessage('site_leave', {
                    username: user?.username,
                    userType: user?.userType,
                    level: (user as any)?.level,
                  });
                  const msg = await storage.createMessage({
                    senderId: verified.userId,
                    roomId,
                    content,
                    messageType: 'system',
                    isPrivate: false,
                  });
                  const sender = await storage.getUser(verified.userId);
                  getIO().to(`room_${roomId}`).emit('message', {
                    type: 'newMessage',
                    message: {
                      ...msg,
                      sender,
                      roomId,
                      reactions: { like: 0, dislike: 0, heart: 0 },
                      myReaction: null,
                    },
                  });
                  // تحديث قائمة المتصلين في الغرفة
                  try { await emitOnlineUsersForRoom(roomId); } catch {}
                } catch {}
              }
            }
          } catch {}
        }
      }
      res.setHeader('Set-Cookie', buildAuthCookieHeader(req, null, 0));
      res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
    } catch (error) {
      res.setHeader('Set-Cookie', buildAuthCookieHeader(req, null, 0));
      res.status(200).json({ success: true, message: 'تم مسح الجلسة' });
    }
  });

  app.post('/api/auth/member', limiters.auth, async (req, res) => {
    try {
      const { username, password, email, identifier } = req.body || {};

      const providedIdentifier = (identifier || username || email || '').toString();

      if (!providedIdentifier.trim() || !password?.trim()) {
        return res.status(400).json({ error: 'اسم المستخدم/البريد وكلمة المرور مطلوبان' });
      }

      // حاول الإتيان بالمستخدم بالاسم أولاً ثم بالبريد إذا كان معرف يشبه البريد
      let user = await storage.getUserByUsername(providedIdentifier.trim());
      if (!user && /@/.test(providedIdentifier)) {
        try {
          user = await (storage as any).getUserByEmail?.(providedIdentifier.trim());
        } catch {}
      }
      if (!user) {
        return res.status(401).json({ error: 'المستخدم غير موجود' });
      }

      // التحقق من كلمة المرور - BCRYPT فقط
      if (!user.password || !/^\$2[aby]\$/.test(user.password)) {
        return res.status(401).json({ error: 'كلمة المرور غير صالحة' });
      }
      const passwordValid = await bcrypt.compare(password.trim(), user.password);
      if (!passwordValid) {
        return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
      }

      // Check if user is actually a member or owner
      const userType = user.userType;
      if (userType === 'guest') {
        return res.status(401).json({ error: 'هذا المستخدم ضيف وليس عضو' });
      }

      // التأكد من أن الأعضاء العاديين غير مخفيين (فقط الإدمن والمالك يمكنهم الإخفاء)
      if (userType !== 'owner' && userType !== 'admin') {
        if (user.isHidden) {
          await storage.updateUser(user.id, { isHidden: false });
          user.isHidden = false;
        }
      }

      // تحديث حالة المستخدم إلى متصل
      try {
        await storage.setUserOnlineStatus(user.id, true);
      } catch (updateError) {
        console.error('خطأ في تحديث حالة المستخدم:', updateError);
      }

      try {
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const token = issueAuthToken(user.id, THIRTY_DAYS_MS);
        const maxAgeSec = Math.floor(THIRTY_DAYS_MS / 1000);
        res.setHeader('Set-Cookie', buildAuthCookieHeader(req, token, maxAgeSec));
      } catch {}
      res.json({ user: buildUserBroadcastPayload(user) });
    } catch (error) {
      console.error('Member authentication error:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // Session restore route - يسترجع المستخدم من كوكي المصادقة بدون إعادة تسجيل الدخول
  app.get('/api/auth/session', async (req, res) => {
    try {
      const token = getAuthTokenFromRequest(req as any);
      if (!token) {
        return res.status(401).json({ error: 'غير مسجل' });
      }
      const verified = verifyAuthToken(token);
      if (!verified?.userId) {
        return res.status(401).json({ error: 'غير مسجل' });
      }
      const user = await storage.getUser(verified.userId);
      if (!user) {
        return res.status(401).json({ error: 'غير مسجل' });
      }
      res.json({ user: buildUserBroadcastPayload(user) });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // User routes
  // جلب جميع المستخدمين
  app.get('/api/users', async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;

      const [users, total] = await Promise.all([
        databaseService.listUsers(limit, offset, q),
        databaseService.countUsers(q),
      ]);

      const safeUsers = users.map((user) => ({
        id: user.id,
        username: user.username,
        userType: user.userType,
        role: user.role,
        isOnline: user.isOnline,
        profileImage: user.profileImage,
        level: user.level || 1,
        gender: user.gender,
        points: user.points || 0,
        createdAt: user.createdAt,
        // توحيد الحقل: الاعتماد على lastSeen فقط
        lastSeen: user.lastSeen || user.createdAt,
        currentRoom: (user as any).currentRoom,
        profileBackgroundColor: user.profileBackgroundColor,
        profileEffect: user.profileEffect,
        isHidden: user.isHidden,
      }));

      res.json({ users: safeUsers, total, limit, offset, hasMore: offset + users.length < total });
    } catch (error) {
      console.error('خطأ في جلب جميع المستخدمين:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // جلب طاقم الإدارة فقط (المالك/الإدمن/المشرفين)
  app.get('/api/users/staff', protect.admin, async (req, res) => {
    try {
      const users = await databaseService.getStaffUsers();

      const safeUsers = users.map((user) => ({
        id: user.id,
        username: user.username,
        userType: user.userType,
        role: user.role,
        isOnline: user.isOnline,
        profileImage: user.profileImage,
        level: user.level || 1,
        gender: user.gender,
        points: user.points || 0,
        createdAt: user.createdAt,
        // توحيد الحقل: الاعتماد على lastSeen فقط
        lastSeen: (user as any).lastSeen || user.createdAt,
        currentRoom: (user as any).currentRoom,
        profileBackgroundColor: user.profileBackgroundColor,
        profileEffect: user.profileEffect,
        isHidden: user.isHidden,
      }));

      res.json({ users: safeUsers });
    } catch (error) {
      console.error('خطأ في جلب طاقم الإدارة:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  app.get('/api/users/online', async (req, res) => {
    try {
      const users = await storage.getOnlineUsers();
      const safeUsers = sanitizeUsersArray(users);
      res.json({ users: safeUsers });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // VIP endpoints
  app.get('/api/vip', async (req, res) => {
    try {
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 50));
      const users = await databaseService.getVipUsers(limit);
      const safe = users.map((u: any) => {
        const p: any = buildUserBroadcastPayload(u);
        // إظهار صورة البروفايل حتى لو كانت Base64 لأنها قائمة صغيرة (أقصى 50)
        const img = u?.profileImage;
        if (img && typeof img === 'string') {
          const versionTag = (u as any)?.avatarHash || (u as any)?.avatarVersion;
          if (!img.startsWith('data:') && versionTag && !String(img).includes('?v=')) {
            p.profileImage = `${img}?v=${versionTag}`;
          } else {
            p.profileImage = img;
          }
        }
        return p;
      });
      res.json({ users: safe });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // لائحة المرشحين (الأونر/الإدمن فقط) لإضافة VIP
  app.get('/api/vip/candidates', protect.admin, async (req, res) => {
    try {
      const list = await databaseService.getVipCandidates(200);
      const safe = list.map((u: any) => {
        const p: any = buildUserBroadcastPayload(u);
        const img = u?.profileImage;
        if (img && typeof img === 'string') {
          const versionTag = (u as any)?.avatarHash || (u as any)?.avatarVersion;
          if (!img.startsWith('data:') && versionTag && !String(img).includes('?v=')) {
            p.profileImage = `${img}?v=${versionTag}`;
          } else {
            p.profileImage = img;
          }
        }
        return p;
      });
      res.json({ users: safe });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // إضافة مستخدم إلى VIP (للأونر/الإدمن)
  const addVipSchema = z.object({
    targetUserId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
  });
  app.post('/api/vip', protect.admin, async (req, res) => {
    try {
      const parsed = addVipSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'بيانات غير صحيحة' });
      }
      const { targetUserId } = parsed.data as any;
      const adminId = (req as any).user?.id as number;
      if (!targetUserId) return res.status(400).json({ error: 'targetUserId مطلوب' });
      const success = await databaseService.addVipUser(parseInt(String(targetUserId)), adminId);
      if (!success)
        return res
          .status(500)
          .json({ error: 'تعذر الإضافة إلى VIP. تأكد من اتصال PostgreSQL ووجود الجدول.' });

      // بث تحديث VIP للجميع
      try {
        const latest = await databaseService.getVipUsers(50);
        const safe = latest.map((u: any) => {
          const p: any = buildUserBroadcastPayload(u);
          const img = u?.profileImage;
          if (img && typeof img === 'string') {
            const versionTag = (u as any)?.avatarHash || (u as any)?.avatarVersion;
            if (!img.startsWith('data:') && versionTag && !String(img).includes('?v=')) {
              p.profileImage = `${img}?v=${versionTag}`;
            } else {
              p.profileImage = img;
            }
          }
          return p;
        });
        getIO().emit('message', { type: 'vipUpdated', users: safe });
      } catch {}

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // إزالة مستخدم من VIP (للأونر/الإدمن)
  app.delete('/api/vip/:userId', protect.admin, async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      if (!userId) return res.status(400).json({ error: 'userId غير صالح' });
      const success = await databaseService.removeVipUser(userId);
      if (!success)
        return res
          .status(500)
          .json({ error: 'تعذر الحذف من VIP. تأكد من اتصال PostgreSQL ووجود الجدول.' });

      // بث تحديث VIP للجميع
      try {
        const latest = await databaseService.getVipUsers(50);
        const safe = latest.map((u: any) => {
          const p: any = buildUserBroadcastPayload(u);
          const img = u?.profileImage;
          if (img && typeof img === 'string') {
            const versionTag = (u as any)?.avatarHash || (u as any)?.avatarVersion;
            if (!img.startsWith('data:') && versionTag && !String(img).includes('?v=')) {
              p.profileImage = `${img}?v=${versionTag}`;
            } else {
              p.profileImage = img;
            }
          }
          return p;
        });
        getIO().emit('message', { type: 'vipUpdated', users: safe });
      } catch {}

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // جلب المستخدمين المحظورين
  app.get('/api/users/blocked', protect.admin, async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const offset = Math.max(0, Number(req.query.offset) || 0);

      const users = await databaseService.listUsers(limit, offset);
      const blockedUsers = users.filter((user) => user.isBlocked === true);

      const safeUsers = blockedUsers.map((user) => ({
        id: user.id,
        username: user.username,
        userType: user.userType,
        role: user.role,
        isOnline: user.isOnline,
        profileImage: user.profileImage,
        isHidden: user.isHidden,
      }));
      res.json({ users: safeUsers, limit, offset });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // Message routes
  // Validation schema for sending messages
  const sendMessageSchema = z.object({
    receiverId: z
      .union([z.number().int().positive(), z.string().regex(/^\d+$/)])
      .optional()
      .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
    content: z.string().trim().min(1, 'المحتوى مطلوب').max(SecurityConfig.MAX_MESSAGE_LENGTH),
    messageType: z.enum(['text', 'image', 'sticker']).default('text'),
    isPrivate: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((v) => v === true || v === 'true'),
    roomId: z.string().trim().max(100).default('general'),
  });
  app.get('/api/messages/public', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await storage.getPublicMessages(limit);

      // Batch fetch senders to avoid N+1
      const senderIds = Array.from(
        new Set((messages || []).map((m: any) => m.senderId).filter(Boolean))
      );
      const senders = await storage.getUsersByIds(senderIds as number[]);
      const senderMap = new Map<number, any>((senders || []).map((u: any) => [u.id, u]));
      const messagesWithUsers = (messages || []).map((msg: any) => ({
        ...msg,
        sender: msg.senderId ? senderMap.get(msg.senderId) || null : null,
      }));

      res.json({ messages: messagesWithUsers });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // ملاحظة: تم تبسيط نظام الخاص واعتماد /api/messages (isPrivate=true) بدلاً من /api/private-messages

  // POST endpoint for sending messages
  app.post('/api/messages', protect.auth, limiters.sendMessage, async (req, res) => {
    try {
      const parsed = sendMessageSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'بيانات غير صحيحة' });
      }
      const { receiverId, content, messageType, isPrivate, roomId } = parsed.data as any;

      const senderId = (req as any).user?.id;
      if (!senderId || !content?.trim()) {
        return res.status(400).json({ error: 'المحتوى مطلوب' });
      }

      // التحقق من المرسل
      const sender = await storage.getUser(senderId);
      if (!sender) {
        return res.status(404).json({ error: 'المرسل غير موجود' });
      }

      // فحص الكتم للرسائل العامة
      if (!isPrivate && sender.isMuted) {
        return res.status(403).json({ error: 'أنت مكتوم ولا يمكنك إرسال رسائل عامة' });
      }

      // التحقق من المستقبل للرسائل الخاصة
      if (isPrivate && receiverId) {
        const receiver = await storage.getUser(receiverId);
        if (!receiver) {
          return res.status(404).json({ error: 'المستقبل غير موجود' });
        }
      }

      // إنشاء الرسالة
      const messageData = {
        senderId,
        receiverId: isPrivate ? receiverId : null,
        content: content.trim(),
        messageType,
        isPrivate,
        roomId: isPrivate ? null : roomId, // للرسائل العامة فقط
      };

      const message = await storage.createMessage(messageData);

      // إرسال الرسالة عبر Socket.IO
      if (isPrivate && receiverId) {
        // رسالة خاصة - حدث موحّد فقط
        getIO()
          .to(receiverId.toString())
          .emit('privateMessage', { message: { ...message, sender } });
        getIO()
          .to(senderId.toString())
          .emit('privateMessage', { message: { ...message, sender } });

        // تم إيقاف إنشاء إشعار الرسائل: تبويب الإشعارات لا يعرض إشعارات الرسائل
      } else {
        // رسالة عامة
        getIO().emit('message', {
          envelope: {
            type: 'newMessage',
            message: { ...message, sender },
          },
        });
      }

      res.json({
        success: true,
        message: 'تم إرسال الرسالة بنجاح',
        data: { ...message, sender },
      });
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // Profile picture upload (members only)
  app.post('/api/users/:id/profile-image', protect.ownership, async (req, res) => {
    try {
      const userId = parseEntityId(req.params.id as any).id as number;
      const { imageData } = req.body;

      if (!imageData) {
        return res.status(400).json({ error: 'صورة مطلوبة' });
      }

      // Check if user is a member
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      // Allow members and owners to upload profile pictures (not guests)
      if (existingUser.userType === 'guest') {
        return res.status(403).json({
          error: 'رفع الصور الشخصية متاح للأعضاء فقط',
          userType: existingUser.userType,
          userId: userId,
        });
      }

      const user = await storage.updateUser(userId, { profileImage: imageData });
      if (!user) {
        return res.status(500).json({ error: 'فشل في تحديث الصورة' });
      }

      // بث موجه للمستخدم + بث خفيف للجميع
      emitUserUpdatedToUser(userId, user);
      emitUserUpdatedToAll(user);

      res.json({ user: buildUserBroadcastPayload(user), message: 'تم تحديث الصورة الشخصية بنجاح' });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // Update username color
  app.post('/api/users/:userId/color', protect.ownership, async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      const { color } = req.body;

      if (!userId || !color) {
        return res.status(400).json({ message: 'معرف المستخدم واللون مطلوبان' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'المستخدم غير موجود' });
      }

      // Update username color (open to all members)
      await storage.updateUser(userId, { usernameColor: color });

      // بث خفيف مخصص للغرف + كامل لصاحب التعديل
      const updated = await storage.getUser(userId);
      emitUserUpdatedToUser(userId, updated);
      await emitToUserRooms(userId, { type: 'usernameColorChanged', userId, color });

      res.json({
        success: true,
        message: 'تم تحديث لون الاسم بنجاح',
        color,
      });
    } catch (error) {
      console.error('Error updating username color:', error);
      res.status(500).json({ message: 'خطأ في تحديث لون الاسم' });
    }
  });


  // socket.on('privateMessage', async (data) => {
  //   console.warn('[Deprecated] privateMessage handler is disabled. Use DM module events instead.');
  // });

  // بدء التنظيف الدوري لقاعدة البيانات (فقط عند اتصال القاعدة)
  let dbCleanupInterval: NodeJS.Timeout | null = null;
  try {
    const { getDatabaseStatus } = await import('./database-adapter');
    if (getDatabaseStatus().connected) {
      dbCleanupInterval = databaseCleanup.startPeriodicCleanup(6); // كل 6 ساعات
    }
  } catch {}

  // تنظيف فوري عند بدء الخادم
  setTimeout(async () => {
    await databaseCleanup.performFullCleanup();

    // عرض الإحصائيات
    const stats = await databaseCleanup.getDatabaseStats();
  }, 5000); // بعد 5 ثوانٍ من بدء الخادم

  // تنظيف الفترة الزمنية عند إغلاق الخادم
  process.on('SIGINT', () => {
    if (dbCleanupInterval) clearInterval(dbCleanupInterval);
    process.exit(0);
  });

  // Ensure cleanup on SIGTERM as well
  process.on('SIGTERM', () => {
    if (dbCleanupInterval) clearInterval(dbCleanupInterval);
    process.exit(0);
  });

  // Friend system APIs

  // البحث عن المستخدمين
  app.get('/api/users/search', async (req, res) => {
    try {
      const { q, userId } = req.query;

      if (!q || !userId) {
        return res.status(400).json({ error: 'معاملات البحث مطلوبة' });
      }

      const limit = 10;
      const users = await databaseService.listUsers(limit, 0, String(q));
      const filteredUsers = users.filter((user) => user.id !== parseInt(userId as string));

      res.json({ users: filteredUsers });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // إرسال طلب صداقة
  app.post('/api/friend-requests', async (req, res) => {
    try {
      const { senderId, receiverId } = req.body;

      if (!senderId || !receiverId) {
        return res.status(400).json({ error: 'معلومات المرسل والمستقبل مطلوبة' });
      }

      if (senderId === receiverId) {
        return res.status(400).json({ error: 'لا يمكنك إرسال طلب صداقة لنفسك' });
      }

      // التحقق من وجود طلب سابق
      const existingRequest = await friendService.getFriendRequest(senderId, receiverId);
      if (existingRequest) {
        return res.status(400).json({ error: 'طلب الصداقة موجود بالفعل' });
      }

      // التحقق من الصداقة الموجودة
      const friendship = await friendService.getFriendship(senderId, receiverId);
      if (friendship) {
        return res.status(400).json({ error: 'أنتما أصدقاء بالفعل' });
      }

      // منع إرسال طلب صداقة إذا كان المستقبل قد تجاهل المرسل
      try {
        const ignoredByReceiver: number[] = await storage.getIgnoredUsers(receiverId);
        if (Array.isArray(ignoredByReceiver) && ignoredByReceiver.includes(senderId)) {
          return res
            .status(403)
            .json({ error: 'لا يمكن إرسال طلب صداقة: هذا المستخدم قام بتجاهلك' });
        }
      } catch (e) {
        console.warn('تحذير: تعذر التحقق من قائمة التجاهل للمستقبل:', e);
      }

      const request = await friendService.createFriendRequest(senderId, receiverId);
      // إرسال إشعار عبر WebSocket
      const sender = await storage.getUser(senderId);
      getIO().emit('message', {
        type: 'friendRequestReceived',
        targetUserId: receiverId,
        senderName: sender?.username,
        senderId: senderId,
      });

      // إنشاء إشعار حقيقي في قاعدة البيانات
      await notificationService.createFriendRequestNotification(
        receiverId,
        sender?.username || 'مستخدم مجهول',
        senderId
      );

      res.json({ message: 'تم إرسال طلب الصداقة', request });
    } catch (error) {
      console.error('❌ Friend request error:', error);
      console.error('Stack trace:', (error as Error).stack);
      res.status(500).json({ error: 'خطأ في الخادم', details: (error as Error).message });
    }
  });

  // إرسال طلب صداقة باستخدام اسم المستخدم
  app.post('/api/friend-requests/by-username', async (req, res) => {
    try {
      const { senderId, targetUsername } = req.body;

      if (!senderId || !targetUsername) {
        return res.status(400).json({ error: 'معرف المرسل واسم المستخدم المستهدف مطلوبان' });
      }

      // البحث عن المستخدم المستهدف
      const targetUser = await storage.getUserByUsername(targetUsername);
      if (!targetUser) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      if (senderId === targetUser.id) {
        return res.status(400).json({ error: 'لا يمكنك إرسال طلب صداقة لنفسك' });
      }

      // التحقق من وجود طلب سابق
      const existingRequest = await friendService.getFriendRequest(senderId, targetUser.id);
      if (existingRequest) {
        return res.status(400).json({ error: 'طلب الصداقة موجود بالفعل' });
      }

      // التحقق من الصداقة الموجودة
      const friendship = await friendService.getFriendship(senderId, targetUser.id);
      if (friendship) {
        return res.status(400).json({ error: 'أنتما أصدقاء بالفعل' });
      }

      // منع إرسال طلب صداقة إذا كان المستهدف قد تجاهل المُرسل
      try {
        const ignoredByTarget: number[] = await storage.getIgnoredUsers(targetUser.id);
        if (Array.isArray(ignoredByTarget) && ignoredByTarget.includes(senderId)) {
          return res
            .status(403)
            .json({ error: 'لا يمكن إرسال طلب صداقة: هذا المستخدم قام بتجاهلك' });
        }
      } catch (e) {
        console.warn('تحذير: تعذر التحقق من قائمة التجاهل للمستخدم المستهدف:', e);
      }

      const request = await friendService.createFriendRequest(senderId, targetUser.id);

      // إرسال إشعار عبر WebSocket
      const sender = await storage.getUser(senderId);
      getIO().emit('message', {
        type: 'friendRequestReceived',
        targetUserId: targetUser.id,
        senderName: sender?.username,
        senderId: senderId,
      });

      // إنشاء إشعار حقيقي في قاعدة البيانات
      await notificationService.createFriendRequestNotification(
        targetUser.id,
        sender?.username || 'مستخدم مجهول',
        senderId
      );

      res.json({ message: 'تم إرسال طلب الصداقة', request });
    } catch (error) {
      console.error('خطأ في إرسال طلب الصداقة:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // الحصول على جميع طلبات الصداقة للمستخدم (واردة + صادرة)
  app.get('/api/friend-requests/:userId', async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      const [incoming, outgoing] = await Promise.all([
        friendService.getIncomingFriendRequests(userId),
        friendService.getOutgoingFriendRequests(userId),
      ]);
      res.json({ incoming, outgoing });
    } catch (error) {
      console.error('خطأ في جلب طلبات الصداقة:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // الحصول على طلبات الصداقة الواردة
  app.get('/api/friend-requests/incoming/:userId', async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      const requests = await friendService.getIncomingFriendRequests(userId);
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // الحصول على طلبات الصداقة الصادرة
  app.get('/api/friend-requests/outgoing/:userId', async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      const requests = await friendService.getOutgoingFriendRequests(userId);
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // قبول طلب صداقة
  app.post('/api/friend-requests/:requestId/accept', async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { userId } = req.body;

      const request = await friendService.getFriendRequestById(requestId);
      if (!request || request.friendId !== userId) {
        return res.status(403).json({ error: 'غير مسموح' });
      }

      // قبول طلب الصداقة وإضافة الصداقة
      await friendService.acceptFriendRequest(requestId);
      await friendService.addFriend(request.userId, request.friendId);

      // الحصول على بيانات المستخدمين
      const receiver = await storage.getUser(userId);
      const sender = await storage.getUser(request.userId);

      // إرسال إشعار WebSocket لتحديث قوائم الأصدقاء
      getIO().emit('message', {
        type: 'friendAdded',
        targetUserId: request.userId,
        friendId: request.friendId,
        friendName: receiver?.username,
      });

      getIO().emit('message', {
        type: 'friendAdded',
        targetUserId: request.friendId,
        friendId: request.userId,
        friendName: sender?.username,
      });
      getIO().emit('message', {
        type: 'friendRequestAccepted',
        targetUserId: request.userId,
        senderName: receiver?.username,
      });

      // إنشاء إشعار حقيقي في قاعدة البيانات
      await notificationService.createFriendAcceptedNotification(
        request.userId,
        receiver?.username || 'مستخدم مجهول',
        userId
      );

      res.json({ message: 'تم قبول طلب الصداقة' });
    } catch (error) {
      console.error('خطأ في قبول طلب الصداقة:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // رفض طلب صداقة
  app.post('/api/friend-requests/:requestId/decline', async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { userId } = req.body;

      const request = await friendService.getFriendRequestById(requestId);
      if (!request || request.friendId !== userId) {
        return res.status(403).json({ error: 'غير مسموح' });
      }

      await friendService.declineFriendRequest(requestId);
      res.json({ message: 'تم رفض طلب الصداقة' });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // إلغاء طلب صداقة
  app.post('/api/friend-requests/:requestId/cancel', async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { userId } = req.body;

      const request = await friendService.getFriendRequestById(requestId);
      if (!request || request.userId !== userId) {
        return res.status(403).json({ error: 'غير مسموح' });
      }

      await friendService.deleteFriendRequest(requestId);
      res.json({ message: 'تم إلغاء طلب الصداقة' });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // تجاهل طلب صداقة
  app.post('/api/friend-requests/:requestId/ignore', async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { userId } = req.body;

      const request = await friendService.getFriendRequestById(requestId);
      if (!request || request.friendId !== userId) {
        return res.status(403).json({ error: 'غير مسموح' });
      }

      await friendService.ignoreFriendRequest(requestId);
      res.json({ message: 'تم تجاهل طلب الصداقة' });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // الحصول على قائمة الأصدقاء

  // API routes for spam protection and reporting

  // إضافة تبليغ
  app.post('/api/reports', async (req, res) => {
    try {
      const { reporterId, reportedUserId, reason, content, messageId } = req.body;

      if (!reporterId || !reportedUserId || !reason || !content) {
        return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
      }

      // منع البلاغ على الإدمن والمشرف والمالك
      const reportedUser = await storage.getUser(reportedUserId);
      if (reportedUser && ['admin', 'moderator', 'owner'].includes(reportedUser.userType)) {
        return res.status(403).json({
          error: 'لا يمكن الإبلاغ عن أعضاء الإدارة (المشرف، الإدمن، المالك)',
        });
      }

      const report = spamProtection.addReport(
        reporterId,
        reportedUserId,
        reason,
        content,
        messageId
      );
      res.json({ report, message: 'تم إرسال التبليغ بنجاح' });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // الحصول على التبليغات المعلقة (للمشرفين)
  app.get('/api/reports/pending', async (req, res) => {
    try {
      const { userId } = req.query;

      // التحقق من أن المستخدم مشرف
      const user = await storage.getUser(parseInt(userId as string));
      if (!user || user.userType !== 'owner') {
        return res.status(403).json({ error: 'غير مسموح' });
      }

      const reports = spamProtection.getPendingReports();
      res.json({ reports });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // مراجعة تبليغ (للمشرفين)
  app.patch('/api/reports/:reportId', async (req, res) => {
    try {
      const { reportId } = req.params;
      const { action, userId } = req.body;

      // التحقق من أن المستخدم مشرف
      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'owner') {
        return res.status(403).json({ error: 'غير مسموح' });
      }

      const success = spamProtection.reviewReport(parseInt(reportId), action);
      if (success) {
        res.json({ message: 'تم مراجعة التبليغ' });
      } else {
        res.status(404).json({ error: 'التبليغ غير موجود' });
      }
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // الحصول على حالة المستخدم
  app.get('/api/users/:userId/spam-status', async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      const status = spamProtection.getUserStatus(userId);
      res.json({ status });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // إعادة تعيين نقاط السبام (للمشرفين)
  app.post('/api/users/:userId/reset-spam', async (req, res) => {
    try {
      const { userId } = req.params;
      const { adminId } = req.body;

      // التحقق من أن المستخدم مشرف
      const admin = await storage.getUser(adminId);
      if (!admin || admin.userType !== 'owner') {
        return res.status(403).json({ error: 'غير مسموح' });
      }

      spamProtection.resetUserSpamScore(parseInt(userId));
      res.json({ message: 'تم إعادة تعيين نقاط السبام' });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // إحصائيات السبام (للمشرفين)
  app.get('/api/spam-stats', async (req, res) => {
    try {
      const { userId } = req.query;

      // التحقق من userId
      const parsedUserId = userId ? parseInt(userId as string) : null;
      if (!parsedUserId || isNaN(parsedUserId)) {
        console.error('Invalid userId in spam-stats:', userId);
        return res.status(400).json({ error: 'معرف المستخدم غير صحيح' });
      }

      // التحقق من أن المستخدم مشرف أو owner
      const user = await storage.getUser(parsedUserId);
      if (!user) {
        console.error('User not found for spam-stats:', parsedUserId);
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      if (user.userType !== 'owner' && user.userType !== 'admin') {
        console.error('Unauthorized access to spam-stats by user:', parsedUserId, 'type:', user.userType);
        return res.status(403).json({ error: 'غير مسموح - يجب أن تكون مشرف أو مالك' });
      }

      const stats = spamProtection.getStats();
      res.json({ stats });
    } catch (error) {
      console.error('Error in spam-stats:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // Moderation routes
  // DUPLICATE BLOCK REMOVED: Using the canonical moderation endpoints defined earlier in the file.

  app.get('/api/moderation/log', protect.admin, async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const user = await storage.getUser(userId);

      // للإدمن والمالك فقط
      if (!user || (user.userType !== 'owner' && user.userType !== 'admin')) {
        return res.status(403).json({ error: 'غير مسموح لك بالوصول - للإدمن والمالك فقط' });
      }

      const log = moderationSystem.getModerationLog();
      res.json({ log });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // Removed second duplicate moderation actions endpoint - kept the more complete one

  // Friends routes
  app.get('/api/friends/:userId', async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      const friends = await friendService.getFriends(userId);

      res.json({ friends });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  app.delete('/api/friends/:userId/:friendId', async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      const friendId = parseEntityId(req.params.friendId as any).id as number;

      const success = await friendService.removeFriend(userId, friendId);

      if (success) {
        res.json({ message: 'تم حذف الصديق' });
      } else {
        res.status(404).json({ error: 'الصداقة غير موجودة' });
      }
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // إضافة endpoint لوحة إجراءات المشرفين
  app.get('/api/moderation/actions', protect.admin, async (req, res) => {
    try {
      const { userId } = req.query;
      const user = await storage.getUser(Number(userId));

      // التحقق من أن المستخدم مشرف أو مالك
      if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
        return res.status(403).json({ error: 'غير مسموح - للمشرفين فقط' });
      }

      const now = new Date();
      const toDate = (d?: Date | string | null): Date | null => {
        if (!d) return null;
        return d instanceof Date ? d : new Date(d);
      };

      const rawActions = moderationSystem.getModerationLog();
      const actions = [] as any[];

      for (const action of rawActions) {
        const moderator = await storage.getUser(action.moderatorId);
        const target = await storage.getUser(action.targetUserId);

        let isActive = false;
        if (target) {
          if (action.type === 'block') {
            isActive = !!target.isBlocked;
          } else if (action.type === 'mute') {
            const me = toDate(target.muteExpiry as any);
            isActive = !!target.isMuted && !!me && me.getTime() > now.getTime();
          } else if (action.type === 'ban') {
            const be = toDate(target.banExpiry as any);
            isActive = !!target.isBanned && !!be && be.getTime() > now.getTime();
          }
        }

        actions.push({
          ...action,
          moderatorName: moderator?.username || 'مجهول',
          targetName: target?.username || 'مجهول',
          isActive,
        });
      }

      res.json({ actions });
    } catch (error) {
      console.error('خطأ في الحصول على تاريخ الإجراءات:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // إضافة endpoint لسجل البلاغات
  app.get('/api/reports', protect.admin, async (req, res) => {
    try {
      const { userId } = req.query;
      const user = await storage.getUser(Number(userId));

      if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
        return res.status(403).json({ error: 'غير مسموح - للمشرفين فقط' });
      }

      const reports = spamProtection
        .getPendingReports()
        .concat(spamProtection.getReviewedReports())
        .map((report) => ({
          ...report,
          reporterName: '',
          reportedUserName: '',
        }));

      // إضافة أسماء المستخدمين للبلاغات
      for (const report of reports) {
        const reporter = await storage.getUser(report.reporterId);
        const reported = await storage.getUser(report.reportedUserId);
        report.reporterName = reporter?.username || 'مجهول';
        report.reportedUserName = reported?.username || 'مجهول';
      }

      res.json(reports);
    } catch (error) {
      console.error('خطأ في الحصول على البلاغات:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // إضافة endpoint لمراجعة البلاغات
  app.post('/api/reports/:id/review', protect.admin, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const { action, moderatorId } = req.body;

      const user = await storage.getUser(moderatorId);
      if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
        return res.status(403).json({ error: 'غير مسموح' });
      }

      const success = spamProtection.reviewReport(reportId, action);

      if (success) {
        // بث تحديث عدد البلاغات المعلقة للمشرفين فورياً
        try {
          const stats = spamProtection.getStats();
          getIO().emit('message', { type: 'spamStatsUpdated', stats });
        } catch {}
        res.json({ message: 'تمت مراجعة البلاغ' });
      } else {
        res.status(404).json({ error: 'البلاغ غير موجود' });
      }
    } catch (error) {
      console.error('خطأ في مراجعة البلاغ:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // إضافة endpoint للإجراءات النشطة
  app.get('/api/moderation/active-actions', protect.admin, async (req, res) => {
    try {
      const { userId } = req.query;
      const user = await storage.getUser(Number(userId));

      if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
        return res.status(403).json({ error: 'غير مسموح - للمشرفين فقط' });
      }

      const now = new Date();
      const toDate = (d?: Date | string | null): Date | null => {
        if (!d) return null;
        return d instanceof Date ? d : new Date(d);
      };

      const allActions = moderationSystem.getModerationLog();
      const activeActions: any[] = [];

      for (const action of allActions) {
        if (action.type !== 'mute' && action.type !== 'block') continue;
        const moderator = await storage.getUser(action.moderatorId);
        const target = await storage.getUser(action.targetUserId);

        let isActive = false;
        if (target) {
          if (action.type === 'block') {
            isActive = !!target.isBlocked;
          } else if (action.type === 'mute') {
            const me = toDate(target.muteExpiry as any);
            isActive = !!target.isMuted && !!me && me.getTime() > now.getTime();
          }
        }

        if (isActive) {
          activeActions.push({
            ...action,
            moderatorName: moderator?.username || 'مجهول',
            targetName: target?.username || 'مجهول',
            isActive: true,
          });
        }
      }

      res.json({ actions: activeActions });
    } catch (error) {
      console.error('خطأ في الحصول على الإجراءات النشطة:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // Security API routes
  app.use('/api/security', securityApiRoutes);

  // تمت إزالة نظام المسارات المعيارية v2 غير المستخدم لتفادي الازدواجية

  // إخفاء/إظهار من قائمة المتصلين للجميع (للإدمن/المالك فقط)
  app.post('/api/users/:userId/hide-online', async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
      if (user.userType !== 'admin' && user.userType !== 'owner') {
        return res.status(403).json({ error: 'غير مسموح' });
      }
      await storage.setUserHiddenStatus(userId, true);
      try { await updateConnectedUserCache(userId, { isHidden: true }); } catch {}
      const updated = await storage.getUser(userId);
      // بث تحديث حالة المستخدم (يتضمن isHidden بعد تعديل buildUserBroadcastPayload)
      try { emitUserUpdatedToUser(userId, updated); } catch {}
      try { emitUserUpdatedToAll(updated); } catch {}
      // تحديث قوائم الغرف التي يتواجد فيها المستخدم فوراً
      try {
        const rooms = getUserActiveRooms(userId);
        if (Array.isArray(rooms) && rooms.length > 0) {
          for (const r of rooms) { try { await emitOnlineUsersForRoom(r); } catch {} }
        } else {
          // تحديث الغرفة العامة كحل احتياطي
          try { await emitOnlineUsersForRoom('general'); } catch {}
        }
      } catch {}
      res.json({ success: true, isHidden: true, message: 'تم إخفاؤك من قائمة المتصلين' });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  app.post('/api/users/:userId/show-online', async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
      if (user.userType !== 'admin' && user.userType !== 'owner') {
        return res.status(403).json({ error: 'غير مسموح' });
      }
      await storage.setUserHiddenStatus(userId, false);
      try { await updateConnectedUserCache(userId, { isHidden: false }); } catch {}
      const updated = await storage.getUser(userId);
      // بث تحديث حالة المستخدم
      try { emitUserUpdatedToUser(userId, updated); } catch {}
      try { emitUserUpdatedToAll(updated); } catch {}
      // تحديث قوائم الغرف التي يتواجد فيها المستخدم فوراً
      try {
        const rooms = getUserActiveRooms(userId);
        if (Array.isArray(rooms) && rooms.length > 0) {
          for (const r of rooms) { try { await emitOnlineUsersForRoom(r); } catch {} }
        } else {
          try { await emitOnlineUsersForRoom('general'); } catch {}
        }
      } catch {}
      res.json({ success: true, isHidden: false, message: 'تم إظهارك في قائمة المتصلين' });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  app.post('/api/users/:userId/ignore/:targetId', async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      const targetId = parseEntityId(req.params.targetId as any).id as number;

      await storage.addIgnoredUser(userId, targetId);

      res.json({ success: true, message: 'تم تجاهل المستخدم' });
    } catch (error) {
      console.error('خطأ في تجاهل المستخدم:', error);
      res.status(500).json({ error: 'فشل في تجاهل المستخدم' });
    }
  });

  app.delete('/api/users/:userId/ignore/:targetId', async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      const targetId = parseEntityId(req.params.targetId as any).id as number;

      await storage.removeIgnoredUser(userId, targetId);

      res.json({ success: true, message: 'تم إلغاء تجاهل المستخدم' });
    } catch (error) {
      console.error('خطأ في إلغاء تجاهل المستخدم:', error);
      res.status(500).json({ error: 'فشل في إلغاء تجاهل المستخدم' });
    }
  });

  app.get('/api/users/:userId/ignored', async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      const detailed = String(req.query.detailed || '').toLowerCase() === 'true';
      if (detailed) {
        const users = await storage.getIgnoredUsersDetailed(userId);
        return res.json({ users });
      }
      const ignoredUsers = await storage.getIgnoredUsers(userId);
      return res.json({ ignoredUsers });
    } catch (error) {
      console.error('خطأ في جلب المستخدمين المتجاهلين:', error);
      res.status(500).json({ error: 'فشل في جلب المستخدمين المتجاهلين' });
    }
  });

  // User Update Route with Theme Support
  app.put('/api/users/:id', protect.ownership, async (req, res) => {
    try {
      const { id } = req.params;
      const idNum = parseInt(id);
      if (isNaN(idNum) || idNum <= 0) {
        return res.status(400).json({ error: 'User ID must be a valid number' });
      }

      const updates = req.body || {};

      // التحقق من الصلاحيات للتأثيرات والألوان
      if (updates.profileBackgroundColor || updates.profileEffect) {
        const user = await storage.getUser(idNum);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.userType !== 'owner' && user.userType !== 'admin' && user.userType !== 'moderator') {
          return res.status(403).json({ error: 'هذه الميزة متاحة للمشرفين فقط' });
        }
      }

      // Normalize profileBackgroundColor: allow full linear-gradient strings, otherwise sanitize HEX or fallback
      const normalizedUpdates: any = { ...updates };
      if (typeof normalizedUpdates.profileBackgroundColor === 'string') {
        const str = String(normalizedUpdates.profileBackgroundColor).trim();
        if (str.startsWith('linear-gradient(')) {
          // keep gradient as-is
          normalizedUpdates.profileBackgroundColor = str;
        } else if (/^#[0-9A-Fa-f]{6}$/.test(str)) {
          // valid HEX
          normalizedUpdates.profileBackgroundColor = str;
        } else if (/#\s*[0-9A-Fa-f]{6}/.test(str)) {
          // extract first HEX if mixed content
          const firstHex = str.match(/#[0-9A-Fa-f]{6}/)?.[0];
          normalizedUpdates.profileBackgroundColor = firstHex || '#2a2a2a';
        } else {
          // fallback to a safe default color if invalid
          normalizedUpdates.profileBackgroundColor = '#2a2a2a';
        }
      }

      const user = await storage.updateUser(idNum, normalizedUpdates);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update connected cache copy in realtime module if needed (no-op here)
      try {
        await updateConnectedUserCache(user);
      } catch {}

      // بث خفيف للجميع + بث كامل لصاحب التعديل
      emitUserUpdatedToAll(user);
      emitUserUpdatedToUser(idNum, user);

      const payload = buildUserBroadcastPayload(user);
      res.json(payload);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Notifications API
  app.get('/api/notifications/:userId', async (req, res) => {
    try {
      // Check database availability
      if (!db || dbType === 'disabled') {
        return res.json({ notifications: [] });
      }

      const userId = parseEntityId(req.params.userId as any).id as number;

      // التحقق من صحة userId
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ error: 'معرف المستخدم غير صحيح' });
      }

      const notifications = await storage.getUserNotifications(userId);
      res.json({ notifications });
    } catch (error) {
      console.error('خطأ في جلب الإشعارات:', error);
      res.status(500).json({ error: 'خطأ في جلب الإشعارات' });
    }
  });

  // إضافة endpoint للإشعارات بدون userId (للحالات التي تستدعى بدون معامل)
  app.get('/api/notifications', async (req, res) => {
    try {
      // Check database availability
      if (!db || dbType === 'disabled') {
        return res.json({ notifications: [] });
      }

      const { userId } = req.query;

      if (!userId || isNaN(parseInt(userId as string))) {
        return res.status(400).json({ error: 'معرف المستخدم مطلوب وغير صحيح' });
      }

      const userIdInt = parseInt(userId as string);
      const notifications = await storage.getUserNotifications(userIdInt);
      res.json({ notifications });
    } catch (error) {
      console.error('خطأ في جلب الإشعارات:', error);
      res.status(500).json({ error: 'خطأ في جلب الإشعارات' });
    }
  });

  app.post('/api/notifications', async (req, res) => {
    try {
      const { userId, type, title, message, data } = req.body;

      const notification = await storage.createNotification({
        userId,
        type,
        title,
        message,
        data,
      });

      // إرسال إشعار فوري عبر WebSocket
      try {
        getIO().to(userId.toString()).emit('newNotification', { notification });
      } catch {}

      res.json({ notification });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في إنشاء الإشعار' });
    }
  });

  app.put('/api/notifications/:id/read', async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const success = await storage.markNotificationAsRead(notificationId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في تحديث الإشعار' });
    }
  });

  app.put('/api/notifications/user/:userId/read-all', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const success = await storage.markAllNotificationsAsRead(userId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في تحديث الإشعارات' });
    }
  });

  app.delete('/api/notifications/:id', async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const success = await storage.deleteNotification(notificationId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في حذف الإشعار' });
    }
  });

  app.get('/api/notifications/:userId/unread-count', async (req, res) => {
    try {
      // Check database availability
      if (!db || dbType === 'disabled') {
        return res.json({ count: 0 });
      }

      const userId = parseEntityId(req.params.userId as any).id as number;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في جلب عدد الإشعارات' });
    }
  });

  // Alternative endpoint with userId in query parameter (for client compatibility)
  app.get('/api/notifications/unread-count', async (req, res) => {
    try {
      // Check database availability
      if (!db || dbType === 'disabled') {
        return res.json({ count: 0 });
      }

      const userId = req.query.userId ? (parseEntityId(req.query.userId as any).id as number) : null;
      if (!userId || isNaN(userId)) {
        console.error('Invalid userId in notifications/unread-count:', req.query.userId);
        return res.status(400).json({ error: 'معرف المستخدم غير صحيح أو مفقود' });
      }

      // التحقق من وجود المستخدم
      const user = await storage.getUser(userId);
      if (!user) {
        console.error('User not found for notifications:', userId);
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count: count || 0 });
    } catch (error) {
      console.error('Error in notifications/unread-count:', error);
      res.status(500).json({ error: 'خطأ في جلب عدد الإشعارات' });
    }
  });

  // حذف موسيقى البروفايل
  app.delete('/api/users/:userId/profile-music', protect.ownership, async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'معرّف غير صالح' });
      }
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

      // حذف الملف الفعلي من الخادم إن وجد
      if (user.profileMusicUrl) {
        const uploadsRoot = path.join(process.cwd(), 'client', 'public');
        const relative = String(user.profileMusicUrl).replace(/^\/+/, '');
        const filePath = path.resolve(uploadsRoot, relative);
        try {
          if (filePath.startsWith(uploadsRoot)) {
            await fsp.unlink(filePath);
            console.log(`✅ تم حذف ملف الموسيقى: ${filePath}`);
          } else {
            console.warn('⚠️ تم تجاهل حذف ملف خارج مجلد الرفع:', filePath);
          }
        } catch (unlinkErr) {
          console.warn(`⚠️ تعذر حذف ملف الموسيقى: ${filePath}`, unlinkErr);
          // لا نوقف العملية إذا فشل حذف الملف
        }
      }

      const updated = await storage.updateUser(userId, {
        profileMusicUrl: null as any,
        profileMusicTitle: null as any,
        profileMusicEnabled: false as any,
      } as any);
      if (!updated) return res.status(500).json({ error: 'فشل تحديث المستخدم' });

      try { 
        const sanitizedUser = sanitizeUserData(updated);
        emitUserUpdatedToUser(userId, sanitizedUser); 
        emitUserUpdatedToAll(sanitizedUser); 
        
        console.log(`✅ تم بث حذف موسيقى البروفايل للمستخدم ${userId}`);
      } catch (broadcastErr) {
        console.error('❌ خطأ في بث حذف الموسيقى:', broadcastErr);
      }
      res.json({ success: true });
    } catch (e) {
      console.error('خطأ في حذف موسيقى البروفايل:', e);
      
      // معالجة أفضل للأخطاء
      let errorMessage = 'خطأ في حذف موسيقى البروفايل';
      let statusCode = 500;
      
      if (e instanceof Error) {
        if (e.message.includes('not found') || e.message.includes('غير موجود')) {
          errorMessage = 'الموسيقى غير موجودة';
          statusCode = 404;
        } else if (e.message.includes('permission') || e.message.includes('صلاحية')) {
          errorMessage = 'ليس لديك صلاحية لحذف هذه الموسيقى';
          statusCode = 403;
        } else {
          errorMessage = e.message;
        }
      }
      
      res.status(statusCode).json({ 
        success: false,
        error: errorMessage 
      });
    }
  });

  // Update user profile - General endpoint - محسّن مع معالجة أفضل للأخطاء
  app.post('/api/users/update-profile', protect.ownership, async (req, res) => {
    try {
      const { userId, ...updates } = req.body;

      if (!userId) {
        console.error('❌ معرف المستخدم مفقود');
        return res.status(400).json({
          error: 'معرف المستخدم مطلوب',
          received: { userId, type: typeof userId },
        });
      }

      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        console.error('❌ معرف المستخدم ليس رقم:', userId);
        return res.status(400).json({
          error: 'معرف المستخدم يجب أن يكون رقم صحيح',
          received: { userId, type: typeof userId },
        });
      }

      const user = await storage.getUser(userIdNum);
      if (!user) {
        console.error('❌ المستخدم غير موجود:', userIdNum);
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      // التحقق من صحة البيانات المُدخلة
      const validatedUpdates: any = {};

      if (updates.username !== undefined) {
        if (typeof updates.username !== 'string' || updates.username.trim().length === 0) {
          return res.status(400).json({ error: 'اسم المستخدم يجب أن يكون نص غير فارغ' });
        }
        const uname = updates.username.trim();
        if (uname.length > 14) {
          return res.status(400).json({ error: 'اسم المستخدم يجب ألا يتجاوز 14 حرف' });
        }
        validatedUpdates.username = uname;
      }

      if (updates.status !== undefined) {
        if (typeof updates.status !== 'string') {
          return res.status(400).json({ error: 'الحالة يجب أن تكون نص' });
        }
        validatedUpdates.status = updates.status.trim();
      }

      if (updates.gender !== undefined) {
        const validGenders = ['ذكر', 'أنثى', ''];
        if (!validGenders.includes(updates.gender)) {
          return res.status(400).json({
            error: 'الجنس يجب أن يكون "ذكر" أو "أنثى"',
            received: updates.gender,
            valid: validGenders,
          });
        }
        validatedUpdates.gender = updates.gender;
      }

      if (updates.country !== undefined) {
        if (typeof updates.country !== 'string') {
          return res.status(400).json({ error: 'البلد يجب أن يكون نص' });
        }
        validatedUpdates.country = updates.country.trim();
      }

      if (updates.age !== undefined) {
        let age;
        if (typeof updates.age === 'string') {
          age = parseInt(updates.age);
        } else if (typeof updates.age === 'number') {
          age = updates.age;
        } else {
          return res.status(400).json({
            error: 'العمر يجب أن يكون رقم',
            received: { age: updates.age, type: typeof updates.age },
          });
        }

        if (isNaN(age) || age < 18 || age > 120) {
          return res.status(400).json({
            error: 'العمر يجب أن يكون رقم بين 18 و 120',
            received: age,
          });
        }
        validatedUpdates.age = age;
      }

      if (updates.relation !== undefined) {
        if (typeof updates.relation !== 'string') {
          return res.status(400).json({ error: 'الحالة الاجتماعية يجب أن تكون نص' });
        }
        validatedUpdates.relation = updates.relation.trim();
      }

      if (updates.bio !== undefined) {
        if (typeof updates.bio !== 'string') {
          return res.status(400).json({ error: 'السيرة الذاتية يجب أن تكون نص' });
        }
        if (updates.bio.length > 500) {
          return res.status(400).json({ error: 'السيرة الذاتية يجب أن تكون أقل من 500 حرف' });
        }
        validatedUpdates.bio = updates.bio.trim();
      }

      // دعم حقول موسيقى البروفايل
      // يمنع تعديل رابط الموسيقى يدوياً — يجب الرفع عبر /api/upload/profile-music
      if (updates.profileMusicUrl !== undefined) {
        return res.status(400).json({ error: 'غير مسموح بتحديث رابط الموسيقى يدوياً. استخدم رفع الملف.' });
      }
      if (updates.profileMusicTitle !== undefined) {
        if (typeof updates.profileMusicTitle !== 'string' || updates.profileMusicTitle.length > 200) {
          return res.status(400).json({ error: 'عنوان الموسيقى غير صالح' });
        }
        validatedUpdates.profileMusicTitle = updates.profileMusicTitle.trim();
      }
      if (updates.profileMusicEnabled !== undefined) {
        validatedUpdates.profileMusicEnabled = Boolean(updates.profileMusicEnabled);
      }
      if (updates.profileMusicVolume !== undefined) {
        let vol = parseInt(String(updates.profileMusicVolume));
        if (!Number.isFinite(vol)) vol = 70;
        validatedUpdates.profileMusicVolume = Math.max(0, Math.min(100, vol));
      }

      // تحديث البيانات
      const updatedUser = await storage.updateUser(userIdNum, validatedUpdates);

      if (!updatedUser) {
        console.error('❌ فشل في تحديث قاعدة البيانات');
        return res.status(500).json({ error: 'فشل في تحديث البيانات في قاعدة البيانات' });
      }

      // بث موجه للمستخدم + بث خفيف للجميع مع معالجة أفضل للأخطاء
      try {
        const sanitizedUser = sanitizeUserData(updatedUser);
        emitUserUpdatedToUser(userIdNum, sanitizedUser);
        emitUserUpdatedToAll(sanitizedUser);
        
        console.log(`✅ تم بث تحديث إعدادات موسيقى البروفايل للمستخدم ${userIdNum}`);
      } catch (broadcastErr) {
        console.error('❌ خطأ في بث تحديث إعدادات الموسيقى:', broadcastErr);
      }

      res.json({
        success: true,
        message: 'تم تحديث البروفايل بنجاح',
        user: updatedUser,
      });
    } catch (error) {
      console.error('❌ خطأ في تحديث البروفايل:', error);
      res.status(500).json({
        error: 'خطأ في الخادم',
        details: error instanceof Error ? error.message : 'خطأ غير معروف',
      });
    }
  });

  // Get user by ID - للحصول على بيانات المستخدم
  app.get('/api/users/:id', async (req, res) => {
    try {
      const userId = parseEntityId(req.params.id as any).id as number;

      if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'معرف المستخدم يجب أن يكون رقم صحيح' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      // التحقق من هوية الطالب - إذا كان يطلب بياناته الخاصة
      const authToken = getAuthTokenFromRequest(req);
      const verified = authToken ? verifyAuthToken(authToken) : null;
      const isOwnProfile = verified && verified.userId === userId;

      const { password, ...userWithoutPassword } = user;
      
      if (isOwnProfile) {
        // إذا كان المستخدم يطلب بياناته الخاصة، أرجع كل شيء بما فيها base64
        const sanitized = sanitizeUserData(userWithoutPassword);
        res.json(sanitized);
      } else {
        // للمستخدمين الآخرين: أعِد حمولة آمنة وخفيفة، ولكن لا تُسقط الصورة الشخصية إن كانت base64
        // هذا استدعاء موجه لمستخدم واحد وليس بثاً عاماً، لذلك لا بأس بإرجاع base64 هنا
        const payload = buildUserBroadcastPayload(userWithoutPassword);
        try {
          const sanitized = sanitizeUserData(userWithoutPassword);
          const img = (sanitized as any)?.profileImage;
          if (!payload.profileImage && typeof img === 'string' && img.length > 0) {
            payload.profileImage = img; // يمكن أن تكون base64 أو مسار محلي/خارجي
          }
          // السماح بإرجاع صورة الغلاف base64 أيضاً في حالة الاستعلام الفردي
          const banner = (sanitized as any)?.profileBanner;
          if (!payload.profileBanner && typeof banner === 'string' && banner.length > 0) {
            payload.profileBanner = banner; // يمكن أن تكون base64 أو مسار محلي/خارجي
          }
        } catch {}
        res.json(payload);
      }
    } catch (error) {
      console.error('❌ خطأ في جلب بيانات المستخدم:', error);
      res.status(500).json({
        error: 'خطأ في الخادم',
        details: error instanceof Error ? error.message : 'خطأ غير معروف',
      });
    }
  });

  // [removed] Legacy endpoint '/api/users/update-background-color' was deprecated. Use PUT /api/users/:id with { profileBackgroundColor } instead.
  // ========== API نظام النقاط والمستويات ==========

  // الحصول على معلومات النقاط والمستوى للمستخدم
  app.get('/api/points/user/:userId', async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      const pointsInfo = await pointsService.getUserPointsInfo(userId);

      if (!pointsInfo) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      res.json(pointsInfo);
    } catch (error) {
      console.error('خطأ في جلب معلومات النقاط:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // الحصول على تاريخ النقاط للمستخدم
  app.get('/api/points/history/:userId', async (req, res) => {
    try {
      const userId = parseEntityId(req.params.userId as any).id as number;
      const limit = parseInt(req.query.limit as string) || 50;

      const history = await pointsService.getUserPointsHistory(userId, limit);
      res.json(history);
    } catch (error) {
      console.error('خطأ في جلب تاريخ النقاط:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // لوحة الصدارة
  app.get('/api/points/leaderboard', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const leaderboard = await pointsService.getLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      console.error('خطأ في جلب لوحة الصدارة:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // إضافة نقاط يدوياً (للمشرفين)
  app.post('/api/points/add', async (req, res) => {
    try {
      const { moderatorId, targetUserId, points, reason } = req.body;

      // التحقق من صلاحيات المشرف
      const moderator = await storage.getUser(moderatorId);
      if (!moderator || !['owner', 'admin'].includes(moderator.userType)) {
        return res.status(403).json({ error: 'غير مصرح لك بهذا الإجراء' });
      }

      const result = await pointsService.addPoints(
        targetUserId,
        points,
        reason || 'إضافة يدوية من المشرف'
      );

      // إرسال إشعار للمستخدم
      if (result.leveledUp) {
        io.to(targetUserId.toString()).emit('message', {
          type: 'levelUp',
          oldLevel: result.oldLevel,
          newLevel: result.newLevel,
          levelInfo: result.levelInfo,
          message: `🎉 تهانينا! وصلت للمستوى ${result.newLevel}: ${result.levelInfo?.title}`,
        });
      }

      getIO()
        .to(targetUserId.toString())
        .emit('message', {
          type: 'pointsAdded',
          points,
          reason: reason || 'مكافأة من الإدارة',
          message: `🎁 حصلت على ${points} نقطة من الإدارة!`,
        });

      res.json({ success: true, result });
    } catch (error) {
      console.error('خطأ في إضافة النقاط:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // إرسال النقاط بين المستخدمين
  app.post('/api/points/send', async (req, res) => {
    try {
      const { senderId, receiverId, points, reason } = req.body;

      // التحقق من صحة البيانات
      if (!senderId || !receiverId || !points || points <= 0) {
        return res.status(400).json({ error: 'بيانات غير صحيحة' });
      }

      if (senderId === receiverId) {
        return res.status(400).json({ error: 'لا يمكنك إرسال نقاط لنفسك' });
      }

      // التحقق من وجود المستخدمين
      const sender = await storage.getUser(senderId);
      const receiver = await storage.getUser(receiverId);

      if (!sender || !receiver) {
        return res.status(404).json({ error: 'مستخدم غير موجود' });
      }

      const senderIsOwner = sender.userType === 'owner' || sender.role === 'owner';

      // التحقق من وجود نقاط كافية للمرسل (إلا إذا كان المرسل هو المالك)
      if (!senderIsOwner && (sender.points || 0) < points) {
        return res.status(400).json({ error: 'نقاط غير كافية' });
      }

      // خصم النقاط من المرسل (يُتجاوز للمالك)
      if (!senderIsOwner) {
        await pointsService.addPoints(senderId, -points, `إرسال نقاط إلى ${receiver.username}`);
      }

      // إضافة النقاط للمستقبل
      const receiverResult = await pointsService.addPoints(
        receiverId,
        points,
        reason || `نقاط من ${sender.username}`
      );

      // إرسال إشعار للمستقبل
      if (receiverResult.leveledUp) {
        io.to(receiverId.toString()).emit('message', {
          type: 'levelUp',
          oldLevel: receiverResult.oldLevel,
          newLevel: receiverResult.newLevel,
          levelInfo: receiverResult.levelInfo,
          message: `🎉 تهانينا! وصلت للمستوى ${receiverResult.newLevel}: ${receiverResult.levelInfo?.title}`,
        });
      }

      // إشعار وصول النقاط للمستقبل
      getIO()
        .to(receiverId.toString())
        .emit('message', {
          type: 'pointsReceived',
          points,
          senderName: sender.username,
          message: `🎁 تم استلام ${points} نقطة من ${sender.username}`,
        });

      // إشعار في المحادثة العامة
      getIO().emit('message', {
        type: 'pointsTransfer',
        senderName: sender.username,
        receiverName: receiver.username,
        points,
        message: `💰 تم إرسال ${points} نقطة من ${sender.username} إلى ${receiver.username}`,
      });

      // إنشاء إشعار في قاعدة البيانات للمستقبل
      await notificationService.createPointsReceivedNotification(
        receiverId,
        points,
        sender.username,
        senderId
      );

      // إنشاء إشعار ترقية المستوى إذا حدثت ترقية
      if (receiverResult.leveledUp && receiverResult.levelInfo) {
        await notificationService.createLevelUpNotification(
          receiverId,
          receiverResult.oldLevel || 0,
          receiverResult.newLevel || 1,
          receiverResult.levelInfo.title
        );
      }

      // تحديث بيانات المستخدمين في real-time
      const updatedSender = await storage.getUser(senderId);
      const updatedReceiver = await storage.getUser(receiverId);

      getIO().to(senderId.toString()).emit('message', {
        type: 'userUpdated',
        user: updatedSender,
      });

      getIO().to(receiverId.toString()).emit('message', {
        type: 'userUpdated',
        user: updatedReceiver,
      });

      res.json({
        success: true,
        message: `تم إرسال ${points} نقطة إلى ${receiver.username} بنجاح`,
        senderPoints: updatedSender?.points || 0,
        receiverPoints: updatedReceiver?.points || 0,
      });
    } catch (error) {
      console.error('خطأ في إرسال النقاط:', error);
      res.status(500).json({ error: error.message || 'خطأ في الخادم' });
    }
  });

  // إعادة حساب نقاط مستخدم (للصيانة)
  app.post('/api/points/recalculate/:userId', async (req, res) => {
    try {
      const { moderatorId } = req.body;
      const userId = parseEntityId(req.params.userId as any).id as number;

      // التحقق من صلاحيات المشرف
      const moderator = await storage.getUser(moderatorId);
      if (!moderator || moderator.userType !== 'owner') {
        return res.status(403).json({ error: 'هذه الميزة للمالك فقط' });
      }

      const result = await pointsService.recalculateUserPoints(userId);
      res.json({ success: true, result });
    } catch (error) {
      console.error('خطأ في إعادة حساب النقاط:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // ============ APIs الحوائط ============

  // جلب منشورات الحائط
  app.get('/api/wall/posts/:type', async (req, res) => {
    try {
      // Check database availability
      if (!db || dbType === 'disabled') {
        return res.json({ success: true, posts: [], count: 0, type: req.params.type });
      }

      const { type } = req.params; // 'public' أو 'friends'
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
      }

      const user = await storage.getUser(parseInt(userId as string));
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      let posts;
      if (type === 'public') {
        // جلب المنشورات العامة
        posts = await storage.getWallPosts('public');
      } else if (type === 'friends') {
        // جلب منشورات الأصدقاء فقط
        const friends = await storage.getUserFriends(user.id);
        const friendIds = friends.map((f) => f.id);
        friendIds.push(user.id); // إضافة منشورات المستخدم نفسه
        posts = await storage.getWallPostsByUsers(friendIds);
      } else {
        return res.status(400).json({ error: 'نوع الحائط غير صحيح' });
      }

      res.json({
        success: true,
        posts: posts || [],
        count: posts?.length || 0,
        type: type,
      });
    } catch (error) {
      console.error('خطأ في جلب المنشورات:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // وظيفة ضغط الصور
  const compressImage = async (filePath: string): Promise<void> => {
    try {
      const tempPath = filePath + '.tmp';

      await sharp(filePath)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 85,
          progressive: true,
        })
        .toFile(tempPath);

      // استبدال الملف الأصلي بالمضغوط
      await fsp.rename(tempPath, filePath);
    } catch (error) {
      console.error('❌ فشل في ضغط الصورة:', error);
      // حذف الملف المؤقت إن وجد
      try {
        await fsp.unlink(filePath + '.tmp');
      } catch {}
    }
  };

  // إنشاء منشور جديد
  app.post('/api/wall/posts', wallUpload.single('image'), async (req, res) => {
    try {
      res.set('Cache-Control', 'no-store');
      const { content, type, userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
      }

      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      // التحقق من صلاحيات النشر
      if (user.userType === 'guest') {
        return res.status(403).json({ error: 'الضيوف لا يمكنهم النشر على الحائط' });
      }

      // تنظيف وتحقق من المحتوى
      const cleanContent = content?.trim();

      if (!cleanContent && !req.file) {
        return res.status(400).json({ error: 'يجب إضافة محتوى أو صورة' });
      }

      if (cleanContent && cleanContent.length > 500) {
        return res.status(400).json({ error: 'النص طويل جداً (الحد الأقصى 500 حرف)' });
      }

      // فلترة المحتوى من النصوص الضارة
      if (cleanContent) {
        const sanitizedContent = sanitizeInput(cleanContent);
        if (sanitizedContent !== cleanContent) {
          console.warn('⚠️ تم تنظيف محتوى منشور من:', user.username);
        }
      }

      // إعداد رابط الصورة (مع دعم Render عبر base64)
      let computedImageUrl: string | null = null;

      if (req.file) {
        try {
          // ضغط الصورة أولاً إلى JPEG مناسب (إن أمكن)
          const filePath = path.join(
            process.cwd(),
            'client',
            'public',
            'uploads',
            'wall',
            req.file.filename
          );
          await compressImage(filePath);

          // قراءة الملف المضغوط وتحويله إلى base64
          const buffer = await fsp.readFile(filePath);
          // استخدم mimetype القادِم من multer وإلا فـ image/jpeg
          const mimeType = req.file.mimetype || 'image/jpeg';
          const base64 = buffer.toString('base64');
          computedImageUrl = `data:${mimeType};base64,${base64}`;

          // حذف الملف الفيزيائي لتجنب مشاكل نظام الملفات المؤقت على Render
          try {
            await fsp.unlink(filePath);
          } catch {}
        } catch (imgErr) {
          console.error(
            '❌ فشل في تحويل صورة الحائط إلى base64، سيتم استخدام المسار المحلي كبديل:',
            imgErr
          );
          // مسار احتياطي في حالة فشل التحويل
          computedImageUrl = `/uploads/wall/${req.file.filename}`;
        }
      }

      // إعداد بيانات المنشور
      const postData = {
        userId: user.id,
        username: user.username,
        userRole: user.userType,
        userGender: user.gender, // إضافة الجنس لعرض الشعار الصحيح
        userLevel: user.level || 1, // إضافة المستوى لعرض الشعار الصحيح
        content: cleanContent ? sanitizeInput(cleanContent) : '',
        imageUrl: computedImageUrl,
        type: type || 'public',
        timestamp: new Date(),
        userProfileImage: user.profileImage,
        usernameColor: user.usernameColor,
      };

      // حفظ المنشور
      const post = await storage.createWallPost(postData as any);
      // إرسال إشعار للمستخدمين المتصلين
      const messageData = {
        type: 'newWallPost',
        post,
        wallType: type || 'public',
      };

      getIO().emit('message', messageData);

      res.json({
        success: true,
        post,
        message: 'تم نشر المنشور بنجاح',
      });
    } catch (error) {
      console.error('خطأ في إنشاء المنشور:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // التفاعل مع منشور
  app.post('/api/wall/react', async (req, res) => {
    try {
      const { postId, type, userId } = req.body;

      // التحقق من صحة البيانات
      if (!postId || !type || !userId) {
        return res.status(400).json({
          error: 'بيانات غير مكتملة',
          required: ['postId', 'type', 'userId'],
        });
      }

      // التحقق من صحة معرف المنشور
      const postIdNum = parseInt(postId);
      if (isNaN(postIdNum) || postIdNum <= 0) {
        return res.status(400).json({ error: 'معرف المنشور غير صحيح' });
      }

      // التحقق من صحة معرف المستخدم
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum) || userIdNum <= 0) {
        return res.status(400).json({ error: 'معرف المستخدم غير صحيح' });
      }

      const user = await storage.getUser(userIdNum);
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      // التحقق من صحة نوع التفاعل
      const validReactionTypes = ['like', 'dislike', 'heart'];
      if (!validReactionTypes.includes(type)) {
        return res.status(400).json({
          error: 'نوع التفاعل غير صحيح',
          validTypes: validReactionTypes,
        });
      }

      // التحقق من وجود المنشور
      const existingPost = await storage.getWallPost(postIdNum);
      if (!existingPost) {
        return res.status(404).json({ error: 'المنشور غير موجود' });
      }

      // إضافة أو تحديث التفاعل
      await storage.addWallReaction({
        postId: parseInt(postId),
        userId: user.id,
        username: user.username,
        type,
      });

      // جلب المنشور المحدث مع التفاعلات
      const updatedPost = await storage.getWallPostWithReactions(parseInt(postId));

      // إرسال تحديث للمستخدمين المتصلين
      getIO().emit('message', {
        type: 'wallPostReaction',
        post: updatedPost,
        reactionType: type,
        username: user.username,
      });

      res.json({ post: updatedPost });
    } catch (error) {
      console.error('خطأ في التفاعل:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // حذف منشور
  app.delete('/api/wall/posts/:postId', async (req, res) => {
    try {
      const { postId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
      }

      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      const post = await storage.getWallPost(parseInt(postId));
      if (!post) {
        return res.status(404).json({ error: 'المنشور غير موجود' });
      }

      // التحقق من الصلاحيات بدقة
      const isOwner = post.userId === user.id;
      const isAdmin = ['admin', 'owner'].includes(user.userType);
      const isModerator = user.userType === 'moderator';

      // المالك يمكنه حذف منشوره، والإدمن يحذف أي منشور، والمشرف يحذف منشورات الأعضاء فقط
      const canDelete =
        isOwner || isAdmin || (isModerator && !['admin', 'owner'].includes(post.userRole));

      if (!canDelete) {
        return res.status(403).json({
          error: 'ليس لديك صلاحية لحذف هذا المنشور',
          details: `نوع المستخدم: ${user.userType}, صاحب المنشور: ${post.userRole}`,
        });
      }

      // حذف الصورة إن وجدت مع معالجة أفضل للأخطاء
      if (post.imageUrl) {
        try {
          const imagePath = path.join(process.cwd(), 'client', 'public', post.imageUrl);
          if (fs.existsSync(imagePath)) {
            // التحقق من أن الملف قابل للحذف
            await fsp.access(imagePath, fs.constants.W_OK);
            await fsp.unlink(imagePath);
          }
        } catch (fileError) {
          console.warn('⚠️ فشل في حذف الصورة:', fileError);
          // لا نوقف العملية، فقط نسجل التحذير
        }
      }

      // حذف المنشور
      await storage.deleteWallPost(parseInt(postId));

      // إرسال إشعار بالحذف
      getIO().emit('message', {
        type: 'wallPostDeleted',
        postId: parseInt(postId),
        deletedBy: user.username,
      });

      res.json({ message: 'تم حذف المنشور بنجاح' });
    } catch (error) {
      console.error('خطأ في حذف المنشور:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // ===================
  // APIs الغرف - تمت إزالتها واستبدالها بمسارات منفصلة محسنة
  // ===================

  // تمت إزالة مسارات الغرف المكررة

  // رفع صور البروفايل يتم في ملف منفصل الآن

  // جعل IO متاحاً للمسارات الجديدة
  app.set('io', io);

  // تمت إزالة مسارات الغرف المكررة - انتقل إلى ملف منفصل

  // تمت إزالة جميع المسارات المكررة ونقلها لملف منفصل محسن

  // ========== صحة النظام والتشخيص ==========

  // نقطة فحص صحة النظام الشاملة
  app.get('/api/health', async (req, res) => {
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      node_version: process.version,
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'unknown',
        websocket: 'unknown',
        static_files: 'unknown',
      },
      errors: [],
    };

    try {
      // فحص قاعدة البيانات
      try {
        const testUser = await storage.getUser(1);
        healthCheck.services.database = 'healthy';
      } catch (dbError) {
        healthCheck.services.database = 'error';
        healthCheck.errors.push(
          `Database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
        );
      }

      // فحص WebSocket/Socket.IO
      try {
        if (io && typeof io.emit === 'function') {
          healthCheck.services.websocket = 'healthy';
        } else {
          healthCheck.services.websocket = 'not_initialized';
          healthCheck.errors.push('WebSocket: Socket.IO server not properly initialized');
        }
      } catch (wsError) {
        healthCheck.services.websocket = 'error';
        healthCheck.errors.push(
          `WebSocket: ${wsError instanceof Error ? wsError.message : 'Unknown error'}`
        );
      }

      // فحص الملفات الثابتة
      try {
        const fs = require('fs');
        const path = require('path');
        const crownSvgPath = path.join(process.cwd(), 'client', 'public', 'svgs', 'crown.svg');
        if (fs.existsSync(crownSvgPath)) {
          healthCheck.services.static_files = 'healthy';
        } else {
          healthCheck.services.static_files = 'missing_files';
          healthCheck.errors.push('Static Files: crown.svg not found');
        }
      } catch (fileError) {
        healthCheck.services.static_files = 'error';
        healthCheck.errors.push(
          `Static Files: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`
        );
      }

      // تحديد الحالة العامة
      if (healthCheck.errors.length > 0) {
        healthCheck.status = 'degraded';
      }

      // إرسال الاستجابة
      res.status(healthCheck.status === 'ok' ? 200 : 503).json(healthCheck);
    } catch (error) {
      console.error('❌ خطأ في فحص صحة النظام:', error);
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown health check error',
      });
    }
  });

  // نقطة فحص بسيطة للتحقق السريع
  app.get('/api/ping', (req, res) => {
    res.json({
      status: 'pong',
      timestamp: new Date().toISOString(),
      server: 'running',
    });
  });

  // نقطة فحص Socket.IO
  app.get('/api/socket-status', (req, res) => {
    try {
      const socketInfo = {
        initialized: !!io,
        connected_clients: io ? io.engine.clientsCount : 0,
        transport_types: io ? ['websocket', 'polling'] : [],
        status: io ? 'running' : 'not_initialized',
      };

      res.json(socketInfo);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown socket error',
      });
    }
  });

  // تعيين مستوى المستخدم مباشرة (للمالك فقط)
  app.post('/api/points/set-level', async (req, res) => {
    try {
      const { moderatorId, targetUserId, level } = req.body as {
        moderatorId: number;
        targetUserId: number;
        level: number;
      };

      if (!moderatorId || !targetUserId || typeof level !== 'number') {
        return res.status(400).json({ error: 'معاملات ناقصة' });
      }

      const moderator = await storage.getUser(moderatorId);
      if (!moderator || moderator.userType !== 'owner') {
        return res.status(403).json({ error: 'هذا الإجراء متاح للمالك فقط' });
      }

      const targetLevel = DEFAULT_LEVELS.find((l) => l.level === level);
      if (!targetLevel) {
        return res.status(400).json({ error: 'مستوى غير صالح' });
      }

      const requiredPoints = targetLevel.requiredPoints;

      const updated = await storage.updateUser(targetUserId, {
        totalPoints: requiredPoints,
        level: recalculateUserStats(requiredPoints).level,
        levelProgress: recalculateUserStats(requiredPoints).levelProgress,
      });

      if (!updated) {
        return res.status(400).json({ error: 'فشل في تحديث المستوى' });
      }

      getIO()
        .to(targetUserId.toString())
        .emit('message', {
          type: 'systemNotification',
          message: `ℹ️ تم تعديل مستواك إلى ${level}`,
          timestamp: new Date().toISOString(),
        });

      res.json({ success: true });
    } catch (error) {
      console.error('[SET_LEVEL] Error:', error);
      res.status(500).json({ error: 'خطأ في تعيين المستوى' });
    }
  });

  app.get('/api/moderation/blocked-devices', protect.owner, async (req, res) => {
    try {
      const list = await storage.getAllBlockedDevices();
      res.json({ blockedDevices: list });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في جلب الأجهزة/العناوين المحجوبة' });
    }
  });

  // رفع صورة رسالة (خاص/عام) - يحول الصورة إلى base64 لتوافق بيئات الاستضافة
  const messageImageUpload = createMulterConfig('messages', 'message', 8 * 1024 * 1024);
  app.post('/api/upload/message-image', messageImageUpload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ error: 'لم يتم رفع أي ملف', details: "أرسل الملف في الحقل 'image'" });
      }

      const { senderId, receiverId, roomId } = req.body as any;
      const parsedSenderId = parseInt(senderId);

      if (!parsedSenderId || isNaN(parsedSenderId)) {
        try {
          await fsp.unlink(req.file.path);
        } catch {}
        return res.status(400).json({ error: 'senderId مطلوب' });
      }

      // استخدم مسار ثابت للملف لتقليل استهلاك الذاكرة وتفعيل التخزين المؤقت
      const imageUrl: string = `/uploads/messages/${req.file.filename}`;

      // فحص NSFW تقريبي بالاعتماد على خدمة محلية بدون مزودات خارجية
      try {
        const { nsfwService } = await import('./services/nsfwService');
        const result = await nsfwService.checkFileUnsafe(req.file.path, req.file.originalname, req.file.mimetype);
        if (!result.isSafe) {
          try { await fsp.unlink(req.file.path); } catch {}
          return res.status(400).json({ error: result.reason || 'صورة غير مسموحة للرسائل' });
        }
      } catch {}

      // إذا كان receiverId موجوداً، فهذه رسالة خاصة
      if (receiverId) {
        const parsedReceiverId = parseInt(receiverId);
        const newMessage = await storage.createMessage({
          senderId: parsedSenderId,
          receiverId: parsedReceiverId,
          content: imageUrl,
          messageType: 'image',
          isPrivate: true,
          roomId: 'general',
        });
        const sender = await storage.getUser(parsedSenderId);
        const messageWithSender = { ...newMessage, sender };
        getIO()
          .to(parsedReceiverId.toString())
          .emit('privateMessage', { message: messageWithSender });
        getIO()
          .to(parsedSenderId.toString())
          .emit('privateMessage', { message: messageWithSender });
        return res.json({ success: true, imageUrl, message: messageWithSender });
      }

      // خلاف ذلك: نعتبرها صورة غرفة
      const targetRoomId = roomId && typeof roomId === 'string' ? roomId : 'general';
      const newMessage = await storage.createMessage({
        senderId: parsedSenderId,
        content: imageUrl,
        messageType: 'image',
        isPrivate: false,
        roomId: targetRoomId,
      });
      const sender = await storage.getUser(parsedSenderId);
      const socketData = {
        type: 'newMessage',
        roomId: targetRoomId,
        message: { ...newMessage, sender },
        timestamp: new Date().toISOString(),
      };
      getIO().to(`room_${targetRoomId}`).emit('message', socketData);

      res.json({ success: true, imageUrl, message: { ...newMessage, sender } });
    } catch (error: any) {
      console.error('❌ خطأ في رفع صورة الرسالة:', error);
      res.status(500).json({ error: 'خطأ في رفع صورة الرسالة', details: error?.message });
    }
  });

  // ===== Site Theme (Global) =====
  app.get('/api/settings/site-theme', async (req, res) => {
    try {
      try {
        res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=30');
      } catch {}
      const theme = await databaseService.getSiteTheme();
      res.json({ siteTheme: theme });
    } catch (e) {
      res.status(500).json({ error: 'فشل في جلب ثيم الموقع' });
    }
  });

  app.put('/api/settings/site-theme', async (req, res) => {
    try {
      const { userId, theme } = req.body || {};
      if (!userId) return res.status(401).json({ error: 'معرف المستخدم مطلوب' });
      const user = await storage.getUser(parseInt(userId));
      if (!user || user.userType !== 'owner') {
        return res.status(403).json({ error: 'صلاحيات غير كافية - مالك فقط' });
      }
      if (!theme || typeof theme !== 'string') {
        return res.status(400).json({ error: 'معرف ثيم غير صالح' });
      }
      const saved = await databaseService.setSiteTheme(theme);

      // بث التحديث للجميع
      io.emit('message', {
        type: 'site_theme_update',
        siteTheme: saved,
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, siteTheme: saved });
    } catch (e) {
      res.status(500).json({ error: 'فشل في تحديث ثيم الموقع' });
    }
  });

  // Helper to avoid broadcasting heavy base64 images to all clients
  function buildUserBroadcastPayload(user: any): any {
    const sanitized = sanitizeUserData(user);
    const payload: any = {
      id: sanitized.id,
      username: sanitized.username,
      userType: sanitized.userType,
      role: sanitized.role,
      isHidden: !!sanitized.isHidden,
      usernameColor: sanitized.usernameColor,
      profileBackgroundColor: sanitized.profileBackgroundColor,
      profileEffect: sanitized.profileEffect,
      isOnline: sanitized.isOnline,
      lastSeen: sanitized.lastSeen,
      currentRoom: sanitized.currentRoom,
      points: sanitized.points,
      level: sanitized.level,
      totalPoints: sanitized.totalPoints,
      levelProgress: sanitized.levelProgress,
      gender: sanitized.gender,
      country: sanitized.country,
      // معلومات وحقول عامة إضافية مطلوبة في واجهة البروفايل
      status: sanitized.status,
      age: sanitized.age,
      relation: sanitized.relation,
      createdAt: sanitized.createdAt,
      joinDate: (sanitized as any)?.joinDate,
      bio: (sanitized as any)?.bio,
      avatarHash: (sanitized as any)?.avatarHash,
      dmPrivacy: sanitized.dmPrivacy,
      isMuted: sanitized.isMuted,
      // التفضيلات العامة
      showPointsToOthers: sanitized.showPointsToOthers,
      showSystemMessages: sanitized.showSystemMessages,
      globalSoundEnabled: sanitized.globalSoundEnabled,
      // موسيقى البروفايل
      profileMusicUrl: sanitized.profileMusicUrl,
      profileMusicTitle: sanitized.profileMusicTitle,
      profileMusicEnabled: sanitized.profileMusicEnabled,
      profileMusicVolume: sanitized.profileMusicVolume,
    };
    if (
      sanitized.profileImage &&
      typeof sanitized.profileImage === 'string' &&
      !sanitized.profileImage.startsWith('data:')
    ) {
      const versionTag = (sanitized as any).avatarHash || (sanitized as any).avatarVersion;
      if (versionTag && !String(sanitized.profileImage).includes('?v=')) {
        payload.profileImage = `${sanitized.profileImage}?v=${versionTag}`;
      } else {
        payload.profileImage = sanitized.profileImage;
      }
    }
    if (
      sanitized.profileBanner &&
      typeof sanitized.profileBanner === 'string' &&
      !sanitized.profileBanner.startsWith('data:')
    ) {
      payload.profileBanner = sanitized.profileBanner;
    }
    return payload;
  }

  function emitUserUpdatedToAll(user: any) {
    try {
      const payload = buildUserBroadcastPayload(user);
      if (payload && payload.id) {
        getIO().emit('message', {
          type: 'userUpdated',
          user: payload,
          timestamp: new Date().toISOString(),
        });
      }
    } catch {}
  }

  function emitUserUpdatedToUser(userId: number, user: any) {
    try {
      const payload = buildUserBroadcastPayload(user);
      getIO().to(userId.toString()).emit('message', {
        type: 'userUpdated',
        user: payload,
        timestamp: new Date().toISOString(),
      });
    } catch {}
  }

  async function emitToUserRooms(userId: number, payload: any) {
    try {
      let rooms = await storage.getUserRooms(userId);
      if (!Array.isArray(rooms) || rooms.length === 0) {
        rooms = ['general'];
      }
      for (const roomId of rooms) {
        getIO().to(`room_${roomId}`).emit('message', payload);
      }
    } catch {
      // fallback: عام كحل أخير
      try {
        getIO().emit('message', payload);
      } catch {}
    }
  }

  // ============= نظام البوتات =============
  
  // جلب قائمة البوتات - يتطلب مستخدم حقيقي بصلاحيات إدارية
  app.get('/api/bots', requireUser, protect.admin, async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: 'قاعدة البيانات غير متصلة' });
      }

      const { bots } = await import('../shared/schema');
      const botsList = await db.select().from(bots).orderBy(bots.createdAt);
      
      res.json(botsList);
    } catch (error) {
      console.error('خطأ في جلب البوتات:', error);
      res.status(500).json({ error: 'فشل في جلب البوتات' });
    }
  });

  // إنشاء بوت جديد - يتطلب مستخدم حقيقي بصلاحيات إدارية
  app.post('/api/bots', requireUser, protect.admin, async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: 'قاعدة البيانات غير متصلة' });
      }

      const { bots, insertBotSchema } = await import('../shared/schema');
      const parsed = insertBotSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: 'بيانات غير صالحة', details: parsed.error.errors });
      }

      // تشفير كلمة المرور
      const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
      
      // إضافة البوت إلى قاعدة البيانات
      const body: any = parsed.data;
      // دعم تمرير العمر ضمن settings للحفاظ على المخطط الحالي
      const ageVal = (req.body as any)?.age;
      const relation = (req.body as any)?.relation;
      const country = (req.body as any)?.country;
      const settings: any = {
        ...(body.settings || {}),
        ...(typeof ageVal !== 'undefined' && ageVal !== '' ? { age: Number(ageVal) } : {}),
      };
      
      // التحقق من صحة الغرفة المحددة
      let currentRoom = body.currentRoom;
      if (!currentRoom || currentRoom.trim() === '') {
        currentRoom = 'general';
      }
      
      // التحقق من وجود الغرفة
      try {
        const roomExists = await roomService.getRoom(currentRoom);
        if (!roomExists) {
          currentRoom = 'general';
        }
      } catch (error) {
        console.warn('خطأ في التحقق من وجود الغرفة:', error);
        currentRoom = 'general';
      }
      
      const [newBot] = await db.insert(bots).values({
        ...body,
        // حقول بسيطة تُخزن مباشرة
        relation: typeof relation === 'string' ? relation : body.relation,
        country: typeof country === 'string' ? country : body.country,
        settings,
        password: hashedPassword,
        createdBy: req.user?.id,
        currentRoom: currentRoom, // استخدام الغرفة المحققة
      }).returning();

      // إضافة البوت لقائمة المتصلين - تضمين الحقول التعريفية كالدولة والجنس وغيرها
      const botUser = {
        id: newBot.id,
        username: newBot.username,
        userType: 'bot',
        role: 'bot',
        profileImage: newBot.profileImage,
        status: newBot.status,
        usernameColor: newBot.usernameColor,
        profileEffect: newBot.profileEffect,
        points: newBot.points,
        level: newBot.level,
        // الحقول الإضافية لتظهر في قائمة المستخدمين
        gender: newBot.gender,
        country: newBot.country,
        relation: newBot.relation,
        bio: newBot.bio,
        age: (newBot as any)?.settings?.age,
        isOnline: true,
        currentRoom: newBot.currentRoom,
      };

      // تحديث cache المستخدمين المتصلين
      await updateConnectedUserCache(newBot.id, botUser);

      // رسالة نظامية لدخول البوت
      try {
        const content = formatRoomEventMessage('join', {
          username: newBot.username,
          userType: 'bot',
          level: newBot.level as any,
        });
        const created = await storage.createMessage({
          senderId: newBot.id,
          roomId: newBot.currentRoom,
          content,
          messageType: 'system',
          isPrivate: false,
        });
        const sender = await storage.getUser(newBot.id);
        getIO().to(`room_${newBot.currentRoom}`).emit('message', {
          type: 'newMessage',
          message: { ...created, sender, roomId: newBot.currentRoom, reactions: { like: 0, dislike: 0, heart: 0 }, myReaction: null },
        });
      } catch {}

      // بث قائمة المتصلين المحدّثة للغرفة
      try { await emitOnlineUsersForRoom(newBot.currentRoom); } catch {}

      res.status(201).json(newBot);
    } catch (error) {
      console.error('خطأ في إنشاء البوت:', error);
      res.status(500).json({ error: 'فشل في إنشاء البوت' });
    }
  });

  // تحديث بوت
  app.put('/api/bots/:id', protect.admin, async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: 'قاعدة البيانات غير متصلة' });
      }
      const parsedId = parseEntityId(req.params.id as any);
      const botId = parsedId.id as number;
      const { bots } = await import('../shared/schema');
      
      // إذا كان هناك كلمة مرور جديدة، قم بتشفيرها
      let updateData = { ...req.body } as any;
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 12);
      }
      // تطبيع العمر داخل settings
      if (typeof (req.body as any)?.age !== 'undefined') {
        const currentSettings = (updateData.settings && typeof updateData.settings === 'object') ? updateData.settings : {};
        updateData.settings = {
          ...currentSettings,
          age: (req.body as any).age === '' ? undefined : Number((req.body as any).age),
        };
        // إزالة age العلوي إن وُجد
        delete (updateData as any).age;
      }

      const [updatedBot] = await db.update(bots)
        .set(updateData)
        .where(eq(bots.id, botId))
        .returning();

      if (!updatedBot) {
        return res.status(404).json({ error: 'البوت غير موجود' });
      }

      // تحديث cache المستخدمين المتصلين - تضمين الحقول التعريفية للبوت
      const botUser = {
        id: updatedBot.id,
        username: updatedBot.username,
        userType: 'bot',
        role: 'bot',
        profileImage: updatedBot.profileImage,
        status: updatedBot.status,
        usernameColor: updatedBot.usernameColor,
        profileEffect: updatedBot.profileEffect,
        points: updatedBot.points,
        level: updatedBot.level,
        gender: updatedBot.gender,
        country: updatedBot.country,
        relation: updatedBot.relation,
        bio: updatedBot.bio,
        age: (updatedBot as any)?.settings?.age,
        isOnline: updatedBot.isActive,
        currentRoom: updatedBot.currentRoom,
      };

      await updateConnectedUserCache(updatedBot.id, botUser);

      res.json({ ...updatedBot, entityId: formatEntityId(updatedBot.id, 'bot') });
    } catch (error) {
      console.error('خطأ في تحديث البوت:', error);
      res.status(500).json({ error: 'فشل في تحديث البوت' });
    }
  });

  // نقل بوت إلى غرفة أخرى - يتطلب التحقق من أن المعرف للبوت
  app.post('/api/bots/:id/move', requireBotOperation, protect.admin, async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: 'قاعدة البيانات غير متصلة' });
      }
      const parsedId = parseEntityId(req.params.id as any);
      const botId = parsedId.id as number;
      const { roomId } = req.body;

      if (!roomId) {
        return res.status(400).json({ error: 'يجب تحديد الغرفة' });
      }

      const { bots } = await import('../shared/schema');
      
      // جلب البوت الحالي
      const [currentBot] = await db.select().from(bots).where(eq(bots.id, botId)).limit(1);
      
      if (!currentBot) {
        return res.status(404).json({ error: 'البوت غير موجود' });
      }

      const oldRoom = currentBot.currentRoom;

      // التحقق من صحة الغرفة المحددة
      let validRoomId = roomId;
      if (!validRoomId || validRoomId.trim() === '') {
        validRoomId = 'general';
      }
      
      // التحقق من وجود الغرفة
      try {
        const roomExists = await roomService.getRoom(validRoomId);
        if (!roomExists) {
          validRoomId = 'general';
        }
      } catch (error) {
        console.warn('خطأ في التحقق من وجود الغرفة:', error);
        validRoomId = 'general';
      }
      
      // تحديث الغرفة
      const [updatedBot] = await db.update(bots)
        .set({ currentRoom: validRoomId, lastActivity: new Date() })
        .where(eq(bots.id, botId))
        .returning();

      // رسالة نظامية لمغادرة الغرفة القديمة
      try {
        const leaveContent = formatRoomEventMessage('leave', {
          username: updatedBot.username,
          userType: 'bot',
          level: updatedBot.level as any,
        });
        const leaveMsg = await storage.createMessage({
          senderId: botId,
          roomId: oldRoom,
          content: leaveContent,
          messageType: 'system',
          isPrivate: false,
        });
        const sender = await storage.getUser(botId);
        getIO().to(`room_${oldRoom}`).emit('message', {
          type: 'newMessage',
          message: { ...leaveMsg, sender, roomId: oldRoom, reactions: { like: 0, dislike: 0, heart: 0 }, myReaction: null },
        });
      } catch {}

      // إشعار بدخول الغرفة الجديدة - تضمين الحقول التعريفية للبوت
      const botUser = {
        id: updatedBot.id,
        username: updatedBot.username,
        userType: 'bot',
        role: 'bot',
        profileImage: updatedBot.profileImage,
        status: updatedBot.status,
        usernameColor: updatedBot.usernameColor,
        profileEffect: updatedBot.profileEffect,
        points: updatedBot.points,
        level: updatedBot.level,
        gender: updatedBot.gender,
        country: updatedBot.country,
        relation: updatedBot.relation,
        bio: updatedBot.bio,
        age: (updatedBot as any)?.settings?.age,
        isOnline: true,
        currentRoom: roomId,
      };

      try {
        const joinContent = formatRoomEventMessage('join', {
          username: updatedBot.username,
          userType: 'bot',
          level: updatedBot.level as any,
        });
        const joinMsg = await storage.createMessage({
          senderId: updatedBot.id,
          roomId,
          content: joinContent,
          messageType: 'system',
          isPrivate: false,
        });
        const sender = await storage.getUser(updatedBot.id);
        getIO().to(`room_${roomId}`).emit('message', {
          type: 'newMessage',
          message: { ...joinMsg, sender, roomId, reactions: { like: 0, dislike: 0, heart: 0 }, myReaction: null },
        });
      } catch {}

      // تحديث cache المستخدمين المتصلين بالبيانات الجديدة
      await updateConnectedUserCache(updatedBot.id, botUser);

      // تنظيف cache الرسائل للغرف المتأثرة لضمان عرض البيانات الصحيحة
      try {
        const { roomMessageService } = await import('./services/roomMessageService');
        roomMessageService.clearCache(oldRoom);
        roomMessageService.clearCache(roomId);
      } catch (e) {
        console.error('خطأ في تنظيف cache الرسائل:', e);
      }

      // إرسال تحديث قائمة المستخدمين للغرف المتأثرة (قائمة كاملة لتفادي عدم التزامن)
      try {
        await emitOnlineUsersForRoom(oldRoom);
        await emitOnlineUsersForRoom(roomId);
      } catch (e) {
        console.error('خطأ في تحديث قوائم المستخدمين:', e);
      }

      res.json({ message: 'تم نقل البوت بنجاح', bot: { ...updatedBot, entityId: formatEntityId(updatedBot.id, 'bot') } });
    } catch (error) {
      console.error('خطأ في نقل البوت:', error);
      res.status(500).json({ error: 'فشل في نقل البوت' });
    }
  });

  // تفعيل/تعطيل بوت
  app.patch('/api/bots/:id/toggle', protect.admin, async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: 'قاعدة البيانات غير متصلة' });
      }
      const parsedId = parseEntityId(req.params.id as any);
      const botId = parsedId.id as number;
      const { bots } = await import('../shared/schema');
      
      // جلب البوت الحالي
      const [currentBot] = await db.select().from(bots).where(eq(bots.id, botId)).limit(1);
      
      if (!currentBot) {
        return res.status(404).json({ error: 'البوت غير موجود' });
      }

      // تبديل حالة النشاط
      const newActiveState = !currentBot.isActive;
      
      const [updatedBot] = await db.update(bots)
        .set({ 
          isActive: newActiveState,
          isOnline: newActiveState,
          lastActivity: new Date()
        })
        .where(eq(bots.id, botId))
        .returning();

      // تحديث cache المستخدمين المتصلين
      if (newActiveState) {
        const botUser = {
          id: updatedBot.id,
          username: updatedBot.username,
          userType: 'bot',
          role: 'bot',
          profileImage: updatedBot.profileImage,
          status: updatedBot.status,
          usernameColor: updatedBot.usernameColor,
          profileEffect: updatedBot.profileEffect,
          points: updatedBot.points,
          level: updatedBot.level,
          gender: updatedBot.gender,
          country: updatedBot.country,
          relation: updatedBot.relation,
          bio: updatedBot.bio,
          age: (updatedBot as any)?.settings?.age,
          isOnline: true,
          currentRoom: updatedBot.currentRoom,
        };

        await updateConnectedUserCache(updatedBot.id, botUser);

        // رسالة نظامية: دخول بوت
        try {
          const content = formatRoomEventMessage('join', {
            username: updatedBot.username,
            userType: 'bot',
            level: updatedBot.level as any,
          });
          const msg = await storage.createMessage({
            senderId: updatedBot.id,
            roomId: updatedBot.currentRoom,
            content,
            messageType: 'system',
            isPrivate: false,
          });
          const sender = await storage.getUser(updatedBot.id);
          getIO().to(`room_${updatedBot.currentRoom}`).emit('message', {
            type: 'newMessage',
            message: { ...msg, sender, roomId: updatedBot.currentRoom, reactions: { like: 0, dislike: 0, heart: 0 }, myReaction: null },
          });
        } catch {}
        // بث قائمة المتصلين المحدّثة
        try { await emitOnlineUsersForRoom(updatedBot.currentRoom); } catch {}
      } else {
        // إزالة البوت من قائمة المتصلين
        await updateConnectedUserCache(updatedBot.id, null);

        // رسالة نظامية: المستخدم غادر الموقع (تعطيل البوت)
        try {
          const content = formatRoomEventMessage('site_leave', {
            username: updatedBot.username,
            userType: 'bot',
            level: updatedBot.level as any,
          });
          const msg = await storage.createMessage({
            senderId: botId,
            roomId: updatedBot.currentRoom,
            content,
            messageType: 'system',
            isPrivate: false,
          });
          const sender = await storage.getUser(botId);
          getIO().to(`room_${updatedBot.currentRoom}`).emit('message', {
            type: 'newMessage',
            message: { ...msg, sender, roomId: updatedBot.currentRoom, reactions: { like: 0, dislike: 0, heart: 0 }, myReaction: null },
          });
        } catch {}
        // بث قائمة المتصلين المحدّثة بعد الخروج
        try { await emitOnlineUsersForRoom(updatedBot.currentRoom); } catch {}
      }

      res.json({ message: newActiveState ? 'تم تفعيل البوت' : 'تم تعطيل البوت', bot: { ...updatedBot, entityId: formatEntityId(updatedBot.id, 'bot') } });
    } catch (error) {
      console.error('خطأ في تبديل حالة البوت:', error);
      res.status(500).json({ error: 'فشل في تبديل حالة البوت' });
    }
  });

  // حذف بوت
  app.delete('/api/bots/:id', protect.admin, async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: 'قاعدة البيانات غير متصلة' });
      }
      const parsedId = parseEntityId(req.params.id as any);
      const botId = parsedId.id as number;
      const { bots } = await import('../shared/schema');
      
      // جلب البوت قبل الحذف
      const [botToDelete] = await db.select().from(bots).where(eq(bots.id, botId)).limit(1);
      
      if (!botToDelete) {
        return res.status(404).json({ error: 'البوت غير موجود' });
      }

      // حذف البوت
      await db.delete(bots).where(eq(bots.id, botId));

      // إزالة البوت من قائمة المتصلين
      await updateConnectedUserCache(botId, null);
      // رسالة نظامية: المستخدم غادر الموقع (حذف البوت)
      try {
        const content = formatRoomEventMessage('site_leave', {
          username: botToDelete.username,
          userType: 'bot',
          level: botToDelete.level as any,
        });
        const msg = await storage.createMessage({
          senderId: botId,
          roomId: botToDelete.currentRoom,
          content,
          messageType: 'system',
          isPrivate: false,
        });
        const sender = await storage.getUser(botId);
        getIO().to(`room_${botToDelete.currentRoom}`).emit('message', {
          type: 'newMessage',
          message: { ...msg, sender, roomId: botToDelete.currentRoom, reactions: { like: 0, dislike: 0, heart: 0 }, myReaction: null },
        });
      } catch {}

      // بث قائمة المتصلين المحدّثة بعد الحذف
      try { await emitOnlineUsersForRoom(botToDelete.currentRoom); } catch {}

      res.json({ message: 'تم حذف البوت بنجاح' });
    } catch (error) {
      console.error('خطأ في حذف البوت:', error);
      res.status(500).json({ error: 'فشل في حذف البوت' });
    }
  });
 
  // رفع صورة البروفايل للبوت - مشابه لرفع صورة المستخدمين
  app.post(
    '/api/bots/:id/upload-profile-image',
    protect.admin,
    limiters.upload,
    upload.single('profileImage'),
    async (req, res) => {
      try {
        res.set('Cache-Control', 'no-store');
        
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: "لم يتم رفع أي ملف، أرسل الحقل باسم 'profileImage'",
          });
        }
        
        if (!db) {
          try { await fsp.unlink(req.file.path).catch(() => {}); } catch {}
          return res.status(500).json({ success: false, error: 'قاعدة البيانات غير متصلة' });
        }
        
        const parsedId = parseEntityId(req.params.id as any);
        const botId = parsedId.id as number;
        if (!botId || isNaN(botId)) {
          try { await fsp.unlink(req.file.path).catch(() => {}); } catch {}
          return res.status(400).json({ success: false, error: 'معرف البوت غير صالح' });
        }
        
        const { bots } = await import('../shared/schema');
        const [bot] = await db.select().from(bots).where(eq(bots.id, botId)).limit(1);
        if (!bot) {
          try { await fsp.unlink(req.file.path).catch(() => {}); } catch {}
          return res.status(404).json({ success: false, error: 'البوت غير موجود' });
        }
        
        // معالجة الصورة عبر النظام الذكي
        const { smartImageService } = await import('./services/smartImageService');
        const inputBuffer = await fsp.readFile(req.file.path);
        
        const processedImage = await smartImageService.processImage(inputBuffer, {
          userId: botId,
          type: 'avatar',
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          priority: 'balanced' as any
        } as any);
        
        // تنظيف الملف المؤقت المرفوع
        try { await fsp.unlink(req.file.path).catch(() => {}); } catch {}
        
        // في حالة التخزين على نظام الملفات، أعد تسمية الملف لتجنب تعارض مع IDs المستخدمين
        let finalUrl = processedImage.url;
        try {
          if (processedImage.url && processedImage.url.startsWith('/uploads/avatars/')) {
            const urlNoQuery = processedImage.url.split('?')[0];
            const hashParam = processedImage.metadata?.hash ? `?v=${processedImage.metadata.hash}` : '';
            const oldName = `${botId}.webp`;
            const newName = `bot-${botId}.webp`;
            if (urlNoQuery.endsWith(`/${oldName}`)) {
              const oldPath = path.join(process.cwd(), 'client', 'public', urlNoQuery);
              const newPath = path.join(process.cwd(), 'client', 'public', '/uploads/avatars', newName);
              await fsp.mkdir(path.dirname(newPath), { recursive: true }).catch(() => {});
              await fsp.rename(oldPath, newPath).catch(() => {});
              finalUrl = `/uploads/avatars/${newName}${hashParam}`;
            }
          }
        } catch (renameErr) {
          // تجاهل أي خطأ في إعادة التسمية - نكتفي بالرابط الأصلي
          console.warn('⚠️ فشل إعادة تسمية ملف صورة البوت:', renameErr);
        }
        
        // تحديث سجل البوت
        const [updatedBot] = await db
          .update(bots)
          .set({ profileImage: finalUrl })
          .where(eq(bots.id, botId))
          .returning();
        
        // تحديث Cache المتصلين للبوت
        try {
          const botUser = {
            id: updatedBot.id,
            username: updatedBot.username,
            userType: 'bot',
            role: 'bot',
            profileImage: updatedBot.profileImage,
            status: updatedBot.status,
            usernameColor: updatedBot.usernameColor,
            profileEffect: updatedBot.profileEffect,
            points: updatedBot.points,
            level: updatedBot.level,
            gender: updatedBot.gender,
            country: updatedBot.country,
            relation: updatedBot.relation,
            bio: updatedBot.bio,
            age: (updatedBot as any)?.settings?.age,
            isOnline: updatedBot.isActive,
            currentRoom: updatedBot.currentRoom,
          };
          await updateConnectedUserCache(updatedBot.id, botUser);
        } catch {}
        
        return res.json({
          success: true,
          imageUrl: finalUrl,
          avatarHash: processedImage.metadata?.hash,
          storageType: processedImage.storageType,
          fallbackUrl: processedImage.fallbackUrl,
        });
        
      } catch (error: any) {
        console.error('❌ خطأ في رفع صورة بوت:', error);
        if (req.file?.path) {
          try { await fsp.unlink(req.file.path).catch(() => {}); } catch {}
        }
        return res.status(500).json({ success: false, error: 'خطأ في الخادم أثناء رفع الصورة' });
      }
    }
  );

  // إنشاء 10 بوتات افتراضية
  app.post('/api/bots/create-defaults', protect.admin, async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: 'قاعدة البيانات غير متصلة' });
      }

      const { bots } = await import('../shared/schema');
      const createdBots = [];

      // قائمة بأسماء البوتات الافتراضية
      const defaultBots = [
        { name: 'بوت الترحيب', bio: 'أرحب بالأعضاء الجدد', status: 'متصل دائماً', color: '#FF6B6B' },
        { name: 'بوت المساعدة', bio: 'أساعد في الإجابة على الأسئلة', status: 'جاهز للمساعدة', color: '#4ECDC4' },
        { name: 'بوت الألعاب', bio: 'أنظم الألعاب والمسابقات', status: 'وقت اللعب!', color: '#FFE66D' },
        { name: 'بوت الأخبار', bio: 'أنشر آخر الأخبار والتحديثات', status: 'متابع للأحداث', color: '#A8E6CF' },
        { name: 'بوت النكت', bio: 'أشارك النكت المضحكة', status: 'مبتسم دائماً', color: '#FFD93D' },
        { name: 'بوت الموسيقى', bio: 'أشارك الموسيقى والأغاني', status: '♪ ♫ ♬', color: '#C7CEEA' },
        { name: 'بوت الطقس', bio: 'أخبركم بحالة الطقس', status: 'مشمس اليوم', color: '#87CEEB' },
        { name: 'بوت الرياضة', bio: 'متابع للأحداث الرياضية', status: 'جاهز للتحدي', color: '#98D8C8' },
        { name: 'بوت الثقافة', bio: 'أشارك المعلومات الثقافية', status: 'معلومة جديدة', color: '#F7DC6F' },
        { name: 'بوت الأمان', bio: 'أحافظ على أمان الدردشة', status: 'حماية نشطة', color: '#85C1E2' },
      ];

      for (let i = 0; i < defaultBots.length; i++) {
        const botData = defaultBots[i];
        const hashedPassword = await bcrypt.hash(`bot${i + 1}password`, 12);
        
        try {
          const [newBot] = await db.insert(bots).values({
            username: botData.name,
            password: hashedPassword,
            userType: 'bot',
            role: 'bot',
            status: botData.status,
            bio: botData.bio,
            usernameColor: botData.color,
            profileBackgroundColor: '#2a2a2a',
            profileEffect: 'none',
            points: Math.floor(Math.random() * 1000),
            level: Math.floor(Math.random() * 5) + 1,
            totalPoints: Math.floor(Math.random() * 5000),
            levelProgress: Math.floor(Math.random() * 100),
            currentRoom: 'general',
            isActive: true,
            isOnline: true,
            botType: i === 0 ? 'system' : i < 5 ? 'chat' : 'moderator',
            settings: {},
            createdBy: req.user?.id,
          }).returning();

          createdBots.push(newBot);

          // إضافة البوت لقائمة المتصلين - تضمين الحقول التعريفية للبوت
          const botUser = {
            id: newBot.id,
            username: newBot.username,
            userType: 'bot',
            role: 'bot',
            profileImage: newBot.profileImage,
            status: newBot.status,
            usernameColor: newBot.usernameColor,
            profileEffect: newBot.profileEffect,
            points: newBot.points,
            level: newBot.level,
            gender: newBot.gender,
            country: newBot.country,
            relation: newBot.relation,
            bio: newBot.bio,
            age: (newBot as any)?.settings?.age,
            isOnline: true,
            currentRoom: newBot.currentRoom,
          };

          await updateConnectedUserCache(newBot.id, botUser);

          // إرسال إشعار بدخول البوت (متوافق مع الواجهة)
          getIO().to(`room_${newBot.currentRoom}`).emit('message', {
            type: 'userJoinedRoom',
            userId: newBot.id,
            username: newBot.username,
            roomId: newBot.currentRoom,
          });
        } catch (error) {
          console.error(`خطأ في إنشاء البوت ${botData.name}:`, error);
        }
      }

      res.status(201).json({ 
        message: `تم إنشاء ${createdBots.length} بوت بنجاح`, 
        bots: createdBots 
      });
    } catch (error) {
      console.error('خطأ في إنشاء البوتات الافتراضية:', error);
      res.status(500).json({ error: 'فشل في إنشاء البوتات الافتراضية' });
    }
  });

  // 🔥 API لمراقبة أداء Socket.IO (للمطورين فقط)
  app.get('/api/socket-performance', developmentOnly, (req, res) => {
    try {
      const metrics = socketPerformanceMonitor.getMetrics();
      const connections = socketPerformanceMonitor.getActiveConnections();
      const transportStats = socketPerformanceMonitor.getTransportStats();
      const healthStatus = socketPerformanceMonitor.getHealthStatus();
      
      // إحصائيات محسن قائمة المستخدمين
      const userListOptimizer = getUserListOptimizer();
      const pendingStats = userListOptimizer?.getPendingStats() || {
        totalPendingRooms: 0,
        totalPendingEvents: 0,
        roomDetails: [],
      };
      
      res.json({
        socketMetrics: metrics,
        healthStatus,
        transportStats,
        activeConnections: connections.length,
        connectionDetails: connections.slice(0, 10), // أول 10 اتصالات فقط
        userListOptimizer: pendingStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('خطأ في الحصول على إحصائيات Socket.IO:', error);
      res.status(500).json({ error: 'فشل في الحصول على الإحصائيات' });
    }
  });

  // 🔥 API لتنظيف قائمة المستخدمين يدوياً (للمطورين فقط)
  app.post('/api/socket-performance/flush-users', developmentOnly, async (req, res) => {
    try {
      const { roomId } = req.body;
      const userListOptimizer = getUserListOptimizer();
      
      if (userListOptimizer) {
        await userListOptimizer.flushUpdates(roomId);
        res.json({ 
          success: true, 
          message: roomId ? `تم تنظيف الغرفة ${roomId}` : 'تم تنظيف جميع الغرف'
        });
      } else {
        res.status(503).json({ error: 'محسن قائمة المستخدمين غير متاح' });
      }
    } catch (error) {
      console.error('خطأ في تنظيف قائمة المستخدمين:', error);
      res.status(500).json({ error: 'فشل في التنظيف' });
    }
  });

  return httpServer;
}
