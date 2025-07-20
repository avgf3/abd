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
    
    // Run migrations for PostgreSQL
    if (dbType === 'postgresql') {
      await runMigrations();
    } else {
      // Create tables for SQLite
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

async function runMigrations(): Promise<void> {
  try {
    if (!process.env.DATABASE_URL) {
      console.log('⚠️ No DATABASE_URL found, skipping migrations');
      return;
    }

    console.log('🔄 Running database migrations...');
    
    // Create a separate connection for migrations
    const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
    const migrationDb = drizzle(migrationClient);
    
    try {
      // First, try to run migrations normally
      await migrate(migrationDb, { migrationsFolder: './migrations' });
      console.log('✅ Database migrations completed successfully');
    } catch (migrationError: any) {
      console.log('⚠️ Migration failed, trying to fix existing schema...');
      
      // If migration fails due to existing tables, try to update them
      if (migrationError.code === '42P07') { // relation already exists
        await updateExistingTables(migrationClient);
      } else {
        throw migrationError;
      }
    }
    
    // Close migration connection
    await migrationClient.end();
    
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    throw error;
  }
}

async function updateExistingTables(client: any): Promise<void> {
  try {
    console.log('🔄 Updating existing tables schema...');
    
    // Add missing columns to users table
    const addColumnsQueries = [
      // Add missing timestamp columns if they don't exist
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS join_date TIMESTAMP DEFAULT NOW()`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP`,
      
      // Add missing user profile columns
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_background_color TEXT DEFAULT '#3c0d0d'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS username_color TEXT DEFAULT '#FFFFFF'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS user_theme TEXT DEFAULT 'default'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS ignored_users TEXT DEFAULT '[]'`,
      
      // Add missing boolean columns with proper defaults
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false`,
      
      // Add missing admin columns
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS mute_expiry TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_expiry TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id VARCHAR(100)`,
      
      // Add missing profile columns
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_banner TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS relation TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'guest'`,
      
      // Update existing rows to have proper timestamps
      `UPDATE users SET created_at = NOW() WHERE created_at IS NULL`,
      `UPDATE users SET join_date = NOW() WHERE join_date IS NULL`
    ];
    
    // Execute each query
    for (const query of addColumnsQueries) {
      try {
        await client.unsafe(query);
        console.log(`✅ Executed: ${query.slice(0, 50)}...`);
      } catch (error: any) {
        // Ignore errors for columns that already exist
        if (error.code !== '42701') { // duplicate column error
          console.warn(`⚠️ Warning in query: ${error.message}`);
        }
      }
    }
    
    // Create missing tables that might not exist
    const createTablesQueries = [
      `CREATE TABLE IF NOT EXISTS friends (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        friend_id INTEGER REFERENCES users(id),
        status TEXT DEFAULT 'pending' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      
      `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      
      `CREATE TABLE IF NOT EXISTS blocked_devices (
        id SERIAL PRIMARY KEY,
        ip_address TEXT NOT NULL,
        device_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        blocked_at TIMESTAMP NOT NULL,
        blocked_by INTEGER NOT NULL,
        UNIQUE(ip_address, device_id)
      )`
    ];
    
    for (const query of createTablesQueries) {
      try {
        await client.unsafe(query);
        console.log(`✅ Created table successfully`);
      } catch (error: any) {
        if (error.code !== '42P07') { // table already exists
          console.warn(`⚠️ Warning creating table: ${error.message}`);
        }
      }
    }
    
    console.log('✅ Database schema updated successfully');
    
  } catch (error) {
    console.error('❌ Error updating existing tables:', error);
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
          user_theme TEXT DEFAULT 'default'
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