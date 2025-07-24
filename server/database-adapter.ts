import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import * as pgSchema from "../shared/schema";
import type { NeonQueryResultHKT } from 'drizzle-orm/neon-serverless';
import type { PgDatabase } from 'drizzle-orm/pg-core';

// تعريف نوع قاعدة البيانات - PostgreSQL فقط
export type DatabaseType = PgDatabase<NeonQueryResultHKT, typeof pgSchema>;

// واجهة موحدة للعمليات
export interface DatabaseAdapter {
  db: DatabaseType | null;
  type: 'postgresql';
  close?: () => void;
}

// إنشاء محول قاعدة البيانات - PostgreSQL على Supabase فقط
export function createDatabaseAdapter(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL;
  
  // التحقق من وجود DATABASE_URL
  if (!databaseUrl) {
    throw new Error("❌ DATABASE_URL غير محدد! يجب إضافة رابط PostgreSQL من Supabase في ملف .env");
  }
  
  // التحقق من أن الرابط هو PostgreSQL
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    throw new Error("❌ DATABASE_URL يجب أن يكون رابط PostgreSQL من Supabase");
  }
  
  try {
    // إعداد Neon للإنتاج
    neonConfig.fetchConnectionCache = true;
    
    const pool = new Pool({ connectionString: databaseUrl });
    const db = drizzleNeon({ client: pool, schema: pgSchema });
    
    console.log("✅ تم الاتصال بقاعدة بيانات PostgreSQL على Supabase");
    
    return {
      db: db as DatabaseType,
      type: 'postgresql',
      close: () => pool.end()
    };
  } catch (error) {
    console.error("❌ فشل في الاتصال بـ PostgreSQL على Supabase:", error);
    throw new Error(`فشل الاتصال بـ Supabase: ${error}`);
  }
}

// إنشاء المحول الافتراضي
export const dbAdapter = createDatabaseAdapter();
export const db = dbAdapter.db;
export const dbType = dbAdapter.type;

// دالة للتحقق من حالة قاعدة البيانات
export async function checkDatabaseHealth(): Promise<boolean> {
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

// دالة للحصول على حالة قاعدة البيانات
export function getDatabaseStatus() {
  return {
    connected: !!db,
    type: 'PostgreSQL/Supabase',
    url: process.env.DATABASE_URL ? '***محددة***' : 'غير محددة',
    environment: process.env.NODE_ENV || 'development'
  };
}