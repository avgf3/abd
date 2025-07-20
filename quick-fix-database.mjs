#!/usr/bin/env node

/**
 * 🚨 إصلاح سريع لمشكلة قاعدة البيانات
 */

import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function quickFix() {
  console.log('🚨 إصلاح سريع لمشكلة تسجيل الدخول\n');
  
  // قراءة ملف .env الحالي
  const envContent = fs.readFileSync('.env', 'utf8');
  console.log('📁 محتوى ملف .env الحالي:');
  console.log('---');
  console.log(envContent);
  console.log('---\n');
  
  // فحص إذا كان يحتوي على placeholder
  if (envContent.includes('[YOUR-PASSWORD]') || envContent.includes('[YOUR-PROJECT-ID]')) {
    console.log('❌ المشكلة مؤكدة: DATABASE_URL يحتوي على placeholder');
    console.log('\n🔧 للإصلاح:');
    console.log('1. اذهب إلى https://supabase.com/dashboard');
    console.log('2. اختر مشروعك');
    console.log('3. Settings > Database');
    console.log('4. انسخ Connection string من قسم Connection pooling');
    console.log('\nمثال للرابط الصحيح:');
    console.log('postgresql://postgres.abc123:your-password@aws-0-us-east-1.pooler.supabase.com:5432/postgres\n');
    
    const databaseUrl = await question('🔗 ألصق رابط قاعدة البيانات الصحيح هنا: ');
    
    if (databaseUrl.trim() && databaseUrl.includes('postgresql://') && databaseUrl.includes('supabase.com')) {
      // تحديث ملف .env
      const newEnvContent = `NODE_ENV=production
DATABASE_URL=${databaseUrl}

# Supabase connection configured successfully
# Updated: ${new Date().toISOString()}
`;
      
      fs.writeFileSync('.env', newEnvContent);
      console.log('\n✅ تم تحديث ملف .env بنجاح!');
      console.log('\n🎯 الخطوات التالية:');
      console.log('1. أعد تشغيل الخادم: npm run dev');
      console.log('2. جرب تسجيل الدخول');
      
    } else {
      console.log('❌ الرابط غير صحيح أو فارغ');
    }
  } else {
    console.log('✅ DATABASE_URL يبدو صحيحاً');
    console.log('🔍 دعنا نتحقق من مشكلة أخرى...');
    
    // فحص إذا كان المشروع يعمل في وضع SQLite
    console.log('\n💡 ربما المشروع يعمل في وضع SQLite بدلاً من Supabase');
    console.log('تحقق من رسائل الخادم عند بدء التشغيل');
  }
  
  rl.close();
}

quickFix().catch(error => {
  console.error('خطأ:', error);
  rl.close();
});