import express from 'express';
import cors from 'cors';
import { fixedStorage } from './storage-fixed.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

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
      cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}`));
    }
  }
});

// إعداد multer لرفع صور البانر
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
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
      'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}`));
    }
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'client', 'public', 'uploads')));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'الخادم يعمل بنجاح!', 
    status: 'fixed',
    timestamp: new Date().toISOString() 
  });
});

// User routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, userType = 'member' } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'اسم المستخدم مطلوب' });
    }
    
    const existingUser = await fixedStorage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
    }
    
    const newUser = await fixedStorage.createUser({
      username,
      password,
      userType,
      role: userType
    });
    
    res.json({ success: true, user: { id: newUser.id, username: newUser.username } });
  } catch (error) {
    console.error('خطأ في التسجيل:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }
    
    const user = await fixedStorage.verifyUserCredentials(username, password);
    if (!user) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }
    
    // Update online status
    await fixedStorage.setUserOnlineStatus(user.id, true);
    
    res.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        userType: user.userType,
        role: user.role 
      } 
    });
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await fixedStorage.getAllUsers();
    const safeUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      userType: user.userType,
      role: user.role,
      isOnline: user.isOnline,
      profileImage: user.profileImage
    }));
    res.json(safeUsers);
  } catch (error) {
    console.error('خطأ في جلب المستخدمين:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// رفع صور البروفايل
app.post('/api/upload/profile-image', upload.single('profileImage'), async (req, res) => {
  try {
    console.log('📤 رفع صورة بروفايل:', {
      file: req.file ? 'موجود' : 'غير موجود',
      body: req.body,
      headers: req.headers['content-type']
    });

    if (!req.file) {
      return res.status(400).json({ 
        error: "لم يتم رفع أي ملف",
        details: "تأكد من إرسال الملف في حقل 'profileImage'"
      });
    }

    const userId = parseInt(req.body.userId);
    if (!userId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "معرف المستخدم مطلوب" });
    }

    // التحقق من وجود المستخدم
    const user = await fixedStorage.getUser(userId);
    if (!user) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "المستخدم غير موجود" });
    }

    // إنشاء مسار الصورة النسبي
    const relativePath = `/uploads/profiles/${req.file.filename}`;
    
    // تحديث صورة البروفايل في قاعدة البيانات
    await fixedStorage.updateUser(userId, { profileImage: relativePath });

    console.log('✅ تم رفع صورة البروفايل بنجاح:', {
      userId,
      filename: req.file.filename,
      path: relativePath
    });

    res.json({
      message: "تم رفع الصورة بنجاح",
      imageUrl: relativePath,
      filename: req.file.filename
    });

  } catch (error) {
    console.error('❌ خطأ في رفع صورة البروفايل:', error);
    
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

// رفع صور البانر
app.post('/api/upload/profile-banner', bannerUpload.single('banner'), async (req, res) => {
  try {
    console.log('📤 رفع صورة بانر:', {
      file: req.file ? 'موجود' : 'غير موجود',
      body: req.body
    });

    if (!req.file) {
      return res.status(400).json({ 
        error: "لم يتم رفع أي ملف",
        details: "تأكد من إرسال الملف في حقل 'banner'"
      });
    }

    const userId = parseInt(req.body.userId);
    if (!userId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "معرف المستخدم مطلوب" });
    }

    // التحقق من وجود المستخدم
    const user = await fixedStorage.getUser(userId);
    if (!user) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "المستخدم غير موجود" });
    }

    const relativePath = `/uploads/banners/${req.file.filename}`;
    
    await fixedStorage.updateUser(userId, { profileBanner: relativePath });

    console.log('✅ تم رفع صورة البانر بنجاح:', {
      userId,
      filename: req.file.filename,
      path: relativePath
    });

    res.json({
      message: "تم رفع صورة البانر بنجاح",
      imageUrl: relativePath,
      filename: req.file.filename
    });

  } catch (error) {
    console.error('❌ خطأ في رفع صورة البانر:', error);
    
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

// Socket.IO
io.on('connection', (socket) => {
  socket.on('join', (userData) => {
    socket.userId = userData.userId;
    socket.username = userData.username;
    });
  
  socket.on('disconnect', async () => {
    if (socket.userId) {
      await fixedStorage.setUserOnlineStatus(socket.userId, false);
      }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`📁 مجلدات الرفع: client/public/uploads/`);
});
