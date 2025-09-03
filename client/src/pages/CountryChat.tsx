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
  // Support base and nested routes
  const [matchBase, paramsBase] = useRoute('/:country');
  const [matchTopic, paramsTopic] = useRoute('/:country/:topic');
  const [matchInner, paramsInner] = useRoute('/:country/:topic/:inner');
  const [, setLocation] = useLocation();
  
  // Get country data based on URL
  const currentCountry = (paramsInner?.country || paramsTopic?.country || paramsBase?.country) as string | undefined;
  const countryPath = currentCountry ? `/${currentCountry}` : '';
  const countryData = getCountryByPath(countryPath);
  const topicParam = (paramsInner?.topic || paramsTopic?.topic) as string | undefined;
  const innerParam = paramsInner?.inner as string | undefined;

  // Canonicalize to ASCII slugs if URL contains non-ASCII characters
  useEffect(() => {
    const hasNonAscii = (s?: string) => !!s && /[^\x00-\x7F]/.test(s);
    const toSlug = (value: string) => {
      if (!value) return '';
      const map: Record<string, string> = {
        'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
        'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z',
        'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'u',
        'ؤ': 'u', 'ي': 'y', 'ى': 'a', 'ئ': 'i', 'ء': '', 'ة': 'h',
        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
        'ٔ': '', 'ً': '', 'ٌ': '', 'ٍ': '', 'َ': '', 'ُ': '', 'ِ': '', 'ّ': '', 'ْ': ''
      };
      const normalized = value.trim().replace(/\u0644\u0627/g, 'la').replace(/\s+/g, '-');
      let ascii = '';
      for (const ch of normalized) {
        const code = ch.charCodeAt(0);
        if (map[ch] !== undefined) {
          ascii += map[ch];
        } else if ((code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || ch === '-') {
          ascii += ch;
        } else if (ch === '_' || ch === ' ') {
          ascii += '-';
        }
      }
      ascii = ascii.replace(/\bshat\b/g, 'chat');
      ascii = ascii.replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
      return ascii;
    };

    if (!currentCountry) return;
    if (hasNonAscii(topicParam) || hasNonAscii(innerParam)) {
      const asciiTopic = topicParam ? toSlug(decodeURIComponent(topicParam)) : undefined;
      const asciiInner = innerParam ? toSlug(decodeURIComponent(innerParam)) : undefined;
      const target = `${countryPath}${asciiTopic ? `/${asciiTopic}` : ''}${asciiInner ? `/${asciiInner}` : ''}`;
      if (target !== window.location.pathname) {
        setLocation(target);
      }
    }
  }, [currentCountry, countryPath, topicParam, innerParam, setLocation]);
  
  // If country not found, redirect to home
  useEffect(() => {
    const matched = matchInner || matchTopic || matchBase;
    if (!matched || !countryData) {
      setLocation('/');
    }
  }, [matchInner, matchTopic, matchBase, countryData, setLocation]);
  
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

  if (!countryData) {
    return null;
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-['Cairo']" dir="rtl">
      <Suspense fallback={<div className="p-6 text-center">...جاري التحميل</div>}>
        {isRestoring ? (
          <div className="p-6 text-center">...جاري استعادة الجلسة</div>
        ) : showWelcome ? (
          <CountryWelcomeScreen 
            onUserLogin={handleUserLogin} 
            countryData={countryData}
            // pass optional topic and inner to allow deep-link UI updates
            {...{
              topicSlug: (paramsInner?.topic || paramsTopic?.topic) as string | undefined,
              innerSlug: paramsInner?.inner as string | undefined,
            }}
          />
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