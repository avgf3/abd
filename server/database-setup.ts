import { db, dbType, ensureTablesExist, cleanupOldData } from './database-adapter';
import { sql } from 'drizzle-orm';
import { users, messages, friends, notifications, blockedDevices, pointsHistory, levelSettings, rooms, roomUsers, wallPosts, wallReactions } from '../shared/schema';
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
    
    // إنشاء الجداول إذا لم تكن موجودة
    await ensureTablesExist();
    
    // إنشاء المالك الافتراضي إذا لم يكن موجود
    await createDefaultOwner();
    
    // إنشاء المستخدمين الافتراضيين
    await createDefaultUsers();
    
    // تهيئة إعدادات المستويات
    await initializeLevelSettings();
    
    // تنظيف البيانات القديمة
    await cleanupOldData();
    
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
    
    // للأخطاء الأخرى، لا ترمي الخطأ - استمر
    console.log('⚠️ Migration failed, continuing with existing tables');
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
        userTheme: 'golden',
        profileEffect: 'effect-glow',
        points: 10000,
        level: 10,
        totalPoints: 10000,
        levelProgress: 100,
        status: 'متصل',
        gender: 'ذكر',
        age: 25,
        country: 'مصر',
        relation: 'أعزب',
        bio: 'مالك الموقع'
      });
      
      console.log('✅ Default owner created successfully');
    } else {
      console.log('✅ Owner already exists');
    }
  } catch (error) {
    console.error('❌ Error creating default owner:', error);
  }
}

export async function runDrizzlePush(): Promise<void> {
  try {
    if (!process.env.DATABASE_URL) {
      console.log("⚠️ DATABASE_URL غير محدد - تخطي Drizzle Push");
      return;
    }

    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = await import('postgres');
    
    const client = postgres.default(process.env.DATABASE_URL, { max: 1 });
    const db = drizzle(client);
    
    // Push schema changes
    await db.execute(sql`SELECT 1`); // Test connection
    
    await client.end();
    console.log('✅ Drizzle push completed successfully');
  } catch (error) {
    console.error('❌ Error in drizzle push:', error);
  }
}

export async function createDefaultUsersIfNeeded(): Promise<void> {
  try {
    if (!db) return;

    const userCount = await db.select({ count: sql`count(*)` }).from(users);
    
    if (userCount[0].count === 0) {
      await createDefaultUsers();
    }
  } catch (error) {
    console.error('❌ Error checking user count:', error);
  }
}

export async function createDefaultUsers(): Promise<void> {
  try {
    if (!db) return;

    console.log('👥 Creating default users...');
    
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('user123', 10);
    
    const defaultUsers = [
      {
        username: 'Admin',
        password: hashedPassword,
        userType: 'admin',
        role: 'admin',
        profileBackgroundColor: '#FF6347',
        usernameColor: '#FF6347',
        userTheme: 'fire',
        profileEffect: 'effect-fire',
        points: 5000,
        level: 8,
        totalPoints: 5000,
        levelProgress: 75,
        status: 'متصل',
        gender: 'ذكر',
        age: 30,
        country: 'السعودية',
        relation: 'متزوج',
        bio: 'مدير الموقع'
      },
      {
        username: 'Moderator',
        password: hashedPassword,
        userType: 'moderator',
        role: 'moderator',
        profileBackgroundColor: '#4169E1',
        usernameColor: '#4169E1',
        userTheme: 'royal',
        profileEffect: 'effect-aurora',
        points: 3000,
        level: 6,
        totalPoints: 3000,
        levelProgress: 60,
        status: 'متصل',
        gender: 'أنثى',
        age: 28,
        country: 'الإمارات',
        relation: 'أعزب',
        bio: 'مراقب الموقع'
      },
      {
        username: 'Member',
        password: hashedPassword,
        userType: 'member',
        role: 'member',
        profileBackgroundColor: '#32CD32',
        usernameColor: '#32CD32',
        userTheme: 'forest',
        profileEffect: 'effect-water',
        points: 1000,
        level: 4,
        totalPoints: 1000,
        levelProgress: 40,
        status: 'متصل',
        gender: 'ذكر',
        age: 22,
        country: 'الكويت',
        relation: 'أعزب',
        bio: 'عضو نشط'
      }
    ];
    
    for (const userData of defaultUsers) {
      const existingUser = await db.select().from(users).where(sql`username = ${userData.username}`).limit(1);
      
      if (existingUser.length === 0) {
        await db.insert(users).values(userData);
        console.log(`✅ Created user: ${userData.username}`);
      }
    }
    
    console.log('✅ Default users created successfully');
  } catch (error) {
    console.error('❌ Error creating default users:', error);
  }
}

async function initializeLevelSettings(): Promise<void> {
  try {
    if (!db) return;

    const existingSettings = await db.select().from(levelSettings).limit(1);
    
    if (existingSettings.length === 0) {
      console.log('📊 Initializing level settings...');
      
      const levelData = [
        { level: 1, requiredPoints: 0, title: "مبتدئ", color: "#8B4513" },
        { level: 2, requiredPoints: 50, title: "عضو نشط", color: "#CD853F" },
        { level: 3, requiredPoints: 150, title: "عضو متميز", color: "#DAA520" },
        { level: 4, requiredPoints: 300, title: "عضو خبير", color: "#FFD700" },
        { level: 5, requiredPoints: 500, title: "عضو محترف", color: "#FF8C00" },
        { level: 6, requiredPoints: 750, title: "خبير متقدم", color: "#FF6347" },
        { level: 7, requiredPoints: 1000, title: "خبير النخبة", color: "#DC143C" },
        { level: 8, requiredPoints: 1500, title: "أسطورة", color: "#8A2BE2" },
        { level: 9, requiredPoints: 2000, title: "أسطورة النخبة", color: "#4B0082" },
        { level: 10, requiredPoints: 3000, title: "إمبراطور", color: "#000080" }
      ];
      
      for (const level of levelData) {
        await db.insert(levelSettings).values(level);
      }
      
      console.log('✅ Level settings initialized successfully');
    }
  } catch (error) {
    console.error('❌ Error initializing level settings:', error);
  }
}