#!/usr/bin/env node

/**
 * 🔧 سكريبت إصلاح اتصال قاعدة بيانات Supabase
 * يساعد في تحديث رابط DATABASE_URL والتحقق من الاتصال
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🚀 إصلاح اتصال قاعدة بيانات Supabase\n');
  
  console.log('📋 للحصول على رابط قاعدة البيانات:');
  console.log('1. اذهب إلى https://supabase.com/dashboard');
  console.log('2. اختر مشروعك');
  console.log('3. اذهب إلى Settings > Database');
  console.log('4. انسخ Connection String (في قسم Connection pooling)\n');
  
  const databaseUrl = await question('🔗 أدخل رابط قاعدة البيانات (DATABASE_URL): ');
  
  if (!databaseUrl.trim()) {
    console.log('❌ يجب إدخال رابط قاعدة البيانات');
    rl.close();
    return;
  }
  
  // التحقق من صحة الرابط
  if (!databaseUrl.includes('supabase.co') || !databaseUrl.includes('postgresql://')) {
    console.log('⚠️  تحذير: الرابط لا يبدو أنه رابط Supabase صحيح');
  }
  
  // قراءة ملف .env الحالي
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // إنشاء محتوى .env جديد
  const lines = envContent.split('\n');
  let found = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('DATABASE_URL=')) {
      lines[i] = `DATABASE_URL=${databaseUrl}`;
      found = true;
      break;
    }
  }
  
  if (!found) {
    lines.push(`DATABASE_URL=${databaseUrl}`);
  }
  
  // إضافة NODE_ENV إذا لم يكن موجود
  if (!envContent.includes('NODE_ENV=')) {
    lines.unshift('NODE_ENV=production');
  }
  
  // كتابة ملف .env الجديد
  const newEnvContent = lines.filter(line => line.trim()).join('\n') + '\n';
  fs.writeFileSync(envPath, newEnvContent);
  
  console.log('✅ تم تحديث ملف .env بنجاح\n');
  
  // اختبار الاتصال
  console.log('🧪 اختبار الاتصال...');
  
  try {
    // تحميل dotenv لقراءة المتغيرات الجديدة
    require('dotenv').config();
    
    const { Pool } = require('@neondatabase/serverless');
    const pool = new Pool({ connectionString: databaseUrl });
    
    // اختبار الاتصال
    const result = await pool.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ نجح الاتصال بقاعدة البيانات!');
    console.log(`⏰ التوقيت: ${result.rows[0].current_time}`);
    
    // فحص وجود جدول المستخدمين
    try {
      const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log(`👥 عدد المستخدمين في قاعدة البيانات: ${usersResult.rows[0].count}`);
      
      // فحص المستخدمين الموجودين
      const adminUsers = await pool.query("SELECT username, user_type FROM users WHERE user_type IN ('owner', 'admin') LIMIT 5");
      if (adminUsers.rows.length > 0) {
        console.log('\n👑 المديرين الموجودين:');
        adminUsers.rows.forEach(user => {
          console.log(`   - ${user.username} (${user.user_type})`);
        });
      }
      
    } catch (tableError) {
      console.log('⚠️  جدول المستخدمين غير موجود أو يحتاج إعداد');
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ فشل في الاتصال:');
    console.error(`   ${error.message}\n`);
    
    if (error.message.includes('password authentication failed')) {
      console.log('💡 المشكلة: كلمة المرور غير صحيحة');
      console.log('   - تأكد من كلمة المرور في رابط قاعدة البيانات');
      console.log('   - يمكنك إعادة تعيين كلمة المرور من Supabase Dashboard');
    }
    
    if (error.message.includes('does not exist')) {
      console.log('💡 المشكلة: قاعدة البيانات غير موجودة');
      console.log('   - تأكد من أن المشروع نشط في Supabase');
      console.log('   - تحقق من صحة الرابط');
    }
  }
  
  console.log('\n🎯 الخطوات التالية:');
  console.log('1. شغل الخادم: npm run dev');
  console.log('2. جرب تسجيل الدخول بأحد المستخدمين الموجودين');
  console.log('3. إذا لم ينجح، شغل: node test-supabase-connection.js\n');
  
  rl.close();
}

main().catch(error => {
  console.error('💥 خطأ غير متوقع:', error);
  rl.close();
  process.exit(1);
});