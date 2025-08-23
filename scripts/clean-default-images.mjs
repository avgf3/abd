#!/usr/bin/env node

/**
 * سكريبت تنظيف الصور الافتراضية من قاعدة البيانات
 * يزيل جميع المراجع للصور الافتراضية والفيسبوك
 */

import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// تحميل متغيرات البيئة
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ لم يتم العثور على رابط قاعدة البيانات');
  process.exit(1);
}

async function cleanDefaultImages() {
  console.log('🔄 بدء تنظيف الصور الافتراضية...');
  
  const sql = postgres(DATABASE_URL);
  
  try {
    // البحث عن المستخدمين الذين لديهم صور افتراضية
    const result = await sql`
      SELECT id, username, profile_image, profile_banner
      FROM users
      WHERE profile_image LIKE '%default%'
         OR profile_image LIKE '%facebook%'
         OR profile_image = '/default_avatar.svg'
         OR profile_banner LIKE '%default%'
         OR profile_banner LIKE '%facebook%'
    `;
    
    console.log(`📊 تم العثور على ${result.length} مستخدم بصور افتراضية`);
    
    if (result.length > 0) {
      // تنظيف الصور الافتراضية
      const updateResult = await sql`
        UPDATE users
        SET 
          profile_image = CASE 
            WHEN profile_image LIKE '%default%' 
              OR profile_image LIKE '%facebook%'
              OR profile_image = '/default_avatar.svg'
            THEN NULL 
            ELSE profile_image 
          END,
          profile_banner = CASE 
            WHEN profile_banner LIKE '%default%' 
              OR profile_banner LIKE '%facebook%'
            THEN NULL 
            ELSE profile_banner 
          END,
          avatar_hash = CASE 
            WHEN profile_image LIKE '%default%' 
              OR profile_image LIKE '%facebook%'
              OR profile_image = '/default_avatar.svg'
            THEN NULL 
            ELSE avatar_hash 
          END
        WHERE profile_image LIKE '%default%'
           OR profile_image LIKE '%facebook%'
           OR profile_image = '/default_avatar.svg'
           OR profile_banner LIKE '%default%'
           OR profile_banner LIKE '%facebook%'
      `;
      
      console.log(`✅ تم تنظيف ${updateResult.count} سجل`);
      
      // عرض التفاصيل
      for (const user of result) {
        console.log(`  - المستخدم ${user.username} (ID: ${user.id})`);
        if (user.profile_image && (
          user.profile_image.includes('default') || 
          user.profile_image.includes('facebook') ||
          user.profile_image === '/default_avatar.svg'
        )) {
          console.log(`    • تم حذف صورة البروفايل: ${user.profile_image}`);
        }
        if (user.profile_banner && (
          user.profile_banner.includes('default') || 
          user.profile_banner.includes('facebook')
        )) {
          console.log(`    • تم حذف صورة البانر: ${user.profile_banner}`);
        }
      }
    } else {
      console.log('✅ لا توجد صور افتراضية للتنظيف');
    }
    
    // التحقق من النتيجة
    const checkResult = await sql`
      SELECT COUNT(*) as count
      FROM users
      WHERE profile_image LIKE '%default%'
         OR profile_image LIKE '%facebook%'
         OR profile_image = '/default_avatar.svg'
         OR profile_banner LIKE '%default%'
         OR profile_banner LIKE '%facebook%'
    `;
    
    if (checkResult[0].count > 0) {
      console.log(`⚠️ تبقى ${checkResult[0].count} سجل بصور افتراضية`);
    } else {
      console.log('✅ تم التنظيف بنجاح - لا توجد صور افتراضية متبقية');
    }
    
  } catch (error) {
    console.error('❌ خطأ في تنظيف الصور الافتراضية:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// تشغيل السكريبت
cleanDefaultImages()
  .then(() => {
    console.log('✅ انتهى التنظيف');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ فشل التنظيف:', error);
    process.exit(1);
  });