import dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  console.log('🔄 Running production migrations...');

  try {
    // إعدادات محسنة للاتصال بقاعدة البيانات على Render
    const sslRequired = /\bsslmode=require\b/.test(databaseUrl) || process.env.NODE_ENV === 'production';
    
    // إضافة معاملات SSL إذا لم تكن موجودة في production
    let connectionString = databaseUrl;
    if (process.env.NODE_ENV === 'production' && !connectionString.includes('sslmode=')) {
      connectionString += connectionString.includes('?') ? '&sslmode=require' : '?sslmode=require';
    }
    
    const client = postgres(connectionString, {
      ssl: sslRequired ? 'require' : undefined,
      prepare: true,
      onnotice: () => {},
      fetch_types: false,
      types: false,
      connection: {
        application_name: 'chat-app-migrations',
      },
    });

    const db = drizzle(client);

    // Run migrations
    await migrate(db, { migrationsFolder: './migrations' });

    console.log('✅ Migrations completed successfully!');

    await client.end();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations().catch(console.error);
