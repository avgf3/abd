import fs from 'fs';
import path from 'path';
import multer from 'multer';
import sharp from 'sharp';

// 🎯 أنواع الملفات المدعومة
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff'
] as const;

// 📏 إعدادات الحجم لكل نوع
export const SIZE_LIMITS = {
  profile: 5 * 1024 * 1024,    // 5MB
  room: 8 * 1024 * 1024,       // 8MB  
  wall: 10 * 1024 * 1024,      // 10MB
  banner: 12 * 1024 * 1024     // 12MB
} as const;

// 🖼️ إعدادات ضغط الصور
export const IMAGE_PROCESSING = {
  profile: { width: 200, height: 200, quality: 85 },
  room: { width: 400, height: 400, quality: 90 },
  wall: { width: 800, height: 600, quality: 85 },
  banner: { width: 1200, height: 300, quality: 90 }
} as const;

export type UploadType = keyof typeof SIZE_LIMITS;

/**
 * إنشاء إعداد multer محسن وموحد
 */
export const createUploadConfig = (
  uploadType: UploadType,
  options: {
    allowMultiple?: boolean;
    maxFiles?: number;
    processImage?: boolean;
  } = {}
) => {
  const {
    allowMultiple = false,
    maxFiles = 1,
    processImage = true
  } = options;

  // 📁 إعداد التخزين
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(
        process.cwd(), 
        'client', 
        'public', 
        'uploads', 
        `${uploadType}s`
      );
      
      // إنشاء المجلد إذا لم يكن موجوداً
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // 🔒 اسم ملف آمن ومعرف فريد
      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname).toLowerCase();
      const safeName = `${uploadType}-${timestamp}-${randomSuffix}${ext}`;
      
      cb(null, safeName);
    }
  });

  // 🛡️ فلتر الملفات المحسن
  const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // التحقق من نوع الملف
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype as any)) {
      const error = new Error(
        `نوع الملف غير مدعوم: ${file.mimetype}. الأنواع المدعومة: ${ALLOWED_IMAGE_TYPES.join(', ')}`
      );
      (error as any).code = 'INVALID_FILE_TYPE';
      return cb(error);
    }

    // التحقق من امتداد الملف
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'];
    
    if (!allowedExtensions.includes(ext)) {
      const error = new Error(
        `امتداد الملف غير مدعوم: ${ext}. الامتدادات المدعومة: ${allowedExtensions.join(', ')}`
      );
      (error as any).code = 'INVALID_FILE_EXTENSION';
      return cb(error);
    }

    cb(null, true);
  };

  // ⚙️ إعداد multer
  const multerConfig = multer({
    storage,
    limits: {
      fileSize: SIZE_LIMITS[uploadType],
      files: allowMultiple ? maxFiles : 1,
      fieldSize: 1024 * 1024, // 1MB للحقول النصية
      fields: 10 // الحد الأقصى للحقول
    },
    fileFilter
  });

  // 🔄 معالجة الرفع
  const uploadHandler = allowMultiple 
    ? multerConfig.array('images', maxFiles)
    : multerConfig.single('image');

  return {
    upload: uploadHandler,
    processImage: processImage ? createImageProcessor(uploadType) : null
  };
};

/**
 * معالج ضغط وتحسين الصور
 */
