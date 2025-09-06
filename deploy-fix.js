#!/usr/bin/env node

import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL غير محدد في متغيرات البيئة');
  process.exit(1);
}

console.log('🚀 تطبيق إصلاحات قاعدة البيانات للنشر...');

async function applyDeploymentFixes() {
  const sql = postgres(DATABASE_URL);
  
  try {
    console.log('🔍 التحقق من أعمدة chat_lock...');
    
    // Check if chat_lock columns exist
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rooms' 
      AND column_name IN ('chat_lock_all', 'chat_lock_visitors')
    `;
    
    const existingColumns = result.map(r => r.column_name);
    console.log('📊 الأعمدة الموجودة:', existingColumns);
    
    // Add missing columns
    if (!existingColumns.includes('chat_lock_all')) {
      console.log('➕ إضافة عمود chat_lock_all...');
      await sql`ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "chat_lock_all" boolean DEFAULT false`;
    }
    
    if (!existingColumns.includes('chat_lock_visitors')) {
      console.log('➕ إضافة عمود chat_lock_visitors...');
      await sql`ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "chat_lock_visitors" boolean DEFAULT false`;
    }
    
    // Update any NULL values to false
    console.log('🔄 تحديث القيم الفارغة...');
    await sql`UPDATE "rooms" SET "chat_lock_all" = false WHERE "chat_lock_all" IS NULL`;
    await sql`UPDATE "rooms" SET "chat_lock_visitors" = false WHERE "chat_lock_visitors" IS NULL`;
    
    // Add indexes if they don't exist
    console.log('📇 إضافة الفهارس...');
    await sql`CREATE INDEX IF NOT EXISTS "idx_rooms_chat_lock_all" ON "rooms" ("chat_lock_all")`;
    await sql`CREATE INDEX IF NOT EXISTS "idx_rooms_chat_lock_visitors" ON "rooms" ("chat_lock_visitors")`;
    
    // Verify the fix worked
    console.log('✅ التحقق من النتيجة النهائية...');
    const finalResult = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rooms' 
      AND column_name IN ('chat_lock_all', 'chat_lock_visitors')
    `;
    
    console.log('🎯 الأعمدة النهائية:', finalResult.map(r => r.column_name));
    
    if (finalResult.length === 2) {
      console.log('🎉 تم إصلاح قاعدة البيانات بنجاح!');
    } else {
      console.log('⚠️ لم يتم إضافة جميع الأعمدة المطلوبة');
    }
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح قاعدة البيانات:', error);
    // Don't exit with error - let the app try to start anyway
    console.log('⚠️ سيتم محاولة تشغيل التطبيق رغم الخطأ...');
  } finally {
    await sql.end();
  }
}

// Run the deployment fix
applyDeploymentFixes().catch(error => {
  console.error('❌ خطأ في تطبيق الإصلاحات:', error);
  // Don't exit with error to allow deployment to continue
});