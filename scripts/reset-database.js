#!/usr/bin/env node

/**
 * سكريبت إعادة تعيين قاعدة البيانات
 * يحذف جميع البيانات ويعيد تهيئة قاعدة البيانات
 *
 * الاستخدام: node scripts/reset-database.js
 *
 * تحذير: هذا السكريبت يحذف جميع البيانات نهائياً!
 */

import postgres from 'postgres';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function askConfirmation() {
  return new Promise((resolve) => {
    rl.question('⚠️  تحذير: سيتم حذف جميع البيانات! هل أنت متأكد؟ (yes/no): ', (answer) => {
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'نعم');
    });
  });
}

async function resetDatabase() {
  console.log('🔄 بدء عملية إعادة تعيين قاعدة البيانات...\n');

  // قراءة رابط قاعدة البيانات من متغيرات البيئة
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL غير محدد. يرجى ضبطه قبل التشغيل.');
    process.exit(1);
  }

  // السؤال عن التأكيد في بيئة الإنتاج
  if (process.env.NODE_ENV === 'production') {
    const confirmed = await askConfirmation();
    if (!confirmed) {
      console.log('❌ تم إلغاء العملية');
      rl.close();
      process.exit(0);
    }
  }

  const client = postgres(databaseUrl, {
    ssl: process.env.NODE_ENV === 'production' ? 'require' : undefined,
  });

  try {
    console.log('🗑️ حذف جميع البيانات من الجداول...');

    // حذف البيانات بالترتيب الصحيح لتجنب مشاكل المفاتيح الأجنبية
    await client`TRUNCATE TABLE 
      message_reactions,
      points_history,
      vip_users,
      blocked_devices,
      notifications,
      friends,
      messages,
      room_members,
      rooms,
      users 
      RESTART IDENTITY CASCADE`;

    console.log('✅ تم حذف جميع البيانات بنجاح');

    console.log('\n' + '='.repeat(50));
    console.log('🎉 تمت إعادة تعيين قاعدة البيانات بنجاح!');
    console.log('📝 ملاحظة: أول مستخدم يسجل في الموقع سيصبح المالك تلقائياً');
    console.log('='.repeat(50) + '\n');
  } catch (error) {
    console.error('❌ خطأ في إعادة تعيين قاعدة البيانات:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    rl.close();
  }
}

// تشغيل السكريبت
resetDatabase();
