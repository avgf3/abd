#!/usr/bin/env node

/**
 * تطبيق migration لإضافة حقل current_room لجدول users
 */

import 'dotenv/config';
import postgres from 'postgres';

async function applyCurrentRoomMigration() {
  try {
    console.log('🔄 بدء تطبيق migration لإضافة حقل current_room...');
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL غير محدد');
    }

    console.log('🔗 الاتصال بقاعدة البيانات...');
    const sql = postgres(databaseUrl, {
      ssl: 'require',
      max: 1,
      idle_timeout: 30,
      connect_timeout: 30,
    });

    // التحقق من وجود العمود أولاً
    console.log('🔍 التحقق من وجود عمود current_room...');
    const checkColumn = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'current_room'
    `;

    if (checkColumn.length > 0) {
      console.log('✅ عمود current_room موجود بالفعل');
      await sql.end();
      return;
    }

    console.log('📝 إضافة عمود current_room...');
    
    // إضافة العمود
    await sql`ALTER TABLE users ADD COLUMN current_room TEXT DEFAULT 'general'`;
    console.log('✅ تم إضافة العمود');

    // تحديث المستخدمين الموجودين
    console.log('🔄 تحديث المستخدمين الموجودين...');
    const updateResult = await sql`UPDATE users SET current_room = 'general' WHERE current_room IS NULL`;
    console.log(`✅ تم تحديث ${updateResult.count} مستخدم`);

    // إضافة فهرس
    console.log('📊 إضافة فهرس...');
    await sql`CREATE INDEX IF NOT EXISTS idx_users_current_room ON users(current_room)`;
    console.log('✅ تم إضافة الفهرس');

    // اختبار العمود
    console.log('🧪 اختبار العمود...');
    const testQuery = await sql`SELECT id, username, current_room FROM users LIMIT 3`;
    console.log('✅ اختبار العمود نجح:');
    testQuery.forEach(user => {
      console.log(`   - ${user.username}: ${user.current_room}`);
    });

    await sql.end();
    console.log('🎉 تم تطبيق migration بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في تطبيق migration:', error);
    process.exit(1);
  }
}

// تشغيل migration
applyCurrentRoomMigration().then(() => {
  console.log('✅ انتهى تطبيق migration');
  process.exit(0);
}).catch((error) => {
  console.error('💥 فشل في تطبيق migration:', error);
  process.exit(1);
});