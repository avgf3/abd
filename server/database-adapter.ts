import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleSQLite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "../shared/schema";
import { sql } from 'drizzle-orm';
import type { NeonQueryResultHKT } from 'drizzle-orm/neon-serverless';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

// تعريف أنواع قواعد البيانات المدعومة
export type DatabaseType = PgDatabase<NeonQueryResultHKT, typeof schema> | BetterSQLite3Database<typeof schema>;

// واجهة موحدة للعمليات
export interface DatabaseAdapter {
  db: DatabaseType | null;
  type: 'postgresql' | 'sqlite' | 'memory';
  close?: () => void;
}

// دالة لإنشاء جداول SQLite
async function createSQLiteTables(db: BetterSQLite3Database<typeof schema>) {
  try {
    // إنشاء جدول المستخدمين
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_muted BOOLEAN DEFAULT FALSE,
        mute_expiry TIMESTAMP,
        is_banned BOOLEAN DEFAULT FALSE,
        ban_expiry TIMESTAMP,
        is_blocked BOOLEAN DEFAULT FALSE,
        ip_address TEXT,
        device_id TEXT,
        ignored_users TEXT DEFAULT '[]',
        username_color TEXT DEFAULT '#FFFFFF',
        user_theme TEXT DEFAULT 'default'
      )
    `);

    // إنشاء جدول الرسائل
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER REFERENCES users(id),
        receiver_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'text',
        is_private BOOLEAN DEFAULT FALSE,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إنشاء جدول الأصدقاء
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        friend_id INTEGER REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إنشاء جدول الإشعارات
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إنشاء جدول الأجهزة المحجوبة
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS blocked_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL,
        device_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        blocked_at TIMESTAMP NOT NULL,
        blocked_by INTEGER NOT NULL,
        UNIQUE(ip_address, device_id)
      )
    `);

    console.log("✅ تم إنشاء جداول SQLite بنجاح");
    return true;
  } catch (error) {
    console.error("❌ خطأ في إنشاء جداول SQLite:", error);
    return false;
  }
}

// إنشاء محول قاعدة البيانات
export function createDatabaseAdapter(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL;
  
  // محاولة الاتصال بـ PostgreSQL أولاً
  if (databaseUrl && databaseUrl.startsWith('postgresql://')) {
    try {
      console.log("🔄 محاولة الاتصال بـ PostgreSQL...");
      neonConfig.fetchConnectionCache = true;
      
      const pool = new Pool({ connectionString: databaseUrl });
      const db = drizzleNeon({ client: pool, schema });
      
      console.log("✅ تم الاتصال بقاعدة بيانات PostgreSQL");
      
      return {
        db: db as DatabaseType,
        type: 'postgresql',
        close: () => pool.end()
      };
    } catch (error) {
      console.error("❌ فشل في الاتصال بـ PostgreSQL:", error);
      console.log("🔄 التبديل إلى SQLite...");
    }
  }

  // استخدام SQLite كبديل
  try {
    console.log("🔄 إنشاء قاعدة بيانات SQLite...");
    const sqlite = new Database(':memory:');
    const db = drizzleSQLite(sqlite, { schema });
    
    // إنشاء الجداول
    createSQLiteTables(db);
    
    console.log("✅ تم إنشاء قاعدة بيانات SQLite في الذاكرة");
    
    return {
      db: db as DatabaseType,
      type: 'sqlite',
      close: () => sqlite.close()
    };
  } catch (error) {
    console.error("❌ فشل في إنشاء قاعدة بيانات SQLite:", error);
    console.warn("⚠️ استخدام وضع الذاكرة فقط");
    
    return {
      db: null,
      type: 'memory'
    };
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
    
    if (dbType === 'postgresql') {
      await (db as any).execute(sql`SELECT 1`);
    } else if (dbType === 'sqlite') {
      await (db as any).run(sql`SELECT 1`);
    }
    
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
    type: dbType === 'postgresql' ? 'PostgreSQL' : dbType === 'sqlite' ? 'SQLite' : 'Memory',
    url: process.env.DATABASE_URL ? '***محددة***' : 'غير محددة',
    environment: process.env.NODE_ENV || 'development'
  };
}