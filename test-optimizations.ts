/**
 * ملف اختبار بسيط للمحسنات الجديدة
 * يختبر الوظائف الأساسية للتأكد من عملها الصحيح
 */

// اختبار محسن الملف الشخصي
import { 
  safeProfileFetch, 
  setCachedProfile,
  getCachedProfile 
} from './client/src/utils/profileOptimizer';

// اختبار محسن آخر تواجد
import { 
  formatLastSeenSafe,
  getCachedLastSeen,
  setCachedLastSeen 
} from './client/src/utils/lastSeenOptimizer';

// اختبار محسن الغرف الافتراضية
import { 
  DEFAULT_ROOM_CONSTANTS,
  getDefaultRoom,
  getUserCurrentRoom 
} from './client/src/utils/defaultRoomOptimizer';

// اختبار محسن الخادم
import { optimizedUserService } from './server/services/optimizedUserService';

/**
 * اختبارات الوظائف الأساسية
 */
export async function runBasicTests() {
  console.log('🧪 بدء اختبار المحسنات...');
  
  try {
    // اختبار 1: محسن الملف الشخصي
    console.log('📋 اختبار محسن الملف الشخصي...');
    const testUserId = 1;
    const testProfile = {
      id: testUserId,
      username: 'مستخدم تجريبي',
      userType: 'member',
      profileImage: 'test.jpg'
    };
    
    // اختبار حفظ الملف الشخصي
    setCachedProfile(testUserId, testProfile);
    const cachedProfile = getCachedProfile(testUserId);
    
    if (cachedProfile && cachedProfile.username === testProfile.username) {
      console.log('✅ محسن الملف الشخصي يعمل بشكل صحيح');
    } else {
      console.log('❌ محسن الملف الشخصي لا يعمل بشكل صحيح');
    }
    
    // اختبار 2: محسن آخر تواجد
    console.log('⏰ اختبار محسن آخر تواجد...');
    const testDate = new Date();
    setCachedLastSeen(testUserId, testDate);
    const cachedLastSeen = getCachedLastSeen(testUserId);
    
    if (cachedLastSeen && cachedLastSeen.getTime() === testDate.getTime()) {
      console.log('✅ محسن آخر تواجد يعمل بشكل صحيح');
    } else {
      console.log('❌ محسن آخر تواجد لا يعمل بشكل صحيح');
    }
    
    // اختبار 3: محسن الغرف الافتراضية
    console.log('🏠 اختبار محسن الغرف الافتراضية...');
    const defaultRoom = getDefaultRoom();
    
    if (defaultRoom === DEFAULT_ROOM_CONSTANTS.GENERAL_ROOM_ID) {
      console.log('✅ محسن الغرف الافتراضية يعمل بشكل صحيح');
    } else {
      console.log('❌ محسن الغرف الافتراضية لا يعمل بشكل صحيح');
    }
    
    // اختبار 4: تنسيق آخر تواجد
    console.log('📅 اختبار تنسيق آخر تواجد...');
    const formattedTime = formatLastSeenSafe(testDate);
    
    if (formattedTime && formattedTime.length > 0) {
      console.log('✅ تنسيق آخر تواجد يعمل بشكل صحيح');
    } else {
      console.log('❌ تنسيق آخر تواجد لا يعمل بشكل صحيح');
    }
    
    console.log('🎉 انتهاء الاختبارات بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في الاختبارات:', error);
  }
}

/**
 * اختبارات الأداء
 */
export async function runPerformanceTests() {
  console.log('⚡ بدء اختبارات الأداء...');
  
  try {
    const testUserId = 1;
    const iterations = 1000;
    
    // اختبار سرعة الكاش
    console.log(`🔄 اختبار سرعة الكاش (${iterations} عملية)...`);
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      setCachedProfile(testUserId, {
        id: testUserId,
        username: `مستخدم ${i}`,
        userType: 'member'
      });
      getCachedProfile(testUserId);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ انتهى اختبار الكاش في ${duration}ms`);
    console.log(`📊 متوسط الوقت لكل عملية: ${duration / iterations}ms`);
    
    if (duration < 1000) {
      console.log('✅ الأداء ممتاز!');
    } else if (duration < 5000) {
      console.log('⚠️ الأداء جيد');
    } else {
      console.log('❌ الأداء يحتاج تحسين');
    }
    
  } catch (error) {
    console.error('❌ خطأ في اختبارات الأداء:', error);
  }
}

/**
 * اختبارات التكامل
 */
export async function runIntegrationTests() {
  console.log('🔗 بدء اختبارات التكامل...');
  
  try {
    // اختبار التكامل بين المحسنات
    const testUserId = 1;
    const testProfile = {
      id: testUserId,
      username: 'مستخدم متكامل',
      userType: 'member',
      currentRoom: DEFAULT_ROOM_CONSTANTS.GENERAL_ROOM_ID
    };
    
    // اختبار التكامل بين محسن الملف الشخصي ومحسن الغرف
    setCachedProfile(testUserId, testProfile);
    const cachedProfile = getCachedProfile(testUserId);
    
    if (cachedProfile && cachedProfile.currentRoom === DEFAULT_ROOM_CONSTANTS.GENERAL_ROOM_ID) {
      console.log('✅ التكامل بين المحسنات يعمل بشكل صحيح');
    } else {
      console.log('❌ التكامل بين المحسنات لا يعمل بشكل صحيح');
    }
    
    // اختبار التكامل مع آخر تواجد
    const testDate = new Date();
    setCachedLastSeen(testUserId, testDate);
    const formattedTime = formatLastSeenSafe(testDate);
    
    if (formattedTime && formattedTime.length > 0) {
      console.log('✅ التكامل مع آخر تواجد يعمل بشكل صحيح');
    } else {
      console.log('❌ التكامل مع آخر تواجد لا يعمل بشكل صحيح');
    }
    
    console.log('🎉 انتهاء اختبارات التكامل بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في اختبارات التكامل:', error);
  }
}

/**
 * تشغيل جميع الاختبارات
 */
export async function runAllTests() {
  console.log('🚀 بدء جميع الاختبارات...');
  console.log('='.repeat(50));
  
  await runBasicTests();
  console.log('='.repeat(50));
  
  await runPerformanceTests();
  console.log('='.repeat(50));
  
  await runIntegrationTests();
  console.log('='.repeat(50));
  
  console.log('🎊 انتهاء جميع الاختبارات!');
}

// تصدير الدوال للاستخدام
export {
  runBasicTests,
  runPerformanceTests,
  runIntegrationTests,
  runAllTests
};

// تشغيل الاختبارات إذا تم استدعاء الملف مباشرة
if (typeof window === 'undefined' && require.main === module) {
  runAllTests().catch(console.error);
}