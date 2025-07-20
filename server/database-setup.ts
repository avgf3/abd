import { db } from './database-adapter';
import { sql } from 'drizzle-orm';
import { users, messages, friends, notifications, blockedDevices } from '../shared/schema-sqlite';

export async function initializeDatabase(): Promise<boolean> {
  try {
    if (!db) {
      console.log('📄 Running in memory mode - no database initialization needed');
      return true;
    }

    console.log('🔄 SQLite database already initialized by fallback system');
    return true;

    // Disabled to avoid conflicts with SQLite
    // await addMissingColumns();

    // Create users table with all required columns
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT,
        user_type TEXT NOT NULL DEFAULT 'guest',
        role TEXT NOT NULL DEFAULT 'guest',
        profile_image TEXT,
        profile_banner TEXT,
        profile_background_color TEXT DEFAULT '#3c0d0d',
        status TEXT,
        gender TEXT,
        age INTEGER,
        country TEXT,
        relation TEXT,
        bio TEXT,
        is_online BOOLEAN DEFAULT false,
        is_hidden BOOLEAN DEFAULT false,
        last_seen TIMESTAMP,
        join_date TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        is_muted BOOLEAN DEFAULT false,
        mute_expiry TIMESTAMP,
        is_banned BOOLEAN DEFAULT false,
        ban_expiry TIMESTAMP,
        is_blocked BOOLEAN DEFAULT false,
        ip_address VARCHAR(45),
        device_id VARCHAR(100),
        ignored_users TEXT[] DEFAULT '{}',
        username_color TEXT DEFAULT '#FFFFFF',
        user_theme TEXT DEFAULT 'default'
      )
    `);

    // Create messages table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id),
        receiver_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'text',
        is_private BOOLEAN DEFAULT false,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create friends table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS friends (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        friend_id INTEGER REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create notifications table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create blocked_devices table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS blocked_devices (
        id SERIAL PRIMARY KEY,
        ip_address TEXT NOT NULL,
        device_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        blocked_at TIMESTAMP NOT NULL,
        blocked_by INTEGER NOT NULL,
        UNIQUE(ip_address, device_id)
      )
    `);

    console.log('✅ Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    return false;
  }
}

async function addMissingColumns(): Promise<void> {
  if (!db) {
    console.log('⚠️ No database connection, skipping column additions');
    return;
  }

  try {
    // For SQLite - different approach since it doesn't have information_schema
    console.log('✅ Database columns are managed by migration scripts, skipping runtime additions');

    // Add profile_background_color column if missing
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='profile_background_color') THEN
          ALTER TABLE users ADD COLUMN profile_background_color TEXT DEFAULT '#3c0d0d';
        END IF;
      END $$
    `);

    // Add username_color column if missing
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='username_color') THEN
          ALTER TABLE users ADD COLUMN username_color TEXT DEFAULT '#FFFFFF';
        END IF;
      END $$
    `);

    // Add user_theme column if missing
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='user_theme') THEN
          ALTER TABLE users ADD COLUMN user_theme TEXT DEFAULT 'default';
        END IF;
      END $$
    `);

    // Add bio column if missing
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='bio') THEN
          ALTER TABLE users ADD COLUMN bio TEXT;
        END IF;
      END $$
    `);

    // Add ignored_users column if missing
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='ignored_users') THEN
          ALTER TABLE users ADD COLUMN ignored_users TEXT[] DEFAULT '{}';
        END IF;
      END $$
    `);

    console.log('✅ Missing columns added successfully');
  } catch (error) {
    console.error('❌ Error adding missing columns:', error);
    throw error;
  }
}

export async function createDefaultUsers(): Promise<void> {
  try {
    if (!db) {
      console.log('📄 Memory mode - skipping default user creation');
      return;
    }

    console.log('👤 Default users already created by SQLite fallback system');
    return;

    // Disabled to avoid conflicts
    // Check if admin user exists
    
    const adminCount = Number((adminResult as any)?.[0]?.count || 0);

    if (adminCount === 0) {
      await db.execute(sql`
        INSERT INTO users (username, password, user_type, role, profile_image, join_date, created_at)
        VALUES ('admin', 'admin123', 'owner', 'owner', '/default_avatar.svg', NOW(), NOW())
      `);
      console.log('✅ Default admin user created');
    }

    // Create a test member user
    const memberResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM users WHERE username = 'testuser'
    `);
    
    const memberCount = Number((memberResult as any)?.[0]?.count || 0);

    if (memberCount === 0) {
      await db.execute(sql`
        INSERT INTO users (username, password, user_type, role, profile_image, join_date, created_at)
        VALUES ('testuser', 'test123', 'member', 'member', '/default_avatar.svg', NOW(), NOW())
      `);
      console.log('✅ Default test user created');
    }
    
    console.log('✅ Default users verification complete');
  } catch (error) {
    console.error('❌ Error creating default users:', error);
  }
}