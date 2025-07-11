import { useState } from 'react';
import WelcomeScreen from '@/components/chat/WelcomeScreen';
import ChatInterface from '@/components/chat/ChatInterface';
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
        <WelcomeScreen onUserLogin={handleUserLogin} />
      ) : (
        <ChatInterface chat={chat} onLogout={handleLogout} />
      )}
      

    </div>
  );
}
