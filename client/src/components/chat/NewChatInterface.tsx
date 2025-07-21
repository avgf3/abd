import { useState, useEffect } from 'react';
import NewUserSidebar from './NewUserSidebar';
import NewMessageArea from './NewMessageArea';
import ProfileModal from './ProfileModal';
import PrivateMessageBox from './PrivateMessageBox';
import UserPopup from './UserPopup';
import SettingsMenu from './SettingsMenu';
import ReportModal from './ReportModal';
import AdminReportsPanel from './AdminReportsPanel';
import NotificationPanel from './NotificationPanel';
import FriendsPanel from './FriendsPanel';
import MessagesPanel from './MessagesPanel';
import MessageAlert from './MessageAlert';
import ModerationPanel from './ModerationPanel';
import OwnerAdminPanel from './OwnerAdminPanel';
import ProfileImage from './ProfileImage';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { useChat } from '@/hooks/useChat';
import type { ChatUser } from '@/types/chat';

interface ChatInterfaceProps {
  chat: ReturnType<typeof useChat>;
  onLogout: () => void;
}

export default function NewChatInterface({ chat, onLogout }: ChatInterfaceProps) {
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPrivateUser, setSelectedPrivateUser] = useState<ChatUser | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAdminReports, setShowAdminReports] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);
  
  const [newMessageAlert, setNewMessageAlert] = useState<{
    show: boolean;
    sender: ChatUser | null;
  }>({
    show: false,
    sender: null,
  });

  const [reportedUser, setReportedUser] = useState<ChatUser | null>(null);
  const [reportedMessage, setReportedMessage] = useState<{ content: string; id: number } | null>(null);
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

  const [profileUser, setProfileUser] = useState<ChatUser | null>(null);

  const { toast } = useToast();

  // تفعيل التنبيه عند وصول رسالة جديدة
  useEffect(() => {
    if (chat.newMessageSender) {
      setNewMessageAlert({
        show: true,
        sender: chat.newMessageSender,
      });
    }
  }, [chat.newMessageSender]);

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
        title: "تم إرسال طلب الصداقة",
        description: `تم إرسال طلب صداقة إلى ${user.username}`,
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إرسال طلب الصداقة",
        variant: "destructive",
      });
    }
    closeUserPopup();
  };

  const handleIgnoreUser = (user: ChatUser) => {
    chat.ignoreUser(user.id);
    toast({
      title: "تم التجاهل",
      description: `تم تجاهل المستخدم ${user.username} - لن ترى رسائله بعد الآن`,
    });
    closeUserPopup();
  };

  const handleViewProfile = (user: ChatUser) => {
    setShowProfile(true);
    closeUserPopup();
  };

  const handleReportUser = (user: ChatUser, messageContent?: string, messageId?: number) => {
    setReportedUser(user);
    if (messageContent && messageId) {
      setReportedMessage({ content: messageContent, id: messageId });
    } else {
      setReportedMessage(null);
    }
    setShowReportModal(true);
    closeUserPopup();
  };

  const closeMessageAlert = () => {
    setNewMessageAlert({ show: false, sender: null });
    chat.setNewMessageSender(null);
  };

  const openMessagesPanel = () => {
    setShowMessages(true);
    closeMessageAlert();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header - Arabic Chat Style */}
      <header className="bg-teal-600 text-white shadow-md flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-red-500 px-3 py-1 rounded text-sm font-bold">
              العربية
            </div>
            <h1 className="text-xl font-bold">ArabicChat</h1>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex items-center gap-2 text-sm">
            <button 
              onClick={() => setShowMessages(true)}
              className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors"
            >
              البريد
            </button>
            <button 
              onClick={() => setShowProfile(true)}
              className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors"
            >
              رفع ملف
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors"
            >
              الإعدادات
            </button>
            
            {/* Admin Buttons */}
            {chat.currentUser?.userType === 'owner' && (
              <>
                <button 
                  onClick={() => setShowAdminReports(true)}
                  className="bg-orange-600 hover:bg-orange-500 px-3 py-1 rounded transition-colors"
                >
                  التبليغات
                </button>
                <button 
                  onClick={() => setShowOwnerPanel(true)}
                  className="bg-purple-600 hover:bg-purple-500 px-3 py-1 rounded transition-colors"
                >
                  الإدارة
                </button>
              </>
            )}
            
            {/* User Count */}
            <div className="flex items-center gap-2">
              <span>الزوار</span>
              <span className="bg-gray-700 px-2 py-1 rounded text-xs">
                {chat.onlineUsers.length}
              </span>
            </div>
            
            {/* Search Icon */}
            <button className="text-white hover:text-gray-300">
              🔍
            </button>
          </div>
        </div>
      </header>

      {/* Ad Space 1 */}
      <div className="bg-blue-50 border-b border-gray-200 p-2 text-center text-sm text-gray-600 flex-shrink-0">
        مساحة إعلانية 1 - 728x90
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Ad Space */}
        <div className="w-48 bg-gray-50 border-r border-gray-200 p-2 flex-shrink-0">
          <div className="bg-white border border-gray-300 rounded p-4 text-center text-xs text-gray-500 h-96">
            مساحة إعلانية<br/>
            160x600<br/>
            Skyscraper
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 bg-gray-50 overflow-hidden">
            <NewMessageArea
              messages={chat.publicMessages}
              onUserClick={handleUserClick}
              onReportMessage={handleReportUser}
              typingUsers={chat.typingUsers}
            />
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-500 hover:text-gray-700">
                📎
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700">
                🎤
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="اكتب رسالتك..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-full text-right bg-white"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.target as HTMLInputElement;
                      if (input.value.trim()) {
                        chat.sendPublicMessage(input.value);
                        input.value = '';
                      }
                    }
                  }}
                />
                <button className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700">
                  😊
                </button>
              </div>
              <button className="bg-teal-600 text-white px-4 py-2 rounded-full hover:bg-teal-700 transition-colors">
                ➤
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Users List */}
        <div className="flex-shrink-0">
          <NewUserSidebar
            users={chat.onlineUsers}
            currentUser={chat.currentUser}
            onUserClick={handleUserClick}
          />
        </div>
      </div>

      {/* Ad Space 2 */}
      <div className="bg-blue-50 border-t border-gray-200 p-2 text-center text-sm text-gray-600 flex-shrink-0">
        مساحة إعلانية 2 - 728x90
      </div>

      {/* Modals and Popups */}
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
          onClose={closeUserPopup}
        />
      )}

      {showProfile && (
        <ProfileModal
          onClose={() => setShowProfile(false)}
          currentUser={chat.currentUser}
          user={profileUser}
          onUpdate={(updatedUser) => {
            // تحديث بيانات المستخدم في chat
            if (chat.currentUser && updatedUser.id === chat.currentUser.id) {
              chat.setCurrentUser(updatedUser);
            }
            // تحديث في قائمة المستخدمين المتصلين
            chat.setOnlineUsers(prev => prev.map(user => 
              user.id === updatedUser.id ? updatedUser : user
            ));
          }}
        />
      )}

      {showSettings && (
        <SettingsMenu
          onClose={() => setShowSettings(false)}
          onLogout={onLogout}
          onOpenProfile={() => setShowProfile(true)}
        />
      )}

      {selectedPrivateUser && (
        <PrivateMessageBox
          isOpen={!!selectedPrivateUser}
          user={selectedPrivateUser}
          onClose={closePrivateMessage}
          messages={chat.privateConversations[selectedPrivateUser.id] || []}
          onSendMessage={(content) => {
            chat.sendPrivateMessage(selectedPrivateUser.id, content);
          }}
          currentUser={chat.currentUser}
        />
      )}

      {showReportModal && reportedUser && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setReportedUser(null);
            setReportedMessage(null);
          }}
          reportedUser={reportedUser}
          currentUser={chat.currentUser}
          messageContent={reportedMessage?.content}
          messageId={reportedMessage?.id}
        />
      )}

      {showAdminReports && chat.currentUser?.userType === 'owner' && (
        <AdminReportsPanel
          isOpen={showAdminReports}
          onClose={() => setShowAdminReports(false)}
          currentUser={chat.currentUser}
        />
      )}

      {showNotifications && (
        <NotificationPanel
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          currentUser={chat.currentUser}
        />
      )}

      {showFriends && (
        <FriendsPanel
          isOpen={showFriends}
          onClose={() => setShowFriends(false)}
          currentUser={chat.currentUser}
          onStartPrivateChat={handlePrivateMessage}
          onlineUsers={chat.onlineUsers}
        />
      )}

      {showMessages && (
        <MessagesPanel
          isOpen={showMessages}
          onClose={() => setShowMessages(false)}
          currentUser={chat.currentUser}
          privateConversations={chat.privateConversations}
          onStartPrivateChat={handlePrivateMessage}
          onlineUsers={chat.onlineUsers}
        />
      )}

      {showModerationPanel && (
        <ModerationPanel
          isOpen={showModerationPanel}
          onClose={() => setShowModerationPanel(false)}
          currentUser={chat.currentUser}
          onlineUsers={chat.onlineUsers}
        />
      )}

      {showOwnerPanel && chat.currentUser?.userType === 'owner' && (
        <OwnerAdminPanel
          isOpen={showOwnerPanel}
          onClose={() => setShowOwnerPanel(false)}
          currentUser={chat.currentUser}
          onlineUsers={chat.onlineUsers}
        />
      )}

      <MessageAlert
        isOpen={newMessageAlert.show}
        sender={newMessageAlert.sender}
        onClose={closeMessageAlert}
        onOpenMessages={openMessagesPanel}
      />
    </div>
  );
}