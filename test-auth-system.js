import postgres from 'postgres';
import bcrypt from 'bcrypt';

async function testAuthSystem() {
  const client = postgres('postgresql://postgres.qzehjgmawnrihmepboca:abood22333a@aws-0-eu-west-3.pooler.supabase.com:6543/postgres');
  
  try {
    console.log('🧪 بدء اختبار نظام المصادقة...\n');
    
    // 1. التحقق من عدد المستخدمين
    const userCount = await client`SELECT COUNT(*) as count FROM users`;
    console.log(`📊 عدد المستخدمين الحالي: ${userCount[0].count}`);
    
    // 2. إنشاء مستخدم اختباري (سيكون المالك إذا كان أول مستخدم)
    const testUsername = `test_owner_${Date.now()}`;
    const testPassword = 'Test123456';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    console.log(`\n📝 إنشاء مستخدم اختباري: ${testUsername}`);
    
    const isFirstUser = userCount[0].count === '0';
    
    const newUser = await client`
      INSERT INTO users (
        username, 
        password, 
        user_type,
        role,
        profile_image,
        is_online,
        join_date,
        created_at,
        last_seen
      )
      VALUES (
        ${testUsername},
        ${hashedPassword},
        ${isFirstUser ? 'owner' : 'member'},
        ${isFirstUser ? 'owner' : 'member'},
        '/default_avatar.svg',
        false,
        NOW(),
        NOW(),
        NOW()
      )
      RETURNING id, username, user_type, role
    `;
    
    console.log('✅ المستخدم تم إنشاؤه بنجاح:');
    console.log(`   - ID: ${newUser[0].id}`);
    console.log(`   - Username: ${newUser[0].username}`);
    console.log(`   - User Type: ${newUser[0].user_type}`);
    console.log(`   - Role: ${newUser[0].role}`);
    
    if (isFirstUser) {
      console.log('🎉 هذا المستخدم هو المالك (أول مستخدم مسجل)!');
    }
    
    // 3. التحقق من كلمة المرور
    console.log('\n🔐 اختبار تسجيل الدخول...');
    const user = await client`
      SELECT * FROM users 
      WHERE username = ${testUsername}
    `;
    
    if (user.length > 0) {
      const passwordValid = await bcrypt.compare(testPassword, user[0].password);
      if (passwordValid) {
        console.log('✅ تسجيل الدخول ناجح!');
      } else {
        console.log('❌ فشل تسجيل الدخول - كلمة المرور غير صحيحة');
      }
    }
    
    // 4. عرض جميع المستخدمين
    console.log('\n📋 قائمة جميع المستخدمين:');
    const allUsers = await client`
      SELECT id, username, user_type, role, created_at 
      FROM users 
      ORDER BY created_at ASC
    `;
    
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.user_type}/${user.role}) - ${new Date(user.created_at).toLocaleString('ar')}`);
    });
    
    console.log('\n✅ اختبار النظام مكتمل!');
    
  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error);
  } finally {
    await client.end();
  }
}

testAuthSystem();