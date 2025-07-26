#!/usr/bin/env node

import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

console.log('🔧 إصلاح مشاكل قاعدة البيانات...');

async function fixDatabaseIssues() {
  try {
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/chatapp';
    console.log('📡 الاتصال بقاعدة البيانات:', databaseUrl.replace(/\/\/.*@/, '//***@'));
    
    const client = postgres(databaseUrl, { max: 1 });
    
    // 1. حذف الجداول المكررة
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
    
    // 2. إنشاء الجداول بشكل صحيح
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
    console.log('✅ تم إنشاء جدول users');
    
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
    console.log('✅ تم إنشاء جدول messages');
    
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
    console.log('✅ تم إنشاء جدول friends');
    
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
    console.log('✅ تم إنشاء جدول notifications');
    
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
    console.log('✅ تم إنشاء جدول blocked_devices');
    
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
    console.log('✅ تم إنشاء جدول points_history');
    
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
    console.log('✅ تم إنشاء جدول level_settings');
    
    // 3. إدخال البيانات الافتراضية
    console.log('📝 إدخال البيانات الافتراضية...');
    
    // إنشاء مستخدم مالك افتراضي
    await client`
      INSERT INTO users (username, user_type, role, points, level, total_points, level_progress)
      VALUES ('admin', 'owner', 'owner', 1000, 10, 1000, 0)
    `;
    console.log('✅ تم إنشاء مستخدم admin');
    
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
      `;
    }
    console.log('✅ تم إدخال إعدادات المستويات');
    
    // 4. التحقق من الجداول
    console.log('🔍 التحقق من الجداول...');
    
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log('📋 الجداول الموجودة:');
    for (const table of tables) {
      console.log(`   - ${table.table_name}`);
    }
    
    await client.end();
    
    console.log('\n🎉 تم إصلاح قاعدة البيانات بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح قاعدة البيانات:', error);
    throw error;
  }
}

// تشغيل الإصلاح
fixDatabaseIssues().catch(console.error);