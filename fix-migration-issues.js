import dotenv from 'dotenv';
dotenv.config();

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

async function fixMigrationIssues() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  console.log('🔧 بدء إصلاح مشاكل الـ migration...');
  
  try {
    const pool = new Pool({ connectionString: databaseUrl });
    const db = drizzle(pool);
    
    // التحقق من وجود الجداول وإصلاحها
    console.log('🔍 التحقق من وجود الجداول...');
    
    // التحقق من جدول room_users
    try {
      const roomUsersCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'room_users'
        );
      `);
      
      if (roomUsersCheck.rows[0].exists) {
        console.log('✅ جدول room_users موجود بالفعل');
      } else {
        console.log('➕ إنشاء جدول room_users...');
        await pool.query(`
          CREATE TABLE "room_users" (
            "id" serial PRIMARY KEY NOT NULL,
            "user_id" integer NOT NULL,
            "room_id" text NOT NULL,
            "joined_at" timestamp DEFAULT now()
          );
        `);
        console.log('✅ تم إنشاء جدول room_users');
      }
    } catch (error) {
      console.log('⚠️ خطأ في التحقق من room_users:', error.message);
    }
    
    // التحقق من جدول level_settings
    try {
      const levelSettingsCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'level_settings'
        );
      `);
      
      if (levelSettingsCheck.rows[0].exists) {
        console.log('✅ جدول level_settings موجود بالفعل');
      } else {
        console.log('➕ إنشاء جدول level_settings...');
        await pool.query(`
          CREATE TABLE "level_settings" (
            "id" serial PRIMARY KEY NOT NULL,
            "level" integer NOT NULL UNIQUE,
            "required_points" integer NOT NULL,
            "title" text NOT NULL,
            "color" text DEFAULT '#FFFFFF',
            "benefits" jsonb,
            "created_at" timestamp DEFAULT now()
          );
        `);
        console.log('✅ تم إنشاء جدول level_settings');
      }
    } catch (error) {
      console.log('⚠️ خطأ في التحقق من level_settings:', error.message);
    }
    
    // التحقق من عمود profile_effect في جدول users
    try {
      const profileEffectCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' 
          AND column_name = 'profile_effect'
        );
      `);
      
      if (profileEffectCheck.rows[0].exists) {
        console.log('✅ عمود profile_effect موجود بالفعل');
      } else {
        console.log('➕ إضافة عمود profile_effect...');
        await pool.query(`
          ALTER TABLE users ADD COLUMN profile_effect TEXT DEFAULT 'none';
        `);
        console.log('✅ تم إضافة عمود profile_effect');
      }
    } catch (error) {
      console.log('⚠️ خطأ في التحقق من profile_effect:', error.message);
    }
    
    // التحقق من أعمدة النقاط في جدول users
    const pointsColumns = ['points', 'level', 'total_points', 'level_progress'];
    
    for (const column of pointsColumns) {
      try {
        const columnCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = '${column}'
          );
        `);
        
        if (columnCheck.rows[0].exists) {
          console.log(`✅ عمود ${column} موجود بالفعل`);
        } else {
          console.log(`➕ إضافة عمود ${column}...`);
          const defaultValue = column === 'level' ? '1' : '0';
          await pool.query(`
            ALTER TABLE users ADD COLUMN ${column} INTEGER DEFAULT ${defaultValue};
          `);
          console.log(`✅ تم إضافة عمود ${column}`);
        }
      } catch (error) {
        console.log(`⚠️ خطأ في التحقق من ${column}:`, error.message);
      }
    }
    
    console.log('✅ تم إكمال إصلاح مشاكل الـ migration بنجاح!');
    
    await pool.end();
  } catch (error) {
    console.error('❌ فشل في إصلاح مشاكل الـ migration:', error);
    process.exit(1);
  }
}

fixMigrationIssues().catch(console.error);