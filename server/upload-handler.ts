/**
 * معالج رفع الصور المحسن
 * يوفر نظام رفع آمن وموثوق للصور الشخصية
 */

import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';

// إعدادات رفع الصور
const UPLOAD_CONFIG = {
  // الحد الأقصى لحجم الملف (5 ميجابايت)
  maxFileSize: 5 * 1024 * 1024,
  
  // الصيغ المسموحة
  allowedMimeTypes: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp'
  ],
  
  // أبعاد الصورة المحسنة
  profileImage: {
    width: 400,
    height: 400,
    quality: 85
  },
  
  // مسار حفظ الصور
  uploadPath: path.join(process.cwd(), 'client', 'public', 'uploads', 'avatars')
};

/**
 * إنشاء مجلد الرفع إذا لم يكن موجوداً
 */
export async function ensureUploadDirectory(): Promise<void> {
  try {
    await fsp.mkdir(UPLOAD_CONFIG.uploadPath, { recursive: true });
    
    // التحقق من صلاحيات الكتابة
    await fsp.access(UPLOAD_CONFIG.uploadPath, fs.constants.W_OK);
  } catch (error) {
    console.error('❌ خطأ في إنشاء مجلد الرفع:', error);
    
    // محاولة استخدام مجلد بديل
    const tempPath = path.join(process.cwd(), 'temp', 'uploads', 'avatars');
    await fsp.mkdir(tempPath, { recursive: true });
    UPLOAD_CONFIG.uploadPath = tempPath;
    console.log('✅ تم استخدام مجلد بديل:', tempPath);
  }
}

/**
 * حساب هاش للملف
 */
export function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex').substring(0, 8);
}

/**
 * التحقق من صحة نوع الملف
 */
export function isValidImageType(mimeType: string): boolean {
  return UPLOAD_CONFIG.allowedMimeTypes.includes(mimeType.toLowerCase());
}

/**
 * التحقق من صحة حجم الملف
 */
export function isValidFileSize(size: number): boolean {
  return size > 0 && size <= UPLOAD_CONFIG.maxFileSize;
}

/**
 * معالجة وتحسين الصورة
 */
export async function processImage(inputBuffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();
    
    // التحقق من صحة الصورة
    if (!metadata.width || !metadata.height) {
      throw new Error('صورة غير صالحة');
    }
    
    // تحويل إلى webp مع تحسين الجودة
    const processedImage = await image
      .resize(UPLOAD_CONFIG.profileImage.width, UPLOAD_CONFIG.profileImage.height, {
        fit: 'cover',
        position: 'center',
        withoutEnlargement: false
      })
      .webp({ 
        quality: UPLOAD_CONFIG.profileImage.quality,
        effort: 4 
      })
      .toBuffer();
    
    return processedImage;
  } catch (error) {
    console.error('خطأ في معالجة الصورة:', error);
    throw new Error('فشل في معالجة الصورة');
  }
}

/**
 * حفظ الصورة في النظام
 */
export async function saveProfileImage(
  userId: number,
  imageBuffer: Buffer
): Promise<{ path: string; url: string; hash: string }> {
  try {
    // التأكد من وجود المجلد
    await ensureUploadDirectory();
    
    // معالجة الصورة
    const processedBuffer = await processImage(imageBuffer);
    
    // حساب الهاش
    const hash = calculateFileHash(processedBuffer);
    
    // تحديد مسار الملف
    const filename = `${userId}.webp`;
    const filePath = path.join(UPLOAD_CONFIG.uploadPath, filename);
    
    // حفظ الصورة
    await fsp.writeFile(filePath, processedBuffer);
    
    // إنشاء URL للصورة
    const imageUrl = `/uploads/avatars/${filename}?v=${hash}`;
    
    console.log(`✅ تم حفظ صورة المستخدم ${userId}: ${imageUrl}`);
    
    return {
      path: filePath,
      url: imageUrl,
      hash
    };
  } catch (error) {
    console.error('خطأ في حفظ الصورة:', error);
    throw new Error('فشل في حفظ الصورة');
  }
}

/**
 * حذف صورة البروفايل القديمة
 */
