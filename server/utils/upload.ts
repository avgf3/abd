import fs from 'fs';
import path from 'path';

import multer from 'multer';

// Centralized allowed image mime types (security: SVG disabled)
export const allowedImageMimes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * Create a unified multer configuration for image uploads.
 * Ensures destination exists and enforces size/type limits consistently.
 */
export function createMulterConfig(destination: string, prefix: string, maxSize: number) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'client', 'public', 'uploads', destination);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: maxSize,
      files: 1,
    },
    fileFilter: (req, file, cb) => {
      if (allowedImageMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}. الأنواع المسموح بها: JPG, PNG, GIF, WebP`));
      }
    },
  });
}

