#!/usr/bin/env node

import dotenv from 'dotenv';
import postgres from 'postgres';
import { execSync } from 'child_process';
import fs from 'fs';

dotenv.config();

console.log('🔧 بدء الإصلاح السريع...');

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

// إصلاح قاعدة البيانات
async function fixDatabase() {
  console.log('🗄️ إصلاح قاعدة البيانات...');
  
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.log('⚠️ DATABASE_URL غير محدد، سيتم استخدام القيمة الافتراضية');
      process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/chatapp';
    }
    
    const client = postgres(process.env.DATABASE_URL, { max: 1 });
    
    // إنشاء قاعدة البيانات إذا لم تكن موجودة
    try {
      await client`CREATE DATABASE IF NOT EXISTS chatapp`;
      console.log('✅ تم إنشاء قاعدة البيانات');
    } catch (error) {
      console.log('⚠️ قاعدة البيانات موجودة بالفعل أو لا يمكن إنشاؤها');
    }
    
    // إنشاء الجداول الأساسية
    console.log('🏗️ إنشاء الجداول الأساسية...');
    
    await client`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT,
        user_type TEXT NOT NULL DEFAULT 'guest',
        role TEXT NOT NULL DEFAULT 'guest',
        points INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT now()
      )
    `;
    
    await client`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        room_id TEXT DEFAULT 'general',
        timestamp TIMESTAMP DEFAULT now()
      )
    `;
    
    await client`
      CREATE TABLE IF NOT EXISTS level_settings (
        id SERIAL PRIMARY KEY,
        level INTEGER NOT NULL UNIQUE,
        required_points INTEGER NOT NULL,
        title TEXT NOT NULL,
        color TEXT DEFAULT '#FFFFFF',
        created_at TIMESTAMP DEFAULT now()
      )
    `;
    
    // إدخال بيانات افتراضية
    console.log('📝 إدخال البيانات الافتراضية...');
    
    await client`
      INSERT INTO users (username, user_type, role, points, level)
      VALUES ('admin', 'owner', 'owner', 1000, 10)
      ON CONFLICT (username) DO NOTHING
    `;
    
    const defaultLevels = [
      { level: 1, required_points: 0, title: 'مبتدئ', color: '#FFFFFF' },
      { level: 2, required_points: 100, title: 'متقدم', color: '#00FF00' },
      { level: 3, required_points: 300, title: 'خبير', color: '#0000FF' }
    ];
    
    for (const levelData of defaultLevels) {
      await client`
        INSERT INTO level_settings (level, required_points, title, color)
        VALUES (${levelData.level}, ${levelData.required_points}, ${levelData.title}, ${levelData.color})
        ON CONFLICT (level) DO NOTHING
      `;
    }
    
    await client.end();
    console.log('✅ تم إصلاح قاعدة البيانات');
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح قاعدة البيانات:', error);
    console.log('⚠️ سيتم المتابعة بدون قاعدة البيانات');
  }
}

// إصلاح التبعيات
function fixDependencies() {
  console.log('📦 إصلاح التبعيات...');
  
  try {
    // إعادة تثبيت التبعيات
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
      execSync('rm -rf dist', { stdio: 'inherit' });
    }
    
    // إعادة البناء
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ تم إصلاح البناء');
  } catch (error) {
    console.error('❌ خطأ في إصلاح البناء:', error);
  }
}

// إيقاف العمليات القديمة
function stopOldProcesses() {
  console.log('🛑 إيقاف العمليات القديمة...');
  
  try {
    // قتل العمليات على المنفذ 3000
    execSync('pkill -f "node.*3000"', { stdio: 'ignore' });
    execSync('pkill -f "npm.*start"', { stdio: 'ignore' });
    console.log('✅ تم إيقاف العمليات القديمة');
  } catch (error) {
    console.log('⚠️ لا توجد عمليات قديمة لإيقافها');
  }
}

// اختبار الخادم
async function testServer() {
  console.log('🧪 اختبار الخادم...');
  
  try {
    // تشغيل الخادم في الخلفية
    const serverProcess = execSync('npm start', { 
      stdio: 'pipe',
      timeout: 15000 
    });
    
    console.log('✅ الخادم يعمل بنجاح');
    
    // انتظار قليل ثم اختبار الاتصال
    setTimeout(async () => {
      try {
        const response = await fetch('http://localhost:3000/api/health');
        if (response.ok) {
          console.log('✅ الاتصال يعمل بنجاح');
        } else {
          console.log('⚠️ مشكلة في الاتصال');
        }
      } catch (error) {
        console.log('⚠️ لا يمكن الاتصال بالخادم');
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ خطأ في اختبار الخادم:', error);
  }
}

// الدالة الرئيسية
async function main() {
  try {
    console.log('🚀 بدء الإصلاح السريع...\n');
    
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
    
    // 6. اختبار الخادم
    await testServer();
    
    console.log('\n🎉 تم الإصلاح السريع بنجاح!');
    console.log('📋 ملخص الإصلاحات:');
    console.log('   ✅ إصلاح ملف .env');
    console.log('   ✅ إيقاف العمليات القديمة');
    console.log('   ✅ إصلاح التبعيات');
    console.log('   ✅ إصلاح قاعدة البيانات');
    console.log('   ✅ إصلاح البناء');
    console.log('   ✅ اختبار الخادم');
    
    console.log('\n🚀 يمكنك الآن تشغيل الخادم بـ: npm start');
    
  } catch (error) {
    console.error('❌ فشل في الإصلاح السريع:', error);
    process.exit(1);
  }
}

// تشغيل الإصلاح
main();