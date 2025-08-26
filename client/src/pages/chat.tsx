import { lazy, Suspense, useState } from 'react';

const ChatInterface = lazy(() => import('@/components/chat/ChatInterface'));
const WelcomeScreen = lazy(() => import('@/components/chat/WelcomeScreen'));
// حذف المحدد المحلي للغرف لتجنب التكرار
import KickCountdown from '@/components/moderation/KickCountdown';
import { useChat } from '@/hooks/useChat';
import { clearSession } from '@/lib/socket';
import type { ChatUser, ChatRoom } from '@/types/chat';

// Prefetch heavy modules during idle time (guarded by Save-Data)
try {
	const saveData = (navigator as any)?.connection?.saveData === true;
	const run = () => {
		if (saveData) return;
		// Panels and heavy components
		import('@/components/chat/MessagesPanel');
		import('@/components/chat/PrivateMessageBox');
		import('@/components/chat/UserSidebarWithWalls');
		import('@/components/chat/MessageArea');
		import('@/components/chat/NotificationPanel');
	};
	if (typeof window !== 'undefined') {
		if ('requestIdleCallback' in window) {
			(window as any).requestIdleCallback(run, { timeout: 3000 });
		} else {
			setTimeout(run, 2000);
		}
	}
} catch {}

export default function ChatPage() {
  const [showWelcome, setShowWelcome] = useState(true);
  // تم تبسيط التدفق لإزالة شاشة اختيار الغرفة المحلية
  const chat = useChat();

  // إزالة قائمة الغرف الثابتة لتفادي التعارض مع المنظومة الأساسية

  const handleUserLogin = (user: ChatUser) => {
    clearSession(); // مسح أي جلسة سابقة قبل تسجيل دخول جديد
    chat.connect(user);
    setShowWelcome(false);
    // الانضمام تلقائياً للغرفة العامة، باقي التنقل من داخل الواجهة
    chat.joinRoom('general');
  };

  // لم يعد هناك محدد غرف على مستوى الصفحة

  const handleLogout = () => {
    clearSession(); // مسح بيانات الجلسة المحفوظة
    chat.disconnect();
    setShowWelcome(true);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-['Cairo']" dir="rtl">
      <Suspense fallback={<div className="p-6 text-center">...جاري التحميل</div>}>
        {showWelcome ? (
          <WelcomeScreen onUserLogin={handleUserLogin} />
        ) : (
          <ChatInterface chat={chat} onLogout={handleLogout} />
        )}
      </Suspense>

      {/* عداد الطرد */}
      <KickCountdown
        isVisible={chat.showKickCountdown || false}
        onClose={() => chat.setShowKickCountdown?.(false)}
        durationMinutes={15}
      />
    </div>
  );
}
