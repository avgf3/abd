#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

// المستويات الافتراضية (منسوخة من points-system.ts)
const DEFAULT_LEVELS = [
  { level: 1, requiredPoints: 0, title: "مبتدئ", color: "#8B4513" },
  { level: 2, requiredPoints: 50, title: "عضو نشط", color: "#CD853F" },
  { level: 3, requiredPoints: 150, title: "عضو متميز", color: "#DAA520" },
  { level: 4, requiredPoints: 300, title: "عضو خبير", color: "#FFD700" },
  { level: 5, requiredPoints: 500, title: "عضو محترف", color: "#FF8C00" },
  { level: 6, requiredPoints: 750, title: "خبير متقدم", color: "#FF6347" },
  { level: 7, requiredPoints: 1000, title: "خبير النخبة", color: "#DC143C" },
  { level: 8, requiredPoints: 1500, title: "أسطورة", color: "#8A2BE2" },
  { level: 9, requiredPoints: 2000, title: "أسطورة النخبة", color: "#4B0082" },
  { level: 10, requiredPoints: 3000, title: "إمبراطور", color: "#000080" },
];

// إعداد قاعدة البيانات
const sqlite = new Database('local.db');
const db = drizzle(sqlite);

async function setupPointsSystem() {
  console.log('🎯 إعداد نظام النقاط والمستويات...');
  
  try {
    // إنشاء الجداول الجديدة إذا لم تكن موجودة
    console.log('📊 إنشاء جداول النقاط والمستويات...');
    
    // إضافة أعمدة النقاط للمستخدمين الحاليين
    try {
      sqlite.exec(`
        ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;
        ALTER TABLE users ADD COLUMN total_points INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN level_progress INTEGER DEFAULT 0;
      `);
      console.log('✅ تم إضافة أعمدة النقاط إلى جدول المستخدمين');
    } catch (error) {
      // الأعمدة موجودة بالفعل
      console.log('ℹ️ أعمدة النقاط موجودة بالفعل');
    }
    
    // إنشاء جدول تاريخ النقاط
    try {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS points_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id),
          points INTEGER NOT NULL,
          reason TEXT NOT NULL,
          action TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ تم إنشاء جدول تاريخ النقاط');
    } catch (error) {
      console.log('ℹ️ جدول تاريخ النقاط موجود بالفعل');
    }
    
    // إنشاء جدول إعدادات المستويات
    try {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS level_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          level INTEGER NOT NULL UNIQUE,
          required_points INTEGER NOT NULL,
          title TEXT NOT NULL,
          color TEXT DEFAULT '#FFFFFF',
          benefits TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ تم إنشاء جدول إعدادات المستويات');
    } catch (error) {
      console.log('ℹ️ جدول إعدادات المستويات موجود بالفعل');
    }
    
    // إضافة المستويات الافتراضية
    console.log('🏆 إضافة المستويات الافتراضية...');
    
    for (const levelData of DEFAULT_LEVELS) {
      try {
        const stmt = sqlite.prepare(`
          INSERT OR IGNORE INTO level_settings (level, required_points, title, color, benefits, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          levelData.level,
          levelData.requiredPoints,
          levelData.title,
          levelData.color,
          JSON.stringify({
            title: levelData.title,
            color: levelData.color,
            description: `مستوى ${levelData.title} - يتطلب ${levelData.requiredPoints} نقطة`
          }),
          new Date().toISOString()
        );
        
        console.log(`✅ تم إضافة المستوى ${levelData.level}: ${levelData.title}`);
      } catch (error) {
        console.log(`ℹ️ المستوى ${levelData.level} موجود بالفعل أو حدث خطأ: ${error.message}`);
      }
    }
    
    // تحديث نقاط المستخدمين الحاليين
    console.log('👥 تحديث نقاط المستخدمين الحاليين...');
    
    const users = sqlite.prepare('SELECT id, username FROM users').all();
    const updateUserStmt = sqlite.prepare(`
      UPDATE users 
      SET points = ?, level = ?, total_points = ?, level_progress = ?
      WHERE id = ?
    `);
    
    for (const user of users) {
      // إعطاء نقاط أولية بناء على عدد الرسائل المرسلة
      const messageCount = sqlite.prepare('SELECT COUNT(*) as count FROM messages WHERE sender_id = ?').get(user.id)?.count || 0;
      const initialPoints = messageCount * 1; // نقطة واحدة لكل رسالة
      
      // حساب المستوى والتقدم
      const level = calculateLevel(initialPoints);
      const levelProgress = calculateLevelProgress(initialPoints);
      
      updateUserStmt.run(initialPoints, level, initialPoints, levelProgress, user.id);
      
      console.log(`✅ تم تحديث نقاط المستخدم ${user.username}: ${initialPoints} نقطة، المستوى ${level}`);
    }
    
    console.log('🎉 تم إعداد نظام النقاط والمستويات بنجاح!');
    console.log('📋 ملخص النظام:');
    console.log(`- ${DEFAULT_LEVELS.length} مستوى متاح`);
    console.log(`- ${users.length} مستخدم تم تحديث نقاطهم`);
    console.log('- نظام تتبع النقاط مفعل');
    
  } catch (error) {
    console.error('❌ خطأ في إعداد نظام النقاط:', error);
  } finally {
    sqlite.close();
  }
}

// دالة حساب المستوى (نسخة مبسطة)
function calculateLevel(totalPoints) {
  for (let i = DEFAULT_LEVELS.length - 1; i >= 0; i--) {
    if (totalPoints >= DEFAULT_LEVELS[i].requiredPoints) {
      return DEFAULT_LEVELS[i].level;
    }
  }
  return 1;
}

// دالة حساب تقدم المستوى (نسخة مبسطة)
function calculateLevelProgress(totalPoints) {
  const currentLevel = calculateLevel(totalPoints);
  const currentLevelData = DEFAULT_LEVELS.find(l => l.level === currentLevel);
  const nextLevelData = DEFAULT_LEVELS.find(l => l.level === currentLevel + 1);
  
  if (!currentLevelData || !nextLevelData) {
    return 100; // إذا كان في المستوى الأخير
  }
  
  const pointsInCurrentLevel = totalPoints - currentLevelData.requiredPoints;
  const pointsNeededForNextLevel = nextLevelData.requiredPoints - currentLevelData.requiredPoints;
  
  return Math.min(100, Math.floor((pointsInCurrentLevel / pointsNeededForNextLevel) * 100));
}

// تشغيل السكريبت
if (import.meta.url === `file://${process.argv[1]}`) {
  setupPointsSystem();
}