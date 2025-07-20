import { Pool } from '@neondatabase/serverless';

async function testSupabaseConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    return;
  }

  console.log('🔄 Testing Supabase connection...');
  console.log('🔗 Database URL preview:', databaseUrl.substring(0, 50) + '...');

  try {
    const pool = new Pool({ connectionString: databaseUrl });
    
    // Test basic connection
    console.log('🧪 Testing basic connection...');
    const testQuery = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Connection successful!', testQuery.rows[0]);

    // Check if users table exists
    console.log('🧪 Checking users table...');
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'users'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.error('❌ Users table does not exist!');
      return;
    }
    console.log('✅ Users table exists');

    // Check table structure
    console.log('🧪 Checking table structure...');
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Count total users
    console.log('🧪 Counting users...');
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Total users: ${userCount.rows[0].count}`);

    // Search for specific user "عبود"
    console.log('🧪 Searching for user "عبود"...');
    const userSearch = await pool.query(`
      SELECT id, username, user_type, password 
      FROM users 
      WHERE username = $1
    `, ['عبود']);
    
    if (userSearch.rows.length > 0) {
      console.log('✅ User "عبود" found:');
      userSearch.rows.forEach(user => {
        console.log(`  - ID: ${user.id}, Username: ${user.username}, Type: ${user.user_type}`);
        console.log(`  - Password set: ${user.password ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('❌ User "عبود" not found');
      
      // Show all users for debugging
      console.log('🔍 All users in database:');
      const allUsers = await pool.query('SELECT id, username, user_type FROM users LIMIT 10');
      allUsers.rows.forEach(user => {
        console.log(`  - ID: ${user.id}, Username: "${user.username}", Type: ${user.user_type}`);
      });
    }

    await pool.end();
    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Connection test failed:', error);
    console.error('Error details:', error.message);
  }
}

// Run the test
testSupabaseConnection().catch(console.error);