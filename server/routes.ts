import { advancedSecurity, advancedSecurityMiddleware } from "./advanced-security";
import securityApiRoutes from "./api-security";
import apiRoutes from "./routes/index";
import roomRoutes from "./routes/rooms";
import messageRoutes from "./routes/messages";
import { pointsService } from "./services/pointsService";
import { roomService } from "./services/roomService";
import { roomMessageService } from "./services/roomMessageService";
import { friendService } from "./services/friendService";
import { developmentOnly, logDevelopmentEndpoint } from "./middleware/development";
import { z } from "zod";
import { sanitizeUserData, sanitizeUsersArray } from './utils/data-sanitizer';
import multer from "multer";
import path from "path";
import fs from "fs";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import type { Express } from "express";
import sharp from "sharp";

// import { trackClick } from "./middleware/analytics"; // commented out as file doesn't exist
import { DEFAULT_LEVELS, recalculateUserStats } from "../shared/points-system";
import { insertUserSchema, insertMessageSchema } from "../shared/schema";
import { db, dbType } from "./database-adapter";
import { setupDownloadRoute } from "./download-route";
import { protect } from "./middleware/enhancedSecurity";
import { moderationSystem } from "./moderation";
import { getIO } from "./realtime";
import { sanitizeInput, validateMessageContent, checkIPSecurity, authLimiter, messageLimiter, friendRequestLimiter } from "./security";
import { databaseService } from "./services/databaseService";
import { notificationService } from "./services/notificationService";
import { spamProtection } from "./spam-protection";
import { storage } from "./storage";
import { databaseCleanup } from "./utils/database-cleanup";
import { getClientIpFromHeaders, getDeviceIdFromHeaders } from './utils/device';
import { updateConnectedUserCache } from "./realtime";


