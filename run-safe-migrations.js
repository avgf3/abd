import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

async function runSafeMigrations() {
  console.log('🚀 بدء تشغيل migrations بشكل آمن...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const db = drizzle(pool);
    
    console.log('📦 تشغيل migrations...');
    await migrate(db, { 
      migrationsFolder: path.join(__dirname, 'migrations') 
    });
    
    console.log('✅ تم تشغيل migrations بنجاح!');
  } catch (error) {
    // التعامل مع أخطاء "already exists"
    if (error.message?.includes('already exists') || 
        error.code === '42P07' || 
        error.message?.includes('relation')) {
      console.log('⚠️ تم تخطي migration - الجداول موجودة بالفعل');
    } else {
      console.error('❌ خطأ في تشغيل migrations:', error);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

// تشغيل migrations
runSafeMigrations().catch(console.error);