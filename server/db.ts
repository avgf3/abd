import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

// إعداد قاعدة البيانات مع معالجة أخطاء متقدمة
function initializeDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL غير محدد في متغيرات البيئة");
    console.log("💡 يرجى إنشاء ملف .env وإضافة DATABASE_URL");
    console.log("📝 مثال: DATABASE_URL=postgresql://username:password@host:port/dbname");
    
    // في بيئة التطوير، نستخدم قاعدة بيانات وهمية
    if (process.env.NODE_ENV === 'development') {
      console.warn("⚠️  استخدام وضع التطوير بدون قاعدة بيانات - سيتم حفظ البيانات في الذاكرة فقط");
      return null;
    }
    
    // في بيئة الإنتاج، نرمي خطأ
    throw new Error(
      "DATABASE_URL مطلوب في بيئة الإنتاج. يرجى تحديد DATABASE_URL في متغيرات البيئة."
    );
  }

  try {
    const pool = new Pool({ connectionString: databaseUrl });
    console.log("✅ تم الاتصال بقاعدة البيانات بنجاح");
    return { pool, db: drizzle({ client: pool, schema }) };
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

// دالة للتحقق من حالة قاعدة البيانات
export async function checkDatabaseHealth(): Promise<boolean> {
  if (!db || !pool) {
    return false;
  }
  
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error("❌ خطأ في فحص صحة قاعدة البيانات:", error);
    return false;
  }
}

// دالة للحصول على حالة قاعدة البيانات
export function getDatabaseStatus() {
  return {
    connected: !!db && !!pool,
    url: process.env.DATABASE_URL ? '***محددة***' : 'غير محددة',
    environment: process.env.NODE_ENV || 'development'
  };
}