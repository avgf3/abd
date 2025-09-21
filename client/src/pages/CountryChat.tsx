import { lazy, Suspense, useState, useEffect } from 'react';
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

  if (!countryData) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الدولة غير موجودة</h2>
          <p className="text-gray-600 mb-4">
            عذراً، لم نتمكن من العثور على بيانات هذه الدولة.
          </p>
          
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-['Cairo'] overflow-hidden" dir="rtl" style={{ minHeight: '100dvh' }}>
      <Suspense fallback={
        <div className="min-h-[100dvh] bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-xl shadow-lg">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">جاري التحميل...</h2>
            <p className="text-gray-600">يرجى الانتظار قليلاً</p>
          </div>
        </div>
      }>
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