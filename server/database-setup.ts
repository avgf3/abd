import { db } from './database-adapter';
import { sql } from 'drizzle-orm';
import { users, messages, friends, notifications, blockedDevices } from '../shared/schema';

export async function initializeDatabase(): Promise<boolean> {
  try {
    if (!db) {
      console.log('📄 Running in memory mode - no database initialization needed');
      return true;
    }

    console.log('🔄 Initializing database tables...');

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

    // Add missing columns to existing tables if they don't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='role') THEN
          ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'guest';
        END IF;
      END $$
    `);

    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='profile_background_color') THEN
          ALTER TABLE users ADD COLUMN profile_background_color TEXT DEFAULT '#3c0d0d';
        END IF;
      END $$
    `);

    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='username_color') THEN
          ALTER TABLE users ADD COLUMN username_color TEXT DEFAULT '#FFFFFF';
        END IF;
      END $$
    `);

    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='user_theme') THEN
          ALTER TABLE users ADD COLUMN user_theme TEXT DEFAULT 'default';
        END IF;
      END $$
    `);

    console.log('✅ Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    return false;
  }
}

export async function createDefaultUsers(): Promise<void> {
  try {
    if (!db) {
      console.log('📄 Memory mode - skipping default user creation');
      return;
    }

    // Check if admin user exists
    const adminExists = await db.execute(sql`
      SELECT COUNT(*) as count FROM users WHERE username = 'admin'
    `);

    if ((adminExists as any)?.[0]?.count === 0) {
      await db.execute(sql`
        INSERT INTO users (username, password, user_type, role, profile_image, join_date, created_at)
        VALUES ('admin', 'admin123', 'owner', 'owner', '/default_avatar.svg', NOW(), NOW())
      `);
      console.log('✅ Default admin user created');
    }

    // Create a test member user
    const memberExists = await db.execute(sql`
      SELECT COUNT(*) as count FROM users WHERE username = 'testuser'
    `);

    if ((memberExists as any)?.[0]?.count === 0) {
      await db.execute(sql`
        INSERT INTO users (username, password, user_type, role, profile_image, join_date, created_at)
        VALUES ('testuser', 'test123', 'member', 'member', '/default_avatar.svg', NOW(), NOW())
      `);
      console.log('✅ Default test user created');
    }
  } catch (error) {
    console.error('❌ Error creating default users:', error);
  }
}