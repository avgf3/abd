import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import * as schema from "../shared/schema";
import type { NeonQueryResultHKT } from 'drizzle-orm/neon-serverless';
import type { PgDatabase } from 'drizzle-orm/pg-core';

// تعريف نوع قاعدة البيانات المبسط - PostgreSQL فقط
export type DatabaseType = PgDatabase<NeonQueryResultHKT, typeof schema>;

// واجهة موحدة للعمليات
export interface DatabaseAdapter {
  db: DatabaseType;
  type: 'postgresql';
  close?: () => void;
}

// إنشاء محول قاعدة البيانات - PostgreSQL فقط
export function createDatabaseAdapter(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    // في حالة عدم وجود DATABASE_URL، استخدم قاعدة بيانات تجريبية
    console.warn("⚠️  DATABASE_URL غير محدد، استخدام قاعدة بيانات تجريبية");
    
    // يمكن استخدام قاعدة بيانات تجريبية مؤقتة أو رمي خطأ
    const testUrl = "postgresql://test:test@localhost:5432/test";
    
    try {
      neonConfig.fetchConnectionCache = true;
      const pool = new Pool({ connectionString: testUrl });
      const db = drizzleNeon({ client: pool, schema });
      
      console.log("⚠️  تم إنشاء اتصال تجريبي - يرجى تعيين DATABASE_URL");
      
      return {
        db: db as DatabaseType,
        type: 'postgresql',
        close: () => pool.end()
      };
    } catch (error) {
      console.error("❌ فشل في إنشاء الاتصال التجريبي:", error);
      throw new Error("DATABASE_URL مطلوب. يرجى تحديد DATABASE_URL في متغيرات البيئة.");
    }
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
    console.error("❌ فشل في الاتصال بقاعدة البيانات:", error);
    throw error;
  }
}

// إنشاء المحول الافتراضي
export const dbAdapter = createDatabaseAdapter();
export const db = dbAdapter.db;
export const dbType = dbAdapter.type;

// دالة للتحقق من حالة قاعدة البيانات
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
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
    type: 'PostgreSQL',
    url: process.env.DATABASE_URL ? '***محددة***' : 'غير محددة',
    environment: process.env.NODE_ENV || 'development'
  };
}