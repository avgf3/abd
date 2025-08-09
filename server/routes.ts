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
import { db, dbType } from "./database-adapter";

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
// import { trackClick } from "./middleware/analytics"; // commented out as file doesn't exist
import { enhancedModerationSystem as enhancedModeration } from "./enhanced-moderation";

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

// تتبع المستخدمين المتصلين حقاً عبر Socket
const connectedUsers = new Map<number, {
  user: any,
  socketId: string,
  room: string,
  lastSeen: Date
}>();

// Storage initialization - using imported storage instance
  
// I/O interface
let io: IOServer;

// تعريف Socket مخصص للطباعة
interface CustomSocket extends Socket {
  userId?: number;
  username?: string;
  userType?: string;
  isAuthenticated?: boolean;
}

// دالة broadcast للإرسال لجميع المستخدمين
function broadcast(message: any) {
  if (io) {
    io.emit('message', message);
  }
}

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

const friendService = new (class FriendService {
  async sendFriendRequest(senderId: number, receiverId: number) {
    if (senderId === receiverId) {
      throw new Error('لا يمكنك إرسال طلب صداقة لنفسك');
    }
    
    const existingRequest = await storage.getFriendRequest(senderId, receiverId);
    if (existingRequest) {
      throw new Error('طلب الصداقة مرسل مسبقاً');
    }
    
    return await storage.createFriendRequest(senderId, receiverId);
  }
})();

