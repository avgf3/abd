#!/usr/bin/env node

console.log('🔧 إضافة عمود profile_effect للمستخدمين...');

import { sql } from 'drizzle-orm';
import { db } from './server/db.js';

async function addProfileEffectColumn() {
  try {
    // محاولة إضافة العمود (PostgreSQL)
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_effect TEXT DEFAULT 'none'`);
    console.log('✅ تم إضافة عمود profile_effect بنجاح في PostgreSQL');
  } catch (error) {
    console.log('📝 محاولة SQLite...');
    try {
      // محاولة للـ SQLite
      await db.execute(sql`ALTER TABLE users ADD COLUMN profile_effect TEXT DEFAULT 'none'`);
      console.log('✅ تم إضافة عمود profile_effect بنجاح في SQLite');
    } catch (sqliteError) {
      console.log('⚠️ العمود موجود بالفعل أو خطأ في الإضافة:', sqliteError.message);
    }
  }

  try {
    // تحديث المستخدمين الموجودين
    await db.execute(sql`UPDATE users SET profile_effect = 'none' WHERE profile_effect IS NULL`);
    console.log('✅ تم تحديث المستخدمين الموجودين');
  } catch (error) {
    console.log('⚠️ خطأ في تحديث المستخدمين:', error.message);
  }

  console.log('🎉 Migration مكتمل!');
  process.exit(0);
}

addProfileEffectColumn().catch(console.error);