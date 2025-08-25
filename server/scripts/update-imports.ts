#!/usr/bin/env node
/**
 * سكريبت لتحديث الملفات لاستخدام التحسينات الجديدة
 * يمكن تشغيله لتطبيق التحسينات تدريجياً
 */

import { promises as fs } from 'fs';
import path from 'path';

async function updateImports() {
  console.log('🔄 جاري تحديث الملفات لاستخدام التحسينات الجديدة...');
  
  try {
    // قراءة ملف routes.ts
    const routesPath = path.join(__dirname, '../routes.ts');
    let routesContent = await fs.readFile(routesPath, 'utf-8');
    
    // إضافة استيرادات جديدة إذا لم تكن موجودة
    const newImports = `
// التحسينات الأمنية والأداء
import { sanitizeMessage, sanitizeName, sanitizeObject } from './utils/sanitizer';
import { validate, validateQuery, validateParams } from './middleware/validation';
import * as schemas from './validation/schemas';
import { 
  cacheUserProfile, 
  cacheRoomList, 
  cacheRoomMembers,
  cacheFriendsList,
  invalidateUserCache,
  invalidateRoomCache 
} from './middleware/cache';
`;

    if (!routesContent.includes('sanitizer')) {
      // إضافة الاستيرادات بعد الاستيرادات الموجودة
      routesContent = routesContent.replace(
        /(import.*from.*;\n)+/,
        '$&' + newImports
      );
    }
    
    // تحديث مسارات تسجيل الدخول والتسجيل لاستخدام validation
    routesContent = routesContent.replace(
      /router\.post\('\/auth\/login'/,
      "router.post('/auth/login', validate(schemas.loginSchema),"
    );
    
    routesContent = routesContent.replace(
      /router\.post\('\/auth\/register'/,
      "router.post('/auth/register', validate(schemas.registerSchema),"
    );
    
    // إضافة تنقية المحتوى للرسائل
    if (!routesContent.includes('sanitizeMessage')) {
      routesContent = routesContent.replace(
        /const content = req\.body\.content;/g,
        'const content = sanitizeMessage(req.body.content);'
      );
    }
    
    // إضافة cache للمسارات المناسبة
    const cacheableRoutes = [
      { route: '/users/profile/:userId', cache: 'cacheUserProfile' },
      { route: '/rooms', cache: 'cacheRoomList' },
      { route: '/rooms/:roomId/members', cache: 'cacheRoomMembers' },
      { route: '/friends', cache: 'cacheFriendsList' }
    ];
    
    for (const { route, cache } of cacheableRoutes) {
      const regex = new RegExp(`router\\.get\\('${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`);
      if (routesContent.match(regex) && !routesContent.includes(cache)) {
        routesContent = routesContent.replace(
          regex,
          `router.get('${route}', ${cache},`
        );
      }
    }
    
    // حفظ الملف المحدث
    await fs.writeFile(routesPath, routesContent);
    console.log('✅ تم تحديث routes.ts');
    
    // تحديث ملف الخادم الرئيسي
    console.log('💡 لتطبيق جميع التحسينات، قم بما يلي:');
    console.log('1. انسخ محتوى server/index-enhanced.ts إلى server/index.ts');
    console.log('2. انسخ محتوى server/security-enhanced.ts إلى server/security.ts');
    console.log('3. تأكد من إضافة متغيرات البيئة التالية:');
    console.log('   - REDIS_URL: رابط خادم Redis');
    console.log('   - SESSION_SECRET: مفتاح سري قوي للجلسات');
    console.log('   - JWT_SECRET: مفتاح سري قوي لـ JWT');
    console.log('4. أعد بناء المشروع: npm run build');
    console.log('5. أعد تشغيل الخادم');
    
  } catch (error) {
    console.error('❌ خطأ في تحديث الملفات:', error);
    process.exit(1);
  }
}

// تشغيل السكريبت
updateImports();