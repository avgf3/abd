import dotenv from 'dotenv';
dotenv.config();

import { Pool } from '@neondatabase/serverless';

async function checkProductionDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  console.log('🔍 Checking production database connection...');

  try {
    const pool = new Pool({ connectionString: databaseUrl });

    // Test connection
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful!');
    console.log(`📅 Current time: ${result.rows[0].current_time}`);

    // Check tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📊 Tables in database:');
    tables.rows.forEach((table) => {
      console.log(`  - ${table.table_name}`);
    });

    // Check users count
    try {
      const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log(`👥 Total users: ${userCount.rows[0].count}`);
    } catch (error) {
      console.log("⚠️ Users table not accessible or doesn't exist");
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

checkProductionDatabase().catch(console.error);
