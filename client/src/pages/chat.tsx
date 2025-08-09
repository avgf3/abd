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

  // الغرف المتاحة
  const rooms: ChatRoom[] = [
    { id: 'general', name: 'الدردشة العامة', description: 'الغرفة الرئيسية للدردشة', isDefault: true, createdBy: 1, createdAt: new Date(), isActive: true, userCount: 12, icon: '' },
    { id: 'welcome', name: 'غرفة الترحيب', description: 'غرفة الترحيب بالأعضاء الجدد', isDefault: true, createdBy: 1, createdAt: new Date(), isActive: true, userCount: 3, icon: '' },
    { id: 'music', name: 'أغاني وسهر', description: 'غرفة للموسيقى والترفيه', isDefault: false, createdBy: 1, createdAt: new Date(), isActive: true, userCount: 8, icon: '' }
  ];

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
          rooms={rooms} 
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
