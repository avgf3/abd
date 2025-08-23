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
      max: 20, // زيادة عدد الاتصالات
      idle_timeout: 60, // زيادة timeout
      connect_timeout: 60, // زيادة timeout الاتصال
      max_lifetime: 60 * 30, // إعادة تدوير الاتصالات كل 30 دقيقة
      prepare: false, // تعطيل prepared statements لتحسين التوافق
      onnotice: () => {}, // تجاهل الإشعارات
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
        console.log(`⏳ محاولة الاتصال بقاعدة البيانات (${attempts}/${maxAttempts})...`);
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

    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
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
