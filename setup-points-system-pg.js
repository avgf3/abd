#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { levelSettings, users, pointsHistory } from './shared/schema.js';
import { DEFAULT_LEVELS } from './shared/points-system.js';

// إعداد قاعدة البيانات
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/chatapp';
const sql = postgres(connectionString);
const db = drizzle(sql);

async function setupPointsSystemPG() {
  console.log('🎯 إعداد نظام النقاط والمستويات في PostgreSQL...');
  
  try {
    // إضافة أعمدة النقاط للمستخدمين الحاليين
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS level_progress INTEGER DEFAULT 0;
      `;
      console.log('✅ تم إضافة أعمدة النقاط إلى جدول المستخدمين');
    } catch (error) {
      console.log('ℹ️ أعمدة النقاط موجودة بالفعل');
    }
    
    // إنشاء جدول تاريخ النقاط
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS points_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          points INTEGER NOT NULL,
          reason TEXT NOT NULL,
          action TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;
      console.log('✅ تم إنشاء جدول تاريخ النقاط');
    } catch (error) {
      console.log('ℹ️ جدول تاريخ النقاط موجود بالفعل');
    }
    
    // إنشاء جدول إعدادات المستويات
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS level_settings (
          id SERIAL PRIMARY KEY,
          level INTEGER NOT NULL UNIQUE,
          required_points INTEGER NOT NULL,
          title TEXT NOT NULL,
          color TEXT DEFAULT '#FFFFFF',
          benefits JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;
      console.log('✅ تم إنشاء جدول إعدادات المستويات');
    } catch (error) {
      console.log('ℹ️ جدول إعدادات المستويات موجود بالفعل');
    }
    
    // إضافة المستويات الافتراضية
    console.log('🏆 إضافة المستويات الافتراضية...');
    
    for (const levelData of DEFAULT_LEVELS) {
      try {
        await db.insert(levelSettings).values({
          level: levelData.level,
          requiredPoints: levelData.requiredPoints,
          title: levelData.title,
          color: levelData.color,
          benefits: {
            title: levelData.title,
            color: levelData.color,
            description: `مستوى ${levelData.title} - يتطلب ${levelData.requiredPoints} نقطة`
          }
        }).onConflictDoNothing();
        
        console.log(`✅ تم إضافة المستوى ${levelData.level}: ${levelData.title}`);
      } catch (error) {
        console.log(`ℹ️ المستوى ${levelData.level} موجود بالفعل`);
      }
    }
    
    // تحديث نقاط المستخدمين الحاليين
    console.log('👥 تحديث نقاط المستخدمين الحاليين...');
    
    const existingUsers = await db.select({
      id: users.id,
      username: users.username
    }).from(users);
    
    for (const user of existingUsers) {
      // حساب النقاط بناء على عدد الرسائل
      const messageCount = await sql`
        SELECT COUNT(*) as count 
        FROM messages 
        WHERE sender_id = ${user.id}
      `;
      
      const initialPoints = Number(messageCount[0].count) * 1; // نقطة واحدة لكل رسالة
      
      // حساب المستوى والتقدم
      const level = calculateLevel(initialPoints);
      const levelProgress = calculateLevelProgress(initialPoints);
      
      await sql`
        UPDATE users 
        SET points = ${initialPoints}, 
            level = ${level}, 
            total_points = ${initialPoints}, 
            level_progress = ${levelProgress}
        WHERE id = ${user.id}
      `;
      
      console.log(`✅ تم تحديث نقاط المستخدم ${user.username}: ${initialPoints} نقطة، المستوى ${level}`);
    }
    
    console.log('🎉 تم إعداد نظام النقاط والمستويات بنجاح!');
    console.log('📋 ملخص النظام:');
    console.log(`- ${DEFAULT_LEVELS.length} مستوى متاح`);
    console.log(`- ${existingUsers.length} مستخدم تم تحديث نقاطهم`);
    console.log('- نظام تتبع النقاط مفعل');
    
  } catch (error) {
    console.error('❌ خطأ في إعداد نظام النقاط:', error);
  } finally {
    await sql.end();
  }
}

// استخدام الدوال من الملف المشترك لتجنب التكرار
const { calculateLevel, calculateLevelProgress } = require('./shared/points-system');

// تشغيل السكريبت
if (import.meta.url === `file://${process.argv[1]}`) {
  setupPointsSystemPG();
}