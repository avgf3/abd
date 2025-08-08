import dotenv from 'dotenv';
dotenv.config();

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleSQLite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as pgSchema from "../shared/schema";
import * as sqliteSchema from "../shared/sqlite-schema";
import type { NeonQueryResultHKT } from 'drizzle-orm/neon-serverless';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate as migratePostgres } from 'drizzle-orm/neon-serverless/migrator';
import { migrate as migrateSQLite } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'fs';
import path from 'path';

// تعريف أنواع قواعد البيانات
export type PostgreSQLDatabase = PgDatabase<NeonQueryResultHKT, typeof pgSchema>;
export type SQLiteDatabase = BetterSQLite3Database<typeof sqliteSchema>;
export type DatabaseType = PostgreSQLDatabase | SQLiteDatabase | null;

// واجهة موحدة للعمليات
export interface DatabaseAdapter {
  db: DatabaseType;
  type: 'postgresql' | 'sqlite' | 'disabled';
  close?: () => void;
  migrate?: () => Promise<void>;
}

// إنشاء محول SQLite
function createSQLiteAdapter(): DatabaseAdapter {
  try {
    const dbPath = path.join(process.cwd(), 'chat.db');
    const sqlite = new Database(dbPath);
    const db = drizzleSQLite(sqlite, { schema: sqliteSchema });
    
    // إنشاء الجداول إذا لم تكن موجودة
    createSQLiteTables(sqlite);
    
    return {
      db: db as DatabaseType,
      type: 'sqlite',
      close: () => sqlite.close(),
      migrate: async () => {
        // SQLite migrations are handled by createSQLiteTables
        }
    };
  } catch (error) {
    console.error("❌ فشل في الاتصال بـ SQLite:", error);
    return {
      db: null,
      type: 'disabled'
    };
  }
}

// إنشاء جداول SQLite
function createSQLiteTables(sqlite: Database.Database) {
  try {
    // إنشاء جدول المستخدمين
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
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
        last_seen DATETIME,
        join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_muted BOOLEAN DEFAULT FALSE,
        mute_expiry DATETIME,
        is_banned BOOLEAN DEFAULT FALSE,
        ban_expiry DATETIME,
        is_blocked BOOLEAN DEFAULT FALSE,
        ip_address TEXT,
        device_id TEXT,
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

    // إنشاء جدول الرسائل
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER REFERENCES users(id),
        receiver_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'text',
        is_private BOOLEAN DEFAULT FALSE,
        room_id TEXT DEFAULT 'general',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إنشاء جدول الأصدقاء
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        friend_id INTEGER REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إنشاء جدول الإشعارات
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إنشاء جدول الأجهزة المحظورة
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS blocked_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL,
        device_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        blocked_at DATETIME NOT NULL,
        blocked_by INTEGER NOT NULL
      )
    `);

    // إنشاء جدول تاريخ النقاط
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS points_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إنشاء جدول إعدادات المستويات
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS level_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level INTEGER NOT NULL UNIQUE,
        required_points INTEGER NOT NULL,
        title TEXT NOT NULL,
        color TEXT DEFAULT '#FFFFFF',
        badge TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إنشاء جدول الغرف
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'public',
        owner_id INTEGER REFERENCES users(id),
        max_users INTEGER DEFAULT 50,
        is_private BOOLEAN DEFAULT FALSE,
        password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    } catch (error) {
    console.error('❌ خطأ في إنشاء جداول SQLite:', error);
  }
}

// إنشاء محول PostgreSQL
function createPostgreSQLAdapter(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl || (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://'))) {
    console.warn("⚠️ DATABASE_URL غير محدد أو غير صحيح");
    return { db: null, type: 'disabled' };
  }
  
  try {
    // إعداد Neon للإنتاج
    neonConfig.fetchConnectionCache = true;
    
    const pool = new Pool({ connectionString: databaseUrl });
    const db = drizzleNeon({ client: pool, schema: pgSchema });
    
    return {
      db: db as DatabaseType,
      type: 'postgresql',
      close: () => pool.end(),
      migrate: async () => {
        try {
          // تشغيل migrations إذا كانت موجودة
          const migrationsPath = path.join(process.cwd(), 'migrations');
          if (fs.existsSync(migrationsPath)) {
            await migratePostgres(db as PostgreSQLDatabase, { migrationsFolder: 'migrations' });
            }
        } catch (error: any) {
          // تجاهل أخطاء الجداول الموجودة
          if (!error.message?.includes('already exists') && error.code !== '42P07') {
            console.error('❌ خطأ في PostgreSQL migrations:', error);
          }
        }
      }
    };
  } catch (error) {
    console.error("❌ فشل في الاتصال بـ PostgreSQL:", error);
    return { db: null, type: 'disabled' };
  }
}

// إنشاء محول قاعدة البيانات مع fallback
export function createDatabaseAdapter(): DatabaseAdapter {
  // محاولة PostgreSQL أولاً
  const pgAdapter = createPostgreSQLAdapter();
  if (pgAdapter.db && pgAdapter.type !== 'disabled') {
    return pgAdapter;
  }
  
  // fallback إلى SQLite
  const sqliteAdapter = createSQLiteAdapter();
  if (sqliteAdapter.db && sqliteAdapter.type !== 'disabled') {
    return sqliteAdapter;
  }
  
  console.warn('⚠️ كلا من PostgreSQL و SQLite غير متاحين، العمل في وضع معطل');
  return { db: null, type: 'disabled' };
}

// إنشاء المحول الافتراضي
export const dbAdapter = createDatabaseAdapter();
export const db: any = dbAdapter.db;
export const dbType = dbAdapter.type;

// دالة للتحقق من حالة قاعدة البيانات
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (!db || dbType === 'disabled') {
      return false;
    }
    
    if (dbType === 'postgresql') {
      await (db as PostgreSQLDatabase).execute('SELECT 1' as any);
    } else if (dbType === 'sqlite') {
      (db as any).exec('SELECT 1');
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
    connected: !!db && dbType !== 'disabled',
    type: dbType === 'disabled' ? 'معطلة' : dbType === 'postgresql' ? 'PostgreSQL/Supabase' : 'SQLite',
    url: process.env.DATABASE_URL ? '***محددة***' : 'غير محددة',
    environment: process.env.NODE_ENV || 'development',
    dbType: dbType
  };
}

// إضافة دالة لتهيئة قاعدة البيانات
export async function initializeDatabase(): Promise<boolean> {
  try {
    if (!db || dbType === 'disabled') {
      return true;
    }

    // تشغيل migrations
    if (dbAdapter.migrate) {
      await dbAdapter.migrate();
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}