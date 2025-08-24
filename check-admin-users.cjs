const postgres = require('postgres');

async function checkAdminUsers() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.log('❌ DATABASE_URL غير محدد');
      return;
    }

    const sql = postgres(databaseUrl, {
      ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
    });

    // فحص المستخدمين الإداريين
    const adminUsers = await sql`
      SELECT id, username, "userType", "isOnline"
      FROM users 
      WHERE "userType" IN ('owner', 'admin', 'moderator') 
      ORDER BY 
        CASE "userType"
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'moderator' THEN 3
          ELSE 4
        END,
        username
    `;

    console.log('\n=== المستخدمين الإداريين ===');
    if (adminUsers.length === 0) {
      console.log('❌ لا يوجد مستخدمين إداريين في قاعدة البيانات');
    } else {
      adminUsers.forEach(user => {
        const status = user.isOnline ? '🟢 متصل' : '⚫ غير متصل';
        console.log(`${user.userType.toUpperCase()}: ${user.username} (ID: ${user.id}) ${status}`);
      });
    }

    // إحصائيات سريعة
    const stats = await sql`
      SELECT "userType", COUNT(*) as count
      FROM users 
      WHERE "userType" IN ('owner', 'admin', 'moderator', 'member')
      GROUP BY "userType"
      ORDER BY 
        CASE "userType"
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'moderator' THEN 3
          WHEN 'member' THEN 4
          ELSE 5
        END
    `;

    console.log('\n=== إحصائيات المستخدمين ===');
    stats.forEach(stat => {
      console.log(`${stat.userType}: ${stat.count} مستخدم`);
    });

    await sql.end();
  } catch (error) {
    console.error('❌ خطأ في فحص المستخدمين:', error.message);
  }
}

// تشغيل الفحص
checkAdminUsers().then(() => process.exit(0));