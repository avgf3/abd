#!/usr/bin/env node

/**
 * إصلاح مشكلة current_room migration
 */

import 'dotenv/config';
import postgres from 'postgres';

async function fixCurrentRoomMigration() {
  try {
    console.log('🔄 بدء إصلاح migration current_room...');
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL غير محدد');
    }

    console.log('🔗 الاتصال بقاعدة البيانات...');
    const sql = postgres(databaseUrl, {
      ssl: 'require',
      max: 1,
      idle_timeout: 20,
      connect_timeout: 20,
    });

    // التحقق من وجود العمود
    console.log('🔍 التحقق من وجود عمود current_room...');
    const checkColumn = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'current_room'
    `;

    if (checkColumn.length > 0) {
      console.log('✅ عمود current_room موجود بالفعل');
    } else {
      console.log('📝 إضافة عمود current_room...');
      
      // إضافة العمود
      await sql`ALTER TABLE users ADD COLUMN current_room TEXT DEFAULT 'general'`;
      console.log('✅ تم إضافة العمود');
      
      // تحديث المستخدمين الموجودين
      console.log('🔄 تحديث المستخدمين الموجودين...');
      await sql`UPDATE users SET current_room = 'general' WHERE current_room IS NULL`;
      console.log('✅ تم تحديث المستخدمين');
      
      // إضافة فهرس
      console.log('📊 إضافة فهرس...');
      await sql`CREATE INDEX IF NOT EXISTS idx_users_current_room ON users(current_room)`;
      console.log('✅ تم إضافة الفهرس');
    }

    // اختبار العمود
    console.log('🧪 اختبار العمود...');
    const testQuery = await sql`SELECT id, username, current_room FROM users LIMIT 1`;
    console.log('✅ اختبار العمود نجح:', testQuery[0]);

    await sql.end();
    console.log('🎉 تم إصلاح migration بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح migration:', error);
    process.exit(1);
  }
}

// تشغيل الإصلاح
fixCurrentRoomMigration().then(() => {
  console.log('✅ انتهى الإصلاح');
  process.exit(0);
}).catch((error) => {
  console.error('💥 فشل في الإصلاح:', error);
  process.exit(1);
});