import { lazy, Suspense, useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';

const ChatInterface = lazy(() => import('@/components/chat/ChatInterface'));
const WelcomeScreen = lazy(() => import('@/components/chat/WelcomeScreen'));
// حذف المحدد المحلي للغرف لتجنب التكرار
import KickCountdown from '@/components/moderation/KickCountdown';
import { useChat } from '@/hooks/useChat';
import { clearSession, getSession, saveSession } from '@/lib/socket';
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
  const [matchRoom, params] = useRoute('/r/:roomId');
  const [, setLocation] = useLocation();
  const routeRoomId = matchRoom ? (params as any)?.roomId : undefined;
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
    const roomId = (routeRoomId as string) || (initialSession as any)?.roomId;
    // إذا كان هناك roomId محفوظ، نستخدمه بدون تحويل للغرفة العامة
    return roomId || null;
  });
  const [isRestoring, setIsRestoring] = useState<boolean>(hasSavedUser);
  const chat = useChat();

  // استرجاع الجلسة والغرفة بعد إعادة التحميل
  useEffect(() => {
    try {
      const session = getSession();
      const savedUserId = session?.userId;
      if (!savedUserId) {
        setIsRestoring(false);
        return;
      }

      // جلب بيانات المستخدم من الخادم لضمان توافق الشكل
      apiRequest(`/api/users/${savedUserId}`)
        .then((user) => {
          if (!user || !user.id || !user.username) return;
          // إن وُجد roomId في المسار، خزّنه لضمان مزامنة socket الأولى
          if (routeRoomId) {
            try { saveSession({ roomId: routeRoomId }); } catch {}
          }
          chat.connect(user);
          setShowWelcome(false);

          // أولوية المسار ثم الجلسة
          const targetRoom = (routeRoomId as string) || session?.roomId;
          if (targetRoom) {
            setSelectedRoomId(targetRoom);
            chat.joinRoom(targetRoom);
          } else {
            // إذا لم يكن هناك roomId محفوظ، نعرض شاشة اختيار الغرف
            setSelectedRoomId(null);
          }
        })
        .catch(() => {})
        .finally(() => setIsRestoring(false));
    } catch {
      setIsRestoring(false);
    }
  }, [routeRoomId]);

  const handleUserLogin = (user: ChatUser) => {
    clearSession(); // مسح أي جلسة سابقة قبل تسجيل دخول جديد
    if (routeRoomId) {
      try { saveSession({ roomId: routeRoomId as string }); } catch {}
    }
    chat.connect(user);
    setShowWelcome(false);
    // الانضمام للغرفة من رابط مباشر إن وجدت، وإلا الانتظار حتى يختار المستخدم
    if (routeRoomId) {
      setSelectedRoomId(routeRoomId as string);
      chat.joinRoom(routeRoomId as string);
    } else {
      setSelectedRoomId(null);
    }
  };

  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setLocation(`/r/${roomId}`);
    chat.joinRoom(roomId);
  };

  // مزامنة عنوان URL مع الغرفة الحالية المؤكدة من الخادم
  useEffect(() => {
    if (chat.currentRoomId) {
      setLocation(`/r/${chat.currentRoomId}`);
    }
  }, [chat.currentRoomId]);

  const handleLogout = () => {
    clearSession(); // مسح بيانات الجلسة المحفوظة
    chat.disconnect();
    setShowWelcome(true);
    setSelectedRoomId(null);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-['Cairo']" dir="rtl">
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
