import { useState, useEffect } from 'react';
import WelcomeScreen from '@/components/chat/WelcomeScreen';
import ChatInterface from '@/components/chat/ChatInterface';
// حذف المحدد المحلي للغرف لتجنب التكرار
import { useChat } from '@/hooks/useChat';
import KickCountdown from '@/components/moderation/KickCountdown';
import type { ChatUser, ChatRoom } from '@/types/chat';
import { getSession, clearSession } from '@/lib/socket';
import { apiRequest } from '@/lib/queryClient';

export default function ChatPage() {
  const [showWelcome, setShowWelcome] = useState(true);
  // تم تبسيط التدفق لإزالة شاشة اختيار الغرفة المحلية
  const chat = useChat();

  // استرجاع الجلسة تلقائياً بعد التحديث
  useEffect(() => {
    const restore = async () => {
      try {
        const session = getSession();
        if (session && session.userId) {
          const user = await apiRequest<ChatUser>(`/api/users/${session.userId}?t=${Date.now()}`);
          if (user && user.id) {
            chat.connect(user);
            setShowWelcome(false);
            chat.joinRoom(session.roomId || 'general');
          }
        }
      } catch {}
    };
    restore();
  }, []);

  // إزالة قائمة الغرف الثابتة لتفادي التعارض مع المنظومة الأساسية

  const handleUserLogin = (user: ChatUser) => {
    chat.connect(user);
    setShowWelcome(false);
    // الانضمام تلقائياً للغرفة العامة، باقي التنقل من داخل الواجهة
    chat.joinRoom('general');
  };

  // لم يعد هناك محدد غرف على مستوى الصفحة

  const handleLogout = () => {
    chat.disconnect();
    clearSession();
    setShowWelcome(true);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-['Cairo'] app-shell" dir="rtl">
      {showWelcome ? (
        <WelcomeScreen onUserLogin={handleUserLogin} />
      ) : (
        <ChatInterface chat={chat} onLogout={handleLogout} />
      )}

      {/* عداد الطرد */}
      <KickCountdown
        isVisible={chat.showKickCountdown || false}
        onClose={() => chat.setShowKickCountdown?.(false)}
        durationMinutes={15}
      />
    </div>
  );
}