const createImageProcessor = (uploadType: UploadType) => {
  return async (req: any, res: any, next: any) => {
    try {
      if (!req.file && !req.files) {
        return next();
      }

      const files = req.files || [req.file];
      const processedFiles = [];

      for (const file of files) {
        if (!file) continue;

        const processing = IMAGE_PROCESSING[uploadType];
        const inputPath = file.path;
        const outputPath = inputPath.replace(/\.[^/.]+$/, '_processed$&');

        try {
          // 🖼️ معالجة الصورة باستخدام Sharp
          await sharp(inputPath)
            .resize(processing.width, processing.height, {
              fit: 'cover',
              position: 'center'
            })
            .jpeg({ quality: processing.quality })
            .png({ quality: processing.quality })
            .webp({ quality: processing.quality })
            .toFile(outputPath);

          // حذف الملف الأصلي
          fs.unlinkSync(inputPath);
          
          // تحديث معلومات الملف
          file.path = outputPath;
          file.filename = path.basename(outputPath);
          
          processedFiles.push(file);
        } catch (processError) {
          console.error(`خطأ في معالجة الصورة ${file.filename}:`, processError);
          // الاحتفاظ بالملف الأصلي في حالة فشل المعالجة
          processedFiles.push(file);
        }
      }

      // تحديث req مع الملفات المعالجة
      if (req.files) {
        req.files = processedFiles;
      } else if (req.file) {
        req.file = processedFiles[0];
      }

      next();
    } catch (error) {
      console.error('خطأ في معالج الصور:', error);
      next(error);
    }
  };
};

/**
 * middleware للتنظيف في حالة الخطأ
 */
export const cleanupOnError = (req: any, res: any, next: any) => {
  const originalSend = res.send;
  const originalJson = res.json;

  const cleanup = () => {
    if (res.statusCode >= 400) {
      // حذف الملفات المرفوعة في حالة الخطأ
      const files = req.files || (req.file ? [req.file] : []);
      files.forEach((file: any) => {
        if (file && file.path && fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch (deleteError) {
            console.warn(`تعذر حذف الملف ${file.path}:`, deleteError);
          }
        }
      });
    }
  };

  res.send = function(data: any) {
    cleanup();
    return originalSend.call(this, data);
  };

  res.json = function(data: any) {
    cleanup();
    return originalJson.call(this, data);
  };

  next();
};

/**
 * دالة مساعدة لحذف الملفات القديمة
 */
export const deleteOldFile = (filePath: string): Promise<void> => {
  return new Promise((resolve) => {
    if (!filePath) {
      resolve();
      return;
    }

    const fullPath = filePath.startsWith('/') 
      ? path.join(process.cwd(), 'client', 'public', filePath.slice(1))
      : path.join(process.cwd(), 'client', 'public', filePath);

    if (fs.existsSync(fullPath)) {
      fs.unlink(fullPath, (err) => {
        if (err) {
          console.warn(`تعذر حذف الملف القديم ${fullPath}:`, err);
        }
        resolve();
      });
    } else {
      resolve();
    }
  });
};

/**
 * إعدادات محددة مسبقاً لكل نوع
 */
export const profileUpload = createUploadConfig('profile');
export const roomUpload = createUploadConfig('room');
export const wallUpload = createUploadConfig('wall');
export const bannerUpload = createUploadConfig('banner');

/**
 * middleware شامل للتحقق من الملفات
 */
export const validateUpload = (uploadType: UploadType) => {
  return (req: any, res: any, next: any) => {
    const file = req.file;
    const files = req.files;

    if (!file && !files) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم رفع أي ملف',
        code: 'NO_FILE_UPLOADED'
      });
    }

    const filesToCheck = files || [file];
    
    for (const fileToCheck of filesToCheck) {
      if (!fileToCheck) continue;

      // التحقق من الحجم
      if (fileToCheck.size > SIZE_LIMITS[uploadType]) {
        return res.status(400).json({
          success: false,
          error: `حجم الملف كبير جداً. الحد الأقصى: ${SIZE_LIMITS[uploadType] / (1024 * 1024)}MB`,
          code: 'FILE_TOO_LARGE'
        });
      }

      // التحقق من نوع الملف
      if (!ALLOWED_IMAGE_TYPES.includes(fileToCheck.mimetype as any)) {
        return res.status(400).json({
          success: false,
          error: `نوع الملف غير مدعوم: ${fileToCheck.mimetype}`,
          code: 'INVALID_FILE_TYPE'
        });
      }
    }

    next();
  };
};

export default {
  createUploadConfig,
  cleanupOnError,
  deleteOldFile,
  validateUpload,
  profileUpload,
  roomUpload,
  wallUpload,
  bannerUpload
};