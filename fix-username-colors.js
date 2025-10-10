#!/usr/bin/env node

/**
 * إصلاح سريع لإضافة أعمدة لون الاسم في جداول الحوائط والقصص
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function fixUsernameColors() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL غير محدد');
    process.exit(1);
  }

  console.log('🎨 بدء إصلاح أعمدة لون الاسم...');
  
  const pool = new Pool({ 
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    console.log('✅ تم الاتصال بقاعدة البيانات');

    // فحص وإضافة أعمدة wall_posts
    console.log('\n📝 فحص جدول wall_posts...');
    
    const wallColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'wall_posts' 
      AND column_name IN ('username_color', 'username_gradient', 'username_effect')
    `);
    
    const existingWallColumns = wallColumns.rows.map(r => r.column_name);
    
    if (!existingWallColumns.includes('username_color')) {
      console.log('➕ إضافة عمود username_color في wall_posts...');
      await client.query(`
        ALTER TABLE "wall_posts" 
        ADD COLUMN IF NOT EXISTS "username_color" TEXT DEFAULT '#4A90E2'
      `);
    } else {
      console.log('✅ عمود username_color موجود في wall_posts');
    }
    
    if (!existingWallColumns.includes('username_gradient')) {
      console.log('➕ إضافة عمود username_gradient في wall_posts...');
      await client.query(`
        ALTER TABLE "wall_posts" 
        ADD COLUMN IF NOT EXISTS "username_gradient" TEXT
      `);
    } else {
      console.log('✅ عمود username_gradient موجود في wall_posts');
    }
    
    if (!existingWallColumns.includes('username_effect')) {
      console.log('➕ إضافة عمود username_effect في wall_posts...');
      await client.query(`
        ALTER TABLE "wall_posts" 
        ADD COLUMN IF NOT EXISTS "username_effect" TEXT
      `);
    } else {
      console.log('✅ عمود username_effect موجود في wall_posts');
    }

    // فحص وإضافة أعمدة stories
    console.log('\n📖 فحص جدول stories...');
    
    const storyColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stories' 
      AND column_name IN ('username', 'username_color', 'username_gradient', 'username_effect')
    `);
    
    const existingStoryColumns = storyColumns.rows.map(r => r.column_name);
    
    if (!existingStoryColumns.includes('username')) {
      console.log('➕ إضافة عمود username في stories...');
      await client.query(`
        ALTER TABLE "stories" 
        ADD COLUMN IF NOT EXISTS "username" TEXT
      `);
    } else {
      console.log('✅ عمود username موجود في stories');
    }
    
    if (!existingStoryColumns.includes('username_color')) {
      console.log('➕ إضافة عمود username_color في stories...');
      await client.query(`
        ALTER TABLE "stories" 
        ADD COLUMN IF NOT EXISTS "username_color" TEXT DEFAULT '#4A90E2'
      `);
    } else {
      console.log('✅ عمود username_color موجود في stories');
    }
    
    if (!existingStoryColumns.includes('username_gradient')) {
      console.log('➕ إضافة عمود username_gradient في stories...');
      await client.query(`
        ALTER TABLE "stories" 
        ADD COLUMN IF NOT EXISTS "username_gradient" TEXT
      `);
    } else {
      console.log('✅ عمود username_gradient موجود في stories');
    }
    
    if (!existingStoryColumns.includes('username_effect')) {
      console.log('➕ إضافة عمود username_effect في stories...');
      await client.query(`
        ALTER TABLE "stories" 
        ADD COLUMN IF NOT EXISTS "username_effect" TEXT
      `);
    } else {
      console.log('✅ عمود username_effect موجود في stories');
    }

    // تحديث القيم الفارغة
    console.log('\n🔄 تحديث القيم الافتراضية...');
    
    const wallUpdateResult = await client.query(`
      UPDATE "wall_posts" 
      SET "username_color" = '#4A90E2' 
      WHERE "username_color" IS NULL OR "username_color" = ''
    `);
    console.log(`📝 تم تحديث ${wallUpdateResult.rowCount} سجل في wall_posts`);

    const storyUpdateResult = await client.query(`
      UPDATE "stories" 
      SET "username_color" = '#4A90E2' 
      WHERE "username_color" IS NULL OR "username_color" = ''
    `);
    console.log(`📖 تم تحديث ${storyUpdateResult.rowCount} سجل في stories`);

    // إنشاء فهارس للأداء
    console.log('\n📊 إنشاء فهارس الأداء...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS "idx_wall_posts_username_color" 
      ON "wall_posts" ("username_color")
    `);
    console.log('✅ تم إنشاء فهرس wall_posts username_color');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS "idx_stories_username_color" 
      ON "stories" ("username_color")
    `);
    console.log('✅ تم إنشاء فهرس stories username_color');

    // اختبار الاستعلام
    console.log('\n🧪 اختبار الاستعلامات...');
    
    try {
      const testWallQuery = await client.query(`
        SELECT "id", "username_color", "username_gradient", "username_effect" 
        FROM "wall_posts" 
        LIMIT 1
      `);
      console.log('✅ استعلام wall_posts يعمل بنجاح');
    } catch (error) {
      console.error('❌ خطأ في استعلام wall_posts:', error.message);
    }
    
    try {
      const testStoryQuery = await client.query(`
        SELECT "id", "username", "username_color", "username_gradient", "username_effect" 
        FROM "stories" 
        LIMIT 1
      `);
      console.log('✅ استعلام stories يعمل بنجاح');
    } catch (error) {
      console.error('❌ خطأ في استعلام stories:', error.message);
    }

    client.release();
    console.log('\n🎉 تم إصلاح أعمدة لون الاسم بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في الإصلاح:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// تشغيل الإصلاح
fixUsernameColors().catch(console.error);