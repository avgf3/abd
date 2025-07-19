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
    try {
      await db.execute(sql`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name='users' AND column_name='role') THEN
            ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'guest';
            UPDATE users SET role = user_type WHERE role IS NULL;
            ALTER TABLE users ALTER COLUMN role SET NOT NULL;
          END IF;
        END $$
      `);
      console.log('✅ Role column added successfully');
    } catch (error) {
      console.error('❌ Error adding role column:', error);
      // Try alternative approach
      try {
        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'guest'`);
        await db.execute(sql`UPDATE users SET role = user_type WHERE role IS NULL OR role = ''`);
        console.log('✅ Role column added with alternative method');
      } catch (altError) {
        console.error('❌ Alternative method also failed:', altError);
      }
    }

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
      console.log('📄 Database not available - skipping user creation');
      return;
    }

    console.log('🔍 Ensuring owner عبود exists...');

    // Check if owner exists
    const ownerExists = await db.execute(sql`
      SELECT COUNT(*) as count FROM users WHERE username = 'عبود'
    `);

    const count = (ownerExists as any)?.[0]?.count || 0;
    
    if (count === 0) {
      console.log('➕ Creating owner عبود...');
      
      // Create owner عبود
      await db.execute(sql`
        INSERT INTO users (
          username, password, user_type, role, profile_image, 
          join_date, created_at, profile_background_color, username_color, user_theme,
          is_online, is_hidden, is_muted, is_banned, is_blocked, ignored_users
        ) VALUES (
          'عبود', '22333', 'owner', 'owner', '/default_avatar.svg',
          NOW(), NOW(), '#3c0d0d', '#FFFFFF', 'default',
          false, false, false, false, false, '[]'
        )
      `);
      
      console.log('✅ Owner عبود created successfully');
    } else {
      console.log('✅ Owner عبود already exists');
      
      // Update password and role to make sure they're correct
      await db.execute(sql`
        UPDATE users 
        SET password = '22333', user_type = 'owner', role = 'owner'
        WHERE username = 'عبود'
      `);
      
      console.log('✅ Owner عبود updated successfully');
    }
    
  } catch (error) {
    console.error('❌ Error ensuring owner exists:', error);
  }
}