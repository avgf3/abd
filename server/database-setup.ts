import { db, dbType, initializeDatabase as initDB } from './database-adapter';
import { sql } from 'drizzle-orm';
import { users, messages, friends, notifications, blockedDevices } from '../shared/schema';
import * as sqliteSchema from '../shared/sqlite-schema';
import bcrypt from 'bcrypt';

// إعادة تصدير دالة التهيئة من المحول
export { initializeDatabase } from './database-adapter';

// إنشاء المالك الافتراضي
export async function createDefaultOwner(): Promise<void> {
  try {
    if (!db) {
      console.log('📄 Database disabled - skipping owner creation');
      return;
    }

    console.log(`🔄 Creating default owner for ${dbType} database...`);

    if (dbType === 'postgresql') {
      // البحث عن مالك موجود في PostgreSQL
      const existingOwner = await db.select().from(users).where(sql`user_type = 'owner'`).limit(1);
      
      if (existingOwner.length === 0) {
        const hashedPassword = await bcrypt.hash('admin123', 12);
        
        await (db as any).insert(users).values({
          username: 'Owner',
          password: hashedPassword,
          userType: 'owner',
          role: 'owner',
          profileBackgroundColor: '#FFD700',
          usernameColor: '#FFD700',
          userTheme: 'royal',
          profileEffect: 'golden',
          points: 50000,
          level: 10,
          totalPoints: 50000,
          levelProgress: 100,
          status: 'مالك الموقع',
          bio: 'مالك الموقع - المشرف العام',
          joinDate: new Date(),
          createdAt: new Date(),
          lastSeen: new Date(),
        });
        console.log('✅ تم إنشاء المالك في PostgreSQL');
      } else {
        console.log('✅ المالك موجود بالفعل في PostgreSQL');
      }
    } else if (dbType === 'sqlite') {
      // البحث عن مالك موجود في SQLite
      const existingOwner = await (db as any).select().from(sqliteSchema.users).where(sql`user_type = 'owner'`).limit(1);
      
      if (existingOwner.length === 0) {
        const hashedPassword = await bcrypt.hash('admin123', 12);
        
        await (db as any).insert(sqliteSchema.users).values({
          username: 'Owner',
          password: hashedPassword,
          userType: 'owner',
          role: 'owner',
          profileBackgroundColor: '#FFD700',
          usernameColor: '#FFD700',
          userTheme: 'royal',
          profileEffect: 'golden',
          points: 50000,
          level: 10,
          totalPoints: 50000,
          levelProgress: 100,
          status: 'مالك الموقع',
          bio: 'مالك الموقع - المشرف العام',
          joinDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
        });
        console.log('✅ تم إنشاء المالك في SQLite');
      } else {
        console.log('✅ المالك موجود بالفعل في SQLite');
      }
    }
  } catch (error) {
    console.error('❌ خطأ في إنشاء المالك الافتراضي:', error);
  }
}

