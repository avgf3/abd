/*
  Safe bot IDs migration:
  - Drops FK constraints that block bot ID remapping
  - Remaps messages.sender_id and message_reactions.user_id for bot senders
  - Shifts bots.id by +1,000,000 and resets sequence
  - Adds range checks for users/bots IDs
*/
const dotenv = require('dotenv');
dotenv.config();

const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  const run = async (sql, params = []) => {
    try {
      await client.query(sql, params);
    } catch (e) {
      throw e;
    }
  };

  const tryRun = async (sql, params = []) => {
    try {
      await client.query(sql, params);
    } catch (_) {
      // ignore
    }
  };

  try {
    console.log('⏳ Starting safe bot IDs migration...');
    await run('BEGIN');

    // 1) Drop blocking FK constraints (only those referencing users)
    const fkRows1 = await client.query(
      `SELECT c.conname AS name
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       WHERE t.relname = 'messages' AND c.contype = 'f' AND c.confrelid = 'users'::regclass;`
    );
    for (const row of fkRows1.rows) {
      console.log(`🔧 Dropping FK on messages: ${row.name}`);
      await run(`ALTER TABLE messages DROP CONSTRAINT ${row.name};`);
    }

    const fkRows2 = await client.query(
      `SELECT c.conname AS name
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       WHERE t.relname = 'message_reactions' AND c.contype = 'f' AND c.confrelid = 'users'::regclass;`
    );
    for (const row of fkRows2.rows) {
      console.log(`🔧 Dropping FK on message_reactions: ${row.name}`);
      await run(`ALTER TABLE message_reactions DROP CONSTRAINT ${row.name};`);
    }

    // 2) Shift message-related references for bot senders first
    console.log('🔁 Updating message_reactions.user_id for bots...');
    await run(
      `UPDATE message_reactions
       SET user_id = user_id + 1000000
       WHERE user_id IN (SELECT id FROM bots)`
    );

    console.log('🔁 Updating messages.sender_id for bots...');
    await run(
      `UPDATE messages
       SET sender_id = sender_id + 1000000
       WHERE sender_id IN (SELECT id FROM bots)`
    );

    // 3) Shift bots primary keys
    console.log('🚚 Shifting bots.id by +1,000,000...');
    await run(`UPDATE bots SET id = id + 1000000`);

    console.log('🔢 Resetting bots_id_seq to new max...');
    await run(`SELECT setval('bots_id_seq', (SELECT MAX(id) FROM bots))`);

    // 4) Add range checks (drop then add to avoid conflicts)
    console.log('🛡️  Applying range constraints...');
    await tryRun(`ALTER TABLE bots DROP CONSTRAINT IF EXISTS check_bot_id_range`);
    await tryRun(`ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_id_range`);
    await run(`ALTER TABLE bots ADD CONSTRAINT check_bot_id_range CHECK (id >= 1000000)`);
    await run(`ALTER TABLE users ADD CONSTRAINT check_user_id_range CHECK (id < 1000000)`);

    await run('COMMIT');
    console.log('✅ Safe bot IDs migration completed successfully.');
  } catch (e) {
    try { await run('ROLLBACK'); } catch {}
    console.error('❌ Migration failed:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();

