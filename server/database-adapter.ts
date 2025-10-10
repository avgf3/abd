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
    const timeoutMs = Number(process.env.DB_HEALTH_TIMEOUT_MS || 2000);
    return await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs);
      (async () => {
        try {
          await dbAdapter.client`select 1 as ok`;
          clearTimeout(timer);
          resolve(true);
        } catch {
          clearTimeout(timer);
          resolve(false);
        }
      })();
    });
  } catch {
    return false;
  }
}

export async function initializeDatabase(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL || '';

  try {
    if (
      !databaseUrl ||
      !(databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://'))
    ) {
      dbType = 'disabled';
      dbAdapter.db = null;
      dbAdapter.client = null;
      db = null;
      console.warn('⚠️ DATABASE_URL غير محدد أو ليس PostgreSQL. سيتم تعطيل قاعدة البيانات.');
      return false;
    }

    // إعدادات محسنة للاتصال بقاعدة البيانات مع دعم PgBouncer وعدد عملاء كبير
    const sslRequired =
      /\bsslmode=require\b/.test(databaseUrl) || process.env.NODE_ENV === 'production';

    // إضافة معاملات SSL إذا لم تكن موجودة في production
    let connectionString = databaseUrl;
    if (process.env.NODE_ENV === 'production' && !connectionString.includes('sslmode=')) {
      connectionString += connectionString.includes('?') ? '&sslmode=require' : '?sslmode=require';
    }

    // اكتشاف استخدام PgBouncer عبر سلسلة الاتصال أو متغير بيئة
    const isPgBouncer =
      /pgbouncer=1|pgbouncer=true/i.test(connectionString) ||
      String(process.env.USE_PGBOUNCER || '').toLowerCase() === 'true';

    // إعدادات المجمع والقيم الافتراضية الآمنة
    // دعم وضع "بدون حدود" عبر متغيرات البيئة التالية: DB_NO_LIMITS / DB_UNLIMITED / NO_DB_LIMITS
    const noLimitsFlag = String(
      process.env.DB_NO_LIMITS || process.env.DB_UNLIMITED || process.env.NO_DB_LIMITS || ''
    )
      .toLowerCase()
      .trim();
    const noLimits = ['1', 'true', 'yes', 'on', 'unlimited', 'nolimit', 'no-limits'].includes(
      noLimitsFlag
    );

    // ملاحظة: القيم الكبيرة قد تستنزف اتصالات القاعدة بدون PgBouncer
    // - مع PgBouncer (transaction pooling): يمكن رفع max كثيراً بأمان
    // - بدون PgBouncer: نجعل max متوسطاً لتفادي استنزاف max_connections على الخادم
    const defaultMax = noLimits ? (isPgBouncer ? 1000 : 50) : isPgBouncer ? 20 : 5;
    const poolMax = Number(process.env.DB_POOL_MAX || process.env.POOL_MAX || defaultMax);
    const poolMin = noLimits ? 0 : Number(process.env.DB_POOL_MIN || 0);
    // لمنع انقطاع الاتصال: 0 يعني تعطيل المهلة في postgres.js
    const idleTimeout = noLimits ? 0 : Number(process.env.DB_IDLE_TIMEOUT || 60); // ثوانٍ
    const maxLifetime = noLimits ? 0 : Number(process.env.DB_MAX_LIFETIME || 60 * 30); // ثوانٍ
    const connectTimeout = Number(process.env.DB_CONNECT_TIMEOUT || 30); // ثوانٍ
    const retryDelayMs = Number(process.env.DB_RETRY_DELAY_MS || (noLimits ? 500 : 1000));
    const maxAttempts = Number(process.env.DB_MAX_ATTEMPTS || (noLimits ? 10 : 3));

    const client = postgres(connectionString, {
      ssl: sslRequired ? 'require' : undefined,
      prepare: true,
      onnotice: () => {},
      fetch_types: false,
      types: false,
      connection: {
        application_name: `chat-app:${process.pid}`,
      },
      // مهلات واستقرار
      idle_timeout: idleTimeout,
      max_lifetime: maxLifetime,
      connect_timeout: connectTimeout,
      // حدود المجمع
      // في وضع noLimits نسمح بقيم كبيرة (خصوصاً مع PgBouncer)
      max: Math.max(1, poolMax),
      min: Math.max(0, Math.min(poolMin, poolMax)),
      // إعدادات إعادة المحاولة
      retry_delay: retryDelayMs,
      max_attempts: maxAttempts,
    });

    const drizzleDb = drizzle(client, { schema, logger: false });

    // محاولة الاتصال مع إعادة المحاولة (باستخدام القيم القابلة للتهيئة)
    let connected = false;
    let attempts = 0;
    const maxAttemptsLocal = maxAttempts;
    
    while (!connected && attempts < maxAttempts) {
      try {
        await client`select 1 as ok`;
        connected = true;
      } catch (error) {
        attempts++;
        if (attempts < maxAttemptsLocal) {
          const backoff = Math.min(5000, retryDelayMs * (attempts + 1));
          await new Promise(resolve => setTimeout(resolve, backoff));
        } else {
          throw error;
        }
      }
    }

    dbType = 'postgresql';
    dbAdapter.client = client as any;
    dbAdapter.db = drizzleDb as any;
    db = drizzleDb as any;

    try {
      console.warn(
        `🗄️ Database pool configured - max=${poolMax}, min=${poolMin}, idle_timeout=${idleTimeout}, max_lifetime=${maxLifetime}, ` +
        `ssl=${sslRequired ? 'require' : 'disabled'}, pgbouncer=${isPgBouncer}, no_limits=${noLimits}`
      );
    } catch {}

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

// Ensure conversation_reads table and indexes exist
export async function ensureConversationReadsTable(): Promise<void> {
  try {
    if (!dbAdapter.client) return;

    const exists = await dbAdapter.client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'conversation_reads'
      ) as exists
    ` as any;

    if (!exists?.[0]?.exists) {
      await dbAdapter.client.unsafe(`
        CREATE TABLE IF NOT EXISTS conversation_reads (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          other_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          last_read_at TIMESTAMP DEFAULT NOW(),
          last_read_message_id INTEGER,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
    }

    // Unique index on (user_id, other_user_id)
    await dbAdapter.client.unsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_reads_user_other
      ON conversation_reads (user_id, other_user_id);
    `);

    // Index for last_read_at lookups
    await dbAdapter.client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_conversation_reads_last_read
      ON conversation_reads (user_id, other_user_id, last_read_at DESC);
    `);
  } catch (e) {
    console.warn('⚠️ تعذر ضمان جدول conversation_reads:', (e as any)?.message || e);
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

// Ensure username_color default is blue and backfill existing whites/invalids
export async function ensureUsernameColorDefaultBlue(): Promise<void> {
  try {
    if (!dbAdapter.client) return;

    // Set default to blue
    await dbAdapter.client.unsafe(
      `ALTER TABLE IF EXISTS users ALTER COLUMN username_color SET DEFAULT '#4A90E2'`
    );

    // Backfill empty/invalid/white values to blue for regular users and guests
    await dbAdapter.client.unsafe(
      `UPDATE users
       SET username_color = '#4A90E2'
       WHERE username_color IS NULL
          OR username_color = ''
          OR username_color = 'null'
          OR username_color = 'undefined'
          OR LOWER(username_color) IN ('#ffffff', '#fff')`
    );
  } catch (e) {
    console.warn('⚠️ تعذر ضمان اللون الافتراضي للأسماء:', (e as any)?.message || e);
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

// Ensure profile_frame column exists for avatar frames
export async function ensureUserProfileFrameColumn(): Promise<void> {
  try {
    if (!dbAdapter.client) return;
    await dbAdapter.client.unsafe(`
      ALTER TABLE IF EXISTS users
        ADD COLUMN IF NOT EXISTS profile_frame TEXT;
    `);
  } catch (e) {
    console.warn('⚠️ تعذر ضمان عمود profile_frame:', (e as any)?.message || e);
  }
}

// Ensure wall_posts has user_profile_frame column used by feeds
export async function ensureWallPostsUserProfileFrameColumn(): Promise<void> {
  try {
    if (!dbAdapter.client) return;
    await dbAdapter.client.unsafe(`
      ALTER TABLE wall_posts
        ADD COLUMN IF NOT EXISTS user_profile_frame TEXT;
    `);
  } catch (e) {
    console.warn(
      '⚠️ تعذر ضمان عمود user_profile_frame في wall_posts:',
      (e as any)?.message || e
    );
  }
}

// Ensure message text styling columns exist on messages table
export async function ensureMessageTextStylingColumns(): Promise<void> {
  try {
    if (!dbAdapter.client) return;

    // Check existing columns
    const rows = (await dbAdapter.client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name IN ('text_color','bold','attachments','edited_at','deleted_at')
    `) as any[];
    const existing = new Set((rows || []).map((r: any) => r.column_name));

    if (!existing.has('text_color')) {
      await dbAdapter.client.unsafe(
        `ALTER TABLE messages ADD COLUMN IF NOT EXISTS text_color TEXT`
      );
    }
    if (!existing.has('bold')) {
      await dbAdapter.client.unsafe(
        `ALTER TABLE messages ADD COLUMN IF NOT EXISTS bold BOOLEAN DEFAULT false`
      );
      // Backfill NULLs to false just in case
      await dbAdapter.client.unsafe(`UPDATE messages SET bold = false WHERE bold IS NULL`);
    }

    if (!existing.has('attachments')) {
      await dbAdapter.client.unsafe(
        `ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb`
      );
    } else {
      // Ensure default exists to avoid explicit nulls
      await dbAdapter.client.unsafe(
        `ALTER TABLE messages ALTER COLUMN attachments SET DEFAULT '[]'::jsonb`
      );
      await dbAdapter.client.unsafe(`UPDATE messages SET attachments = '[]'::jsonb WHERE attachments IS NULL`);
    }

    if (!existing.has('edited_at')) {
      await dbAdapter.client.unsafe(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP`);
    }

    if (!existing.has('deleted_at')) {
      await dbAdapter.client.unsafe(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
    }

    // Helpful index for styling-related filters (idempotent)
    await dbAdapter.client.unsafe(
      `CREATE INDEX IF NOT EXISTS idx_messages_text_styling ON messages(text_color, bold)`
    );
  } catch (e) {
    console.error('❌ خطأ في ضمان أعمدة text styling للرسائل:', (e as any)?.message || e);
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
