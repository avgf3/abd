import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { initSQLiteFallback } from './database-fallback';

// تعريف نوع قاعدة البيانات المبسط - PostgreSQL أو SQLite
export type DatabaseType = NodePgDatabase<typeof schema> | any;

// واجهة موحدة للعمليات
export interface DatabaseAdapter {
  db: DatabaseType | null;
  type: 'postgresql' | 'sqlite' | 'memory';
  close?: () => void;
}

// إنشاء محول قاعدة البيانات - Supabase PostgreSQL مع SQLite كبديل
export function createSupabaseDatabaseAdapter(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL;
  
  // Try Supabase PostgreSQL first if URL is provided
  if (databaseUrl) {
    try {
      // استخدام pg عادي للاتصال بـ Supabase
      const pool = new Pool({ 
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false } // مطلوب لـ Supabase
      });
      
      const db = drizzle(pool, { schema });
      
      console.log("✅ تم الاتصال بقاعدة بيانات Supabase PostgreSQL");
      
      return {
        db: db as DatabaseType,
        type: 'postgresql',
        close: () => pool.end()
      };
    } catch (error) {
      console.error("❌ فشل في الاتصال بـ Supabase، محاولة SQLite:", error);
    }
  }

  // Try SQLite as fallback
  try {
    const sqliteResult = initSQLiteFallback();
    if (sqliteResult) {
      return {
        db: sqliteResult.db,
        type: 'sqlite',
        close: () => {} // SQLite will be closed separately
      };
    }
  } catch (error) {
    console.error("❌ فشل في تهيئة SQLite:", error);
  }

  // Fall back to memory mode
  console.warn("⚠️  استخدام وضع الذاكرة - لن يتم حفظ البيانات");
  return {
    db: null,
    type: 'memory'
  };
}

// دالة للتحقق من حالة قاعدة البيانات
export async function checkSupabaseDatabaseHealth(db: any): Promise<boolean> {
  try {
    if (!db) return false;
    // اختبار PostgreSQL
    await db.execute('SELECT 1' as any);
    return true;
  } catch (error) {
    console.error("❌ خطأ في فحص صحة قاعدة البيانات:", error);
    return false;
  }
}