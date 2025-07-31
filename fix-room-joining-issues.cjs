require('dotenv').config();

const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { eq, desc, asc, sql, and } = require('drizzle-orm');

// إعداد قاعدة البيانات
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres.qzehjgmawnrihmepboca:abood22333a@aws-0-eu-west-3.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

// استيراد الجداول
const { rooms, roomUsers, users } = require('./shared/schema.ts');

async function fixRoomJoiningIssues() {
  console.log('🔧 بدء إصلاح مشاكل انضمام الغرف...\n');

  try {
    // 1. التحقق من وجود جداول الغرف
    console.log('1️⃣ التحقق من وجود جداول الغرف...');
    
    const tablesExist = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'rooms'
      );
    `);
    
    if (!tablesExist[0]?.exists) {
      console.log('❌ جدول الغرف غير موجود - إنشاء الجداول...');
      await createRoomsTables();
    } else {
      console.log('✅ جداول الغرف موجودة');
    }

    // 2. إنشاء الغرفة العامة إذا لم تكن موجودة
    console.log('\n2️⃣ التحقق من وجود الغرفة العامة...');
    const generalRoom = await db.select().from(rooms).where(eq(rooms.id, 'general')).limit(1);
    
    if (generalRoom.length === 0) {
      console.log('❌ الغرفة العامة غير موجودة - إنشاؤها...');
      await db.insert(rooms).values({
        id: 'general',
        name: 'الغرفة العامة',
        description: 'الغرفة الرئيسية للمحادثة العامة',
        icon: '',
        createdBy: 1,
        isDefault: true,
        isActive: true,
        isBroadcast: false,
        hostId: null,
        speakers: '[]',
        micQueue: '[]'
      });
      console.log('✅ تم إنشاء الغرفة العامة');
    } else {
      console.log('✅ الغرفة العامة موجودة');
    }

    // 3. إصلاح مشاكل في جدول room_users
    console.log('\n3️⃣ إصلاح مشاكل في جدول room_users...');
    
    // إضافة unique constraint إذا لم يكن موجود
    try {
      await db.execute(`
        ALTER TABLE room_users 
        ADD CONSTRAINT room_users_user_room_unique 
        UNIQUE (user_id, room_id);
      `);
      console.log('✅ تم إضافة unique constraint لـ room_users');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ unique constraint موجود بالفعل');
      } else {
        console.log('⚠️ خطأ في إضافة unique constraint:', error.message);
      }
    }

    // 4. اختبار وظائف الغرف
    console.log('\n4️⃣ اختبار وظائف الغرف...');
    await testRoomFunctions();

    // 5. إصلاح مشاكل في المستخدمين
    console.log('\n5️⃣ إصلاح مشاكل في المستخدمين...');
    await fixUserIssues();

    console.log('\n✅ تم إصلاح مشاكل انضمام الغرف بنجاح!');

  } catch (error) {
    console.error('❌ خطأ في إصلاح مشاكل الغرف:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function createRoomsTables() {
  console.log('🔨 إنشاء جداول الغرف...');
  
  // إنشاء جدول الغرف
  await db.execute(`
    CREATE TABLE IF NOT EXISTS "rooms" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "description" text,
      "icon" text,
      "created_by" integer NOT NULL REFERENCES "users"("id"),
      "is_default" boolean DEFAULT false,
      "is_active" boolean DEFAULT true,
      "is_broadcast" boolean DEFAULT false,
      "host_id" integer REFERENCES "users"("id"),
      "speakers" text DEFAULT '[]',
      "mic_queue" text DEFAULT '[]',
      "created_at" timestamp DEFAULT now()
    );
  `);

  // إنشاء جدول مستخدمي الغرف
  await db.execute(`
    CREATE TABLE IF NOT EXISTS "room_users" (
      "id" serial PRIMARY KEY,
      "user_id" integer NOT NULL REFERENCES "users"("id"),
      "room_id" text NOT NULL REFERENCES "rooms"("id"),
      "joined_at" timestamp DEFAULT now(),
      UNIQUE("user_id", "room_id")
    );
  `);

  console.log('✅ تم إنشاء جداول الغرف');
}

async function testRoomFunctions() {
  console.log('🧪 اختبار وظائف الغرف...');

  // اختبار جلب جميع الغرف
  const allRooms = await db.select().from(rooms).where(eq(rooms.isActive, true));
  console.log(`✅ تم جلب ${allRooms.length} غرفة`);

  // اختبار انضمام مستخدم للغرفة
  const testUserId = 1;
  const testRoomId = 'general';
  
  // التحقق من وجود المستخدم
  const user = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
  if (user.length === 0) {
    console.log('⚠️ المستخدم التجريبي غير موجود - تخطي اختبار الانضمام');
    return;
  }

  // محاولة الانضمام للغرفة
  try {
    await db.insert(roomUsers).values({
      userId: testUserId,
      roomId: testRoomId
    }).onConflictDoNothing();
    console.log('✅ تم اختبار انضمام المستخدم للغرفة');
  } catch (error) {
    console.log('⚠️ خطأ في اختبار الانضمام:', error.message);
  }

  // اختبار جلب مستخدمي الغرفة
  const roomUsersList = await db.select()
    .from(roomUsers)
    .where(eq(roomUsers.roomId, testRoomId));
  console.log(`✅ تم جلب ${roomUsersList.length} مستخدم في الغرفة العامة`);
}

async function fixUserIssues() {
  console.log('👥 إصلاح مشاكل المستخدمين...');

  // التأكد من أن جميع المستخدمين لديهم قيم افتراضية صحيحة
  await db.execute(`
    UPDATE users 
    SET 
      is_online = COALESCE(is_online, false),
      is_hidden = COALESCE(is_hidden, false),
      ignored_users = COALESCE(ignored_users, '[]'),
      username_color = COALESCE(username_color, '#FFFFFF'),
      user_theme = COALESCE(user_theme, 'default'),
      profile_effect = COALESCE(profile_effect, 'none'),
      points = COALESCE(points, 0),
      level = COALESCE(level, 1),
      total_points = COALESCE(total_points, 0),
      level_progress = COALESCE(level_progress, 0)
    WHERE 
      is_online IS NULL 
      OR is_hidden IS NULL 
      OR ignored_users IS NULL 
      OR username_color IS NULL 
      OR user_theme IS NULL 
      OR profile_effect IS NULL 
      OR points IS NULL 
      OR level IS NULL 
      OR total_points IS NULL 
      OR level_progress IS NULL;
  `);

  console.log('✅ تم إصلاح قيم المستخدمين الافتراضية');
}

// تشغيل الإصلاح
fixRoomJoiningIssues().catch(console.error);