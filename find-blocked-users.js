const { databaseService } = require('./server/services/databaseService');

async function findBlockedUsers() {
  try {
    console.log('🔍 البحث عن المستخدمين المحظورين...\n');
    
    // جلب جميع المستخدمين
    const allUsers = await databaseService.getAllUsers();
    
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

// تشغيل السكريبت
findBlockedUsers().then(() => {
  console.log('\n✅ انتهى البحث');
  process.exit(0);
}).catch(error => {
  console.error('❌ خطأ في تشغيل السكريبت:', error);
  process.exit(1);
});