import { useState } from 'react';
import SimpleWelcome from '@/components/ui/SimpleWelcome';
import ChatInterface from '@/components/chat/ChatInterface';
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
        <SimpleWelcome onUserLogin={handleUserLogin} />
      ) : (
        <ChatInterface chat={chat} onLogout={handleLogout} />
      )}
      
      {/* إشعارات الإدارة فقط عندما يوجد إشعار حقيقي */}
      {chat.kickNotification && (
        <div className="fixed top-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg z-50">
          <div className="font-bold">⚠️ إشعار إداري</div>
          <div>{chat.kickNotification}</div>
          <button 
            onClick={() => {
              const setKick = chat.setKickNotification as ((value: string | null) => void) | undefined;
              setKick?.(null);
            }}
            className="mt-2 bg-red-700 hover:bg-red-800 px-3 py-1 rounded text-sm"
          >
            إغلاق
          </button>
        </div>
      )}
      
      {chat.blockNotification && (
        <div className="fixed top-4 right-4 bg-red-800 text-white p-4 rounded-lg shadow-lg z-50">
          <div className="font-bold">🚫 تم حظرك</div>
          <div>{chat.blockNotification}</div>
          <button 
            onClick={() => {
              const setBlock = chat.setBlockNotification as ((value: string | null) => void) | undefined;
              setBlock?.(null);
            }}
            className="mt-2 bg-red-900 hover:bg-red-950 px-3 py-1 rounded text-sm"
          >
            إغلاق
          </button>
        </div>
      )}
    </div>
  );
}
