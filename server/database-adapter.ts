import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import * as schema from "../shared/schema-sqlite";
import type { NeonQueryResultHKT } from 'drizzle-orm/neon-serverless';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { initSQLiteFallback } from './database-fallback';

// تعريف نوع قاعدة البيانات المبسط - PostgreSQL أو SQLite
export type DatabaseType = PgDatabase<NeonQueryResultHKT, typeof schema> | any;

// واجهة موحدة للعمليات
export interface DatabaseAdapter {
  db: DatabaseType | null;
  type: 'postgresql' | 'sqlite' | 'memory';
  close?: () => void;
}

// إنشاء محول قاعدة البيانات - SQLite أولاً ثم PostgreSQL كبديل
export function createDatabaseAdapter(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL;
  
  // استخدم SQLite إذا كان الرابط يبدأ بـ sqlite: أو كان فارغاً
  if (!databaseUrl || databaseUrl.startsWith('sqlite:')) {
    try {
      const sqliteResult = initSQLiteFallback();
      if (sqliteResult) {
        console.log("✅ تم الاتصال بقاعدة بيانات SQLite");
        return {
          db: sqliteResult.db,
          type: 'sqlite',
          close: () => {} // SQLite will be closed separately
        };
      }
    } catch (error) {
      console.error("❌ فشل في تهيئة SQLite:", error);
    }
  }
  
  // Try PostgreSQL if URL is provided and not SQLite
  if (databaseUrl && !databaseUrl.startsWith('sqlite:')) {
    try {
      // إعداد Neon للإنتاج
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
      console.error("❌ فشل في الاتصال بـ PostgreSQL، محاولة SQLite:", error);
      
      // Fall back to SQLite
      try {
        const sqliteResult = initSQLiteFallback();
        if (sqliteResult) {
          console.log("✅ تم الاتصال بقاعدة بيانات SQLite (كبديل)");
          return {
            db: sqliteResult.db,
            type: 'sqlite',
            close: () => {} // SQLite will be closed separately
          };
        }
      } catch (error) {
        console.error("❌ فشل في تهيئة SQLite:", error);
      }
    }
  }

  // Fall back to memory mode
  console.warn("⚠️  استخدام وضع الذاكرة - لن يتم حفظ البيانات");
  return {
    db: null,
    type: 'memory'
  };
}

// إنشاء المحول الافتراضي
export const dbAdapter = createDatabaseAdapter();
export const db = dbAdapter.db;
export const dbType = dbAdapter.type;

// دالة للتحقق من حالة قاعدة البيانات
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (!db) return false;
    
    if (dbType === 'sqlite') {
      // اختبار SQLite
      await db.execute('SELECT 1' as any);
    } else {
      // اختبار PostgreSQL
      await db.execute('SELECT 1' as any);
    }
    return true;
  } catch (error) {
    console.error("❌ خطأ في فحص صحة قاعدة البيانات:", error);
    return false;
  }
}

// دالة للحصول على حالة قاعدة البيانات
export function getDatabaseStatus() {
  let typeDisplay = 'Memory';
  if (dbType === 'postgresql') typeDisplay = 'PostgreSQL';
  else if (dbType === 'sqlite') typeDisplay = 'SQLite';

  return {
    connected: !!db,
    type: typeDisplay,
    url: process.env.DATABASE_URL ? '***محددة***' : 'غير محددة',
    environment: process.env.NODE_ENV || 'development'
  };
}