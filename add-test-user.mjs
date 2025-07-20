import { Pool } from '@neondatabase/serverless';

async function addTestUser() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    console.log('💡 This script should be run in production environment (Render)');
    process.exit(1);
  }

  console.log('🔄 Adding test user "عبود" to database...');
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Check if user already exists
    console.log('🧪 Checking if user "عبود" already exists...');
    const existingUser = await pool.query(`
      SELECT id, username, password 
      FROM users 
      WHERE username = $1
    `, ['عبود']);
    
    if (existingUser.rows.length > 0) {
      console.log('✅ User "عبود" already exists:');
      existingUser.rows.forEach(user => {
        console.log(`  - ID: ${user.id}, Username: "${user.username}"`);
        console.log(`  - Password: ${user.password}`);
      });
      
      // Update password if different
      if (existingUser.rows[0].password !== '22333') {
        console.log('🔄 Updating password to "22333"...');
        await pool.query(`
          UPDATE users 
          SET password = $1 
          WHERE username = $2
        `, ['22333', 'عبود']);
        console.log('✅ Password updated successfully');
      } else {
        console.log('✅ Password is already correct');
      }
      
      await pool.end();
      return;
    }

    // Add new user
    console.log('🔧 Adding new user "عبود"...');
    
    const insertQuery = `
      INSERT INTO users (
        username, 
        password, 
        user_type, 
        role,
        profile_image,
        join_date,
        created_at,
        is_online
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), false)
      RETURNING id, username, user_type, role
    `;
    
    const result = await pool.query(insertQuery, [
      'عبود',           // username
      '22333',          // password
      'member',         // user_type
      'member',         // role
      '/default_avatar.svg' // profile_image
    ]);
    
    if (result.rows.length > 0) {
      console.log('✅ User "عبود" added successfully:');
      result.rows.forEach(user => {
        console.log(`  - ID: ${user.id}, Username: "${user.username}", Type: ${user.user_type}, Role: ${user.role}`);
      });
    }

    // Verify the user was added
    console.log('🧪 Verifying user was added...');
    const verifyUser = await pool.query(`
      SELECT id, username, password, user_type, role
      FROM users 
      WHERE username = $1
    `, ['عبود']);
    
    if (verifyUser.rows.length > 0) {
      console.log('✅ Verification successful:');
      verifyUser.rows.forEach(user => {
        console.log(`  - ID: ${user.id}, Username: "${user.username}"`);
        console.log(`  - Password: ${user.password}`);
        console.log(`  - Type: ${user.user_type}, Role: ${user.role}`);
      });
    }

    await pool.end();
    console.log('✅ User addition completed successfully!');
    console.log('🔄 You can now try logging in with username "عبود" and password "22333"');
    
  } catch (error) {
    console.error('❌ Error adding user:', error);
    console.error('Full error details:', error.message);
    process.exit(1);
  }
}

// Run the script
addTestUser().catch(error => {
  console.error('💥 Critical error:', error);
  process.exit(1);
});