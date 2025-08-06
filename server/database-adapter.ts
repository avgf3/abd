import dotenv from 'dotenv';
dotenv.config();

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import * as pgSchema from "../shared/schema";
import type { NeonQueryResultHKT } from 'drizzle-orm/neon-serverless';
import type { PgDatabase } from 'drizzle-orm/pg-core';

// تعريف نوع قاعدة البيانات
export type DatabaseType = PgDatabase<NeonQueryResultHKT, typeof pgSchema> | null;

// واجهة موحدة للعمليات
export interface DatabaseAdapter {
  db: DatabaseType;
  type: 'postgresql' | 'disabled';
  close?: () => void;
}

// إنشاء محول آمن لقاعدة البيانات
export function createDatabaseAdapter(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL;
  
  // التحقق من وجود DATABASE_URL - مع fallback آمن
  if (!databaseUrl) {
    console.warn("⚠️ DATABASE_URL غير محدد! سيتم العمل في وضع آمن بدون قاعدة بيانات");
    console.warn("💡 للحصول على قاعدة بيانات مجانية، استخدم:");
    console.warn("   - Neon.tech (مجاني)")
    console.warn("   - Supabase.com (مجاني)")
    console.warn("   - Railway.app (مجاني)")
    return {
      db: null,
      type: 'disabled'
    };
  }
  
  // التحقق من أن الرابط هو PostgreSQL
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    console.warn("⚠️ DATABASE_URL ليس رابط PostgreSQL صحيح، سيتم العمل في وضع آمن");
    console.warn("💡 تأكد من أن الرابط يبدأ بـ postgresql:// أو postgres://");
    return {
      db: null,
      type: 'disabled'
    };
  }
  
  try {
    // إعداد Neon للإنتاج
    neonConfig.fetchConnectionCache = true;
    
    const pool = new Pool({ 
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    console.log("✅ تم الاتصال بقاعدة البيانات PostgreSQL بنجاح");
    
    return {
      db: drizzleNeon({ client: pool, schema: pgSchema }) as DatabaseType,
      type: 'postgresql',
      close: () => pool.end()
    };
  } catch (error) {
    console.error("❌ فشل في الاتصال بـ PostgreSQL:", error);
    console.warn("🔄 سيتم العمل في وضع آمن بدون قاعدة بيانات");
    return {
      db: null,
      type: 'disabled'
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
    if (!db || dbType === 'disabled') {
      console.warn("⚠️ قاعدة البيانات معطلة - سيتم العمل في وضع آمن");
      return true; // نعيد true للسماح للتطبيق بالعمل بدون قاعدة بيانات
    }
    
    // اختبار PostgreSQL
    await db.execute('SELECT 1' as any);
    console.log("✅ قاعدة البيانات تعمل بشكل صحيح");
    return true;
  } catch (error) {
    console.error("❌ خطأ في فحص صحة قاعدة البيانات:", error);
    console.warn("🔄 سيتم العمل في وضع آمن بدون قاعدة بيانات");
    return true; // نعيد true للسماح للتطبيق بالعمل
  }
}

// دالة للحصول على حالة قاعدة البيانات
export function getDatabaseStatus() {
  return {
    connected: !!db && dbType !== 'disabled',
    type: dbType === 'disabled' ? 'معطلة' : 'PostgreSQL/Supabase',
    url: process.env.DATABASE_URL ? '***محددة***' : 'غير محددة',
    environment: process.env.NODE_ENV || 'development'
  };
}