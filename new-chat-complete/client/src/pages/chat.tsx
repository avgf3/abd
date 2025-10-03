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
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const chat = useChat();

  // استرجاع الجلسة والغرفة بعد إعادة التحميل: ابدأ محلياً فوراً ثم حدث الخلفية
  useEffect(() => {
    const session = getSession();
    const savedUserId = session?.userId;
    const roomId = session?.roomId && session.roomId !== 'public' && session.roomId !== 'friends'
      ? session.roomId
      : null;

    // تشغيل فوري من التخزين المحلي لتجنب وميض "جاري استعادة الجلسة"
    if (savedUserId) {
      // وصل السوكت بحساب مخزن مؤقتاً (سنحدّث البيانات لاحقاً من الخادم)
      // ملاحظة: connect هنا لا يرسل joinRoom — الانضمام يتم بعد authenticated داخل useChat
      chat.connect({ id: savedUserId, username: session?.username || `User#${savedUserId}`, userType: session?.userType || 'member', isOnline: true, role: 'member' } as any);
      setShowWelcome(false);
      if (roomId) {
        setSelectedRoomId(roomId);
        // لا نستدعي joinRoom هنا لتجنب التكرار — سيتم بعد authenticated
      } else {
        setSelectedRoomId(null);
      }
    }

    // تحديث الخلفية من الخادم أو كوكي
    (async () => {
      try {
        if (savedUserId) {
          const user = await apiRequest(`/api/users/${savedUserId}`);
          if (user?.id) {
            chat.connect(user);
          }
        } else {
          const data = await apiRequest('/api/auth/session');
          if (data?.user) {
            chat.connect(data.user);
            setShowWelcome(false);
            const r = session?.roomId && session.roomId !== 'public' && session.roomId !== 'friends' ? session.roomId : null;
            if (r) {
              setSelectedRoomId(r);
              // الانضمام سيتم تلقائياً بعد authenticated
            }
          } else {
            setShowWelcome(true);
          }
        }
      } catch {
        if (!savedUserId) setShowWelcome(true);
      }
    })();
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
      <Suspense fallback={null}>
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
