#!/usr/bin/env node

import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

async function verifyDatabaseConnection() {
  console.log('🔍 فحص اتصال قاعدة البيانات...');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ متغير DATABASE_URL غير محدد!');
    console.error('📝 تأكد من وجود ملف .env أو تعيين متغير البيئة');
    process.exit(1);
  }
  
  console.log('✅ متغير DATABASE_URL محدد');
  
  // التحقق من تنسيق الرابط
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    console.error('❌ تنسيق DATABASE_URL غير صحيح!');
    console.error('📝 يجب أن يبدأ بـ postgresql:// أو postgres://');
    process.exit(1);
  }
  
  console.log('✅ تنسيق DATABASE_URL صحيح');
  
  // محاولة الاتصال
  try {
    const pool = new Pool({ connectionString: databaseUrl });
    
    // اختبار بسيط للاتصال
    const result = await pool.query('SELECT 1 as test, NOW() as current_time');
    
    console.log('✅ الاتصال بقاعدة البيانات نجح!');
    console.log('📊 نتيجة الاختبار:', result.rows[0]);
    
    // اختبار إضافي للتحقق من الجداول
    try {
      const tablesResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);
      
      console.log('📋 الجداول الموجودة:');
      if (tablesResult.rows.length === 0) {
        console.log('   - لا توجد جداول (قاعدة بيانات فارغة)');
      } else {
        tablesResult.rows.forEach(row => {
          console.log(`   - ${row.table_name}`);
        });
      }
    } catch (tablesError) {
      console.warn('⚠️ لا يمكن الحصول على قائمة الجداول:', tablesError.message);
    }
    
    await pool.end();
    console.log('🎉 فحص قاعدة البيانات مكتمل بنجاح!');
    
  } catch (error) {
    console.error('❌ فشل في الاتصال بقاعدة البيانات!');
    console.error('🔍 تفاصيل الخطأ:', error.message);
    
    // نصائح استكشاف الأخطاء
    console.log('\n🛠️ نصائح لحل المشكلة:');
    console.log('1. تأكد من صحة كلمة المرور في DATABASE_URL');
    console.log('2. تأكد من أن المنفذ صحيح (5432 للـ session mode، 6543 للـ transaction mode)');
    console.log('3. تأكد من إضافة ?sslmode=require في نهاية الرابط');
    console.log('4. تأكد من أن قاعدة البيانات متاحة ولا تواجه مشاكل شبكة');
    
    process.exit(1);
  }
}

// تشغيل الفحص
verifyDatabaseConnection().catch(console.error);