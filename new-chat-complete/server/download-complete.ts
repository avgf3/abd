import fs from 'fs';
import path from 'path';

import archiver from 'archiver';
import type { Express } from 'express';

export function setupCompleteDownload(app: Express) {
  // تحميل المشروع كاملاً
  app.get('/api/download/complete-project', (req, res) => {
    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    res.attachment('arabic-chat-complete-project.zip');
    archive.pipe(res);

    // إضافة ملفات المشروع الأساسية
    const filesToInclude = [
      // Frontend files
      'client/src',
      'client/public',
      'client/index.html',

      // Backend files
      'server',
      'shared',

      // Configuration files
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'vite.config.ts',
      'tailwind.config.ts',
      'postcss.config.js',
      'components.json',
      'drizzle.config.ts',

      // Documentation
      'replit.md',
      'README.md',
    ];

    // إضافة الملفات والمجلدات
    filesToInclude.forEach((item) => {
      const itemPath = path.join(process.cwd(), item);

      if (fs.existsSync(itemPath)) {
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          archive.directory(itemPath, item);
        } else {
          archive.file(itemPath, { name: item });
        }
      }
    });

    // إضافة ملف تعليمات التشغيل
    const instructions = `# مشروع الدردشة العربية - Arabic Chat Project

## التشغيل السريع
1. npm install
2. npm run dev

## الميزات الأساسية
- دردشة عامة وخاصة
- نظام الأصدقاء
- نظام الإدارة المتقدم
- رفع الصور
- إشعارات فورية
- دعم العربية RTL

## بيانات الإدمن
- اسم المستخدم: عبود
- كلمة المرور: 22333

## قاعدة البيانات
يتطلب PostgreSQL أو يمكن تشغيله بـ in-memory storage

## الدعم الفني
المشروع مطور بالكامل ومجهز للإنتاج
`;

    archive.append(instructions, { name: 'README-ARABIC.md' });

    archive.finalize();
  });

  // تحميل الكود المصدري فقط
  app.get('/api/download/source-code', (req, res) => {
    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    res.attachment('arabic-chat-source-code.zip');
    archive.pipe(res);

    // ملفات الكود المصدري فقط
    const sourceFiles = [
      'client/src',
      'server',
      'shared',
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'tailwind.config.ts',
    ];

    sourceFiles.forEach((item) => {
      const itemPath = path.join(process.cwd(), item);

      if (fs.existsSync(itemPath)) {
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          archive.directory(itemPath, item);
        } else {
          archive.file(itemPath, { name: item });
        }
      }
    });

    archive.finalize();
  });

  // تحميل قاعدة البيانات
  app.get('/api/download/database-schema', (req, res) => {
    const schema = `-- مخطط قاعدة البيانات - Arabic Chat Database Schema

-- جدول المستخدمين
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255),
  email VARCHAR(100),
  user_type VARCHAR(20) DEFAULT 'guest',
  gender VARCHAR(10),
  age INTEGER,
  country VARCHAR(50),
  relation VARCHAR(50),
  status VARCHAR(100),
  profile_image TEXT,
  profile_banner TEXT,
  username_color VARCHAR(7) DEFAULT '#ffffff',
  is_online BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الرسائل
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id),
  receiver_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الأصدقاء
CREATE TABLE friends (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  friend_id INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'accepted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, friend_id)
);

-- جدول طلبات الصداقة
CREATE TABLE friend_requests (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id),
  receiver_id INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sender_id, receiver_id)
);

-- جدول الإشعارات
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إدراج المستخدم الإدمن الافتراضي
INSERT INTO users (username, password, user_type, gender, status) 
VALUES ('عبود', '22333', 'owner', 'male', 'مؤسس المنصة')
ON CONFLICT (username) DO NOTHING;
`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="database-schema.sql"');
    res.send(schema);
  });
}
