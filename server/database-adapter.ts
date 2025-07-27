import dotenv from 'dotenv';
dotenv.config();

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
  isConnected: boolean;
  close?: () => void;
  healthCheck: () => Promise<boolean>;
}

// إعدادات الاتصال المحسنة
const CONNECTION_CONFIG = {
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 20,
  min: 2,
  ssl: { 
    rejectUnauthorized: false,
    mode: 'require'
  }
};

// إنشاء محول قاعدة البيانات - PostgreSQL فقط
export function createDatabaseAdapter(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL;
  
  // التحقق من وجود DATABASE_URL
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL غير محدد! يجب إضافة رابط PostgreSQL في ملف .env");
    return {
      db: null,
      type: 'postgresql',
      isConnected: false,
      healthCheck: async () => false
    };
  }
  
  // التحقق من أن الرابط هو PostgreSQL
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    console.error("❌ DATABASE_URL يجب أن يكون رابط PostgreSQL صحيح");
    return {
      db: null,
      type: 'postgresql',
      isConnected: false,
      healthCheck: async () => false
    };
  }
  
  try {
    // إعداد Neon للإنتاج
    neonConfig.fetchConnectionCache = true;
    
    const pool = new Pool({ 
      connectionString: databaseUrl,
      ...CONNECTION_CONFIG
    });
    
    const db = drizzleNeon({ client: pool, schema: pgSchema });
    
    return {
      db: db as DatabaseType,
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
    console.error("❌ فشل في الاتصال بـ PostgreSQL على Supabase:", error);
    return {
      db: null,
      type: 'postgresql',
      isConnected: false,
      healthCheck: async () => false
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
    connected: dbAdapter.isConnected,
    type: 'PostgreSQL/Supabase',
    url: process.env.DATABASE_URL ? '***محددة***' : 'غير محددة',
    environment: process.env.NODE_ENV || 'development',
    health: dbAdapter.healthCheck()
  };
}

// دالة إعادة الاتصال
export async function reconnectDatabase(): Promise<boolean> {
  try {
    if (dbAdapter.close) {
      await dbAdapter.close();
    }
    
    const newAdapter = createDatabaseAdapter();
    if (newAdapter.isConnected) {
      Object.assign(dbAdapter, newAdapter);
      return true;
    }
    return false;
  } catch (error) {
    console.error("❌ فشل في إعادة الاتصال:", error);
    return false;
  }
}