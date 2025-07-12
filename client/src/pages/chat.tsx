import { useState } from 'react';
import WelcomeScreen from '@/components/chat/WelcomeScreen';
import ChatInterface from '@/components/chat/ChatInterfaceNew';
import { useChat } from '@/hooks/useChatNew';
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
    <div className="h-screen bg-gray-900 text-white font-['Cairo']" dir="rtl">
      {showWelcome ? (
        <WelcomeScreen onUserLogin={handleUserLogin} />
      ) : (
        <ChatInterface chat={chat} onLogout={handleLogout} />
      )}
    </div>
  );
}
