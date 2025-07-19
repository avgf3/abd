import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import * as schema from "../shared/schema";
import type { NeonQueryResultHKT } from 'drizzle-orm/neon-serverless';
import type { PgDatabase } from 'drizzle-orm/pg-core';

// تعريف نوع قاعدة البيانات المبسط - PostgreSQL فقط
export type DatabaseType = PgDatabase<NeonQueryResultHKT, typeof schema>;

// واجهة موحدة للعمليات
export interface DatabaseAdapter {
  db: DatabaseType | null;
  type: 'postgresql' | 'memory';
  close?: () => void;
}

// إنشاء محول قاعدة البيانات - PostgreSQL فقط
export function createDatabaseAdapter(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.warn("⚠️  DATABASE_URL غير محدد، استخدام وضع الذاكرة");
    return {
      db: null,
      type: 'memory'
    };
  }

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
    console.error("❌ فشل في الاتصال بقاعدة البيانات، استخدام وضع الذاكرة:", error);
    return {
      db: null,
      type: 'memory'
    };
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
    // اختبار PostgreSQL فقط
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
    type: dbType === 'postgresql' ? 'PostgreSQL' : 'Memory',
    url: process.env.DATABASE_URL ? '***محددة***' : 'غير محددة',
    environment: process.env.NODE_ENV || 'development'
  };
}