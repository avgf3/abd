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
    
    const client = postgres(connectionString, {
      ssl: sslRequired ? 'require' : undefined,
      max: 100, // زيادة عدد الاتصالات إلى 100 لتحسين الأداء
      idle_timeout: 30, // تقليل timeout إلى 30 ثانية لتحرير الاتصالات بشكل أسرع
      connect_timeout: 30, // تقليل timeout الاتصال إلى 30 ثانية
      max_lifetime: 60 * 10, // إعادة تدوير الاتصالات كل 10 دقائق لمنع التراكم
      prepare: true, // تفعيل prepared statements لتحسين الأداء
      onnotice: () => {}, // تجاهل الإشعارات
      // إضافة إعدادات إضافية للأداء
      fetch_types: false, // تحسين الأداء
      types: false, // تحسين الأداء
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
    const migrationsFolder = path.join(process.cwd(), 'migrations');
    if (fs.existsSync(migrationsFolder)) {
      try {
        const { migrate } = await import('drizzle-orm/postgres-js/migrator');
        await migrate(dbAdapter.db as any, { migrationsFolder });
        } catch (e) {
        console.warn('⚠️ تعذر تشغيل الهجرات عبر Drizzle migrator:', (e as any)?.message || e);
      }
    }
  } catch {}
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
