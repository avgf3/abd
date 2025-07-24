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

  // جلب الغرف من الخادم
  const fetchRooms = async () => {
    try {
      setRoomsLoading(true);
      const response = await apiRequest('/api/rooms', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        const formattedRooms = data.rooms.map((room: any) => ({
          id: room.id,
          name: room.name,
          description: room.description || '',
          isDefault: room.is_default,
          createdBy: room.created_by,
          createdAt: new Date(room.created_at),
          isActive: room.is_active,
          userCount: room.user_count || 0,
          icon: room.icon || ''
        }));
        setRooms(formattedRooms);
      }
    } catch (error) {
      console.error('خطأ في جلب الغرف:', error);
      // استخدام غرف افتراضية في حالة الخطأ
      setRooms([
        { id: 'general', name: 'الدردشة العامة', description: 'الغرفة الرئيسية للدردشة', isDefault: true, createdBy: 1, createdAt: new Date(), isActive: true, userCount: 0, icon: '' },
        { id: 'music', name: 'أغاني وسهر', description: 'غرفة للموسيقى والترفيه', isDefault: false, createdBy: 1, createdAt: new Date(), isActive: true, userCount: 0, icon: '' }
      ]);
    } finally {
      setRoomsLoading(false);
    }
  };

  // جلب الغرف عند تحميل المكون
  useEffect(() => {
    fetchRooms();
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

  const handleBackToRoomSelector = () => {
    setShowRoomSelector(true);
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
          isLoading={roomsLoading}
        />
      ) : (
        <ChatInterface 
          chat={chat} 
          onLogout={handleLogout}
          initialRoomId={selectedRoomId}
          onBackToRoomSelector={handleBackToRoomSelector}
          roomsData={rooms}
          onRoomsUpdate={setRooms}
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
