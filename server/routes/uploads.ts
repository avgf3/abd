import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { z } from 'zod';
import { db } from '../database-adapter';
import { users } from '../../shared/schema';
import { protect } from '../middleware/enhancedSecurity';
import { detectSexualImage } from '../utils/adult-content';
import { eq } from 'drizzle-orm';

const router = Router();

// Setup multer for file uploads
const multerStorage = multer.memoryStorage();
const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مسموح'));
    }
  },
});

// Ensure upload directories exist
const ensureUploadDirs = async () => {
  const dirs = [
    'client/public/uploads/avatars',
    'client/public/uploads/banners',
    'client/public/uploads/profiles',
  ];
  
  for (const dir of dirs) {
    const fullPath = path.join(process.cwd(), dir);
    await fsp.mkdir(fullPath, { recursive: true });
  }
};

// Upload profile image
router.post('/profile-image', protect.authenticated, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم تحميل أي صورة' });
    }

    const userId = req.session.userId!;

    // Check for adult content
    const adultCheck = await detectSexualImage(req.file.buffer);
    if (adultCheck.isSexual) {
      return res.status(400).json({ error: 'الصورة تحتوي على محتوى غير لائق' });
    }

    // Ensure directories exist
    await ensureUploadDirs();

    // Process and save image
    const filename = `profile-${userId}-${Date.now()}.webp`;
    const outputPath = path.join(process.cwd(), 'client/public/uploads/avatars', filename);

    await sharp(req.file.buffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 85 })
      .toFile(outputPath);

    // Update user avatar
    const avatarUrl = `/uploads/avatars/${filename}`;
    await db
      .update(users)
      .set({
        avatar: avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    res.json({
      success: true,
      avatarUrl,
    });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في رفع الصورة' });
  }
});

// Upload profile banner
router.post('/profile-banner', protect.authenticated, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم تحميل أي صورة' });
    }

    const userId = req.session.userId!;

    // Check for adult content
    const adultCheck = await detectSexualImage(req.file.buffer);
    if (adultCheck.isSexual) {
      return res.status(400).json({ error: 'الصورة تحتوي على محتوى غير لائق' });
    }

    // Ensure directories exist
    await ensureUploadDirs();

    // Process and save banner
    const filename = `banner-${userId}-${Date.now()}.webp`;
    const outputPath = path.join(process.cwd(), 'client/public/uploads/banners', filename);

    await sharp(req.file.buffer)
      .resize(1200, 300, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 90 })
      .toFile(outputPath);

    // Update user banner
    const bannerUrl = `/uploads/banners/${filename}`;
    await db
      .update(users)
      .set({
        profileBanner: bannerUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    res.json({
      success: true,
      bannerUrl,
    });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في رفع الصورة' });
  }
});

// Upload generic image
router.post('/image', protect.authenticated, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم تحميل أي صورة' });
    }

    const userId = req.session.userId!;
    const { type = 'general' } = req.body;

    // Check for adult content
    const adultCheck = await detectSexualImage(req.file.buffer);
    if (adultCheck.isSexual) {
      return res.status(400).json({ error: 'الصورة تحتوي على محتوى غير لائق' });
    }

    // Ensure directories exist
    await ensureUploadDirs();

    // Process and save image
    const filename = `${type}-${userId}-${Date.now()}.webp`;
    const outputPath = path.join(process.cwd(), 'client/public/uploads/profiles', filename);

    await sharp(req.file.buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toFile(outputPath);

    const imageUrl = `/uploads/profiles/${filename}`;

    res.json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في رفع الصورة' });
  }
});

// Delete uploaded file
router.delete('/image', protect.authenticated, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const userId = req.session.userId!;

    if (!imageUrl || !imageUrl.startsWith('/uploads/')) {
      return res.status(400).json({ error: 'رابط غير صالح' });
    }

    // Check if user owns this image
    const filename = path.basename(imageUrl);
    if (!filename.includes(`-${userId}-`)) {
      return res.status(403).json({ error: 'غير مصرح بحذف هذه الصورة' });
    }

    const filePath = path.join(process.cwd(), 'client/public', imageUrl);
    
    try {
      await fsp.unlink(filePath);
      res.json({ success: true });
    } catch (err) {
      res.status(404).json({ error: 'الملف غير موجود' });
    }
  } catch (error) {
    res.status(500).json({ error: 'خطأ في حذف الصورة' });
  }
});

export default router;