const { calculateLevel, calculateLevelProgress } = require('./shared/points-system');

async function fixAllUserLevels() {
  try {
    console.log('🔄 بدء إصلاح مستويات جميع المستخدمين...');
    
    // استيراد قاعدة البيانات
    const { storage } = await import('./server/storage.js');
    
    // جلب جميع المستخدمين
    const allUsers = await storage.getAllUsers();
    
    let fixedCount = 0;
    let totalCount = allUsers.length;
    
    console.log(`📊 وجدت ${totalCount} مستخدم للفحص...`);
    
    for (const user of allUsers) {
      const totalPoints = user.totalPoints || 0;
      const correctLevel = calculateLevel(totalPoints);
      const correctLevelProgress = calculateLevelProgress(totalPoints);
      
      // التحقق إذا كان المستوى غير صحيح
      if (user.level !== correctLevel || user.levelProgress !== correctLevelProgress) {
        console.log(`🔧 إصلاح مستوى ${user.username}: المستوى ${user.level} → ${correctLevel} (${totalPoints} نقطة)`);
        
        await storage.updateUserPoints(user.id, {
          level: correctLevel,
          levelProgress: correctLevelProgress
        });
        
        fixedCount++;
      }
    }
    
    console.log(`✅ تم إصلاح ${fixedCount} من أصل ${totalCount} مستخدم`);
    console.log('🎉 اكتمل إصلاح المستويات!');
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح المستويات:', error);
  }
}

// تشغيل السكريطت
if (require.main === module) {
  fixAllUserLevels().then(() => process.exit(0));
}

module.exports = { fixAllUserLevels };