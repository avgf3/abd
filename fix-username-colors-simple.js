/**
 * إصلاح سريع لإضافة أعمدة لون الاسم - باستخدام postgres.js
 */

import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

async function fixUsernameColors() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL غير محدد');
    process.exit(1);
  }

  console.log('🎨 بدء إصلاح أعمدة لون الاسم...');
  
  const sql = postgres(databaseUrl, {
    ssl: process.env.NODE_ENV === 'production' ? 'require' : undefined,
    max: 1
  });

  try {
    console.log('✅ تم الاتصال بقاعدة البيانات');

    // فحص وإضافة أعمدة wall_posts
    console.log('\n📝 فحص جدول wall_posts...');
    
    const wallColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'wall_posts' 
      AND column_name IN ('username_color', 'username_gradient', 'username_effect')
    `;
    
    const existingWallColumns = wallColumns.map(r => r.column_name);
    console.log('الأعمدة الموجودة في wall_posts:', existingWallColumns);
    
    if (!existingWallColumns.includes('username_color')) {
      console.log('➕ إضافة عمود username_color في wall_posts...');
      await sql.unsafe(`
        ALTER TABLE "wall_posts" 
        ADD COLUMN "username_color" TEXT DEFAULT '#4A90E2'
      `);
      console.log('✅ تم إضافة username_color');
    } else {
      console.log('✅ عمود username_color موجود في wall_posts');
    }
    
    if (!existingWallColumns.includes('username_gradient')) {
      console.log('➕ إضافة عمود username_gradient في wall_posts...');
      await sql.unsafe(`
        ALTER TABLE "wall_posts" 
        ADD COLUMN "username_gradient" TEXT
      `);
      console.log('✅ تم إضافة username_gradient');
    } else {
      console.log('✅ عمود username_gradient موجود في wall_posts');
    }
    
    if (!existingWallColumns.includes('username_effect')) {
      console.log('➕ إضافة عمود username_effect في wall_posts...');
      await sql.unsafe(`
        ALTER TABLE "wall_posts" 
        ADD COLUMN "username_effect" TEXT
      `);
      console.log('✅ تم إضافة username_effect');
    } else {
      console.log('✅ عمود username_effect موجود في wall_posts');
    }

    // فحص وإضافة أعمدة stories
    console.log('\n📖 فحص جدول stories...');
    
    const storyColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stories' 
      AND column_name IN ('username', 'username_color', 'username_gradient', 'username_effect')
    `;
    
    const existingStoryColumns = storyColumns.map(r => r.column_name);
    console.log('الأعمدة الموجودة في stories:', existingStoryColumns);
    
    if (!existingStoryColumns.includes('username')) {
      console.log('➕ إضافة عمود username في stories...');
      await sql.unsafe(`
        ALTER TABLE "stories" 
        ADD COLUMN "username" TEXT
      `);
      console.log('✅ تم إضافة username');
    } else {
      console.log('✅ عمود username موجود في stories');
    }
    
    if (!existingStoryColumns.includes('username_color')) {
      console.log('➕ إضافة عمود username_color في stories...');
      await sql.unsafe(`
        ALTER TABLE "stories" 
        ADD COLUMN "username_color" TEXT DEFAULT '#4A90E2'
      `);
      console.log('✅ تم إضافة username_color');
    } else {
      console.log('✅ عمود username_color موجود في stories');
    }
    
    if (!existingStoryColumns.includes('username_gradient')) {
      console.log('➕ إضافة عمود username_gradient في stories...');
      await sql.unsafe(`
        ALTER TABLE "stories" 
        ADD COLUMN "username_gradient" TEXT
      `);
      console.log('✅ تم إضافة username_gradient');
    } else {
      console.log('✅ عمود username_gradient موجود في stories');
    }
    
    if (!existingStoryColumns.includes('username_effect')) {
      console.log('➕ إضافة عمود username_effect في stories...');
      await sql.unsafe(`
        ALTER TABLE "stories" 
        ADD COLUMN "username_effect" TEXT
      `);
      console.log('✅ تم إضافة username_effect');
    } else {
      console.log('✅ عمود username_effect موجود في stories');
    }

    // تحديث القيم الفارغة
    console.log('\n🔄 تحديث القيم الافتراضية...');
    
    const wallUpdateResult = await sql`
      UPDATE "wall_posts" 
      SET "username_color" = '#4A90E2' 
      WHERE "username_color" IS NULL OR "username_color" = ''
    `;
    console.log(`📝 تم تحديث ${wallUpdateResult.count} سجل في wall_posts`);

    const storyUpdateResult = await sql`
      UPDATE "stories" 
      SET "username_color" = '#4A90E2' 
      WHERE "username_color" IS NULL OR "username_color" = ''
    `;
    console.log(`📖 تم تحديث ${storyUpdateResult.count} سجل في stories`);

    // اختبار الاستعلامات
    console.log('\n🧪 اختبار الاستعلامات...');
    
    try {
      const testWallQuery = await sql`
        SELECT "id", "username_color", "username_gradient", "username_effect" 
        FROM "wall_posts" 
        LIMIT 1
      `;
      console.log('✅ استعلام wall_posts يعمل بنجاح');
      if (testWallQuery.length > 0) {
        console.log('عينة من البيانات:', testWallQuery[0]);
      }
    } catch (error) {
      console.error('❌ خطأ في استعلام wall_posts:', error.message);
    }
    
    try {
      const testStoryQuery = await sql`
        SELECT "id", "username", "username_color", "username_gradient", "username_effect" 
        FROM "stories" 
        LIMIT 1
      `;
      console.log('✅ استعلام stories يعمل بنجاح');
      if (testStoryQuery.length > 0) {
        console.log('عينة من البيانات:', testStoryQuery[0]);
      }
    } catch (error) {
      console.error('❌ خطأ في استعلام stories:', error.message);
    }

    console.log('\n🎉 تم إصلاح أعمدة لون الاسم بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في الإصلاح:', error.message);
    console.error('تفاصيل الخطأ:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// تشغيل الإصلاح
fixUsernameColors().catch(console.error);