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
  const sql = postgres(DATABASE_URL, {
    idle_timeout: 60, // زيادة timeout إلى 60 ثانية
    connect_timeout: 60, // زيادة timeout الاتصال إلى 60 ثانية
    max_lifetime: 60 * 30, // إعادة تدوير الاتصالات كل 30 دقيقة
    statement_timeout: 120000, // 2 دقيقة لكل استعلام
  });
  
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
    
    // Update any NULL values to false with retry mechanism
    console.log('🔄 تحديث القيم الفارغة...');
    const updateWithRetry = async (query, description) => {
      let attempts = 0;
      const maxAttempts = 3;
      while (attempts < maxAttempts) {
        try {
          await sql.unsafe(query);
          console.log(`✅ ${description} - نجح`);
          break;
        } catch (error) {
          attempts++;
          if (attempts < maxAttempts) {
            console.log(`⚠️ ${description} - محاولة ${attempts}/${maxAttempts}: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
          } else {
            console.error(`❌ ${description} - فشل بعد ${maxAttempts} محاولات:`, error.message);
            throw error;
          }
        }
      }
    };
    
    await updateWithRetry('UPDATE "rooms" SET "chat_lock_all" = false WHERE "chat_lock_all" IS NULL', 'تحديث chat_lock_all');
    await updateWithRetry('UPDATE "rooms" SET "chat_lock_visitors" = false WHERE "chat_lock_visitors" IS NULL', 'تحديث chat_lock_visitors');
    
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
    
    // Ensure wall_posts has user_gender and user_level
    console.log('🔍 التحقق من أعمدة wall_posts للجنس والمستوى...');
    const wallCols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'wall_posts' 
      AND column_name IN ('user_gender', 'user_level')
    `;
    const wallExisting = wallCols.map(r => r.column_name);

    if (!wallExisting.includes('user_gender')) {
      console.log('➕ إضافة عمود user_gender إلى wall_posts...');
      await sql`ALTER TABLE "wall_posts" ADD COLUMN IF NOT EXISTS "user_gender" TEXT`;
    }

    if (!wallExisting.includes('user_level')) {
      console.log('➕ إضافة عمود user_level إلى wall_posts...');
      await sql`ALTER TABLE "wall_posts" ADD COLUMN IF NOT EXISTS "user_level" INTEGER DEFAULT 1`;
    }

    // Backfill values from users table
    console.log('🔄 تحديث قيم user_gender و user_level من users...');
    await sql`
      UPDATE "wall_posts" AS wp
      SET "user_gender" = u.gender
      FROM "users" AS u
      WHERE wp.user_id = u.id AND (wp.user_gender IS NULL OR wp.user_gender = '')
    `;
    await sql`
      UPDATE "wall_posts" AS wp
      SET "user_level" = COALESCE(u.level, 1)
      FROM "users" AS u
      WHERE wp.user_id = u.id AND (wp.user_level IS NULL OR wp.user_level = 0)
    `;

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

    // Log wall_posts verification
    const wpFinal = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'wall_posts' 
      AND column_name IN ('user_gender', 'user_level')
    `;
    console.log('🧱 أعمدة wall_posts:', wpFinal.map(r => r.column_name));

    // Seed a welcome post if wall_posts is empty
    try {
      const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM "wall_posts"`;
      if ((count ?? 0) === 0) {
        console.log('🧪 لا توجد منشورات في wall_posts، سيتم إضافة منشور ترحيبي...');
        const userRows = await sql`SELECT id, username, role, gender, level, profile_image, username_color FROM "users" ORDER BY id ASC LIMIT 1`;
        const u = userRows[0] || { id: 0, username: 'System', role: 'owner', gender: 'غير محدد', level: 1, profile_image: null, username_color: '#FFFFFF' };
        await sql`
          INSERT INTO "wall_posts"
            (user_id, username, user_role, user_gender, user_level, content, type, timestamp, user_profile_image, username_color)
          VALUES
            (${u.id}, ${u.username}, ${u.role || 'owner'}, ${u.gender || 'غير محدد'}, ${u.level || 1}, 'مرحباً بكم في الحائط! 🎉', 'public', NOW(), ${u.profile_image}, ${u.username_color || '#FFFFFF'})
        `;
        console.log('✅ تم إضافة منشور ترحيبي إلى wall_posts');
      }
    } catch (seedErr) {
      console.warn('⚠️ تعذر إضافة منشور ترحيبي (غير حرج):', seedErr?.message || seedErr);
    }
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح قاعدة البيانات:', error);
    console.log('⚠️ سيتم محاولة تشغيل التطبيق رغم الخطأ...');
    // إرجاع false بدلاً من رمي الخطأ
    return false;
  } finally {
    try {
      await sql.end();
    } catch (endError) {
      console.warn('⚠️ خطأ في إغلاق الاتصال:', endError.message);
    }
  }
}

// Run the deployment fix
applyDeploymentFixes().catch(error => {
  console.error('❌ خطأ في تطبيق الإصلاحات:', error);
  // Don't exit with error to allow deployment to continue
});