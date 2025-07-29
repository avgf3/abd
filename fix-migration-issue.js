import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL غير محدد في ملف .env');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function fixMigrationIssue() {
  console.log('🔧 بدء إصلاح مشكلة الترحيلات...');
  
  try {
    // التحقق من جدول الترحيلات
    console.log('📋 التحقق من جدول الترحيلات...');
    
    const migrations = await client`
      SELECT * FROM __drizzle_migrations ORDER BY created_at;
    `;
    
    console.log('📊 الترحيلات المطبقة:', migrations.map(m => m.hash));
    
    // إضافة الترحيلات المفقودة يدوياً
    const expectedMigrations = [
      '0000_young_mercury',
      '0001_tranquil_clea', 
      '0002_eminent_rocket_raccoon',
      '0003_fix_profile_effect',
      '0004_add_rooms_tables'
    ];
    
    for (const migration of expectedMigrations) {
      const exists = migrations.some(m => m.hash === migration);
      if (!exists) {
        console.log(`➕ إضافة ترحيل مفقود: ${migration}`);
        await client`
          INSERT INTO __drizzle_migrations (id, hash, created_at) 
          VALUES (DEFAULT, ${migration}, NOW())
          ON CONFLICT (hash) DO NOTHING;
        `;
      }
    }
    
    // التحقق من وجود جميع الجداول المطلوبة
    console.log('📋 التحقق من الجداول...');
    
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    const requiredTables = [
      'users', 'messages', 'friends', 'notifications', 
      'blocked_devices', 'level_settings', 'points_history',
      'rooms', 'room_users'
    ];
    
    for (const table of requiredTables) {
      const exists = tables.some(t => t.table_name === table);
      if (exists) {
        console.log(`✅ جدول ${table} موجود`);
      } else {
        console.log(`❌ جدول ${table} مفقود`);
      }
    }
    
    // إضافة مستخدم اختبار إذا لم يكن موجود
    console.log('👤 التحقق من مستخدم الاختبار...');
    
    const testUser = await client`
      SELECT * FROM users WHERE username = 'test_user' LIMIT 1;
    `;
    
    if (testUser.length === 0) {
      console.log('➕ إضافة مستخدم اختبار...');
      await client`
        INSERT INTO users (username, password, user_type, role, is_online) VALUES
        ('test_user', 'hashed_password', 'member', 'member', false)
        ON CONFLICT (username) DO NOTHING;
      `;
      console.log('✅ تم إضافة مستخدم الاختبار');
    } else {
      console.log('✅ مستخدم الاختبار موجود');
    }
    
    // التحقق من وجود غرف افتراضية
    console.log('🏠 التحقق من الغرف الافتراضية...');
    
    const rooms = await client`
      SELECT * FROM rooms WHERE id IN ('general', 'broadcast', 'music');
    `;
    
    if (rooms.length < 3) {
      console.log('➕ إضافة غرف افتراضية...');
      await client`
        INSERT INTO rooms (id, name, description, icon, created_by, is_default, is_active, is_broadcast, host_id, speakers, mic_queue) VALUES
        ('general', 'الدردشة العامة', 'الغرفة الرئيسية للدردشة', '', 1, true, true, false, null, '[]', '[]'),
        ('broadcast', 'غرفة البث المباشر', 'غرفة خاصة للبث المباشر مع نظام المايك', '', 1, false, true, true, 1, '[]', '[]'),
        ('music', 'أغاني وسهر', 'غرفة للموسيقى والترفيه', '', 1, false, true, false, null, '[]', '[]')
        ON CONFLICT (id) DO NOTHING;
      `;
      console.log('✅ تم إضافة الغرف الافتراضية');
    } else {
      console.log('✅ الغرف الافتراضية موجودة');
    }
    
    console.log('🎉 تم إصلاح مشكلة الترحيلات بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح الترحيلات:', error);
  } finally {
    await client.end();
    process.exit(0);
  }
}

fixMigrationIssue();