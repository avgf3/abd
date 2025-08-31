import { Pool } from '@neondatabase/serverless';

async function fixProductionDatabase() {
  // Use production DATABASE_URL from Render environment
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    console.log('💡 This script should be run in production environment (Render)');
    process.exit(1);
  }

  console.log('🔄 Connecting to production database...');
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Check if role column exists
    const checkRoleColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='role'
    `);

    if (checkRoleColumn.rows.length === 0) {
      console.log('🔧 Adding missing role column...');
      await pool.query(`
        ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'guest'
      `);

      // Update existing users to set role = user_type
      await pool.query(`
        UPDATE users SET role = COALESCE(user_type, 'guest')
      `);

      console.log('✅ Role column added successfully');
    } else {
      console.log('✅ Role column already exists');
    }

    // Check and add other missing columns
    const missingColumns = [
      { name: 'profile_background_color', type: "TEXT DEFAULT '#ffffff'" },
      { name: 'username_color', type: "TEXT DEFAULT '#FFFFFF'" },
      { name: 'user_theme', type: "TEXT DEFAULT 'default'" },
      { name: 'bio', type: 'TEXT' },
      { name: 'ignored_users', type: "TEXT DEFAULT '[]'" },
    ];

    for (const column of missingColumns) {
      const checkColumn = await pool.query(
        `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name=$1
      `,
        [column.name]
      );

      if (checkColumn.rows.length === 0) {
        console.log(`🔧 Adding missing ${column.name} column...`);
        try {
          await pool.query(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
          console.log(`✅ ${column.name} column added successfully`);
        } catch (colError) {
          console.log(`⚠️ Could not add ${column.name}: ${colError.message}`);
        }
      } else {
        console.log(`✅ ${column.name} column already exists`);
      }
    }

    // Verify database structure
    console.log('🔍 Verifying database structure...');
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name='users'
      ORDER BY ordinal_position
    `);

    console.log('📋 Users table columns:');
    columns.rows.forEach((col) => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Check existing users
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Total users in database: ${userCount.rows[0].count}`);

    if (userCount.rows[0].count > 0) {
      const users = await pool.query('SELECT id, username, user_type, role FROM users LIMIT 10');
      console.log('📊 Sample users:');
      users.rows.forEach((user) => {
        console.log(
          `  - ID: ${user.id}, Username: ${user.username}, Type: ${user.user_type}, Role: ${user.role}`
        );
      });
    }

    console.log('✅ Production database fix completed successfully!');
    console.log('🔄 Please restart the application for changes to take effect');
  } catch (error) {
    console.error('❌ Error fixing production database:', error);
    console.error('Full error details:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixProductionDatabase().catch((error) => {
  console.error('💥 Critical error:', error);
  process.exit(1);
});
