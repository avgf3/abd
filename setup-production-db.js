import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

// Database configuration for production
const setupProductionDatabase = () => {
  console.log('🔧 إعداد قاعدة البيانات للإنتاج...\n');

  // Check if we have a DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  لم يتم العثور على DATABASE_URL في متغيرات البيئة');
    console.log('📝 سنقوم بإنشاء ملف .env مع قاعدة بيانات SQLite للتطوير\n');

    // Create .env file with SQLite configuration for development
    const envContent = `# Database Configuration
DATABASE_URL=sqlite://./data/chat.db

# Server Configuration
PORT=5000
NODE_ENV=development

# Session Secret
SESSION_SECRET=your-super-secret-session-key-${Date.now()}

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Socket.IO Configuration
SOCKET_TIMEOUT=30000
`;

    fs.writeFileSync(path.join(__dirname, '.env'), envContent);
    console.log('✅ تم إنشاء ملف .env مع إعدادات SQLite للتطوير');
    console.log('\n📌 للإنتاج، يجب عليك:');
    console.log('1. إنشاء قاعدة بيانات PostgreSQL (Supabase, Neon, أو أي خدمة أخرى)');
    console.log('2. تحديث DATABASE_URL في .env بعنوان قاعدة البيانات الخاصة بك');
    console.log('3. تشغيل npm run db:migrate للإنتاج\n');
  } else {
    console.log('✅ تم العثور على DATABASE_URL');
    console.log(`📊 نوع قاعدة البيانات: ${process.env.DATABASE_URL.includes('postgresql') ? 'PostgreSQL' : 'SQLite'}`);
  }

  // Create necessary directories
  const directories = ['uploads', 'uploads/profiles', 'uploads/banners', 'data'];
  
  directories.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 تم إنشاء مجلد: ${dir}`);
    }
  });

  console.log('\n✅ إعداد قاعدة البيانات مكتمل!');
  console.log('\n🚀 لبدء التطبيق:');
  console.log('   - للتطوير: npm run dev');
  console.log('   - للإنتاج: npm run build && npm start');
};

// Update database adapter to support SQLite
const updateDatabaseAdapter = () => {
  const adapterPath = path.join(__dirname, 'server', 'database-adapter-improved.ts');
  
  const improvedAdapter = `import dotenv from 'dotenv';
dotenv.config();

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import * as pgSchema from "../shared/schema";
import type { NeonQueryResultHKT } from 'drizzle-orm/neon-serverless';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

// تعريف نوع قاعدة البيانات
export type DatabaseType = PgDatabase<NeonQueryResultHKT, typeof pgSchema> | BetterSQLite3Database<typeof pgSchema> | null;

// واجهة موحدة للعمليات
export interface DatabaseAdapter {
  db: DatabaseType;
  type: 'postgresql' | 'sqlite' | 'disabled';
  close?: () => void;
}

// إنشاء محول آمن لقاعدة البيانات
export function createDatabaseAdapter(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL;
  
  // التحقق من وجود DATABASE_URL
  if (!databaseUrl) {
    console.warn("⚠️ DATABASE_URL غير محدد! سيتم العمل في وضع آمن بدون قاعدة بيانات");
    return {
      db: null,
      type: 'disabled'
    };
  }
  
  // التحقق من نوع قاعدة البيانات
  if (databaseUrl.startsWith('sqlite://')) {
    try {
      const dbPath = databaseUrl.replace('sqlite://', '');
      const sqlite = new Database(dbPath);
      const db = drizzleSqlite(sqlite, { schema: pgSchema });
      
      console.log("✅ تم الاتصال بقاعدة البيانات SQLite بنجاح");
      
      return {
        db: db as DatabaseType,
        type: 'sqlite',
        close: () => sqlite.close()
      };
    } catch (error) {
      console.error("❌ فشل في الاتصال بـ SQLite:", error);
      return {
        db: null,
        type: 'disabled'
      };
    }
  }
  
  // PostgreSQL
  if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
    try {
      neonConfig.fetchConnectionCache = true;
      
      const pool = new Pool({ connectionString: databaseUrl });
      const db = drizzleNeon({ client: pool, schema: pgSchema });
      
      console.log("✅ تم الاتصال بقاعدة البيانات PostgreSQL بنجاح");
      
      return {
        db: db as DatabaseType,
        type: 'postgresql',
        close: () => pool.end()
      };
    } catch (error) {
      console.error("❌ فشل في الاتصال بـ PostgreSQL:", error);
      return {
        db: null,
        type: 'disabled'
      };
    }
  }
  
  console.warn("⚠️ DATABASE_URL غير صحيح، سيتم العمل في وضع آمن");
  return {
    db: null,
    type: 'disabled'
  };
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
    
    // اختبار الاتصال
    if (dbType === 'sqlite') {
      await (db as any).get('SELECT 1');
    } else {
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
  return {
    connected: !!db && dbType !== 'disabled',
    type: dbType === 'disabled' ? 'معطلة' : dbType === 'sqlite' ? 'SQLite' : 'PostgreSQL/Supabase',
    url: process.env.DATABASE_URL ? '***محددة***' : 'غير محددة',
    environment: process.env.NODE_ENV || 'development'
  };
}
`;

  fs.writeFileSync(adapterPath, improvedAdapter);
  console.log('✅ تم تحديث database adapter لدعم SQLite و PostgreSQL');
};

// Run setup
setupProductionDatabase();
updateDatabaseAdapter();