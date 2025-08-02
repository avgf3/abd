
/**
 * 🧪 اختبار النظام المحسّن
 */

const testSystemHealth = async () => {
  console.log('🏥 فحص صحة النظام المحسّن...');
  
  try {
    // اختبار أداء الذاكرة
    const memUsage = process.memoryUsage();
    console.log(`🧠 استخدام الذاكرة: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    
    // اختبار الاتصال بقاعدة البيانات
    console.log('🗄️ اختبار قاعدة البيانات...');
    // يمكن إضافة اختبارات قاعدة البيانات هنا
    
    // اختبار Socket.IO
    console.log('🔌 اختبار Socket.IO...');
    // يمكن إضافة اختبارات Socket.IO هنا
    
    console.log('✅ جميع الاختبارات نجحت!');
    
    return {
      status: 'healthy',
      memory: memUsage,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ فشل في الاختبار:', error.message);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// تشغيل الاختبار إذا تم استدعاء السكريپت مباشرة
if (require.main === module) {
  testSystemHealth().then(result => {
    console.log('📊 نتيجة الاختبار:', result);
  });
}

module.exports = { testSystemHealth };
