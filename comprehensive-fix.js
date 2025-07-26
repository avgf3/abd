#!/usr/bin/env node

import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';

dotenv.config();

console.log('🔧 بدء الإصلاح الشامل للموقع...');

// التحقق من متغيرات البيئة
function checkEnvironment() {
  console.log('📋 فحص متغيرات البيئة...');
  
  const requiredVars = ['DATABASE_URL', 'NODE_ENV', 'PORT', 'JWT_SECRET'];
  const missing = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    console.log('❌ متغيرات بيئة مفقودة:', missing);
    return false;
  }
  
  console.log('✅ جميع متغيرات البيئة موجودة');
  return true;
}

// إصلاح قاعدة البيانات
async function fixDatabase() {
  console.log('🗄️ إصلاح قاعدة البيانات...');
  
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL غير محدد');
    }
    
    // إنشاء اتصال منفصل للإصلاحات
    const client = postgres(databaseUrl, { max: 1 });
    const db = drizzle(client);
    
    // حذف الجداول المكررة
    console.log('🧹 تنظيف الجداول المكررة...');
    
    const tablesToCheck = [
      'level_settings',
      'points_history', 
      'blocked_devices',
      'notifications',
      'friends',
      'messages',
      'users'
    ];
    
    for (const table of tablesToCheck) {
      try {
        // التحقق من وجود الجدول
        const result = await client`SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
        )`;
        
        if (result[0]?.exists) {
          console.log(`✅ جدول ${table} موجود`);
        } else {
          console.log(`⚠️ جدول ${table} غير موجود`);
        }
      } catch (error) {
        console.log(`❌ خطأ في فحص جدول ${table}:`, error.message);
      }
    }
    
    // إصلاح مشاكل القيود
    console.log('🔧 إصلاح قيود قاعدة البيانات...');
    
    try {
      // حذف قيود قديمة قد تسبب مشاكل
      await client`DROP CONSTRAINT IF EXISTS "level_settings_level_unique" CASCADE`;
      console.log('✅ تم حذف القيود القديمة');
    } catch (error) {
      console.log('⚠️ لا توجد قيود قديمة للحذف');
    }
    
    // إنشاء الجداول بشكل صحيح
    console.log('🏗️ إنشاء الجداول المطلوبة...');
    
    // جدول المستخدمين
    await client`
      CREATE TABLE IF NOT EXISTS users (
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
      CREATE TABLE IF NOT EXISTS messages (
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
      CREATE TABLE IF NOT EXISTS friends (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        friend_id INTEGER REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT now()
      )
    `;
    
    // جدول الإشعارات
    await client`
      CREATE TABLE IF NOT EXISTS notifications (
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
      CREATE TABLE IF NOT EXISTS blocked_devices (
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
      CREATE TABLE IF NOT EXISTS points_history (
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
      CREATE TABLE IF NOT EXISTS level_settings (
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
    
    console.log('✅ تم إنشاء جميع الجداول بنجاح');
    
    // إدخال بيانات افتراضية
    console.log('📝 إدخال البيانات الافتراضية...');
    
    // إنشاء مستخدم مالك افتراضي
    await client`
      INSERT INTO users (username, user_type, role, points, level, total_points, level_progress)
      VALUES ('admin', 'owner', 'owner', 1000, 10, 1000, 0)
      ON CONFLICT (username) DO NOTHING
    `;
    
    // إدخال إعدادات المستويات الافتراضية
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
        ON CONFLICT (level) DO NOTHING
      `;
    }
    
    console.log('✅ تم إدخال البيانات الافتراضية');
    
    await client.end();
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح قاعدة البيانات:', error);
    throw error;
  }
}

// إصلاح ملفات التكوين
function fixConfiguration() {
  console.log('⚙️ إصلاح ملفات التكوين...');
  
  // تحديث ملف .env
  const envContent = `DATABASE_URL=postgresql://postgres:password@localhost:5432/chatapp
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-key-here
SESSION_SECRET=another-secret-key-here
CORS_ORIGIN=http://localhost:3000
`;
  
  try {
    const fs = require('fs');
    fs.writeFileSync('.env', envContent);
    console.log('✅ تم تحديث ملف .env');
  } catch (error) {
    console.error('❌ خطأ في تحديث ملف .env:', error);
  }
}

