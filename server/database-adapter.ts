import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '../shared/schema';

type DatabaseType = 'postgresql' | 'disabled';

interface DatabaseStatus {
  connected: boolean;
  type: DatabaseType;
  environment: 'development' | 'production' | 'test' | 'unknown';
  url?: string;
  error?: string;
}

interface DbAdapter {
  db: ReturnType<typeof drizzle<typeof schema>> | null;
  client: postgres.Sql<Record<string, never>> | null;
}

export let dbType: DatabaseType = 'disabled';
export const dbAdapter: DbAdapter = {
  db: null,
  client: null,
};

export let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getEnvMode(): DatabaseStatus['environment'] {
  const mode = process.env.NODE_ENV;
  if (mode === 'development' || mode === 'production' || mode === 'test') return mode;
  return 'unknown';
}

export function getDatabaseStatus(): DatabaseStatus {
  return {
    connected: !!db,
    type: dbType,
    environment: getEnvMode(),
    url: process.env.DATABASE_URL,
  };
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (!dbAdapter.client) return false;
    await dbAdapter.client`select 1 as ok`;
    return true;
  } catch {
    return false;
  }
}

export async function initializeDatabase(): Promise<boolean> {
  console.log('📝 استخدام SQLite للاستقرار...');
  dbType = 'disabled';
  dbAdapter.db = null;
  dbAdapter.client = null;
  db = null;
  return false;
}

    // إعدادات محسنة للاتصال بقاعدة البيانات على Render
    const sslRequired =
      /\bsslmode=require\b/.test(databaseUrl) || process.env.NODE_ENV === 'production';
    
    // إضافة معاملات SSL إذا لم تكن موجودة في production
    let connectionString = databaseUrl;
    if (process.env.NODE_ENV === 'production' && !connectionString.includes('sslmode=')) {
      connectionString += connectionString.includes('?') ? '&sslmode=require' : '?sslmode=require';
    }
    
    const client = postgres(connectionString, {
      ssl: sslRequired ? 'require' : undefined,
      // ضبط الحد الأقصى للاتصالات: متغير بيئة أو افتراضي 20 لتوافق الخطط المحدودة
      max: (() => {
        const env = Number(process.env.DB_MAX_CONNECTIONS);
        if (!Number.isNaN(env) && env > 0) return env;
        return 20;
      })(),
      idle_timeout: 30, // تقليل timeout إلى 30 ثانية لتحرير الاتصالات بشكل أسرع
      connect_timeout: 30, // تقليل timeout الاتصال إلى 30 ثانية
      max_lifetime: 60 * 10, // إعادة تدوير الاتصالات كل 10 دقائق لمنع التراكم
      prepare: true, // تفعيل prepared statements لتحسين الأداء
      onnotice: () => {}, // تجاهل الإشعارات
      // إضافة إعدادات إضافية للأداء
      fetch_types: false, // تحسين الأداء
      types: {},
      connection: {
        application_name: 'chat-app',
        statement_timeout: 30000, // 30 ثانية كحد أقصى لكل استعلام
      },
    });

    const drizzleDb = drizzle(client, { schema, logger: false });

    // محاولة الاتصال مع إعادة المحاولة
    let connected = false;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!connected && attempts < maxAttempts) {
      try {
        await client`select 1 as ok`;
        connected = true;
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
        } else {
          throw error;
        }
      }
    }

    dbType = 'postgresql';
    dbAdapter.client = client as any;
    dbAdapter.db = drizzleDb as any;
    db = drizzleDb as any;

    return true;
  } catch (error: any) {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', error?.message || error);
    dbType = 'disabled';
    dbAdapter.db = null;
    dbAdapter.client = null;
    db = null;
    return false;
  }
}

export async function runMigrationsIfAvailable(): Promise<void> {
  try {
    if (!dbAdapter.client) return;
    // Prefer Drizzle migrator if migrations folder exists in runtime
    const fs = await import('fs');
    const path = await import('path');
    const candidateFolders = [
      path.join(process.cwd(), 'migrations'),
      path.join(process.cwd(), 'dist', 'migrations'),
    ];
    for (const migrationsFolder of candidateFolders) {
      if (!fs.existsSync(migrationsFolder)) continue;
      try {
        const { migrate } = await import('drizzle-orm/postgres-js/migrator');
        await migrate(dbAdapter.db as any, { migrationsFolder });
        break;
      } catch (e) {
        console.warn('⚠️ تعذر تشغيل الهجرات عبر Drizzle migrator:', (e as any)?.message || e);
      }
    }
  } catch {}
}

