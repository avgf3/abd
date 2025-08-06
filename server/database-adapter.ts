import dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as pgSchema from "../shared/schema";
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import type { PgDatabase } from 'drizzle-orm/pg-core';

// تعريف نوع قاعدة البيانات
export type DatabaseType = PgDatabase<PostgresJsQueryResultHKT, typeof pgSchema> | null;

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
    return {
      db: null,
      type: 'disabled'
    };
  }
  
  // التحقق من أن الرابط هو PostgreSQL
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    console.warn("⚠️ DATABASE_URL ليس رابط PostgreSQL صحيح، سيتم العمل في وضع آمن");
    return {
      db: null,
      type: 'disabled'
    };
  }
  
  try {
    // إعداد postgres للإنتاج
    const sql = postgres(databaseUrl, {
      ssl: 'require',
      connection: {
        application_name: 'chat-app'
      }
    });
    
    const db = drizzle(sql, { schema: pgSchema });
    
    console.log("✅ تم الاتصال بقاعدة البيانات PostgreSQL بنجاح");
    
    return {
      db: db as DatabaseType,
      type: 'postgresql',
      close: () => sql.end()
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
      return false;
    }
    
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
    connected: !!db && dbType !== 'disabled',
    type: dbType === 'disabled' ? 'معطلة' : 'PostgreSQL/Supabase',
    url: process.env.DATABASE_URL ? '***محددة***' : 'غير محددة',
    environment: process.env.NODE_ENV || 'development'
  };
}