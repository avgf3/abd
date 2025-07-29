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

async function fixDatabaseIssue() {
  console.log('🔧 بدء إصلاح مشكلة قاعدة البيانات...');
  
  try {
    // التحقق من وجود الجداول
    console.log('📋 التحقق من الجداول الموجودة...');
    
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    console.log('📊 الجداول الموجودة:', tables.map(t => t.table_name));
    
    // التحقق من وجود جدول level_settings
    const levelSettingsExists = tables.some(t => t.table_name === 'level_settings');
    
    if (levelSettingsExists) {
      console.log('✅ جدول level_settings موجود بالفعل');
      
      // التحقق من محتوى الجدول
      const levelSettings = await client`
        SELECT * FROM level_settings LIMIT 5;
      `;
      
      console.log('📊 محتوى جدول level_settings:', levelSettings);
      
      // إضافة بيانات افتراضية إذا كان الجدول فارغاً
      if (levelSettings.length === 0) {
        console.log('➕ إضافة بيانات افتراضية لجدول level_settings...');
        
        await client`
          INSERT INTO level_settings (level, required_points, title, color, benefits) VALUES
          (1, 0, 'مبتدئ', '#FFFFFF', '{"can_send_messages": true}'),
          (2, 100, 'متقدم', '#00FF00', '{"can_send_messages": true, "can_use_colors": true}'),
          (3, 300, 'خبير', '#0000FF', '{"can_send_messages": true, "can_use_colors": true, "can_use_emojis": true}'),
          (4, 600, 'محترف', '#FF0000', '{"can_send_messages": true, "can_use_colors": true, "can_use_emojis": true, "can_create_rooms": true}'),
          (5, 1000, 'أسطورة', '#FFD700', '{"can_send_messages": true, "can_use_colors": true, "can_use_emojis": true, "can_create_rooms": true, "can_moderate": true}')
          ON CONFLICT (level) DO NOTHING;
        `;
        
        console.log('✅ تم إضافة البيانات الافتراضية');
      }
    } else {
      console.log('❌ جدول level_settings غير موجود');
    }
    
    // التحقق من وجود جدول messages
    const messagesExists = tables.some(t => t.table_name === 'messages');
    
    if (messagesExists) {
      console.log('✅ جدول messages موجود');
      
      // التحقق من عدد الرسائل
      const messageCount = await client`
        SELECT COUNT(*) as count FROM messages;
      `;
      
      console.log(`📊 عدد الرسائل في قاعدة البيانات: ${messageCount[0].count}`);
    } else {
      console.log('❌ جدول messages غير موجود');
    }
    
    // التحقق من وجود جدول users
    const usersExists = tables.some(t => t.table_name === 'users');
    
    if (usersExists) {
      console.log('✅ جدول users موجود');
      
      // التحقق من عدد المستخدمين
      const userCount = await client`
        SELECT COUNT(*) as count FROM users;
      `;
      
      console.log(`📊 عدد المستخدمين في قاعدة البيانات: ${userCount[0].count}`);
      
      // إضافة مستخدم اختبار إذا لم يكن موجود
      if (userCount[0].count === 0) {
        console.log('➕ إضافة مستخدم اختبار...');
        
        await client`
          INSERT INTO users (username, password, user_type, role, is_online) VALUES
          ('test_user', 'hashed_password', 'member', 'member', false)
          ON CONFLICT (username) DO NOTHING;
        `;
        
        console.log('✅ تم إضافة مستخدم الاختبار');
      }
    } else {
      console.log('❌ جدول users غير موجود');
    }
    
    console.log('🎉 تم إصلاح قاعدة البيانات بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح قاعدة البيانات:', error);
  } finally {
    await client.end();
    process.exit(0);
  }
}

fixDatabaseIssue();