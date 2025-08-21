import dotenv from 'dotenv';
dotenv.config();

import Database from 'better-sqlite3';

async function checkDatabase() {
  const databaseUrl = process.env.DATABASE_URL || 'sqlite:./chat.db';
  let dbPath = './chat.db';
  if (databaseUrl.startsWith('sqlite:')) {
    dbPath = databaseUrl.replace('sqlite:', '');
  }

  console.log('🔍 فحص قاعدة البيانات:', dbPath);

  const db = new Database(dbPath);

  try {
    // فحص جدول المستخدمين
    console.log('\n📊 إحصائيات المستخدمين:');
    const userStats = db
      .prepare(
        `
      SELECT 
        user_type,
        COUNT(*) as count
      FROM users 
      GROUP BY user_type
    `
      )
      .all();

    console.table(userStats);

    // البحث عن المالك
    console.log('\n👑 البحث عن المالك:');
    const owners = db
      .prepare(
        `
      SELECT id, username, user_type, role, password 
      FROM users 
      WHERE user_type = 'owner' OR username = 'المالك'
    `
      )
      .all();

    if (owners.length > 0) {
      console.log('✅ تم العثور على المالك:');
      owners.forEach((owner) => {
        console.log(`  - ID: ${owner.id}`);
        console.log(`  - اسم المستخدم: ${owner.username}`);
        console.log(`  - النوع: ${owner.user_type}`);
        console.log(`  - الدور: ${owner.role}`);
        console.log(`  - كلمة المرور: ${owner.password || 'غير محددة'}`);
      });
    } else {
      console.log('❌ لم يتم العثور على أي مالك');

      // إنشاء مالك جديد
      console.log('🔧 إنشاء مالك جديد...');
      const result = db
        .prepare(
          `
        INSERT INTO users (
          username, password, user_type, role, profile_image, 
          gender, points, level, profile_effect, username_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          'المالك',
          'owner123',
          'owner',
          'owner',
          '/default_avatar.svg',
          'male',
          50000,
          10,
          'golden',
          '#FFD700'
        );

      console.log('✅ تم إنشاء المالك بنجاح');
      console.log('📝 معلومات تسجيل الدخول:');
      console.log('   اسم المستخدم: المالك');
      console.log('   كلمة المرور: owner123');
    }

    // عرض جميع المستخدمين
    console.log('\n👥 جميع المستخدمين:');
    const allUsers = db
      .prepare(
        `
      SELECT id, username, user_type, role 
      FROM users 
      ORDER BY id DESC 
      LIMIT 10
    `
      )
      .all();

    console.table(allUsers);

    // فحص الجداول
    console.log('\n📋 الجداول الموجودة:');
    const tables = db
      .prepare(
        `
      SELECT name FROM sqlite_master WHERE type='table'
    `
      )
      .all();

    console.table(tables);
  } catch (error) {
    console.error('❌ خطأ في فحص قاعدة البيانات:', error);
  } finally {
    db.close();
  }
}

checkDatabase().catch(console.error);
