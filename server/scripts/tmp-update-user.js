// Create a small script to update a user in Postgres
import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const sql = postgres(url, { ssl: url.includes('localhost') ? false : 'require' });
  try {
    const username = process.argv[2] || 'olduser';
    const newPassword = process.argv[3] || 'legacy123';
    const newType = process.argv[4] || 'guest';
    const res = await sql`
      UPDATE users SET password = ${newPassword}, user_type = ${newType}
      WHERE username = ${username}
      RETURNING id, username, user_type, password
    `;
  } catch (e) {
    console.error('Update failed:', e.message || e);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
