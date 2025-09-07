import { lazy, Suspense, useState, useEffect } from 'react';

const ChatInterface = lazy(() => import('@/components/chat/ChatInterface'));
const WelcomeScreen = lazy(() => import('@/components/chat/WelcomeScreen'));
// حذف المحدد المحلي للغرف لتجنب التكرار
import KickCountdown from '@/components/moderation/KickCountdown';
import { useChat } from '@/hooks/useChat';
import { clearSession, getSession, wasExplicitLogout, clearLogoutFlag, updateLastActivity } from '@/lib/socket';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser, ChatRoom } from '@/types/chat';
import RoomSelectorScreen from '@/components/chat/RoomSelectorScreen';

// Prefetch heavy modules during idle time (guarded by Save-Data)
try {
	const saveData = (navigator as any)?.connection?.saveData === true;
	const run = () => {
		if (saveData) return;
		// Panels and heavy components
		import('@/components/chat/MessagesPanel');
		import('@/components/chat/PrivateMessageBox');
		import('@/components/chat/UserSidebarWithWalls');
		import('@/components/chat/MessageArea');
		import('@/components/chat/NotificationPanel');
	};
	if (typeof window !== 'undefined') {
		if ('requestIdleCallback' in window) {
			(window as any).requestIdleCallback(run, { timeout: 3000 });
		} else {
			setTimeout(run, 2000);
		}
	}
} catch {}

export default function ChatPage() {
  // تهيئة الحالة من الجلسة بشكل متزامن لمنع وميض شاشة الترحيب عند إعادة التحميل
  const initialSession = (() => {
    try {
      return getSession();
    } catch {
      return {} as any;
    }
  })();
  
  // تحقق من تسجيل الخروج الصريح
  const wasLoggedOut = wasExplicitLogout();
  const hasSavedUser = !!(initialSession as any)?.userId && !wasLoggedOut;

  const [showWelcome, setShowWelcome] = useState(!hasSavedUser);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(() => {
    if (!hasSavedUser) return null;
    const roomId = (initialSession as any)?.roomId;
    return roomId && roomId !== 'public' && roomId !== 'friends' ? roomId : null;
  });
  const [isRestoring, setIsRestoring] = useState<boolean>(hasSavedUser);
  const [autoRestoreAttempted, setAutoRestoreAttempted] = useState<boolean>(false);
  const chat = useChat();

  // مراقبة نشاط المستخدم لتحديث وقت النشاط
  useEffect(() => {
    if (!hasSavedUser) return;

    const updateActivity = () => updateLastActivity();
    
    // أحداث النشاط
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // تحديث فوري
    updateActivity();
    
    // مراقبة الأحداث مع تقييد التكرار
    let lastUpdate = 0;
    const throttledUpdate = () => {
      const now = Date.now();
      if (now - lastUpdate > 30000) { // كل 30 ثانية كحد أقصى
        lastUpdate = now;
        updateActivity();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, throttledUpdate, { passive: true });
    });

    // تحديث دوري كل 5 دقائق
    const interval = setInterval(updateActivity, 5 * 60 * 1000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledUpdate);
      });
      clearInterval(interval);
    };
  }, [hasSavedUser]);

  // استرجاع الجلسة والغرفة بعد إعادة التحميل مع تحسينات
  useEffect(() => {
    if (autoRestoreAttempted) return; // تجنب التكرار
    setAutoRestoreAttempted(true);
    
    try {
      // مسح علامة تسجيل الخروج إذا لم تعد ذات صلة
      if (wasLoggedOut) {
        clearLogoutFlag();
        setIsRestoring(false);
        return;
      }
      
      const session = getSession();
      const savedUserId = session?.userId;
      
      if (!savedUserId) {
        console.log('📝 لا توجد جلسة محفوظة - عرض شاشة الترحيب');
        setIsRestoring(false);
        return;
      }

      console.log(`🔄 استعادة جلسة المستخدم: ${session.username} (ID: ${savedUserId})`);

      // جلب بيانات المستخدم من الخادم لضمان توافق الشكل
      apiRequest(`/api/users/${savedUserId}`)
        .then((user) => {
          if (!user || !user.id || !user.username) {
            console.warn('⚠️ بيانات المستخدم غير صحيحة من الخادم');
            clearSession(); // مسح الجلسة الفاسدة
            setShowWelcome(true);
            return;
          }
          
          console.log(`✅ تم استرجاع بيانات المستخدم: ${user.username}`);
          chat.connect(user);
          setShowWelcome(false);

          const roomId = session?.roomId && session.roomId !== 'public' && session.roomId !== 'friends'
            ? session.roomId
            : null;
            
          if (roomId) {
            console.log(`🏠 استعادة الغرفة السابقة: ${roomId}`);
            setSelectedRoomId(roomId);
            // سيتم الانضمام تلقائياً عبر useChat عند الاتصال
          } else {
            console.log('🏠 لا توجد غرفة محفوظة - عرض اختيار الغرف');
            setSelectedRoomId(null);
          }
        })
        .catch((error) => {
          console.error('❌ خطأ في استرجاع بيانات المستخدم:', error);
          // في حالة خطأ الشبكة، لا نمسح الجلسة فوراً
          // بل نعطي فرصة للمحاولة مرة أخرى
          if (error?.status === 404 || error?.status === 401) {
            clearSession(); // مسح الجلسة إذا كان المستخدم غير موجود
            setShowWelcome(true);
          }
        })
        .finally(() => setIsRestoring(false));
    } catch (error) {
      console.error('❌ خطأ في استعادة الجلسة:', error);
      setIsRestoring(false);
    }
  }, [autoRestoreAttempted, wasLoggedOut]);

  const handleUserLogin = (user: ChatUser) => {
    clearSession(); // مسح أي جلسة سابقة قبل تسجيل دخول جديد
    chat.connect(user);
    setShowWelcome(false);
    // لا ننضم لأي غرفة حتى يختار المستخدم
    setSelectedRoomId(null);
  };

  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    chat.joinRoom(roomId);
  };

  const handleLogout = () => {
    console.log('🔓 تسجيل خروج صريح');
    clearSession(true); // مسح بيانات الجلسة المحفوظة مع علامة الخروج الصريح
    chat.disconnect(true); // تمرير علامة تسجيل الخروج الصريح
    setShowWelcome(true);
    setSelectedRoomId(null);
    setAutoRestoreAttempted(false); // إعادة تعيين لإمكانية تسجيل دخول جديد
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-['Cairo'] overflow-hidden" dir="rtl" style={{ minHeight: '100dvh' }}>
      <Suspense fallback={<div className="p-6 text-center">...جاري التحميل</div>}>
        {isRestoring ? (
          <div className="p-6 text-center">...جاري استعادة الجلسة</div>
        ) : showWelcome ? (
          <WelcomeScreen onUserLogin={handleUserLogin} />
        ) : selectedRoomId ? (
          <ChatInterface chat={chat} onLogout={handleLogout} />
        ) : (
          <RoomSelectorScreen currentUser={chat.currentUser} onSelectRoom={handleSelectRoom} />
        )}
      </Suspense>

      {/* عداد الطرد */}
      <KickCountdown
        isVisible={chat.showKickCountdown || false}
        onClose={() => chat.setShowKickCountdown?.(false)}
        durationMinutes={15}
      />
    </div>
  );
}
