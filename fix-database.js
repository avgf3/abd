const { Pool } = require('@neondatabase/serverless');

async function fixDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  console.log('🔄 Connecting to database...');
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
      { name: 'profile_background_color', type: 'TEXT DEFAULT \'#3c0d0d\'' },
      { name: 'username_color', type: 'TEXT DEFAULT \'#FFFFFF\'' },
      { name: 'user_theme', type: 'TEXT DEFAULT \'default\'' },
      { name: 'bio', type: 'TEXT' },
      { name: 'ignored_users', type: 'TEXT[] DEFAULT \'{}\''}
    ];

    for (const column of missingColumns) {
      const checkColumn = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name=$1
      `, [column.name]);

      if (checkColumn.rows.length === 0) {
        console.log(`🔧 Adding missing ${column.name} column...`);
        await pool.query(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
        console.log(`✅ ${column.name} column added successfully`);
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
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Check existing users
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Total users in database: ${userCount.rows[0].count}`);

    const users = await pool.query('SELECT id, username, user_type, role FROM users LIMIT 10');
    console.log('📊 Sample users:');
    users.rows.forEach(user => {
      console.log(`  - ID: ${user.id}, Username: ${user.username}, Type: ${user.user_type}, Role: ${user.role}`);
    });

    console.log('✅ Database fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixDatabase().catch(console.error);