export async function deleteOldProfileImage(userId: number): Promise<void> {
  try {
    const oldImagePath = path.join(UPLOAD_CONFIG.uploadPath, `${userId}.webp`);
    
    // التحقق من وجود الصورة القديمة
    const exists = await fsp.stat(oldImagePath).then(() => true).catch(() => false);
    
    if (exists) {
      await fsp.unlink(oldImagePath);
      console.log(`✅ تم حذف الصورة القديمة للمستخدم ${userId}`);
    }
  } catch (error) {
    console.error('خطأ في حذف الصورة القديمة:', error);
    // لا نرمي خطأ هنا لأن حذف الصورة القديمة ليس حرجاً
  }
}

/**
 * إعداد multer للرفع
 */
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: UPLOAD_CONFIG.maxFileSize,
    files: 1,
    fields: 5,
    parts: 10
  },
  fileFilter: (req, file, cb) => {
    // التحقق من نوع الملف
    if (!isValidImageType(file.mimetype)) {
      cb(new Error('نوع الملف غير مسموح. الصيغ المسموحة: JPG, PNG, GIF, WebP'));
      return;
    }
    
    // التحقق من امتداد الملف
    const ext = path.extname(file.originalname).toLowerCase();
    const validExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    if (!validExts.includes(ext)) {
      cb(new Error('امتداد الملف غير صالح'));
      return;
    }
    
    cb(null, true);
  }
});

/**
 * معالج رفع صورة البروفايل
 */
export async function handleProfileImageUpload(
  req: Request & { file?: Express.Multer.File; user?: any },
  res: Response
): Promise<void> {
  try {
    // التحقق من وجود الملف
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'لم يتم رفع أي ملف'
      });
      return;
    }
    
    // التحقق من المستخدم
    const userId = req.user?.id;
    if (!userId || isNaN(userId)) {
      res.status(401).json({
        success: false,
        error: 'يجب تسجيل الدخول أولاً'
      });
      return;
    }
    
    // التحقق من حجم الملف
    if (!isValidFileSize(req.file.size)) {
      res.status(400).json({
        success: false,
        error: `حجم الملف يجب أن يكون أقل من ${UPLOAD_CONFIG.maxFileSize / (1024 * 1024)} ميجابايت`
      });
      return;
    }
    
    // حفظ الصورة
    const result = await saveProfileImage(userId, req.file.buffer);
    
    // إرجاع النتيجة
    res.json({
      success: true,
      imageUrl: result.url,
      avatarHash: result.hash,
      message: 'تم رفع الصورة بنجاح'
    });
    
  } catch (error) {
    console.error('❌ خطأ في رفع الصورة:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ في رفع الصورة'
    });
  }
}

/**
 * معالج حذف صورة البروفايل
 */
export async function handleProfileImageDelete(
  req: Request & { user?: any },
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'يجب تسجيل الدخول أولاً'
      });
      return;
    }
    
    // حذف الصورة
    await deleteOldProfileImage(userId);
    
    res.json({
      success: true,
      message: 'تم حذف الصورة بنجاح'
    });
    
  } catch (error) {
    console.error('❌ خطأ في حذف الصورة:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في حذف الصورة'
    });
  }
}

/**
 * التحقق من وجود صورة للمستخدم
 */
export async function userHasProfileImage(userId: number): Promise<boolean> {
  try {
    const imagePath = path.join(UPLOAD_CONFIG.uploadPath, `${userId}.webp`);
    await fsp.access(imagePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * الحصول على URL صورة المستخدم
 */
export async function getUserImageUrl(userId: number): Promise<string | null> {
  try {
    const hasImage = await userHasProfileImage(userId);
    if (!hasImage) return null;
    
    const imagePath = path.join(UPLOAD_CONFIG.uploadPath, `${userId}.webp`);
    const stats = await fsp.stat(imagePath);
    
    // استخدام تاريخ التعديل كـ version
    const version = Math.floor(stats.mtimeMs / 1000);
    return `/uploads/avatars/${userId}.webp?v=${version}`;
  } catch {
    return null;
  }
}