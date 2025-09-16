#!/usr/bin/env node

/**
 * تطبيق migration لإضافة حقل currentRoom لجدول users عبر الخادم
 */

import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
  try {
    console.log('🔄 تطبيق migration لإضافة حقل currentRoom...');
    
    // قراءة ملف migration
    const migrationPath = join(process.cwd(), 'migrations', 'add_current_room_column.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // استخدام الخادم الموجود
    const { databaseService } = await import('./server/services/databaseService.js');
    
    // تقسيم SQL إلى statements منفصلة
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`📝 تنفيذ: ${statement.substring(0, 50)}...`);
        try {
          await databaseService.executeRaw(statement);
          console.log('✅ تم تنفيذ بنجاح');
        } catch (error) {
          console.log('⚠️ خطأ في التنفيذ:', error.message);
          // تجاهل الخطأ إذا كان الحقل موجود بالفعل
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.log('✅ الحقل موجود بالفعل، تجاهل الخطأ');
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('✅ تم تطبيق migration بنجاح!');
  } catch (error) {
    console.error('❌ خطأ في تطبيق migration:', error);
    process.exit(1);
  }
}

// تشغيل migration
applyMigration().then(() => {
  console.log('🎉 انتهى تطبيق migration');
  process.exit(0);
}).catch((error) => {
  console.error('💥 فشل في تطبيق migration:', error);
  process.exit(1);
});