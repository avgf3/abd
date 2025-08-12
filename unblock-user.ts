import { moderationSystem } from './server/moderation';
import { storage } from './server/storage';

async function unblockUser(userId: number, moderatorId: number = 1) {
  try {
    console.log(`🔓 محاولة إلغاء حظر المستخدم ID: ${userId}...\n`);
    
    // البحث عن المستخدم
    const user = await storage.getUser(userId);
    if (!user) {
      console.log('❌ المستخدم غير موجود');
      return false;
    }
    
    console.log(`👤 المستخدم الموجود: ${user.username} (ID: ${user.id})`);
    console.log(`📊 حالة الحظر: ${user.isBlocked ? 'محظور ❌' : 'غير محظور ✅'}`);
    
    if (!user.isBlocked) {
      console.log('ℹ️  المستخدم غير محظور أصلاً');
      return true;
    }
    
    // إلغاء الحظر
    const result = await moderationSystem.unblockUser(moderatorId, userId);
    
    if (result) {
      console.log(`✅ تم إلغاء حظر ${user.username} بنجاح!`);
      console.log('🎉 يمكن للمستخدم الآن الدخول للدردشة');
      
      // التحقق من الحالة الجديدة
      const updatedUser = await storage.getUser(userId);
      if (updatedUser && !updatedUser.isBlocked) {
        console.log('✅ تم التأكد من إلغاء الحظر في قاعدة البيانات');
      }
      
      return true;
    } else {
      console.log('❌ فشل في إلغاء الحظر');
      return false;
    }
    
  } catch (error) {
    console.error('❌ خطأ في إلغاء الحظر:', error);
    return false;
  }
}

// إلغاء حظر المستخدم شقو (ID: 434)
async function unblockShaqo() {
  console.log('🚀 بدء عملية إلغاء حظر المستخدم "شقو"...\n');
  
  const shaqoId = 434;
  const ownerId = 1; // ID المالك (عادة 1)
  
  const success = await unblockUser(shaqoId, ownerId);
  
  if (success) {
    console.log('\n🎊 تمت العملية بنجاح!');
    console.log('🔓 المستخدم "شقو" لم يعد محظوراً');
    console.log('💬 يمكنه الآن الدخول والمشاركة في الدردشة');
  } else {
    console.log('\n💥 فشلت العملية!');
    console.log('❓ قد تحتاج للتحقق من الصلاحيات أو وجود خطأ في قاعدة البيانات');
  }
}

// تشغيل السكريپت
unblockShaqo().then(() => {
  console.log('\n✅ انتهى السكريپت');
  process.exit(0);
}).catch(error => {
  console.error('❌ خطأ في تشغيل السكريپت:', error);
  process.exit(1);
});