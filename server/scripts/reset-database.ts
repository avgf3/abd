import 'dotenv/config';
import postgres from 'postgres';

async function reset() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const sql = postgres(url, { ssl: url.includes('localhost') ? false : 'require' });
  try {
    console.log('🔄 Resetting database...');
    // Disable triggers if needed
    await sql`SET session_replication_role = replica`;

    // Collect table names in public schema (exclude drizzle migrations if desired)
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `;

    // Truncate all tables
    const names = tables.map((t: any) => t.table_name).filter((n: string) => !!n);
    if (names.length > 0) {
      const identList = names.map((n: string) => sql(n));
      await sql.unsafe(`TRUNCATE TABLE ${names.map((n) => '"' + n + '"').join(', ')} RESTART IDENTITY CASCADE`);
      console.log('✅ Truncated tables:', names.join(', '));
    }

    // Re-enable triggers
    await sql`SET session_replication_role = DEFAULT`;
    console.log('🎉 Database reset complete');
  } catch (e: any) {
    console.error('❌ Reset failed:', e?.message || e);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

reset();