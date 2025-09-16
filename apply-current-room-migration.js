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
    
    // تطبيق migration
    const { db, dbType } = await import('./server/database-adapter.js');
    const { sql } = await import('drizzle-orm');
    
    if (dbType === 'postgresql' && db) {
      // تقسيم SQL إلى statements منفصلة
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`📝 تنفيذ: ${statement.substring(0, 50)}...`);
          await db.execute(sql.raw(statement));
        }
      }
      
      console.log('✅ تم تطبيق migration بنجاح!');
    } else {
      console.log('⚠️ قاعدة البيانات غير متوفرة أو ليست PostgreSQL');
    }
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