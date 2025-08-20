import dotenv from 'dotenv';
dotenv.config();

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  console.log('🔄 Running production migrations...');

  try {
    const pool = new Pool({ connectionString: databaseUrl });
    const db = drizzle(pool);

    // Run migrations
    await migrate(db, { migrationsFolder: './migrations' });

    console.log('✅ Migrations completed successfully!');

    await pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations().catch(console.error);
