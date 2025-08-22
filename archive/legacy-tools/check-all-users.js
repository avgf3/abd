import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function checkAllUsers() {
  console.log('🔍 فحص جميع المستخدمين في قاعدة البيانات...\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ تم الاتصال بقاعدة البيانات\n');

    // جلب جميع المستخدمين مع جميع البيانات
    const result = await client.query(`
            SELECT 
                id, username, password, user_type, role, 
                is_online, created_at, join_date, gender, 
                country, status, profile_image, bio, age,
                points, level, profile_effect
            FROM users 
            ORDER BY id DESC
        `);

    console.log(`📊 إجمالي المستخدمين: ${result.rows.length}\n`);

    if (result.rows.length > 0) {
      console.log('👥 قائمة المستخدمين المفصلة:');
      console.log('═'.repeat(100));

      result.rows.forEach((user, index) => {
        console.log(`\n${index + 1}. 🆔 ID: ${user.id}`);
        console.log(`   👤 الاسم: ${user.username || 'غير محدد'}`);
        console.log(`   🔑 كلمة المرور: ${user.password || 'غير محددة'}`);
        console.log(`   📝 النوع: ${user.user_type || 'غير محدد'}`);
        console.log(`   👑 الدور: ${user.role || 'غير محدد'}`);
        console.log(`   🟢 متصل: ${user.is_online ? 'نعم' : 'لا'}`);
        console.log(
          `   📅 تاريخ الإنشاء: ${user.created_at ? new Date(user.created_at).toLocaleString('ar-SA') : 'غير محدد'}`
        );
        console.log(
          `   📅 تاريخ الانضمام: ${user.join_date ? new Date(user.join_date).toLocaleString('ar-SA') : 'غير محدد'}`
        );
        console.log(`   ⚧ الجنس: ${user.gender || 'غير محدد'}`);
        console.log(`   🌍 البلد: ${user.country || 'غير محدد'}`);
        console.log(`   📢 الحالة: ${user.status || 'غير محددة'}`);
        console.log(`   🖼️ الصورة: ${user.profile_image || 'افتراضية'}`);
        console.log(`   📝 النبذة: ${user.bio || 'غير محددة'}`);
        console.log(`   🎂 العمر: ${user.age || 'غير محدد'}`);
        console.log(`   ⭐ النقاط: ${user.points || 0}`);
        console.log(`   🏆 المستوى: ${user.level || 1}`);
        console.log(`   ✨ التأثير: ${user.profile_effect || 'none'}`);
        console.log('─'.repeat(80));
      });

      // إحصائيات
      console.log('\n📈 إحصائيات:');
      const owners = result.rows.filter((u) => u.user_type === 'owner').length;
      const members = result.rows.filter((u) => u.user_type === 'member').length;
      const guests = result.rows.filter((u) => u.user_type === 'guest').length;
      const online = result.rows.filter((u) => u.is_online).length;

      console.log(`   👑 المالكين: ${owners}`);
      console.log(`   👥 الأعضاء: ${members}`);
      console.log(`   👻 الضيوف: ${guests}`);
      console.log(`   🟢 المتصلين: ${online}`);

      // آخر المسجلين
      console.log('\n🆕 آخر 3 مستخدمين مسجلين:');
      const recent = result.rows.slice(0, 3);
      recent.forEach((user, index) => {
        console.log(
          `   ${index + 1}. ${user.username} (${user.user_type}) - ${user.created_at ? new Date(user.created_at).toLocaleDateString('ar-SA') : 'تاريخ غير محدد'}`
        );
      });
    } else {
      console.log('❌ لا يوجد مستخدمين في قاعدة البيانات');
    }

    // فحص المستخدمين الذين يمكنهم تسجيل الدخول
    console.log('\n🔐 المستخدمين الذين يمكنهم تسجيل الدخول:');
    const loginableUsers = result.rows.filter((u) => u.username && u.password);

    if (loginableUsers.length > 0) {
      loginableUsers.forEach((user, index) => {
        console.log(
          `   ${index + 1}. اسم المستخدم: "${user.username}" | كلمة المرور: "${user.password}" | النوع: ${user.user_type}`
        );
      });
    } else {
      console.log('   ❌ لا يوجد مستخدمين يمكنهم تسجيل الدخول');
    }
  } catch (error) {
    console.error('❌ خطأ في فحص المستخدمين:', error.message);
    console.error('التفاصيل:', error);
  } finally {
    await client.end();
    console.log('\n🔌 تم قطع الاتصال من قاعدة البيانات');
  }
}

// تشغيل الفحص
if (import.meta.url === `file://${process.argv[1]}`) {
  checkAllUsers()
    .then(() => {
      console.log('\n✅ انتهى فحص المستخدمين');
    })
    .catch((error) => {
      console.error('💥 فشل فحص المستخدمين:', error);
      process.exit(1);
    });
}

export default checkAllUsers;
