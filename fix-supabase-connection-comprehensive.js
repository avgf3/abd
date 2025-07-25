import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

async function diagnoseSupabaseConnection() {
  console.log('🔍 تشخيص شامل لاتصال Supabase...\n');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  // 1. فحص متغير البيئة
  console.log('📋 فحص متغيرات البيئة:');
  console.log(`DATABASE_URL: ${databaseUrl ? '✅ محدد' : '❌ غير محدد'}`);
  
  if (!databaseUrl) {
    console.log('❌ DATABASE_URL غير محدد في ملف .env');
    return;
  }
  
  // 2. تحليل رابط قاعدة البيانات
  console.log('\n🔗 تحليل رابط قاعدة البيانات:');
  try {
    const url = new URL(databaseUrl);
    console.log(`Host: ${url.hostname}`);
    console.log(`Port: ${url.port}`);
    console.log(`Database: ${url.pathname.slice(1)}`);
    console.log(`Username: ${url.username}`);
    console.log(`Password: ${url.password ? '***محدد***' : 'غير محدد'}`);
  } catch (error) {
    console.log('❌ رابط قاعدة البيانات غير صالح');
    return;
  }
  
  // 3. اختبار الاتصال الأساسي
  console.log('\n🔌 اختبار الاتصال الأساسي...');
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 1
  });
  
  try {
    const client = await pool.connect();
    console.log('✅ تم الاتصال بنجاح');
    
    // 4. اختبار استعلام بسيط
    console.log('\n📊 اختبار الاستعلامات:');
    const result = await client.query('SELECT version()');
    console.log(`✅ إصدار PostgreSQL: ${result.rows[0].version.split(' ')[1]}`);
    
    // 5. فحص الجداول الموجودة
    console.log('\n📋 فحص الجداول الموجودة:');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('✅ الجداول الموجودة:');
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    } else {
      console.log('⚠️  لا توجد جداول في قاعدة البيانات');
    }
    
    // 6. فحص مخطط جدول المستخدمين
    console.log('\n👥 فحص مخطط جدول المستخدمين:');
    const usersTableResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    if (usersTableResult.rows.length > 0) {
      console.log('✅ أعمدة جدول المستخدمين:');
      usersTableResult.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('❌ جدول المستخدمين غير موجود');
    }
    
    // 7. إحصائيات البيانات
    console.log('\n📊 إحصائيات البيانات:');
    try {
      const userCountResult = await client.query('SELECT COUNT(*) FROM users');
      console.log(`✅ عدد المستخدمين: ${userCountResult.rows[0].count}`);
      
      const messageCountResult = await client.query('SELECT COUNT(*) FROM messages');
      console.log(`✅ عدد الرسائل: ${messageCountResult.rows[0].count}`);
    } catch (error) {
      console.log('⚠️  لا يمكن الحصول على الإحصائيات - الجداول قد تكون غير موجودة');
    }
    
    client.release();
    console.log('\n✅ تم إكمال التشخيص بنجاح');
    
  } catch (error) {
    console.log('❌ فشل في الاتصال:');
    console.log(`   الخطأ: ${error.message}`);
    console.log(`   الكود: ${error.code || 'غير محدد'}`);
    
    // تشخيص الأخطاء الشائعة
    if (error.code === 'ENOTFOUND') {
      console.log('💡 الحل المقترح: تحقق من عنوان الخادم في DATABASE_URL');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 الحل المقترح: تحقق من رقم المنفذ وحالة الخادم');
    } else if (error.code === '28P01') {
      console.log('💡 الحل المقترح: تحقق من اسم المستخدم وكلمة المرور');
    } else if (error.code === '3D000') {
      console.log('💡 الحل المقترح: تحقق من اسم قاعدة البيانات');
    } else if (error.message.includes('timeout')) {
      console.log('💡 الحل المقترح: مشكلة في الشبكة أو الخادم مشغول');
    }
  } finally {
    await pool.end();
  }
}

// تشغيل التشخيص
diagnoseSupabaseConnection().catch(console.error);