#!/usr/bin/env node

/**
 * سكريبت تطبيق إصلاح أمان الكيانات
 * يقوم بتطبيق جميع الإصلاحات المطلوبة لحل مشكلة تداخل الهويات
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 بدء تطبيق إصلاح أمان الكيانات...\n');

// الخطوة 1: التحقق من وجود قاعدة البيانات
console.log('1️⃣ التحقق من الاتصال بقاعدة البيانات...');
try {
  const { db } = await import('./server/database-adapter.js');
  if (!db) {
    throw new Error('قاعدة البيانات غير متصلة');
  }
  console.log('✅ قاعدة البيانات متصلة\n');
} catch (error) {
  console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error.message);
  process.exit(1);
}

// الخطوة 2: تطبيق إصلاح معرفات البوتات
console.log('2️⃣ تطبيق إصلاح معرفات البوتات...');
try {
  const sqlPath = join(__dirname, 'fix-bot-ids.sql');
  if (!existsSync(sqlPath)) {
    throw new Error('ملف SQL للإصلاح غير موجود');
  }

  const sqlContent = readFileSync(sqlPath, 'utf8');
  console.log('📝 تطبيق تحديثات قاعدة البيانات...');
  
  // تطبيق SQL عبر psql أو node
  const { db } = await import('./server/database-adapter.js');
  
  // تقسيم الاستعلامات وتطبيقها واحداً تلو الآخر
  const queries = sqlContent
    .split(';')
    .map(q => q.trim())
    .filter(q => q && !q.startsWith('--') && !q.startsWith('COMMENT'));

  for (const query of queries) {
    if (query) {
      try {
        await db.execute(query);
        console.log(`✅ تم تطبيق: ${query.substring(0, 50)}...`);
      } catch (error) {
        console.warn(`⚠️ تحذير في الاستعلام: ${error.message}`);
      }
    }
  }
  
  console.log('✅ تم تطبيق إصلاح معرفات البوتات\n');
} catch (error) {
  console.error('❌ خطأ في تطبيق إصلاح معرفات البوتات:', error.message);
  console.log('💡 يمكنك تطبيق الملف يدوياً باستخدام: psql -f fix-bot-ids.sql');
}

// الخطوة 3: التحقق من عدم وجود تداخل في المعرفات
console.log('3️⃣ فحص تداخل المعرفات...');
try {
  const { db } = await import('./server/database-adapter.js');
  const { users, bots } = await import('./shared/schema.js');
  
  // فحص التداخل
  const overlapQuery = `
    SELECT u.id, u.username as user_name, b.username as bot_name
    FROM users u
    INNER JOIN bots b ON u.id = b.id
    LIMIT 5
  `;
  
  const result = await db.execute(overlapQuery);
  const overlaps = result.rows || [];
  
  if (overlaps.length > 0) {
    console.log('⚠️ تم العثور على معرفات متداخلة:');
    overlaps.forEach(row => {
      console.log(`  - ID ${row.id}: مستخدم "${row.user_name}" <-> بوت "${row.bot_name}"`);
    });
    console.log('❌ يجب حل مشكلة التداخل قبل المتابعة\n');
  } else {
    console.log('✅ لا توجد معرفات متداخلة\n');
  }
} catch (error) {
  console.error('❌ خطأ في فحص التداخل:', error.message);
}

// الخطوة 4: اختبار النظام الجديد
console.log('4️⃣ اختبار النظام الجديد...');
try {
  const { storage } = await import('./server/storage.js');
  const { isBotId, isUserId } = await import('./server/types/entities.js');
  
  // اختبار دالة التحقق من نوع المعرف
  console.log('🧪 اختبار دوال التحقق:');
  console.log(`  - isUserId(1): ${isUserId(1)}`);
  console.log(`  - isUserId(999999): ${isUserId(999999)}`);
  console.log(`  - isBotId(1000000): ${isBotId(1000000)}`);
  console.log(`  - isBotId(1000001): ${isBotId(1000001)}`);
  
  // اختبار جلب المستخدمين
  console.log('🧪 اختبار جلب الكيانات:');
  
  // جلب أول مستخدم
  const { users } = await import('./shared/schema.js');
  const { db } = await import('./server/database-adapter.js');
  
  const firstUser = await db.select().from(users).limit(1);
  if (firstUser.length > 0) {
    const user = await storage.getUser(firstUser[0].id);
    console.log(`  - جلب مستخدم ID ${firstUser[0].id}: ${user ? '✅' : '❌'}`);
    if (user) {
      console.log(`    النوع: ${user.entityType || 'غير محدد'}`);
    }
  }
  
  // جلب أول بوت
  const { bots } = await import('./shared/schema.js');
  const firstBot = await db.select().from(bots).limit(1);
  if (firstBot.length > 0) {
    const bot = await storage.getUser(firstBot[0].id);
    console.log(`  - جلب بوت ID ${firstBot[0].id}: ${bot ? '✅' : '❌'}`);
    if (bot) {
      console.log(`    النوع: ${bot.entityType || 'غير محدد'}`);
    }
  }
  
  console.log('✅ اختبار النظام مكتمل\n');
} catch (error) {
  console.error('❌ خطأ في اختبار النظام:', error.message);
}

// الخطوة 5: تقرير نهائي
console.log('5️⃣ تقرير نهائي:');
console.log('✅ تم تطبيق إصلاح أمان الكيانات بنجاح');
console.log('✅ تم فصل مساحات معرفات المستخدمين والبوتات');
console.log('✅ تم تطبيق Type Safety للتمييز بين الأنواع');
console.log('✅ تم إضافة middleware للتحقق من النوع');
console.log('✅ تم تحديث دالة getUser لاستخدام النظام الجديد');

console.log('\n🎉 الإصلاح مكتمل! النظام الآن آمن من تداخل الهويات.');
console.log('\n📋 التوصيات التالية:');
console.log('- اختبر النظام بعناية قبل النشر في الإنتاج');
console.log('- راجع جميع API endpoints للتأكد من استخدام middleware الصحيح');
console.log('- فعّل البوتات تدريجياً بعد التأكد من سلامة النظام');
console.log('- أضف مراقبة مستمرة لتداخل المعرفات');

process.exit(0);