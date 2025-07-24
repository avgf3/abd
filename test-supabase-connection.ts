import { config } from 'dotenv';
import { createDatabaseAdapter } from './server/database-adapter';
import { users } from './shared/schema';

// تحميل متغيرات البيئة
config();

async function testSupabaseConnection() {
  console.log('🔄 اختبار الاتصال بـ Supabase...\n');
  
  try {
    // إنشاء الاتصال
    const dbAdapter = createDatabaseAdapter();
    console.log(`✅ نوع قاعدة البيانات: ${dbAdapter.type}`);
    
    if (!dbAdapter.db) {
      throw new Error('فشل في إنشاء الاتصال بقاعدة البيانات');
    }
    
    // اختبار استعلام بسيط
    console.log('🔄 اختبار استعلام SELECT 1...');
    await dbAdapter.db.execute('SELECT 1 as test');
    console.log('✅ استعلام SELECT 1 نجح');
    
    // اختبار جلب المستخدمين (إذا كانت الجداول موجودة)
    console.log('🔄 اختبار جلب المستخدمين...');
    try {
      const usersList = await dbAdapter.db.select().from(users).limit(5);
      console.log(`✅ تم جلب ${usersList.length} مستخدم من قاعدة البيانات`);
      
      if (usersList.length > 0) {
        console.log('📋 أول مستخدم:', {
          id: usersList[0].id,
          username: usersList[0].username,
          userType: usersList[0].userType,
          joinDate: usersList[0].joinDate
        });
      }
    } catch (tableError) {
      console.log('⚠️ الجداول غير موجودة بعد. سنحتاج لتشغيل migrations');
      console.log('تشغيل: npm run db:migrate');
    }
    
    console.log('\n🎉 الاتصال بـ Supabase يعمل بنجاح!');
    
    // إغلاق الاتصال
    if (dbAdapter.close) {
      dbAdapter.close();
    }
    
  } catch (error) {
    console.error('❌ خطأ في الاتصال بـ Supabase:', error);
    console.log('\n📋 تأكد من:');
    console.log('1. DATABASE_URL صحيح في ملف .env');
    console.log('2. قاعدة البيانات في Supabase تعمل');
    console.log('3. المستخدم له صلاحيات للوصول لقاعدة البيانات');
    process.exit(1);
  }
}

// تشغيل الاختبار
testSupabaseConnection();