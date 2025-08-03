import { useState, useEffect } from 'react';
import WelcomeScreen from '@/components/chat/WelcomeScreen';
import ChatInterface from '@/components/chat/ChatInterface';
import RoomSelector from '@/components/chat/RoomSelector';
import { useChat } from '@/hooks/useChat';
import KickCountdown from '@/components/moderation/KickCountdown';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser, ChatRoom } from '@/types/chat';

export default function ChatPage() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [showRoomSelector, setShowRoomSelector] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const chat = useChat();

  // تحميل الغرف من قاعدة البيانات
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const data = await apiRequest<ChatRoom[]>('/api/rooms');
        setRooms(data);
      } catch (error) {
        console.error('خطأ في تحميل الغرف:', error);
        // الغرف الافتراضية في حالة الخطأ
        setRooms([
          { id: 'general', name: 'الدردشة العامة', description: 'الغرفة الرئيسية للدردشة', isDefault: true, createdBy: 1, createdAt: new Date(), isActive: true, userCount: 0, icon: '' }
        ]);
      } finally {
        setRoomsLoading(false);
      }
    };
    loadRooms();
  }, []);

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
        roomsLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">جاري تحميل الغرف...</p>
            </div>
          </div>
        ) : (
          <RoomSelector 
            rooms={rooms} 
            currentUser={chat.currentUser!} 
            onRoomSelect={handleRoomSelect} 
          />
        )
      ) : (
        <ChatInterface 
          chat={chat} 
          onLogout={handleLogout} 
          roomId={selectedRoomId}
        />
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