// Ensure chat lock columns exist on rooms table
export async function ensureChatLockColumns(): Promise<void> {
  try {
    if (!dbAdapter.client) return;

    // Check if chat_lock columns exist
    const result = await dbAdapter.client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rooms' 
      AND column_name IN ('chat_lock_all', 'chat_lock_visitors')
    ` as any;
    
    const existingColumns = result.map((r: any) => r.column_name);
    // Add missing columns
    if (!existingColumns.includes('chat_lock_all')) {
      await dbAdapter.client.unsafe(`ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "chat_lock_all" boolean DEFAULT false`);
    }
    
    if (!existingColumns.includes('chat_lock_visitors')) {
      await dbAdapter.client.unsafe(`ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "chat_lock_visitors" boolean DEFAULT false`);
    }
    
    // Update any NULL values to false
    await dbAdapter.client.unsafe(`UPDATE "rooms" SET "chat_lock_all" = false WHERE "chat_lock_all" IS NULL`);
    await dbAdapter.client.unsafe(`UPDATE "rooms" SET "chat_lock_visitors" = false WHERE "chat_lock_visitors" IS NULL`);
    
    // Add indexes if they don't exist
    await dbAdapter.client.unsafe(`CREATE INDEX IF NOT EXISTS "idx_rooms_chat_lock_all" ON "rooms" ("chat_lock_all")`);
    await dbAdapter.client.unsafe(`CREATE INDEX IF NOT EXISTS "idx_rooms_chat_lock_visitors" ON "rooms" ("chat_lock_visitors")`);
    
    } catch (error) {
    console.error('❌ خطأ في ضمان أعمدة chat_lock:', error);
  }
}

// Ensure required tables exist even if migrations didn't run
export async function ensureStoriesTables(): Promise<void> {
  try {
    if (!dbAdapter.client) return;

    // Check and create stories table
    const storiesExists = await dbAdapter.client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'stories'
      ) as exists
    ` as any;

    if (!storiesExists?.[0]?.exists) {
      await dbAdapter.client.unsafe(`
        CREATE TABLE IF NOT EXISTS stories (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          media_url TEXT NOT NULL,
          media_type TEXT NOT NULL,
          caption TEXT,
          duration_sec INTEGER NOT NULL DEFAULT 0,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

      await dbAdapter.client.unsafe(`
        CREATE INDEX IF NOT EXISTS idx_stories_user_created ON stories(user_id, created_at DESC);
      `);
      await dbAdapter.client.unsafe(`
        CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);
      `);
    }

    // Check and create story_views table
    const storyViewsExists = await dbAdapter.client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'story_views'
      ) as exists
    ` as any;

    if (!storyViewsExists?.[0]?.exists) {
      await dbAdapter.client.unsafe(`
        CREATE TABLE IF NOT EXISTS story_views (
          id SERIAL PRIMARY KEY,
          story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
          viewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          viewed_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT story_views_unique UNIQUE (story_id, viewer_id)
        );
      `);
    }

    // Ensure indexes/uniques exist
    await dbAdapter.client.unsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_story_views_unique ON story_views (story_id, viewer_id);
    `);
    await dbAdapter.client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_story_views_viewer ON story_views (viewer_id);
    `);

    // Check and create story_reactions table
    const storyReactionsExists = await dbAdapter.client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'story_reactions'
      ) as exists
    ` as any;

    if (!storyReactionsExists?.[0]?.exists) {
      await dbAdapter.client.unsafe(`
        CREATE TABLE IF NOT EXISTS story_reactions (
          id SERIAL PRIMARY KEY,
          story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          reacted_at TIMESTAMP DEFAULT NOW()
        );
      `);
    }

    // Ensure indexes/uniques exist for reactions
    await dbAdapter.client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_story_reactions_story ON story_reactions (story_id);
    `);
    await dbAdapter.client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_story_reactions_user ON story_reactions (user_id);
    `);
    await dbAdapter.client.unsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_story_reactions_unique ON story_reactions (story_id, user_id);
    `);
  } catch (e) {
    console.warn('⚠️ تعذر ضمان جداول القصص:', (e as any)?.message || e);
  }
}

// Ensure profile music columns exist on users table (safety net if migrations didn't run)
export async function ensureUserProfileMusicColumns(): Promise<void> {
  try {
    if (!dbAdapter.client) return;

    await dbAdapter.client.unsafe(`
      ALTER TABLE IF EXISTS users
        ADD COLUMN IF NOT EXISTS profile_music_url TEXT;
    `);
    await dbAdapter.client.unsafe(`
      ALTER TABLE IF EXISTS users
        ADD COLUMN IF NOT EXISTS profile_music_title TEXT;
    `);
    await dbAdapter.client.unsafe(`
      ALTER TABLE IF EXISTS users
        ADD COLUMN IF NOT EXISTS profile_music_enabled BOOLEAN DEFAULT TRUE;
    `);
    await dbAdapter.client.unsafe(`
      ALTER TABLE IF EXISTS users
        ADD COLUMN IF NOT EXISTS profile_music_volume INTEGER DEFAULT 70;
    `);

    await dbAdapter.client.unsafe(`
      UPDATE users
      SET
        profile_music_enabled = COALESCE(profile_music_enabled, TRUE),
        profile_music_volume = COALESCE(profile_music_volume, 70)
    `);
  } catch (e) {
    console.warn('⚠️ تعذر ضمان أعمدة موسيقى البروفايل:', (e as any)?.message || e);
  }
}

