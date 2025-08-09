import Database from 'better-sqlite3';
import { existsSync } from 'fs';

function initializeDatabase() {
  console.log('🚀 بدء تهيئة قاعدة البيانات...');
  
  const db = new Database('./chat.db');
  
  try {
    // إنشاء جدول المستخدمين
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
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
        is_online BOOLEAN DEFAULT FALSE,
        is_hidden BOOLEAN DEFAULT FALSE,
        last_seen DATETIME,
        join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_muted BOOLEAN DEFAULT FALSE,
        mute_expiry DATETIME,
        is_banned BOOLEAN DEFAULT FALSE,
        ban_expiry DATETIME,
        is_blocked BOOLEAN DEFAULT FALSE,
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

    // إنشاء جدول الرسائل
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER,
        content TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        is_private BOOLEAN DEFAULT FALSE,
        room_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        edited_at DATETIME,
        deleted_at DATETIME,
        attachments TEXT
      )
    `);

    // إنشاء جدول الأصدقاء
    db.exec(`
      CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        friend_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, friend_id)
      )
    `);

    // إنشاء جدول الإشعارات
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        data TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إنشاء جدول الأجهزة المحظورة
    db.exec(`
      CREATE TABLE IF NOT EXISTS blocked_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        ip_address TEXT,
        reason TEXT,
        blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME
      )
    `);

    // إنشاء جدول تاريخ النقاط
    db.exec(`
      CREATE TABLE IF NOT EXISTS points_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إنشاء جدول إعدادات المستويات
    db.exec(`
      CREATE TABLE IF NOT EXISTS level_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level INTEGER NOT NULL UNIQUE,
        required_points INTEGER NOT NULL,
        title TEXT NOT NULL,
        color TEXT DEFAULT '#FFFFFF',
        badge TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إنشاء جدول الغرف
    db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'public',
        owner_id INTEGER REFERENCES users(id),
        max_users INTEGER DEFAULT 50,
        is_private BOOLEAN DEFAULT FALSE,
        password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        last_message_at DATETIME,
        slug TEXT UNIQUE
      )
    `);

    // إنشاء جدول room_users لتتبع عضوية الغرف
    db.exec(`
      CREATE TABLE IF NOT EXISTS room_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        room_id TEXT NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, room_id)
      )
    `);

    // إنشاء جدول منشورات الحائط
    db.exec(`
      CREATE TABLE IF NOT EXISTS wall_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        type TEXT DEFAULT 'public',
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إنشاء جدول تفاعلات الحائط
    db.exec(`
      CREATE TABLE IF NOT EXISTS wall_reactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL REFERENCES wall_posts(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        reaction_type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id)
      )
    `);

    console.log('✅ تم إنشاء جميع الجداول بنجاح');

    // إضافة بيانات أولية
    console.log('📝 إضافة البيانات الأولية...');
    
    // التحقق من وجود المالك
    const existingOwner = db.prepare('SELECT id FROM users WHERE user_type = ? OR username = ?').get('owner', 'المالك');
    
    if (!existingOwner) {
      // إنشاء المالك
      const insertOwner = db.prepare(`
        INSERT INTO users (
          username, password, user_type, role, profile_image, 
          gender, points, level, profile_effect, username_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertOwner.run(
        'المالك', 'owner123', 'owner', 'owner', '/default_avatar.svg',
        'male', 50000, 10, 'golden', '#FFD700'
      );
      
      console.log('👑 تم إنشاء حساب المالك');
      console.log('   اسم المستخدم: المالك');
      console.log('   كلمة المرور: owner123');
    } else {
      console.log('👑 حساب المالك موجود بالفعل');
    }

    // إضافة إعدادات المستويات الأولية
    const levelExists = db.prepare('SELECT COUNT(*) as count FROM level_settings').get();
    if (levelExists.count === 0) {
      const levels = [
        { level: 1, required_points: 0, title: 'مبتدئ', color: '#FFFFFF', badge: '🔰' },
        { level: 2, required_points: 100, title: 'نشط', color: '#00FF00', badge: '⭐' },
        { level: 3, required_points: 500, title: 'متقدم', color: '#0080FF', badge: '🌟' },
        { level: 4, required_points: 1000, title: 'خبير', color: '#8000FF', badge: '💎' },
        { level: 5, required_points: 2500, title: 'أسطورة', color: '#FFD700', badge: '👑' }
      ];

      const insertLevel = db.prepare(`
        INSERT INTO level_settings (level, required_points, title, color, badge)
        VALUES (?, ?, ?, ?, ?)
      `);

      levels.forEach(level => {
        insertLevel.run(level.level, level.required_points, level.title, level.color, level.badge);
      });

      console.log('🎯 تم إضافة إعدادات المستويات');
    }

    // إضافة غرفة عامة افتراضية
    const roomExists = db.prepare('SELECT COUNT(*) as count FROM rooms WHERE name = ?').get('الغرفة العامة');
    if (roomExists.count === 0) {
      const insertRoom = db.prepare(`
        INSERT INTO rooms (name, description, type, owner_id)
        VALUES (?, ?, ?, ?)
      `);
      
      const ownerId = db.prepare('SELECT id FROM users WHERE user_type = ?').get('owner')?.id || 1;
      insertRoom.run('الغرفة العامة', 'غرفة للدردشة العامة', 'public', ownerId);
      
      console.log('🏠 تم إنشاء الغرفة العامة');
    }

    // فحص الجداول النهائي
    console.log('\n📋 فحص الجداول المُنشأة:');
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `).all();
    
    tables.forEach(table => {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
      console.log(`  ✅ ${table.name}: ${count.count} سجل`);
    });

    console.log('\n🎉 تم إعداد قاعدة البيانات بنجاح!');
    console.log('💡 يمكنك الآن تشغيل الخادم وفحص المسارات');
    
  } catch (error) {
    console.error('❌ خطأ في إعداد قاعدة البيانات:', error);
  } finally {
    db.close();
  }
}

// تشغيل التهيئة
initializeDatabase();