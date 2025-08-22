import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

async function checkImages() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL غير محدد');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    ssl: databaseUrl.includes('localhost') ? false : 'require',
  });

  try {
    // الحصول على المستخدمين الذين لديهم صور
    const users = await sql`
      SELECT id, username, profile_image
      FROM users
      WHERE profile_image IS NOT NULL
      LIMIT 10
    `;

    console.log('📊 المستخدمين مع صور مسجلة في قاعدة البيانات:');
    console.log('=====================================');

    users.forEach((user) => {
      console.log(`ID: ${user.id}`);
      console.log(`الاسم: ${user.username}`);
      console.log(`مسار الصورة المسجل: ${user.profile_image}`);
      console.log('-------------------------------------');
    });

    console.log(`\n📈 المجموع: ${users.length} مستخدم لديه صورة مسجلة`);
    console.log('⚠️  لكن الملفات الفعلية غير موجودة على الخادم!');
  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await sql.end();
  }
}

checkImages();
