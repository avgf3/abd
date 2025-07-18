import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as IOServer, Socket } from "socket.io";
import { storage } from "./storage";
import { setupDownloadRoute } from "./download-route";
import { insertUserSchema, insertMessageSchema } from "@shared/schema";
import { spamProtection } from "./spam-protection";
import { moderationSystem } from "./moderation";
import { sanitizeInput, validateMessageContent, checkIPSecurity, authLimiter, messageLimiter } from "./security";
import { databaseCleanup } from "./utils/database-cleanup";

import { advancedSecurity, advancedSecurityMiddleware } from "./advanced-security";
import securityApiRoutes from "./api-security";
import apiRoutes from "./routes/index";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

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
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    // التحقق من نوع الملف
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('يرجى رفع ملف صورة صحيح'));
    }
  }
});

let io: IOServer;

// تعريف Socket مخصص للطباعة
interface CustomSocket extends Socket {
  userId?: number;
  username?: string;
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
    if (!user || user.password !== password.trim()) {
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
  // رفع صور البروفايل
  app.post('/api/upload/profile-image', upload.single('profileImage'), async (req, res) => {
    try {
      console.log('رفع صورة البروفايل - الملف:', req.file);
      console.log('البيانات:', req.body);

      if (!req.file) {
        return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
      }

      const userId = req.body.userId;
      if (!userId) {
        return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
      }

      // تحديث مسار الصورة في قاعدة البيانات
      const imageUrl = `/uploads/profiles/${req.file.filename}`;
      
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      // حذف الصورة القديمة إذا كانت موجودة
      if (user.profileImage && user.profileImage !== '/default_avatar.svg') {
        const oldImagePath = path.join(process.cwd(), 'client', 'public', user.profileImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // تحديث المستخدم في قاعدة البيانات
      const updatedUser = await storage.updateUser(parseInt(userId), { profileImage: imageUrl });
      
      console.log('تم تحديث المستخدم:', updatedUser);

      // إرسال تحديث WebSocket لجميع المستخدمين
      if (io) {
        io.emit('userUpdated', { user: updatedUser });
      }

      res.json({
        success: true,
        message: 'تم رفع الصورة بنجاح',
        imageUrl: imageUrl,
        user: updatedUser
      });

    } catch (error) {
      console.error('Error uploading profile image:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'خطأ في رفع الصورة' 
      });
    }
  });

  // إضافة endpoints لرفع الصور (تطابق مع ProfileModal)
  app.post('/api/upload/profile-image', upload.single('image'), async (req, res) => {
    try {
      console.log('رفع صورة البروفايل - الملف:', req.file);
      console.log('البيانات:', req.body);

      if (!req.file) {
        return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
      }

      const userId = req.body.userId;
      if (!userId) {
        return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
      }

      // تحديث مسار الصورة في قاعدة البيانات
      const imageUrl = `/uploads/profiles/${req.file.filename}`;
      
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      // حذف الصورة القديمة إذا كانت موجودة
      if (user.profileImage && user.profileImage !== '/default_avatar.svg') {
        const oldImagePath = path.join(process.cwd(), 'client', 'public', user.profileImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // تحديث المستخدم في قاعدة البيانات
      const updatedUser = await storage.updateUser(parseInt(userId), { profileImage: imageUrl });
      
      console.log('تم تحديث المستخدم:', updatedUser);

      // إرسال تحديث WebSocket لجميع المستخدمين
      if (io) {
        io.emit('userUpdated', { user: updatedUser });
      }

      res.json({
        success: true,
        message: 'تم رفع الصورة بنجاح',
        imageUrl: imageUrl,
        user: updatedUser
      });

    } catch (error) {
      console.error('Error uploading profile image:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'خطأ في رفع الصورة' 
      });
    }
  });

  app.post('/api/upload/profile-banner', upload.single('image'), async (req, res) => {
    try {
      console.log('رفع صورة البانر - الملف:', req.file);
      console.log('البيانات:', req.body);

      if (!req.file) {
        return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
      }

      const userId = req.body.userId;
      if (!userId) {
        return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
      }

      // تحديث مسار صورة البانر
      const bannerUrl = `/uploads/profiles/${req.file.filename}`;
      
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      // حذف صورة البانر القديمة إذا كانت موجودة
      if (user.profileBanner && user.profileBanner !== '') {
        const oldBannerPath = path.join(process.cwd(), 'client', 'public', user.profileBanner);
        if (fs.existsSync(oldBannerPath)) {
          fs.unlinkSync(oldBannerPath);
        }
      }

      // تحديث المستخدم في قاعدة البيانات
      const updatedUser = await storage.updateUser(parseInt(userId), { profileBanner: bannerUrl });
      
      console.log('تم تحديث المستخدم:', updatedUser);

      // إرسال تحديث WebSocket لجميع المستخدمين
      if (io) {
        io.emit('userUpdated', { user: updatedUser });
      }

      res.json({
        success: true,
        message: 'تم رفع صورة البروفايل بنجاح',
        bannerUrl: bannerUrl,
        user: updatedUser
      });

    } catch (error) {
      console.error('Error uploading profile banner:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'خطأ في رفع صورة البروفايل' 
      });
    }
  });

  // رفع صور البروفايل البانر (endpoint القديم للتوافق)
  app.post('/api/upload/profile-banner-old', upload.single('profileBanner'), async (req, res) => {
    try {
      console.log('رفع صورة البانر - الملف:', req.file);
      console.log('البيانات:', req.body);

      if (!req.file) {
        return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
      }

      const userId = req.body.userId;
      if (!userId) {
        return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
      }

      // تحديث مسار صورة البانر
      const bannerUrl = `/uploads/profiles/${req.file.filename}`;
      
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      // حذف صورة البانر القديمة إذا كانت موجودة
      if (user.profileBanner && user.profileBanner !== '') {
        const oldBannerPath = path.join(process.cwd(), 'client', 'public', user.profileBanner);
        if (fs.existsSync(oldBannerPath)) {
          fs.unlinkSync(oldBannerPath);
        }
      }

      // تحديث المستخدم في قاعدة البيانات
      const updatedUser = await storage.updateUser(parseInt(userId), { profileBanner: bannerUrl });
      
      console.log('تم تحديث المستخدم:', updatedUser);

      // إرسال تحديث WebSocket لجميع المستخدمين
      if (io) {
        io.emit('userUpdated', { user: updatedUser });
      }

      res.json({
        success: true,
        message: 'تم رفع صورة البروفايل بنجاح',
        bannerUrl: bannerUrl,
        user: updatedUser
      });

    } catch (error) {
      console.error('Error uploading profile banner:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'خطأ في رفع صورة البروفايل' 
      });
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
  app.get("/api/moderation/actions", async (req, res) => {
    try {
      // فحص صلاحيات الإدمن
      const { userId } = req.query;
      if (!userId) {
        return res.status(401).json({ error: "غير مسموح - للإدمن والمالك فقط" });
      }
      
      const user = await storage.getUser(parseInt(userId as string));
      if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
        return res.status(403).json({ error: "غير مسموح - للإدمن والمالك فقط" });
      }
      
      const actions = moderationSystem.getModerationLog();
      res.json({ actions });
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب سجل الإدارة" });
    }
  });

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
      
      const success = await moderationSystem.banUser(moderatorId, targetUserId, reason, duration);
      if (success) {
        res.json({ message: "تم طرد المستخدم بنجاح" });
      } else {
        res.status(400).json({ error: "فشل في طرد المستخدم" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في طرد المستخدم" });
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

  const httpServer = createServer(app);
  io = new IOServer(httpServer, {
    cors: { origin: "*" },
    path: "/socket.io/",
  });
  
  // Health Check endpoint للمراقبة
  app.get('/api/health', (req, res) => {
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
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
      const { username, password, confirmPassword, gender } = req.body;
      
      // فحص الأمان الأساسي
      if (!username?.trim() || !password?.trim() || !confirmPassword?.trim()) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
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
        profileImage: "/default_avatar.svg",
      });

      res.json({ user, message: "تم التسجيل بنجاح" });
    } catch (error) {
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

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "اسم المستخدم غير موجود" });
      }

      if (user.password !== password) {
        return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
      }

      await storage.setUserOnlineStatus(user.id, true);
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // User routes
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
      const { senderId, receiverId, content, messageType = 'text', isPrivate = false } = req.body;
      
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
        isPrivate
      };

      const message = await storage.createMessage(messageData);
      
      // إرسال الرسالة عبر Socket.IO
      if (isPrivate && receiverId) {
        // رسالة خاصة
        io.to(receiverId.toString()).emit('message', {
          type: 'privateMessage',
          message: { ...message, sender }
        });
        
        // إرسال للمرسل أيضاً
        io.to(senderId.toString()).emit('message', {
          type: 'privateMessage',
          message: { ...message, sender }
        });
      } else {
        // رسالة عامة
        io.emit('message', {
          type: 'newMessage',
          message: { ...message, sender }
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

  // Friend routes
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
      const friendship = await storage.addFriend(userId, friendId);
      res.json({ friendship });
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

  // WebSocket handling
  io.on("connection", (socket: CustomSocket) => {
    console.log('اتصال WebSocket جديد');
    
    // إرسال رسالة ترحيب فورية
    socket.emit('connected', { message: 'متصل بنجاح' });
    
    // heartbeat للحفاظ على الاتصال
    const heartbeat = setInterval(() => {
      socket.emit('ping');
    }, 30000);

    // Modern Socket.IO event handlers
    socket.on('auth', async (data) => {
      try {
        console.log(`🔐 Auth من ${data.username || 'غير معروف'}`);
        
        socket.userId = data.userId;
        socket.username = data.username;
        
        // انضمام للغرفة الخاصة بالمستخدم للرسائل المباشرة
        socket.join(data.userId.toString());
        
        // فحص حالة المستخدم قبل السماح بالاتصال
        const authUserStatus = await moderationSystem.checkUserStatus(data.userId);
        if (authUserStatus.isBlocked) {
          socket.emit('message', {
            type: 'error',
            message: 'أنت محجوب نهائياً من الدردشة',
            action: 'blocked'
          });
          socket.disconnect();
          return;
        }
        
        if (authUserStatus.isBanned) {
          socket.emit('message', {
            type: 'error',
            message: `أنت مطرود من الدردشة لمدة ${authUserStatus.timeLeft} دقيقة`,
            action: 'banned'
          });
          socket.disconnect();
          return;
        }
        
        await storage.setUserOnlineStatus(data.userId, true);
        
        // Broadcast user joined
        const joinedUser = await storage.getUser(data.userId);
        io.emit('message', { type: 'userJoined', user: joinedUser });
        
        // Send online users list with moderation status
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
        
        socket.emit('message', { type: 'onlineUsers', users: usersWithStatus });
      } catch (error) {
        console.error('خطأ في المصادقة:', error);
        socket.emit('message', { type: 'error', message: 'خطأ في المصادقة' });
      }
    });

    socket.on('publicMessage', async (data) => {
      try {
        if (!socket.userId) return;
        
        // فحص حالة الكتم والحظر
        const userStatus = await moderationSystem.checkUserStatus(socket.userId);
        if (userStatus.isMuted) {
          socket.emit('message', {
            type: 'error',
            message: 'أنت مكتوم ولا يمكنك إرسال رسائل في الدردشة العامة. يمكنك التحدث في الرسائل الخاصة.',
            action: 'muted'
          });
          return;
        }
        
        if (userStatus.isBanned || userStatus.isBlocked) {
          return; // تجاهل الرسالة
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

        const newMessage = await storage.createMessage({
          senderId: socket.userId,
          content: sanitizedContent,
          messageType: data.messageType || 'text',
          isPrivate: false,
        });
        
        const sender = await storage.getUser(socket.userId);
        io.emit('message', { type: 'newMessage', message: { ...newMessage, sender } });
      } catch (error) {
        console.error('خطأ في إرسال الرسالة العامة:', error);
        socket.emit('message', { type: 'error', message: 'خطأ في إرسال الرسالة' });
      }
    });

    socket.on('privateMessage', async (data) => {
      try {
        if (!socket.userId) {
          socket.emit('message', { type: 'error', message: 'غير مصرح - يجب تسجيل الدخول' });
          return;
        }
        
        const { receiverId, content, messageType = 'text' } = data;
        
        // التحقق من صحة البيانات
        if (!receiverId || !content || !content.trim()) {
          socket.emit('message', { type: 'error', message: 'بيانات غير صحيحة' });
          return;
        }
        
        // التحقق من المرسل
        const sender = await storage.getUser(socket.userId);
        if (!sender) {
          socket.emit('message', { type: 'error', message: 'المرسل غير موجود' });
          return;
        }
        
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
        
        const messageWithSender = { ...newMessage, sender };
        
        // إرسال للمستقبل
        io.to(receiverId.toString()).emit('message', {
          type: 'privateMessage',
          message: messageWithSender
        });
        
        // إرسال للمرسل أيضاً
        socket.emit('message', {
          type: 'privateMessage',
          message: messageWithSender
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
        console.log(`رسالة WebSocket من ${socket.username || 'غير معروف'}: ${message.type}`);
        
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
            
            // Send online users list with moderation status
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
            
            socket.emit('onlineUsers', { users: usersWithStatus });
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
                console.log(`🔇 المستخدم ${socket.username} محاول الكتابة وهو مكتوم`);
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

    socket.on('disconnect', async (reason) => {
      console.log(`🔌 المستخدم ${socket.username} قطع الاتصال - السبب: ${reason}`);
      
      // تنظيف الجلسة بالكامل
      clearInterval(heartbeat);
      
      if (socket.userId) {
        try {
          // تحديث حالة المستخدم في قاعدة البيانات
          await storage.setUserOnlineStatus(socket.userId, false);
          
          // إزالة المستخدم من جميع الغرف
          socket.leave(socket.userId.toString());
          
          // إشعار جميع المستخدمين بالخروج
          io.emit('userLeft', {
            userId: socket.userId,
            username: socket.username,
            timestamp: new Date()
          });
          
          // إرسال قائمة محدثة للمستخدمين المتصلين
          const onlineUsers = await storage.getOnlineUsers();
          io.emit('onlineUsers', { users: onlineUsers });
          
          // تنظيف متغيرات الجلسة
          socket.userId = undefined;
          socket.username = undefined;
          
        } catch (error) {
          console.error('خطأ في تنظيف الجلسة:', error);
        }
      }
    });
  });

  function broadcast(message: any) {
    io.emit(message.type || 'broadcast', message.data || message);
  }

  // فحص دوري لتنظيف الجلسات المنتهية الصلاحية
  const sessionCleanupInterval = setInterval(async () => {
    try {
      const connectedSockets = await io.fetchSockets();
      console.log(`🧹 فحص ${connectedSockets.length} جلسة متصلة...`);
      
      for (const socket of connectedSockets) {
        if (socket.userId) {
          try {
            // التحقق من وجود المستخدم في قاعدة البيانات
            const user = await storage.getUser(socket.userId);
            if (!user || !user.isOnline) {
              console.log(`🧹 تنظيف جلسة منتهية الصلاحية للمستخدم ${socket.userId}`);
              socket.disconnect(true);
            }
          } catch (error) {
            console.error('خطأ في فحص الجلسة:', error);
            socket.disconnect(true);
          }
        } else {
          // قطع الاتصال للجلسات بدون معرف مستخدم
          console.log('🧹 قطع اتصال جلسة بدون معرف مستخدم');
          socket.disconnect(true);
        }
      }
    } catch (error) {
      console.error('خطأ في تنظيف الجلسات:', error);
    }
  }, 30000); // كل 30 ثانية

  // بدء التنظيف الدوري لقاعدة البيانات
  const dbCleanupInterval = databaseCleanup.startPeriodicCleanup(6); // كل 6 ساعات
  
  // تنظيف فوري عند بدء الخادم
  setTimeout(async () => {
    console.log('🧹 تنظيف فوري لقاعدة البيانات عند بدء الخادم...');
    await databaseCleanup.performFullCleanup();
    
    // عرض الإحصائيات
    const stats = await databaseCleanup.getDatabaseStats();
    console.log('📊 إحصائيات قاعدة البيانات:', stats);
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
      const { senderId, receiverId } = req.body;
      
      if (!senderId || !receiverId) {
        return res.status(400).json({ error: "معلومات المرسل والمستقبل مطلوبة" });
      }

      if (senderId === receiverId) {
        return res.status(400).json({ error: "لا يمكنك إرسال طلب صداقة لنفسك" });
      }

      // التحقق من وجود طلب سابق
      const existingRequest = await storage.getFriendRequest(senderId, receiverId);
      if (existingRequest) {
        return res.status(400).json({ error: "طلب الصداقة موجود بالفعل" });
      }

      // التحقق من الصداقة الموجودة
      const friendship = await storage.getFriendship(senderId, receiverId);
      if (friendship) {
        return res.status(400).json({ error: "أنتما أصدقاء بالفعل" });
      }

      const request = await storage.createFriendRequest(senderId, receiverId);
      
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
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // الحصول على طلبات الصداقة الواردة
  app.get("/api/friend-requests/incoming/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const requests = await storage.getIncomingFriendRequests(userId);
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // الحصول على طلبات الصداقة الصادرة
  app.get("/api/friend-requests/outgoing/:userId", async (req, res) => {
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
  app.get("/api/friends/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const friends = await storage.getFriends(userId);
      res.json({ friends });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // إزالة صديق
  app.delete("/api/friends/:userId/:friendId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const friendId = parseInt(req.params.friendId);
      
      await storage.removeFriend(userId, friendId);
      res.json({ message: "تم إزالة الصديق" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

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

  // إضافة endpoint منفصل للطرد (kick)
  app.post("/api/moderation/kick", async (req, res) => {
    try {
      const { moderatorId, targetUserId, reason, duration = 15 } = req.body;
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
        broadcast({
          type: 'kicked',
          targetUserId: targetUserId,
          duration: duration,
          reason: reason
        });

        // إرسال إشعار للدردشة العامة
        const systemMessage = `⏰ تم طرد ${target?.username} من قبل ${moderator?.username} لمدة ${duration} دقيقة - السبب: ${reason}`;
        
        broadcast({
          type: 'systemMessage',
          action: 'kicked',
          targetUserId: targetUserId,
          message: systemMessage,
          duration: duration,
          reason: reason
        });
        
        res.json({ message: "تم طرد المستخدم بنجاح" });
      } else {
        res.status(403).json({ error: "غير مسموح لك بهذا الإجراء" });
      }
    } catch (error) {
      console.error('خطأ في الطرد:', error);
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
        
        // إرسال إشعار خاص للمستخدم المحجوب
        io.to(targetUserId.toString()).emit('blocked', {
          targetUserId: targetUserId,
          reason: reason
        });

        // إرسال إشعار للدردشة العامة
        const systemMessage = `🚫 تم حجب ${target?.username} نهائياً من قبل ${moderator?.username} - السبب: ${reason}`;
        
        broadcast({
          type: 'moderationAction',
          action: 'blocked',
          targetUserId: targetUserId,
          message: systemMessage
        });
        
        // إجبار قطع الاتصال
        io.to(targetUserId.toString()).disconnectSockets();
        
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

  // إضافة endpoint سجل الإجراءات للإدمن
  app.get("/api/moderation/actions", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const user = await storage.getUser(userId);
      
      // للإدمن والمالك فقط
      if (!user || (user.userType !== 'owner' && user.userType !== 'admin')) {
        return res.status(403).json({ error: "غير مسموح - للإدمن والمالك فقط" });
      }

      const actions = moderationSystem.getModerationLog()
        .map(action => ({
          ...action,
          moderatorName: '', 
          targetName: '' 
        }));
      
      // إضافة أسماء المستخدمين للإجراءات
      for (const action of actions) {
        const moderator = await storage.getUser(action.moderatorId);
        const target = await storage.getUser(action.targetUserId);
        action.moderatorName = moderator?.username || 'مجهول';
        action.targetName = target?.username || 'مجهول';
      }

      console.log(`📋 ${user.username} طلب سجل الإجراءات - ${actions.length} إجراء`);
      res.json(actions);
    } catch (error) {
      console.error("خطأ في الحصول على سجل الإجراءات:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

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

      console.log(`📋 ${user.username} طلب تاريخ الإجراءات - ${actions.length} إجراء`);
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

      console.log(`📋 ${user.username} طلب سجل البلاغات - ${reports.length} بلاغ`);
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
        console.log(`📋 ${user.username} راجع البلاغ ${reportId} - ${action}`);
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
      
      console.log(`👑 ${moderator.username} رقى ${target.username} إلى ${newRole}`);
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

      console.log(`📋 ${user.username} طلب الإجراءات النشطة - ${activeActions.length} إجراء`);
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
      
      console.log('Updating user:', id, 'with updates:', updates);
      
      const user = await storage.updateUser(parseInt(id), updates);
      if (!user) {
        console.log('User not found:', id);
        return res.status(404).json({ error: 'User not found' });
      }
      
      console.log('User updated successfully:', user);
      
      // إرسال تحديث الثيم عبر WebSocket
      if (updates.userTheme) {
        const updateMessage = {
          type: 'theme_update',
          userId: parseInt(id),
          userTheme: updates.userTheme,
          timestamp: new Date().toISOString()
        };
        broadcast(updateMessage);
        console.log('Broadcasting theme update:', updateMessage);
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
      const userId = parseInt(req.params.userId);
      const notifications = await storage.getUserNotifications(userId);
      res.json({ notifications });
    } catch (error) {
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
      const userId = parseInt(req.params.userId);
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب عدد الإشعارات" });
    }
  });

  // Update profile background color
  app.post('/api/users/update-background-color', async (req, res) => {
    try {
      const { userId, profileBackgroundColor } = req.body;
      
      if (!userId || !profileBackgroundColor) {
        return res.status(400).json({ error: 'معرف المستخدم ولون الخلفية مطلوبان' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      await storage.updateUser(userId, { profileBackgroundColor });
      
      // إشعار المستخدمين الآخرين عبر WebSocket
      broadcast({
        type: 'user_background_updated',
        data: { userId, profileBackgroundColor }
      });

      res.json({ success: true, message: 'تم تحديث لون خلفية البروفايل بنجاح' });
    } catch (error) {
      console.error('خطأ في تحديث لون الخلفية:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  });

  return httpServer;
}
