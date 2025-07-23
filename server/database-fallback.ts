import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../shared/schema-sqlite';
import path from 'path';
import fs from 'fs';

let sqliteDb: Database.Database | null = null;
let sqliteDrizzle: any = null;

export function initSQLiteFallback() {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'chatapp.db');
    console.log(`🔄 Initializing SQLite database at: ${dbPath}`);
    
    sqliteDb = new Database(dbPath);
    sqliteDrizzle = drizzle(sqliteDb, { schema });

    // Create tables
    createSQLiteTables();
    createDefaultSQLiteUsers();

    console.log('✅ SQLite database initialized successfully');
    return { db: sqliteDrizzle, type: 'sqlite' as const };
  } catch (error) {
    console.error('❌ Error initializing SQLite database:', error);
    return null;
  }
}

function createSQLiteTables() {
  if (!sqliteDb) return;

  // Create users table with all required columns
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      is_online BOOLEAN DEFAULT 0,
      is_hidden BOOLEAN DEFAULT 0,
      last_seen DATETIME,
      join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_muted BOOLEAN DEFAULT 0,
      mute_expiry DATETIME,
      is_banned BOOLEAN DEFAULT 0,
      ban_expiry DATETIME,
      is_blocked BOOLEAN DEFAULT 0,
      ip_address TEXT,
      device_id TEXT,
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

  // Create messages table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER REFERENCES users(id),
      receiver_id INTEGER REFERENCES users(id),
      content TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'text',
      is_private BOOLEAN DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create friends table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      friend_id INTEGER REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create notifications table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT 0,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create blocked_devices table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS blocked_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT NOT NULL,
      device_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      blocked_at DATETIME NOT NULL,
      blocked_by INTEGER NOT NULL
    )
  `);

  // Create points_history table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS points_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      points INTEGER NOT NULL,
      reason TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create level_settings table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS level_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level INTEGER NOT NULL UNIQUE,
      required_points INTEGER NOT NULL,
      title TEXT NOT NULL,
      color TEXT DEFAULT '#FFFFFF',
      benefits TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create friend_requests table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      receiver_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME
    )
  `);

  // Add missing columns to existing tables
  try {
    // Check if columns exist and add them if missing
    const userColumns = sqliteDb.prepare("PRAGMA table_info(users)").all();
    const existingColumns = userColumns.map((col: any) => col.name);
    
    const requiredColumns = [
      { name: 'profile_effect', sql: 'ALTER TABLE users ADD COLUMN profile_effect TEXT DEFAULT "none"' },
      { name: 'points', sql: 'ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0' },
      { name: 'level', sql: 'ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1' },
      { name: 'total_points', sql: 'ALTER TABLE users ADD COLUMN total_points INTEGER DEFAULT 0' },
      { name: 'level_progress', sql: 'ALTER TABLE users ADD COLUMN level_progress INTEGER DEFAULT 0' }
    ];
    
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`Adding missing column: ${column.name}`);
        sqliteDb.exec(column.sql);
      }
    }
  } catch (error) {
    console.log('Note: Some columns may already exist, continuing...');
  }

  console.log('✅ SQLite tables are created by database-fallback.ts');
}

function createDefaultSQLiteUsers() {
  if (!sqliteDb) return;

  try {
    // Check if admin user exists
    const adminExists = sqliteDb.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?').get('admin');
    
    if ((adminExists as any)?.count === 0) {
      sqliteDb.prepare(`
        INSERT INTO users (username, password, user_type, role, profile_image, join_date, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run('admin', 'admin123', 'owner', 'owner', '/default_avatar.svg');
      console.log('✅ Default admin user created in SQLite');
    }

    // Create a test member user
    const memberExists = sqliteDb.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?').get('testuser');
    
    if ((memberExists as any)?.count === 0) {
      sqliteDb.prepare(`
        INSERT INTO users (username, password, user_type, role, profile_image, join_date, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run('testuser', 'test123', 'member', 'member', '/default_avatar.svg');
      console.log('✅ Default test user created in SQLite');
    }
  } catch (error) {
    console.error('❌ Error creating default SQLite users:', error);
  }
}

export function closeSQLite() {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    sqliteDrizzle = null;
  }
}