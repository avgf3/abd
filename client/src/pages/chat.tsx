import { useState } from 'react';
import FixedWelcomeScreen from '@/components/chat/FixedWelcomeScreen';
import FixedChatInterface from '@/components/chat/FixedChatInterface';
import { useChat } from '@/hooks/useChat';
import KickCountdown from '@/components/moderation/KickCountdown';
import type { ChatUser } from '@/types/chat';

export default function ChatPage() {
  const [showWelcome, setShowWelcome] = useState(true);
  const chat = useChat();

  const handleUserLogin = (user: ChatUser) => {
    chat.connect(user);
    setShowWelcome(false);
  };

  const handleLogout = () => {
    chat.disconnect();
    setShowWelcome(true);
  };

  return (
    <div className="h-screen bg-background text-foreground font-['Cairo']" dir="rtl">
      {showWelcome ? (
        <FixedWelcomeScreen onUserLogin={handleUserLogin} />
      ) : (
        <FixedChatInterface chat={chat} onLogout={handleLogout} />
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
