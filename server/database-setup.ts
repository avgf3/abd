import { db, dbType } from './database-adapter';
import { sql } from 'drizzle-orm';
import { users, messages, friends, notifications, blockedDevices } from '../shared/schema';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { log } from './utils/logger';

export async function initializeDatabase(): Promise<boolean> {
  try {
    if (!db) {
      log.info('📄 Running in memory mode - no database initialization needed');
      return true;
    }

    log.info('🔄 Initializing database tables...');
    
    // Create tables for SQLite (PostgreSQL migrations are handled separately)
    if (dbType !== 'postgresql') {
      await createTables();
    }
    
    // Check and add missing columns
    await addMissingColumns();
    
    // إنشاء المالك الافتراضي إذا لم يكن موجود
    await createDefaultOwner();
    
    // Create default users if needed
    await createDefaultUsers();
    
    log.production('✅ Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}

export async function runMigrations(): Promise<void> {
  try {
    if (!process.env.DATABASE_URL) {
      console.log("⚠️ DATABASE_URL غير محدد - تخطي المايقريشن");
      return;
    }

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
    
    // Run migrations
    await migrate(migrationDb, { migrationsFolder });
    
    // Close migration connection
    await migrationClient.end();
    
    console.log('✅ Migrations completed successfully');
  } catch (error: any) {
    console.error('❌ Error running migrations:', error);
    
    // إذا كانت المشكلة أن الجدول موجود بالفعل، استمر
    if (error.message?.includes('already exists') || 
        error.code === '42P07' || 
        error.message?.includes('relation') ||
        error.message?.includes('constraint')) {
      console.log('⚠️ Migration skipped - tables already exist');
      return;
    }
    
    // للأخطاء الأخرى، لا ترمي الخطأ - استمر مع SQLite
    console.log('⚠️ Falling back to SQLite mode');
  }
}

// إنشاء المالك الافتراضي
export async function createDefaultOwner(): Promise<void> {
  try {
    if (!db) return;

    // البحث عن مالك موجود
    const existingOwner = await db.select().from(users).where(sql`user_type = 'owner'`).limit(1);
    
    if (existingOwner.length === 0) {
      console.log('🔑 Creating default owner...');
      
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await db.insert(users).values({
        username: 'Owner',
        password: hashedPassword,
        userType: 'owner',
        role: 'owner',
        profileBackgroundColor: '#FFD700',
        usernameColor: '#FFD700',
        userTheme: 'royal',
        profileEffect: 'golden',
        points: 10000,
        level: 100,
        totalPoints: 10000,
        levelProgress: 100,
        joinDate: new Date(),
        createdAt: new Date(),
        isOnline: false,
        isHidden: false,
        isMuted: false,
        isBanned: false,
        isBlocked: false,
        ignoredUsers: '[]'
      });
      
      console.log('✅ Default owner created successfully');
      console.log('👑 Owner credentials: Username: Owner, Password: admin123');
    } else {
      console.log('✅ Owner already exists');
    }
  } catch (error) {
    console.error('❌ Error creating default owner:', error);
  }
}

// Emergency push function for when migrations fail
export async function runDrizzlePush(): Promise<void> {
  try {
    if (!process.env.DATABASE_URL) {
      return;
    }

    // This would be equivalent to drizzle-kit push but in code
    // For now, we'll create tables manually as fallback
    await createTablesManually();
    
  } catch (error: any) {
    console.error('❌ Error running emergency push:', error);
    
    // إذا كانت المشكلة أن الجدول موجود بالفعل، استمر
    if (error.message?.includes('already exists') || 
        error.code === '42P07' || 
        error.message?.includes('relation') ||
        error.message?.includes('constraint')) {
      console.log('⚠️ Emergency push skipped - tables already exist');
      return;
    }
    
    // للأخطاء الأخرى، لا ترمي الخطأ
    console.log('⚠️ Emergency push failed, continuing...');
  }
}

// إنشاء الجداول يدوياً
async function createTablesManually(): Promise<void> {
  if (!db) return;

  try {
    // إنشاء جداول PostgreSQL يدوياً
    if (dbType === 'postgresql') {
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
          room_id TEXT DEFAULT 'general',
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
        CREATE TABLE IF NOT EXISTS points_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          points INTEGER NOT NULL,
          reason TEXT NOT NULL,
          action TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
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
        ) ON CONFLICT DO NOTHING
      `);
    }
    
    console.log('✅ Manual table creation completed');
  } catch (error) {
    console.error('❌ Error creating tables manually:', error);
  }
}

// إضافة الأعمدة المفقودة
async function addMissingColumns(): Promise<void> {
  if (!db) return;

  try {
    console.log('🔧 Checking for missing columns...');
    
    // إضافة عمود role إذا كان مفقود
    try {
      if (dbType === 'postgresql') {
        await db.execute(sql`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'guest'
        `);
        
        // تحديث عمود role ليطابق user_type للمستخدمين الموجودين
        await db.execute(sql`
          UPDATE users SET role = user_type WHERE role IS NULL OR role = ''
        `);
      } else {
        // SQLite
        await db.execute(sql`
          ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'guest'
        `);
      }
      console.log('✅ Added missing role column');
    } catch (error: any) {
      if (!error.message?.includes('already exists') && !error.message?.includes('duplicate')) {
        console.error('❌ Error adding role column:', error);
      }
    }

    // إضافة أعمدة أخرى مفقودة
    const columnsToAdd = [
      'profile_background_color TEXT DEFAULT \'#3c0d0d\'',
      'username_color TEXT DEFAULT \'#FFFFFF\'',
      'user_theme TEXT DEFAULT \'default\'',
      'profile_effect TEXT DEFAULT \'none\'',
      'points INTEGER DEFAULT 0',
      'level INTEGER DEFAULT 1',
      'total_points INTEGER DEFAULT 0',
      'level_progress INTEGER DEFAULT 0'
    ];

    for (const column of columnsToAdd) {
      try {
        if (dbType === 'postgresql') {
          await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${column}`));
        } else {
          await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN ${column}`));
        }
      } catch (error: any) {
        if (!error.message?.includes('already exists') && !error.message?.includes('duplicate')) {
          console.warn(`⚠️ Could not add column ${column}:`, error.message);
        }
      }
    }

    console.log('✅ Missing columns check completed');
  } catch (error) {
    console.error('❌ Error checking missing columns:', error);
  }
}

// Alias function for compatibility
export async function createDefaultUsersIfNeeded(): Promise<void> {
  return createDefaultUsers();
}

export async function createDefaultUsers(): Promise<void> {
  try {
    if (!db) {
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
          profileImage: '/default_avatar.svg',
          points: 0,
          level: 1,
          totalPoints: 0,
          levelProgress: 0
        });
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
          profileImage: '/default_avatar.svg',
          points: 0,
          level: 1,
          totalPoints: 0,
          levelProgress: 0
        });
        }
    } else {
      // Use Drizzle ORM for SQLite - import SQLite schema
      const { users: sqliteUsers, levelSettings: sqliteLevelSettings } = await import('../shared/schema');
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
          profileImage: '/default_avatar.svg',
          points: 0,
          level: 1,
          totalPoints: 0,
          levelProgress: 0
        });
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
          profileImage: '/default_avatar.svg',
          points: 0,
          level: 1,
          totalPoints: 0,
          levelProgress: 0
        });
        }

      // Initialize default level settings
      await initializeLevelSettings();
    }
    
    } catch (error) {
    console.error('❌ Error creating default users:', error);
  }
}

async function initializeLevelSettings(): Promise<void> {
  try {
    if (!db) return;
    
            const { levelSettings } = await import('../shared/schema');
    const { count } = await import('drizzle-orm');
    
    // Check if level settings exist
    const levelResult = await db.select({ count: count() }).from(levelSettings);
    const levelCount = levelResult[0]?.count || 0;

    if (levelCount === 0) {
      const defaultLevels = [
        { level: 1, requiredPoints: 0, title: 'مبتدئ', color: '#FFFFFF' },
        { level: 2, requiredPoints: 100, title: 'متدرب', color: '#10B981' },
        { level: 3, requiredPoints: 250, title: 'نشط', color: '#3B82F6' },
        { level: 4, requiredPoints: 500, title: 'متقدم', color: '#8B5CF6' },
        { level: 5, requiredPoints: 1000, title: 'خبير', color: '#F59E0B' },
        { level: 6, requiredPoints: 2000, title: 'محترف', color: '#EF4444' },
        { level: 7, requiredPoints: 4000, title: 'أسطورة', color: '#EC4899' },
        { level: 8, requiredPoints: 8000, title: 'بطل', color: '#6366F1' },
        { level: 9, requiredPoints: 15000, title: 'ملك', color: '#F97316' },
        { level: 10, requiredPoints: 30000, title: 'إمبراطور', color: '#DC2626' }
      ];

      for (const level of defaultLevels) {
        await db.insert(levelSettings).values({
          ...level,
          benefits: JSON.stringify({
            dailyBonus: level.level * 10,
            specialFeatures: level.level > 5 ? ['custom_colors', 'profile_effects'] : []
          })
        });
      }
      
      }
  } catch (error) {
    console.error('❌ Error initializing level settings:', error);
  }
}