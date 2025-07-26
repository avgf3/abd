import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

async function fixDatabase() {
  console.log('🔧 بدء إصلاح قاعدة البيانات...');

  try {
    let client;
    let db;

    // محاولة الاتصال بـ PostgreSQL أولاً
    if (process.env.DATABASE_URL) {
      console.log('🐘 محاولة الاتصال بـ PostgreSQL...');
      client = postgres(process.env.DATABASE_URL, { max: 1 });
      db = drizzle(client);
      
      // اختبار الاتصال
      await db.execute(sql`SELECT 1`);
      console.log('✅ تم الاتصال بـ PostgreSQL بنجاح');
    } else {
      console.log('📝 لا يوجد DATABASE_URL، استخدام SQLite...');
      // هنا يمكن إضافة كود SQLite إذا لزم الأمر
      return;
    }

    // إضافة العمود role إذا كان مفقود
    try {
      console.log('🔧 إضافة عمود role إذا كان مفقود...');
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'guest'
      `);
      
      // تحديث role ليطابق user_type
      await db.execute(sql`
        UPDATE users SET role = user_type WHERE role IS NULL OR role = ''
      `);
      
      console.log('✅ تم إصلاح عمود role');
    } catch (error) {
      console.log('⚠️ عمود role موجود مسبقاً أو تم إنشاؤه');
    }

    // إضافة أعمدة أخرى مفقودة
    const columnsToAdd = [
      { name: 'profile_background_color', sql: 'profile_background_color TEXT DEFAULT \'#3c0d0d\'' },
      { name: 'username_color', sql: 'username_color TEXT DEFAULT \'#FFFFFF\'' },
      { name: 'user_theme', sql: 'user_theme TEXT DEFAULT \'default\'' },
      { name: 'profile_effect', sql: 'profile_effect TEXT DEFAULT \'none\'' },
      { name: 'points', sql: 'points INTEGER DEFAULT 0' },
      { name: 'level', sql: 'level INTEGER DEFAULT 1' },
      { name: 'total_points', sql: 'total_points INTEGER DEFAULT 0' },
      { name: 'level_progress', sql: 'level_progress INTEGER DEFAULT 0' }
    ];

    for (const column of columnsToAdd) {
      try {
        await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${column.sql}`));
        console.log(`✅ أضيف عمود ${column.name}`);
      } catch (error) {
        console.log(`⚠️ عمود ${column.name} موجود مسبقاً`);
      }
    }

    // إنشاء المالك الافتراضي إذا لم يكن موجود
    try {
      console.log('👑 فحص وجود المالك...');
      const existingOwner = await db.execute(sql`
        SELECT id FROM users WHERE user_type = 'owner' LIMIT 1
      `);

      if (existingOwner.length === 0) {
        console.log('🔑 إنشاء مالك افتراضي...');
        
        // استيراد bcrypt فقط عند الحاجة
        const bcrypt = await import('bcrypt');
        const hashedPassword = await bcrypt.hash('admin123', 12);
        
        await db.execute(sql`
          INSERT INTO users (
            username, password, user_type, role, profile_background_color,
            username_color, user_theme, profile_effect, points, level,
            total_points, level_progress, join_date, created_at,
            is_online, is_hidden, is_muted, is_banned, is_blocked, ignored_users
          ) VALUES (
            'Owner', ${hashedPassword}, 'owner', 'owner', '#FFD700',
            '#FFD700', 'royal', 'golden', 10000, 100,
            10000, 100, NOW(), NOW(),
            false, false, false, false, false, '[]'
          )
        `);
        
        console.log('✅ تم إنشاء المالك الافتراضي بنجاح');
        console.log('👑 بيانات الدخول: Username: Owner, Password: admin123');
      } else {
        console.log('✅ المالك موجود مسبقاً');
      }
    } catch (error) {
      console.error('❌ خطأ في إنشاء المالك:', error);
    }

    // إغلاق الاتصال
    if (client) {
      await client.end();
    }

    console.log('🎉 تم إصلاح قاعدة البيانات بنجاح!');
    console.log('');
    console.log('📋 الخطوات التالية:');
    console.log('1. تشغيل الخادم: npm run dev');
    console.log('2. فتح الموقع: http://localhost:5000');
    console.log('3. تسجيل دخول كمالك: Owner / admin123');

  } catch (error) {
    console.error('❌ فشل في إصلاح قاعدة البيانات:', error);
    process.exit(1);
  }
}

// تشغيل الإصلاح
fixDatabase();