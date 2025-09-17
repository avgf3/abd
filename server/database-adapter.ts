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

// متغير لتتبع حالة المراقبة
let healthCheckInterval: NodeJS.Timeout | null = null;
let connectionAttempts = 0;
let lastConnectionTime = 0;

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
    if (!dbAdapter.client) {
      // محاولة إنشاء اتصال جديد
      return await createConnectionOnDemand();
    }
    await dbAdapter.client`select 1 as ok`;
    return true;
  } catch (error) {
    console.warn('⚠️ فحص صحة قاعدة البيانات فشل:', (error as any)?.message || error);
    return false;
  }
}

// دالة إعادة الاتصال التلقائي
export async function reconnectDatabase(): Promise<boolean> {
  try {
    const now = Date.now();
    
    // منع إعادة الاتصال المتكررة (كل 5 ثواني على الأكثر)
    if (now - lastConnectionTime < 5000) {
      console.log('⏳ انتظار قبل إعادة الاتصال...');
      return false;
    }
    
    connectionAttempts++;
    lastConnectionTime = now;
    
    console.log(`🔄 محاولة إعادة الاتصال بقاعدة البيانات (المحاولة ${connectionAttempts})...`);
    
    // إغلاق الاتصال الحالي إذا كان موجوداً
    if (dbAdapter.client) {
      try {
        await dbAdapter.client.end();
        dbAdapter.client = null;
        dbAdapter.db = null;
        db = null;
      } catch (e) {
        // تجاهل أخطاء الإغلاق
      }
    }
    
    // إعادة تهيئة قاعدة البيانات
    const success = await initializeDatabase();
    if (success) {
      console.log('✅ تم إعادة الاتصال بقاعدة البيانات بنجاح');
      connectionAttempts = 0; // إعادة تعيين العداد عند النجاح
    } else {
      console.error(`❌ فشل في إعادة الاتصال بقاعدة البيانات (المحاولة ${connectionAttempts})`);
    }
    
    return success;
  } catch (error) {
    console.error('❌ خطأ في إعادة الاتصال:', error);
    return false;
  }
}

// بدء المراقبة الدورية لصحة قاعدة البيانات
export function startDatabaseHealthMonitoring(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  
  const interval = Number(process.env.DB_HEALTH_CHECK_INTERVAL) || 15000; // فحص كل 15 ثانية
  
  healthCheckInterval = setInterval(async () => {
    try {
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        console.warn('⚠️ قاعدة البيانات غير متاحة، محاولة إعادة الاتصال...');
        await reconnectDatabase();
      } else {
        // إعادة تعيين عداد المحاولات عند الاتصال الناجح
        if (connectionAttempts > 0) {
          console.log('✅ قاعدة البيانات متاحة مرة أخرى');
          connectionAttempts = 0;
        }
      }
    } catch (error) {
      console.error('❌ خطأ في المراقبة الدورية:', error);
    }
  }, interval);
}

