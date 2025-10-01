#!/usr/bin/env node
import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const sql = postgres(url, { ssl: url.includes('sslmode=require') ? 'require' : undefined });
  try {
    // Ensure table exists
    const exists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'conversation_reads'
      ) as exists
    `;
    if (!exists?.[0]?.exists) {
      console.error('conversation_reads table does not exist');
      process.exit(2);
    }

    // Check unique index on (user_id, other_user_id)
    const idx = await sql`
      SELECT indexname FROM pg_indexes WHERE tablename = 'conversation_reads'
    `;
    const names = (idx || []).map((r) => r.indexname);
    if (!names.some((n) => n.includes('idx_conversation_reads_user_other'))) {
      console.error('Missing unique index idx_conversation_reads_user_other');
      process.exit(3);
    }

    // Roundtrip upsert
    const now = new Date();
    const userId = 1;
    const otherUserId = 2;
    await sql`
      INSERT INTO conversation_reads (user_id, other_user_id, last_read_at, last_read_message_id, created_at, updated_at)
      VALUES (${userId}, ${otherUserId}, ${now}, 123, NOW(), NOW())
      ON CONFLICT (user_id, other_user_id)
      DO UPDATE SET last_read_at = EXCLUDED.last_read_at, last_read_message_id = EXCLUDED.last_read_message_id, updated_at = NOW();
    `;
    const rows = await sql`
      SELECT user_id, other_user_id, last_read_at, last_read_message_id
      FROM conversation_reads WHERE user_id = ${userId} AND other_user_id = ${otherUserId}
      LIMIT 1
    `;
    if (!rows || !rows[0]) {
      console.error('Upsert verification failed');
      process.exit(4);
    }
    console.log('✅ conversation_reads verified:', rows[0]);
  } finally {
    try { await sql.end({ timeout: 5 }); } catch {}
  }
}

main().catch((e) => {
  console.error('Verification error:', e);
  process.exit(10);
});