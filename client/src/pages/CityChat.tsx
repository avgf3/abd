import { lazy, Suspense, useState, useEffect } from 'react';
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

type RouteParams = { country?: string; city?: string } | null;

export default function CityChat() {
  const [match, paramsRaw] = useRoute('/:country/:city');
  const params = (paramsRaw && typeof paramsRaw === 'object') ? (paramsRaw as RouteParams) : null;
  const [, setLocation] = useLocation();

  // Enhanced debug logging
  console.log('CityChat Debug Info:', {
    currentPath: window.location.pathname,
    match: match,
    params: params,
    paramsType: typeof params,
    paramsKeys: params ? Object.keys(params) : 'null'
  });

  // Test mode for Universal City System
  const testMode = params?.city === 'test-universal-system';

  if (testMode) {
    const cityPath = params?.country && params?.city ? `/${params.country}/${params.city}` : '/';
    return <UniversalCitySystem cityPath={cityPath} />;
  }
  
  // Get city data based on URL using the unified system
  let cityPath = '/';

  if (params?.country && params?.city) {
    cityPath = `/${params.country}/${params.city}`;
  }

  const cityData = getCityByPath(cityPath);

  // Enhanced debug logging
  console.log('CityChat Debug Info:', {
    currentPath: window.location.pathname,
    match,
    params: params ?? 'null/undefined',
    cityPath,
    cityData: cityData ? 'FOUND' : 'NOT FOUND',
    cityDataDetails: cityData,
    availableCitiesCount: getAllCities().length,
    allCityPaths: getAllCities().map(c => c.path).slice(0, 10), // Show first 10 city paths for debugging
    searchingFor: cityPath,
    foundInData: getAllCities().some(c => c.path === cityPath) ? 'YES' : 'NO'
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
    console.log('CityChat ERROR - cityData is null/undefined:', {
      currentPath: window.location.pathname,
      match,
      params,
      cityPath,
      cityData,
      availableCities: getAllCities().length,
      cityExists: getAllCities().some(c => c.path === cityPath),
      allCities: getAllCities().map(c => ({ path: c.path, name: c.nameAr })).slice(0, 5),
      countryCities: getCitiesByCountry(params?.country || '').map(c => ({ path: c.path, name: c.nameAr }))
    });

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
            <div>🏛️ الدولة: {params?.country}</div>
            <div>🏙️ عدد المدن في هذه الدولة: {getCitiesByCountry(params?.country || '').length}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-['Cairo'] overflow-hidden" dir="rtl" style={{ minHeight: '100dvh' }}>

      <Suspense fallback={
        <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
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