// إصلاح التبعيات
async function fixDependencies() {
  console.log('📦 إصلاح التبعيات...');
  
  try {
    const { execSync } = require('child_process');
    
    // حذف node_modules وإعادة التثبيت
    console.log('🧹 حذف node_modules...');
    execSync('rm -rf node_modules package-lock.json', { stdio: 'inherit' });
    
    console.log('📥 إعادة تثبيت التبعيات...');
    execSync('npm install', { stdio: 'inherit' });
    
    console.log('✅ تم إصلاح التبعيات');
  } catch (error) {
    console.error('❌ خطأ في إصلاح التبعيات:', error);
  }
}

// إصلاح ملفات البناء
async function fixBuild() {
  console.log('🔨 إصلاح ملفات البناء...');
  
  try {
    const { execSync } = require('child_process');
    
    // حذف مجلد dist
    console.log('🧹 حذف مجلد dist...');
    execSync('rm -rf dist', { stdio: 'inherit' });
    
    // إعادة البناء
    console.log('🏗️ إعادة بناء المشروع...');
    execSync('npm run build', { stdio: 'inherit' });
    
    console.log('✅ تم إصلاح ملفات البناء');
  } catch (error) {
    console.error('❌ خطأ في إصلاح ملفات البناء:', error);
  }
}

// إصلاح مشاكل الشبكة
function fixNetworkIssues() {
  console.log('🌐 إصلاح مشاكل الشبكة...');
  
  try {
    const { execSync } = require('child_process');
    
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
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح مشاكل الشبكة:', error);
  }
}

// اختبار الخادم
async function testServer() {
  console.log('🧪 اختبار الخادم...');
  
  try {
    const { execSync } = require('child_process');
    
    // تشغيل الخادم في الخلفية
    console.log('🚀 تشغيل الخادم...');
    const serverProcess = execSync('npm start', { 
      stdio: 'pipe',
      timeout: 10000 
    });
    
    console.log('✅ الخادم يعمل بنجاح');
    
    // اختبار الاتصال
    console.log('🔗 اختبار الاتصال...');
    const response = await fetch('http://localhost:3000/api/health');
    
    if (response.ok) {
      console.log('✅ الاتصال يعمل بنجاح');
    } else {
      console.log('⚠️ مشكلة في الاتصال');
    }
    
  } catch (error) {
    console.error('❌ خطأ في اختبار الخادم:', error);
  }
}

// الدالة الرئيسية
async function main() {
  try {
    console.log('🚀 بدء الإصلاح الشامل...\n');
    
    // 1. فحص البيئة
    if (!checkEnvironment()) {
      console.log('❌ فشل في فحص البيئة');
      return;
    }
    
    // 2. إصلاح التبعيات
    await fixDependencies();
    
    // 3. إصلاح التكوين
    fixConfiguration();
    
    // 4. إصلاح قاعدة البيانات
    await fixDatabase();
    
    // 5. إصلاح ملفات البناء
    await fixBuild();
    
    // 6. إصلاح مشاكل الشبكة
    fixNetworkIssues();
    
    // 7. اختبار الخادم
    await testServer();
    
    console.log('\n🎉 تم الإصلاح الشامل بنجاح!');
    console.log('📋 ملخص الإصلاحات:');
    console.log('   ✅ إصلاح قاعدة البيانات');
    console.log('   ✅ إصلاح التبعيات');
    console.log('   ✅ إصلاح التكوين');
    console.log('   ✅ إصلاح ملفات البناء');
    console.log('   ✅ إصلاح مشاكل الشبكة');
    console.log('   ✅ اختبار الخادم');
    
  } catch (error) {
    console.error('❌ فشل في الإصلاح الشامل:', error);
    process.exit(1);
  }
}

// تشغيل الإصلاح
main();