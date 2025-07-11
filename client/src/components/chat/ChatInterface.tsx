import { useState, useEffect } from 'react';
import UserSidebar from './UserSidebar';
import MessageArea from './MessageArea';
import ProfileModal from './ProfileModal';
import PrivateMessageBox from './PrivateMessageBox';
import UserPopup from './UserPopup';
import SettingsMenu from './SettingsMenu';
import ReportModal from './ReportModal';
import AdminReportsPanel from './AdminReportsPanel';
import NotificationPanel from './NotificationPanel';
import FriendsPanel from './FriendsPanel';
import FriendRequestBadge from './FriendRequestBadge';
import MessagesPanel from './MessagesPanel';
import MessageAlert from './MessageAlert';
import ModerationPanel from './ModerationPanel';
import ReportsLog from '../moderation/ReportsLog';
import ActiveModerationLog from '../moderation/ActiveModerationLog';
import KickNotification from '../moderation/KickNotification';
import BlockNotification from '../moderation/BlockNotification';
import PromoteUserPanel from '../moderation/PromoteUserPanel';
import OwnerAdminPanel from './OwnerAdminPanel';
import ProfileImage from './ProfileImage';
import StealthModeToggle from './StealthModeToggle';

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
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAdminReports, setShowAdminReports] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);
  const [showReportsLog, setShowReportsLog] = useState(false);
  const [showActiveActions, setShowActiveActions] = useState(false);
  const [showPromotePanel, setShowPromotePanel] = useState(false);

  const [newMessageAlert, setNewMessageAlert] = useState<{
    show: boolean;
    sender: ChatUser | null;
  }>({
    show: false,
    sender: null,
  });

  // تفعيل التنبيه عند وصول رسالة جديدة
  useEffect(() => {
    if (chat.newMessageSender) {
      setNewMessageAlert({
        show: true,
        sender: chat.newMessageSender,
      });
    }
  }, [chat.newMessageSender]);
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
      console.log('Sending friend request:', { senderId: chat.currentUser.id, receiverId: user.id });
      
      const response = await apiRequest('/api/friend-requests', {
        method: 'POST',
        body: {
          senderId: chat.currentUser.id,
          receiverId: user.id,
        }
      });
      
      console.log('Friend request response:', response);
      
      toast({
        title: "تمت الإضافة",
        description: `تم إرسال طلب صداقة إلى ${user.username}`,
      });
    } catch (error) {
      console.error('Friend request error:', error);
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "لم نتمكن من إرسال طلب الصداقة",
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
    toast({
      title: "الملف الشخصي",
      description: `عرض ملف ${user.username} الشخصي`,
    });
    closeUserPopup();
  };

  const handleReportUser = (user: ChatUser, messageContent?: string, messageId?: number) => {
    setReportedUser(user);
    setReportedMessage(messageContent && messageId ? { content: messageContent, id: messageId } : null);
    setShowReportModal(true);
    closeUserPopup();
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setReportedUser(null);
    setReportedMessage(null);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800" onClick={closeUserPopup}>
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-xl py-6 px-8 flex justify-between items-center shadow-2xl border-b border-blue-500/30">
        <div className="flex items-center gap-4">
          <div className="text-4xl animate-pulse">💬</div>
          <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Arabic<span className="text-cyan-400">Chat</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            className="bg-gradient-to-r from-blue-600/80 to-blue-700/80 hover:from-blue-700 hover:to-blue-800 backdrop-blur-sm px-6 py-3 rounded-2xl transition-all duration-300 flex items-center gap-2 relative shadow-lg hover:shadow-xl transform hover:scale-105"
            onClick={() => setShowNotifications(true)}
          >
            <span className="text-lg">🔔</span>
            <span className="font-semibold">إشعارات</span>
          </Button>
          
          <Button 
            className="bg-gradient-to-r from-green-600/80 to-green-700/80 hover:from-green-700 hover:to-green-800 backdrop-blur-sm px-6 py-3 rounded-2xl transition-all duration-300 flex items-center gap-2 relative shadow-lg hover:shadow-xl transform hover:scale-105"
            onClick={() => setShowFriends(true)}
          >
            <span className="text-lg">👥</span>
            <span className="font-semibold">الأصدقاء</span>
            {/* تنبيه طلبات الصداقة */}
            <FriendRequestBadge currentUser={chat.currentUser} />
          </Button>

          <Button 
            className="bg-gradient-to-r from-purple-600/80 to-purple-700/80 hover:from-purple-700 hover:to-purple-800 backdrop-blur-sm px-6 py-3 rounded-2xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            onClick={() => setShowMessages(true)}
            title="الرسائل"
          >
            <span className="text-lg">✉️</span>
            <span className="font-semibold">الرسائل</span>
          </Button>
          
          {/* زر لوحة الإدارة للمشرفين */}
          {chat.currentUser && (chat.currentUser.userType === 'owner' || chat.currentUser.userType === 'admin') && (
            <>
              <Button 
                className="bg-gradient-to-r from-yellow-600/80 to-yellow-700/80 hover:from-yellow-700 hover:to-yellow-800 backdrop-blur-sm px-6 py-3 rounded-2xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                onClick={() => setShowModerationPanel(true)}
              >
                <span className="text-lg">🛡️</span>
                <span className="font-semibold">إدارة</span>
              </Button>
              
              <StealthModeToggle currentUser={chat.currentUser} />
              
              <Button 
                className="bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-700 hover:to-red-800 backdrop-blur-sm px-6 py-3 rounded-2xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 border border-red-400/30"
                onClick={() => setShowReportsLog(true)}
              >
                <span className="text-lg">⚠️</span>
                <span className="font-semibold">سجل البلاغات</span>
              </Button>
              
              <Button 
                className="bg-gradient-to-r from-orange-600/80 to-orange-700/80 hover:from-orange-700 hover:to-orange-800 backdrop-blur-sm px-6 py-3 rounded-2xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 border border-orange-400/30"
                onClick={() => setShowActiveActions(true)}
              >
                <span className="text-lg">🔒</span>
                <span className="font-semibold">سجل الإجراءات</span>
              </Button>

              {/* زر ترقية المستخدمين - للمالك فقط */}
              {chat.currentUser?.userType === 'owner' && (
                <Button 
                  className="bg-gradient-to-r from-indigo-600/80 to-indigo-700/80 hover:from-indigo-700 hover:to-indigo-800 backdrop-blur-sm px-6 py-3 rounded-2xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  onClick={() => setShowPromotePanel(true)}
                >
                  <span className="text-lg">👑</span>
                  <span className="font-semibold">ترقية المستخدمين</span>
                </Button>
              )}
            </>
          )}

          {/* زر خاص بالمالك فقط */}
          {chat.currentUser && chat.currentUser.userType === 'owner' && (
            <Button 
              className="bg-gradient-to-r from-pink-600/80 to-pink-700/80 hover:from-pink-700 hover:to-pink-800 backdrop-blur-sm px-6 py-3 rounded-2xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 border border-pink-400/30"
              onClick={() => setShowOwnerPanel(true)}
            >
              <span className="text-lg">👑</span>
              <span className="font-semibold">إدارة المالك</span>
            </Button>
          )}
          
          <Button 
            className="bg-gradient-to-r from-gray-600/80 to-gray-700/80 hover:from-gray-700 hover:to-gray-800 backdrop-blur-sm px-6 py-3 rounded-2xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            onClick={() => setShowSettings(!showSettings)}
          >
            <span className="text-lg">⚙️</span>
            <span className="font-semibold">إعدادات</span>
          </Button>


        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden bg-gradient-to-br from-slate-800/50 to-gray-900/50">
        <UserSidebar 
          users={chat.onlineUsers}
          onUserClick={handleUserClick}
          currentUser={chat.currentUser}
        />
        <MessageArea 
          messages={chat.publicMessages}
          currentUser={chat.currentUser}
          onSendMessage={chat.sendPublicMessage}
          onTyping={chat.handleTyping}
          typingUsers={chat.typingUsers}
          onReportMessage={handleReportUser}
          onUserClick={handleUserClick}
        />
      </main>

      {/* Modals and Popups */}
      {showProfile && (
        <ProfileModal 
          user={chat.currentUser}
          currentUser={chat.currentUser}
          onClose={() => setShowProfile(false)}
          onIgnoreUser={(userId) => {
            chat.ignoreUser(userId);
          }}
        />
      )}

      {selectedPrivateUser && (
        <PrivateMessageBox
          isOpen={!!selectedPrivateUser}
          user={selectedPrivateUser}
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
          onIgnore={() => {
            // إزالة زر التجاهل من UserPopup - الآن في الملف الشخصي فقط
          }}
          onViewProfile={() => handleViewProfile(userPopup.user!)}
          currentUser={chat.currentUser}
          onClose={closeUserPopup}
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
          onOpenReports={() => {
            setShowAdminReports(true);
            setShowSettings(false);
          }}
          currentUser={chat.currentUser}
        />
      )}

      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          onClose={closeReportModal}
          reportedUser={reportedUser}
          currentUser={chat.currentUser}
          messageContent={reportedMessage?.content}
          messageId={reportedMessage?.id}
        />
      )}

      {showNotifications && (
        <NotificationPanel
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          currentUser={chat.currentUser}
        />
      )}

      {/* Admin Reports Panel */}
      {showAdminReports && chat.currentUser && chat.currentUser.userType === 'owner' && (
        <AdminReportsPanel
          isOpen={showAdminReports}
          onClose={() => setShowAdminReports(false)}
          currentUser={chat.currentUser}
        />
      )}

      {showFriends && (
        <FriendsPanel
          isOpen={showFriends}
          onClose={() => setShowFriends(false)}
          currentUser={chat.currentUser}
          onlineUsers={chat.onlineUsers}
          onStartPrivateChat={(friend) => {
            setSelectedPrivateUser(friend);
            setShowFriends(false);
          }}
        />
      )}

      {showMessages && (
        <MessagesPanel
          isOpen={showMessages}
          onClose={() => setShowMessages(false)}
          currentUser={chat.currentUser}
          privateConversations={chat.privateConversations}
          onlineUsers={chat.onlineUsers}
          onStartPrivateChat={(user) => {
            setSelectedPrivateUser(user);
            setShowMessages(false);
          }}
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

      {showOwnerPanel && (
        <OwnerAdminPanel 
          isOpen={showOwnerPanel}
          onClose={() => setShowOwnerPanel(false)}
          currentUser={chat.currentUser}
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

      {showReportsLog && (
        <ReportsLog 
          isVisible={showReportsLog}
          onClose={() => setShowReportsLog(false)}
          currentUser={chat.currentUser}
        />
      )}

      {showActiveActions && (
        <ActiveModerationLog 
          isVisible={showActiveActions}
          onClose={() => setShowActiveActions(false)}
          currentUser={chat.currentUser}
        />
      )}

      {showPromotePanel && (
        <PromoteUserPanel 
          isVisible={showPromotePanel}
          onClose={() => setShowPromotePanel(false)}
          currentUser={chat.currentUser}
          onlineUsers={chat.onlineUsers}
        />
      )}

      {/* إشعارات الطرد والحجب */}
      <KickNotification
        isVisible={chat.kickNotification?.show || false}
        durationMinutes={chat.kickNotification?.duration || 15}
        onClose={() => {}}
      />
      
      <BlockNotification
        isVisible={chat.blockNotification?.show || false}
        reason={chat.blockNotification?.reason || ''}
        onClose={() => {}}
      />

      {/* تنبيه الرسائل الجديدة */}
      <MessageAlert
        isOpen={newMessageAlert.show}
        sender={newMessageAlert.sender}
        onClose={() => setNewMessageAlert({ show: false, sender: null })}
        onOpenMessages={() => setShowMessages(true)}
      />



    </div>
  );
}
