import { storage } from './server/storage';

async function showDatabaseStats() {
  try {
    console.log('📊 إحصائيات قاعدة البيانات');
    console.log('='.repeat(50));

    // جلب جميع المستخدمين
    const allUsers = await storage.getAllUsers();
    
    // تصنيف المستخدمين
    const totalUsers = allUsers.length;
    const blockedUsers = allUsers.filter(user => user.isBlocked === true);
    const bannedUsers = allUsers.filter(user => user.isBanned === true);
    const mutedUsers = allUsers.filter(user => user.isMuted === true);
    const onlineUsers = allUsers.filter(user => user.isOnline === true);
    
    // تصنيف حسب النوع
    const owners = allUsers.filter(user => user.userType === 'owner');
    const admins = allUsers.filter(user => user.userType === 'admin');
    const moderators = allUsers.filter(user => user.userType === 'moderator');
    const members = allUsers.filter(user => user.userType === 'member');
    const guests = allUsers.filter(user => user.userType === 'guest');
    const bots = allUsers.filter(user => user.userType === 'bot');

    // عرض الإحصائيات العامة
    console.log('👥 إحصائيات المستخدمين:');
    console.log(`   📈 إجمالي المستخدمين: ${totalUsers}`);
    console.log(`   🟢 متصل الآن: ${onlineUsers.length}`);
    console.log(`   🔴 غير متصل: ${totalUsers - onlineUsers.length}`);
    console.log('');

    // عرض الإحصائيات حسب النوع
    console.log('👑 إحصائيات حسب النوع:');
    console.log(`   👑 المالكين: ${owners.length}`);
    console.log(`   🛡️  الأدمن: ${admins.length}`);
    console.log(`   🔧 المشرفين: ${moderators.length}`);
    console.log(`   👤 الأعضاء: ${members.length}`);
    console.log(`   👻 الضيوف: ${guests.length}`);
    console.log(`   🤖 البوتات: ${bots.length}`);
    console.log('');

    // عرض إحصائيات الإدارة
    console.log('⚖️  إحصائيات الإدارة:');
    console.log(`   🚫 محظورين: ${blockedUsers.length}`);
    console.log(`   ⏰ مطرودين: ${bannedUsers.length}`);
    console.log(`   🔇 مكتومين: ${mutedUsers.length}`);
    console.log('');

    // عرض تفاصيل المحظورين إذا وجدوا
    if (blockedUsers.length > 0) {
      console.log('🚫 المستخدمين المحظورين:');
      blockedUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.username} (ID: ${user.id}) - ${user.userType}`);
      });
      console.log('');
    }

    // عرض تفاصيل المطرودين إذا وجدوا
    if (bannedUsers.length > 0) {
      console.log('⏰ المستخدمين المطرودين:');
      bannedUsers.forEach((user, index) => {
        const banExpiry = user.banExpiry ? new Date(user.banExpiry) : null;
        const timeLeft = banExpiry ? Math.max(0, Math.ceil((banExpiry.getTime() - Date.now()) / 60000)) : 0;
        console.log(`   ${index + 1}. ${user.username} (ID: ${user.id}) - باقي ${timeLeft} دقيقة`);
      });
      console.log('');
    }

    // عرض تفاصيل المكتومين إذا وجدوا
    if (mutedUsers.length > 0) {
      console.log('🔇 المستخدمين المكتومين:');
      mutedUsers.forEach((user, index) => {
        const muteExpiry = user.muteExpiry ? new Date(user.muteExpiry) : null;
        const timeLeft = muteExpiry ? Math.max(0, Math.ceil((muteExpiry.getTime() - Date.now()) / 60000)) : 0;
        console.log(`   ${index + 1}. ${user.username} (ID: ${user.id}) - باقي ${timeLeft} دقيقة`);
      });
      console.log('');
    }

    // جلب الأجهزة المحجوبة
    try {
      const blockedDevices = await storage.getBlockedDevices();
      console.log(`🔒 الأجهزة المحجوبة: ${blockedDevices.length}`);
      if (blockedDevices.length > 0) {
        console.log('   تفاصيل الأجهزة المحجوبة:');
        blockedDevices.forEach((device, index) => {
          console.log(`   ${index + 1}. IP: ${device.ipAddress}, Device: ${device.deviceId}, User ID: ${device.userId}`);
        });
      }
      console.log('');
    } catch (error) {
      console.log('❌ خطأ في جلب الأجهزة المحجوبة:', error);
    }

    // إحصائيات إضافية
    try {
      const stats = await storage.getStats();
      console.log('📈 إحصائيات إضافية:');
      console.log(`   💬 إجمالي الرسائل: ${stats.messages}`);
      console.log(`   👥 المستخدمين المسجلين: ${stats.users}`);
      console.log(`   🟢 المتصلين حالياً: ${stats.onlineUsers}`);
    } catch (error) {
      console.log('❌ خطأ في جلب الإحصائيات الإضافية');
    }

    console.log('');
    console.log('='.repeat(50));
    console.log('✅ تم عرض جميع الإحصائيات');

  } catch (error) {
    console.error('❌ خطأ في عرض إحصائيات قاعدة البيانات:', error);
  }
}

// تشغيل السكريپت
showDatabaseStats()
  .then(() => {
    console.log('\n✅ انتهى عرض الإحصائيات');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ خطأ في تشغيل السكريپت:', error);
    process.exit(1);
  });