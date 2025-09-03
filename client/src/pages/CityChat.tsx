import { lazy, Suspense, useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { getCityByPath } from '@/data/cityChats';

const ChatInterface = lazy(() => import('@/components/chat/ChatInterface'));
const CityWelcomeScreen = lazy(() => import('@/components/chat/CityWelcomeScreen'));
const RoomSelectorScreen = lazy(() => import('@/components/chat/RoomSelectorScreen'));
import KickCountdown from '@/components/moderation/KickCountdown';
import { useChat } from '@/hooks/useChat';
import { clearSession, getSession } from '@/lib/socket';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

export default function CityChat() {
  const [match, params] = useRoute('/:country/:city');
  const [, setLocation] = useLocation();
  
  // Get city data based on URL
  const cityPath = `/${params?.country}/${params?.city}`;
  const cityData = getCityByPath(cityPath);
  
  // If city not found, redirect to country or home
  useEffect(() => {
    if (!match || !cityData) {
      // Try to redirect to country page if it exists
      if (params?.country) {
        setLocation(`/${params.country}`);
      } else {
        setLocation('/');
      }
    }
  }, [match, cityData, setLocation, params?.country]);
  
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
    return roomId && roomId !== 'public' && roomId !== 'friends' ? roomId : 'general';
  });
  const [isRestoring, setIsRestoring] = useState<boolean>(hasSavedUser);
  const chat = useChat();

  // Restore session after reload
  useEffect(() => {
    try {
      const session = getSession();
      const savedUserId = session?.userId;
      if (!savedUserId) {
        setIsRestoring(false);
        return;
      }

      // Fetch user data from server
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
    clearSession();
    chat.connect(user);
    setShowWelcome(false);
    setSelectedRoomId(null);
  };

  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    chat.joinRoom(roomId);
  };

  const handleLogout = () => {
    clearSession();
    chat.disconnect();
    setShowWelcome(true);
    setSelectedRoomId(null);
  };

  if (!cityData) {
    return null;
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-['Cairo']" dir="rtl">
      <Suspense fallback={<div className="p-6 text-center">...جاري التحميل</div>}>
        {isRestoring ? (
          <div className="p-6 text-center">...جاري استعادة الجلسة</div>
        ) : showWelcome ? (
          <CityWelcomeScreen onUserLogin={handleUserLogin} cityData={cityData} />
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