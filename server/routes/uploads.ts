import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { authMiddleware } from "../auth/authMiddleware";
import { storage } from "../storage";

const router = Router();

// إعداد multer للرفع
const uploadDir = path.join(process.cwd(), 'uploads');
const profilesDir = path.join(uploadDir, 'profiles');
const bannersDir = path.join(uploadDir, 'banners');
const messagesDir = path.join(uploadDir, 'messages');

// إنشاء المجلدات إذا لم تكن موجودة
[uploadDir, profilesDir, bannersDir, messagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// إعدادات التخزين
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = uploadDir;
    
    if (req.body.type === 'profile') {
      uploadPath = profilesDir;
    } else if (req.body.type === 'banner') {
      uploadPath = bannersDir;
    } else if (req.body.type === 'message') {
      uploadPath = messagesDir;
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const type = req.body.type || 'file';
    
    const filename = `${type}_${userId}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

// فلتر الملفات
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true
  };

  if (allowedTypes[file.mimetype as keyof typeof allowedTypes]) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم. الأنواع المدعومة: JPEG, PNG, GIF, WebP'));
  }
};

// إعداد multer
const upload = multer({
  storage: diskStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
});

// دالة تحسين الصور
async function optimizeImage(inputPath: string, outputPath: string, options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}) {
  try {
    let pipeline = sharp(inputPath);
    
    if (options.width || options.height) {
      pipeline = pipeline.resize(options.width, options.height, {
        fit: 'cover',
        position: 'center'
      });
    }
    
    switch (options.format || 'jpeg') {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: options.quality || 80 });
        break;
      case 'png':
        pipeline = pipeline.png({ quality: options.quality || 80 });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality: options.quality || 80 });
        break;
    }
    
    await pipeline.toFile(outputPath);
    
    // حذف الملف الأصلي إذا كان مختلفاً
    if (inputPath !== outputPath) {
      fs.unlinkSync(inputPath);
    }
    
    return true;
  } catch (error) {
    console.error('خطأ في تحسين الصورة:', error);
    return false;
  }
}

// رفع صورة الملف الشخصي
router.post('/profile', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم رفع أي ملف'
      });
    }

    const userId = req.user!.id;
    const originalPath = req.file.path;
    const filename = `profile_${userId}_${Date.now()}.webp`;
    const optimizedPath = path.join(profilesDir, filename);

    // تحسين الصورة
    const optimized = await optimizeImage(originalPath, optimizedPath, {
      width: 200,
      height: 200,
      quality: 85,
      format: 'webp'
    });

    if (!optimized) {
      return res.status(500).json({
        success: false,
        error: 'فشل في معالجة الصورة'
      });
    }

    // تحديث قاعدة البيانات
    const imageUrl = `/uploads/profiles/${filename}`;
    await storage.updateUser(userId, { profileImage: imageUrl });

    // حذف الصورة القديمة إن وجدت
    const user = await storage.getUser(userId);
    if (user?.profileImage && user.profileImage !== '/default_avatar.svg') {
      const oldImagePath = path.join(process.cwd(), user.profileImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    res.json({
      success: true,
      imageUrl,
      message: 'تم رفع صورة الملف الشخصي بنجاح'
    });

  } catch (error) {
    console.error('خطأ في رفع صورة الملف الشخصي:', error);
    
    // تنظيف الملف في حالة الخطأ
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: 'خطأ في رفع الصورة'
    });
  }
});

// رفع صورة الغلاف
router.post('/banner', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم رفع أي ملف'
      });
    }

    const userId = req.user!.id;
    const originalPath = req.file.path;
    const filename = `banner_${userId}_${Date.now()}.webp`;
    const optimizedPath = path.join(bannersDir, filename);

    // تحسين الصورة
    const optimized = await optimizeImage(originalPath, optimizedPath, {
      width: 800,
      height: 300,
      quality: 85,
      format: 'webp'
    });

    if (!optimized) {
      return res.status(500).json({
        success: false,
        error: 'فشل في معالجة الصورة'
      });
    }

    // تحديث قاعدة البيانات
    const imageUrl = `/uploads/banners/${filename}`;
    await storage.updateUser(userId, { profileBanner: imageUrl });

    // حذف الصورة القديمة إن وجدت
    const user = await storage.getUser(userId);
    if (user?.profileBanner) {
      const oldImagePath = path.join(process.cwd(), user.profileBanner);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    res.json({
      success: true,
      imageUrl,
      message: 'تم رفع صورة الغلاف بنجاح'
    });

  } catch (error) {
    console.error('خطأ في رفع صورة الغلاف:', error);
    
    // تنظيف الملف في حالة الخطأ
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: 'خطأ في رفع الصورة'
    });
  }
});

// رفع صورة في الرسائل
router.post('/message', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم رفع أي ملف'
      });
    }

    const userId = req.user!.id;
    const originalPath = req.file.path;
    const filename = `message_${userId}_${Date.now()}.webp`;
    const optimizedPath = path.join(messagesDir, filename);

    // تحسين الصورة
    const optimized = await optimizeImage(originalPath, optimizedPath, {
      width: 800,
      height: 600,
      quality: 80,
      format: 'webp'
    });

    if (!optimized) {
      return res.status(500).json({
        success: false,
        error: 'فشل في معالجة الصورة'
      });
    }

    const imageUrl = `/uploads/messages/${filename}`;

    res.json({
      success: true,
      imageUrl,
      message: 'تم رفع الصورة بنجاح'
    });

  } catch (error) {
    console.error('خطأ في رفع صورة الرسالة:', error);
    
    // تنظيف الملف في حالة الخطأ
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: 'خطأ في رفع الصورة'
    });
  }
});

// حذف صورة
router.delete('/:type/:filename', authMiddleware, async (req, res) => {
  try {
    const { type, filename } = req.params;
    const userId = req.user!.id;

    // التحقق من نوع الملف
    const allowedTypes = ['profiles', 'banners', 'messages'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'نوع الملف غير صالح'
      });
    }

    // التحقق من ملكية الملف
    if (!filename.includes(`_${userId}_`)) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية لحذف هذا الملف'
      });
    }

    const filePath = path.join(uploadDir, type, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      
      // تحديث قاعدة البيانات إذا كانت صورة شخصية أو غلاف
      if (type === 'profiles') {
        await storage.updateUser(userId, { profileImage: '/default_avatar.svg' });
      } else if (type === 'banners') {
        await storage.updateUser(userId, { profileBanner: null });
      }

      res.json({
        success: true,
        message: 'تم حذف الصورة بنجاح'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'الملف غير موجود'
      });
    }

  } catch (error) {
    console.error('خطأ في حذف الصورة:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في حذف الصورة'
    });
  }
});

// الحصول على معلومات الملف
router.get('/info/:type/:filename', authMiddleware, async (req, res) => {
  try {
    const { type, filename } = req.params;
    
    const allowedTypes = ['profiles', 'banners', 'messages'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'نوع الملف غير صالح'
      });
    }

    const filePath = path.join(uploadDir, type, filename);
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      
      res.json({
        success: true,
        file: {
          name: filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          url: `/uploads/${type}/${filename}`
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'الملف غير موجود'
      });
    }

  } catch (error) {
    console.error('خطأ في الحصول على معلومات الملف:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم'
    });
  }
});

// تنظيف الملفات القديمة (للإدارة)
router.post('/cleanup', authMiddleware, async (req, res) => {
  try {
    // فقط المديرين يمكنهم تنظيف الملفات
    if (req.user!.userType !== 'admin' && req.user!.userType !== 'owner') {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية لتنظيف الملفات'
      });
    }

    const { olderThanDays = 30 } = req.body;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let deletedCount = 0;
    const directories = [messagesDir]; // فقط ملفات الرسائل

    for (const dir of directories) {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.birthtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
    }

    res.json({
      success: true,
      message: `تم حذف ${deletedCount} ملف قديم`,
      deletedCount
    });

  } catch (error) {
    console.error('خطأ في تنظيف الملفات:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تنظيف الملفات'
    });
  }
});

// إحصائيات الرفع
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const directories = [
      { name: 'profiles', path: profilesDir },
      { name: 'banners', path: bannersDir },
      { name: 'messages', path: messagesDir }
    ];

    const stats = directories.map(dir => {
      const files = fs.readdirSync(dir.path);
      const totalSize = files.reduce((acc, file) => {
        const filePath = path.join(dir.path, file);
        const stats = fs.statSync(filePath);
        return acc + stats.size;
      }, 0);

      return {
        type: dir.name,
        count: files.length,
        totalSize: totalSize,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
      };
    });

    const totalFiles = stats.reduce((acc, stat) => acc + stat.count, 0);
    const totalSize = stats.reduce((acc, stat) => acc + stat.totalSize, 0);

    res.json({
      success: true,
      stats: {
        directories: stats,
        total: {
          files: totalFiles,
          size: totalSize,
          sizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
        }
      }
    });

  } catch (error) {
    console.error('خطأ في جلب إحصائيات الرفع:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب الإحصائيات'
    });
  }
});

// معالج الأخطاء
router.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'حجم الملف كبير جداً. الحد الأقصى 5MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'يمكن رفع ملف واحد فقط في كل مرة'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    error: error.message || 'خطأ في رفع الملف'
  });
});

export default router;