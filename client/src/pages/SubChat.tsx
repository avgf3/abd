import { lazy, Suspense, useState, useEffect } from 'react';
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
  const [isRestoring, setIsRestoring] = useState<boolean>(hasSavedUser);
  const chat = useChat();

  // Restore session after reload
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
          setSelectedRoomId(roomId);
          chat.joinRoom(roomId);
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
      <Suspense fallback={<div className="p-6 text-center">...جاري التحميل</div>}>
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