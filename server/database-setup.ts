import { db, dbType } from './database-adapter';
import { sql } from 'drizzle-orm';
import { users, messages, friends, notifications, blockedDevices } from '../shared/schema';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export async function initializeDatabase(): Promise<boolean> {
  try {
    if (!db) {
      console.log('📄 Running in memory mode - no database initialization needed');
      return true;
    }

    console.log('🔄 Initializing database tables...');
    
    // Create tables for SQLite (PostgreSQL migrations are handled separately)
    if (dbType !== 'postgresql') {
      await createTables();
    }
    
    // Check and add missing columns
    await addMissingColumns();
    
    // Create default users if needed
    await createDefaultUsers();
    
    console.log('✅ Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}

export async function runMigrations(): Promise<void> {
  try {
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('sqlite:')) {
      console.log('⚠️ No PostgreSQL DATABASE_URL found or using SQLite, skipping Drizzle migrations');
      return;
    }

    console.log('🔄 Running database migrations...');
    
    // Create a separate connection for migrations
    const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
    const migrationDb = drizzle(migrationClient);
    
    // Determine migrations folder path based on environment
    const fs = await import('fs');
    const path = await import('path');
    
    // In production, migrations are in dist folder
    const distMigrationsPath = path.resolve(process.cwd(), 'dist/migrations');
    const devMigrationsPath = path.resolve(process.cwd(), 'migrations');
    
    const migrationsFolder = fs.existsSync(distMigrationsPath) ? 'dist/migrations' : 'migrations';
    
    console.log(`📁 Using migrations folder: ${migrationsFolder}`);
    
    // Run migrations
    await migrate(migrationDb, { migrationsFolder });
    
    // Close migration connection
    await migrationClient.end();
    
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    throw error;
  }
}

// Emergency push function for when migrations fail
export async function runDrizzlePush(): Promise<void> {
  try {
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('sqlite:')) {
      console.log('⚠️ No PostgreSQL DATABASE_URL found or using SQLite, skipping Drizzle push');
      return;
    }

    console.log('🔄 Running emergency database push...');
    
    // This would be equivalent to drizzle-kit push but in code
    // For now, we'll create tables manually as fallback
    await createTablesManually();
    
    console.log('✅ Emergency database push completed successfully');
  } catch (error) {
    console.error('❌ Error running emergency push:', error);
    throw error;
  }
}

async function createTablesManually(): Promise<void> {
  if (!db) return;
  
  try {
    // Create all tables manually as emergency fallback
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
        ignored_users TEXT DEFAULT '[]',
        username_color TEXT DEFAULT '#FFFFFF',
        user_theme TEXT DEFAULT 'default',
        profile_effect TEXT DEFAULT 'none',
        points INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        total_points INTEGER DEFAULT 0,
        level_progress INTEGER DEFAULT 0
      )
    `);

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

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS friends (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        friend_id INTEGER REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

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

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS blocked_devices (
        id SERIAL PRIMARY KEY,
        ip_address TEXT NOT NULL,
        device_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        blocked_at TIMESTAMP NOT NULL,
        blocked_by INTEGER NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS level_settings (
        id SERIAL PRIMARY KEY,
        level INTEGER NOT NULL UNIQUE,
        required_points INTEGER NOT NULL,
        title TEXT NOT NULL,
        color TEXT DEFAULT '#FFFFFF',
        benefits JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS points_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ All tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables manually:', error);
    throw error;
  }
}

async function createTables(): Promise<void> {
  if (!db) return;
  
  if (dbType === 'postgresql') {
    // Create PostgreSQL tables with proper syntax
    try {
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
          ignored_users TEXT DEFAULT '[]',
          username_color TEXT DEFAULT '#FFFFFF',
          user_theme TEXT DEFAULT 'default',
          profile_effect TEXT DEFAULT 'none'
        )
      `);

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

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS friends (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          friend_id INTEGER REFERENCES users(id),
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

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

      console.log('✅ PostgreSQL tables created successfully');
    } catch (error) {
      console.error('❌ Error creating PostgreSQL tables:', error);
      throw error;
    }
    return;
  }
  
  // For SQLite, tables are created by database-fallback.ts
  console.log('✅ SQLite tables are created by database-fallback.ts');
}

async function addMissingColumns(): Promise<void> {
  if (!db) {
    console.log('⚠️ No database connection, skipping column additions');
    return;
  }

  if (dbType === 'postgresql') {
    console.log('✅ PostgreSQL columns are managed by Drizzle schema, skipping runtime additions');
    return;
  }

  // For SQLite - columns are created by database-fallback.ts
  console.log('✅ SQLite columns are managed by database-fallback.ts, skipping runtime additions');
}

// Alias function for compatibility
export async function createDefaultUsersIfNeeded(): Promise<void> {
  return createDefaultUsers();
}

export async function createDefaultUsers(): Promise<void> {
  try {
    if (!db) {
      console.log('📄 Memory mode - skipping default user creation');
      return;
    }

    if (dbType === 'postgresql') {
      // Use Drizzle ORM for PostgreSQL
      const { count } = await import('drizzle-orm');
      const { eq } = await import('drizzle-orm');
      
      // Check if admin user exists
      const adminResult = await db.select({ count: count() }).from(users).where(eq(users.username, 'admin'));
      const adminCount = adminResult[0]?.count || 0;

      if (adminCount === 0) {
        await db.insert(users).values({
          username: 'admin',
          password: 'admin123',
          userType: 'owner',
          role: 'owner',
          profileImage: '/default_avatar.svg'
        });
        console.log('✅ Default admin user created');
      }

      // Create a test member user
      const memberResult = await db.select({ count: count() }).from(users).where(eq(users.username, 'testuser'));
      const memberCount = memberResult[0]?.count || 0;

      if (memberCount === 0) {
        await db.insert(users).values({
          username: 'testuser',
          password: 'test123',
          userType: 'member',
          role: 'member',
          profileImage: '/default_avatar.svg'
        });
        console.log('✅ Default test user created');
      }
    } else {
      // Use Drizzle ORM for SQLite - import SQLite schema
      const { users: sqliteUsers } = await import('../shared/schema-sqlite');
      const { count } = await import('drizzle-orm');
      const { eq } = await import('drizzle-orm');
      
      // Check if admin user exists
      const adminResult = await db.select({ count: count() }).from(sqliteUsers).where(eq(sqliteUsers.username, 'admin'));
      const adminCount = adminResult[0]?.count || 0;

      if (adminCount === 0) {
        await db.insert(sqliteUsers).values({
          username: 'admin',
          password: 'admin123',
          userType: 'owner',
          role: 'owner',
          profileImage: '/default_avatar.svg'
        });
        console.log('✅ Default admin user created');
      }

      // Create a test member user
      const memberResult = await db.select({ count: count() }).from(sqliteUsers).where(eq(sqliteUsers.username, 'testuser'));
      const memberCount = memberResult[0]?.count || 0;

      if (memberCount === 0) {
        await db.insert(sqliteUsers).values({
          username: 'testuser',
          password: 'test123',
          userType: 'member',
          role: 'member',
          profileImage: '/default_avatar.svg'
        });
        console.log('✅ Default test user created');
      }
    }
    
    console.log('✅ Default users verification complete');
  } catch (error) {
    console.error('❌ Error creating default users:', error);
  }
}