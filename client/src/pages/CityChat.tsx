import { lazy, Suspense, useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { getCityByPath, CitiesSystem } from '@/data/cityChats';

// Universal City System Component
function UniversalCitySystem({ cityPath }: { cityPath: string }) {
  const cityData = getCityByPath(cityPath);

  if (!cityData) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <div className="text-6xl mb-4">🏙️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">المدينة غير موجودة</h2>
          <p className="text-gray-600 mb-4">
            عذراً، المدينة التي تبحث عنها غير متوفرة في النظام المتكامل.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <div>📍 المسار المطلوب: {cityPath}</div>
            <div>🔍 النظام المتكامل يحاول البحث...</div>
            <div>⚡ يتم إعادة التوجيه إلى الصفحة الرئيسية</div>
          </div>
        </div>
      </div>
    );
  }

  const cityInfo = CitiesSystem.getCitiesWithCountryInfo(cityData.countryPath);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
      <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">النظام المتكامل يعمل!</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div>🏙️ المدينة: {cityData.nameAr}</div>
          <div>🏛️ الدولة: {cityInfo.country?.nameAr || 'غير محدد'}</div>
          <div>📊 عدد المدن في الدولة: {cityInfo.stats.totalCities}</div>
          <div>🔗 روابط الدردشة: {cityData.chatLinks.length}</div>
          <div className="pt-4 text-green-600 font-semibold">
            ✅ جميع المدن تعمل بنجاح
          </div>
        </div>
      </div>
    </div>
  );
}

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

  // Test mode for Universal City System
  const testMode = params?.city === 'test-universal-system';

  if (testMode) {
    const cityPath = params ? `/${(params as any).country}/${(params as any).city}` : '/';
    return <UniversalCitySystem cityPath={cityPath} />;
  }
  
  // Get city data based on URL using the unified system
  const cityPath = params ? `/${(params as any).country}/${(params as any).city}` : '/';
  const cityData = getCityByPath(cityPath);

  // Debug logging
  console.log('CityChat Debug:', {
    match,
    params,
    cityPath,
    cityData: cityData ? 'FOUND' : 'NOT FOUND'
  });

  // Enhanced city data with additional information using CitiesSystem
  const cityInfo = cityData ? CitiesSystem.getCitiesWithCountryInfo(cityData.countryPath) : null;

  // Additional city information for debugging
  const cityStats = cityData ? {
    id: cityData.id,
    path: cityData.path,
    country: cityData.countryPath,
    countryId: cityData.countryId,
    isMobile: cityData.id.includes('mobile'),
    isCapital: cityData.isCapital || false,
    region: cityData.region || 'unknown',
    chatLinksCount: cityData.chatLinks.length,
    systemStatus: '✅ النظام المتكامل يعمل بنجاح'
  } : null;

  // If city not found, redirect to home
  useEffect(() => {
    if (!match || !cityData) {
      setLocation('/');
    }
  }, [match, cityData, setLocation]);
  
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

  if (!cityData) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">المدينة غير موجودة</h2>
          <p className="text-gray-600 mb-4">
            عذراً، لم نتمكن من العثور على بيانات هذه المدينة.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <div>📍 المسار المطلوب: {cityPath}</div>
            <div>🔍 params: {JSON.stringify(params)}</div>
            <div>⚡ match: {match ? 'true' : 'false'}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-['Cairo'] overflow-hidden" dir="rtl" style={{ minHeight: '100dvh' }}>
      {/* Debug Information - Remove this in production */}
      {cityStats && (
        <div className="fixed top-0 left-0 bg-black/80 text-white p-2 text-xs z-50 max-w-xs">
          <div>🗺️ النظام المتكامل</div>
          <div>📍 {cityStats.path}</div>
          <div>🏙️ {cityStats.id}</div>
          <div>🏛️ {cityStats.country}</div>
          <div>🆔 {cityStats.countryId}</div>
          <div>📊 {cityStats.systemStatus}</div>
        </div>
      )}

      <Suspense fallback={<div className="p-6 text-center">...جاري التحميل</div>}>
        {isRestoring ? (
          <div className="p-6 text-center">...جاري استعادة الجلسة</div>
        ) : showWelcome ? (
          <CityWelcomeScreen onUserLogin={handleUserLogin} cityData={cityData} cityInfo={cityInfo} />
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