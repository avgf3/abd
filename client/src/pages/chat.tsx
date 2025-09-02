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
    return roomId && roomId !== 'public' && roomId !== 'friends' ? roomId : 'general';
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
          chat.connect(user);
          setShowWelcome(false);

          const roomId = session?.roomId && session.roomId !== 'public' && session.roomId !== 'friends'
            ? session.roomId
            : 'general';
          setSelectedRoomId(roomId);
          chat.joinRoom(roomId);
        })
        .catch(() => {})
        .finally(() => setIsRestoring(false));
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
    setSelectedRoomId(roomId);
    chat.joinRoom(roomId);
  };

  const handleLogout = () => {
    clearSession(); // مسح بيانات الجلسة المحفوظة
    chat.disconnect();
    setShowWelcome(true);
    setSelectedRoomId(null);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-['Cairo']" dir="rtl">
      <div className="app-shell">
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
    </div>
  );
}
