// استيراد المكتبات المطلوبة
const path = require('path');

// محاولة تشغيل دالة بسيطة للوصول لقاعدة البيانات
async function findBlockedUsers() {
  try {
    console.log('🔍 البحث عن المستخدمين المحظورين...\n');
    
    // استيراد قاعدة البيانات باستخدام import() للتوافق مع ES modules
    const { storage } = await import('./server/storage.ts');
    
    // جلب جميع المستخدمين
    const allUsers = await storage.getAllUsers();
    
    // فلترة المستخدمين المحظورين
    const blockedUsers = allUsers.filter(user => user.isBlocked === true);
    
    if (blockedUsers.length === 0) {
      console.log('✅ لا يوجد مستخدمين محظورين حالياً');
      return;
    }
    
    console.log(`📋 تم العثور على ${blockedUsers.length} مستخدم محظور:\n`);
    
    blockedUsers.forEach((user, index) => {
      console.log(`${index + 1}. المستخدم: ${user.username}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   النوع: ${user.userType}`);
      console.log(`   عنوان IP: ${user.ipAddress || 'غير متوفر'}`);
      console.log(`   معرف الجهاز: ${user.deviceId || 'غير متوفر'}`);
      console.log(`   تاريخ الانضمام: ${user.joinDate || 'غير متوفر'}`);
      console.log('   ' + '─'.repeat(50));
    });
    
    console.log(`\n📝 أسماء المستخدمين المحظورين:`);
    blockedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (ID: ${user.id})`);
    });
    
  } catch (error) {
    console.error('❌ خطأ في البحث عن المستخدمين المحظورين:', error);
  }
}

// تشغيل السكريپت
findBlockedUsers().then(() => {
  console.log('\n✅ انتهى البحث');
  process.exit(0);
}).catch(error => {
  console.error('❌ خطأ في تشغيل السكريپت:', error);
  process.exit(1);
});