#!/usr/bin/env node

/**
 * Migration Script: Add text styling fields to messages table
 * This script adds textColor and bold fields to support text styling in messages
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL or POSTGRES_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function applyMigration() {
  console.log('🔄 Starting migration: Add text styling fields to messages...');

  const client = await pool.connect();

  try {
    // Add textColor column
    console.log('  ➤ Adding text_color column...');
    await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS text_color TEXT`);
    console.log('  ✅ text_color column added');

    // Add bold column
    console.log('  ➤ Adding bold column...');
    await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS bold BOOLEAN DEFAULT false`);
    console.log('  ✅ bold column added');

    // Create index for better query performance
    console.log('  ➤ Creating index for text styling...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_text_styling ON messages(text_color, bold)`);
    console.log('  ✅ Index created');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });