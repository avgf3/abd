// تبسيط الأمور - إما قاعدة بيانات أو null
let db: any = null;
let dbType: string = 'memory';

if (process.env.DATABASE_URL) {
  try {
    const { Pool, neonConfig } = require('@neondatabase/serverless');
    const { drizzle } = require('drizzle-orm/neon-serverless');
    const schema = require("../shared/schema");
    
    neonConfig.fetchConnectionCache = true;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
    dbType = 'postgresql';
    console.log("✅ تم الاتصال بقاعدة بيانات PostgreSQL");
  } catch (error) {
    console.error("❌ فشل في الاتصال بقاعدة البيانات:", error);
    db = null;
    dbType = 'memory';
  }
} else {
  console.log("📝 تشغيل في وضع الذاكرة فقط - لا توجد DATABASE_URL");
  db = null;
  dbType = 'memory';
}

export { db, dbType };

// دوال مساعدة
export async function checkDatabaseHealth(): Promise<boolean> {
  if (!db) return false;
  try {
    await db.execute('SELECT 1' as any);
    return true;
  } catch (error) {
    return false;
  }
}

export function getDatabaseStatus() {
  return {
    connected: !!db,
    type: db ? 'PostgreSQL' : 'Memory',
    url: process.env.DATABASE_URL ? '***محددة***' : 'غير محددة',
    environment: process.env.NODE_ENV || 'development'
  };
}

// للتوافق مع الكود الموجود
export const pool = null;
export const sqlite = null;