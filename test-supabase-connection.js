#!/usr/bin/env node

/**
 * 🧪 سكريبت اختبار اتصال قاعدة بيانات Supabase
 * يتحقق من صحة الاتصال ووجود الجداول المطلوبة
 */

require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');

async function testSupabaseConnection() {
  console.log('🚀 اختبار اتصال قاعدة بيانات Supabase...\n');

  // 1. فحص متغير البيئة
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ متغير DATABASE_URL غير محدد في ملف .env');
    console.log('💡 يرجى إضافة رابط قاعدة البيانات في ملف .env:');
    console.log('   DATABASE_URL=postgresql://postgres:password@host:5432/postgres\n');
    process.exit(1);
  }

  console.log('✅ متغير DATABASE_URL محدد');
  console.log(`📍 الرابط: ${databaseUrl.replace(/:[^:]*@/, ':***@')}\n`);

  // 2. اختبار الاتصال
  let pool;
  try {
    pool = new Pool({ connectionString: databaseUrl });
    
    // اختبار بسيط
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ نجح الاتصال بقاعدة البيانات');
    console.log(`⏰ التوقيت الحالي: ${result.rows[0].current_time}\n`);
  } catch (error) {
    console.error('❌ فشل في الاتصال بقاعدة البيانات:');
    console.error(`   الخطأ: ${error.message}\n`);
    
    if (error.message.includes('password authentication failed')) {
      console.log('💡 حلول مقترحة:');
      console.log('   - تأكد من كلمة المرور في رابط قاعدة البيانات');
      console.log('   - تحقق من صحة اسم المستخدم');
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('💡 حلول مقترحة:');
      console.log('   - تأكد من صحة رابط الخادم');
      console.log('   - تحقق من أن مشروع Supabase نشط');
    }
    
    process.exit(1);
  }

  // 3. فحص وجود الجداول المطلوبة
  const requiredTables = ['users', 'messages', 'friends', 'notifications', 'blocked_devices'];
  console.log('🔍 فحص وجود الجداول المطلوبة...');
  
  for (const table of requiredTables) {
    try {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`✅ جدول ${table} موجود`);
      } else {
        console.log(`❌ جدول ${table} مفقود`);
      }
    } catch (error) {
      console.log(`❌ خطأ في فحص جدول ${table}: ${error.message}`);
    }
  }

  // 4. اختبار إنشاء واستعلام بسيط على جدول المستخدمين
  console.log('\n🧪 اختبار عمليات قاعدة البيانات...');
  
  try {
    // فحص وجود المدير الافتراضي
    const adminResult = await pool.query(`
      SELECT id, username, user_type, role FROM users WHERE username = 'admin'
    `);
    
    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      console.log('✅ المدير الافتراضي موجود:');
      console.log(`   ID: ${admin.id}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Type: ${admin.user_type}`);
      console.log(`   Role: ${admin.role}`);
    } else {
      console.log('⚠️  المدير الافتراضي غير موجود');
      console.log('💡 يمكن إنشاؤه عبر تشغيل الكود SQL في دليل الإعداد');
    }
    
  } catch (error) {
    console.log('❌ خطأ في اختبار جدول المستخدمين:');
    console.log(`   ${error.message}`);
    
    if (error.message.includes('relation "users" does not exist')) {
      console.log('\n💡 الجداول غير موجودة. يرجى تشغيل الكود SQL من دليل الإعداد');
    }
  }

  // 5. اختبار إنشاء مستخدم جديد (اختياري)
  try {
    const testUsername = `test_${Date.now()}`;
    await pool.query(`
      INSERT INTO users (username, password, user_type, role, gender, profile_image, 
                        is_online, last_seen, join_date, created_at)
      VALUES ($1, 'test123', 'member', 'member', 'male', '/default_avatar.svg',
              0, NOW()::text, NOW()::text, NOW()::text)
    `, [testUsername]);
    
    console.log('✅ تم إنشاء مستخدم اختبار بنجاح');
    
    // حذف المستخدم الاختباري
    await pool.query('DELETE FROM users WHERE username = $1', [testUsername]);
    console.log('✅ تم حذف مستخدم الاختبار');
    
  } catch (error) {
    console.log('⚠️  خطأ في اختبار إنشاء المستخدم:');
    console.log(`   ${error.message}`);
  }

  await pool.end();
  
  console.log('\n🎉 انتهى اختبار قاعدة البيانات');
  console.log('\n📋 الخطوات التالية:');
  console.log('   1. إذا كانت الجداول مفقودة، نفذ الكود SQL من دليل-اعداد-Supabase.md');
  console.log('   2. شغل الخادم: npm run dev');
  console.log('   3. اختبر تسجيل الدخول من الواجهة');
}

// تشغيل الاختبار
testSupabaseConnection().catch(error => {
  console.error('\n💥 خطأ غير متوقع:', error);
  process.exit(1);
});