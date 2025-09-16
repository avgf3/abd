#!/usr/bin/env node

/**
 * تطبيق migration لإضافة حقل currentRoom لجدول users
 */

import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
  try {
    console.log('🔄 تطبيق migration لإضافة حقل currentRoom...');
    
    // قراءة ملف migration
    const migrationPath = join(process.cwd(), 'migrations', 'add_current_room_column.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('📝 SQL المراد تنفيذه:');
    console.log(migrationSQL);
    
    console.log('✅ تم قراءة migration بنجاح!');
    console.log('💡 يرجى تطبيق هذا SQL يدوياً على قاعدة البيانات:');
    console.log('');
    console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS current_room TEXT DEFAULT \'general\';');
    console.log('UPDATE users SET current_room = \'general\' WHERE current_room IS NULL;');
    console.log('CREATE INDEX IF NOT EXISTS idx_users_current_room ON users(current_room);');
    
  } catch (error) {
    console.error('❌ خطأ في قراءة migration:', error);
    process.exit(1);
  }
}

// تشغيل migration
applyMigration().then(() => {
  console.log('🎉 انتهى قراءة migration');
  process.exit(0);
}).catch((error) => {
  console.error('💥 فشل في قراءة migration:', error);
  process.exit(1);
});