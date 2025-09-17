#!/usr/bin/env node

/**
 * Render Deployment Fix Script
 * 
 * This script addresses common deployment issues on Render:
 * 1. Database connection timeouts
 * 2. Environment variable configuration
 * 3. Build optimization
 * 4. Health check improvements
 */

import dotenv from 'dotenv';
import postgres from 'postgres';

// Load environment variables
dotenv.config();

console.log('🚀 بدء إصلاح مشاكل النشر على Render...\n');

// Check environment variables
function checkEnvironmentVariables() {
  console.log('📋 فحص متغيرات البيئة...');
  
  const requiredVars = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ متغيرات البيئة المفقودة:', missingVars.join(', '));
    console.log('\n💡 تأكد من إعداد المتغيرات التالية في Render:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    return false;
  }
  
  console.log('✅ جميع متغيرات البيئة المطلوبة موجودة');
  return true;
}

// Test database connection
async function testDatabaseConnection() {
  console.log('\n🔗 اختبار الاتصال بقاعدة البيانات...');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL غير محدد');
    return false;
  }
  
  try {
    // Create a test connection with optimized settings for Render
    const client = postgres(databaseUrl, {
      ssl: 'require',
      max: 1, // Use only 1 connection for testing
      idle_timeout: 5,
      connect_timeout: 30,
      max_lifetime: 60 * 2,
      prepare: false,
      onnotice: () => {},
    });
    
    console.log('🔄 محاولة الاتصال...');
    await client`select 1 as test`;
    await client.end();
    
    console.log('✅ الاتصال بقاعدة البيانات نجح');
    return true;
  } catch (error) {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', error.message);
    
    // Provide specific troubleshooting advice
    if (error.message.includes('timeout')) {
      console.log('\n💡 نصائح لحل مشكلة timeout:');
      console.log('   1. تأكد من صحة رابط DATABASE_URL');
      console.log('   2. تحقق من إعدادات SSL');
      console.log('   3. تأكد من أن قاعدة البيانات متاحة');
    } else if (error.message.includes('SSL')) {
      console.log('\n💡 نصائح لحل مشكلة SSL:');
      console.log('   1. تأكد من إضافة ?sslmode=require إلى DATABASE_URL');
      console.log('   2. تحقق من شهادة SSL الخاصة بقاعدة البيانات');
    }
    
    return false;
  }
}

// Check build configuration
function checkBuildConfiguration() {
  console.log('\n🔧 فحص إعدادات البناء...');
  
  const issues = [];
  
  // Check if we're in production mode
  if (process.env.NODE_ENV !== 'production') {
    issues.push('NODE_ENV يجب أن يكون production');
  }
  
  // Check port configuration
  const port = Number(process.env.PORT);
  if (!port || port < 1000 || port > 65535) {
    issues.push('PORT يجب أن يكون رقم صحيح بين 1000-65535');
  }
  
  // Check database connection limit
  const maxConnections = Number(process.env.DB_MAX_CONNECTIONS);
  if (maxConnections && maxConnections > 10) {
    issues.push('DB_MAX_CONNECTIONS يجب أن يكون 10 أو أقل للـ Free Tier');
  }
  
  if (issues.length > 0) {
    console.error('❌ مشاكل في إعدادات البناء:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    return false;
  }
  
  console.log('✅ إعدادات البناء صحيحة');
  return true;
}

// Generate deployment recommendations
function generateRecommendations() {
  console.log('\n📝 توصيات للنشر على Render:');
  console.log('');
  
  console.log('🔧 إعدادات البيئة المطلوبة:');
  console.log('   NODE_ENV=production');
  console.log('   PORT=10000');
  console.log('   DB_MAX_CONNECTIONS=5');
  console.log('   DATABASE_URL=postgresql://...?sslmode=require');
  console.log('');
  
  console.log('⚡ تحسينات الأداء:');
  console.log('   - استخدام DB_MAX_CONNECTIONS=5 للـ Free Tier');
  console.log('   - تفعيل SSL مع sslmode=require');
  console.log('   - تقليل idle_timeout إلى 5 ثواني');
  console.log('   - تعطيل prepared statements');
  console.log('');
  
  console.log('🏥 إعدادات Health Check:');
  console.log('   - استخدام /api/health كـ health check path');
  console.log('   - التأكد من أن المنفذ صحيح');
  console.log('');
  
  console.log('📦 إعدادات البناء:');
  console.log('   - استخدام npm run build-production');
  console.log('   - تشغيل migrations بعد البناء');
  console.log('   - تنظيف console.log في الإنتاج');
}

// Main execution
async function main() {
  try {
    const envCheck = checkEnvironmentVariables();
    const buildCheck = checkBuildConfiguration();
    const dbCheck = await testDatabaseConnection();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 تقرير فحص النشر:');
    console.log('='.repeat(50));
    console.log(`متغيرات البيئة: ${envCheck ? '✅' : '❌'}`);
    console.log(`إعدادات البناء: ${buildCheck ? '✅' : '❌'}`);
    console.log(`اتصال قاعدة البيانات: ${dbCheck ? '✅' : '❌'}`);
    
    if (envCheck && buildCheck && dbCheck) {
      console.log('\n🎉 جميع الفحوصات نجحت! التطبيق جاهز للنشر.');
    } else {
      console.log('\n⚠️ يوجد مشاكل تحتاج إلى إصلاح قبل النشر.');
      generateRecommendations();
    }
    
  } catch (error) {
    console.error('\n💥 خطأ في فحص النشر:', error.message);
    process.exit(1);
  }
}

// Run the script
main();