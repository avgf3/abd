import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import postgres from 'postgres';

dotenv.config();

async function fixFilePaths() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL غير محدد في ملف .env');
    process.exit(1);
  }

  console.log('🔄 بدء إصلاح مسارات الملفات...');

  const sql = postgres(databaseUrl, {
    max: 1,
    ssl: databaseUrl.includes('localhost') ? false : 'require',
  });

  try {
    // التأكد من وجود المجلدات
    const uploadDirs = [
      'client/public/uploads/avatars',
      'client/public/uploads/banners',
      'client/public/uploads/profiles',
      'client/public/uploads/wall',
    ];

    for (const dir of uploadDirs) {
      const fullPath = path.join(process.cwd(), dir);
      await fs.mkdir(fullPath, { recursive: true });
      console.log(`✅ تم التأكد من وجود مجلد: ${dir}`);
    }

    // إصلاح مسارات الصور في قاعدة البيانات
    const users = await sql`
      SELECT id, username, profile_image
      FROM users
      WHERE profile_image IS NOT NULL
    `;

    let fixedCount = 0;

    for (const user of users) {
      if (user.profile_image && user.profile_image.includes('/opt/render/')) {
        const filename = path.basename(user.profile_image);
        const newPath = `/uploads/avatars/${filename}`;

        await sql`
          UPDATE users 
          SET profile_image = ${newPath}
          WHERE id = ${user.id}
        `;

        fixedCount++;
        console.log(`✅ تم إصلاح مسار صورة: ${user.username}`);
      }
    }

    console.log(`\n✅ تم إصلاح ${fixedCount} مسار`);
  } catch (error) {
    console.error('❌ خطأ:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

fixFilePaths().catch(console.error);
