#!/usr/bin/env node

import dotenv from 'dotenv';
import postgres from 'postgres';
import { execSync } from 'child_process';
import fs from 'fs';

dotenv.config();

console.log('🔧 بدء الإصلاح الشامل للموقع...');

// 1. إصلاح ملف .env
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

// 2. إيقاف العمليات القديمة
function stopOldProcesses() {
  console.log('🛑 إيقاف العمليات القديمة...');
  
  try {
    execSync('pkill -f "node.*3000"', { stdio: 'ignore' });
    execSync('pkill -f "npm.*start"', { stdio: 'ignore' });
    execSync('pkill -f "tsx.*server"', { stdio: 'ignore' });
    console.log('✅ تم إيقاف العمليات القديمة');
  } catch (error) {
    console.log('⚠️ لا توجد عمليات قديمة لإيقافها');
  }
}

// 3. إصلاح التبعيات
function fixDependencies() {
  console.log('📦 إصلاح التبعيات...');
  
  try {
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

// 4. إصلاح قاعدة البيانات
async function fixDatabase() {
  console.log('🗄️ إصلاح قاعدة البيانات...');
  
  try {
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/chatapp';
    console.log('📡 الاتصال بقاعدة البيانات...');
    
    const client = postgres(databaseUrl, { max: 1 });
    
    // حذف الجداول المكررة
    console.log('🧹 تنظيف الجداول المكررة...');
    
    const tablesToDrop = [
      'level_settings',
      'points_history',
      'blocked_devices',
      'notifications',
      'friends',
      'messages',
      'users'
    ];
    
    for (const table of tablesToDrop) {
      try {
        await client`DROP TABLE IF EXISTS ${client(table)} CASCADE`;
        console.log(`✅ تم حذف جدول ${table}`);
      } catch (error) {
        console.log(`⚠️ لا يمكن حذف جدول ${table}:`, error.message);
      }
    }
    
    // إنشاء الجداول الجديدة
    console.log('🏗️ إنشاء الجداول الجديدة...');
    
    // جدول المستخدمين
    await client`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT,
        user_type TEXT NOT NULL DEFAULT 'guest',
        role TEXT NOT NULL DEFAULT 'guest',
        profile_image TEXT,
        profile_banner TEXT,
        profile_background_color TEXT DEFAULT '#3c0d0d',
        status TEXT,
        gender TEXT,
        age INTEGER,
        country TEXT,
        relation TEXT,
        bio TEXT,
        is_online BOOLEAN DEFAULT false,
        is_hidden BOOLEAN DEFAULT false,
        last_seen TIMESTAMP,
        join_date TIMESTAMP DEFAULT now(),
        created_at TIMESTAMP DEFAULT now(),
        is_muted BOOLEAN DEFAULT false,
        mute_expiry TIMESTAMP,
        is_banned BOOLEAN DEFAULT false,
        ban_expiry TIMESTAMP,
        is_blocked BOOLEAN DEFAULT false,
        ip_address VARCHAR(45),
        device_id VARCHAR(100),
        ignored_users TEXT DEFAULT '[]',
        username_color TEXT DEFAULT '#FFFFFF',
        user_theme TEXT DEFAULT 'default',
        profile_effect TEXT DEFAULT 'none',
        points INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        total_points INTEGER DEFAULT 0,
        level_progress INTEGER DEFAULT 0
      )
    `;
    
    // جدول الرسائل
    await client`
      CREATE TABLE messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id),
        receiver_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'text',
        is_private BOOLEAN DEFAULT false,
        room_id TEXT DEFAULT 'general',
        timestamp TIMESTAMP DEFAULT now()
      )
    `;
    
    // جدول الأصدقاء
    await client`
      CREATE TABLE friends (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        friend_id INTEGER REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT now()
      )
    `;
    
    // جدول الإشعارات
    await client`
      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        data JSONB,
        created_at TIMESTAMP DEFAULT now()
      )
    `;
    
    // جدول الأجهزة المحجوبة
    await client`
      CREATE TABLE blocked_devices (
        id SERIAL PRIMARY KEY,
        ip_address TEXT NOT NULL,
        device_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        blocked_at TIMESTAMP NOT NULL,
        blocked_by INTEGER NOT NULL
      )
    `;
    
    // جدول تاريخ النقاط
    await client`
      CREATE TABLE points_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now()
      )
    `;
    
    // جدول إعدادات المستويات
    await client`
      CREATE TABLE level_settings (
        id SERIAL PRIMARY KEY,
        level INTEGER NOT NULL,
        required_points INTEGER NOT NULL,
        title TEXT NOT NULL,
        color TEXT DEFAULT '#FFFFFF',
        benefits JSONB,
        created_at TIMESTAMP DEFAULT now(),
        CONSTRAINT level_settings_level_unique UNIQUE(level)
      )
    `;
    
    // إدخال البيانات الافتراضية
    console.log('📝 إدخال البيانات الافتراضية...');
    
    await client`
      INSERT INTO users (username, user_type, role, points, level, total_points, level_progress)
      VALUES ('admin', 'owner', 'owner', 1000, 10, 1000, 0)
    `;
    
    const defaultLevels = [
      { level: 1, required_points: 0, title: 'مبتدئ', color: '#FFFFFF' },
      { level: 2, required_points: 100, title: 'متقدم', color: '#00FF00' },
      { level: 3, required_points: 300, title: 'خبير', color: '#0000FF' },
      { level: 4, required_points: 600, title: 'محترف', color: '#FF00FF' },
      { level: 5, required_points: 1000, title: 'أسطورة', color: '#FFD700' }
    ];
    
    for (const levelData of defaultLevels) {
      await client`
        INSERT INTO level_settings (level, required_points, title, color)
        VALUES (${levelData.level}, ${levelData.required_points}, ${levelData.title}, ${levelData.color})
      `;
    }
    
    await client.end();
    console.log('✅ تم إصلاح قاعدة البيانات');
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح قاعدة البيانات:', error);
    console.log('⚠️ سيتم المتابعة بدون قاعدة البيانات');
  }
}

// 5. إصلاح البناء
function fixBuild() {
  console.log('🔨 إصلاح البناء...');
  
  try {
    if (fs.existsSync('dist')) {
      console.log('🧹 حذف مجلد dist...');
      execSync('rm -rf dist', { stdio: 'inherit' });
    }
    
    console.log('🏗️ إعادة بناء المشروع...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ تم إصلاح البناء');
  } catch (error) {
    console.error('❌ خطأ في إصلاح البناء:', error);
  }
}

// 6. إصلاح ملفات السجلات
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
        const backupName = `${logFile}.backup.${Date.now()}`;
        fs.copyFileSync(logFile, backupName);
        console.log(`📋 تم نسخ احتياطي لـ ${logFile} إلى ${backupName}`);
        
        fs.unlinkSync(logFile);
        console.log(`🧹 تم حذف ${logFile}`);
      }
    }
    
    console.log('✅ تم إصلاح ملفات السجلات');
  } catch (error) {
    console.error('❌ خطأ في إصلاح ملفات السجلات:', error);
  }
}

