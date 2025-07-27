import dotenv from 'dotenv';
dotenv.config();

// محول مرن يدعم SQLite و PostgreSQL
export function createFlexibleDatabaseAdapter() {
  const databaseUrl = process.env.DATABASE_URL;
  
  console.log('🔍 فحص رابط قاعدة البيانات...');
  console.log('DATABASE_URL type:', databaseUrl ? 'موجود' : 'غير موجود');
  
  if (!databaseUrl) {
    console.log('⚠️ DATABASE_URL غير محدد، سيتم استخدام قاعدة بيانات مؤقتة');
    return createMemoryDatabase();
  }
  
  if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
    console.log('🐘 استخدام PostgreSQL/Supabase');
    return createPostgreSQLAdapter(databaseUrl);
  } else if (databaseUrl.startsWith('sqlite:')) {
    console.log('🗃️ استخدام SQLite');
    return createSQLiteAdapter(databaseUrl);
  } else {
    console.log('❓ نوع قاعدة بيانات غير معروف، استخدام ذاكرة مؤقتة');
    return createMemoryDatabase();
  }
}

function createPostgreSQLAdapter(url: string) {
  try {
    const { Pool, neonConfig } = require('@neondatabase/serverless');
    const { drizzle } = require('drizzle-orm/neon-serverless');
    const pgSchema = require("../../shared/schema");
    
    neonConfig.fetchConnectionCache = true;
    const pool = new Pool({ connectionString: url });
    const db = drizzle({ client: pool, schema: pgSchema });
    
    return {
      db,
      type: 'postgresql',
      close: () => pool.end()
    };
  } catch (error) {
    console.error('❌ خطأ PostgreSQL:', error);
    return createMemoryDatabase();
  }
}

function createSQLiteAdapter(url: string) {
  try {
    const Database = require('better-sqlite3');
    const { drizzle } = require('drizzle-orm/better-sqlite3');
    const sqliteSchema = require("../../shared/schema");
    
    const dbPath = url.replace('sqlite:', '');
    const sqlite = new Database(dbPath);
    const db = drizzle({ client: sqlite, schema: sqliteSchema });
    
    return {
      db,
      type: 'sqlite',
      close: () => sqlite.close()
    };
  } catch (error) {
    console.error('❌ خطأ SQLite:', error);
    return createMemoryDatabase();
  }
}

function createMemoryDatabase() {
  console.log('🧠 إنشاء قاعدة بيانات ذاكرة مؤقتة للاختبار');
  
  // محاكاة بسيطة لقاعدة البيانات
  let users: any[] = [
    {
      id: 1,
      username: 'المالك',
      userType: 'owner',
      isOnline: true,
      profileImage: null,
      level: 1,
      points: 0,
      createdAt: new Date()
    }
  ];
  
  let messages: any[] = [];
  
  return {
    db: {
      select: () => ({
        from: (table: any) => ({
          where: (condition: any) => users.filter(() => true),
          orderBy: (order: any) => users
        })
      }),
      insert: () => ({
        values: (data: any) => ({
          returning: () => [data]
        })
      })
    },
    type: 'memory',
    getAllUsers: () => Promise.resolve(users),
    getOnlineUsers: () => Promise.resolve(users.filter(u => u.isOnline)),
    createMessage: (msg: any) => Promise.resolve({ ...msg, id: Date.now() }),
    close: () => {}
  };
}

export const dbAdapter = createFlexibleDatabaseAdapter();