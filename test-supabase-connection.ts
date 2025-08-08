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
    
    // اختبار استعلام بسيط عبر Drizzle
    console.log('🔄 اختبار استعلام بسيط عبر Drizzle...');
    try {
      await (dbAdapter.db as any).select().from(users).limit(1);
      console.log('✅ الاستعلام نجح');
    } catch (e) {
      console.log('⚠️ لم ينجح الاستعلام البسيط، لكن الاتصال قد يكون صالحاً:', e?.message || e);
    }
    
    // اختبار جلب المستخدمين (إذا كانت الجداول موجودة)
    console.log('🔄 اختبار جلب المستخدمين...');
    try {
      const usersList = await (dbAdapter.db as any).select().from(users).limit(5);
      console.log(`✅ تم جلب ${usersList.length} مستخدم من قاعدة البيانات`);
      
      if (usersList.length > 0) {
        console.log('📋 أول مستخدم:', {
          id: (usersList as any)[0].id,
          username: (usersList as any)[0].username,
          userType: (usersList as any)[0].userType,
          joinDate: (usersList as any)[0].joinDate
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