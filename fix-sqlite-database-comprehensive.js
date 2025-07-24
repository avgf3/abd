import dotenv from 'dotenv';
dotenv.config();

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

async function fixSQLiteDatabase() {
  const databaseUrl = process.env.DATABASE_URL || 'sqlite:./chat.db';
  
  console.log('🔄 إصلاح قاعدة بيانات SQLite...');
  console.log('📁 رابط قاعدة البيانات:', databaseUrl);

  let dbPath = './chat.db';
  if (databaseUrl.startsWith('sqlite:')) {
    dbPath = databaseUrl.replace('sqlite:', '');
  }

  // إنشاء مجلد قاعدة البيانات إذا لم يكن موجوداً
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir) && dbDir !== '.') {
    mkdirSync(dbDir, { recursive: true });
  }

  console.log('📂 مسار قاعدة البيانات:', dbPath);

  const db = new Database(dbPath);

  try {
    // فحص وإنشاء جدول المستخدمين مع جميع الأعمدة
    console.log('🔧 إنشاء/تحديث جدول المستخدمين...');
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT,
        user_type TEXT NOT NULL DEFAULT 'guest',
        role TEXT NOT NULL DEFAULT 'guest',
        profile_image TEXT DEFAULT '/default_avatar.svg',
        profile_banner TEXT,
        profile_background_color TEXT DEFAULT '#3c0d0d',
        status TEXT,
        gender TEXT DEFAULT 'male',
        age INTEGER,
        country TEXT,
        relation TEXT,
        bio TEXT,
        is_online INTEGER DEFAULT 0,
        is_hidden INTEGER DEFAULT 0,
        last_seen TEXT,
        join_date TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_muted INTEGER DEFAULT 0,
        mute_expiry TEXT,
        is_banned INTEGER DEFAULT 0,
        ban_expiry TEXT,
        is_blocked INTEGER DEFAULT 0,
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
      );
    `);

    // التحقق من وجود الأعمدة المطلوبة وإضافتها إذا كانت مفقودة
    const missingColumns = [
      { name: 'role', type: 'TEXT DEFAULT "guest"' },
      { name: 'profile_background_color', type: 'TEXT DEFAULT "#3c0d0d"' },
      { name: 'bio', type: 'TEXT' },
      { name: 'username_color', type: 'TEXT DEFAULT "#FFFFFF"' },
      { name: 'user_theme', type: 'TEXT DEFAULT "default"' },
      { name: 'profile_effect', type: 'TEXT DEFAULT "none"' },
      { name: 'points', type: 'INTEGER DEFAULT 0' },
      { name: 'level', type: 'INTEGER DEFAULT 1' },
      { name: 'total_points', type: 'INTEGER DEFAULT 0' },
      { name: 'level_progress', type: 'INTEGER DEFAULT 0' }
    ];

    for (const column of missingColumns) {
      try {
        console.log(`🔍 فحص العمود: ${column.name}`);
        
        // محاولة إضافة العمود
        db.exec(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
        console.log(`✅ تم إضافة العمود: ${column.name}`);
      } catch (error) {
        if (error.message.includes('duplicate column name')) {
          console.log(`✅ العمود ${column.name} موجود بالفعل`);
        } else {
          console.error(`❌ خطأ في إضافة العمود ${column.name}:`, error.message);
        }
      }
    }

    // تحديث العمود role للمستخدمين الموجودين
    try {
      db.exec(`UPDATE users SET role = COALESCE(user_type, 'guest') WHERE role IS NULL OR role = ''`);
      console.log('✅ تم تحديث أدوار المستخدمين');
    } catch (error) {
      console.error('❌ خطأ في تحديث الأدوار:', error.message);
    }

    // إنشاء جدول الرسائل
    console.log('🔧 إنشاء/تحديث جدول الرسائل...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER,
        receiver_id INTEGER,
        content TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        is_private INTEGER DEFAULT 0,
        room_id TEXT DEFAULT 'general',
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (receiver_id) REFERENCES users(id)
      );
    `);

    // إنشاء جدول الأصدقاء
    console.log('🔧 إنشاء/تحديث جدول الأصدقاء...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        friend_id INTEGER,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (friend_id) REFERENCES users(id)
      );
    `);

    // إنشاء جدول الإشعارات
    console.log('🔧 إنشاء/تحديث جدول الإشعارات...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // إنشاء جداول إضافية
    console.log('🔧 إنشاء الجداول الإضافية...');
    
    // جدول الأجهزة المحظورة
    db.exec(`
      CREATE TABLE IF NOT EXISTS blocked_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL,
        device_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        blocked_at TEXT NOT NULL,
        blocked_by INTEGER NOT NULL
      );
    `);

    // جدول تاريخ النقاط
    db.exec(`
      CREATE TABLE IF NOT EXISTS points_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // جدول إعدادات المستويات
    db.exec(`
      CREATE TABLE IF NOT EXISTS level_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level INTEGER NOT NULL UNIQUE,
        required_points INTEGER NOT NULL,
        title TEXT NOT NULL,
        color TEXT DEFAULT '#FFFFFF',
        benefits TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // إدراج مستويات افتراضية
    console.log('🔧 إدراج مستويات افتراضية...');
    const defaultLevels = [
      { level: 1, required_points: 0, title: 'مبتدئ', color: '#FFFFFF' },
      { level: 2, required_points: 100, title: 'متحمس', color: '#00FF00' },
      { level: 3, required_points: 250, title: 'نشيط', color: '#0080FF' },
      { level: 4, required_points: 500, title: 'متقدم', color: '#8000FF' },
      { level: 5, required_points: 1000, title: 'خبير', color: '#FF8000' },
      { level: 6, required_points: 2000, title: 'محترف', color: '#FF0080' },
      { level: 7, required_points: 4000, title: 'نجم', color: '#FFD700' },
      { level: 8, required_points: 8000, title: 'أسطورة', color: '#FF4500' },
      { level: 9, required_points: 15000, title: 'بطل', color: '#DC143C' },
      { level: 10, required_points: 30000, title: 'ملك', color: '#B22222' }
    ];

    for (const levelData of defaultLevels) {
      try {
        db.exec(`
          INSERT OR IGNORE INTO level_settings (level, required_points, title, color)
          VALUES (${levelData.level}, ${levelData.required_points}, '${levelData.title}', '${levelData.color}')
        `);
      } catch (error) {
        console.log(`المستوى ${levelData.level} موجود بالفعل`);
      }
    }

    // إنشاء مستخدم المالك الافتراضي إذا لم يكن موجوداً
    console.log('🔧 إنشاء مستخدم المالك الافتراضي...');
    try {
      const ownerExists = db.prepare('SELECT id FROM users WHERE username = ? OR user_type = ?').get('المالك', 'owner');
      
      if (!ownerExists) {
        db.exec(`
          INSERT INTO users (
            username, password, user_type, role, profile_image, 
            gender, points, level, profile_effect, username_color
          ) VALUES (
            'المالك', 'owner123', 'owner', 'owner', '/default_avatar.svg',
            'male', 50000, 10, 'golden', '#FFD700'
          )
        `);
        console.log('✅ تم إنشاء مستخدم المالك الافتراضي');
        console.log('📝 معلومات تسجيل الدخول:');
        console.log('   اسم المستخدم: المالك');
        console.log('   كلمة المرور: owner123');
      } else {
        console.log('✅ مستخدم المالك موجود بالفعل');
      }
    } catch (error) {
      console.error('❌ خطأ في إنشاء مستخدم المالك:', error.message);
    }

    console.log('✅ تم إصلاح قاعدة البيانات بنجاح!');
    console.log('🎯 يمكنك الآن تشغيل الخادم بالأمر: npm run dev');
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح قاعدة البيانات:', error);
    throw error;
  } finally {
    db.close();
  }
}

// تشغيل الإصلاح
fixSQLiteDatabase().catch(console.error);