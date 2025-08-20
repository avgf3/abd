import dotenv from 'dotenv';
dotenv.config();

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleSQLite } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate as migrateSQLite } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import type Database from 'better-sqlite3';
import type { NeonQueryResultHKT } from 'drizzle-orm/neon-serverless';
import { migrate as migratePostgres } from 'drizzle-orm/neon-serverless/migrator';
import type { PgDatabase } from 'drizzle-orm/pg-core';

import * as pgSchema from '../shared/schema';
import type * as sqliteSchema from '../shared/sqlite-schema';

import fs from 'fs';
import path from 'path';

// تعريف أنواع قواعد البيانات
export type PostgreSQLDatabase = PgDatabase<NeonQueryResultHKT, typeof pgSchema>;
export type SQLiteDatabase = BetterSQLite3Database<typeof sqliteSchema>;
export type DatabaseType = PostgreSQLDatabase | null;

// واجهة موحدة للعمليات
export interface DatabaseAdapter {
  db: DatabaseType;
  type: 'postgresql' | 'sqlite' | 'disabled';
  close?: () => void;
  migrate?: () => Promise<void>;
}

// إنشاء محول SQLite
function createSQLiteAdapter(): DatabaseAdapter {
  throw new Error('SQLite adapter is disabled in production build');
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

    // إنشاء جدول room_users لتتبع عضوية الغرف
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS room_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        room_id TEXT NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, room_id)
      )
    `);
  } catch (error) {
    console.error('❌ خطأ في إنشاء جداول SQLite:', error);
  }
}

// إنشاء محول PostgreSQL
function createPostgreSQLAdapter(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL;

  if (
    !databaseUrl ||
    (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://'))
  ) {
    console.warn('⚠️ DATABASE_URL غير محدد أو غير صحيح');
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
          // تجاهل أخطاء الجداول الموجودة للمتابعة في ضمان المخطط
          const msg: string = error?.message || '';
          const code: string | undefined = (error && (error.code || error?.cause?.code)) as any;
          if (!(msg.includes('already exists') || code === '42P07')) {
            console.error('❌ خطأ في PostgreSQL migrations:', error);
          }
        }

        // ضمان وجود المخطط المطلوب بشكل idempotent حتى لو فشلت بعض الـ migrations
        try {
          // Enable citext for slug if available
          await (db as any).execute(`CREATE EXTENSION IF NOT EXISTS citext;`).catch(() => {});

          // Ensure rooms optional columns
          await (db as any).execute(`
            DO $$ BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'rooms' AND column_name = 'deleted_at'
              ) THEN
                ALTER TABLE rooms ADD COLUMN deleted_at TIMESTAMPTZ;
              END IF;
            END $$;
          `);
          await (db as any).execute(`
            DO $$ BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'rooms' AND column_name = 'last_message_at'
              ) THEN
                ALTER TABLE rooms ADD COLUMN last_message_at TIMESTAMPTZ;
              END IF;
            END $$;
          `);
          await (db as any).execute(`
            DO $$ BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'rooms' AND column_name = 'slug'
              ) THEN
                ALTER TABLE rooms ADD COLUMN slug CITEXT;
                UPDATE rooms SET slug = COALESCE(NULLIF(id, ''), NULLIF(name, ''))::citext WHERE slug IS NULL;
              END IF;
            END $$;
          `);
          await (db as any).execute(`
            CREATE UNIQUE INDEX IF NOT EXISTS uniq_rooms_slug_active
            ON rooms (slug) WHERE deleted_at IS NULL AND slug IS NOT NULL;
          `);
          await (db as any).execute(`
            CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms (deleted_at) WHERE deleted_at IS NULL;
          `);

          // Ensure room_members pivot with moderation fields
          await (db as any).execute(`
            CREATE TABLE IF NOT EXISTS room_members (
              room_id       TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
              user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','moderator','member')),
              muted_until   TIMESTAMPTZ,
              banned_until  TIMESTAMPTZ,
              joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
              PRIMARY KEY (room_id, user_id)
            );
          `);
          await (db as any).execute(
            `CREATE INDEX IF NOT EXISTS idx_room_members_roles ON room_members (room_id, role);`
          );
          await (db as any).execute(
            `CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members (user_id);`
          );
          await (db as any).execute(
            `CREATE INDEX IF NOT EXISTS idx_room_members_mute ON room_members (room_id, muted_until) WHERE muted_until IS NOT NULL;`
          );
          await (db as any).execute(
            `CREATE INDEX IF NOT EXISTS idx_room_members_ban  ON room_members (room_id, banned_until) WHERE banned_until IS NOT NULL;`
          );
          await (db as any).execute(`
            CREATE UNIQUE INDEX IF NOT EXISTS uniq_room_owner ON room_members (room_id) WHERE role = 'owner';
          `);
          // Backfill owner membership when missing
          await (db as any)
            .execute(
              `
            INSERT INTO room_members (room_id, user_id, role)
            SELECT r.id, r.created_by, 'owner'
            FROM rooms r
            LEFT JOIN room_members rm ON rm.room_id = r.id AND rm.role = 'owner'
            WHERE r.created_by IS NOT NULL AND rm.room_id IS NULL
          `
            )
            .catch(() => {});

          // Ensure messages optional columns
          await (db as any).execute(`
            DO $$ BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'messages' AND column_name = 'deleted_at'
              ) THEN
                ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMPTZ;
              END IF;
            END $$;
          `);
          await (db as any).execute(`
            DO $$ BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'messages' AND column_name = 'edited_at'
              ) THEN
                ALTER TABLE messages ADD COLUMN edited_at TIMESTAMPTZ;
              END IF;
            END $$;
          `);
          await (db as any).execute(`
            DO $$ BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'messages' AND column_name = 'attachments'
              ) THEN
                ALTER TABLE messages ADD COLUMN attachments JSONB;
              END IF;
            END $$;
          `);
          await (db as any)
            .execute(`ALTER TABLE messages ALTER COLUMN attachments SET DEFAULT '[]'::jsonb;`)
            .catch(() => {});

          // Helpful index for room messages
          await (db as any).execute(`
            CREATE INDEX IF NOT EXISTS idx_messages_room_time
            ON messages (room_id, "timestamp" DESC)
            WHERE deleted_at IS NULL;
          `);

          // Helpful indexes for private messages (bi-directional conversations)
          await (db as any).execute(`
            CREATE INDEX IF NOT EXISTS idx_messages_private_sender_receiver
            ON messages (sender_id, receiver_id, "timestamp" DESC)
            WHERE is_private = TRUE;
          `);
          await (db as any).execute(`
            CREATE INDEX IF NOT EXISTS idx_messages_private_receiver_sender
            ON messages (receiver_id, sender_id, "timestamp" DESC)
            WHERE is_private = TRUE;
          `);
          // Expression index to speed symmetric conversations
          await (db as any)
            .execute(
              `
            CREATE INDEX IF NOT EXISTS idx_messages_private_pair
            ON messages ((LEAST(sender_id, receiver_id)), (GREATEST(sender_id, receiver_id)), "timestamp" DESC)
            WHERE is_private = TRUE;
          `
            )
            .catch(() => {});

          // Helpful index for notifications
          await (db as any).execute(`
            CREATE INDEX IF NOT EXISTS idx_notifications_user_time
            ON notifications (user_id, created_at DESC);
          `);

          // Ensure users optional avatar columns
          await (db as any).execute(`
            DO $$ BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'avatar_hash'
              ) THEN
                ALTER TABLE users ADD COLUMN avatar_hash TEXT;
              END IF;
            END $$;
          `);
          await (db as any).execute(`
            DO $$ BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'avatar_version'
              ) THEN
                ALTER TABLE users ADD COLUMN avatar_version INTEGER DEFAULT 1;
              END IF;
            END $$;
          `);
        } catch (ensureError) {
          console.error('⚠️ فشل في ضمان المخطط بعد الـ migrations:', ensureError);
        }
      },
    };
  } catch (error) {
    console.error('❌ فشل في الاتصال بـ PostgreSQL:', error);
    return { db: null, type: 'disabled' };
  }
}

// إنشاء محول قاعدة البيانات مع fallback
export function createDatabaseAdapter(): DatabaseAdapter {
  const pgAdapter = createPostgreSQLAdapter();
  if (pgAdapter.db && pgAdapter.type !== 'disabled') {
    return pgAdapter;
  }
  // No SQLite fallback
  console.error('DATABASE_URL is missing or invalid. PostgreSQL is required.');
  return { db: null, type: 'disabled' } as any;
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
    console.error('❌ خطأ في فحص صحة قاعدة البيانات:', error);
    return false;
  }
}

// دالة للحصول على حالة قاعدة البيانات
export function getDatabaseStatus() {
  return {
    connected: !!db && dbType !== 'disabled',
    type:
      dbType === 'disabled' ? 'معطلة' : dbType === 'postgresql' ? 'PostgreSQL/Supabase' : 'SQLite',
    url: process.env.DATABASE_URL ? '***محددة***' : 'غير محددة',
    environment: process.env.NODE_ENV || 'development',
    dbType: dbType,
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
