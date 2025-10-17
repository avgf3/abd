import { lazy, useState, useEffect, Suspense } from 'react';
import { useRoute, useLocation } from 'wouter';
import { getCountryByPath } from '@/data/countryChats';

const ChatInterface = lazy(() => import('@/components/chat/ChatInterface'));
const CountryWelcomeScreen = lazy(() => import('@/components/chat/CountryWelcomeScreen'));
const RoomSelectorScreen = lazy(() => import('@/components/chat/RoomSelectorScreen'));
import KickCountdown from '@/components/moderation/KickCountdown';
import { useChat } from '@/hooks/useChat';
import { clearSession, getSession } from '@/lib/socket';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

export default function CountryChat() {
  const [match, params] = useRoute('/:country');
  const [, setLocation] = useLocation();
  
  // Get country data based on URL
  const countryPath = params ? `/${(params as any).country || ''}` : '/';
  const countryData = getCountryByPath(countryPath);
  
  // If country not found, redirect to home
  useEffect(() => {
    if (!match || !countryData) {
      setLocation('/');
    }
  }, [match, countryData, setLocation]);
  
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

  if (!countryData) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الدولة غير موجودة</h2>
          <p className="text-gray-600 mb-4">
            عذراً، لم نتمكن من العثور على بيانات هذه الدولة.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <div>📍 المسار المطلوب: {countryPath}</div>
            <div>🔍 params: {JSON.stringify(params)}</div>
            <div>⚡ match: {match ? 'true' : 'false'}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-['Cairo'] overflow-hidden" dir="rtl" style={{ minHeight: '100dvh' }}>
      <Suspense fallback={null}>
        {isRestoring ? (
          <div className="p-6 text-center">...جاري استعادة الجلسة</div>
        ) : showWelcome ? (
          <CountryWelcomeScreen onUserLogin={handleUserLogin} countryData={countryData} />
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