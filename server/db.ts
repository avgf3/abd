import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import * as schema from "../shared/schema";

// إعداد قاعدة البيانات مع معالجة أخطاء متقدمة
function initializeDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL غير محدد في متغيرات البيئة");
    console.log("💡 يرجى إنشاء ملف .env وإضافة DATABASE_URL");
    console.log("📝 مثال: DATABASE_URL=postgresql://username:password@host:port/dbname");
    
    // في بيئة التطوير، نستخدم SQLite
    if (process.env.NODE_ENV === 'development') {
      console.warn("⚠️  استخدام SQLite للتطوير");
      try {
        const sqlite = new Database('./dev.db');
        // إعداد SQLite للعمل بشكل أفضل
        sqlite.pragma('journal_mode = WAL');
        sqlite.pragma('synchronous = NORMAL');
        sqlite.pragma('cache_size = 1000');
        sqlite.pragma('temp_store = memory');
        
        // إنشاء wrapper لدعم الدوال المطلوبة
        const sqliteWrapper = {
          ...sqlite,
          run: (query: string, params?: any[]) => {
            return sqlite.prepare(query).run(params || []);
          },
          get: (query: string, params?: any[]) => {
            return sqlite.prepare(query).get(params || []);
          },
          all: (query: string, params?: any[]) => {
            return sqlite.prepare(query).all(params || []);
          }
        };
        
        const drizzleDb = drizzleSqlite(sqlite, { schema });
        console.log("✅ تم الاتصال بقاعدة بيانات SQLite للتطوير");
        return { pool: null, db: drizzleDb, sqlite: sqliteWrapper };
      } catch (error) {
        console.error("❌ فشل في إنشاء قاعدة بيانات SQLite:", error);
        return null;
      }
    }
    
    // في بيئة الإنتاج، نرمي خطأ
    throw new Error(
      "DATABASE_URL مطلوب في بيئة الإنتاج. يرجى تحديد DATABASE_URL في متغيرات البيئة."
    );
  }

  try {
    const pool = new Pool({ connectionString: databaseUrl });
    console.log("✅ تم الاتصال بقاعدة البيانات بنجاح");
    return { pool, db: drizzle({ client: pool, schema }), sqlite: null };
  } catch (error) {
    console.error("❌ فشل في الاتصال بقاعدة البيانات:", error);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn("⚠️  تشغيل وضع التطوير بدون قاعدة بيانات");
      return null;
    }
    
    throw error;
  }
}

const dbConnection = initializeDatabase();

export const pool = dbConnection?.pool;
export const db = dbConnection?.db;
export const sqlite = dbConnection?.sqlite;

// دالة للتحقق من حالة قاعدة البيانات
export async function checkDatabaseHealth(): Promise<boolean> {
  if (!db) {
    return false;
  }
  
  try {
    if (sqlite) {
      // اختبار SQLite
      sqlite.prepare('SELECT 1').get();
      return true;
    } else if (pool) {
      // اختبار PostgreSQL
      await pool.query('SELECT 1');
      return true;
    }
    return false;
  } catch (error) {
    console.error("❌ خطأ في فحص صحة قاعدة البيانات:", error);
    return false;
  }
}

// دالة للحصول على حالة قاعدة البيانات
export function getDatabaseStatus() {
  return {
    connected: !!db,
    type: sqlite ? 'SQLite' : 'PostgreSQL',
    url: process.env.DATABASE_URL ? '***محددة***' : 'غير محددة',
    environment: process.env.NODE_ENV || 'development'
  };
}