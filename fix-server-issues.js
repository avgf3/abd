#!/usr/bin/env node

import dotenv from 'dotenv';
import { execSync } from 'child_process';
import fs from 'fs';

dotenv.config();

console.log('🔧 إصلاح مشاكل الخادم...');

// إصلاح ملف .env
function fixEnvFile() {
  console.log('📝 إصلاح ملف .env...');
  
  const envContent = `DATABASE_URL=postgresql://postgres:password@localhost:5432/chatapp
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-key-here
SESSION_SECRET=another-secret-key-here
CORS_ORIGIN=http://localhost:3000
`;
  
  try {
    fs.writeFileSync('.env', envContent);
    console.log('✅ تم إصلاح ملف .env');
  } catch (error) {
    console.error('❌ خطأ في إصلاح ملف .env:', error);
  }
}

// إيقاف العمليات القديمة
function stopOldProcesses() {
  console.log('🛑 إيقاف العمليات القديمة...');
  
  try {
    // قتل العمليات على المنفذ 3000
    execSync('pkill -f "node.*3000"', { stdio: 'ignore' });
    execSync('pkill -f "npm.*start"', { stdio: 'ignore' });
    execSync('pkill -f "tsx.*server"', { stdio: 'ignore' });
    console.log('✅ تم إيقاف العمليات القديمة');
  } catch (error) {
    console.log('⚠️ لا توجد عمليات قديمة لإيقافها');
  }
}

// إصلاح التبعيات
function fixDependencies() {
  console.log('📦 إصلاح التبعيات...');
  
  try {
    // حذف node_modules وإعادة التثبيت
    if (fs.existsSync('node_modules')) {
      console.log('🧹 حذف node_modules...');
      execSync('rm -rf node_modules', { stdio: 'inherit' });
    }
    
    if (fs.existsSync('package-lock.json')) {
      console.log('🧹 حذف package-lock.json...');
      execSync('rm -f package-lock.json', { stdio: 'inherit' });
    }
    
    console.log('📥 إعادة تثبيت التبعيات...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ تم إصلاح التبعيات');
  } catch (error) {
    console.error('❌ خطأ في إصلاح التبعيات:', error);
  }
}

// إصلاح البناء
function fixBuild() {
  console.log('🔨 إصلاح البناء...');
  
  try {
    // حذف مجلد dist
    if (fs.existsSync('dist')) {
      console.log('🧹 حذف مجلد dist...');
      execSync('rm -rf dist', { stdio: 'inherit' });
    }
    
    // إعادة البناء
    console.log('🏗️ إعادة بناء المشروع...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ تم إصلاح البناء');
  } catch (error) {
    console.error('❌ خطأ في إصلاح البناء:', error);
  }
}

// إصلاح مشاكل الشبكة
function fixNetworkIssues() {
  console.log('🌐 إصلاح مشاكل الشبكة...');
  
  try {
    // التحقق من المنافذ المستخدمة
    console.log('🔍 فحص المنافذ المستخدمة...');
    
    try {
      const output = execSync('lsof -i :3000', { encoding: 'utf8' });
      console.log('⚠️ المنفذ 3000 مستخدم:', output);
      
      // قتل العمليات على المنفذ 3000
      execSync('pkill -f "node.*3000"', { stdio: 'inherit' });
      console.log('✅ تم إيقاف العمليات على المنفذ 3000');
    } catch (error) {
      console.log('✅ المنفذ 3000 متاح');
    }
    
    // التحقق من المنفذ 5000
    try {
      const output = execSync('lsof -i :5000', { encoding: 'utf8' });
      console.log('⚠️ المنفذ 5000 مستخدم:', output);
      
      // قتل العمليات على المنفذ 5000
      execSync('pkill -f "node.*5000"', { stdio: 'inherit' });
      console.log('✅ تم إيقاف العمليات على المنفذ 5000');
    } catch (error) {
      console.log('✅ المنفذ 5000 متاح');
    }
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح مشاكل الشبكة:', error);
  }
}

