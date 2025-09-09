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
    
    // Ensure users.dm_privacy exists and is valid
    console.log('🔍 التحقق من عمود dm_privacy في users...');
    const dmCol = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'dm_privacy'
    `;
    
    if (dmCol.length === 0) {
      console.log('➕ إضافة عمود dm_privacy...');
      // Add column first (without constraints) to avoid rewrite issues on some providers
      await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dm_privacy" TEXT`;
    }
    
    console.log('🔄 ضبط القيم الافتراضية والصحيحة لـ dm_privacy...');
    await sql`UPDATE "users" SET "dm_privacy" = 'all' WHERE "dm_privacy" IS NULL OR "dm_privacy" NOT IN ('all','friends','none')`;
    await sql`ALTER TABLE "users" ALTER COLUMN "dm_privacy" SET DEFAULT 'all'`;
    await sql`ALTER TABLE "users" ALTER COLUMN "dm_privacy" SET NOT NULL`;

    // Ensure user preference columns exist and are defaulted
    console.log('🔍 التحقق من أعمدة تفضيلات المستخدم العامة في users...');
    await sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS show_points_to_others BOOLEAN`;
    await sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS show_system_messages BOOLEAN`;
    await sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS global_sound_enabled BOOLEAN`;

    console.log('🔄 ضبط القيم الافتراضية لأعمدة التفضيلات...');
    await sql`UPDATE users SET show_points_to_others = COALESCE(show_points_to_others, TRUE)`;
    await sql`UPDATE users SET show_system_messages = COALESCE(show_system_messages, TRUE)`;
    await sql`UPDATE users SET global_sound_enabled = COALESCE(global_sound_enabled, TRUE)`;

    await sql`ALTER TABLE IF EXISTS users ALTER COLUMN show_points_to_others SET DEFAULT TRUE`;
    await sql`ALTER TABLE IF EXISTS users ALTER COLUMN show_system_messages SET DEFAULT TRUE`;
    await sql`ALTER TABLE IF EXISTS users ALTER COLUMN global_sound_enabled SET DEFAULT TRUE`;

    await sql`ALTER TABLE IF EXISTS users ALTER COLUMN show_points_to_others SET NOT NULL`;
    await sql`ALTER TABLE IF EXISTS users ALTER COLUMN show_system_messages SET NOT NULL`;
    await sql`ALTER TABLE IF EXISTS users ALTER COLUMN global_sound_enabled SET NOT NULL`;
    
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