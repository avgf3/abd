import postgres from 'postgres';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

console.log('🚀 Starting production database points system fix...');

async function fixProductionDatabase() {
  const sql = postgres(DATABASE_URL, { max: 1 });
  
  try {
    console.log('📋 Checking current database structure...');
    
    // Check if points columns exist
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('points', 'level', 'total_points', 'level_progress')
    `;
    
    const existingColumns = columnCheck.map(row => row.column_name);
    console.log('📋 Existing points columns:', existingColumns);
    
    // Add missing points columns
    const columnsToAdd = [
      { name: 'points', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0' },
      { name: 'level', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1' },
      { name: 'total_points', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0' },
      { name: 'level_progress', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS level_progress INTEGER DEFAULT 0' }
    ];
    
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        console.log(`➕ Adding column: ${column.name}`);
        await sql.unsafe(column.sql);
        console.log(`✅ Added column: ${column.name}`);
      } else {
        console.log(`✅ Column ${column.name} already exists`);
      }
    }
    
    // Create points_history table if it doesn't exist
    console.log('📋 Creating points_history table...');
    await sql`
      CREATE TABLE IF NOT EXISTS points_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ points_history table ready');
    
    // Create level_settings table if it doesn't exist
    console.log('📋 Creating level_settings table...');
    await sql`
      CREATE TABLE IF NOT EXISTS level_settings (
        id SERIAL PRIMARY KEY,
        level INTEGER NOT NULL UNIQUE,
        required_points INTEGER NOT NULL,
        title TEXT NOT NULL,
        color TEXT DEFAULT '#FFFFFF',
        benefits JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ level_settings table ready');
    
    // Initialize default level settings
    console.log('📋 Setting up default level settings...');
    const levelSettingsCheck = await sql`SELECT COUNT(*) as count FROM level_settings`;
    if (levelSettingsCheck[0].count === '0') {
      const defaultLevels = [
        { level: 1, required_points: 0, title: 'مبتدئ', color: '#A8A8A8' },
        { level: 2, required_points: 100, title: 'متفاعل', color: '#90EE90' },
        { level: 3, required_points: 300, title: 'نشيط', color: '#87CEEB' },
        { level: 4, required_points: 600, title: 'متميز', color: '#DDA0DD' },
        { level: 5, required_points: 1000, title: 'خبير', color: '#F0E68C' },
        { level: 6, required_points: 1500, title: 'محترف', color: '#FFA500' },
        { level: 7, required_points: 2500, title: 'أسطورة', color: '#FF6347' },
        { level: 8, required_points: 4000, title: 'عبقري', color: '#FF1493' },
        { level: 9, required_points: 6000, title: 'ملك', color: '#FFD700' },
        { level: 10, required_points: 10000, title: 'إمبراطور', color: '#8A2BE2' }
      ];
      
      for (const levelData of defaultLevels) {
        await sql`
          INSERT INTO level_settings (level, required_points, title, color, benefits)
          VALUES (${levelData.level}, ${levelData.required_points}, ${levelData.title}, ${levelData.color}, '{}')
        `;
      }
      console.log('✅ Default level settings created');
    } else {
      console.log('✅ Level settings already exist');
    }
    
    // Update existing users with default points values
    console.log('📋 Updating existing users with default points...');
    await sql`
      UPDATE users 
      SET 
        points = COALESCE(points, 0),
        level = COALESCE(level, 1),
        total_points = COALESCE(total_points, 0),
        level_progress = COALESCE(level_progress, 0)
      WHERE points IS NULL OR level IS NULL OR total_points IS NULL OR level_progress IS NULL
    `;
    console.log('✅ Users updated with default points values');
    
    // Verify the fix
    console.log('🔍 Verifying database structure...');
    const finalCheck = await sql`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('points', 'level', 'total_points', 'level_progress')
      ORDER BY column_name
    `;
    
    console.log('✅ Points system columns in users table:');
    finalCheck.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (default: ${col.column_default})`);
    });
    
    // Check table counts
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    const pointsHistoryCount = await sql`SELECT COUNT(*) as count FROM points_history`;
    const levelSettingsCount = await sql`SELECT COUNT(*) as count FROM level_settings`;
    
    console.log('\n📊 Database statistics:');
    console.log(`  - Users: ${userCount[0].count}`);
    console.log(`  - Points history records: ${pointsHistoryCount[0].count}`);
    console.log(`  - Level settings: ${levelSettingsCount[0].count}`);
    
    console.log('\n🎉 Production database points system fix completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Restart your application');
    console.log('  2. Test the points system functionality');
    console.log('  3. Monitor the logs for any remaining errors');
    
  } catch (error) {
    console.error('❌ Error fixing production database:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the fix
fixProductionDatabase().catch(error => {
  console.error('💥 Failed to fix production database:', error);
  process.exit(1);
});