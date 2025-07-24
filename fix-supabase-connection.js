#!/usr/bin/env node

/**
 * 🔧 سكريبت إصلاح اتصال Supabase للنشر على Render
 * يتحقق من الاتصال وينشئ الجداول المطلوبة ويحضر المشروع للنشر
 */

require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');

const REQUIRED_TABLES = [
  'users', 'messages', 'friends', 'notifications', 'blocked_devices',
  'level_settings', 'points_history'
];

async function fixSupabaseConnection() {
  console.log('🔧 بدء إصلاح اتصال Supabase للنشر على Render...\n');

  // 1. التحقق من متغيرات البيئة
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ متغير DATABASE_URL غير محدد');
    console.log('💡 يرجى تحديث ملف .env بالرابط الصحيح:');
    console.log('   DATABASE_URL=postgresql://postgres:PASSWORD@qzehjgmawnrihmepboca.supabase.co:5432/postgres?sslmode=require\n');
    process.exit(1);
  }

  if (databaseUrl.includes('[YOUR-PASSWORD]') || databaseUrl.includes('password')) {
    console.error('❌ يرجى استبدال كلمة المرور في DATABASE_URL');
    console.log('💡 احصل على كلمة المرور الصحيحة من Supabase Dashboard > Settings > Database\n');
    process.exit(1);
  }

  console.log('✅ متغير DATABASE_URL محدد بشكل صحيح');
  console.log(`📍 الرابط: ${databaseUrl.replace(/:[^:]*@/, ':***@')}\n`);

  // 2. اختبار الاتصال
  let pool;
  try {
    pool = new Pool({ 
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
    
    const result = await pool.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ نجح الاتصال بقاعدة بيانات Supabase');
    console.log(`⏰ التوقيت: ${result.rows[0].current_time}`);
    console.log(`🗄️ الإصدار: ${result.rows[0].version.split(' ')[0]}\n`);
  } catch (error) {
    console.error('❌ فشل في الاتصال بقاعدة البيانات:');
    console.error(`   الخطأ: ${error.message}\n`);
    
    console.log('💡 حلول مقترحة:');
    if (error.message.includes('password authentication failed')) {
      console.log('   - تحقق من كلمة المرور في Supabase Dashboard');
      console.log('   - أعد كتابة كلمة المرور في رابط DATABASE_URL');
    }
    if (error.message.includes('ENOTFOUND') || error.message.includes('connection refused')) {
      console.log('   - تأكد من أن مشروع Supabase نشط ومتاح');
      console.log('   - تحقق من صحة معرف المشروع في الرابط');
    }
    if (error.message.includes('SSL')) {
      console.log('   - تأكد من وجود ?sslmode=require في نهاية الرابط');
    }
    
    process.exit(1);
  }

  // 3. فحص وإنشاء الجداول المطلوبة
  console.log('🔍 فحص وإنشاء الجداول المطلوبة...');
  
  try {
    await createTablesIfNotExist(pool);
    console.log('✅ تم إنشاء/التحقق من جميع الجداول\n');
  } catch (error) {
    console.error('❌ خطأ في إنشاء الجداول:', error.message);
    process.exit(1);
  }

  // 4. إنشاء المستخدم الافتراضي
  try {
    await createDefaultUsers(pool);
    console.log('✅ تم إنشاء/التحقق من المستخدمين الافتراضيين\n');
  } catch (error) {
    console.error('❌ خطأ في إنشاء المستخدمين:', error.message);
  }

  // 5. إعداد إعدادات المستويات
  try {
    await setupLevelSettings(pool);
    console.log('✅ تم إعداد نظام المستويات\n');
  } catch (error) {
    console.error('❌ خطأ في إعداد المستويات:', error.message);
  }

  await pool.end();
  
  console.log('🎉 تم إكمال إعداد قاعدة البيانات بنجاح!');
  console.log('\n📋 الخطوات التالية للنشر على Render:');
  console.log('   1. ادفع الكود إلى GitHub');
  console.log('   2. في Render Dashboard، أضف متغيرات البيئة:');
  console.log('      - DATABASE_URL (نفس الرابط المستخدم هنا)');
  console.log('      - NODE_ENV=production');
  console.log('      - PORT=10000');
  console.log('   3. انشر التطبيق على Render');
  console.log('   4. اختبر الواجهة والدردشة\n');
}

async function createTablesIfNotExist(pool) {
  // إنشاء جدول المستخدمين
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
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

  // إنشاء جدول الرسائل
  await pool.query(`
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

  // إنشاء جدول الأصدقاء
  await pool.query(`
    CREATE TABLE IF NOT EXISTS friends (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      friend_id INTEGER REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // إنشاء جدول الإشعارات
  await pool.query(`
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

  // إنشاء جدول الأجهزة المحظورة
  await pool.query(`
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

  // إنشاء جدول إعدادات المستويات
  await pool.query(`
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

  // إنشاء جدول تاريخ النقاط
  await pool.query(`
    CREATE TABLE IF NOT EXISTS points_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      points INTEGER NOT NULL,
      reason TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function createDefaultUsers(pool) {
  // فحص وجود المدير
  const adminResult = await pool.query(`
    SELECT id FROM users WHERE username = 'admin'
  `);

  if (adminResult.rows.length === 0) {
    await pool.query(`
      INSERT INTO users (username, password, user_type, role, gender, profile_image, 
                        is_online, points, level, total_points, level_progress)
      VALUES ('admin', 'admin123', 'owner', 'owner', 'male', '/default_avatar.svg',
              false, 1000, 3, 1000, 0)
    `);
    console.log('✅ تم إنشاء المستخدم الافتراضي: admin');
  }

  // فحص وجود مستخدم اختبار
  const testResult = await pool.query(`
    SELECT id FROM users WHERE username = 'testuser'
  `);

  if (testResult.rows.length === 0) {
    await pool.query(`
      INSERT INTO users (username, password, user_type, role, gender, profile_image,
                        is_online, points, level, total_points, level_progress)
      VALUES ('testuser', 'test123', 'member', 'member', 'female', '/default_avatar.svg',
              false, 150, 2, 150, 50)
    `);
    console.log('✅ تم إنشاء المستخدم الاختباري: testuser');
  }
}

async function setupLevelSettings(pool) {
  const levelResult = await pool.query(`
    SELECT COUNT(*) as count FROM level_settings
  `);

  if (parseInt(levelResult.rows[0].count) === 0) {
    const levels = [
      { level: 1, points: 0, title: 'مبتدئ', color: '#FFFFFF' },
      { level: 2, points: 100, title: 'متدرب', color: '#10B981' },
      { level: 3, points: 250, title: 'نشط', color: '#3B82F6' },
      { level: 4, points: 500, title: 'متقدم', color: '#8B5CF6' },
      { level: 5, points: 1000, title: 'خبير', color: '#F59E0B' },
      { level: 6, points: 2000, title: 'محترف', color: '#EF4444' },
      { level: 7, points: 4000, title: 'أسطورة', color: '#EC4899' },
      { level: 8, points: 8000, title: 'بطل', color: '#6366F1' },
      { level: 9, points: 15000, title: 'ملك', color: '#F97316' },
      { level: 10, points: 30000, title: 'إمبراطور', color: '#DC2626' }
    ];

    for (const level of levels) {
      await pool.query(`
        INSERT INTO level_settings (level, required_points, title, color, benefits)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        level.level,
        level.points,
        level.title,
        level.color,
        JSON.stringify({
          dailyBonus: level.level * 10,
          specialFeatures: level.level > 5 ? ['custom_colors', 'profile_effects'] : []
        })
      ]);
    }
    console.log('✅ تم إعداد إعدادات المستويات (10 مستويات)');
  }
}

// تشغيل السكريبت
fixSupabaseConnection().catch(error => {
  console.error('\n💥 خطأ غير متوقع:', error);
  process.exit(1);
});