// إيقاف المراقبة الدورية
export function stopDatabaseHealthMonitoring(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

// دالة مساعدة للاستعلامات مع إعادة المحاولة التلقائية
export async function executeWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries?: number
): Promise<T> {
  const retries = maxRetries || Number(process.env.DB_RETRY_ATTEMPTS) || 5;
  let lastError: any;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // إنشاء اتصال عند الطلب
      const connectionReady = await createConnectionOnDemand();
      if (!connectionReady) {
        throw new Error('فشل في إنشاء الاتصال بقاعدة البيانات');
      }

      // فحص صحة الاتصال قبل الاستعلام
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        console.warn(`⚠️ محاولة إعادة الاتصال قبل الاستعلام (المحاولة ${attempt})`);
        await reconnectDatabase();
      }
      
      const result = await queryFn();
      
      // إغلاق الاتصال بعد الاستعلام لتوفير الموارد
      if (dbAdapter.client && attempt === 1) {
        setTimeout(async () => {
          try {
            await dbAdapter.client?.end();
            dbAdapter.client = null;
            dbAdapter.db = null;
            db = null;
            console.log('🔌 تم إغلاق الاتصال لتوفير الموارد');
          } catch (e) {
            // تجاهل أخطاء الإغلاق
          }
        }, 2000);
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      
      // إذا كان خطأ اتصال، حاول إعادة الاتصال
      if (error.message?.includes('connection') || 
          error.message?.includes('timeout') ||
          error.message?.includes('ECONNRESET') ||
          error.message?.includes('ENOTFOUND') ||
          error.message?.includes('pool') ||
          error.message?.includes('client')) {
        
        console.warn(`⚠️ خطأ اتصال في المحاولة ${attempt}/${retries}:`, error.message);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          await reconnectDatabase();
          continue;
        }
      }
      
      // إذا لم يكن خطأ اتصال، أعد الخطأ مباشرة
      throw error;
    }
  }
  
  throw lastError;
}

// دالة إنشاء اتصال عند الطلب
async function createConnectionOnDemand(): Promise<boolean> {
  try {
    if (dbAdapter.client) {
      return true; // الاتصال موجود بالفعل
    }

    const databaseUrl = process.env.DATABASE_URL || '';
    if (!databaseUrl) return false;

    const sslRequired =
      /\bsslmode=require\b/.test(databaseUrl) || process.env.NODE_ENV === 'production';
    
    let connectionString = databaseUrl;
    if (process.env.NODE_ENV === 'production' && !connectionString.includes('sslmode=')) {
      connectionString += connectionString.includes('?') ? '&sslmode=require' : '?sslmode=require';
    }
    
    const client = postgres(connectionString, {
      ssl: sslRequired ? 'require' : undefined,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 5,
      prepare: false,
      onnotice: () => {},
      fetch_types: false,
      types: {},
      connection: {
        application_name: 'chat-app',
        statement_timeout: 30000,
        keep_alive: false,
      },
      retry_delay: 500,
      max_retries: 5,
      transform: {
        undefined: null,
      },
    });

    const drizzleDb = drizzle(client, { schema, logger: false });

    // اختبار الاتصال
    await client`select 1 as ok`;

    dbAdapter.client = client as any;
    dbAdapter.db = drizzleDb as any;
    db = drizzleDb as any;

    console.log('🔌 تم إنشاء اتصال جديد بقاعدة البيانات');
    return true;
  } catch (error: any) {
    console.error('❌ فشل في إنشاء الاتصال:', error?.message || error);
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

    // إعدادات محسنة للاتصال بقاعدة البيانات على Render
    const sslRequired =
      /\bsslmode=require\b/.test(databaseUrl) || process.env.NODE_ENV === 'production';
    
    // إضافة معاملات SSL إذا لم تكن موجودة في production
    let connectionString = databaseUrl;
    if (process.env.NODE_ENV === 'production' && !connectionString.includes('sslmode=')) {
      connectionString += connectionString.includes('?') ? '&sslmode=require' : '?sslmode=require';
    }
    
    // إنشاء اتصال مؤقت فقط للاختبار
    const testClient = postgres(connectionString, {
      ssl: sslRequired ? 'require' : undefined,
      max: 1,
      idle_timeout: 5,
      connect_timeout: 10,
      prepare: false,
      onnotice: () => {},
    });

    // اختبار الاتصال فقط
    await testClient`select 1 as ok`;
    await testClient.end();

    // إعداد النظام للاتصال عند الطلب
    dbType = 'postgresql';
    dbAdapter.db = null; // سيتم إنشاؤه عند الطلب
    dbAdapter.client = null; // سيتم إنشاؤه عند الطلب
    db = null; // سيتم إنشاؤه عند الطلب

    console.log('✅ تم اختبار الاتصال بقاعدة البيانات بنجاح - سيتم الاتصال عند الطلب');

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
