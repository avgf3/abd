import { useState, useEffect } from 'react';
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
  const [isInitializing, setIsInitializing] = useState(false);
  const chat = useChat();

  // الغرف المتاحة
  const rooms: ChatRoom[] = [
    { id: 'general', name: 'الدردشة العامة', description: 'الغرفة الرئيسية للدردشة', isDefault: true, createdBy: 1, createdAt: new Date(), isActive: true, userCount: 12, icon: '' },
    { id: 'music', name: 'أغاني وسهر', description: 'غرفة للموسيقى والترفيه', isDefault: false, createdBy: 1, createdAt: new Date(), isActive: true, userCount: 8, icon: '' }
  ];

  // مراقبة حالة الاتصال والتهيئة
  useEffect(() => {
    if (chat.isConnected && chat.isInitialized && !isInitializing) {
      console.log('✅ النظام جاهز - الانتقال للدردشة');
      setShowWelcome(false);
      setShowRoomSelector(false);
      setIsInitializing(false);
    }
  }, [chat.isConnected, chat.isInitialized, isInitializing]);

  // مراقبة حالة التحميل
  useEffect(() => {
    if (chat.isLoading) {
      setIsInitializing(true);
    } else if (!chat.isLoading && chat.connectionError) {
      // إذا كان هناك خطأ في الاتصال، أوقف التحميل
      setIsInitializing(false);
      console.error('❌ خطأ في الاتصال:', chat.connectionError);
    } else if (!chat.isLoading && chat.isConnected) {
      // إذا تم الاتصال بنجاح، أوقف التحميل
      setIsInitializing(false);
    }
  }, [chat.isLoading, chat.connectionError, chat.isConnected]);

  // إضافة timeout أمان لمنع التحميل اللانهائي
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isInitializing && !chat.isConnected) {
        console.warn('⚠️ انتهت مهلة الاتصال - إيقاف التحميل');
        setIsInitializing(false);
        setShowWelcome(true);
      }
    }, 30000); // 30 ثانية timeout

    return () => clearTimeout(timeoutId);
  }, [isInitializing, chat.isConnected]);

  const handleUserLogin = async (user: ChatUser) => {
    console.log('🔐 تسجيل دخول المستخدم:', user.username);
    setIsInitializing(true);
    
    try {
      // الاتصال بالخادم
      await chat.connect(user);
      
      // لا نحتاج لعرض شاشة اختيار الغرفة - سيتم الانضمام التلقائي
      console.log('🔄 تم الاتصال - انتظار التهيئة...');
      
    } catch (error) {
      console.error('❌ خطأ في تسجيل الدخول:', error);
      setIsInitializing(false);
    }
  };

  const handleRoomSelect = (roomId: string) => {
    console.log('🏠 اختيار غرفة:', roomId);
    setSelectedRoomId(roomId);
    setShowRoomSelector(false);
    
    // الانضمام للغرفة المختارة
    chat.joinRoom(roomId);
  };

  const handleLogout = () => {
    console.log('🚪 تسجيل الخروج');
    chat.disconnect();
    setShowWelcome(true);
    setShowRoomSelector(false);
    setSelectedRoomId(null);
    setIsInitializing(false);
  };

  // عرض شاشة التحميل أثناء التهيئة
  if (isInitializing || chat.isLoading) {
    return (
      <div className="h-screen bg-background text-foreground font-['Cairo'] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">جاري التحميل...</h2>
          <p className="text-muted-foreground">يرجى الانتظار بينما نقوم بإعداد الدردشة</p>
          {chat.connectionError && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive font-medium mb-2">خطأ في الاتصال</p>
              <p className="text-sm text-destructive/80 mb-3">{chat.connectionError}</p>
              <button 
                onClick={() => {
                  setIsInitializing(false);
                  setShowWelcome(true);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                العودة للدخول
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

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
