import dotenv from 'dotenv';
import postgres from 'postgres';
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config();

async function testEverything() {
  console.log('🔍 بدء الفحص الشامل للنظام...\n');

  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : 'require',
  });

  let allGood = true;

  try {
    // 1. فحص الجداول المهمة
    console.log('📊 فحص الجداول في قاعدة البيانات:');
    console.log('=====================================');

    const tables = [
      'users',
      'vip_users',
      'rooms',
      'messages',
      'points_history',
      'level_settings',
      'site_settings',
      'message_reactions',
      'wall_posts',
      'wall_reactions',
      'room_members',
    ];

    for (const table of tables) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
        console.log(`✅ ${table}: ${result[0].count} سجل`);
      } catch (error) {
        console.log(`❌ ${table}: غير موجود أو به خطأ`);
        allGood = false;
      }
    }

    // 2. فحص VIP Users
    console.log('\n👑 فحص نظام VIP:');
    console.log('=====================================');
    try {
      const vipUsers = await sql`
        SELECT u.id, u.username
        FROM users u
        JOIN vip_users v ON v.user_id = u.id
        LIMIT 5
      `;
      console.log(`✅ عدد VIP Users: ${vipUsers.length}`);
      if (vipUsers.length > 0) {
        console.log('أمثلة:', vipUsers.map((u) => u.username).join(', '));
      }
    } catch (error) {
      console.log('❌ خطأ في جدول vip_users:', error.message);
      allGood = false;
    }

    // 3. فحص الصور
    console.log('\n🖼️ فحص الصور:');
    console.log('=====================================');

    const missingImages = await sql`
      SELECT COUNT(*) as count
      FROM users
      WHERE profile_image IS NOT NULL
      AND profile_image != '/default_avatar.svg'
      AND profile_image NOT LIKE 'data:%'
    `;

    console.log(`✅ عدد المستخدمين مع صور مخصصة: ${missingImages[0].count}`);

    // 4. فحص المجلدات
    console.log('\n📁 فحص مجلدات التحميل:');
    console.log('=====================================');

    const uploadDirs = [
      'client/public/uploads/avatars',
      'client/public/uploads/banners',
      'client/public/uploads/profiles',
      'client/public/uploads/wall',
    ];

    for (const dir of uploadDirs) {
      try {
        await fs.access(dir);
        const files = await fs.readdir(dir);
        console.log(`✅ ${dir}: موجود (${files.length - 1} ملف)`); // -1 for .gitkeep
      } catch {
        console.log(`❌ ${dir}: غير موجود`);
        allGood = false;
      }
    }

    // 5. فحص الملفات الأساسية
    console.log('\n📄 فحص الملفات الأساسية:');
    console.log('=====================================');

    const essentialFiles = [
      'client/public/default_avatar.svg',
      'shared/schema.ts',
      'migrations/0008_fix_database_complete.sql',
      'server/services/databaseService.ts',
      'client/src/components/ui/RichestModal.tsx',
    ];

    for (const file of essentialFiles) {
      try {
        await fs.access(file);
        console.log(`✅ ${file}: موجود`);
      } catch {
        console.log(`❌ ${file}: غير موجود`);
        allGood = false;
      }
    }

    // 6. فحص نظام المستويات
    console.log('\n🎮 فحص نظام المستويات:');
    console.log('=====================================');

    const levelsFile = await fs.readFile('shared/points-system.ts', 'utf-8');
    const levelCount = (levelsFile.match(/level:/g) || []).length;
    console.log(`✅ عدد المستويات المعرفة في الكود: ${levelCount}`);

    // 7. النتيجة النهائية
    console.log('\n' + '='.repeat(50));
    if (allGood) {
      console.log('✅ ✅ ✅ كل شيء يعمل بشكل ممتاز! ✅ ✅ ✅');
    } else {
      console.log('⚠️ هناك بعض المشاكل التي تحتاج إلى إصلاح');
    }
    console.log('='.repeat(50));
  } catch (error) {
    console.error('❌ خطأ في الفحص:', error);
  } finally {
    await sql.end();
  }
}

testEverything().catch(console.error);
