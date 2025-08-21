import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

async function checkRealImages() {
  const databaseUrl = process.env.DATABASE_URL;
  
  const sql = postgres(databaseUrl, {
    max: 1,
    ssl: databaseUrl.includes('localhost') ? false : 'require',
  });

  try {
    const users = await sql`
      SELECT id, username, profile_image
      FROM users
      WHERE profile_image IS NOT NULL
      AND profile_image != '/default_avatar.svg'
      LIMIT 20
    `;

    console.log('📸 المستخدمين مع صور حقيقية (ليست default):');
    console.log('=====================================');
    
    if (users.length === 0) {
      console.log('✅ لا يوجد مستخدمين مع صور حقيقية مفقودة!');
      console.log('كل المستخدمين يستخدمون الصورة الافتراضية.');
    } else {
      users.forEach(user => {
        console.log(`ID: ${user.id} | ${user.username}`);
        console.log(`الصورة: ${user.profile_image}`);
        console.log('---');
      });
      console.log(`\n⚠️ المجموع: ${users.length} مستخدم مع صور مفقودة`);
    }

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await sql.end();
  }
}

checkRealImages();