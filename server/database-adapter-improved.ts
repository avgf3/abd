import dotenv from 'dotenv';
dotenv.config();

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as pgSchema from "../shared/schema";
import * as sqliteSchema from "../shared/schema-sqlite";
import type { NeonQueryResultHKT } from 'drizzle-orm/neon-serverless';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// تعريف أنواع قواعد البيانات
export type PostgresDatabase = PgDatabase<NeonQueryResultHKT, typeof pgSchema>;
export type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;
export type DatabaseType = PostgresDatabase | SqliteDatabase;

// واجهة موحدة للعمليات
export interface DatabaseAdapter {
  db: DatabaseType | null;
  type: 'postgresql' | 'sqlite';
  isConnected: boolean;
  close?: () => void;
  healthCheck: () => Promise<boolean>;
}

// إعدادات الاتصال
const CONNECTION_CONFIG = {
  postgresql: {
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
    ssl: { rejectUnauthorized: false }
  },
  sqlite: {
    timeout: 5000,
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
  }
};

// محاولة الاتصال بـ PostgreSQL
async function tryPostgreSQLConnection(databaseUrl: string): Promise<DatabaseAdapter | null> {
  try {
    console.log('🔄 محاولة الاتصال بـ PostgreSQL...');
    
    // إعداد Neon للإنتاج
    neonConfig.fetchConnectionCache = true;
    
    const pool = new Pool({ 
      connectionString: databaseUrl,
      ...CONNECTION_CONFIG.postgresql
    });
    
    // اختبار الاتصال
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    const db = drizzleNeon({ client: pool, schema: pgSchema });
    
    console.log('✅ تم الاتصال بـ PostgreSQL بنجاح');
    
    return {
      db: db as PostgresDatabase,
      type: 'postgresql',
      isConnected: true,
      close: () => pool.end(),
      healthCheck: async () => {
        try {
          const client = await pool.connect();
          await client.query('SELECT 1');
          client.release();
          return true;
        } catch {
          return false;
        }
      }
    };
  } catch (error) {
    console.warn('⚠️  فشل الاتصال بـ PostgreSQL:', error.message);
    return null;
  }
}

// إنشاء اتصال SQLite
function createSQLiteConnection(dbPath: string = './chat.db'): DatabaseAdapter {
  try {
    console.log('🔄 إنشاء اتصال SQLite...');
    
    // إنشاء مجلد قاعدة البيانات إذا لم يكن موجوداً
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir) && dbDir !== '.') {
      mkdirSync(dbDir, { recursive: true });
    }
    
    const sqlite = new Database(dbPath, CONNECTION_CONFIG.sqlite);
    const db = drizzleSqlite(sqlite, { schema: sqliteSchema });
    
    console.log('✅ تم إنشاء اتصال SQLite بنجاح');
    
    return {
      db: db as SqliteDatabase,
      type: 'sqlite',
      isConnected: true,
      close: () => sqlite.close(),
      healthCheck: async () => {
        try {
          sqlite.prepare('SELECT 1').get();
          return true;
        } catch {
          return false;
        }
      }
    };
  } catch (error) {
    console.error('❌ فشل في إنشاء اتصال SQLite:', error);
    throw error;
  }
}

// إنشاء محول قاعدة البيانات مع التبديل التلقائي
export async function createDatabaseAdapter(): Promise<DatabaseAdapter> {
  const databaseUrl = process.env.DATABASE_URL;
  
  // محاولة PostgreSQL أولاً إذا كان الرابط محدد
  if (databaseUrl && (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://'))) {
    const pgAdapter = await tryPostgreSQLConnection(databaseUrl);
    if (pgAdapter) {
      return pgAdapter;
    }
    console.log('🔄 التبديل إلى SQLite كبديل...');
  }
  
  // استخدام SQLite كبديل
  let dbPath = './chat.db';
  if (databaseUrl && databaseUrl.startsWith('sqlite:')) {
    dbPath = databaseUrl.replace('sqlite:', '');
  }
  
  return createSQLiteConnection(dbPath);
}

// إنشاء المحول الافتراضي
let dbAdapter: DatabaseAdapter | null = null;

export async function initializeDatabaseAdapter(): Promise<DatabaseAdapter> {
  if (!dbAdapter) {
    dbAdapter = await createDatabaseAdapter();
  }
  return dbAdapter;
}

// الحصول على المحول الحالي
export function getDatabaseAdapter(): DatabaseAdapter | null {
  return dbAdapter;
}

// دالة للتحقق من حالة قاعدة البيانات
export async function checkDatabaseHealth(): Promise<{
  isHealthy: boolean;
  type: string;
  error?: string;
}> {
  try {
    if (!dbAdapter) {
      return { isHealthy: false, type: 'none', error: 'لم يتم تهيئة قاعدة البيانات' };
    }
    
    const isHealthy = await dbAdapter.healthCheck();
    return {
      isHealthy,
      type: dbAdapter.type,
      error: isHealthy ? undefined : 'فشل في فحص الصحة'
    };
  } catch (error) {
    return {
      isHealthy: false,
      type: dbAdapter?.type || 'unknown',
      error: error.message
    };
  }
}

// دالة للحصول على حالة قاعدة البيانات
export function getDatabaseStatus() {
  return {
    connected: dbAdapter?.isConnected || false,
    type: dbAdapter?.type || 'none',
    url: process.env.DATABASE_URL ? '***محددة***' : 'غير محددة',
    environment: process.env.NODE_ENV || 'development'
  };
}

// دالة للإغلاق الآمن
export async function closeDatabaseConnection(): Promise<void> {
  if (dbAdapter?.close) {
    await dbAdapter.close();
    dbAdapter = null;
    console.log('🔌 تم إغلاق اتصال قاعدة البيانات');
  }
}

// تصدير المحول والقاعدة للتوافق مع الكود الموجود
export const db = dbAdapter?.db || null;
export const dbType = dbAdapter?.type || 'none';