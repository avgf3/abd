import dotenv from 'dotenv';
dotenv.config();

import { Pool } from '@neondatabase/serverless';

async function fixPostgreSQLDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl || !databaseUrl.startsWith('postgresql')) {
    console.error('❌ DATABASE_URL غير محدد أو ليس PostgreSQL');
    console.log('📝 يرجى تعديل ملف .env وإضافة:');
    console.log('DATABASE_URL=postgresql://username:password@localhost:5432/chatapp');
    process.exit(1);
  }

  console.log('🔄 إصلاح قاعدة بيانات PostgreSQL...');
  console.log('📁 رابط قاعدة البيانات:', databaseUrl.replace(/:[^:]*@/, ':****@'));

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // فحص الاتصال
    console.log('🔗 اختبار الاتصال بقاعدة البيانات...');
    await pool.query('SELECT 1');
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');

    // إنشاء جدول المستخدمين مع جميع الأعمدة في schema public
    console.log('🔧 إنشاء/تحديث جدول المستخدمين...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id SERIAL PRIMARY KEY,
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
        is_online BOOLEAN DEFAULT false,
        is_hidden BOOLEAN DEFAULT false,
        last_seen TIMESTAMP,
        join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
      );
    `);

    // فحص وإضافة الأعمدة المفقودة
    const missingColumns = [
      { name: 'role', type: 'TEXT DEFAULT \'guest\'' },
      { name: 'profile_background_color', type: 'TEXT DEFAULT \'#3c0d0d\'' },
      { name: 'bio', type: 'TEXT' },
      { name: 'username_color', type: 'TEXT DEFAULT \'#FFFFFF\'' },
      { name: 'user_theme', type: 'TEXT DEFAULT \'default\'' },
      { name: 'profile_effect', type: 'TEXT DEFAULT \'none\'' },
      { name: 'points', type: 'INTEGER DEFAULT 0' },
      { name: 'level', type: 'INTEGER DEFAULT 1' },
      { name: 'total_points', type: 'INTEGER DEFAULT 0' },
      { name: 'level_progress', type: 'INTEGER DEFAULT 0' }
    ];

    for (const column of missingColumns) {
      try {
        console.log(`🔍 فحص العمود: ${column.name}`);
        
        // فحص وجود العمود
        const columnExists = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = $1
        `, [column.name]);

        if (columnExists.rows.length === 0) {
          // إضافة العمود
          await pool.query(`ALTER TABLE public.users ADD COLUMN ${column.name} ${column.type}`);
          console.log(`✅ تم إضافة العمود: ${column.name}`);
        } else {
          console.log(`✅ العمود ${column.name} موجود بالفعل`);
        }
      } catch (error) {
        console.error(`❌ خطأ في معالجة العمود ${column.name}:`, error.message);
      }
    }

    // تحديث العمود role للمستخدمين الموجودين
    try {
      await pool.query(`
        UPDATE public.users 
        SET role = COALESCE(user_type, 'guest') 
        WHERE role IS NULL OR role = ''
      `);
      console.log('✅ تم تحديث أدوار المستخدمين');
    } catch (error) {
      console.error('❌ خطأ في تحديث الأدوار:', error.message);
    }

    // إنشاء جدول الرسائل
    console.log('🔧 إنشاء/تحديث جدول الرسائل...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES public.users(id),
        receiver_id INTEGER REFERENCES public.users(id),
        content TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        is_private BOOLEAN DEFAULT false,
        room_id TEXT DEFAULT 'general',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // إنشاء جدول الأصدقاء
    console.log('🔧 إنشاء/تحديث جدول الأصدقاء...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.friends (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES public.users(id),
        friend_id INTEGER REFERENCES public.users(id),
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // إنشاء جدول الإشعارات
    console.log('🔧 إنشاء/تحديث جدول الإشعارات...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES public.users(id),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // إنشاء جداول إضافية
    console.log('🔧 إنشاء الجداول الإضافية...');
    
    // جدول الأجهزة المحظورة
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.blocked_devices (
        id SERIAL PRIMARY KEY,
        ip_address TEXT NOT NULL,
        device_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        blocked_at TIMESTAMP NOT NULL,
        blocked_by INTEGER NOT NULL
      );
    `);

    // جدول تاريخ النقاط
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.points_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES public.users(id),
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // جدول إعدادات المستويات
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.level_settings (
        id SERIAL PRIMARY KEY,
        level INTEGER NOT NULL UNIQUE,
        required_points INTEGER NOT NULL,
        title TEXT NOT NULL,
        color TEXT DEFAULT '#FFFFFF',
        benefits JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        await pool.query(`
          INSERT INTO public.level_settings (level, required_points, title, color)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (level) DO NOTHING
        `, [levelData.level, levelData.required_points, levelData.title, levelData.color]);
      } catch (error) {
        console.log(`المستوى ${levelData.level} موجود بالفعل`);
      }
    }

    // إنشاء مستخدم المالك الافتراضي إذا لم يكن موجوداً
    console.log('🔧 إنشاء مستخدم المالك الافتراضي...');
    try {
      const ownerExists = await pool.query(`
        SELECT id FROM public.users 
        WHERE username = $1 OR user_type = $2
      `, ['المالك', 'owner']);
      
      if (ownerExists.rows.length === 0) {
        await pool.query(`
          INSERT INTO public.users (
            username, password, user_type, role, profile_image, 
            gender, points, level, profile_effect, username_color
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          'المالك', 'owner123', 'owner', 'owner', '/default_avatar.svg',
          'male', 50000, 10, 'golden', '#FFD700'
        ]);
        
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

    // عرض إحصائيات المستخدمين
    console.log('\n📊 إحصائيات المستخدمين:');
    const userStats = await pool.query(`
      SELECT 
        user_type,
        COUNT(*) as count
      FROM public.users 
      GROUP BY user_type
    `);
    console.table(userStats.rows);

    // عرض الجداول الموجودة
    console.log('\n📋 الجداول الموجودة في schema public:');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.table(tables.rows);

    console.log('✅ تم إصلاح قاعدة البيانات PostgreSQL بنجاح!');
    console.log('🎯 يمكنك الآن تشغيل الخادم بالأمر: npm run dev');
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح قاعدة البيانات:', error);
    
    if (error.code === 'ENOTFOUND') {
      console.log('💡 تأكد من:');
      console.log('   1. تشغيل خادم PostgreSQL');
      console.log('   2. صحة رابط قاعدة البيانات في .env');
      console.log('   3. صحة اسم المستخدم وكلمة المرور');
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 خادم PostgreSQL غير متاح على العنوان المحدد');
    }
    
    throw error;
  } finally {
    await pool.end();
  }
}

// تشغيل الإصلاح
fixPostgreSQLDatabase().catch(console.error);