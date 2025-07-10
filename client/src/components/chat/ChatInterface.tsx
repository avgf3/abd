import { useState } from 'react';
import UserSidebar from './UserSidebar';
import MessageArea from './MessageArea';
import ProfileModal from './ProfileModal';
import PrivateMessageBox from './PrivateMessageBox';
import UserPopup from './UserPopup';
import SettingsMenu from './SettingsMenu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { useChat } from '@/hooks/useChat';
import type { ChatUser } from '@/types/chat';

interface ChatInterfaceProps {
  chat: ReturnType<typeof useChat>;
  onLogout: () => void;
}

export default function ChatInterface({ chat, onLogout }: ChatInterfaceProps) {
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPrivateUser, setSelectedPrivateUser] = useState<ChatUser | null>(null);
  const [userPopup, setUserPopup] = useState<{
    show: boolean;
    user: ChatUser | null;
    x: number;
    y: number;
  }>({
    show: false,
    user: null,
    x: 0,
    y: 0,
  });
  const { toast } = useToast();

  const handleUserClick = (event: React.MouseEvent, user: ChatUser) => {
    event.stopPropagation();
    setUserPopup({
      show: true,
      user,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const closeUserPopup = () => {
    setUserPopup(prev => ({ ...prev, show: false }));
  };

  const handlePrivateMessage = (user: ChatUser) => {
    setSelectedPrivateUser(user);
    closeUserPopup();
  };

  const closePrivateMessage = () => {
    setSelectedPrivateUser(null);
  };

  const handleAddFriend = async (user: ChatUser) => {
    if (!chat.currentUser) return;
    
    try {
      await apiRequest('POST', '/api/friends', {
        userId: chat.currentUser.id,
        friendId: user.id,
      });
      
      toast({
        title: "تمت الإضافة",
        description: `تم إرسال طلب صداقة إلى ${user.username}`,
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "لم نتمكن من إرسال طلب الصداقة",
        variant: "destructive",
      });
    }
    closeUserPopup();
  };

  const handleIgnoreUser = (user: ChatUser) => {
    toast({
      title: "تم التجاهل",
      description: `تم تجاهل المستخدم ${user.username}`,
    });
    closeUserPopup();
  };

  const handleViewProfile = (user: ChatUser) => {
    toast({
      title: "الملف الشخصي",
      description: `عرض ملف ${user.username} الشخصي`,
    });
    closeUserPopup();
  };

  return (
    <div className="h-screen flex flex-col" onClick={closeUserPopup}>
      {/* Header */}
      <header className="bg-secondary py-4 px-6 flex justify-between items-center shadow-2xl border-b border-accent">
        <div className="flex items-center gap-3">
          <div className="text-2xl">💬</div>
          <div className="text-2xl font-bold text-white">
            Arabic<span className="text-primary">Chat</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2"
            onClick={() => setShowSettings(!showSettings)}
          >
            <span>⚙️</span>
            إعدادات
          </Button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        <UserSidebar 
          users={chat.onlineUsers}
          onUserClick={handleUserClick}
        />
        <MessageArea 
          messages={chat.publicMessages}
          currentUser={chat.currentUser}
          onSendMessage={chat.sendPublicMessage}
          onTyping={chat.handleTyping}
          typingUsers={chat.typingUsers}
        />
      </main>

      {/* Modals and Popups */}
      {showProfile && (
        <ProfileModal 
          user={chat.currentUser}
          onClose={() => setShowProfile(false)}
        />
      )}

      {selectedPrivateUser && (
        <PrivateMessageBox
          targetUser={selectedPrivateUser}
          currentUser={chat.currentUser}
          messages={chat.privateConversations[selectedPrivateUser.id] || []}
          onSendMessage={(content) => chat.sendPrivateMessage(selectedPrivateUser.id, content)}
          onClose={closePrivateMessage}
        />
      )}

      {userPopup.show && userPopup.user && (
        <UserPopup
          user={userPopup.user}
          x={userPopup.x}
          y={userPopup.y}
          onPrivateMessage={() => handlePrivateMessage(userPopup.user!)}
          onAddFriend={() => handleAddFriend(userPopup.user!)}
          onIgnore={() => handleIgnoreUser(userPopup.user!)}
          onViewProfile={() => handleViewProfile(userPopup.user!)}
          currentUser={chat.currentUser}
        />
      )}

      {showSettings && (
        <SettingsMenu
          onOpenProfile={() => {
            setShowProfile(true);
            setShowSettings(false);
          }}
          onLogout={onLogout}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
