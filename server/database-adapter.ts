import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import * as pgSchema from "../shared/schema";
import * as sqliteSchema from "../shared/schema-sqlite";
import type { NeonQueryResultHKT } from 'drizzle-orm/neon-serverless';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { initSQLiteFallback } from './database-fallback';

// تعريف نوع قاعدة البيانات المبسط - PostgreSQL أو SQLite
export type DatabaseType = PgDatabase<NeonQueryResultHKT, typeof pgSchema> | any;

// واجهة موحدة للعمليات
export interface DatabaseAdapter {
  db: DatabaseType | null;
  type: 'postgresql' | 'sqlite' | 'memory';
  close?: () => void;
}

// إنشاء محول قاعدة البيانات - PostgreSQL أولاً مع public schema
export function createDatabaseAdapter(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL;
  
  // محاولة PostgreSQL أولاً إذا كان الرابط موجود
  if (databaseUrl && databaseUrl.startsWith('postgresql')) {
    try {
      console.log("🔄 محاولة الاتصال بـ PostgreSQL مع schema public...");
      
      // إعداد Neon للإنتاج مع public schema
      neonConfig.fetchConnectionCache = true;
      
      const pool = new Pool({ 
        connectionString: databaseUrl,
        // تحديد schema public بشكل صريح
        options: {
          schema: 'public'
        }
      });
      
      const db = drizzleNeon({ 
        client: pool, 
        schema: pgSchema,
        // التأكد من استخدام public schema
        schemaFilter: ['public']
      });
      
      console.log("✅ تم الاتصال بقاعدة بيانات PostgreSQL مع schema public");
      
      return {
        db: db as DatabaseType,
        type: 'postgresql',
        close: () => pool.end()
      };
    } catch (error) {
      console.error("❌ فشل في الاتصال بـ PostgreSQL:", error);
      console.log("💡 تأكد من:");
      console.log("   1. تشغيل خادم PostgreSQL");
      console.log("   2. صحة رابط قاعدة البيانات في .env");
      console.log("   3. وجود schema public في قاعدة البيانات");
      
      // Fall back to SQLite if PostgreSQL fails
      console.log("🔄 محاولة التحول إلى SQLite...");
    }
  }
  
  // استخدم SQLite كبديل إذا كان الرابط يبدأ بـ sqlite: أو إذا فشل PostgreSQL
  if (!databaseUrl || databaseUrl.startsWith('sqlite:') || !databaseUrl.startsWith('postgresql')) {
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

  // Fall back to memory mode
  console.warn("⚠️  استخدام وضع الذاكرة - لن يتم حفظ البيانات");
  console.log("💡 لاستخدام PostgreSQL، تأكد من:");
  console.log("   DATABASE_URL=postgresql://username:password@localhost:5432/database_name");
  
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
    } else if (dbType === 'postgresql') {
      // اختبار PostgreSQL مع public schema
      await db.execute('SELECT 1 FROM information_schema.tables LIMIT 1' as any);
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
  if (dbType === 'postgresql') typeDisplay = 'PostgreSQL (public schema)';
  else if (dbType === 'sqlite') typeDisplay = 'SQLite';

  return {
    connected: !!db,
    type: typeDisplay,
    url: process.env.DATABASE_URL ? '***محددة***' : 'غير محددة',
    environment: process.env.NODE_ENV || 'development',
    schema: dbType === 'postgresql' ? 'public' : 'default'
  };
}