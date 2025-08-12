import { useState } from 'react';
import WelcomeScreen from '@/components/chat/WelcomeScreen';
import ChatInterface from '@/components/chat/ChatInterface';
// حذف المحدد المحلي للغرف لتجنب التكرار
import { useChat } from '@/hooks/useChat';
import KickCountdown from '@/components/moderation/KickCountdown';
import type { ChatUser, ChatRoom } from '@/types/chat';

export default function ChatPage() {
  const [showWelcome, setShowWelcome] = useState(true);
  // تم تبسيط التدفق لإزالة شاشة اختيار الغرفة المحلية
  const chat = useChat();

  // إزالة قائمة الغرف الثابتة لتفادي التعارض مع المنظومة الأساسية

  const handleUserLogin = (user: ChatUser) => {
    chat.connect(user);
    setShowWelcome(false);
    // الانضمام التلقائي للغرفة العامة يتم الآن من الخادم بعد المصادقة
  };

  // لم يعد هناك محدد غرف على مستوى الصفحة

  const handleLogout = () => {
    chat.disconnect();
    setShowWelcome(true);
  };

  return (
    <div className="h-screen bg-background text-foreground font-['Cairo']" dir="rtl">
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