export async function registerRoutes(app: Express): Promise<Server> {
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

      // حل مشكلة Render: تحويل الصورة إلى base64 وحفظها في قاعدة البيانات
      let imageUrl: string;
      
      try {
        // قراءة الملف كـ base64
        const fileBuffer = fs.readFileSync(req.file.path);
        const base64Image = fileBuffer.toString('base64');
        const mimeType = req.file.mimetype;
        
        // إنشاء data URL
        imageUrl = `data:${mimeType};base64,${base64Image}`;
        
        // حذف الملف الأصلي
        fs.unlinkSync(req.file.path);
        
      } catch (fileError) {
        console.error('❌ خطأ في معالجة الملف:', fileError);
        
        // في حالة فشل base64، استخدم المسار العادي
        imageUrl = `/uploads/profiles/${req.file.filename}`;
        
        // حاول التأكد من وجود المجلد
        const uploadsDir = path.dirname(req.file.path);
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
      }
      
      // تحديث صورة البروفايل في قاعدة البيانات
      const updatedUser = await storage.updateUser(userId, { profileImage: imageUrl });
      
      if (!updatedUser) {
        return res.status(500).json({ error: "فشل في تحديث صورة البروفايل في قاعدة البيانات" });
      }

      // إرسال إشعار للمستخدمين الآخرين عبر WebSocket
      io.emit('user_profile_image_updated', {
        userId: userId,
        profileImage: imageUrl,
        user: updatedUser,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: "تم رفع الصورة بنجاح",
        imageUrl: imageUrl,
        filename: req.file.filename,
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

      // إرسال إشعار للمستخدمين الآخرين عبر WebSocket
      io.emit('user_profile_banner_updated', {
        userId: userId,
        profileBanner: bannerUrl,
        user: updatedUser,
        timestamp: new Date().toISOString()
      });

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
      const updateData = {};
      
      for (const key of allowedUpdates) {
        if (req.body.hasOwnProperty(key)) {
          updateData[key] = req.body[key];
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

  // إدارة الإخفاء للإدمن والمالك
  app.post("/api/users/:userId/toggle-hidden", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { isHidden } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }
      
      // فقط الإدمن والمالك يمكنهم تفعيل الإخفاء
      if (user.userType !== 'admin' && user.userType !== 'owner') {
        return res.status(403).json({ error: "غير مسموح لك بهذا الإجراء" });
      }
      
      await storage.setUserHiddenStatus(userId, isHidden);
      
      res.json({ 
        message: isHidden ? "تم تفعيل وضع المراقبة المخفية" : "تم إلغاء وضع المراقبة المخفية",
        isHidden 
      });
    } catch (error) {
      res.status(500).json({ error: "خطأ في تحديث حالة الإخفاء" });
    }
  });

  // إدارة التجاهل
  app.post("/api/users/:userId/ignore/:targetId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const targetId = parseInt(req.params.targetId);
      
      await storage.addIgnoredUser(userId, targetId);
      
      res.json({ message: "تم تجاهل المستخدم" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في تجاهل المستخدم" });
    }
  });

  app.delete("/api/users/:userId/ignore/:targetId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const targetId = parseInt(req.params.targetId);
      
      await storage.removeIgnoredUser(userId, targetId);
      
      res.json({ message: "تم إلغاء تجاهل المستخدم" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في إلغاء تجاهل المستخدم" });
    }
  });

  app.get("/api/users/:userId/ignored", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const ignoredUsers = await storage.getIgnoredUsers(userId);
      
      res.json({ ignoredUsers });
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب قائمة المتجاهلين" });
    }
  });

  // API endpoints للإدارة
  // Removed duplicate moderation actions endpoint - kept the more detailed one below

  app.get("/api/moderation/reports", async (req, res) => {
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

  app.post("/api/moderation/mute", async (req, res) => {
    try {
      const { moderatorId, targetUserId, reason, duration } = req.body;
      
      const success = await moderationSystem.muteUser(moderatorId, targetUserId, reason, duration);
      if (success) {
        res.json({ message: "تم كتم المستخدم بنجاح" });
      } else {
        res.status(400).json({ error: "فشل في كتم المستخدم" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في كتم المستخدم" });
    }
  });

  app.post("/api/moderation/ban", async (req, res) => {
    try {
      const { moderatorId, targetUserId, reason, duration } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const deviceId = req.headers['user-agent'] || 'unknown';
      
      const success = await moderationSystem.banUser(
        moderatorId, 
        targetUserId, 
        reason, 
        duration, 
        clientIP, 
        deviceId
      );
      
      if (success) {
        const moderator = await storage.getUser(moderatorId);
        const target = await storage.getUser(targetUserId);
        
        // إرسال إشعار خاص للمستخدم المطرود - تحسين الإشعار
        if (target) {
          io.to(targetUserId.toString()).emit('message', {
            type: 'kicked',
            targetUserId: targetUserId,
            duration: duration,
            reason: reason,
            moderatorName: moderator?.username || 'مشرف'
          });
        }

        // إرسال إشعار للدردشة العامة
        const systemMessage = `⏰ تم طرد ${target?.username} من قبل ${moderator?.username} لمدة ${duration} دقيقة - السبب: ${reason}`;
        
        broadcast({
          type: 'moderationAction',
          action: 'banned',
          targetUserId: targetUserId,
          message: systemMessage
        });
        
        // إجبار قطع الاتصال
        setTimeout(() => {
          io.to(targetUserId.toString()).disconnectSockets();
        }, 2000); // إعطاء وقت لاستلام الإشعار
        
        res.json({ message: "تم طرد المستخدم بنجاح" });
      } else {
        res.status(403).json({ error: "غير مسموح لك بهذا الإجراء" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/moderation/block", async (req, res) => {
    try {
      const { moderatorId, targetUserId, reason } = req.body;
      
      const success = await moderationSystem.blockUser(moderatorId, targetUserId, reason);
      if (success) {
        res.json({ message: "تم حجب المستخدم بنجاح" });
      } else {
        res.status(400).json({ error: "فشل في حجب المستخدم" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في حجب المستخدم" });
    }
  });

  app.post("/api/moderation/promote", async (req, res) => {
    try {
      const { moderatorId, targetUserId, newRole } = req.body;
      
      const success = await moderationSystem.promoteUser(moderatorId, targetUserId, newRole);
      if (success) {
        res.json({ message: "تم ترقية المستخدم بنجاح" });
      } else {
        res.status(400).json({ error: "فشل في ترقية المستخدم" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في ترقية المستخدم" });
    }
  });

  app.post("/api/moderation/unmute", async (req, res) => {
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

  app.post("/api/moderation/unblock", async (req, res) => {
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

  // API لتبديل وضع الإخفاء للإدمن والمالك
  app.post("/api/users/:userId/toggle-hidden", async (req, res) => {
    try {
      const { userId } = req.params;
      const { isHidden } = req.body;
      const userIdNum = parseInt(userId);
      
      // التحقق من وجود المستخدم
      const user = await storage.getUser(userIdNum);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }
      
      // التحقق من الصلاحيات - فقط للإدمن والمالك
      if (user.userType !== 'admin' && user.userType !== 'owner') {
        return res.status(403).json({ error: "هذه الخاصية للإدمن والمالك فقط" });
      }
      
      // تحديث حالة الإخفاء
      await storage.setUserHiddenStatus(userIdNum, isHidden);
      
      // إرسال إشعار WebSocket لتحديث قائمة المتصلين
      io.emit('userVisibilityChanged', {
        userId: userIdNum,
        isHidden: isHidden
      });
      
      res.json({ 
        message: isHidden ? "تم تفعيل الوضع المخفي" : "تم إلغاء الوضع المخفي",
        isHidden: isHidden
      });
      
    } catch (error) {
      console.error('خطأ في تبديل وضع الإخفاء:', error);
      res.status(500).json({ error: "خطأ في تبديل وضع الإخفاء" });
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
      
      // إرسال إشعار WebSocket لتحديث لون الاسم
      io.emit('usernameColorChanged', {
        userId: userIdNum,
        color: color
      });
      
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
  
  // إعداد Socket.IO محسن مع أمان وثبات أفضل
  io = new IOServer(httpServer, {
    // إعدادات CORS محسنة
    cors: { 
      origin: process.env.NODE_ENV === 'production' 
        ? [process.env.RENDER_EXTERNAL_URL, "https://abd-ylo2.onrender.com", "https://abd-gmva.onrender.com"].filter(Boolean)
        : "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    path: "/socket.io/",
    
    // إعدادات النقل محسنة للاستقرار
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    
    // إعدادات الاتصال المحسنة
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    allowUpgrades: true,
    
    // إعدادات الأمان
    cookie: false,
    serveClient: false,
    
    // إعدادات الأداء
    maxHttpBufferSize: 1e6, // 1MB
    allowRequest: (req, callback) => {
      // فحص أمني بسيط للطلبات
      const isOriginAllowed = process.env.NODE_ENV !== 'production' || 
        req.headers.origin === process.env.RENDER_EXTERNAL_URL;
      callback(null, isOriginAllowed);
    }
  });
  
  // Health Check endpoint للمراقبة
  app.get('/api/health', (req, res) => {
    res.status(200).json({ 
      status: 'ok', 
              timestamp: new Date(),
      env: process.env.NODE_ENV,
      socketIO: 'enabled'
    });
  });

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
      const users = await storage.getAllUsers();
      // إخفاء المعلومات الحساسة
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
        profileColor: user.profileBackgroundColor,
        profileEffect: user.profileEffect,
        isHidden: user.isHidden
      }));
      res.json({ users: safeUsers });
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

  app.put("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;
      
      const user = await storage.updateUser(userId, updates);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      // Broadcast user update to all connected clients
      io.emit('userUpdated', { user: user });

      res.json({ user });
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

  // جلب رسائل الغرف
  app.get("/api/messages/room/:roomId", async (req, res) => {
    try {
      const { roomId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      // جلب رسائل الغرفة
      const messages = await storage.getRoomMessages(roomId, limit);
      
      // إضافة بيانات المرسلين
      const messagesWithUsers = await Promise.all(
        messages.map(async (msg) => {
          const sender = msg.senderId ? await storage.getUser(msg.senderId) : null;
          return { ...msg, sender };
        })
      );

      res.json({ messages: messagesWithUsers });
    } catch (error) {
      console.error('خطأ في جلب رسائل الغرفة:', error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.get("/api/messages/private/:userId1/:userId2", async (req, res) => {
    try {
      const userId1 = parseInt(req.params.userId1);
      const userId2 = parseInt(req.params.userId2);
      const limit = parseInt(req.query.limit as string) || 50;
      
      const messages = await storage.getPrivateMessages(userId1, userId2, limit);
      
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
        // رسالة خاصة
        io.to(receiverId.toString()).emit('message', {
          envelope: {
            type: 'privateMessage',
            message: { ...message, sender }
          }
        });
        
        // إرسال للمرسل أيضاً
        io.to(senderId.toString()).emit('message', {
          envelope: {
            type: 'privateMessage',
            message: { ...message, sender }
          }
        });
      } else {
        // رسالة عامة
        io.emit('message', {
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

      // Broadcast user update to all connected clients
      io.emit('userUpdated', { user });

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
      
      // Broadcast the color change to all connected clients
      io.emit('usernameColorChanged', {
        userId: userId,
        color: color,
        username: user.username
      });
      
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

  // WebSocket handling محسن مع إدارة أفضل للأخطاء والاتصال
  io.on("connection", (socket: CustomSocket) => {
    // متغيرات محلية لتتبع حالة الاتصال
    let isAuthenticated = false;
    let heartbeatInterval: NodeJS.Timeout | null = null;
    let connectionTimeout: NodeJS.Timeout | null = null;
    
    // إعداد timeout للمصادقة (60 ثانية - زيادة المهلة لتجنب قطع الاتصال المفرط)
    connectionTimeout = setTimeout(() => {
      if (!isAuthenticated) {
        console.warn(`⚠️ انتهت مهلة المصادقة للاتصال ${socket.id}`);
        socket.emit('message', { type: 'error', message: 'انتهت مهلة المصادقة' });
        socket.disconnect(true);
      }
    }, 60000); // زيادة المهلة إلى 60 ثانية
    
    // إرسال رسالة ترحيب فورية
    socket.emit('socketConnected', { 
      message: 'متصل بنجاح',
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
    
    // دالة تنظيف الموارد
    const cleanup = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
    };
    
    // heartbeat محسن للحفاظ على الاتصال
    const startHeartbeat = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      
      let missedPongs = 0;
      const maxMissedPongs = 3;
      
      heartbeatInterval = setInterval(() => {
        if (socket.connected) {
          if (missedPongs >= maxMissedPongs) {
            console.warn(`⚠️ فقدان الاتصال مع ${socket.id} بعد ${maxMissedPongs} محاولات`);
            socket.disconnect(true);
            cleanup();
            return;
          }
          
          socket.emit('ping', { timestamp: Date.now() });
          missedPongs++;
        } else {
          cleanup();
        }
      }, 30000); // تقليل التكرار إلى كل 30 ثانية
      
      // إعادة تعيين العداد عند استلام pong
      socket.on('pong', (data) => {
        missedPongs = 0;
        
        // تحديث آخر نشاط للمستخدم
        const userId = (socket as CustomSocket).userId;
        if (userId && connectedUsers.has(userId)) {
          const userConnection = connectedUsers.get(userId)!;
          userConnection.lastSeen = new Date();
          connectedUsers.set(userId, userConnection);
        }
      });
    };

    // معالج المصادقة الموحد - يدعم الضيوف والمستخدمين المسجلين
    socket.on('auth', async (userData: { userId?: number; username?: string; userType?: string; reconnect?: boolean }) => {
      try {
        // منع المصادقة المتكررة
        if (isAuthenticated && !userData.reconnect) {
          console.warn(`⚠️ محاولة مصادقة متكررة من ${socket.id}`);
          return;
        }
        
        let user;
        
        // إذا كان هناك userId، فهو مستخدم مسجل
        if (userData.userId) {
          user = await storage.getUser(userData.userId);
          if (!user) {
            socket.emit('error', { message: 'المستخدم غير موجود' });
            return;
          }
        } 
        // إذا كان هناك username فقط، فهو ضيف
        else if (userData.username && userData.userType) {
          // البحث عن المستخدم أو إنشاؤه
          user = await storage.getUserByUsername(userData.username);
          
          if (!user) {
            // إنشاء مستخدم ضيف جديد
            const newUser = {
              username: userData.username,
              userType: userData.userType,
              role: userData.userType,
              isOnline: true,
              joinDate: new Date(),
              createdAt: new Date()
            };
            
            user = await storage.createUser(newUser);
          }
        } else {
          socket.emit('error', { message: 'بيانات المصادقة غير مكتملة' });
          return;
        }

        // تحديث معلومات Socket
        (socket as CustomSocket).userId = user.id;
        (socket as CustomSocket).username = user.username;
        (socket as CustomSocket).userType = user.userType;
        (socket as CustomSocket).isAuthenticated = true;
        isAuthenticated = true;
        
        // تنظيف timeout المصادقة
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
        
        // بدء heartbeat
        startHeartbeat();
        
        // إضافة المستخدم لقائمة المتصلين الفعليين
        connectedUsers.set(user.id, {
          user: user,
          socketId: socket.id,
          room: 'general', // البدء بالغرفة العامة دائماً
          lastSeen: new Date()
        });
        // تحديث حالة المستخدم إلى متصل
        try {
          await storage.setUserOnlineStatus(user.id, true);
          // انتظار قصير للتأكد من التحديث في قاعدة البيانات
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (updateError) {
          console.error('خطأ في تحديث حالة المستخدم:', updateError);
        }

        // جلب غرف المستخدم وانضمام إليها
        try {
          const userRooms = await storage.getUserRooms(user.id);
          // التأكد من انضمام للغرفة العامة
          if (!userRooms.includes('general')) {
            await storage.joinRoom(user.id, 'general');
            userRooms.push('general');
          }
          
          // الانضمام للغرفة العامة أولاً في Socket.IO
          socket.join('room_general');
          (socket as any).currentRoom = 'general';
          // انضمام للغرف الأخرى في Socket.IO
          for (const roomId of userRooms) {
            if (roomId !== 'general') {
              socket.join(`room_${roomId}`);
              }
          }
          
          } catch (roomError) {
          console.error('خطأ في انضمام للغرف:', roomError);
          // انضمام للغرفة العامة على الأقل
          socket.join('room_general');
          await storage.joinRoom(user.id, 'general');
          (socket as any).currentRoom = 'general';
          
          // تحديث الغرفة في connectedUsers
          if (connectedUsers.has(user.id)) {
            const userConnection = connectedUsers.get(user.id)!;
            userConnection.room = 'general';
            connectedUsers.set(user.id, userConnection);
          }
        }

        // إرسال تأكيد المصادقة
        socket.emit('authenticated', { 
          message: 'تم الاتصال بنجاح',
          user: user 
        });

        // جلب وإرسال قائمة المستخدمين المتصلين في الغرفة العامة
        const currentRoom = 'general'; // دائماً نبدأ بالغرفة العامة
        // انتظار قصير للتأكد من تحديث قاعدة البيانات
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // جلب قائمة المستخدمين المتصلين فعلياً في هذه الغرفة
        const roomUsers = Array.from(connectedUsers.values())
          .filter(conn => conn.room === currentRoom)
          .map(conn => conn.user);
        
        // جلب المستخدمين من قاعدة البيانات أيضاً
        const dbUsers = await storage.getOnlineUsersInRoom(currentRoom);
        
        // دمج القوائم وإزالة التكرارات
        const allUsers = [...roomUsers];
        for (const dbUser of dbUsers) {
          if (!allUsers.find(u => u.id === dbUser.id)) {
            allUsers.push(dbUser);
          }
        }
        
        // إرسال تأكيد الانضمام مع قائمة المستخدمين
        socket.emit('message', {
          type: 'roomJoined',
          roomId: currentRoom,
          users: allUsers
        });
        
        // إرسال قائمة المستخدمين في الغرفة للمستخدم الجديد
        socket.emit('message', { 
          type: 'onlineUsers', 
          users: allUsers 
        });

        // إخبار باقي المستخدمين في الغرفة بانضمام مستخدم جديد
        socket.to(`room_${currentRoom}`).emit('message', {
          type: 'userJoinedRoom',
          username: user.username,
          userId: user.id,
          roomId: currentRoom
        });

        // إرسال قائمة محدثة لجميع المستخدمين في الغرفة
        io.to(`room_${currentRoom}`).emit('message', {
          type: 'onlineUsers',
          users: allUsers
        });

        // إرسال رسالة ترحيب في الغرفة
        const welcomeMessage = {
          id: Date.now(),
          senderId: -1, // معرف خاص للنظام
          content: `انضم ${user.username} إلى الغرفة 👋`,
          messageType: 'system',
          isPrivate: false,
          roomId: currentRoom,
          timestamp: new Date(),
          sender: {
            id: -1,
            username: 'النظام',
            userType: 'moderator',
            role: 'system',
            level: 0,
            points: 0,
            achievements: [],
            lastSeen: new Date(),
            isOnline: true,
            isBanned: false,
            isActive: true,
            currentRoom: '',
            settings: {
              theme: 'default',
              language: 'ar',
              notifications: true,
              soundEnabled: true,
              privateMessages: true
            }
          }
        };
        
        io.to(`room_${currentRoom}`).emit('message', {
          type: 'newMessage',
          message: welcomeMessage
        });

      } catch (error) {
        console.error('❌ خطأ في المصادقة:', error);
        socket.emit('error', { message: 'خطأ في المصادقة' });
      }
    });

    // 🚀 تحسين: تقليل استدعاءات المستخدمين - زيادة الفترة الزمنية
    let lastUserListRequest = 0;
    const USER_LIST_THROTTLE = 5000; // زيادة إلى 5 ثوان لتقليل التحميل
    
    socket.on('requestOnlineUsers', async () => {
      try {
        if (!(socket as CustomSocket).isAuthenticated) {
          console.warn('⚠️ طلب قائمة مستخدمين من مستخدم غير مصادق');
          return;
        }

        // 🚀 تحسين: حماية أقوى من الطلبات المتكررة
        const now = Date.now();
        if (now - lastUserListRequest < USER_LIST_THROTTLE) {
          console.log(`🔄 تجاهل طلب متكرر للمستخدمين من ${socket.id}`);
          return;
        }
        lastUserListRequest = now;

        const currentRoom = (socket as any).currentRoom || 'general';
        
        // 🚀 تحسين: فلترة وتنظيف بيانات المستخدمين
        const roomUsers = Array.from(connectedUsers.values())
          .filter(conn => {
            return conn.room === currentRoom && 
                   conn.user && 
                   conn.user.id && 
                   conn.user.username && 
                   conn.user.userType;
          })
          .map(conn => conn.user);
        
        // إرسال للمستخدم الطالب فقط (وليس broadcast للكل)
        socket.emit('message', { 
          type: 'onlineUsers', 
          users: roomUsers 
        });
        
        console.log(`✅ تم إرسال قائمة ${roomUsers.length} مستخدم للغرفة ${currentRoom}`);
        
        } catch (error) {
        console.error('❌ خطأ في جلب المستخدمين المتصلين:', error);
      }
    });

    socket.on('publicMessage', async (data) => {
      try {
        if (!socket.userId) return;
        
        // التحقق من حالة المستخدم بشكل بسيط
        const user = await storage.getUser(socket.userId);
        if (!user) {
          socket.emit('message', {
            type: 'error',
            message: 'المستخدم غير موجود'
          });
          return;
        }
        
        // فحص حالة الحظر أو الكتم فقط إذا كانت موجودة في قاعدة البيانات
        if (user.isBanned) {
          socket.emit('message', {
            type: 'error',
            message: 'أنت محظور ولا يمكنك إرسال رسائل'
          });
          return;
        }
        
        if (user.isMuted) {
          socket.emit('message', {
            type: 'error',
            message: 'أنت مكتوم ولا يمكنك إرسال رسائل في الدردشة العامة'
          });
          return;
        }

        // تنظيف المحتوى
        const sanitizedContent = sanitizeInput(data.content);
        
        // فحص صحة المحتوى
        const contentCheck = validateMessageContent(sanitizedContent);
        if (!contentCheck.isValid) {
          socket.emit('message', { type: 'error', message: contentCheck.reason });
          return;
        }
        
        // فحص الرسالة ضد السبام
        const spamCheck = spamProtection.checkMessage(socket.userId, sanitizedContent);
        if (!spamCheck.isAllowed) {
          socket.emit('message', { type: 'error', message: spamCheck.reason, action: spamCheck.action });
          return;
        }

        const roomId = data.roomId || 'general';
        
        // التحقق من صلاحيات البث المباشر (فقط للغرف غير العامة)
        if (roomId !== 'general') {
          const room = await storage.getRoom(roomId);
          if (room && room.is_broadcast) {
            const broadcastInfo = await storage.getBroadcastRoomInfo(roomId);
            if (broadcastInfo) {
              const isHost = broadcastInfo.hostId === socket.userId;
              const isSpeaker = broadcastInfo.speakers.includes(socket.userId);
              
              if (!isHost && !isSpeaker) {
                socket.emit('message', {
                  type: 'error',
                  message: 'فقط المضيف والمتحدثون يمكنهم إرسال الرسائل في غرفة البث المباشر'
                });
                return;
              }
            }
          }
        }
        
        const newMessage = await storage.createMessage({
          senderId: socket.userId,
          content: sanitizedContent,
          messageType: data.messageType || 'text',
          isPrivate: false,
          roomId: roomId,
        });
        
        // إضافة نقاط لإرسال رسالة
        try {
          const pointsResult = await pointsService.addMessagePoints(socket.userId);
          
          // التحقق من إنجاز أول رسالة
          const achievementResult = await pointsService.checkAchievement(socket.userId, 'FIRST_MESSAGE');
          
          // إرسال إشعار ترقية المستوى إذا حدثت
          if (pointsResult?.leveledUp) {
            socket.emit('message', {
              type: 'levelUp',
              oldLevel: pointsResult.oldLevel,
              newLevel: pointsResult.newLevel,
              levelInfo: pointsResult.levelInfo,
              message: `🎉 تهانينا! وصلت للمستوى ${pointsResult.newLevel}: ${pointsResult.levelInfo?.title}`
            });
          }
          
          // إرسال إشعار إنجاز أول رسالة
          if (achievementResult?.leveledUp) {
            socket.emit('message', {
              type: 'achievement',
              message: `🏆 إنجاز جديد: أول رسالة! حصلت على ${achievementResult.newPoints - pointsResult.newPoints} نقطة إضافية!`
            });
          }
          
          // تحديث بيانات المستخدم في الذاكرة والإرسال للعملاء
          const updatedSender = await storage.getUser(socket.userId);
          if (updatedSender) {
            // إرسال البيانات المحدثة للمستخدم
            socket.emit('message', {
              type: 'userUpdated',
              user: updatedSender
            });
          }
        } catch (pointsError) {
          console.error('خطأ في إضافة النقاط:', pointsError);
        }
        
        const sender = await storage.getUser(socket.userId);
        // إرسال الرسالة فقط للمستخدمين في نفس الغرفة
        io.to(`room_${roomId}`).emit('message', { 
          type: 'newMessage',
          message: { ...newMessage, sender, roomId }
        });
      } catch (error) {
        console.error('خطأ في إرسال الرسالة العامة:', error);
        socket.emit('message', { type: 'error', message: 'خطأ في إرسال الرسالة' });
      }
    });

    socket.on('privateMessage', async (data) => {
      try {
        if (!socket.userId) return;
        
        const { receiverId, content, messageType = 'text' } = data;
        
        // التحقق من المستقبل
        const receiver = await storage.getUser(receiverId);
        if (!receiver) {
          socket.emit('message', { type: 'error', message: 'المستقبل غير موجود' });
          return;
        }
        
        // إنشاء الرسالة الخاصة
        const newMessage = await storage.createMessage({
          senderId: socket.userId,
          receiverId: receiverId,
          content: content.trim(),
          messageType,
          isPrivate: true
        });
        
        const sender = await storage.getUser(socket.userId);
        const messageWithSender = { ...newMessage, sender };
        
        // إرسال للمستقبل
        io.to(receiverId.toString()).emit('message', {
          envelope: {
            type: 'privateMessage',
            message: messageWithSender
          }
        });
        
        // إرسال للمرسل أيضاً
        socket.emit('message', {
          envelope: {
            type: 'privateMessage',
            message: messageWithSender
          }
        });
        
      } catch (error) {
        console.error('خطأ في إرسال الرسالة الخاصة:', error);
        socket.emit('message', { type: 'error', message: 'خطأ في إرسال الرسالة الخاصة' });
      }
    });

    socket.on('sendFriendRequest', async (data) => {
      try {
        if (!socket.userId) return;
        
        const { targetUserId } = data;
        
        // التحقق من المستخدم المستهدف
        const targetUser = await storage.getUser(targetUserId);
        if (!targetUser) {
          socket.emit('message', { type: 'error', message: 'المستخدم غير موجود' });
          return;
        }
        
        // إنشاء طلب الصداقة
        const friendRequest = await storage.createFriendRequest(socket.userId, targetUserId);
        
        // إرسال إشعار للمستخدم المستهدف
        const sender = await storage.getUser(socket.userId);
        io.to(targetUserId.toString()).emit('message', {
          type: 'friendRequest',
          targetUserId: targetUserId,
          senderId: socket.userId,
          senderUsername: sender?.username,
          message: `${sender?.username} يريد إضافتك كصديق`
        });
        
        socket.emit('message', {
          type: 'notification',
          message: 'تم إرسال طلب الصداقة'
        });
        
      } catch (error) {
        console.error('خطأ في إرسال طلب الصداقة:', error);
        socket.emit('message', { type: 'error', message: 'خطأ في إرسال طلب الصداقة' });
      }
    });

    socket.on('typing', (data) => {
      const { isTyping } = data;
      socket.broadcast.emit('message', {
        type: 'typing',
        username: socket.username,
        isTyping
      });
    });

    socket.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        switch (message.type) {
          case 'auth':
            socket.userId = message.userId;
            socket.username = message.username;
            
            // انضمام للغرفة الخاصة بالمستخدم للرسائل المباشرة
            socket.join(message.userId.toString());
            
            // فحص حالة المستخدم قبل السماح بالاتصال
            const authUserStatus = await moderationSystem.checkUserStatus(message.userId);
            if (authUserStatus.isBlocked) {
              socket.emit('error', {
                type: 'error',
                message: 'أنت محجوب نهائياً من الدردشة',
                action: 'blocked'
              });
              socket.disconnect();
              return;
            }
            
            if (authUserStatus.isBanned) {
              socket.emit('error', {
                type: 'error',
                message: `أنت مطرود من الدردشة لمدة ${authUserStatus.timeLeft} دقيقة`,
                action: 'banned'
              });
              socket.disconnect();
              return;
            }
            
            await storage.setUserOnlineStatus(message.userId, true);
            
            // Broadcast user joined
            const joinedUser = await storage.getUser(message.userId);
            io.emit('userJoined', { user: joinedUser });
            
            // Send online users list with moderation status to all clients
            const onlineUsers = await storage.getOnlineUsers();
            const usersWithStatus = await Promise.all(
              onlineUsers.map(async (user) => {
                const status = await moderationSystem.checkUserStatus(user.id);
                return {
                  ...user,
                  isMuted: status.isMuted,
                  isBlocked: status.isBlocked,
                  isBanned: status.isBanned
                };
              })
            );
            
            // إزالة البث العالمي لقائمة المستخدمين لتفادي وميض القائمة
            // سيتم إرسال قوائم المستخدمين حسب الغرفة فقط عبر أحداث roomJoined/room switches وrequestOnlineUsers
            break;

          case 'publicMessage':
            // التحقق الأولي من وجود معرف المستخدم والجلسة
            if (!socket.userId || !socket.username) {
              socket.emit('error', {
                type: 'error',
                message: 'جلسة غير صالحة - يرجى إعادة تسجيل الدخول',
                action: 'invalid_session'
              });
              socket.disconnect(true);
              break;
            }
            
            // التحقق من وجود المستخدم في قاعدة البيانات
            const currentUser = await storage.getUser(socket.userId);
            if (!currentUser) {
              socket.emit('error', {
                type: 'error',
                message: 'المستخدم غير موجود في النظام',
                action: 'user_not_found'
              });
              socket.disconnect(true);
              break;
            }
            
            // التحقق من أن المستخدم متصل فعلياً
            if (!currentUser.isOnline) {
              socket.emit('error', {
                type: 'error',
                message: 'المستخدم غير متصل',
                action: 'user_offline'
              });
              socket.disconnect(true);
              break;
            }
            
            if (socket.userId) {
              // فحص حالة الكتم والحظر
              const userStatus = await moderationSystem.checkUserStatus(socket.userId);
              if (userStatus.isMuted) {
                socket.emit('error', {
                  type: 'error',
                  message: 'أنت مكتوم ولا يمكنك إرسال رسائل في الدردشة العامة. يمكنك التحدث في الرسائل الخاصة.',
                  action: 'muted'
                });
                break;
              }
              
              if (userStatus.isBanned) {
                socket.emit('error', {
                  type: 'error',
                  message: 'أنت مطرود من الدردشة',
                  action: 'banned'
                });
                break;
              }
              
              if (userStatus.isBlocked) {
                socket.emit('error', {
                  type: 'error',
                  message: 'أنت محجوب نهائياً من الدردشة',
                  action: 'blocked'
                });
                // قطع الاتصال للمحجوبين
                socket.disconnect();
                break;
              }

              // تنظيف المحتوى
              const sanitizedContent = sanitizeInput(message.content);
              
              // فحص صحة المحتوى
              const contentCheck = validateMessageContent(sanitizedContent);
              if (!contentCheck.isValid) {
                socket.emit('error', {
                  type: 'error',
                  message: contentCheck.reason
                });
                break;
              }
              
              // فحص الرسالة ضد السبام
              const spamCheck = spamProtection.checkMessage(socket.userId, sanitizedContent);
              if (!spamCheck.isAllowed) {
                socket.emit('error', {
                  type: 'error',
                  message: spamCheck.reason,
                  action: spamCheck.action
                });
                
                // إرسال تحذير إذا لزم الأمر
                if (spamCheck.action === 'warn') {
                  socket.emit('warning', {
                    message: 'تم إعطاؤك تحذير بسبب مخالفة قوانين الدردشة'
                  });
                }
                break;
              }

              const newMessage = await storage.createMessage({
                senderId: socket.userId,
                content: sanitizedContent,
                messageType: message.messageType || 'text',
                isPrivate: false,
              });
              
              const sender = await storage.getUser(socket.userId);
              io.emit('newMessage', { message: { ...newMessage, sender } });
            }
            break;

          case 'privateMessage':
            // التحقق الأولي من وجود معرف المستخدم والجلسة
            if (!socket.userId || !socket.username) {
              socket.emit('error', {
                type: 'error',
                message: 'جلسة غير صالحة - يرجى إعادة تسجيل الدخول',
                action: 'invalid_session'
              });
              socket.disconnect(true);
              break;
            }
            
            // التحقق من وجود المستخدم في قاعدة البيانات
            const currentUserPrivate = await storage.getUser(socket.userId);
            if (!currentUserPrivate) {
              socket.emit('error', {
                type: 'error',
                message: 'المستخدم غير موجود في النظام',
                action: 'user_not_found'
              });
              socket.disconnect(true);
              break;
            }
            
            if (socket.userId) {
              // منع إرسال رسالة للنفس
              if (socket.userId === message.receiverId) {
                socket.emit('error', {
                  type: 'error',
                  message: 'لا يمكن إرسال رسالة لنفسك',
                  action: 'blocked'
                });
                break;
              }

              // تنظيف المحتوى
              const sanitizedContent = sanitizeInput(message.content);
              
              // فحص صحة المحتوى
              const contentCheck = validateMessageContent(sanitizedContent);
              if (!contentCheck.isValid) {
                socket.emit('error', {
                  type: 'error',
                  message: contentCheck.reason
                });
                break;
              }
              
              // فحص الرسالة الخاصة ضد السبام
              const spamCheck = spamProtection.checkMessage(socket.userId, sanitizedContent);
              if (!spamCheck.isAllowed) {
                socket.emit('error', {
                  type: 'error',
                  message: spamCheck.reason,
                  action: spamCheck.action
                });
                break;
              }

              const newMessage = await storage.createMessage({
                senderId: socket.userId,
                receiverId: message.receiverId,
                content: sanitizedContent,
                messageType: message.messageType || 'text',
                isPrivate: true,
              });
              
              const sender = await storage.getUser(socket.userId);
              const messageWithSender = { ...newMessage, sender };
              
              // Send to receiver only using Socket.IO rooms
              io.to(message.receiverId.toString()).emit('privateMessage', { message: messageWithSender });
              
              // Send back to sender with confirmation
              socket.emit('privateMessage', { message: messageWithSender });
            }
            break;

          case 'typing':
            if (socket.userId) {
              io.emit('userTyping', {
                userId: socket.userId,
                username: socket.username,
                isTyping: message.isTyping,
              });
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    // معالجة انضمام للغرفة
    socket.on('joinRoom', async (data) => {
      try {
        const { roomId } = data;
        const userId = (socket as CustomSocket).userId; // استخدام userId من الجلسة
        const username = (socket as CustomSocket).username;
        
        if (!userId) {
          socket.emit('message', { type: 'error', message: 'يجب تسجيل الدخول أولاً' });
          return;
        }
        
        // مغادرة الغرفة السابقة إن وجدت
        const previousRoom = (socket as any).currentRoom;
        if (previousRoom && previousRoom !== roomId) {
          socket.leave(`room_${previousRoom}`);
          
          // إرسال رسالة وداع في الغرفة السابقة
          const goodbyeMessage = {
            id: Date.now(),
            senderId: -1,
            content: `غادر ${username} الغرفة 👋`,
            messageType: 'system',
            isPrivate: false,
            roomId: previousRoom,
            timestamp: new Date(),
            sender: {
              id: -1,
              username: 'النظام',
              userType: 'moderator',
              role: 'system',
              level: 0,
              points: 0,
              achievements: [],
              lastSeen: new Date(),
              isOnline: true,
              isBanned: false,
              isActive: true,
              currentRoom: '',
              settings: {
                theme: 'default',
                language: 'ar',
                notifications: true,
                soundEnabled: true,
                privateMessages: true
              }
            }
          };
          
          socket.to(`room_${previousRoom}`).emit('message', {
            type: 'newMessage',
            message: goodbyeMessage
          });
          
          // إشعار المستخدمين في الغرفة السابقة
          socket.to(`room_${previousRoom}`).emit('message', {
            type: 'userLeftRoom',
            username: username,
            userId: userId,
            roomId: previousRoom
          });
          
          // إرسال قائمة محدثة للغرفة السابقة
          const previousRoomUsers = Array.from(connectedUsers.values())
            .filter(conn => conn.room === previousRoom)
            .map(conn => conn.user);
          
          const previousDbUsers = await storage.getOnlineUsersInRoom(previousRoom);
          const allPreviousUsers = [...previousRoomUsers];
          for (const dbUser of previousDbUsers) {
            if (!allPreviousUsers.find(u => u.id === dbUser.id) && dbUser.id !== userId) {
              allPreviousUsers.push(dbUser);
            }
          }
          
          io.to(`room_${previousRoom}`).emit('message', {
            type: 'onlineUsers',
            users: allPreviousUsers
          });
        }
        
        // الانضمام للغرفة الجديدة في Socket.IO
        socket.join(`room_${roomId}`);
        
        // حفظ الغرفة الحالية في الـ socket
        (socket as any).currentRoom = roomId;
        
        // حفظ في قاعدة البيانات
        await storage.joinRoom(userId, roomId);
        
        // تحديث الغرفة في قائمة المتصلين الفعليين
        if (connectedUsers.has(userId)) {
          const userConnection = connectedUsers.get(userId)!;
          userConnection.room = roomId;
          userConnection.lastSeen = new Date();
          connectedUsers.set(userId, userConnection);
          }
        
        // انتظار قصير للتأكد من التحديث
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // جلب قائمة المستخدمين المتصلين في الغرفة الجديدة
        const roomUsers = Array.from(connectedUsers.values())
          .filter(conn => conn.room === roomId)
          .map(conn => conn.user);
        
        const dbUsers = await storage.getOnlineUsersInRoom(roomId);
        const allUsers = [...roomUsers];
        for (const dbUser of dbUsers) {
          if (!allUsers.find(u => u.id === dbUser.id)) {
            allUsers.push(dbUser);
          }
        }
        
        // إرسال تأكيد الانضمام مع قائمة المستخدمين
        socket.emit('message', {
          type: 'roomJoined',
          roomId: roomId,
          users: allUsers
        });
        
        // إشعار باقي المستخدمين في الغرفة
        socket.to(`room_${roomId}`).emit('message', {
          type: 'userJoinedRoom',
          username: username,
          userId: userId,
          roomId: roomId
        });
        
        // إرسال قائمة محدثة للمستخدمين في الغرفة
        io.to(`room_${roomId}`).emit('message', {
          type: 'onlineUsers',
          users: allUsers
        });
        
        // إرسال رسالة ترحيب في الغرفة
        const welcomeMessage = {
          id: Date.now(),
          senderId: -1, // معرف خاص للنظام
          content: `انضم ${username} إلى الغرفة 👋`,
          messageType: 'system',
          isPrivate: false,
          roomId: roomId,
          timestamp: new Date(),
          sender: {
            id: -1,
            username: 'النظام',
            userType: 'moderator',
            role: 'system',
            level: 0,
            points: 0,
            achievements: [],
            lastSeen: new Date(),
            isOnline: true,
            isBanned: false,
            isActive: true,
            currentRoom: '',
            settings: {
              theme: 'default',
              language: 'ar',
              notifications: true,
              soundEnabled: true,
              privateMessages: true
            }
          }
        };
        
        io.to(`room_${roomId}`).emit('message', {
          type: 'newMessage',
          message: welcomeMessage
        });
        
        // جلب آخر الرسائل في الغرفة الجديدة
        const recentMessages = await storage.getRoomMessages(roomId, 50);
        socket.emit('message', {
          type: 'roomMessages',
          messages: recentMessages
        });
        
      } catch (error) {
        console.error('❌ خطأ في الانضمام للغرفة:', error);
        socket.emit('message', { type: 'error', message: 'فشل الانضمام للغرفة' });
      }
    });

    // معالجة مغادرة الغرفة
    socket.on('leaveRoom', async (data) => {
      try {
        const { roomId } = data;
        const userId = (socket as CustomSocket).userId; // استخدام userId من الجلسة
        const username = (socket as CustomSocket).username;
        
        if (!userId) {
          socket.emit('message', { type: 'error', message: 'يجب تسجيل الدخول أولاً' });
          return;
        }
        
        // المغادرة من الغرفة في Socket.IO
        socket.leave(`room_${roomId}`);
        
        // حذف من قاعدة البيانات
        await storage.leaveRoom(userId, roomId);
        
        // مسح الغرفة الحالية من الـ socket
        if ((socket as any).currentRoom === roomId) {
          (socket as any).currentRoom = null;
        }
        
        // جلب قائمة المستخدمين المحدثة في الغرفة
        const updatedRoomUsers = await storage.getOnlineUsersInRoom(roomId);
        
        // إرسال تأكيد المغادرة
        socket.emit('message', {
          type: 'roomLeft',
          roomId: roomId
        });
        
        // إشعار باقي المستخدمين في الغرفة
        socket.to(`room_${roomId}`).emit('message', {
          type: 'userLeftRoom',
          username: username,
          roomId: roomId
        });
        
        // إرسال قائمة محدثة للمستخدمين المتبقين في الغرفة
        io.to(`room_${roomId}`).emit('message', {
          type: 'onlineUsers',
          users: updatedRoomUsers
        });
        
      } catch (error) {
        console.error('خطأ في مغادرة الغرفة:', error);
        socket.emit('message', { type: 'error', message: 'خطأ في مغادرة الغرفة' });
      }
    });

    // معالج قطع الاتصال المحسن
    socket.on('disconnect', async (reason) => {
      // تنظيف جميع الموارد
      cleanup();
      
      const customSocket = socket as CustomSocket;
      if (customSocket.userId && isAuthenticated) {
        try {
          const currentRoom = (socket as any).currentRoom || 'general';
          const userId = customSocket.userId;
          const username = customSocket.username;
          
          // إزالة المستخدم من قائمة المتصلين الفعليين أولاً
          connectedUsers.delete(userId);
          // تحديث حالة المستخدم في قاعدة البيانات
          await storage.setUserOnlineStatus(userId, false);
          
          // إزالة المستخدم من جميع الغرف في قاعدة البيانات
          await storage.leaveRoom(userId, currentRoom);
          
          // إزالة المستخدم من جميع الغرف
          socket.leave(userId.toString());
          
          // إشعار المستخدمين في الغرفة الحالية بخروج المستخدم
          if (currentRoom) {
            // إرسال رسالة وداع في الغرفة
            const goodbyeMessage = {
              id: Date.now(),
              senderId: -1,
              content: `غادر ${username} الغرفة 👋`,
              messageType: 'system',
              isPrivate: false,
              roomId: currentRoom,
              timestamp: new Date(),
              sender: {
                id: -1,
                username: 'النظام',
                userType: 'moderator',
                role: 'system',
                level: 0,
                points: 0,
                achievements: [],
                lastSeen: new Date(),
                isOnline: true,
                isBanned: false,
                isActive: true,
                currentRoom: '',
                settings: {
                  theme: 'default',
                  language: 'ar',
                  notifications: true,
                  soundEnabled: true,
                  privateMessages: true
                }
              }
            };
            
            io.to(`room_${currentRoom}`).emit('message', {
              type: 'newMessage',
              message: goodbyeMessage
            });
            
            // إشعار بخروج المستخدم
            io.to(`room_${currentRoom}`).emit('message', {
              type: 'userLeftRoom',
              userId: userId,
              username: username,
              roomId: currentRoom
            });
            
            // انتظار قصير للتأكد من التحديث
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // جلب قائمة المستخدمين المحدثة من connectedUsers
            const roomUsers = Array.from(connectedUsers.values())
              .filter(conn => conn.room === currentRoom)
              .map(conn => conn.user);
            
            // جلب المستخدمين من قاعدة البيانات أيضاً
            const dbUsers = await storage.getOnlineUsersInRoom(currentRoom);
            
            // دمج القوائم وإزالة التكرارات والمستخدم الذي غادر
            const allUsers = [...roomUsers];
            for (const dbUser of dbUsers) {
              if (!allUsers.find(u => u.id === dbUser.id) && dbUser.id !== userId) {
                allUsers.push(dbUser);
              }
            }
            
            // إرسال قائمة محدثة للمستخدمين في الغرفة فقط (تقليل الطلبات)
            io.to(`room_${currentRoom}`).emit('message', { 
              type: 'onlineUsers', 
              users: allUsers 
            });
          }
          
          // إشعار جميع المستخدمين بخروج المستخدم
          io.emit('message', {
            type: 'userLeft',
            userId: userId,
            username: username,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error(`❌ خطأ في تنظيف جلسة ${customSocket.username}:`, error);
        } finally {
          // تنظيف متغيرات الجلسة في جميع الأحوال
          customSocket.userId = undefined;
          customSocket.username = undefined;
          customSocket.isAuthenticated = false;
        }
      }
    });
    
    // معالج أخطاء Socket.IO
    socket.on('error', (error) => {
      const customSocket = socket as CustomSocket;
      console.error(`❌ خطأ Socket.IO للمستخدم ${customSocket.username || socket.id}:`, error);
      cleanup();
    });
    
    // بدء heartbeat بعد الإعداد
    startHeartbeat();


  });

  function broadcast(message: any) {
    io.emit(message.type || 'broadcast', message.data || message);
  }

  // فحص دوري لتنظيف الجلسات المنتهية الصلاحية
  const sessionCleanupInterval = setInterval(async () => {
    try {
      const connectedSockets = await io.fetchSockets();
      for (const socket of connectedSockets) {
        const customSocket = socket as any;
        if (customSocket.userId) {
          try {
            // التحقق من وجود المستخدم في قاعدة البيانات
            const user = await storage.getUser(customSocket.userId);
            if (!user || !user.isOnline) {
              socket.disconnect(true);
            }
          } catch (error) {
            console.error('خطأ في فحص الجلسة:', error);
            // لا نقطع الاتصال في حالة خطأ قاعدة البيانات
          }
        }
      }
    } catch (error) {
      console.error('خطأ في تنظيف الجلسات:', error);
    }
  }, 300000); // كل 5 دقائق لتقليل الضغط على الخادم

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
    clearInterval(sessionCleanupInterval);
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

      const allUsers = await storage.getAllUsers();
      const searchTerm = (q as string).toLowerCase();
      
      const filteredUsers = allUsers.filter(user => 
        user.id !== parseInt(userId as string) && // استبعاد المستخدم الحالي
        user.username.toLowerCase().includes(searchTerm)
      ).slice(0, 10); // حد أقصى 10 نتائج

      res.json({ users: filteredUsers });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // إرسال طلب صداقة
  app.post("/api/friend-requests", async (req, res) => {
    try {
      console.log('📝 Friend request received:', req.body);
      const { senderId, receiverId } = req.body;
      
      if (!senderId || !receiverId) {
        console.log('❌ Missing senderId or receiverId:', { senderId, receiverId });
        return res.status(400).json({ error: "معلومات المرسل والمستقبل مطلوبة" });
      }

      if (senderId === receiverId) {
        return res.status(400).json({ error: "لا يمكنك إرسال طلب صداقة لنفسك" });
      }

      console.log('🔍 Checking for existing request between:', senderId, receiverId);
      
      // التحقق من وجود طلب سابق
      const existingRequest = await storage.getFriendRequest(senderId, receiverId);
      if (existingRequest) {
        console.log('⚠️ Friend request already exists:', existingRequest);
        return res.status(400).json({ error: "طلب الصداقة موجود بالفعل" });
      }

      // التحقق من الصداقة الموجودة
      const friendship = await storage.getFriendship(senderId, receiverId);
      if (friendship) {
        console.log('⚠️ Friendship already exists:', friendship);
        return res.status(400).json({ error: "أنتما أصدقاء بالفعل" });
      }

      console.log('✅ Creating friend request...');
      const request = await storage.createFriendRequest(senderId, receiverId);
      console.log('✅ Friend request created:', request);
      
      // إرسال إشعار عبر WebSocket
      const sender = await storage.getUser(senderId);
      broadcast({
        type: 'friendRequestReceived',
        targetUserId: receiverId,
        senderName: sender?.username,
        senderId: senderId
      });

      // إنشاء إشعار حقيقي في قاعدة البيانات
      await storage.createNotification({
        userId: receiverId,
        type: 'friendRequest',
        title: '👫 طلب صداقة جديد',
        message: `أرسل ${sender?.username} طلب صداقة إليك`,
        data: { requestId: request.id, senderId: senderId, senderName: sender?.username }
      });

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
      const existingRequest = await storage.getFriendRequest(senderId, targetUser.id);
      if (existingRequest) {
        return res.status(400).json({ error: "طلب الصداقة موجود بالفعل" });
      }

      // التحقق من الصداقة الموجودة
      const friendship = await storage.getFriendship(senderId, targetUser.id);
      if (friendship) {
        return res.status(400).json({ error: "أنتما أصدقاء بالفعل" });
      }

      const request = await storage.createFriendRequest(senderId, targetUser.id);
      
      // إرسال إشعار عبر WebSocket
      const sender = await storage.getUser(senderId);
      broadcast({
        type: 'friendRequestReceived',
        targetUserId: targetUser.id,
        senderName: sender?.username,
        senderId: senderId
      });

      // إنشاء إشعار حقيقي في قاعدة البيانات
      await storage.createNotification({
        userId: targetUser.id,
        type: 'friendRequest',
        title: '👫 طلب صداقة جديد',
        message: `أرسل ${sender?.username} طلب صداقة إليك`,
        data: { requestId: request.id, senderId: senderId, senderName: sender?.username }
      });

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
        storage.getIncomingFriendRequests(userId),
        storage.getOutgoingFriendRequests(userId)
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
      const requests = await storage.getIncomingFriendRequests(userId);
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // الحصول على طلبات الصداقة الصادرة
  app.get("/api/friend-requests/outgoing/:userId", friendRequestLimiter, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const requests = await storage.getOutgoingFriendRequests(userId);
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
      
      const request = await storage.getFriendRequestById(requestId);
      if (!request || request.receiverId !== userId) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      // قبول طلب الصداقة وإضافة الصداقة
      await storage.acceptFriendRequest(requestId);
      await storage.addFriend(request.senderId, request.receiverId);
      
      // الحصول على بيانات المستخدمين
      const receiver = await storage.getUser(userId);
      const sender = await storage.getUser(request.senderId);
      
      // إرسال إشعار WebSocket لتحديث قوائم الأصدقاء
      broadcast({
        type: 'friendAdded',
        targetUserId: request.senderId,
        friendId: request.receiverId,
        friendName: receiver?.username
      });
      
      broadcast({
        type: 'friendAdded', 
        targetUserId: request.receiverId,
        friendId: request.senderId,
        friendName: sender?.username
      });
      broadcast({
        type: 'friendRequestAccepted',
        targetUserId: request.senderId,
        senderName: receiver?.username
      });

      // إنشاء إشعار حقيقي في قاعدة البيانات
      await storage.createNotification({
        userId: request.senderId,
        type: 'friendAccepted',
        title: '✅ تم قبول طلب الصداقة',
        message: `قبل ${receiver?.username} طلب صداقتك`,
        data: { friendId: userId, friendName: receiver?.username }
      });

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
      
      const request = await storage.getFriendRequestById(requestId);
      if (!request || request.receiverId !== userId) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      await storage.declineFriendRequest(requestId);
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
      
      const request = await storage.getFriendRequestById(requestId);
      if (!request || request.senderId !== userId) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      await storage.deleteFriendRequest(requestId);
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
      
      const request = await storage.getFriendRequestById(requestId);
      if (!request || request.receiverId !== userId) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      await storage.ignoreFriendRequest(requestId);
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
  app.post("/api/moderation/mute", async (req, res) => {
    try {
      const { moderatorId, targetUserId, reason, duration } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const deviceId = req.headers['user-agent'] || 'unknown';
      
      const success = await moderationSystem.muteUser(
        moderatorId, 
        targetUserId, 
        reason, 
        duration, 
        clientIP, 
        deviceId
      );
      
      if (success) {
        const moderator = await storage.getUser(moderatorId);
        const target = await storage.getUser(targetUserId);
        
        // إرسال إشعار للدردشة العامة
        const systemMessage = `🔇 تم كتم ${target?.username} من قبل ${moderator?.username} لمدة ${duration} دقيقة - السبب: ${reason}`;
        
        broadcast({
          type: 'moderationAction',
          action: 'muted',
          targetUserId: targetUserId,
          message: systemMessage,
          reason,
          duration
        });

        // إرسال إشعار للمستخدم المكتوم
        broadcast({
          type: 'notification',
          targetUserId: targetUserId,
          notificationType: 'muted',
          message: `تم كتمك من قبل ${moderator?.username} لمدة ${duration} دقيقة - السبب: ${reason}`,
          moderatorName: moderator?.username
        });
        
        // لا يتم قطع الاتصال - المستخدم يبقى في الدردشة لكن مكتوم
        res.json({ message: "تم كتم المستخدم بنجاح - يمكنه البقاء في الدردشة ولكن لا يمكنه التحدث في العام" });
      } else {
        res.status(403).json({ error: "غير مسموح لك بهذا الإجراء" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/moderation/unmute", async (req, res) => {
    try {
      const { moderatorId, targetUserId } = req.body;
      
      const success = await moderationSystem.unmuteUser(moderatorId, targetUserId);
      
      if (success) {
        const moderator = await storage.getUser(moderatorId);
        const target = await storage.getUser(targetUserId);
        
        // إرسال إشعار للدردشة العامة
        const systemMessage = `🔊 تم إلغاء كتم ${target?.username} من قبل ${moderator?.username}`;
        
        broadcast({
          type: 'moderationAction',
          action: 'unmuted',
          targetUserId: targetUserId,
          message: systemMessage
        });
        
        res.json({ message: "تم إلغاء الكتم بنجاح" });
      } else {
        res.status(403).json({ error: "غير مسموح لك بهذا الإجراء" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/moderation/ban", async (req, res) => {
    try {
      const { moderatorId, targetUserId, reason, duration } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const deviceId = req.headers['user-agent'] || 'unknown';
      
      const success = await moderationSystem.banUser(
        moderatorId, 
        targetUserId, 
        reason, 
        duration, 
        clientIP, 
        deviceId
      );
      
      if (success) {
        const moderator = await storage.getUser(moderatorId);
        const target = await storage.getUser(targetUserId);
        
        // إرسال إشعار خاص للمستخدم المطرود
        io.to(targetUserId.toString()).emit('kicked', {
          targetUserId: targetUserId,
          duration: duration,
          reason: reason
        });

        // إرسال إشعار للدردشة العامة
        const systemMessage = `⏰ تم طرد ${target?.username} من قبل ${moderator?.username} لمدة ${duration} دقيقة - السبب: ${reason}`;
        
        broadcast({
          type: 'moderationAction',
          action: 'banned',
          targetUserId: targetUserId,
          message: systemMessage
        });
        
        // إجبار قطع الاتصال
        io.to(targetUserId.toString()).disconnectSockets();
        
        res.json({ message: "تم طرد المستخدم بنجاح" });
      } else {
        res.status(403).json({ error: "غير مسموح لك بهذا الإجراء" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/moderation/block", async (req, res) => {
    try {
      const { moderatorId, targetUserId, reason, ipAddress, deviceId } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || ipAddress || 'unknown';
      const clientDevice = req.headers['user-agent'] || deviceId || 'unknown';
      
      const success = await moderationSystem.blockUser(
        moderatorId, 
        targetUserId, 
        reason, 
        clientIP, 
        clientDevice
      );
      
      if (success) {
        const moderator = await storage.getUser(moderatorId);
        const target = await storage.getUser(targetUserId);
        
        // إرسال إشعار خاص للمستخدم المحجوب - تحسين الإشعار
        if (target) {
          io.to(targetUserId.toString()).emit('message', {
            type: 'blocked',
            targetUserId: targetUserId,
            reason: reason,
            moderatorName: moderator?.username || 'مشرف'
          });
        }

        // إرسال إشعار للدردشة العامة
        const systemMessage = `🚫 تم حجب ${target?.username} نهائياً من قبل ${moderator?.username} - السبب: ${reason}`;
        
        broadcast({
          type: 'moderationAction',
          action: 'blocked',
          targetUserId: targetUserId,
          message: systemMessage
        });
        
        // إجبار قطع الاتصال بعد فترة قصيرة
        setTimeout(() => {
          io.to(targetUserId.toString()).disconnectSockets();
        }, 3000); // إعطاء وقت أطول لاستلام إشعار الحجب النهائي
        
        res.json({ message: "تم حجب المستخدم بنجاح" });
      } else {
        res.status(403).json({ error: "غير مسموح لك بهذا الإجراء" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/moderation/promote", async (req, res) => {
    try {
      const { moderatorId, targetUserId, role } = req.body;
      
      // التحقق من أن المتقدم بالطلب هو المالك فقط
      const moderator = await storage.getUser(moderatorId);
      if (!moderator || moderator.userType !== 'owner') {
        return res.status(403).json({ error: "هذه الميزة للمالك فقط" });
      }

      // التحقق من أن المستخدم المراد ترقيته عضو وليس زائر
      const target = await storage.getUser(targetUserId);
      if (!target || target.userType !== 'member') {
        return res.status(400).json({ error: "يمكن ترقية الأعضاء فقط" });
      }
      
      // التأكد من أن الرتبة صحيحة (إدمن أو مشرف فقط)
      if (!['admin', 'moderator'].includes(role)) {
        return res.status(400).json({ error: "رتبة غير صالحة - يمكن الترقية لإدمن أو مشرف فقط" });
      }
      
      // تحديث المستخدم في قاعدة البيانات
      await storage.updateUser(targetUserId, { userType: role });
      const updatedUser = await storage.getUser(targetUserId);
      
      const roleDisplay = role === 'admin' ? 'إدمن ⭐' : 'مشرف 🛡️';
      const rolePermissions = role === 'admin' ? 'يمكنه كتم وطرد المستخدمين' : 'يمكنه كتم المستخدمين فقط';
      
      // إرسال إشعار للمستخدم المرقى
      io.to(targetUserId.toString()).emit('promotion', {
        newRole: role,
        message: `تهانينا! تمت ترقيتك إلى ${roleDisplay} - ${rolePermissions}`
      });
      
      // إشعار جميع المستخدمين بالترقية
      broadcast({
        type: 'userUpdated',
        user: updatedUser
      });

      // إشعار عام في الدردشة
      broadcast({
        type: 'systemNotification',
        message: `🎉 تم ترقية ${target.username} إلى ${roleDisplay}`,
        timestamp: new Date().toISOString()
      });
      
      res.json({ 
        success: true,
        message: `تمت ترقية ${target.username} إلى ${roleDisplay}`,
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/moderation/unmute", async (req, res) => {
    try {
      const { moderatorId, targetUserId } = req.body;
      
      const success = await moderationSystem.unmuteUser(moderatorId, targetUserId);
      
      if (success) {
        res.json({ message: "تم فك الكتم بنجاح" });
      } else {
        res.status(403).json({ error: "غير مسموح لك بهذا الإجراء" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/moderation/unblock", async (req, res) => {
    try {
      const { moderatorId, targetUserId } = req.body;
      
      const success = await moderationSystem.unblockUser(moderatorId, targetUserId);
      
      if (success) {
        res.json({ message: "تم فك الحجب بنجاح" });
      } else {
        res.status(403).json({ error: "غير مسموح لك بهذا الإجراء" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.get("/api/moderation/log", async (req, res) => {
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
      const friends = await storage.getFriends(userId);
      
      res.json({ friends });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/friends", async (req, res) => {
    try {
      const { userId, friendId } = req.body;
      
      // التحقق من أن المستخدمين موجودين
      const user = await storage.getUser(userId);
      const friend = await storage.getUser(friendId);
      
      if (!user || !friend) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }
      
      // التحقق من أن المستخدم لا يضيف نفسه
      if (userId === friendId) {
        return res.status(400).json({ error: "لا يمكنك إضافة نفسك كصديق" });
      }
      
      const friendship = await storage.addFriend(userId, friendId);
      
      // إرسال تنبيه WebSocket للمستخدم المستهدف
      broadcast({
        type: 'friendRequest',
        targetUserId: friendId,
        senderUserId: userId,
        senderUsername: user.username,
        message: `${user.username} يريد إضافتك كصديق`
      });
      
      res.json({ 
        message: "تم إرسال طلب الصداقة",
        friendship 
      });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.delete("/api/friends/:userId/:friendId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const friendId = parseInt(req.params.friendId);
      
      const success = await storage.removeFriend(userId, friendId);
      
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
  app.get("/api/moderation/actions", async (req, res) => {
    try {
      const { userId } = req.query;
      const user = await storage.getUser(Number(userId));
      
      // التحقق من أن المستخدم مشرف أو مالك
      if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
        return res.status(403).json({ error: "غير مسموح - للمشرفين فقط" });
      }

      const actions = moderationSystem.getModerationLog()
        .map(action => ({
          ...action,
          moderatorName: '', // سيتم إضافة اسم المشرف
          targetName: '' // سيتم إضافة اسم المستهدف
        }));
      
      // إضافة أسماء المستخدمين للإجراءات
      for (const action of actions) {
        const moderator = await storage.getUser(action.moderatorId);
        const target = await storage.getUser(action.targetUserId);
        action.moderatorName = moderator?.username || 'مجهول';
        action.targetName = target?.username || 'مجهول';
      }

      res.json(actions);
    } catch (error) {
      console.error("خطأ في الحصول على تاريخ الإجراءات:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // إضافة endpoint لسجل البلاغات
  app.get("/api/reports", async (req, res) => {
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
  app.post("/api/reports/:id/review", async (req, res) => {
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

  // إضافة endpoint لترقية المستخدمين
  app.post("/api/moderation/promote", async (req, res) => {
    try {
      const { moderatorId, targetUserId, newRole } = req.body;
      
      const moderator = await storage.getUser(moderatorId);
      const target = await storage.getUser(targetUserId);
      
      if (!moderator || moderator.userType !== 'owner') {
        return res.status(403).json({ error: "فقط المالك يمكنه ترقية المستخدمين" });
      }
      
      if (!target) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }
      
      if (target.userType !== 'member') {
        return res.status(400).json({ error: "يمكن ترقية الأعضاء فقط" });
      }
      
      if (!['admin', 'owner'].includes(newRole)) {
        return res.status(400).json({ error: "رتبة غير صالحة" });
      }
      
      // تحديث نوع المستخدم
      await storage.updateUser(targetUserId, { userType: newRole as any });
      
      // إرسال إشعار عبر WebSocket
      const promotionMessage = {
        type: 'systemNotification',
        message: `🎉 تم ترقية ${target.username} إلى ${newRole === 'admin' ? 'مشرف' : 'مالك'} بواسطة ${moderator.username}`,
        timestamp: new Date().toISOString()
      };
      
      broadcast(promotionMessage);
      
      res.json({ message: `تم ترقية ${target.username} إلى ${newRole === 'admin' ? 'مشرف' : 'مالك'} بنجاح` });
    } catch (error) {
      console.error("خطأ في ترقية المستخدم:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // إضافة endpoint للإجراءات النشطة
  app.get("/api/moderation/active-actions", async (req, res) => {
    try {
      const { userId } = req.query;
      const user = await storage.getUser(Number(userId));
      
      if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
        return res.status(403).json({ error: "غير مسموح - للمشرفين فقط" });
      }

      const allActions = moderationSystem.getModerationLog();
      const activeActions = allActions
        .filter(action => (action.type === 'mute' || action.type === 'block'))
        .map(action => ({
          ...action,
          moderatorName: '',
          targetName: ''
        }));
      
      // إضافة أسماء المستخدمين
      for (const action of activeActions) {
        const moderator = await storage.getUser(action.moderatorId);
        const target = await storage.getUser(action.targetUserId);
        action.moderatorName = moderator?.username || 'مجهول';
        action.targetName = target?.username || 'مجهول';
      }

      res.json(activeActions);
    } catch (error) {
      console.error("خطأ في الحصول على الإجراءات النشطة:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Security API routes
  app.use('/api/security', securityApiRoutes);
  
  // New Modular Routes - نظام المسارات المعاد تنظيمه
  app.use('/api/v2', apiRoutes);
  
  // Performance ping endpoint
  app.get('/api/ping', (req, res) => {
    res.json({ timestamp: Date.now(), status: 'ok' });
  });



  // API routes للإخفاء والتجاهل
  app.post('/api/users/:userId/stealth', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { isHidden } = req.body;
      
      await storage.setUserHiddenStatus(userId, isHidden);
      
      res.json({ success: true, message: isHidden ? 'تم إخفاؤك' : 'تم إظهارك' });
    } catch (error) {
      console.error('خطأ في تحديث وضع الإخفاء:', error);
      res.status(500).json({ error: 'فشل في تحديث وضع الإخفاء' });
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
      const updates = req.body;
      
      const user = await storage.updateUser(parseInt(id), updates);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // إرسال تحديث الثيم عبر WebSocket
      if (updates.userTheme) {
        const updateMessage = {
          type: 'theme_update',
          userId: parseInt(id),
          userTheme: updates.userTheme,
          timestamp: new Date().toISOString()
        };
        broadcast(updateMessage);
        }
      
      // إرسال تحديث تأثير البروفايل ولون الاسم عبر WebSocket
      if (updates.profileEffect || updates.usernameColor) {
        const updateMessage = {
          type: 'profileEffectChanged',
          userId: parseInt(id),
          profileEffect: updates.profileEffect,
          usernameColor: updates.usernameColor,
          user: user,
          timestamp: new Date().toISOString()
        };
        broadcast(updateMessage);
        }
      
      res.json(user);
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
      if (io) {
        io.to(userId.toString()).emit('newNotification', { notification });
      }
      
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
      
      // إشعار المستخدمين الآخرين عبر WebSocket
      io.emit('user_profile_updated', {
        userId: userIdNum,
        updates: validatedUpdates,
        user: updatedUser
      });

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

      // إرجاع بيانات المستخدم بدون كلمة المرور
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
      
    } catch (error) {
      console.error('❌ خطأ في جلب بيانات المستخدم:', error);
      res.status(500).json({ 
        error: 'خطأ في الخادم',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  });

  // Update profile background color
  app.post('/api/users/update-background-color', async (req, res) => {
    try {
      const { userId, profileBackgroundColor, color } = req.body;
      
      // دعم كلا من color و profileBackgroundColor
      const backgroundColorValue = profileBackgroundColor || color;
      
      // تحسين التحقق من صحة البيانات
      if (!userId) {
        console.error('❌ معرف المستخدم مفقود:', { userId, backgroundColorValue });
        return res.status(400).json({ 
          error: 'معرف المستخدم مطلوب',
          details: 'userId is required'
        });
      }
      
      if (!backgroundColorValue) {
        console.error('❌ لون الخلفية مفقود:', { userId, backgroundColorValue });
        return res.status(400).json({ 
          error: 'لون الخلفية مطلوب',
          details: 'color or profileBackgroundColor is required'
        });
      }

      // التحقق من صحة معرف المستخدم
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum) || userIdNum <= 0) {
        console.error('❌ معرف المستخدم غير صحيح:', userId);
        return res.status(400).json({ 
          error: 'معرف المستخدم غير صحيح',
          details: 'userId must be a valid positive number'
        });
      }

      const user = await storage.getUser(userIdNum);
      if (!user) {
        console.error('❌ المستخدم غير موجود:', userIdNum);
        return res.status(404).json({ 
          error: 'المستخدم غير موجود',
          details: `User with ID ${userIdNum} not found`
        });
      }

      await storage.updateUser(userIdNum, { profileBackgroundColor: backgroundColorValue });
      
      // إشعار المستخدمين الآخرين عبر WebSocket
      try {
        broadcast({
          type: 'user_background_updated',
          data: { userId: userIdNum, profileBackgroundColor: backgroundColorValue }
        });
        } catch (broadcastError) {
        console.error('⚠️ فشل في إرسال إشعار WebSocket:', broadcastError);
        // لا نفشل العملية بسبب فشل الإشعار
      }

      res.json({ 
        success: true, 
        message: 'تم تحديث لون خلفية البروفايل بنجاح',
        data: { userId: userIdNum, profileBackgroundColor: backgroundColorValue }
      });
    } catch (error) {
      console.error('❌ خطأ في تحديث لون الخلفية:', error);
      res.status(500).json({ 
        error: 'خطأ في الخادم',
        details: error instanceof Error ? error.message : 'Unknown server error'
      });
    }
  });

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
      
      io.to(targetUserId.toString()).emit('message', {
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
      
      // التحقق من وجود نقاط كافية للمرسل
      if ((sender.points || 0) < points) {
        return res.status(400).json({ error: 'نقاط غير كافية' });
      }
      
      // خصم النقاط من المرسل
      await pointsService.addPoints(senderId, -points, `إرسال نقاط إلى ${receiver.username}`);
      
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
      io.to(receiverId.toString()).emit('message', {
        type: 'pointsReceived',
        points,
        senderName: sender.username,
        message: `🎁 تم استلام ${points} نقطة من ${sender.username}`
      });
      
      // إشعار في المحادثة العامة
      io.emit('message', {
        type: 'pointsTransfer',
        senderName: sender.username,
        receiverName: receiver.username,
        points,
        message: `💰 تم إرسال ${points} نقطة من ${sender.username} إلى ${receiver.username}`
      });
      
      // تحديث بيانات المستخدمين في real-time
      const updatedSender = await storage.getUser(senderId);
      const updatedReceiver = await storage.getUser(receiverId);
      
      io.to(senderId.toString()).emit('message', {
        type: 'userUpdated',
        user: updatedSender
      });
      
      io.to(receiverId.toString()).emit('message', {
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
        return res.json([]);
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
      
      io.emit('message', messageData);
      
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
      io.emit('message', {
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
      io.emit('message', {
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
  // APIs الغرف
  // ===================

  // جلب جميع الغرف
  app.get('/api/rooms', async (req, res) => {
    try {
      // Check database availability
      if (!db || dbType === 'disabled') {
        return res.json({ rooms: [] });
      }
      
      const rooms = await storage.getAllRooms();
      res.json({ rooms });
    } catch (error) {
      console.error('خطأ في جلب الغرف:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // إنشاء غرفة جديدة
  app.post('/api/rooms', upload.single('image'), async (req, res) => {
    try {
      const { name, description, userId } = req.body;

      if (!name || !userId) {
        return res.status(400).json({ error: 'اسم الغرفة ومعرف المستخدم مطلوبان' });
      }

      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      // التحقق من الصلاحيات
      if (!['admin', 'owner'].includes(user.userType)) {
        return res.status(403).json({ error: 'ليس لديك صلاحية لإنشاء غرف' });
      }

      // معالجة الصورة
      let icon = '';
      if (req.file) {
        const timestamp = Date.now();
        const filename = `room_${timestamp}_${req.file.originalname}`;
        const filepath = path.join(process.cwd(), 'client', 'public', 'uploads', 'rooms', filename);
        
        // إنشاء مجلد الغرف إذا لم يكن موجوداً
        const roomsDir = path.dirname(filepath);
        if (!fs.existsSync(roomsDir)) {
          fs.mkdirSync(roomsDir, { recursive: true });
        }
        
        fs.writeFileSync(filepath, req.file.buffer);
        icon = `/uploads/rooms/${filename}`;
      }

      const roomData = {
        name: name.trim(),
        description: description?.trim() || '',
        icon,
        createdBy: user.id,
        isDefault: false,
        isActive: true
      };

      const room = await storage.createRoom(roomData);
      
      // إرسال إشعار بالغرفة الجديدة
      io.emit('roomCreated', { room });
      
      // إرسال قائمة الغرف المحدثة لجميع المستخدمين
      const updatedRooms = await storage.getAllRooms();
      io.emit('roomsUpdated', { rooms: updatedRooms });

      res.json({ room });
    } catch (error) {
      console.error('خطأ في إنشاء الغرفة:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // حذف غرفة
  app.delete('/api/rooms/:roomId', async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
      }

      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: 'الغرفة غير موجودة' });
      }

      // لا يمكن حذف الغرفة الافتراضية
      if (room.isDefault) {
        return res.status(400).json({ error: 'لا يمكن حذف الغرفة الافتراضية' });
      }

      // التحقق من الصلاحيات
      const canDelete = room.createdBy === user.id || ['admin', 'owner'].includes(user.userType);
      if (!canDelete) {
        return res.status(403).json({ error: 'ليس لديك صلاحية لحذف هذه الغرفة' });
      }

      // حذف صورة الغرفة إن وجدت
      if (room.icon) {
        const imagePath = path.join(process.cwd(), 'client', 'public', room.icon);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      await storage.deleteRoom(roomId);

      // إرسال إشعار بحذف الغرفة
      io.emit('roomDeleted', { 
        roomId,
        deletedBy: user.username 
      });
      
      // إرسال قائمة الغرف المحدثة لجميع المستخدمين
      const updatedRooms = await storage.getAllRooms();
      io.emit('roomsUpdated', { rooms: updatedRooms });

      res.json({ message: 'تم حذف الغرفة بنجاح' });
    } catch (error) {
      console.error('خطأ في حذف الغرفة:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // الانضمام لغرفة
  app.post('/api/rooms/:roomId/join', async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
      }

      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: 'الغرفة غير موجودة' });
      }

      if (!room.isActive) {
        return res.status(400).json({ error: 'الغرفة غير نشطة' });
      }

      await storage.joinRoom(userId, roomId);

      // إرسال إشعار بانضمام المستخدم للغرفة
      io.to(`room_${roomId}`).emit('userJoinedRoom', {
        userId: user.id,
        username: user.username,
        roomId: roomId,
        timestamp: new Date().toISOString()
      });
      
      // تحديث عدد المستخدمين في الغرفة
      const roomUsers = await storage.getRoomUsers(roomId);
      io.emit('roomUserCountUpdated', {
        roomId: roomId,
        userCount: roomUsers.length
      });

      res.json({ message: 'تم الانضمام للغرفة بنجاح' });
    } catch (error) {
      console.error('خطأ في الانضمام للغرفة:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // مغادرة غرفة
  app.post('/api/rooms/:roomId/leave', async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
      }

      const user = await storage.getUser(parseInt(userId));
      await storage.leaveRoom(userId, roomId);

      // إرسال إشعار بمغادرة المستخدم للغرفة
      if (user) {
        io.to(`room_${roomId}`).emit('userLeftRoom', {
          userId: user.id,
          username: user.username,
          roomId: roomId,
          timestamp: new Date().toISOString()
        });
        
        // تحديث عدد المستخدمين في الغرفة
        const roomUsers = await storage.getRoomUsers(roomId);
        io.emit('roomUserCountUpdated', {
          roomId: roomId,
          userCount: roomUsers.length
        });
      }

      res.json({ message: 'تم مغادرة الغرفة بنجاح' });
    } catch (error) {
      console.error('خطأ في مغادرة الغرفة:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // ===================
  // Broadcast Room API Routes
  // ===================

  // طلب المايك
  app.post('/api/rooms/:roomId/request-mic', async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
      }

      const success = await storage.requestMic(parseInt(userId), roomId);
      if (!success) {
        return res.status(400).json({ error: 'لا يمكن طلب المايك في هذه الغرفة' });
      }

      // إرسال إشعار للـ Host
      const room = await storage.getRoom(roomId);
      const user = await storage.getUser(parseInt(userId));
      if (room && user) {
        io.emit('message', {
          type: 'micRequest',
          roomId,
          requestUserId: parseInt(userId),
          username: user.username,
          content: `${user.username} يطلب المايك`
        });
      }

      res.json({ message: 'تم إرسال طلب المايك بنجاح' });
    } catch (error) {
      console.error('خطأ في طلب المايك:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // الموافقة على طلب المايك
  app.post('/api/rooms/:roomId/approve-mic/:userId', async (req, res) => {
    try {
      const { roomId, userId } = req.params;
      const { approvedBy } = req.body;

      if (!approvedBy) {
        return res.status(400).json({ error: 'معرف الموافق مطلوب' });
      }

      const success = await storage.approveMicRequest(roomId, parseInt(userId), parseInt(approvedBy));
      if (!success) {
        return res.status(400).json({ error: 'لا يمكن الموافقة على طلب المايك' });
      }

      // إرسال إشعار للجميع
      const user = await storage.getUser(parseInt(userId));
      const approver = await storage.getUser(parseInt(approvedBy));
      if (user && approver) {
        io.emit('message', {
          type: 'micApproved',
          roomId,
          requestUserId: parseInt(userId),
          approvedBy: parseInt(approvedBy),
          username: user.username,
          approverName: approver.username,
          content: `${approver.username} وافق على طلب ${user.username} للمايك`
        });
      }

      res.json({ message: 'تم الموافقة على طلب المايك بنجاح' });
    } catch (error) {
      console.error('خطأ في الموافقة على طلب المايك:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // رفض طلب المايك
  app.post('/api/rooms/:roomId/reject-mic/:userId', async (req, res) => {
    try {
      const { roomId, userId } = req.params;
      const { rejectedBy } = req.body;

      if (!rejectedBy) {
        return res.status(400).json({ error: 'معرف الرافض مطلوب' });
      }

      const success = await storage.rejectMicRequest(roomId, parseInt(userId), parseInt(rejectedBy));
      if (!success) {
        return res.status(400).json({ error: 'لا يمكن رفض طلب المايك' });
      }

      // إرسال إشعار للجميع
      const user = await storage.getUser(parseInt(userId));
      const rejecter = await storage.getUser(parseInt(rejectedBy));
      if (user && rejecter) {
        io.emit('message', {
          type: 'micRejected',
          roomId,
          requestUserId: parseInt(userId),
          rejectedBy: parseInt(rejectedBy),
          username: user.username,
          rejecterName: rejecter.username,
          content: `${rejecter.username} رفض طلب ${user.username} للمايك`
        });
      }

      res.json({ message: 'تم رفض طلب المايك بنجاح' });
    } catch (error) {
      console.error('خطأ في رفض طلب المايك:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // إزالة متحدث
  app.post('/api/rooms/:roomId/remove-speaker/:userId', async (req, res) => {
    try {
      const { roomId, userId } = req.params;
      const { removedBy } = req.body;

      if (!removedBy) {
        return res.status(400).json({ error: 'معرف المزيل مطلوب' });
      }

      const success = await storage.removeSpeaker(roomId, parseInt(userId), parseInt(removedBy));
      if (!success) {
        return res.status(400).json({ error: 'لا يمكن إزالة المتحدث' });
      }

      // إرسال إشعار للجميع
      const user = await storage.getUser(parseInt(userId));
      const remover = await storage.getUser(parseInt(removedBy));
      if (user && remover) {
        io.emit('message', {
          type: 'speakerRemoved',
          roomId,
          requestUserId: parseInt(userId),
          removedBy: parseInt(removedBy),
          username: user.username,
          removerName: remover.username,
          content: `${remover.username} أزال ${user.username} من المتحدثين`
        });
      }

      res.json({ message: 'تم إزالة المتحدث بنجاح' });
    } catch (error) {
      console.error('خطأ في إزالة المتحدث:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // جلب معلومات أساسية عن الغرفة
  app.get('/api/rooms/:roomId', async (req, res) => {
    try {
      const { roomId } = req.params;
      
      // Return basic room info - this creates the room if it doesn't exist
      const roomInfo = {
        id: roomId,
        name: roomId === 'general' ? 'الغرفة العامة' : `الغرفة ${roomId.replace('room_', '')}`,
        userCount: 0,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      
      res.json({ room: roomInfo });
    } catch (error) {
      console.error('خطأ في جلب معلومات الغرفة:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  // جلب معلومات غرفة البث
  app.get('/api/rooms/:roomId/broadcast-info', async (req, res) => {
    try {
      const { roomId } = req.params;
      const info = await storage.getBroadcastRoomInfo(roomId);
      
      if (!info) {
        return res.status(404).json({ error: 'غرفة البث غير موجودة' });
      }

      res.json({ info });
    } catch (error) {
      console.error('خطأ في جلب معلومات غرفة البث:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

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

  return httpServer;
}
