import dotenv from 'dotenv';
import { beforeAll } from '@jest/globals';

// تحميل متغيرات البيئة
dotenv.config();

// إعدادات عامة للاختبارات
beforeAll(() => {
  // التأكد من وجود متغيرات البيئة المطلوبة
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL غير محدد في ملف .env');
  }

  // تعيين متغيرات البيئة للاختبار
  process.env.NODE_ENV = 'test';
  process.env.API_URL = process.env.API_URL || 'http://localhost:3001';
  process.env.WS_URL = process.env.WS_URL || 'http://localhost:3001';
});

// زيادة مهلة الاختبارات للعمليات الطويلة
jest.setTimeout(30000);