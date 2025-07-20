import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

function fixSQLiteDatabase() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const dbPath = path.join(dataDir, 'chatapp.db');
    
    if (!fs.existsSync(dbPath)) {
      console.log('✅ No existing SQLite database found - will be created fresh');
      return;
    }

    console.log('🔄 Fixing existing SQLite database...');
    const db = new Database(dbPath);

    // Get current table structure
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    console.log('📋 Current columns:');
    tableInfo.forEach(col => console.log(`  - ${col.name} (${col.type})`));

    // Check if role column exists
    const roleExists = tableInfo.some(col => col.name === 'role');
    
    if (!roleExists) {
      console.log('🔧 Adding missing role column...');
      db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'guest'");
      
      // Update existing users to set role = user_type
      db.exec("UPDATE users SET role = COALESCE(user_type, 'guest')");
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
      { name: 'ignored_users', type: 'TEXT DEFAULT \'[]\'' }
    ];

    for (const column of missingColumns) {
      const columnExists = tableInfo.some(col => col.name === column.name);
      
      if (!columnExists) {
        console.log(`🔧 Adding missing ${column.name} column...`);
        try {
          db.exec(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
          console.log(`✅ ${column.name} column added successfully`);
        } catch (error) {
          console.log(`⚠️ Could not add ${column.name}: ${error.message}`);
        }
      } else {
        console.log(`✅ ${column.name} column already exists`);
      }
    }

    // Verify final structure
    const finalTableInfo = db.prepare("PRAGMA table_info(users)").all();
    console.log('📋 Final table structure:');
    finalTableInfo.forEach(col => console.log(`  - ${col.name} (${col.type})`));

    // Check existing users
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log(`👥 Total users in database: ${userCount.count}`);

    const users = db.prepare('SELECT id, username, user_type, role FROM users LIMIT 10').all();
    console.log('📊 Sample users:');
    users.forEach(user => {
      console.log(`  - ID: ${user.id}, Username: ${user.username}, Type: ${user.user_type}, Role: ${user.role}`);
    });

    db.close();
    console.log('✅ SQLite database fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing SQLite database:', error);
  }
}

// Run the fix
fixSQLiteDatabase();