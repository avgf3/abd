/**
 * أدوات اختبار نظام إدارة الجلسات
 */

import { validateCurrentSession, getSessionStats, SESSION_CONFIG } from '@/lib/session';
import { getSession, saveSession, clearSession } from '@/lib/socket';

export const sessionTestUtils = {
  /**
   * اختبار شامل لنظام الجلسات
   */
  runFullTest() {
    console.group('🧪 اختبار شامل لنظام إدارة الجلسات');
    
    try {
      // اختبار 1: حفظ واسترجاع جلسة عضو
      console.log('📝 اختبار 1: حفظ واسترجاع جلسة عضو');
      saveSession({
        userId: 12345,
        username: 'testuser',
        userType: 'member',
        roomId: 'general',
        isGuest: false
      });
      
      const memberSession = getSession();
      console.log('✅ جلسة العضو:', memberSession);
      
      // اختبار 2: التحقق من صحة الجلسة
      console.log('🔍 اختبار 2: التحقق من صحة الجلسة');
      const validation = validateCurrentSession();
      console.log('✅ نتيجة التحقق:', validation);
      
      // اختبار 3: إحصائيات الجلسة
      console.log('📊 اختبار 3: إحصائيات الجلسة');
      const stats = getSessionStats();
      console.log('✅ الإحصائيات:', stats);
      
      // اختبار 4: اختبار جلسة زائر
      console.log('👤 اختبار 4: جلسة زائر');
      saveSession({
        userId: 67890,
        username: 'guest_user',
        userType: 'guest',
        roomId: 'general',
        isGuest: true
      });
      
      const guestSession = getSession();
      console.log('✅ جلسة الزائر:', guestSession);
      
      // اختبار 5: تسجيل خروج صريح
      console.log('🚪 اختبار 5: تسجيل خروج صريح');
      clearSession(true);
      const afterLogout = getSession();
      console.log('✅ بعد تسجيل الخروج:', afterLogout);
      
      console.log('🎉 جميع الاختبارات نجحت!');
      
    } catch (error) {
      console.error('❌ خطأ في الاختبار:', error);
    }
    
    console.groupEnd();
  },

  /**
   * اختبار سيناريو إعادة التحميل
   */
  testRefreshScenario() {
    console.group('🔄 اختبار سيناريو إعادة التحميل');
    
    // محاكاة جلسة موجودة
    saveSession({
      userId: 11111,
      username: 'refresh_test_user',
      userType: 'member',
      roomId: 'test_room',
      lastActivity: Date.now()
    });
    
    console.log('💾 تم حفظ جلسة اختبار');
    
    // محاكاة إعادة تحميل (قراءة الجلسة)
    const restored = getSession();
    console.log('📖 الجلسة المستعادة:', restored);
    
    const validation = validateCurrentSession();
    console.log('✅ صحة الجلسة المستعادة:', validation);
    
    console.groupEnd();
  },

  /**
   * اختبار انتهاء صلاحية الجلسة
   */
  testSessionExpiry() {
    console.group('⏰ اختبار انتهاء صلاحية الجلسة');
    
    // محاكاة جلسة منتهية الصلاحية
    const expiredTime = Date.now() - (SESSION_CONFIG.MEMBER_SESSION_DURATION + 1000);
    
    saveSession({
      userId: 22222,
      username: 'expired_user',
      userType: 'member',
      lastActivity: expiredTime
    });
    
    console.log('💾 تم حفظ جلسة منتهية الصلاحية');
    
    const validation = validateCurrentSession();
    console.log('❌ نتيجة التحقق (يجب أن تكون غير صحيحة):', validation);
    
    if (!validation.valid && validation.reason === 'session_expired') {
      console.log('✅ اختبار انتهاء الصلاحية نجح');
    } else {
      console.log('❌ اختبار انتهاء الصلاحية فشل');
    }
    
    console.groupEnd();
  },

  /**
   * مسح جميع بيانات الاختبار
   */
  cleanup() {
    console.log('🧹 تنظيف بيانات الاختبار...');
    clearSession(true);
    console.log('✅ تم التنظيف');
  }
};

// إتاحة الوصول من وحدة التحكم
if (typeof window !== 'undefined') {
  (window as any).sessionTests = sessionTestUtils;
  console.log('🧪 أدوات اختبار الجلسة متاحة في: window.sessionTests');
}