import dotenv from 'dotenv';
dotenv.config();

import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';

async function nuclearDatabaseFix() {
  try {
    console.log('💣 بدء الحل الجذري لقاعدة البيانات...');
    console.log('🔥 سيتم حل جميع مشاكل تسجيل الدخول نهائياً!');

    const dataDir = path.join(process.cwd(), 'data');
    const dbPath = path.join(dataDir, 'chatapp.db');
    
    // إنشاء المجلد إذا لم يكن موجود
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 تم إنشاء مجلد البيانات');
    }

    const db = new Database(dbPath);
    
    // تعطيل foreign key constraints مؤقتاً
    db.exec('PRAGMA foreign_keys = OFF;');
    
    console.log('🔧 إعادة إنشاء قاعدة البيانات بالكامل...');
    
    // حذف جميع الجداول وإعادة إنشاؤها
    db.exec(`
      DROP TABLE IF EXISTS room_users;
      DROP TABLE IF EXISTS rooms;
      DROP TABLE IF EXISTS level_settings;
      DROP TABLE IF EXISTS points_history;
      DROP TABLE IF EXISTS blocked_devices;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS friends;
      DROP TABLE IF EXISTS messages;
      DROP TABLE IF EXISTS users;
      
      CREATE TABLE users (
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
        is_online INTEGER DEFAULT 0,
        is_hidden INTEGER DEFAULT 0,
        last_seen TEXT,
        join_date TEXT,
        created_at TEXT,
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
    
    console.log('✅ تم إعادة إنشاء جدول المستخدمين');

    // إنشاء حسابات افتراضية متعددة
    const defaultUsers = [
      {
        username: 'المالك',
        password: 'owner123',
        userType: 'owner',
        role: 'owner',
        gender: 'male',
        points: 50000,
        level: 10,
        profileEffect: 'golden',
        usernameColor: '#FFD700'
      },
      {
        username: 'admin',
        password: 'admin123',
        userType: 'member', 
        role: 'member',
        gender: 'male',
        points: 25000,
        level: 5,
        profileEffect: 'silver',
        usernameColor: '#C0C0C0'
      },
      {
        username: 'مستخدم',
        password: 'user123',
        userType: 'member',
        role: 'member', 
        gender: 'male',
        points: 1000,
        level: 2,
        profileEffect: 'none',
        usernameColor: '#FFFFFF'
      },
      {
        username: 'ضيف',
        password: 'guest123',
        userType: 'guest',
        role: 'guest',
        gender: 'male', 
        points: 0,
        level: 1,
        profileEffect: 'none',
        usernameColor: '#CCCCCC'
      }
    ];

    console.log('👥 إنشاء المستخدمين الافتراضيين...');
    
    for (const user of defaultUsers) {
      // تشفير كلمة المرور
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      const result = db.prepare(`
        INSERT INTO users (
          username, password, user_type, role, profile_image,
          gender, points, level, profile_effect, username_color,
          join_date, created_at, last_seen
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        user.username,
        hashedPassword,
        user.userType,
        user.role,
        '/default_avatar.svg',
        user.gender,
        user.points,
        user.level,
        user.profileEffect,
        user.usernameColor,
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString()
      );
      
      console.log(`✅ تم إنشاء ${user.username} - ID: ${result.lastInsertRowid}`);
    }

    // إنشاء الجداول الأخرى إذا لم تكن موجودة
    console.log('🔧 التأكد من وجود جميع الجداول...');
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER REFERENCES users(id),
        receiver_id INTEGER REFERENCES users(id),
        room_id TEXT DEFAULT 'general',
        content TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'text',
        is_private INTEGER DEFAULT 0,
        timestamp TEXT
      );

      CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        friend_id INTEGER REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        data TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS blocked_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL,
        device_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        blocked_at TEXT NOT NULL,
        blocked_by INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS points_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS level_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level INTEGER NOT NULL UNIQUE,
        required_points INTEGER NOT NULL,
        title TEXT NOT NULL,
        color TEXT DEFAULT '#FFFFFF',
        benefits TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        is_default INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    // إضافة الغرفة العامة
    const defaultRoom = db.prepare("SELECT id FROM rooms WHERE id = 'general'").get();
    if (!defaultRoom) {
      db.prepare(`
        INSERT INTO rooms (id, name, description, created_by, is_default, created_at)
        VALUES ('general', 'الغرفة العامة', 'غرفة المحادثة الرئيسية', 1, 1, ?)
      `).run(new Date().toISOString());
      console.log('✅ تم إنشاء الغرفة العامة');
    }

    // إضافة إعدادات المستويات
    const levelsCount = db.prepare("SELECT COUNT(*) as count FROM level_settings").get();
    if (levelsCount.count === 0) {
      const levels = [
        { level: 1, points: 0, title: 'مبتدئ', color: '#FFFFFF' },
        { level: 2, points: 1000, title: 'متفاعل', color: '#90EE90' },
        { level: 3, points: 2500, title: 'نشيط', color: '#87CEEB' },
        { level: 4, points: 5000, title: 'متميز', color: '#DDA0DD' },
        { level: 5, points: 10000, title: 'خبير', color: '#F0E68C' },
        { level: 10, points: 50000, title: 'أسطورة', color: '#FFD700' }
      ];

      for (const lvl of levels) {
        db.prepare(`
          INSERT INTO level_settings (level, required_points, title, color, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(lvl.level, lvl.points, lvl.title, lvl.color, new Date().toISOString());
      }
      console.log('✅ تم إنشاء إعدادات المستويات');
    }

    // إعادة تفعيل foreign key constraints
    db.exec('PRAGMA foreign_keys = ON;');

    // التحقق النهائي
    console.log('\n🔍 التحقق النهائي من قاعدة البيانات:');
    
    const users = db.prepare('SELECT id, username, user_type, role FROM users ORDER BY id').all();
    console.log('\n👥 المستخدمون المتاحون:');
    console.table(users);

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('\n📋 الجداول الموجودة:');
    console.table(tables);

    console.log('\n🎉 تم الانتهاء من الحل الجذري!');
    console.log('\n🔑 معلومات تسجيل الدخول:');
    console.log('┌─────────────┬──────────────┬──────────────┐');
    console.log('│ اسم المستخدم │ كلمة المرور    │ النوع         │');
    console.log('├─────────────┼──────────────┼──────────────┤');
    console.log('│ المالك       │ owner123     │ مالك         │');
    console.log('│ admin       │ admin123     │ عضو          │');
    console.log('│ مستخدم      │ user123      │ عضو          │');
    console.log('│ ضيف         │ guest123     │ ضيف          │');
    console.log('└─────────────┴──────────────┴──────────────┘');

    console.log('\n✅ الآن يمكنك تسجيل الدخول بأي من هذه الحسابات!');
    console.log('🚀 قاعدة البيانات جاهزة ومحسنة للعمل!');

    db.close();

  } catch (error) {
    console.error('❌ حدث خطأ في الحل الجذري:', error);
    process.exit(1);
  }
}

nuclearDatabaseFix().catch(console.error);