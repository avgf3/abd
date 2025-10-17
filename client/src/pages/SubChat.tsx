import { lazy, useState, useEffect, Suspense } from 'react';
import { useRoute, useLocation } from 'wouter';
import { getSubChatByPath } from '@/data/subChats';

const ChatInterface = lazy(() => import('@/components/chat/ChatInterface'));
const SubChatWelcomeScreen = lazy(() => import('@/components/chat/SubChatWelcomeScreen'));
const RoomSelectorScreen = lazy(() => import('@/components/chat/RoomSelectorScreen'));
import KickCountdown from '@/components/moderation/KickCountdown';
import { useChat } from '@/hooks/useChat';
import { clearSession, getSession } from '@/lib/socket';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

export default function SubChat() {
  const [match, params] = useRoute('/:subChat/:chatType');
  const [, setLocation] = useLocation();

  // Get sub-chat data based on URL
  const subChatPath = params ? `/${(params as any).subChat}/${(params as any).chatType}` : '/';
  const subChatData = getSubChatByPath(subChatPath);

  // If sub-chat not found, redirect to home
  useEffect(() => {
    if (!match || !subChatData) {
      setLocation('/');
    }
  }, [match, subChatData, setLocation]);

  // Initialize session state
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

  // Restore session after reload
  useEffect(() => {
    const session = getSession();
    const savedUserId = session?.userId;
    const roomId = session?.roomId && session.roomId !== 'public' && session.roomId !== 'friends'
      ? session.roomId
      : null;

    if (savedUserId) {
      chat.connect({ id: savedUserId, username: session?.username || `User#${savedUserId}`, userType: session?.userType || 'member', isOnline: true, role: 'member' } as any);
      setShowWelcome(false);
      if (roomId) {
        setSelectedRoomId(roomId);
        // الانضمام سيتم مركزياً بعد المصادقة من خلال useChat (authenticated)
      } else {
        setSelectedRoomId(null);
      }
    }

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
              // الانضمام سيتم مركزياً بعد المصادقة من خلال useChat (authenticated)
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
    clearSession();
    chat.connect(user);
    setShowWelcome(false);
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

    clearSession();
    chat.disconnect();
    setShowWelcome(true);
    setSelectedRoomId(null);
  };

  if (!subChatData) {
    return null;
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-['Cairo'] overflow-hidden" dir="rtl" style={{ minHeight: '100dvh' }}>
      <Suspense fallback={null}>
        {isRestoring ? (
          <div className="p-6 text-center">...جاري استعادة الجلسة</div>
        ) : showWelcome ? (
          <SubChatWelcomeScreen onUserLogin={handleUserLogin} subChatData={subChatData} />
        ) : selectedRoomId ? (
          <ChatInterface chat={chat} onLogout={handleLogout} />
        ) : (
          <RoomSelectorScreen currentUser={chat.currentUser} onSelectRoom={handleSelectRoom} />
        )}
      </Suspense>

      {/* Kick countdown */}
      <KickCountdown
        isVisible={chat.showKickCountdown || false}
        onClose={() => chat.setShowKickCountdown?.(false)}
        durationMinutes={15}
      />
    </div>
  );
}