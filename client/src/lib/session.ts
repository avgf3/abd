/**
 * ملف تجميعي لإدارة الجلسات والاتصالات المحسن
 * يوفر واجهة موحدة لجميع عمليات إدارة الجلسة
 */

export {
  saveSession,
  getSession,
  clearSession,
  wasExplicitLogout,
  clearLogoutFlag,
  updateLastActivity,
  connectSocket,
  getSocket,
  isSocketConnected,
  forceReconnect
} from './socket';

// أنواع البيانات المهمة
export type { ChatUser } from '@/types/chat';

// دوال مساعدة إضافية
export const SESSION_CONFIG = {
  MEMBER_SESSION_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 أيام
  GUEST_SESSION_DURATION: 24 * 60 * 60 * 1000, // يوم واحد
  LOGOUT_FLAG_DURATION: 5 * 60 * 1000, // 5 دقائق
  ACTIVITY_UPDATE_THROTTLE: 30000, // 30 ثانية
  ACTIVITY_UPDATE_INTERVAL: 5 * 60 * 1000, // 5 دقائق
} as const;

/**
 * فحص صحة الجلسة الحالية
 */
export function validateCurrentSession() {
  try {
    const session = getSession();
    
    if (!session.userId || !session.username) {
      return { valid: false, reason: 'missing_user_data' };
    }

    if (wasExplicitLogout()) {
      return { valid: false, reason: 'explicit_logout' };
    }

    if (session.lastActivity) {
      const timeDiff = Date.now() - session.lastActivity;
      const maxAge = session.userType === 'guest' 
        ? SESSION_CONFIG.GUEST_SESSION_DURATION 
        : SESSION_CONFIG.MEMBER_SESSION_DURATION;
      
      if (timeDiff > maxAge) {
        return { valid: false, reason: 'session_expired' };
      }
    }

    return { valid: true, session };
  } catch (error) {
    return { valid: false, reason: 'validation_error', error };
  }
}

/**
 * إحصائيات الجلسة للتشخيص
 */
export function getSessionStats() {
  try {
    const session = getSession();
    const isConnected = isSocketConnected();
    const wasLoggedOut = wasExplicitLogout();
    
    return {
      hasSession: !!session.userId,
      userType: session.userType || 'unknown',
      username: session.username || 'unknown',
      roomId: session.roomId || 'none',
      lastActivity: session.lastActivity ? new Date(session.lastActivity).toISOString() : 'never',
      timeSinceLastActivity: session.lastActivity ? Date.now() - session.lastActivity : null,
      isSocketConnected: isConnected,
      wasExplicitLogout: wasLoggedOut,
      sessionAge: session.lastActivity ? Date.now() - session.lastActivity : null,
    };
  } catch (error) {
    return { error: 'failed_to_get_stats', details: error };
  }
}

// إتاحة الوصول من وحدة التحكم للتشخيص
if (typeof window !== 'undefined') {
  (window as any).chatSession = {
    validate: validateCurrentSession,
    stats: getSessionStats,
    clear: () => clearSession(true),
    reconnect: forceReconnect,
    isConnected: isSocketConnected,
  };
  
  // إضافة معلومات إضافية للتشخيص
  console.log('🔧 أدوات تشخيص الجلسة متاحة في: window.chatSession');
}