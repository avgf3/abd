import postgres from 'postgres';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, {
    ssl: databaseUrl.includes('localhost') ? false : 'require',
    max: 1,
  });

  try {
    console.log('🔧 Ensuring rooms columns...');

    await sql.unsafe(`CREATE EXTENSION IF NOT EXISTS citext;`);

    await sql.unsafe(`
      ALTER TABLE IF EXISTS rooms
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    `);

    await sql.unsafe(`
      ALTER TABLE IF EXISTS rooms
        ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
    `);

    await sql.unsafe(`
      ALTER TABLE IF EXISTS rooms
        ADD COLUMN IF NOT EXISTS slug CITEXT;
    `);

    await sql.unsafe(`
      ALTER TABLE IF EXISTS rooms
        ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
    `);

    await sql.unsafe(`
      ALTER TABLE IF NOT EXISTS rooms
        ADD COLUMN IF NOT EXISTS chat_lock_all BOOLEAN DEFAULT FALSE;
    `);

    await sql.unsafe(`
      ALTER TABLE IF NOT EXISTS rooms
        ADD COLUMN IF NOT EXISTS chat_lock_visitors BOOLEAN DEFAULT FALSE;
    `);

    await sql.unsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_rooms_slug_active
        ON rooms (slug)
        WHERE deleted_at IS NULL AND slug IS NOT NULL;
    `);

    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms (deleted_at) WHERE deleted_at IS NULL;
    `);

    console.log('✅ Rooms columns ensured.');
  } catch (e: any) {
    console.error('❌ Failed ensuring rooms columns:', e?.message || e);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();