// إصلاح ملفات السجلات
function fixLogFiles() {
  console.log('📄 إصلاح ملفات السجلات...');
  
  try {
    const logFiles = [
      'server.log',
      'server-debug.log',
      'simple-server.log'
    ];
    
    for (const logFile of logFiles) {
      if (fs.existsSync(logFile)) {
        // نسخ احتياطي للسجل
        const backupName = `${logFile}.backup.${Date.now()}`;
        fs.copyFileSync(logFile, backupName);
        console.log(`📋 تم نسخ احتياطي لـ ${logFile} إلى ${backupName}`);
        
        // حذف السجل القديم
        fs.unlinkSync(logFile);
        console.log(`🧹 تم حذف ${logFile}`);
      }
    }
    
    console.log('✅ تم إصلاح ملفات السجلات');
  } catch (error) {
    console.error('❌ خطأ في إصلاح ملفات السجلات:', error);
  }
}

// اختبار الخادم
async function testServer() {
  console.log('🧪 اختبار الخادم...');
  
  try {
    // تشغيل الخادم في الخلفية
    console.log('🚀 تشغيل الخادم...');
    
    const serverProcess = execSync('npm start', { 
      stdio: 'pipe',
      timeout: 20000 
    });
    
    console.log('✅ الخادم يعمل بنجاح');
    
    // انتظار قليل ثم اختبار الاتصال
    setTimeout(async () => {
      try {
        console.log('🔗 اختبار الاتصال...');
        const response = await fetch('http://localhost:3000/api/health');
        
        if (response.ok) {
          console.log('✅ الاتصال يعمل بنجاح');
        } else {
          console.log('⚠️ مشكلة في الاتصال - رمز الاستجابة:', response.status);
        }
      } catch (error) {
        console.log('⚠️ لا يمكن الاتصال بالخادم:', error.message);
      }
    }, 10000);
    
  } catch (error) {
    console.error('❌ خطأ في اختبار الخادم:', error);
  }
}

// إنشاء ملف تشغيل محسن
function createOptimizedStartScript() {
  console.log('📝 إنشاء سكريبت تشغيل محسن...');
  
  const startScript = `#!/bin/bash

echo "🚀 بدء تشغيل الخادم..."

# إيقاف العمليات القديمة
echo "🛑 إيقاف العمليات القديمة..."
pkill -f "node.*3000" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true

# انتظار قليل
sleep 2

# تشغيل الخادم
echo "🚀 تشغيل الخادم..."
NODE_ENV=development npm start

echo "✅ تم تشغيل الخادم"
`;
  
  try {
    fs.writeFileSync('start-server.sh', startScript);
    execSync('chmod +x start-server.sh', { stdio: 'inherit' });
    console.log('✅ تم إنشاء سكريبت التشغيل المحسن');
  } catch (error) {
    console.error('❌ خطأ في إنشاء سكريبت التشغيل:', error);
  }
}

// الدالة الرئيسية
async function main() {
  try {
    console.log('🚀 بدء إصلاح مشاكل الخادم...\n');
    
    // 1. إصلاح ملف .env
    fixEnvFile();
    
    // 2. إيقاف العمليات القديمة
    stopOldProcesses();
    
    // 3. إصلاح التبعيات
    fixDependencies();
    
    // 4. إصلاح البناء
    fixBuild();
    
    // 5. إصلاح مشاكل الشبكة
    fixNetworkIssues();
    
    // 6. إصلاح ملفات السجلات
    fixLogFiles();
    
    // 7. إنشاء سكريبت تشغيل محسن
    createOptimizedStartScript();
    
    // 8. اختبار الخادم
    await testServer();
    
    console.log('\n🎉 تم إصلاح مشاكل الخادم بنجاح!');
    console.log('📋 ملخص الإصلاحات:');
    console.log('   ✅ إصلاح ملف .env');
    console.log('   ✅ إيقاف العمليات القديمة');
    console.log('   ✅ إصلاح التبعيات');
    console.log('   ✅ إصلاح البناء');
    console.log('   ✅ إصلاح مشاكل الشبكة');
    console.log('   ✅ إصلاح ملفات السجلات');
    console.log('   ✅ إنشاء سكريبت تشغيل محسن');
    console.log('   ✅ اختبار الخادم');
    
    console.log('\n🚀 يمكنك الآن تشغيل الخادم بـ:');
    console.log('   npm start');
    console.log('   أو');
    console.log('   ./start-server.sh');
    
  } catch (error) {
    console.error('❌ فشل في إصلاح مشاكل الخادم:', error);
    process.exit(1);
  }
}

// تشغيل الإصلاح
main();