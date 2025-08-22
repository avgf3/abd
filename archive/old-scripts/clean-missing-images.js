import dotenv from 'dotenv';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function cleanMissingImages() {
  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : 'require',
  });

  try {
    // الحصول على المستخدمين مع صور غير default
    const users = await sql`
      SELECT id, username, profile_image
      FROM users
      WHERE profile_image IS NOT NULL
      AND profile_image != '/default_avatar.svg'
      AND profile_image NOT LIKE 'data:%'
    `;

    console.log('🔍 فحص الصور المفقودة...');
    let updatedCount = 0;

    for (const user of users) {
      const imagePath = path.join(process.cwd(), 'client/public', user.profile_image);

      // التحقق من وجود الملف
      if (!fs.existsSync(imagePath)) {
        console.log(`❌ الصورة مفقودة للمستخدم ${user.username} (ID: ${user.id})`);

        // تحديث إلى الصورة الافتراضية
        await sql`
          UPDATE users
          SET profile_image = '/default_avatar.svg'
          WHERE id = ${user.id}
        `;

        updatedCount++;
        console.log(`✅ تم التحديث إلى الصورة الافتراضية`);
      }
    }

    console.log(`\n📊 النتيجة:`);
    console.log(`- تم فحص: ${users.length} مستخدم`);
    console.log(`- تم تحديث: ${updatedCount} مستخدم`);
    console.log(`- الصور الموجودة: ${users.length - updatedCount} مستخدم`);
  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await sql.end();
  }
}

cleanMissingImages();
