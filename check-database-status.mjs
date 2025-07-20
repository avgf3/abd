#!/usr/bin/env node

/**
 * 🧪 فحص حالة قاعدة البيانات - ES Modules
 */

import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';

config();

async function checkDatabaseStatus() {
  console.log('🔍 فحص حالة قاعدة البيانات...\n');

  // فحص متغير DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.log('❌ متغير DATABASE_URL غير محدد');
    console.log('📁 محتوى ملف .env الحالي:');
    return;
  }

  console.log('✅ متغير DATABASE_URL محدد');
  
  // فحص إذا كان placeholder
  if (databaseUrl.includes('[YOUR-PASSWORD]') || databaseUrl.includes('[YOUR-PROJECT-ID]')) {
    console.log('❌ DATABASE_URL يحتوي على placeholder وليس رابط حقيقي');
    console.log('🔗 الرابط الحالي:', databaseUrl.replace(/:[^:]*@/, ':***@'));
    console.log('\n💡 تحتاج لاستبدال الرابط برابط Supabase الحقيقي');
    console.log('📋 للحصول على الرابط:');
    console.log('   1. اذهب إلى https://supabase.com/dashboard');
    console.log('   2. اختر مشروعك');
    console.log('   3. Settings > Database');
    console.log('   4. انسخ Connection string من قسم Connection pooling\n');
    return;
  }

  // اختبار الاتصال
  console.log('🧪 اختبار الاتصال...');
  
  try {
    const pool = new Pool({ connectionString: databaseUrl });
    
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ نجح الاتصال بقاعدة البيانات!');
    console.log(`⏰ التوقيت: ${result.rows[0].current_time}\n`);
    
    // فحص جدول المستخدمين
    try {
      const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log(`👥 عدد المستخدمين: ${usersResult.rows[0].count}`);
      
      // فحص المستخدمين المحددين
      const specificUsers = await pool.query(`
        SELECT username, user_type, password 
        FROM users 
        WHERE username IN ('عبدالكريم', 'عبود')
        ORDER BY username
      `);
      
      if (specificUsers.rows.length > 0) {
        console.log('\n👑 المستخدمين الموجودين:');
        specificUsers.rows.forEach(user => {
          console.log(`   - ${user.username} (${user.user_type}) - كلمة المرور: ${user.password.substring(0, 3)}***`);
        });
      } else {
        console.log('\n❌ المستخدمين "عبدالكريم" و "عبود" غير موجودين!');
        
        // عرض أول 5 مستخدمين للمساعدة
        const allUsers = await pool.query('SELECT username, user_type FROM users LIMIT 5');
        if (allUsers.rows.length > 0) {
          console.log('\n📋 المستخدمين الموجودين:');
          allUsers.rows.forEach(user => {
            console.log(`   - ${user.username} (${user.user_type})`);
          });
        }
      }
      
    } catch (tableError) {
      console.log('❌ مشكلة في جدول المستخدمين:', tableError.message);
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ فشل في الاتصال:');
    console.error(`   ${error.message}\n`);
    
    if (error.message.includes('password authentication failed')) {
      console.log('💡 المشكلة: كلمة المرور غير صحيحة');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('💡 المشكلة: خادم قاعدة البيانات غير موجود');
    }
  }
}

checkDatabaseStatus().catch(console.error);