// إنشاء المستخدمين الافتراضيين
export async function createDefaultUsers(): Promise<void> {
  try {
    if (!db) {
      console.log('📄 Database disabled - skipping default users creation');
      return;
    }

    console.log(`🔄 Creating default users for ${dbType} database...`);

    const defaultUsers = [
      {
        username: 'زائر',
        password: await bcrypt.hash('guest123', 12),
        userType: 'guest',
        role: 'guest',
        status: 'زائر جديد',
        bio: 'مرحباً بكم في الدردشة',
        gender: 'غير محدد',
        country: 'غير محدد',
        relation: 'غير محدد',
        profileBackgroundColor: '#1a1a1a',
        usernameColor: '#CCCCCC',
        userTheme: 'default',
        profileEffect: 'none',
        points: 0,
        level: 1,
        totalPoints: 0,
        levelProgress: 0,
      },
      {
        username: 'عضو',
        password: await bcrypt.hash('member123', 12),
        userType: 'member',
        role: 'member',
        status: 'عضو نشط',
        bio: 'عضو في المجتمع',
        gender: 'غير محدد',
        country: 'غير محدد',
        relation: 'غير محدد',
        profileBackgroundColor: '#2a2a2a',
        usernameColor: '#4A90E2',
        userTheme: 'default',
        profileEffect: 'none',
        points: 100,
        level: 2,
        totalPoints: 100,
        levelProgress: 20,
      }
    ];

    for (const user of defaultUsers) {
      try {
        if (dbType === 'postgresql') {
          const existing = await (db as any).select().from(users).where(sql`username = ${user.username}`).limit(1);
          if (existing.length === 0) {
            await (db as any).insert(users).values({
              ...user,
              joinDate: new Date(),
              createdAt: new Date(),
              lastSeen: new Date(),
            });
            console.log(`✅ تم إنشاء المستخدم ${user.username} في PostgreSQL`);
          }
        } else if (dbType === 'sqlite') {
          const existing = await (db as any).select().from(sqliteSchema.users).where(sql`username = ${user.username}`).limit(1);
          if (existing.length === 0) {
            await (db as any).insert(sqliteSchema.users).values({
              ...user,
              joinDate: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              lastSeen: new Date().toISOString(),
            });
            console.log(`✅ تم إنشاء المستخدم ${user.username} في SQLite`);
          }
        }
      } catch (error: any) {
        if (!error.message?.includes('UNIQUE') && !error.message?.includes('unique')) {
          console.error(`❌ خطأ في إنشاء المستخدم ${user.username}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('❌ خطأ في إنشاء المستخدمين الافتراضيين:', error);
  }
}

// إنشاء إعدادات المستويات الافتراضية
export async function createDefaultLevelSettings(): Promise<void> {
  try {
    if (!db) return;

    const levelData = [
      { level: 1, requiredPoints: 0, title: 'مبتدئ', color: '#CCCCCC', badge: '🆕' },
      { level: 2, requiredPoints: 100, title: 'نشيط', color: '#4A90E2', badge: '⭐' },
      { level: 3, requiredPoints: 300, title: 'متقدم', color: '#7ED321', badge: '🌟' },
      { level: 4, requiredPoints: 600, title: 'خبير', color: '#F5A623', badge: '💎' },
      { level: 5, requiredPoints: 1000, title: 'محترف', color: '#D0021B', badge: '🏆' },
      { level: 6, requiredPoints: 1500, title: 'ماهر', color: '#9013FE', badge: '👑' },
      { level: 7, requiredPoints: 2500, title: 'أسطوري', color: '#FF6F00', badge: '🔥' },
      { level: 8, requiredPoints: 5000, title: 'بطل', color: '#00BCD4', badge: '⚡' },
      { level: 9, requiredPoints: 10000, title: 'أسطورة', color: '#E91E63', badge: '🚀' },
      { level: 10, requiredPoints: 25000, title: 'إله', color: '#FFD700', badge: '✨' },
    ];

    for (const levelSetting of levelData) {
      try {
        if (dbType === 'postgresql') {
          await (db as any).insert(users).values({
            ...levelSetting,
            createdAt: new Date(),
          }).onConflictDoNothing();
        } else if (dbType === 'sqlite') {
          await (db as any).insert(sqliteSchema.levelSettings).values({
            ...levelSetting,
            createdAt: new Date().toISOString(),
          }).onConflictDoNothing();
        }
      } catch (error: any) {
        // تجاهل أخطاء التكرار
        if (!error.message?.includes('UNIQUE') && !error.message?.includes('unique')) {
          console.error(`❌ خطأ في إنشاء إعدادات المستوى ${levelSetting.level}:`, error);
        }
      }
    }

    console.log('✅ تم إنشاء إعدادات المستويات الافتراضية');
  } catch (error) {
    console.error('❌ خطأ في إنشاء إعدادات المستويات:', error);
  }
}

// إنشاء الغرف الافتراضية
export async function createDefaultRooms(): Promise<void> {
  try {
    if (!db) return;

    const defaultRooms = [
      {
        name: 'العامة',
        description: 'الغرفة العامة للدردشة',
        type: 'public',
        maxUsers: 100,
        isPrivate: false,
      },
      {
        name: 'الترحيب',
        description: 'غرفة الترحيب بالأعضاء الجدد',
        type: 'public',
        maxUsers: 50,
        isPrivate: false,
      },
      {
        name: 'VIP',
        description: 'غرفة خاصة للأعضاء المميزين',
        type: 'vip',
        maxUsers: 25,
        isPrivate: true,
      }
    ];

    for (const room of defaultRooms) {
      try {
        if (dbType === 'postgresql') {
          const existing = await (db as any).select().from(users).where(sql`name = ${room.name}`).limit(1);
          if (existing.length === 0) {
            await (db as any).insert(users).values({
              ...room,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        } else if (dbType === 'sqlite') {
          const existing = await (db as any).select().from(sqliteSchema.rooms).where(sql`name = ${room.name}`).limit(1);
          if (existing.length === 0) {
            await (db as any).insert(sqliteSchema.rooms).values({
              ...room,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      } catch (error: any) {
        if (!error.message?.includes('UNIQUE') && !error.message?.includes('unique')) {
          console.error(`❌ خطأ في إنشاء الغرفة ${room.name}:`, error);
        }
      }
    }

    console.log('✅ تم إنشاء الغرف الافتراضية');
  } catch (error) {
    console.error('❌ خطأ في إنشاء الغرف الافتراضية:', error);
  }
}

// دالة شاملة لتهيئة النظام
export async function initializeSystem(): Promise<boolean> {
  try {
    console.log('🚀 بدء تهيئة النظام...');
    
    // تهيئة قاعدة البيانات
    const dbInitialized = await initDB();
    if (!dbInitialized) {
      console.error('❌ فشل في تهيئة قاعدة البيانات');
      return false;
    }

    // إنشاء البيانات الافتراضية
    await createDefaultOwner();
    await createDefaultUsers();
    await createDefaultLevelSettings();
    await createDefaultRooms();

    console.log('✅ تم تهيئة النظام بنجاح');
    return true;
  } catch (error) {
    console.error('❌ فشل في تهيئة النظام:', error);
    return false;
  }
}

// للتوافق مع الكود الموجود
export async function runMigrations(): Promise<void> {
  // يتم التعامل مع migrations في database-adapter الآن
  console.log('ℹ️ Migrations are handled by the database adapter');
}

export async function runDrizzlePush(): Promise<void> {
  // لا نحتاج هذا مع النظام الجديد
  console.log('ℹ️ Schema is automatically managed by the database adapter');
}

export async function addMissingColumns(): Promise<void> {
  // يتم التعامل مع هذا تلقائياً في إنشاء الجداول
  console.log('ℹ️ Missing columns are handled during table creation');
}