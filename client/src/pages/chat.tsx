import { useState } from 'react';
import WelcomeScreen from '@/components/chat/WelcomeScreen';
import NewChatInterface from '@/components/chat/NewChatInterface';
import { useChat } from '@/hooks/useChat';
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
        <NewChatInterface chat={chat} onLogout={handleLogout} />
      )}
    </div>
  );
}
