import { lazy, Suspense, useState, useEffect } from 'react';

const ChatInterface = lazy(() => import('@/components/chat/ChatInterface'));
const WelcomeScreen = lazy(() => import('@/components/chat/WelcomeScreen'));
// حذف المحدد المحلي للغرف لتجنب التكرار
import KickCountdown from '@/components/moderation/KickCountdown';
import { useChat } from '@/hooks/useChat';
import { clearSession, getSession } from '@/lib/socket';
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
  const hasSavedUser = !!(initialSession as any)?.userId;

  const [showWelcome, setShowWelcome] = useState(!hasSavedUser);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(() => {
    if (!hasSavedUser) return null;
    const roomId = (initialSession as any)?.roomId;
    return roomId && roomId !== 'public' && roomId !== 'friends' ? roomId : null;
  });
  const [isRestoring, setIsRestoring] = useState<boolean>(hasSavedUser);
  const [isJoiningRoom, setIsJoiningRoom] = useState<boolean>(false);
  const chat = useChat();

  // استرجاع الجلسة والغرفة بعد إعادة التحميل
  useEffect(() => {
    try {
      const session = getSession();
      const savedUserId = session?.userId;
      const proceedWithUser = (user: any) => {
        if (!user || !user.id || !user.username) return;
        chat.connect(user);
        setShowWelcome(false);
        const roomId = session?.roomId && session.roomId !== 'public' && session.roomId !== 'friends'
          ? session.roomId
          : null;
        if (roomId) {
          setIsJoiningRoom(true);
          setSelectedRoomId(roomId);
          chat.joinRoom(roomId);
          // إزالة حالة التحميل بعد فترة قصيرة
          setTimeout(() => {
            setIsJoiningRoom(false);
          }, 1200);
        } else {
          setSelectedRoomId(null);
        }
      };

      if (savedUserId) {
        apiRequest(`/api/users/${savedUserId}`)
          .then(proceedWithUser)
          .catch(() => {})
          .finally(() => setIsRestoring(false));
      } else {
        // لا توجد جلسة محفوظة، جرّب استرجاعها من الكوكي عبر الخادم
        apiRequest('/api/auth/session')
          .then((data: any) => {
            if (data?.user) {
              proceedWithUser(data.user);
            } else {
              setShowWelcome(true);
            }
          })
          .catch(() => setShowWelcome(true))
          .finally(() => setIsRestoring(false));
      }
    } catch {
      setIsRestoring(false);
    }
  }, []);

  const handleUserLogin = (user: ChatUser) => {
    clearSession(); // مسح أي جلسة سابقة قبل تسجيل دخول جديد
    chat.connect(user);
    setShowWelcome(false);
    // لا ننضم لأي غرفة حتى يختار المستخدم
    setSelectedRoomId(null);
  };

  const handleSelectRoom = (roomId: string) => {
    setIsJoiningRoom(true);
    setSelectedRoomId(roomId);
    chat.joinRoom(roomId);
    
    // إزالة حالة التحميل بعد فترة قصيرة للسماح للمكونات بالتحميل
    setTimeout(() => {
      setIsJoiningRoom(false);
    }, 1000);
  };

  const handleLogout = async () => {
    try {
      // استدعاء API تسجيل الخروج لمسح الكوكي من الخادم
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
      // نكمل عملية الخروج حتى لو فشل الطلب
    }
    
    clearSession(); // مسح بيانات الجلسة المحفوظة
    chat.disconnect();
    setShowWelcome(true);
    setSelectedRoomId(null);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-['Cairo'] overflow-hidden" dir="rtl" style={{ minHeight: '100dvh' }}>
      <Suspense fallback={
        <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
            <div className="text-lg font-medium">جاري تحميل الدردشة...</div>
            <div className="text-sm text-muted-foreground">يرجى الانتظار قليلاً</div>
          </div>
        </div>
      }>
        {isRestoring ? (
          <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="animate-pulse rounded-full h-12 w-12 bg-primary/20 mx-auto"></div>
              <div className="text-lg font-medium">جاري استعادة الجلسة...</div>
              <div className="text-sm text-muted-foreground">استرجاع بياناتك السابقة</div>
            </div>
          </div>
        ) : showWelcome ? (
          <WelcomeScreen onUserLogin={handleUserLogin} />
        ) : isJoiningRoom ? (
          <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
              <div className="text-lg font-medium">جاري الدخول إلى الغرفة...</div>
              <div className="text-sm text-muted-foreground">تحضير الدردشة</div>
            </div>
          </div>
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
