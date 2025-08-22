import { config } from 'dotenv';
import postgres from 'postgres';

config();

async function checkMembers() {
  const sql = postgres(process.env.DATABASE_URL);

  try {
    console.log('🔍 فحص الأعضاء المسجلين...\n');

    // جلب جميع الأعضاء (غير الضيوف)
    const members = await sql`
      SELECT username, user_type, role, password, created_at
      FROM users 
      WHERE user_type != 'guest'
      ORDER BY created_at DESC
    `;

    console.log(`📊 عدد الأعضاء المسجلين: ${members.length}\n`);

    if (members.length > 0) {
      console.log('👥 قائمة الأعضاء:\n');
      members.forEach((member, index) => {
        console.log(`${index + 1}. ${member.username}`);
        console.log(`   - النوع: ${member.user_type}`);
        console.log(`   - الرتبة: ${member.role}`);
        console.log(`   - كلمة المرور: ${member.password ? 'موجودة' : 'غير موجودة'}`);
        console.log(
          `   - نوع التشفير: ${member.password && member.password.startsWith('$2') ? 'bcrypt' : 'نص عادي'}`
        );
        console.log(`   - تاريخ التسجيل: ${new Date(member.created_at).toLocaleString('ar')}`);
        console.log('---');
      });

      // اختبار تسجيل دخول بعض الأعضاء
      console.log('\n🧪 اختبار تسجيل الدخول للأعضاء:\n');

      // اختبار الأعضاء ذوي كلمات المرور النصية
      const textPasswordMembers = members.filter((m) => m.password && !m.password.startsWith('$2'));
      if (textPasswordMembers.length > 0) {
        console.log('⚠️  يوجد أعضاء بكلمات مرور غير مشفرة:');
        textPasswordMembers.forEach((m) => {
          console.log(`   - ${m.username}`);
        });
      }
    } else {
      console.log('❌ لا يوجد أعضاء مسجلين حالياً');
    }
  } catch (error) {
    console.error('خطأ:', error);
  } finally {
    await sql.end();
  }
}

checkMembers();
