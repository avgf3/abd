import { lazy, useState, useEffect, Suspense } from 'react';
import { useRoute, useLocation } from 'wouter';
import { getCityByPath, CitiesSystem, getAllCities, getCitiesByCountry } from '@/data/cityChats';

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

  // Enhanced debug logging
  // Test mode for Universal City System
  const testMode = params && 'city' in params && (params as any).city === 'test-universal-system';

  if (testMode && params) {
    const cityPath = `/${(params as any).country}/${(params as any).city}`;
    return <UniversalCitySystem cityPath={cityPath} />;
  }
  
  // Get city data based on URL using the unified system
  let cityPath = '/';

  if (params && typeof params === 'object' && 'country' in params && 'city' in params) {
    cityPath = `/${(params as any).country}/${(params as any).city}`;
  } else if (params && typeof params === 'object' && 0 in params && 1 in params) {
    // Fallback for array-style params
    cityPath = `/${(params as any)[0]}/${(params as any)[1]}`;
  }

  const cityData = getCityByPath(cityPath);

  // Enhanced debug logging
  // Import getAllCities for debugging - Remove this problematic async import
  // import('@/data/cityChats').then(module => {
  //   const { getAllCities } = module;
  //   // First 5 cities
  //   // }).catch(err => // Enhanced city data with additional information using CitiesSystem
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
            <div>📊 عدد المدن المتاحة: {getAllCities().length}</div>
            <div>🔍 هل المدينة موجودة في البيانات: {getAllCities().some(c => c.path === cityPath) ? 'نعم' : 'لا'}</div>
            <div>🏛️ الدولة: {params && 'country' in params ? (params as any).country : 'غير محدد'}</div>
            <div>🏙️ عدد المدن في هذه الدولة: {getCitiesByCountry(params && 'country' in params ? (params as any).country : '').length}</div>
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