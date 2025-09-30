#!/usr/bin/env node
require('dotenv').config();

const { Pool } = require('@neondatabase/serverless');

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL غير محدد');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    console.log('🔍 فحص أعمدة messages (text_color, bold)...');
    const res = await client.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema='public' AND table_name='messages' 
         AND column_name IN ('text_color','bold')`
    );
    const existing = new Set(res.rows.map((r) => r.column_name));

    const actions = [];
    if (!existing.has('text_color')) {
      actions.push(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS text_color TEXT`);
    }
    if (!existing.has('bold')) {
      actions.push(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS bold BOOLEAN DEFAULT false`);
    }
    // Always ensure index (idempotent)
    actions.push(`CREATE INDEX IF NOT EXISTS idx_messages_text_styling ON messages(text_color, bold)`);

    for (const sql of actions) {
      await client.query(sql);
    }

    // Re-check
    const after = await client.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns 
       WHERE table_schema='public' AND table_name='messages'
       ORDER BY ordinal_position`
    );

    const hasTextColor = after.rows.some((r) => r.column_name === 'text_color');
    const hasBold = after.rows.some((r) => r.column_name === 'bold');
    console.log('✅ التحقق بعد التطبيق:');
    console.log(JSON.stringify({ hasTextColor, hasBold }, null, 2));

    if (!hasTextColor || !hasBold) {
      console.error('❌ لم يتم إنشاء الأعمدة المطلوبة بالكامل');
      process.exit(2);
    }

    console.log('🎉 تم ضمان أعمدة تنسيق النص للرسائل بنجاح');
  } catch (e) {
    console.error('❌ فشل في تطبيق أعمدة تنسيق النص:', e.message || e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

