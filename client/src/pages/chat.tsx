import { useState } from 'react';
import WelcomeScreen from '@/components/chat/WelcomeScreen';
import ChatInterface from '@/components/chat/ChatInterface';
import RoomSelector from '@/components/chat/RoomSelector';
import { useChat } from '@/hooks/useChat';
import KickCountdown from '@/components/moderation/KickCountdown';
import type { ChatUser, ChatRoom } from '@/types/chat';

export default function ChatPage() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [showRoomSelector, setShowRoomSelector] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const chat = useChat();

  const handleUserLogin = (user: ChatUser) => {
    chat.connect(user);
    setShowWelcome(false);
    setShowRoomSelector(true); // عرض شاشة اختيار الغرفة بعد تسجيل الدخول
  };

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    setShowRoomSelector(false);
  };

  const handleLogout = () => {
    chat.disconnect();
    setShowWelcome(true);
    setShowRoomSelector(false);
    setSelectedRoomId(null);
  };

  return (
    <div className="h-screen bg-background text-foreground font-['Cairo']" dir="rtl">
      {showWelcome ? (
        <WelcomeScreen onUserLogin={handleUserLogin} />
      ) : showRoomSelector ? (
        <RoomSelector 
          rooms={chat.rooms} 
          currentUser={chat.currentUser!} 
          onRoomSelect={handleRoomSelect} 
        />
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
