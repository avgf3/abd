import dotenv from 'dotenv';
dotenv.config();

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import * as pgSchema from "../shared/schema";
import type { NeonQueryResultHKT } from 'drizzle-orm/neon-serverless';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// تعريف نوع قاعدة البيانات - PostgreSQL فقط
export type DatabaseType = PgDatabase<NeonQueryResultHKT, typeof pgSchema>;

// واجهة موحدة للعمليات
export interface DatabaseAdapter {
  db: DatabaseType | null;
  type: 'postgresql';
  close?: () => void;
}

// إنشاء محول قاعدة البيانات - PostgreSQL فقط
export function createDatabaseAdapter(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL;
  
  // التحقق من وجود DATABASE_URL
  if (!databaseUrl) {
    throw new Error("❌ DATABASE_URL غير محدد! يجب إضافة رابط PostgreSQL في ملف .env");
  }
  
  // التحقق من أن الرابط هو PostgreSQL
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    throw new Error("❌ DATABASE_URL يجب أن يكون رابط PostgreSQL صحيح");
  }
  
  try {
    // إعداد Neon للإنتاج
    neonConfig.fetchConnectionCache = true;
    
    const pool = new Pool({ connectionString: databaseUrl });
    const db = drizzleNeon({ client: pool, schema: pgSchema });
    
    return {
      db: db as DatabaseType,
      type: 'postgresql',
      close: () => pool.end()
    };
  } catch (error) {
    console.error("❌ فشل في الاتصال بـ PostgreSQL على Supabase:", error);
    throw new Error(`فشل الاتصال بـ Supabase: ${error}`);
  }
}

// إنشاء المحول الافتراضي
export const dbAdapter = createDatabaseAdapter();
export const db = dbAdapter.db;
export const dbType = dbAdapter.type;

// دالة للتحقق من حالة قاعدة البيانات
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (!db) return false;
    
    // اختبار PostgreSQL
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error("❌ خطأ في فحص صحة قاعدة البيانات:", error);
    return false;
  }
}

// دالة للحصول على حالة قاعدة البيانات
export function getDatabaseStatus() {
  return {
    connected: !!db,
    type: 'PostgreSQL/Supabase',
    url: process.env.DATABASE_URL ? '***محددة***' : 'غير محددة',
    environment: process.env.NODE_ENV || 'development'
  };
}

// دالة لإنشاء جداول قاعدة البيانات إذا لم تكن موجودة
export async function ensureTablesExist(): Promise<void> {
  try {
    if (!db) {
      throw new Error("قاعدة البيانات غير متصلة");
    }

    // إنشاء الجداول الأساسية
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT,
        user_type TEXT NOT NULL DEFAULT 'guest',
        role TEXT NOT NULL DEFAULT 'guest',
        profile_image TEXT,
        profile_banner TEXT,
        profile_background_color TEXT DEFAULT '#3c0d0d',
        status TEXT,
        gender TEXT,
        age INTEGER,
        country TEXT,
        relation TEXT,
        bio TEXT,
        is_online BOOLEAN DEFAULT FALSE,
        is_hidden BOOLEAN DEFAULT FALSE,
        last_seen TIMESTAMP,
        join_date TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        is_muted BOOLEAN DEFAULT FALSE,
        mute_expiry TIMESTAMP,
        is_banned BOOLEAN DEFAULT FALSE,
        ban_expiry TIMESTAMP,
        is_blocked BOOLEAN DEFAULT FALSE,
        ip_address VARCHAR(45),
        device_id VARCHAR(100),
        ignored_users TEXT DEFAULT '[]',
        username_color TEXT DEFAULT '#FFFFFF',
        user_theme TEXT DEFAULT 'default',
        profile_effect TEXT DEFAULT 'none',
        points INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        total_points INTEGER DEFAULT 0,
        level_progress INTEGER DEFAULT 0
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id),
        receiver_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'text',
        is_private BOOLEAN DEFAULT FALSE,
        room_id TEXT DEFAULT 'general',
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS friends (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        friend_id INTEGER REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS blocked_devices (
        id SERIAL PRIMARY KEY,
        ip_address TEXT NOT NULL,
        device_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        blocked_at TIMESTAMP NOT NULL,
        blocked_by INTEGER NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS points_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS level_settings (
        id SERIAL PRIMARY KEY,
        level INTEGER NOT NULL UNIQUE,
        required_points INTEGER NOT NULL,
        title TEXT NOT NULL,
        color TEXT DEFAULT '#FFFFFF'
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'public',
        owner_id INTEGER REFERENCES users(id),
        max_users INTEGER,
        current_users INTEGER DEFAULT 0,
        is_password_protected BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        settings JSONB
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS room_users (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        room_id TEXT NOT NULL REFERENCES rooms(id),
        permission TEXT NOT NULL DEFAULT 'view',
        joined_at TIMESTAMP DEFAULT NOW(),
        is_muted BOOLEAN DEFAULT FALSE
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS wall_posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        image_url TEXT,
        type TEXT NOT NULL DEFAULT 'public',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS wall_reactions (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES wall_posts(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ تم إنشاء جميع الجداول بنجاح');
  } catch (error) {
    console.error('❌ خطأ في إنشاء الجداول:', error);
    throw error;
  }
}

// دالة لتنظيف البيانات القديمة
export async function cleanupOldData(): Promise<void> {
  try {
    if (!db) return;

    // تنظيف الرسائل القديمة (أكثر من 30 يوم)
    await db.execute(sql`
      DELETE FROM messages 
      WHERE timestamp < NOW() - INTERVAL '30 days'
    `);

    // تنظيف الإشعارات المقروءة القديمة (أكثر من 7 أيام)
    await db.execute(sql`
      DELETE FROM notifications 
      WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '7 days'
    `);

    // تنظيف المستخدمين غير المتصلين منذ أكثر من 90 يوم
    await db.execute(sql`
      UPDATE users 
      SET is_online = FALSE 
      WHERE last_seen < NOW() - INTERVAL '90 days'
    `);

    console.log('✅ تم تنظيف البيانات القديمة بنجاح');
  } catch (error) {
    console.error('❌ خطأ في تنظيف البيانات القديمة:', error);
  }
}