// إعداد multer موحد لرفع الصور
const createMulterConfig = (destination: string, prefix: string, maxSize: number = 5 * 1024 * 1024) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'client', 'public', 'uploads', destination);
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    }
  });

  return multer({
    storage,
    limits: {
      fileSize: maxSize,
      files: 1
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
        'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'
      ];
      
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}. الأنواع المدعومة: JPG, PNG, GIF, WebP, SVG`));
      }
    }
  });
};

// إعداد multer للصور المختلفة
const upload = createMulterConfig('profiles', 'profile', 5 * 1024 * 1024);
const wallUpload = createMulterConfig('wall', 'wall', 10 * 1024 * 1024);

const bannerUpload = createMulterConfig('banners', 'banner', 8 * 1024 * 1024);

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
      if (user.password.startsWith('$2b$')) {
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
  // مسارات الرسائل الخاصة مفصولة بالكامل
  app.use('/api/private-messages', (await import('./routes/privateMessages')).default);
  

  // رفع صور البروفايل - محسّن مع حل مشكلة Render
  app.post('/api/upload/profile-image', upload.single('profileImage'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          error: "لم يتم رفع أي ملف",
          details: "تأكد من إرسال الملف في حقل 'profileImage'"
        });
      }

      const userId = parseInt(req.body.userId);
      if (!userId || isNaN(userId)) {
        // حذف الملف المرفوع إذا فشل في الحصول على userId
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('خطأ في حذف الملف:', unlinkError);
        }
        return res.status(400).json({ error: "معرف المستخدم مطلوب ويجب أن يكون رقم صحيح" });
      }

      // التحقق من وجود المستخدم
      const user = await storage.getUser(userId);
      if (!user) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('خطأ في حذف الملف:', unlinkError);
        }
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      // حفظ الصورة بصيغة webp ثابتة + حساب hash/version
      const avatarsDir = path.join(process.cwd(), 'client', 'public', 'uploads', 'avatars');
      if (!fs.existsSync(avatarsDir)) {
        fs.mkdirSync(avatarsDir, { recursive: true });
      }
      const inputBuffer = fs.readFileSync(req.file.path);
      let webpBuffer = inputBuffer;
      try {
        webpBuffer = await (sharp as any)(inputBuffer).resize(256, 256, { fit: 'cover' }).webp({ quality: 80 }).toBuffer();
      } catch {}
      const hash = (await import('crypto')).createHash('md5').update(webpBuffer).digest('hex').slice(0, 12);
      const targetPath = path.join(avatarsDir, `${userId}.webp`);
      fs.writeFileSync(targetPath, webpBuffer);

      // حذف الملف المؤقت
      try { fs.unlinkSync(req.file.path); } catch {}

      // تحديث DB: avatarHash + زيادة avatarVersion
      const nextVersion = (user as any).avatarVersion ? Number((user as any).avatarVersion) + 1 : 1;
      const updatedUser = await storage.updateUser(userId, { profileImage: `/uploads/avatars/${userId}.webp`, avatarHash: hash, avatarVersion: nextVersion });
      
      if (!updatedUser) {
        return res.status(500).json({ error: "فشل في تحديث صورة البروفايل في قاعدة البيانات" });
      }

      // بث خفيف للغرف + كامل لصاحب التعديل
      try { updateConnectedUserCache(updatedUser); } catch {}
      emitUserUpdatedToUser(userId, updatedUser);
      await emitToUserRooms(userId, { type: 'userUpdated', user: buildUserBroadcastPayload(updatedUser) });

      res.json({
        success: true,
        message: "تم رفع الصورة بنجاح",
        imageUrl: `${updatedUser.profileImage}?v=${hash}`,
        filename: `${userId}.webp`,
        avatarHash: hash,
        user: updatedUser
      });

    } catch (error) {
      console.error('❌ خطأ في رفع صورة البروفايل:', error);
      
      // حذف الملف في حالة الخطأ
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('خطأ في حذف الملف:', unlinkError);
        }
      }

      res.status(500).json({ 
        error: "خطأ في رفع الصورة",
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  });

  // إصلاح رفع صورة البانر - محسّن مع حل مشكلة Render
  app.post('/api/upload/profile-banner', bannerUpload.single('banner'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          error: "لم يتم رفع أي ملف",
          details: "تأكد من إرسال الملف في حقل 'banner'"
        });
      }

      const userId = parseInt(req.body.userId);
      if (!userId || isNaN(userId)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('خطأ في حذف الملف:', unlinkError);
        }
        return res.status(400).json({ error: "معرف المستخدم مطلوب ويجب أن يكون رقم صحيح" });
      }

      // التحقق من وجود المستخدم
      const user = await storage.getUser(userId);
      if (!user) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('خطأ في حذف الملف:', unlinkError);
        }
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      // حل مشكلة Render: تحويل الصورة إلى base64 وحفظها في قاعدة البيانات
      let bannerUrl: string;
      
      try {
        // قراءة الملف كـ base64
        const fileBuffer = fs.readFileSync(req.file.path);
        const base64Image = fileBuffer.toString('base64');
        const mimeType = req.file.mimetype;
        
        // إنشاء data URL
        bannerUrl = `data:${mimeType};base64,${base64Image}`;
        
        // حذف الملف الأصلي
        fs.unlinkSync(req.file.path);
        
      } catch (fileError) {
        console.error('❌ خطأ في معالجة الملف:', fileError);
        
        // في حالة فشل base64، استخدم المسار العادي
        bannerUrl = `/uploads/banners/${req.file.filename}`;
        
        // حاول التأكد من وجود المجلد
        const uploadsDir = path.dirname(req.file.path);
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
      }
      
      const updatedUser = await storage.updateUser(userId, { profileBanner: bannerUrl });
      
      if (!updatedUser) {
        return res.status(500).json({ error: "فشل في تحديث صورة البانر في قاعدة البيانات" });
      }

      // بث خفيف للغرف: الخلفية فقط + كامل لصاحب التعديل
      try { updateConnectedUserCache(updatedUser); } catch {}
      emitUserUpdatedToUser(userId, updatedUser);
      await emitToUserRooms(userId, { type: 'user_background_updated', data: { userId, profileBackgroundColor: buildUserBroadcastPayload(updatedUser).profileBackgroundColor } });

      res.json({
        success: true,
        message: "تم رفع صورة البانر بنجاح",
        bannerUrl: bannerUrl,
        filename: req.file.filename,
        user: updatedUser
      });

    } catch (error) {
      console.error('❌ خطأ في رفع صورة البانر:', error);
      
      // حذف الملف في حالة الخطأ
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('خطأ في حذف الملف:', unlinkError);
        }
      }

      res.status(500).json({ 
        error: "خطأ في رفع صورة البانر",
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  });

  // Debug endpoint للتحقق من الصور - متاح في التطوير فقط
  app.get('/api/debug/images', developmentOnly, async (req, res) => {
    logDevelopmentEndpoint('/api/debug/images');
    try {
      const uploadsDir = path.join(process.cwd(), 'client', 'public', 'uploads');
      const profilesDir = path.join(uploadsDir, 'profiles');
      const bannersDir = path.join(uploadsDir, 'banners');
      
      const debugInfo = {
        uploadsDir: uploadsDir,
        profilesDir: profilesDir,
        bannersDir: bannersDir,
        uploadsExists: fs.existsSync(uploadsDir),
        profilesExists: fs.existsSync(profilesDir),
        bannersExists: fs.existsSync(bannersDir),
        profileFiles: [],
        bannerFiles: [],
        dbImages: []
      };
      
      // قائمة ملفات البروفايل
      if (debugInfo.profilesExists) {
        debugInfo.profileFiles = fs.readdirSync(profilesDir).map(file => ({
          name: file,
          path: `/uploads/profiles/${file}`,
          size: fs.statSync(path.join(profilesDir, file)).size
        }));
      }
      
      // قائمة ملفات البانر
      if (debugInfo.bannersExists) {
        debugInfo.bannerFiles = fs.readdirSync(bannersDir).map(file => ({
          name: file,
          path: `/uploads/banners/${file}`,
          size: fs.statSync(path.join(bannersDir, file)).size
        }));
      }
      
      // جلب الصور من قاعدة البيانات
      try {
        const users = await storage.getAllUsers();
        debugInfo.dbImages = users
          .filter(user => user.profileImage || user.profileBanner)
          .map(user => ({
            id: user.id,
            username: user.username,
            profileImage: user.profileImage,
            profileBanner: user.profileBanner
          }));
      } catch (dbError) {
        debugInfo.dbImages = [`خطأ في قاعدة البيانات: ${(dbError as Error).message}`];
      }
      
      res.json(debugInfo);
    } catch (error) {
      console.error('خطأ في debug endpoint:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'خطأ في تشغيل endpoint التشخيص' 
      });
    }
  });

  // تحديث بيانات المستخدم - للإصلاح
  app.patch('/api/users/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "معرف المستخدم مطلوب ويجب أن يكون رقم صحيح" });
      }

      // التحقق من وجود المستخدم
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      // فلترة البيانات المسموح بتحديثها
      const allowedUpdates = ['profileImage', 'profileBanner'];
      const updateData: Record<string, any> = {};
      
      for (const key of allowedUpdates) {
        if (Object.prototype.hasOwnProperty.call(req.body, key)) {
          updateData[key] = (req.body as any)[key];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "لا توجد بيانات للتحديث" });
      }

      // تحديث المستخدم
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(500).json({ error: "فشل في تحديث بيانات المستخدم" });
      }

      res.json({ 
        success: true, 
        message: "تم تحديث بيانات المستخدم بنجاح",
        user: updatedUser 
      });

    } catch (error) {
      console.error('❌ خطأ في تحديث المستخدم:', error);
      res.status(500).json({ error: "خطأ في الخادم أثناء تحديث المستخدم" });
    }
  });


  // API endpoints للإدارة
  // Removed duplicate moderation actions endpoint - kept the more detailed one below

  app.get("/api/moderation/reports", protect.admin, async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(401).json({ error: "غير مسموح - للإدمن والمالك فقط" });
      }
      
      const user = await storage.getUser(parseInt(userId as string));
      if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
        return res.status(403).json({ error: "غير مسموح - للإدمن والمالك فقط" });
      }
      
      const reports = spamProtection.getPendingReports();
      res.json({ reports });
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب التقارير" });
    }
  });

  app.post("/api/moderation/report", async (req, res) => {
    try {
      const { reporterId, reportedUserId, reason, content, messageId } = req.body;
      
      const report = spamProtection.addReport(reporterId, reportedUserId, reason, content, messageId);
      res.json({ message: "تم إرسال التقرير بنجاح", report });
    } catch (error) {
      res.status(500).json({ error: "خطأ في إرسال التقرير" });
    }
  });

  app.post("/api/moderation/mute", protect.moderator, async (req, res) => {
    try {
      const { moderatorId, targetUserId, reason, duration } = req.body;
      
      // التحقق من المعاملات المطلوبة
      if (!moderatorId || !targetUserId || !reason) {
        return res.status(400).json({ error: "معاملات ناقصة: moderatorId, targetUserId, reason مطلوبة" });
      }
      
      // التحقق من صحة المدة
      const muteDuration = duration && !isNaN(duration) ? parseInt(duration) : 30;
      if (muteDuration < 1 || muteDuration > 1440) { // بين دقيقة و24 ساعة
        return res.status(400).json({ error: "المدة يجب أن تكون بين 1 و 1440 دقيقة" });
      }
      
      // استخدم IP والجهاز الخاصين بالمستخدم المستهدف لضمان دقة الحظر
      const target = await storage.getUser(targetUserId);
      const clientIP = (target?.ipAddress && target.ipAddress !== 'unknown') ? target.ipAddress : getClientIpFromHeaders(req.headers as any, (req.ip || (req.connection as any)?.remoteAddress) as any);
      const deviceId = (target?.deviceId && target.deviceId !== 'unknown') ? target.deviceId : getDeviceIdFromHeaders(req.headers as any);
      
      const success = await moderationSystem.muteUser(moderatorId, targetUserId, reason, muteDuration, clientIP, deviceId);
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
          message: "تم كتم المستخدم بنجاح",
          duration: muteDuration 
        });
      } else {
        res.status(400).json({ error: "فشل في كتم المستخدم - تحقق من الصلاحيات أو حالة المستخدم" });
      }
    } catch (error) {
      console.error('خطأ في كتم المستخدم:', error);
      res.status(500).json({ error: "خطأ في كتم المستخدم: " + (error as any).message });
    }
  });

  app.post("/api/moderation/ban", protect.admin, async (req, res) => {
    try {
      const { moderatorId, targetUserId, reason, duration } = req.body;
      
      // التحقق من المعاملات المطلوبة
      if (!moderatorId || !targetUserId || !reason) {
        return res.status(400).json({ error: "معاملات ناقصة: moderatorId, targetUserId, reason مطلوبة" });
      }
      
      // للأدمن: المدة الافتراضية 15 دقيقة
      const banDuration = duration && !isNaN(duration) ? parseInt(duration) : 15;
      if (banDuration < 5 || banDuration > 60) { // بين 5 دقائق وساعة
        return res.status(400).json({ error: "مدة الطرد يجب أن تكون بين 5 و 60 دقيقة" });
      }
      
      // استخدم IP والجهاز الخاصين بالمستخدم المستهدف لضمان دقة الحظر
      const target = await storage.getUser(targetUserId);
      const clientIP = (target?.ipAddress && target.ipAddress !== 'unknown') ? target.ipAddress : getClientIpFromHeaders(req.headers as any, (req.ip || (req.connection as any)?.remoteAddress) as any);
      const deviceId = (target?.deviceId && target.deviceId !== 'unknown') ? target.deviceId : getDeviceIdFromHeaders(req.headers as any);
      
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
        getIO().to(targetUserId.toString()).emit('kicked', {
          moderator: moderator?.username || 'مشرف',
          reason: reason,
          duration: banDuration
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
          message: "تم طرد المستخدم بنجاح",
          duration: banDuration 
        });
      } else {
        res.status(400).json({ error: "فشل في طرد المستخدم - تحقق من الصلاحيات أو حالة المستخدم" });
      }
    } catch (error) {
      console.error('خطأ في طرد المستخدم:', error);
      res.status(500).json({ error: "خطأ في طرد المستخدم: " + (error as any).message });
    }
  });

  app.post("/api/moderation/block", protect.owner, async (req, res) => {
    try {
      const { moderatorId, targetUserId, reason } = req.body;
      
      // التحقق من المعاملات المطلوبة
      if (!moderatorId || !targetUserId || !reason) {
        return res.status(400).json({ error: "معاملات ناقصة: moderatorId, targetUserId, reason مطلوبة" });
      }
      
      // التحقق من أن المستخدم لا يحاول حجب نفسه
      if (moderatorId === targetUserId) {
        return res.status(400).json({ error: "لا يمكنك حجب نفسك" });
      }
      
      // الحصول على IP والجهاز الحقيقيين للمستخدم المستهدف (ليس المشرف)
      const target = await storage.getUser(targetUserId);
      const clientIP = (target?.ipAddress && target.ipAddress !== 'unknown') ? target.ipAddress : getClientIpFromHeaders(req.headers as any, (req.ip || (req.connection as any)?.remoteAddress) as any);
      const deviceId = (target?.deviceId && target.deviceId !== 'unknown') ? target.deviceId : getDeviceIdFromHeaders(req.headers as any);
      
      const success = await moderationSystem.blockUser(moderatorId, targetUserId, reason, clientIP, deviceId);
      if (success) {
        const target = await storage.getUser(targetUserId);
        const moderator = await storage.getUser(moderatorId);
        
        // إشعار المستخدم المحجوب
        getIO().to(targetUserId.toString()).emit('blocked', {
          moderator: moderator?.username || 'مشرف',
          reason: reason,
          permanent: true
        });
        
        // فصل المستخدم المحجوب فوراً
        getIO().to(targetUserId.toString()).disconnectSockets();
        
        res.json({ 
          success: true,
          message: "تم حجب المستخدم بنجاح",
          blocked: {
            userId: targetUserId,
            username: target?.username,
            ipAddress: clientIP,
            deviceId: deviceId
          }
        });
      } else {
        res.status(400).json({ error: "فشل في حجب المستخدم - تحقق من الصلاحيات أو حالة المستخدم" });
      }
    } catch (error) {
      console.error('خطأ في حجب المستخدم:', error);
      res.status(500).json({ error: "خطأ في حجب المستخدم: " + (error as any).message });
    }
  });

  app.post("/api/moderation/promote", protect.owner, async (req, res) => {
    try {
      const { moderatorId, targetUserId, newRole } = req.body;
      
      // التحقق من وجود المعاملات المطلوبة
      if (!moderatorId || !targetUserId || !newRole) {
        return res.status(400).json({ error: "معاملات ناقصة" });
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
            timestamp: new Date().toISOString()
          };
          
          getIO().emit('message', promotionMessage);

          // إنشاء إشعار في قاعدة البيانات للمستخدم المُرقى
          await notificationService.createPromotionNotification(
            targetUserId,
            newRole === 'admin' ? 'إدمن' : 'مشرف',
            moderator.username
          );
        }
        
        res.json({ message: "تم ترقية المستخدم بنجاح" });
      } else {
        res.status(400).json({ error: "فشل في ترقية المستخدم" });
      }
    } catch (error) {
      console.error("[PROMOTE_ENDPOINT] خطأ في ترقية المستخدم:", error);
      res.status(500).json({ error: "خطأ في ترقية المستخدم" });
    }
  });

  // مسار جديد لإلغاء الإشراف (تنزيل الرتبة) - للمالك فقط
  app.post("/api/moderation/demote", protect.owner, async (req, res) => {
    try {
      const { moderatorId, targetUserId } = req.body;
      if (!moderatorId || !targetUserId) {
        return res.status(400).json({ error: "معاملات ناقصة" });
      }

      const success = await moderationSystem.demoteUser(moderatorId, targetUserId);
      if (success) {
        const target = await storage.getUser(targetUserId);
        const moderator = await storage.getUser(moderatorId);
        if (target && moderator) {
          getIO().emit('message', {
            type: 'systemNotification',
            message: `ℹ️ تم تنزيل ${target.username} إلى عضو بواسطة ${moderator.username}`,
            timestamp: new Date().toISOString()
          });
        }
        res.json({ message: "تم إلغاء الإشراف بنجاح" });
      } else {
        res.status(400).json({ error: "فشل في إلغاء الإشراف" });
      }
    } catch (error) {
      console.error("[DEMOTE_ENDPOINT] خطأ في إلغاء الإشراف:", error);
      res.status(500).json({ error: "خطأ في إلغاء الإشراف" });
    }
  });

  app.post("/api/moderation/unmute", protect.moderator, async (req, res) => {
    try {
      const { moderatorId, targetUserId } = req.body;
      
      const success = await moderationSystem.unmuteUser(moderatorId, targetUserId);
      if (success) {
        res.json({ message: "تم إلغاء الكتم بنجاح" });
      } else {
        res.status(400).json({ error: "فشل في إلغاء الكتم" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في إلغاء الكتم" });
    }
  });

  app.post("/api/moderation/unblock", protect.owner, async (req, res) => {
    try {
      const { moderatorId, targetUserId } = req.body;
      
      const success = await moderationSystem.unblockUser(moderatorId, targetUserId);
      if (success) {
        res.json({ message: "تم إلغاء الحجب بنجاح" });
      } else {
        res.status(400).json({ error: "فشل في إلغاء الحجب" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في إلغاء الحجب" });
    }
  });

  // API لتحديث لون اسم المستخدم
  app.post("/api/users/:userId/username-color", async (req, res) => {
    try {
      const { userId } = req.params;
      const { color } = req.body;
      const userIdNum = parseInt(userId);
      
      // التحقق من صحة اللون (hex color)
      if (!color || !/^#[0-9A-F]{6}$/i.test(color)) {
        return res.status(400).json({ error: "لون غير صحيح" });
      }
      
      // التحقق من وجود المستخدم
      const user = await storage.getUser(userIdNum);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }
      
      // تحديث لون الاسم
      await storage.updateUser(userIdNum, { usernameColor: color });
      
      // بث خفيف مخصص للغرف + كامل لصاحب التعديل
      const updated = await storage.getUser(userIdNum);
      emitUserUpdatedToUser(userIdNum, updated);
      await emitToUserRooms(userIdNum, { type: 'usernameColorChanged', userId: userIdNum, color });
      
      res.json({ 
        message: "تم تحديث لون اسم المستخدم بنجاح",
        color: color
      });
      
    } catch (error) {
      console.error('خطأ في تحديث لون الاسم:', error);
      res.status(500).json({ error: "خطأ في تحديث لون الاسم" });
    }
  });

  // إضافة endpoint لفحص حالة المستخدم
  app.get('/api/user-status/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
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
          isBlocked: user.isBlocked
        },
        status: userStatus
      });
    } catch (error) {
      console.error('خطأ في فحص حالة المستخدم:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // إضافة endpoint لإصلاح حالة المراقبة
  app.post('/api/fix-moderation/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
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
          isBlocked: false
        });
        
        res.json({ 
          success: true, 
          message: `تم إصلاح حالة المراقبة للمستخدم ${user.username}` 
        });
      } else {
        res.json({ 
          success: false, 
          message: 'هذا المستخدم من الإدارة - لا يمكن تعديل حالته' 
        });
      }
    } catch (error) {
      console.error('خطأ في إصلاح حالة المراقبة:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  const httpServer = createServer(app);
  
  // إعداد Socket.IO من خلال وحدة realtime الموحدة
  const { setupRealtime } = await import('./realtime');
  const io = setupRealtime(httpServer);

  // تطبيق فحص الأمان على جميع الطلبات
  app.use(checkIPSecurity);
  app.use(advancedSecurityMiddleware);

  // Member registration route - مع أمان محسن
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, confirmPassword, gender, age, country, status, relation } = req.body;
      
      // فحص الأمان الأساسي
      if (!username?.trim() || !password?.trim() || !confirmPassword?.trim()) {
        return res.status(400).json({ error: "جميع الحقول المطلوبة" });
      }

      // فحص اسم المستخدم - منع الأحرف الخاصة
      if (!/^[\u0600-\u06FFa-zA-Z0-9_]{3,20}$/.test(username.trim())) {
        return res.status(400).json({ error: "اسم المستخدم يجب أن يكون بين 3-20 حرف ولا يحتوي على رموز خاصة" });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: "كلمات المرور غير متطابقة" });
      }

      // فحص قوة كلمة المرور
      if (password.length < 6) {
        return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      }
      
      if (!/(?=.*[0-9])/.test(password)) {
        return res.status(400).json({ error: "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل" });
      }

      // فحص العمر إذا تم إدخاله
      if (age && (age < 13 || age > 100)) {
        return res.status(400).json({ error: "العمر يجب أن يكون بين 13 و 100 سنة" });
      }

      // Check if username already exists
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: "اسم المستخدم موجود بالفعل" });
      }

      const user = await storage.createUser({
        username,
        password,
        userType: "member",
        gender: gender || "male",
        age: age || undefined,
        country: country?.trim() || undefined,
        status: status?.trim() || undefined,
        relation: relation?.trim() || undefined,
        profileImage: "/default_avatar.svg",
      });

      res.json({ user, message: "تم التسجيل بنجاح" });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Authentication routes
  app.post("/api/auth/guest", authLimiter, async (req, res) => {
    try {
      const { username, gender } = req.body;
      
      if (!username?.trim()) {
        return res.status(400).json({ error: "اسم المستخدم مطلوب" });
      }

      // Check if username already exists
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: "الاسم مستخدم بالفعل" });
      }

      const user = await storage.createUser({
        username,
        userType: "guest",
        gender: gender || "male",
        profileImage: "/default_avatar.svg",
      });

      res.json({ user });
    } catch (error) {
      console.error("Guest login error:", error);
      console.error("Error details:", error.message, error.stack);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/auth/member", authLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username?.trim() || !password?.trim()) {
        return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
      }

      const user = await storage.getUserByUsername(username.trim());
      if (!user) {
        return res.status(401).json({ error: "اسم المستخدم غير موجود" });
      }

              // التحقق من كلمة المرور - دعم التشفير والنص العادي
      let passwordValid = false;
      if (user.password) {
        if (user.password.startsWith('$2b$')) {
          // كلمة مرور مشفرة - استخدام bcrypt
          passwordValid = await bcrypt.compare(password.trim(), user.password);
        } else {
          // كلمة مرور غير مشفرة - مقارنة مباشرة
          passwordValid = user.password === password.trim();
        }
      }

      if (!passwordValid) {
        return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
      }

      // Check if user is actually a member or owner
              const userType = user.userType;
      if (userType === 'guest') {
        return res.status(401).json({ error: "هذا المستخدم ضيف وليس عضو" });
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

      res.json({ user });
    } catch (error) {
      console.error('Member authentication error:', error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // User routes
  // جلب جميع المستخدمين
  app.get("/api/users", async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;

      const [users, total] = await Promise.all([
        databaseService.listUsers(limit, offset, q),
        databaseService.countUsers(q)
      ]);

      const safeUsers = users.map(user => ({
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
        lastActive: user.lastSeen || user.createdAt,
        profileBackgroundColor: user.profileBackgroundColor,
        profileEffect: user.profileEffect,
        isHidden: user.isHidden
      }));

      res.json({ users: safeUsers, total, limit, offset, hasMore: offset + users.length < total });
    } catch (error) {
      console.error('خطأ في جلب جميع المستخدمين:', error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.get("/api/users/online", async (req, res) => {
    try {
      const users = await storage.getOnlineUsers();
      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // جلب المستخدمين المحظورين
  app.get("/api/users/blocked", async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const offset = Math.max(0, Number(req.query.offset) || 0);

      const users = await databaseService.listUsers(limit, offset);
      const blockedUsers = users.filter(user => user.isBlocked === true);
      
      const safeUsers = blockedUsers.map(user => ({
        id: user.id,
        username: user.username,
        userType: user.userType,
        role: user.role,
        isOnline: user.isOnline,
        profileImage: user.profileImage,
        isHidden: user.isHidden
      }));
      res.json({ users: safeUsers, limit, offset });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Message routes
  app.get("/api/messages/public", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await storage.getPublicMessages(limit);
      
      // Get user details for each message
      const messagesWithUsers = await Promise.all(
        messages.map(async (msg) => {
          const sender = msg.senderId ? await storage.getUser(msg.senderId) : null;
          return { ...msg, sender };
        })
      );

      res.json({ messages: messagesWithUsers });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // ملاحظة: تم تبسيط نظام الخاص واعتماد /api/messages (isPrivate=true) بدلاً من /api/private-messages

  // POST endpoint for sending messages
  app.post("/api/messages", async (req, res) => {
    try {
      const { senderId, receiverId, content, messageType = 'text', isPrivate = false, roomId = 'general' } = req.body;
      
      if (!senderId || !content?.trim()) {
        return res.status(400).json({ error: "معرف المرسل والمحتوى مطلوبان" });
      }

      // التحقق من المرسل
      const sender = await storage.getUser(senderId);
      if (!sender) {
        return res.status(404).json({ error: "المرسل غير موجود" });
      }

      // فحص الكتم للرسائل العامة
      if (!isPrivate && sender.isMuted) {
        return res.status(403).json({ error: "أنت مكتوم ولا يمكنك إرسال رسائل عامة" });
      }

      // التحقق من المستقبل للرسائل الخاصة
      if (isPrivate && receiverId) {
        const receiver = await storage.getUser(receiverId);
        if (!receiver) {
          return res.status(404).json({ error: "المستقبل غير موجود" });
        }
      }

      // إنشاء الرسالة
      const messageData = {
        senderId,
        receiverId: isPrivate ? receiverId : null,
        content: content.trim(),
        messageType,
        isPrivate,
        roomId: isPrivate ? null : roomId // للرسائل العامة فقط
      };

      const message = await storage.createMessage(messageData);
      
      // إرسال الرسالة عبر Socket.IO
              if (isPrivate && receiverId) {
          // رسالة خاصة - حدث موحّد فقط
          getIO().to(receiverId.toString()).emit('privateMessage', { message: { ...message, sender } });
          getIO().to(senderId.toString()).emit('privateMessage', { message: { ...message, sender } });

          // إنشاء إشعار في قاعدة البيانات للمستقبل
        await notificationService.createMessageNotification(
          receiverId,
          sender.username,
          senderId,
          content.substring(0, 100) // معاينة من الرسالة
        );
      } else {
        // رسالة عامة
        getIO().emit('message', {
          envelope: {
            type: 'newMessage',
            message: { ...message, sender }
          }
        });
      }

      res.json({ 
        success: true, 
        message: "تم إرسال الرسالة بنجاح",
        data: { ...message, sender }
      });
    } catch (error) {
      console.error("خطأ في إرسال الرسالة:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Profile picture upload (members only)
  app.post('/api/users/:id/profile-image', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { imageData } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ error: "صورة مطلوبة" });
      }

      // Check if user is a member
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      // Allow members and owners to upload profile pictures (not guests)
      if (existingUser.userType === 'guest') {
        return res.status(403).json({ 
          error: "رفع الصور الشخصية متاح للأعضاء فقط",
          userType: existingUser.userType,
          userId: userId
        });
      }

      const user = await storage.updateUser(userId, { profileImage: imageData });
      if (!user) {
        return res.status(500).json({ error: "فشل في تحديث الصورة" });
      }

      // بث موجه للمستخدم + بث خفيف للجميع
      emitUserUpdatedToUser(userId, user);
      emitUserUpdatedToAll(user);

      res.json({ user, message: "تم تحديث الصورة الشخصية بنجاح" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });




  // Update username color
  app.post('/api/users/:userId/color', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { color } = req.body;
      
      if (!userId || !color) {
        return res.status(400).json({ message: 'معرف المستخدم واللون مطلوبان' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'المستخدم غير موجود' });
      }

      // Update username color
      await storage.updateUser(userId, { usernameColor: color });
      
      // بث خفيف مخصص للغرف + كامل لصاحب التعديل
      const updated = await storage.getUser(userId);
      emitUserUpdatedToUser(userId, updated);
      await emitToUserRooms(userId, { type: 'usernameColorChanged', userId, color });
      
      res.json({ 
        success: true, 
        message: 'تم تحديث لون الاسم بنجاح',
        color 
      });
    } catch (error) {
      console.error('Error updating username color:', error);
      res.status(500).json({ message: 'خطأ في تحديث لون الاسم' });
    }
  });


    
    // 🚀 تحسين: تقليل استدعاءات المستخدمين - زيادة الفترة الزمنية
    const lastUserListRequest = 0;
    const USER_LIST_THROTTLE = 5000; // زيادة إلى 5 ثوان لتقليل التحميل (server-enforced)
    


    // socket.on('privateMessage', async (data) => {
    //   console.warn('[Deprecated] privateMessage handler is disabled. Use DM module events instead.');
    // });




  // بدء التنظيف الدوري لقاعدة البيانات
  const dbCleanupInterval = databaseCleanup.startPeriodicCleanup(6); // كل 6 ساعات
  
  // تنظيف فوري عند بدء الخادم
  setTimeout(async () => {
    await databaseCleanup.performFullCleanup();
    
    // عرض الإحصائيات
    const stats = await databaseCleanup.getDatabaseStats();
    }, 5000); // بعد 5 ثوانٍ من بدء الخادم

  // تنظيف الفترة الزمنية عند إغلاق الخادم
  process.on('SIGINT', () => {
    clearInterval(dbCleanupInterval);
    process.exit(0);
  });

  // Ensure cleanup on SIGTERM as well
  process.on('SIGTERM', () => {
    clearInterval(dbCleanupInterval);
    process.exit(0);
  });

  // Friend system APIs
  
  // البحث عن المستخدمين
  app.get("/api/users/search", async (req, res) => {
    try {
      const { q, userId } = req.query;
      
      if (!q || !userId) {
        return res.status(400).json({ error: "معاملات البحث مطلوبة" });
      }

      const limit = 10;
      const users = await databaseService.listUsers(limit, 0, String(q));
      const filteredUsers = users.filter(user => user.id !== parseInt(userId as string));

      res.json({ users: filteredUsers });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // إرسال طلب صداقة
  app.post("/api/friend-requests", async (req, res) => {
    try {
      const { senderId, receiverId } = req.body;
      
      if (!senderId || !receiverId) {
        return res.status(400).json({ error: "معلومات المرسل والمستقبل مطلوبة" });
      }

      if (senderId === receiverId) {
        return res.status(400).json({ error: "لا يمكنك إرسال طلب صداقة لنفسك" });
      }

      // التحقق من وجود طلب سابق
      const existingRequest = await friendService.getFriendRequest(senderId, receiverId);
      if (existingRequest) {
        return res.status(400).json({ error: "طلب الصداقة موجود بالفعل" });
      }

      // التحقق من الصداقة الموجودة
      const friendship = await friendService.getFriendship(senderId, receiverId);
      if (friendship) {
        return res.status(400).json({ error: "أنتما أصدقاء بالفعل" });
      }

      // منع إرسال طلب صداقة إذا كان المستقبل قد تجاهل المرسل
      try {
        const ignoredByReceiver: number[] = await storage.getIgnoredUsers(receiverId);
        if (Array.isArray(ignoredByReceiver) && ignoredByReceiver.includes(senderId)) {
          return res.status(403).json({ error: 'لا يمكن إرسال طلب صداقة: هذا المستخدم قام بتجاهلك' });
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
        senderId: senderId
      });

      // إنشاء إشعار حقيقي في قاعدة البيانات
      await notificationService.createFriendRequestNotification(
        receiverId,
        sender?.username || 'مستخدم مجهول',
        senderId
      );

      res.json({ message: "تم إرسال طلب الصداقة", request });
    } catch (error) {
      console.error('❌ Friend request error:', error);
      console.error('Stack trace:', (error as Error).stack);
      res.status(500).json({ error: "خطأ في الخادم", details: (error as Error).message });
    }
  });

  // إرسال طلب صداقة باستخدام اسم المستخدم
  app.post("/api/friend-requests/by-username", async (req, res) => {
    try {
      const { senderId, targetUsername } = req.body;
      
      if (!senderId || !targetUsername) {
        return res.status(400).json({ error: "معرف المرسل واسم المستخدم المستهدف مطلوبان" });
      }

      // البحث عن المستخدم المستهدف
      const targetUser = await storage.getUserByUsername(targetUsername);
      if (!targetUser) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      if (senderId === targetUser.id) {
        return res.status(400).json({ error: "لا يمكنك إرسال طلب صداقة لنفسك" });
      }

      // التحقق من وجود طلب سابق
      const existingRequest = await friendService.getFriendRequest(senderId, targetUser.id);
      if (existingRequest) {
        return res.status(400).json({ error: "طلب الصداقة موجود بالفعل" });
      }

      // التحقق من الصداقة الموجودة
      const friendship = await friendService.getFriendship(senderId, targetUser.id);
      if (friendship) {
        return res.status(400).json({ error: "أنتما أصدقاء بالفعل" });
      }

      // منع إرسال طلب صداقة إذا كان المستهدف قد تجاهل المُرسل
      try {
        const ignoredByTarget: number[] = await storage.getIgnoredUsers(targetUser.id);
        if (Array.isArray(ignoredByTarget) && ignoredByTarget.includes(senderId)) {
          return res.status(403).json({ error: 'لا يمكن إرسال طلب صداقة: هذا المستخدم قام بتجاهلك' });
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
        senderId: senderId
      });

      // إنشاء إشعار حقيقي في قاعدة البيانات
      await notificationService.createFriendRequestNotification(
        targetUser.id,
        sender?.username || 'مستخدم مجهول',
        senderId
      );

      res.json({ message: "تم إرسال طلب الصداقة", request });
    } catch (error) {
      console.error('خطأ في إرسال طلب الصداقة:', error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // الحصول على جميع طلبات الصداقة للمستخدم (واردة + صادرة)
  app.get("/api/friend-requests/:userId", friendRequestLimiter, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const [incoming, outgoing] = await Promise.all([
        friendService.getIncomingFriendRequests(userId),
        friendService.getOutgoingFriendRequests(userId)
      ]);
      res.json({ incoming, outgoing });
    } catch (error) {
      console.error('خطأ في جلب طلبات الصداقة:', error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // الحصول على طلبات الصداقة الواردة
  app.get("/api/friend-requests/incoming/:userId", friendRequestLimiter, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const requests = await friendService.getIncomingFriendRequests(userId);
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // الحصول على طلبات الصداقة الصادرة
  app.get("/api/friend-requests/outgoing/:userId", friendRequestLimiter, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const requests = await friendService.getOutgoingFriendRequests(userId);
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // قبول طلب صداقة
  app.post("/api/friend-requests/:requestId/accept", async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { userId } = req.body;
      
      const request = await friendService.getFriendRequestById(requestId);
      if (!request || request.friendId !== userId) {
        return res.status(403).json({ error: "غير مسموح" });
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
        friendName: receiver?.username
      });
      
      getIO().emit('message', {
        type: 'friendAdded', 
        targetUserId: request.friendId,
        friendId: request.userId,
        friendName: sender?.username
      });
      getIO().emit('message', {
        type: 'friendRequestAccepted',
        targetUserId: request.userId,
        senderName: receiver?.username
      });

      // إنشاء إشعار حقيقي في قاعدة البيانات
      await notificationService.createFriendAcceptedNotification(
        request.userId,
        receiver?.username || 'مستخدم مجهول',
        userId
      );

      res.json({ message: "تم قبول طلب الصداقة" });
    } catch (error) {
      console.error("خطأ في قبول طلب الصداقة:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // رفض طلب صداقة
  app.post("/api/friend-requests/:requestId/decline", async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { userId } = req.body;
      
      const request = await friendService.getFriendRequestById(requestId);
      if (!request || request.friendId !== userId) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      await friendService.declineFriendRequest(requestId);
      res.json({ message: "تم رفض طلب الصداقة" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // إلغاء طلب صداقة
  app.post("/api/friend-requests/:requestId/cancel", async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { userId } = req.body;
      
      const request = await friendService.getFriendRequestById(requestId);
      if (!request || request.userId !== userId) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      await friendService.deleteFriendRequest(requestId);
      res.json({ message: "تم إلغاء طلب الصداقة" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // تجاهل طلب صداقة
  app.post("/api/friend-requests/:requestId/ignore", async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { userId } = req.body;
      
      const request = await friendService.getFriendRequestById(requestId);
      if (!request || request.friendId !== userId) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      await friendService.ignoreFriendRequest(requestId);
      res.json({ message: "تم تجاهل طلب الصداقة" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // الحصول على قائمة الأصدقاء

  // API routes for spam protection and reporting
  
  // إضافة تبليغ
  app.post("/api/reports", async (req, res) => {
    try {
      const { reporterId, reportedUserId, reason, content, messageId } = req.body;
      
      if (!reporterId || !reportedUserId || !reason || !content) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }

      // منع البلاغ على الإدمن والمشرف والمالك
      const reportedUser = await storage.getUser(reportedUserId);
      if (reportedUser && ['admin', 'moderator', 'owner'].includes(reportedUser.userType)) {
        return res.status(403).json({ 
          error: "لا يمكن الإبلاغ عن أعضاء الإدارة (المشرف، الإدمن، المالك)" 
        });
      }

      const report = spamProtection.addReport(reporterId, reportedUserId, reason, content, messageId);
      res.json({ report, message: "تم إرسال التبليغ بنجاح" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // الحصول على التبليغات المعلقة (للمشرفين)
  app.get("/api/reports/pending", async (req, res) => {
    try {
      const { userId } = req.query;
      
      // التحقق من أن المستخدم مشرف
      const user = await storage.getUser(parseInt(userId as string));
      if (!user || user.userType !== 'owner') {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const reports = spamProtection.getPendingReports();
      res.json({ reports });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // مراجعة تبليغ (للمشرفين)
  app.patch("/api/reports/:reportId", async (req, res) => {
    try {
      const { reportId } = req.params;
      const { action, userId } = req.body;
      
      // التحقق من أن المستخدم مشرف
      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'owner') {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const success = spamProtection.reviewReport(parseInt(reportId), action);
      if (success) {
        res.json({ message: "تم مراجعة التبليغ" });
      } else {
        res.status(404).json({ error: "التبليغ غير موجود" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // الحصول على حالة المستخدم
  app.get("/api/users/:userId/spam-status", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const status = spamProtection.getUserStatus(userId);
      res.json({ status });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // إعادة تعيين نقاط السبام (للمشرفين)
  app.post("/api/users/:userId/reset-spam", async (req, res) => {
    try {
      const { userId } = req.params;
      const { adminId } = req.body;
      
      // التحقق من أن المستخدم مشرف
      const admin = await storage.getUser(adminId);
      if (!admin || admin.userType !== 'owner') {
        return res.status(403).json({ error: "غير مسموح" });
      }

      spamProtection.resetUserSpamScore(parseInt(userId));
      res.json({ message: "تم إعادة تعيين نقاط السبام" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // إحصائيات السبام (للمشرفين)
  app.get("/api/spam-stats", async (req, res) => {
    try {
      const { userId } = req.query;
      
      // التحقق من أن المستخدم مشرف
      const user = await storage.getUser(parseInt(userId as string));
      if (!user || user.userType !== 'owner') {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const stats = spamProtection.getStats();
      res.json({ stats });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Moderation routes
  // DUPLICATE BLOCK REMOVED: Using the canonical moderation endpoints defined earlier in the file.

  app.get("/api/moderation/log", protect.admin, async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const user = await storage.getUser(userId);
      
      // للإدمن والمالك فقط
      if (!user || (user.userType !== 'owner' && user.userType !== 'admin')) {
        return res.status(403).json({ error: "غير مسموح لك بالوصول - للإدمن والمالك فقط" });
      }

      const log = moderationSystem.getModerationLog();
      res.json({ log });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Removed second duplicate moderation actions endpoint - kept the more complete one

  // Friends routes
  app.get("/api/friends/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const friends = await friendService.getFriends(userId);
      
      res.json({ friends });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });



  app.delete("/api/friends/:userId/:friendId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const friendId = parseInt(req.params.friendId);
      
      const success = await friendService.removeFriend(userId, friendId);
      
      if (success) {
        res.json({ message: "تم حذف الصديق" });
      } else {
        res.status(404).json({ error: "الصداقة غير موجودة" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });



  // إضافة endpoint لوحة إجراءات المشرفين
  app.get("/api/moderation/actions", protect.admin, async (req, res) => {
    try {
      const { userId } = req.query;
      const user = await storage.getUser(Number(userId));
      
      // التحقق من أن المستخدم مشرف أو مالك
      if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
        return res.status(403).json({ error: "غير مسموح - للمشرفين فقط" });
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
          isActive
        });
      }

      res.json({ actions });
    } catch (error) {
      console.error("خطأ في الحصول على تاريخ الإجراءات:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // إضافة endpoint لسجل البلاغات
  app.get("/api/reports", protect.admin, async (req, res) => {
    try {
      const { userId } = req.query;
      const user = await storage.getUser(Number(userId));
      
      if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
        return res.status(403).json({ error: "غير مسموح - للمشرفين فقط" });
      }

      const reports = spamProtection.getPendingReports()
        .concat(spamProtection.getReviewedReports())
        .map(report => ({
          ...report,
          reporterName: '',
          reportedUserName: ''
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
      console.error("خطأ في الحصول على البلاغات:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // إضافة endpoint لمراجعة البلاغات
  app.post("/api/reports/:id/review", protect.admin, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const { action, moderatorId } = req.body;
      
      const user = await storage.getUser(moderatorId);
      if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const success = spamProtection.reviewReport(reportId, action);
      
      if (success) {
        res.json({ message: "تمت مراجعة البلاغ" });
      } else {
        res.status(404).json({ error: "البلاغ غير موجود" });
      }
    } catch (error) {
      console.error("خطأ في مراجعة البلاغ:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });



  // إضافة endpoint للإجراءات النشطة
  app.get("/api/moderation/active-actions", protect.admin, async (req, res) => {
    try {
      const { userId } = req.query;
      const user = await storage.getUser(Number(userId));
      
      if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
        return res.status(403).json({ error: "غير مسموح - للمشرفين فقط" });
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
            isActive: true
          });
        }
      }

      res.json({ actions: activeActions });
    } catch (error) {
      console.error("خطأ في الحصول على الإجراءات النشطة:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Security API routes
  app.use('/api/security', securityApiRoutes);
  
  // New Modular Routes - نظام المسارات المعاد تنظيمه
  app.use('/api/v2', apiRoutes);



  // إخفاء/إظهار من قائمة المتصلين للجميع (للإدمن/المالك فقط)
  app.post('/api/users/:userId/hide-online', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
      if (user.userType !== 'admin' && user.userType !== 'owner') {
        return res.status(403).json({ error: 'غير مسموح' });
      }
      await storage.setUserHiddenStatus(userId, true);
      res.json({ success: true, isHidden: true, message: 'تم إخفاؤك من قائمة المتصلين' });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  app.post('/api/users/:userId/show-online', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
      if (user.userType !== 'admin' && user.userType !== 'owner') {
        return res.status(403).json({ error: 'غير مسموح' });
      }
      await storage.setUserHiddenStatus(userId, false);
      res.json({ success: true, isHidden: false, message: 'تم إظهارك في قائمة المتصلين' });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  app.post('/api/users/:userId/ignore/:targetId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const targetId = parseInt(req.params.targetId);
      
      await storage.addIgnoredUser(userId, targetId);
      
      res.json({ success: true, message: 'تم تجاهل المستخدم' });
    } catch (error) {
      console.error('خطأ في تجاهل المستخدم:', error);
      res.status(500).json({ error: 'فشل في تجاهل المستخدم' });
    }
  });

  app.delete('/api/users/:userId/ignore/:targetId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const targetId = parseInt(req.params.targetId);
      
      await storage.removeIgnoredUser(userId, targetId);
      
      res.json({ success: true, message: 'تم إلغاء تجاهل المستخدم' });
    } catch (error) {
      console.error('خطأ في إلغاء تجاهل المستخدم:', error);
      res.status(500).json({ error: 'فشل في إلغاء تجاهل المستخدم' });
    }
  });

  app.get('/api/users/:userId/ignored', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const ignoredUsers = await storage.getIgnoredUsers(userId);
      
      res.json({ ignoredUsers });
    } catch (error) {
      console.error('خطأ في جلب المستخدمين المتجاهلين:', error);
      res.status(500).json({ error: 'فشل في جلب المستخدمين المتجاهلين' });
    }
  });

  // User Update Route with Theme Support
  app.put('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const idNum = parseInt(id);
      if (isNaN(idNum) || idNum <= 0) {
        return res.status(400).json({ error: 'User ID must be a valid number' });
      }

      const updates = req.body || {};

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
          normalizedUpdates.profileBackgroundColor = firstHex || '#4A90E2';
        } else {
          // fallback to a safe default color if invalid
          normalizedUpdates.profileBackgroundColor = '#4A90E2';
        }
      }

      const user = await storage.updateUser(idNum, normalizedUpdates);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update connected cache copy in realtime module if needed (no-op here)
      try { updateConnectedUserCache(user); } catch {}

                   // بث خفيف للجميع + بث كامل لصاحب التعديل
            emitUserUpdatedToAll(user);
      emitUserUpdatedToUser(idNum, user);

      const payload = buildUserBroadcastPayload(user);
      res.json(payload);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Notifications API
  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      // Check database availability
      if (!db || dbType === 'disabled') {
        return res.json({ notifications: [] });
      }
      
      const userId = parseInt(req.params.userId);
      
      // التحقق من صحة userId
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ error: "معرف المستخدم غير صحيح" });
      }
      
      const notifications = await storage.getUserNotifications(userId);
      res.json({ notifications });
    } catch (error) {
      console.error('خطأ في جلب الإشعارات:', error);
      res.status(500).json({ error: "خطأ في جلب الإشعارات" });
    }
  });

  // إضافة endpoint للإشعارات بدون userId (للحالات التي تستدعى بدون معامل)
  app.get("/api/notifications", async (req, res) => {
    try {
      // Check database availability
      if (!db || dbType === 'disabled') {
        return res.json({ notifications: [] });
      }
      
      const { userId } = req.query;
      
      if (!userId || isNaN(parseInt(userId as string))) {
        return res.status(400).json({ error: "معرف المستخدم مطلوب وغير صحيح" });
      }
      
      const userIdInt = parseInt(userId as string);
      const notifications = await storage.getUserNotifications(userIdInt);
      res.json({ notifications });
    } catch (error) {
      console.error('خطأ في جلب الإشعارات:', error);
      res.status(500).json({ error: "خطأ في جلب الإشعارات" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const { userId, type, title, message, data } = req.body;
      
      const notification = await storage.createNotification({
        userId,
        type,
        title,
        message,
        data
      });
      
      // إرسال إشعار فوري عبر WebSocket
      try { getIO().to(userId.toString()).emit('newNotification', { notification }); } catch {}
      
      res.json({ notification });
    } catch (error) {
      res.status(500).json({ error: "خطأ في إنشاء الإشعار" });
    }
  });

  app.put("/api/notifications/:id/read", async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const success = await storage.markNotificationAsRead(notificationId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "خطأ في تحديث الإشعار" });
    }
  });

  app.put("/api/notifications/user/:userId/read-all", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const success = await storage.markAllNotificationsAsRead(userId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "خطأ في تحديث الإشعارات" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const success = await storage.deleteNotification(notificationId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "خطأ في حذف الإشعار" });
    }
  });

  app.get("/api/notifications/:userId/unread-count", async (req, res) => {
    try {
      // Check database availability
      if (!db || dbType === 'disabled') {
        return res.json({ count: 0 });
      }
      
      const userId = parseInt(req.params.userId);
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب عدد الإشعارات" });
    }
  });

  // Alternative endpoint with userId in query parameter (for client compatibility)
  app.get("/api/notifications/unread-count", async (req, res) => {
    try {
      // Check database availability
      if (!db || dbType === 'disabled') {
        return res.json({ count: 0 });
      }
      
      const userId = parseInt(req.query.userId as string);
      if (!userId) {
        return res.status(400).json({ error: "معرف المستخدم مطلوب" });
      }
      
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب عدد الإشعارات" });
    }
  });

  // Update user profile - General endpoint - محسّن مع معالجة أفضل للأخطاء
  app.post('/api/users/update-profile', async (req, res) => {
    try {
      const { userId, ...updates } = req.body;
      
      if (!userId) {
        console.error('❌ معرف المستخدم مفقود');
        return res.status(400).json({ 
          error: 'معرف المستخدم مطلوب',
          received: { userId, type: typeof userId }
        });
      }
      
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        console.error('❌ معرف المستخدم ليس رقم:', userId);
        return res.status(400).json({ 
          error: 'معرف المستخدم يجب أن يكون رقم صحيح',
          received: { userId, type: typeof userId }
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
        validatedUpdates.username = updates.username.trim();
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
            valid: validGenders
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
            received: { age: updates.age, type: typeof updates.age }
          });
        }
        
        if (isNaN(age) || age < 13 || age > 120) {
          return res.status(400).json({ 
            error: 'العمر يجب أن يكون رقم بين 13 و 120',
            received: age
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

      // تحديث البيانات
      const updatedUser = await storage.updateUser(userIdNum, validatedUpdates);
      
      if (!updatedUser) {
        console.error('❌ فشل في تحديث قاعدة البيانات');
        return res.status(500).json({ error: 'فشل في تحديث البيانات في قاعدة البيانات' });
      }
      
      // بث موجه للمستخدم + بث خفيف للجميع
      emitUserUpdatedToUser(userIdNum, updatedUser);
      emitUserUpdatedToAll(updatedUser);

      res.json({ 
        success: true, 
        message: 'تم تحديث البروفايل بنجاح', 
        user: updatedUser 
      });
    } catch (error) {
      console.error('❌ خطأ في تحديث البروفايل:', error);
      res.status(500).json({ 
        error: 'خطأ في الخادم',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  });

  // Get user by ID - للحصول على بيانات المستخدم
  app.get('/api/users/:id', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'معرف المستخدم يجب أن يكون رقم صحيح' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      // إرجاع بيانات المستخدم بدون كلمة المرور مع تنظيف البيانات
      const { password, ...userWithoutPassword } = user;
      const payload = buildUserBroadcastPayload(userWithoutPassword);
      res.json(payload);

      
    } catch (error) {
      console.error('❌ خطأ في جلب بيانات المستخدم:', error);
      res.status(500).json({ 
        error: 'خطأ في الخادم',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  });

  // [removed] Legacy endpoint '/api/users/update-background-color' was deprecated. Use PUT /api/users/:id with { profileBackgroundColor } instead.
  // ========== API نظام النقاط والمستويات ==========

  // الحصول على معلومات النقاط والمستوى للمستخدم
  app.get('/api/points/user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
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
      const userId = parseInt(req.params.userId);
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
      
      const result = await pointsService.addPoints(targetUserId, points, reason || 'إضافة يدوية من المشرف');
      
      // إرسال إشعار للمستخدم
      if (result.leveledUp) {
        io.to(targetUserId.toString()).emit('message', {
          type: 'levelUp',
          oldLevel: result.oldLevel,
          newLevel: result.newLevel,
          levelInfo: result.levelInfo,
          message: `🎉 تهانينا! وصلت للمستوى ${result.newLevel}: ${result.levelInfo?.title}`
        });
      }
      
      getIO().to(targetUserId.toString()).emit('message', {
        type: 'pointsAdded',
        points,
        reason: reason || 'مكافأة من الإدارة',
        message: `🎁 حصلت على ${points} نقطة من الإدارة!`
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
      
      const senderIsOwner = (sender.userType === 'owner') || (sender.role === 'owner');
      
      // التحقق من وجود نقاط كافية للمرسل (إلا إذا كان المرسل هو المالك)
      if (!senderIsOwner && (sender.points || 0) < points) {
        return res.status(400).json({ error: 'نقاط غير كافية' });
      }
      
      // خصم النقاط من المرسل (يُتجاوز للمالك)
      if (!senderIsOwner) {
        await pointsService.addPoints(senderId, -points, `إرسال نقاط إلى ${receiver.username}`);
      }
      
      // إضافة النقاط للمستقبل
      const receiverResult = await pointsService.addPoints(receiverId, points, reason || `نقاط من ${sender.username}`);
      
      // إرسال إشعار للمستقبل
      if (receiverResult.leveledUp) {
        io.to(receiverId.toString()).emit('message', {
          type: 'levelUp',
          oldLevel: receiverResult.oldLevel,
          newLevel: receiverResult.newLevel,
          levelInfo: receiverResult.levelInfo,
          message: `🎉 تهانينا! وصلت للمستوى ${receiverResult.newLevel}: ${receiverResult.levelInfo?.title}`
        });
      }
      
      // إشعار وصول النقاط للمستقبل
      getIO().to(receiverId.toString()).emit('message', {
        type: 'pointsReceived',
        points,
        senderName: sender.username,
        message: `🎁 تم استلام ${points} نقطة من ${sender.username}`
      });
      
      // إشعار في المحادثة العامة
      getIO().emit('message', {
        type: 'pointsTransfer',
        senderName: sender.username,
        receiverName: receiver.username,
        points,
        message: `💰 تم إرسال ${points} نقطة من ${sender.username} إلى ${receiver.username}`
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
        user: updatedSender
      });
      
      getIO().to(receiverId.toString()).emit('message', {
        type: 'userUpdated',
        user: updatedReceiver
      });
      
      res.json({ 
        success: true, 
        message: `تم إرسال ${points} نقطة إلى ${receiver.username} بنجاح`,
        senderPoints: updatedSender?.points || 0,
        receiverPoints: updatedReceiver?.points || 0
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
      const userId = parseInt(req.params.userId);
      
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
        const friendIds = friends.map(f => f.id);
        friendIds.push(user.id); // إضافة منشورات المستخدم نفسه
        posts = await storage.getWallPostsByUsers(friendIds);
      } else {
        return res.status(400).json({ error: 'نوع الحائط غير صحيح' });
      }

      res.json({ 
        success: true,
        posts: posts || [],
        count: posts?.length || 0,
        type: type
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
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 85, 
          progressive: true 
        })
        .toFile(tempPath);
      
      // استبدال الملف الأصلي بالمضغوط
      await fs.promises.rename(tempPath, filePath);
      } catch (error) {
      console.error('❌ فشل في ضغط الصورة:', error);
      // حذف الملف المؤقت إن وجد
      try {
        await fs.promises.unlink(filePath + '.tmp');
      } catch {}
    }
  };

  // إنشاء منشور جديد
  app.post('/api/wall/posts', wallUpload.single('image'), async (req, res) => {
    try {
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
          const filePath = path.join(process.cwd(), 'client', 'public', 'uploads', 'wall', req.file.filename);
          await compressImage(filePath);

          // قراءة الملف المضغوط وتحويله إلى base64
          const buffer = await fs.promises.readFile(filePath);
          // استخدم mimetype القادِم من multer وإلا فـ image/jpeg
          const mimeType = req.file.mimetype || 'image/jpeg';
          const base64 = buffer.toString('base64');
          computedImageUrl = `data:${mimeType};base64,${base64}`;

          // حذف الملف الفيزيائي لتجنب مشاكل نظام الملفات المؤقت على Render
          try { await fs.promises.unlink(filePath); } catch {}
        } catch (imgErr) {
          console.error('❌ فشل في تحويل صورة الحائط إلى base64، سيتم استخدام المسار المحلي كبديل:', imgErr);
          // مسار احتياطي في حالة فشل التحويل
          computedImageUrl = `/uploads/wall/${req.file.filename}`;
        }
      }

      // إعداد بيانات المنشور
      const postData = {
        userId: user.id,
        username: user.username,
        userRole: user.userType,
        content: cleanContent ? sanitizeInput(cleanContent) : '',
        imageUrl: computedImageUrl,
        type: type || 'public',
        timestamp: new Date(),
        userProfileImage: user.profileImage,
        usernameColor: user.usernameColor
      };

      // حفظ المنشور
      const post = await storage.createWallPost(postData as any);
      // إرسال إشعار للمستخدمين المتصلين
      const messageData = {
        type: 'newWallPost',
        post,
        wallType: type || 'public'
      };
      
      getIO().emit('message', messageData);
      
      res.json({ 
        success: true,
        post, 
        message: 'تم نشر المنشور بنجاح' 
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
          required: ['postId', 'type', 'userId']
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
          validTypes: validReactionTypes
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
        type
      });

      // جلب المنشور المحدث مع التفاعلات
      const updatedPost = await storage.getWallPostWithReactions(parseInt(postId));
      
      // إرسال تحديث للمستخدمين المتصلين
      getIO().emit('message', {
        type: 'wallPostReaction',
        post: updatedPost,
        reactionType: type,
        username: user.username
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
      const canDelete = isOwner || isAdmin || (isModerator && !['admin', 'owner'].includes(post.userRole));
      
      if (!canDelete) {
        return res.status(403).json({ 
          error: 'ليس لديك صلاحية لحذف هذا المنشور',
          details: `نوع المستخدم: ${user.userType}, صاحب المنشور: ${post.userRole}`
        });
      }

      // حذف الصورة إن وجدت مع معالجة أفضل للأخطاء
      if (post.imageUrl) {
        try {
          const imagePath = path.join(process.cwd(), 'client', 'public', post.imageUrl);
          if (fs.existsSync(imagePath)) {
            // التحقق من أن الملف قابل للحذف
            await fs.promises.access(imagePath, fs.constants.W_OK);
            await fs.promises.unlink(imagePath);
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
        deletedBy: user.username
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
        static_files: 'unknown'
      },
      errors: []
    };

    try {
      // فحص قاعدة البيانات
      try {
        const testUser = await storage.getUser(1);
        healthCheck.services.database = 'healthy';
      } catch (dbError) {
        healthCheck.services.database = 'error';
        healthCheck.errors.push(`Database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
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
        healthCheck.errors.push(`WebSocket: ${wsError instanceof Error ? wsError.message : 'Unknown error'}`);
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
        healthCheck.errors.push(`Static Files: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
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
        error: error instanceof Error ? error.message : 'Unknown health check error'
      });
    }
  });

  // نقطة فحص بسيطة للتحقق السريع
  app.get('/api/ping', (req, res) => {
    res.json({ 
      status: 'pong', 
      timestamp: new Date().toISOString(),
      server: 'running'
    });
  });

  // نقطة فحص Socket.IO
  app.get('/api/socket-status', (req, res) => {
    try {
      const socketInfo = {
        initialized: !!io,
        connected_clients: io ? io.engine.clientsCount : 0,
        transport_types: io ? ['websocket', 'polling'] : [],
        status: io ? 'running' : 'not_initialized'
      };
      
      res.json(socketInfo);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown socket error'
      });
    }
  });

  // تعيين مستوى المستخدم مباشرة (للمالك فقط)
  app.post('/api/points/set-level', async (req, res) => {
    try {
      const { moderatorId, targetUserId, level } = req.body as { moderatorId: number; targetUserId: number; level: number };

      if (!moderatorId || !targetUserId || typeof level !== 'number') {
        return res.status(400).json({ error: 'معاملات ناقصة' });
      }

      const moderator = await storage.getUser(moderatorId);
      if (!moderator || moderator.userType !== 'owner') {
        return res.status(403).json({ error: 'هذا الإجراء متاح للمالك فقط' });
      }

      const targetLevel = DEFAULT_LEVELS.find(l => l.level === level);
      if (!targetLevel) {
        return res.status(400).json({ error: 'مستوى غير صالح' });
      }

      const requiredPoints = targetLevel.requiredPoints;

      const updated = await storage.updateUser(targetUserId, {
        totalPoints: requiredPoints,
        level: recalculateUserStats(requiredPoints).level,
        levelProgress: recalculateUserStats(requiredPoints).levelProgress
      });

      if (!updated) {
        return res.status(400).json({ error: 'فشل في تحديث المستوى' });
      }

      getIO().to(targetUserId.toString()).emit('message', {
        type: 'systemNotification',
        message: `ℹ️ تم تعديل مستواك إلى ${level}`,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true });
    } catch (error) {
      console.error('[SET_LEVEL] Error:', error);
      res.status(500).json({ error: 'خطأ في تعيين المستوى' });
    }
  });

  app.get("/api/moderation/blocked-devices", protect.owner, async (req, res) => {
    try {
      const list = await storage.getAllBlockedDevices();
      res.json({ blockedDevices: list });
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب الأجهزة/العناوين المحجوبة" });
    }
  });

  // رفع صورة رسالة (خاص/عام) - يحول الصورة إلى base64 لتوافق بيئات الاستضافة
  const messageImageUpload = createMulterConfig('messages', 'message', 8 * 1024 * 1024);
  app.post('/api/upload/message-image', messageImageUpload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "لم يتم رفع أي ملف", details: "أرسل الملف في الحقل 'image'" });
      }

      const { senderId, receiverId, roomId } = req.body as any;
      const parsedSenderId = parseInt(senderId);

      if (!parsedSenderId || isNaN(parsedSenderId)) {
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(400).json({ error: 'senderId مطلوب' });
      }

      let imageUrl: string;
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const base64Image = fileBuffer.toString('base64');
        const mimeType = req.file.mimetype;
        imageUrl = `data:${mimeType};base64,${base64Image}`;
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // fallback لمسار ملف ثابت
        imageUrl = `/uploads/messages/${req.file.filename}`;
      }

      // إذا كان receiverId موجوداً، فهذه رسالة خاصة
      if (receiverId) {
        const parsedReceiverId = parseInt(receiverId);
        const newMessage = await storage.createMessage({
          senderId: parsedSenderId,
          receiverId: parsedReceiverId,
          content: imageUrl,
          messageType: 'image',
          isPrivate: true,
          roomId: 'general'
        });
        const sender = await storage.getUser(parsedSenderId);
        const messageWithSender = { ...newMessage, sender };
        getIO().to(parsedReceiverId.toString()).emit('privateMessage', { message: messageWithSender });
        getIO().to(parsedSenderId.toString()).emit('privateMessage', { message: messageWithSender });
        return res.json({ success: true, imageUrl, message: messageWithSender });
      }

      // خلاف ذلك: نعتبرها صورة غرفة
      const targetRoomId = (roomId && typeof roomId === 'string') ? roomId : 'general';
      const newMessage = await storage.createMessage({
        senderId: parsedSenderId,
        content: imageUrl,
        messageType: 'image',
        isPrivate: false,
        roomId: targetRoomId
      });
      const sender = await storage.getUser(parsedSenderId);
      const socketData = {
        type: 'newMessage',
        roomId: targetRoomId,
        message: { ...newMessage, sender },
        timestamp: new Date().toISOString()
      };
      io.to(`room_${targetRoomId}`).emit('message', socketData);

      res.json({ success: true, imageUrl, message: { ...newMessage, sender } });
    } catch (error: any) {
      console.error('❌ خطأ في رفع صورة الرسالة:', error);
      res.status(500).json({ error: 'خطأ في رفع صورة الرسالة', details: error?.message });
    }
  });

  // ===== Site Theme (Global) =====
  app.get('/api/settings/site-theme', async (req, res) => {
    try {
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
        timestamp: new Date().toISOString()
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
      usernameColor: sanitized.usernameColor,
      profileBackgroundColor: sanitized.profileBackgroundColor,
      profileEffect: sanitized.profileEffect,
      isOnline: sanitized.isOnline,
      lastSeen: sanitized.lastSeen,
      points: sanitized.points,
      level: sanitized.level,
      totalPoints: sanitized.totalPoints,
      levelProgress: sanitized.levelProgress,
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
      try { getIO().emit('message', payload); } catch {}
    }
  }

  return httpServer;
}
