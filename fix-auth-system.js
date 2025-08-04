import bcrypt from 'bcrypt';
import { db } from './server/db.ts';
import { users } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function fixAuthSystem() {
  console.log('🔐 إصلاح نظام المصادقة...\n');

  try {
    // Check if database is connected
    if (!db) {
      console.error('❌ قاعدة البيانات غير متصلة!');
      return;
    }

    // Test authentication functionality
    console.log('🧪 اختبار وظائف المصادقة...\n');

    // 1. Test user creation
    console.log('1️⃣ اختبار إنشاء مستخدم جديد...');
    const testUsername = `test_user_${Date.now()}`;
    const testPassword = 'Test123!';
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    try {
      const newUser = await db.insert(users).values({
        username: testUsername,
        password: hashedPassword,
        userType: 'member',
        role: 'member',
        gender: 'male',
        profileImage: '/default_avatar.svg',
        status: 'متاح',
        points: 100,
        level: 1
      }).returning();

      console.log('✅ تم إنشاء المستخدم بنجاح:', newUser[0].username);

      // 2. Test password verification
      console.log('\n2️⃣ اختبار التحقق من كلمة المرور...');
      const isValid = await bcrypt.compare(testPassword, hashedPassword);
      console.log(`✅ التحقق من كلمة المرور: ${isValid ? 'نجح' : 'فشل'}`);

      // 3. Test user retrieval
      console.log('\n3️⃣ اختبار استرجاع المستخدم...');
      const foundUser = await db.select().from(users).where(eq(users.username, testUsername)).limit(1);
      console.log(`✅ تم العثور على المستخدم: ${foundUser.length > 0 ? 'نعم' : 'لا'}`);

      // 4. Clean up test user
      console.log('\n4️⃣ تنظيف المستخدم التجريبي...');
      await db.delete(users).where(eq(users.username, testUsername));
      console.log('✅ تم حذف المستخدم التجريبي');

    } catch (error) {
      console.error('❌ خطأ في اختبار المصادقة:', error);
    }

    // Fix existing users without hashed passwords
    console.log('\n🔧 إصلاح كلمات المرور غير المشفرة...');
    const allUsers = await db.select().from(users).where(eq(users.userType, 'member'));
    
    let fixedCount = 0;
    for (const user of allUsers) {
      if (user.password && !user.password.startsWith('$2b$')) {
        // Hash the plain text password
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await db.update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, user.id));
        fixedCount++;
      }
    }
    
    console.log(`✅ تم تشفير ${fixedCount} كلمة مرور`);

    // Create default admin user if not exists
    console.log('\n👤 التحقق من وجود مستخدم مسؤول...');
    const adminUser = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
    
    if (adminUser.length === 0) {
      const adminPassword = await bcrypt.hash('Admin123!', 10);
      await db.insert(users).values({
        username: 'admin',
        password: adminPassword,
        userType: 'owner',
        role: 'owner',
        gender: 'male',
        profileImage: '/default_avatar.svg',
        status: 'متاح',
        points: 999999,
        level: 99,
        bio: 'مسؤول الموقع'
      });
      console.log('✅ تم إنشاء مستخدم مسؤول افتراضي');
      console.log('   - اسم المستخدم: admin');
      console.log('   - كلمة المرور: Admin123!');
    } else {
      console.log('✅ مستخدم مسؤول موجود بالفعل');
    }

    console.log('\n✅ تم إصلاح نظام المصادقة بنجاح!');
    
    // Display authentication tips
    console.log('\n📝 نصائح للمصادقة:');
    console.log('1. تأكد من أن جميع كلمات المرور مشفرة');
    console.log('2. استخدم HTTPS في الإنتاج');
    console.log('3. قم بتفعيل rate limiting للحماية من هجمات brute force');
    console.log('4. استخدم session secret قوي');
    console.log('5. قم بتحديث كلمات المرور الافتراضية');

  } catch (error) {
    console.error('❌ خطأ في إصلاح نظام المصادقة:', error);
  }
}

// Run the fix
fixAuthSystem().then(() => process.exit(0)).catch(console.error);