// Ensure user preference columns exist on users table (safety net if migrations didn't run)
export async function ensureUserPreferencesColumns(): Promise<void> {
  try {
    if (!dbAdapter.client) return;

    // Add columns if missing first without NOT NULL to avoid failures
    await dbAdapter.client.unsafe(`
      ALTER TABLE IF EXISTS users
        ADD COLUMN IF NOT EXISTS show_points_to_others BOOLEAN;
    `);
    await dbAdapter.client.unsafe(`
      ALTER TABLE IF EXISTS users
        ADD COLUMN IF NOT EXISTS show_system_messages BOOLEAN;
    `);
    await dbAdapter.client.unsafe(`
      ALTER TABLE IF EXISTS users
        ADD COLUMN IF NOT EXISTS global_sound_enabled BOOLEAN;
    `);

    // Default any NULLs to TRUE
    await dbAdapter.client.unsafe(`
      UPDATE users
      SET
        show_points_to_others = COALESCE(show_points_to_others, TRUE),
        show_system_messages = COALESCE(show_system_messages, TRUE),
        global_sound_enabled = COALESCE(global_sound_enabled, TRUE)
    `);

    // Set defaults
    await dbAdapter.client.unsafe(`
      ALTER TABLE IF EXISTS users
        ALTER COLUMN show_points_to_others SET DEFAULT TRUE;
    `);
    await dbAdapter.client.unsafe(`
      ALTER TABLE IF EXISTS users
        ALTER COLUMN show_system_messages SET DEFAULT TRUE;
    `);
    await dbAdapter.client.unsafe(`
      ALTER TABLE IF EXISTS users
        ALTER COLUMN global_sound_enabled SET DEFAULT TRUE;
    `);

    // Enforce NOT NULL after data backfill
    await dbAdapter.client.unsafe(`
      ALTER TABLE IF EXISTS users
        ALTER COLUMN show_points_to_others SET NOT NULL;
    `);
    await dbAdapter.client.unsafe(`
      ALTER TABLE IF EXISTS users
        ALTER COLUMN show_system_messages SET NOT NULL;
    `);
    await dbAdapter.client.unsafe(`
      ALTER TABLE IF EXISTS users
        ALTER COLUMN global_sound_enabled SET NOT NULL;
    `);
  } catch (e) {
    console.warn('⚠️ تعذر ضمان أعمدة تفضيلات المستخدم:', (e as any)?.message || e);
  }
}

// Ensure rooms table has required columns like is_locked
export async function ensureRoomsColumns(): Promise<void> {
  try {
    if (!dbAdapter.client) return;

    await dbAdapter.client.unsafe(`
      ALTER TABLE IF EXISTS rooms
        ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
    `);
  } catch (e) {
    console.warn('⚠️ تعذر ضمان أعمدة جدول الغرف:', (e as any)?.message || e);
  }
}

// دالة لضمان وجود جدول البوتات
export async function ensureBotsTable(): Promise<void> {
  try {
    if (!dbAdapter.client) return;

    // قراءة ملف migration البوتات
    const fs = await import('fs/promises');
    const path = await import('path');
    const migrationPath = path.join(process.cwd(), 'migrations', 'add-bots-table.sql');
    
    try {
      const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
      await dbAdapter.client.unsafe(migrationSQL);
      } catch (error) {
      // إذا فشلت قراءة الملف، نقوم بإنشاء الجدول مباشرة
      await dbAdapter.client.unsafe(`
        CREATE TABLE IF NOT EXISTS bots (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          user_type TEXT NOT NULL DEFAULT 'bot',
          role TEXT NOT NULL DEFAULT 'bot',
          profile_image TEXT,
          profile_banner TEXT,
          profile_background_color TEXT DEFAULT '#2a2a2a',
          status TEXT,
          gender TEXT DEFAULT 'غير محدد',
          country TEXT DEFAULT 'غير محدد',
          relation TEXT DEFAULT 'غير محدد',
          bio TEXT DEFAULT 'أنا بوت آلي',
          is_online BOOLEAN DEFAULT true,
          current_room TEXT DEFAULT 'general',
          username_color TEXT DEFAULT '#00FF00',
          profile_effect TEXT DEFAULT 'none',
          points INTEGER DEFAULT 0,
          level INTEGER DEFAULT 1,
          total_points INTEGER DEFAULT 0,
          level_progress INTEGER DEFAULT 0,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          bot_type TEXT DEFAULT 'system',
          settings JSONB DEFAULT '{}'::jsonb
        );

        CREATE INDEX IF NOT EXISTS idx_bots_username ON bots(username);
        CREATE INDEX IF NOT EXISTS idx_bots_current_room ON bots(current_room);
        CREATE INDEX IF NOT EXISTS idx_bots_is_active ON bots(is_active);
        CREATE INDEX IF NOT EXISTS idx_bots_bot_type ON bots(bot_type);
      `);
      }
  } catch (e) {
    console.error('❌ خطأ في إنشاء جدول البوتات:', (e as any)?.message || e);
  }
}