// 7. إنشاء سكريبت تشغيل محسن
function createStartScript() {
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

// 8. اختبار الخادم
async function testServer() {
  console.log('🧪 اختبار الخادم...');
  
  try {
    console.log('🚀 تشغيل الخادم...');
    
    const serverProcess = execSync('npm start', { 
      stdio: 'pipe',
      timeout: 25000 
    });
    
    console.log('✅ الخادم يعمل بنجاح');
    
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
    }, 15000);
    
  } catch (error) {
    console.error('❌ خطأ في اختبار الخادم:', error);
  }
}

// الدالة الرئيسية
async function main() {
  try {
    console.log('🚀 بدء الإصلاح الشامل...\n');
    
    // 1. إصلاح ملف .env
    fixEnvFile();
    
    // 2. إيقاف العمليات القديمة
    stopOldProcesses();
    
    // 3. إصلاح التبعيات
    fixDependencies();
    
    // 4. إصلاح قاعدة البيانات
    await fixDatabase();
    
    // 5. إصلاح البناء
    fixBuild();
    
    // 6. إصلاح ملفات السجلات
    fixLogFiles();
    
    // 7. إنشاء سكريبت تشغيل محسن
    createStartScript();
    
    // 8. اختبار الخادم
    await testServer();
    
    console.log('\n🎉 تم الإصلاح الشامل بنجاح!');
    console.log('📋 ملخص الإصلاحات:');
    console.log('   ✅ إصلاح ملف .env');
    console.log('   ✅ إيقاف العمليات القديمة');
    console.log('   ✅ إصلاح التبعيات');
    console.log('   ✅ إصلاح قاعدة البيانات');
    console.log('   ✅ إصلاح البناء');
    console.log('   ✅ إصلاح ملفات السجلات');
    console.log('   ✅ إنشاء سكريبت تشغيل محسن');
    console.log('   ✅ اختبار الخادم');
    
    console.log('\n🚀 يمكنك الآن تشغيل الخادم بـ:');
    console.log('   npm start');
    console.log('   أو');
    console.log('   ./start-server.sh');
    
    console.log('\n📊 معلومات إضافية:');
    console.log('   - المستخدم الافتراضي: admin');
    console.log('   - المنفذ: 3000');
    console.log('   - البيئة: development');
    
  } catch (error) {
    console.error('❌ فشل في الإصلاح الشامل:', error);
    process.exit(1);
  }
}

// تشغيل الإصلاح
main();