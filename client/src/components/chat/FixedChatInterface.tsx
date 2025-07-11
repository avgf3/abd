import { useState, useEffect } from 'react';
import UserSidebar from './UserSidebar';
import NewMessageArea from './NewMessageArea';
import MessageInputArea from './MessageInputArea';
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

export default function FixedChatInterface({ chat, onLogout }: ChatInterfaceProps) {
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

  const [reportedUser, setReportedUser] = useState<ChatUser | null>(null);
  const [reportedMessage, setReportedMessage] = useState<{ content: string; id: number } | null>(null);
  const [userPopup, setUserPopup] = useState<{
    show: boolean;
    user: ChatUser | null;
    x: number;
    y: number;
  }>({ show: false, user: null, x: 0, y: 0 });

  const { toast } = useToast();

  const handleUserClick = (event: React.MouseEvent, user: ChatUser) => {
    if (user.id === chat.currentUser?.id) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    setUserPopup({
      show: true,
      user,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  };

  const handleReportUser = (user: ChatUser, messageContent: string, messageId: number) => {
    setReportedUser(user);
    setReportedMessage({ content: messageContent, id: messageId });
    setShowReportModal(true);
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setReportedUser(null);
    setReportedMessage(null);
  };

  const closeUserPopup = () => {
    setUserPopup({ show: false, user: null, x: 0, y: 0 });
  };

  const handlePrivateMessage = (user: ChatUser) => {
    setSelectedPrivateUser(user);
    closeUserPopup();
  };

  const closePrivateMessage = () => {
    setSelectedPrivateUser(null);
  };

  const handleAddFriend = async (user: ChatUser) => {
    try {
      await apiRequest(`/api/friends/request`, {
        method: 'POST',
        body: { receiverId: user.id },
      });
      toast({
        title: "✅ تم إرسال طلب الصداقة",
        description: `تم إرسال طلب صداقة إلى ${user.username}`,
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إرسال طلب الصداقة",
        variant: "destructive",
      });
    }
    closeUserPopup();
  };

  const handleViewProfile = (user: ChatUser) => {
    setSelectedPrivateUser(user);
    setShowProfile(true);
    closeUserPopup();
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white font-['Cairo']" dir="rtl">
      {/* Header */}
      <header className="glass-effect p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="text-2xl">💬</div>
          <div className="text-2xl font-bold text-white">
            Arabic<span className="text-primary">Chat</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2"
            onClick={() => setShowNotifications(true)}
          >
            🔔 إشعارات
          </Button>
          
          <Button 
            className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2"
            onClick={() => setShowFriends(true)}
          >
            👥 الأصدقاء
            <FriendRequestBadge currentUser={chat.currentUser} />
          </Button>

          <Button 
            className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2"
            onClick={() => setShowMessages(true)}
          >
            ✉️ الرسائل
          </Button>
          
          {chat.currentUser && (chat.currentUser.userType === 'owner' || chat.currentUser.userType === 'admin') && (
            <>
              <Button 
                className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2"
                onClick={() => setShowModerationPanel(true)}
              >
                🛡️ إدارة
              </Button>
              
              <StealthModeToggle currentUser={chat.currentUser} />
              
              <Button 
                className="glass-effect px-4 py-2 rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center gap-2"
                onClick={() => setShowReportsLog(true)}
              >
                ⚠️ البلاغات
              </Button>
              
              <Button 
                className="glass-effect px-4 py-2 rounded-lg hover:bg-yellow-600 transition-all duration-200 flex items-center gap-2"
                onClick={() => setShowActiveActions(true)}
              >
                🔒 الإجراءات النشطة
              </Button>

              {chat.currentUser?.userType === 'owner' && (
                <Button 
                  className="glass-effect px-4 py-2 rounded-lg hover:bg-blue-600 transition-all duration-200 flex items-center gap-2"
                  onClick={() => setShowPromotePanel(true)}
                >
                  👑 ترقية المستخدمين
                </Button>
              )}
            </>
          )}

          {chat.currentUser && chat.currentUser.userType === 'owner' && (
            <Button 
              className="glass-effect px-4 py-2 rounded-lg hover:bg-purple-600 transition-all duration-200 flex items-center gap-2"
              onClick={() => setShowOwnerPanel(true)}
            >
              👑 إدارة المالك
            </Button>
          )}
          
          <Button 
            className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2"
            onClick={() => setShowSettings(!showSettings)}
          >
            ⚙️ إعدادات
          </Button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        <UserSidebar 
          users={chat.onlineUsers}
          onUserClick={handleUserClick}
          currentUser={chat.currentUser}
        />
        <div className="flex flex-col flex-1 min-w-0">
          <NewMessageArea
            messages={chat.publicMessages}
            onUserClick={handleUserClick}
            onReportMessage={handleReportUser}
            typingUsers={chat.typingUsers}
          />
          <MessageInputArea
            onSendMessage={chat.sendPublicMessage}
            onTyping={chat.sendTyping}
            currentUser={chat.currentUser}
            disabled={chat.currentUser?.isMuted}
          />
        </div>
      </main>

      {/* Modals */}
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
          onIgnore={() => {}}
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
          onStartConversation={setSelectedPrivateUser}
        />
      )}

      {showMessages && (
        <MessagesPanel
          isOpen={showMessages}
          onClose={() => setShowMessages(false)}
          currentUser={chat.currentUser}
          onStartConversation={setSelectedPrivateUser}
        />
      )}

      {showModerationPanel && (
        <ModerationPanel
          isOpen={showModerationPanel}
          onClose={() => setShowModerationPanel(false)}
          currentUser={chat.currentUser}
        />
      )}

      {showOwnerPanel && (
        <OwnerAdminPanel
          isOpen={showOwnerPanel}
          onClose={() => setShowOwnerPanel(false)}
          currentUser={chat.currentUser}
        />
      )}

      {showReportsLog && (
        <ReportsLog
          isOpen={showReportsLog}
          onClose={() => setShowReportsLog(false)}
          currentUser={chat.currentUser}
        />
      )}

      {showActiveActions && (
        <ActiveModerationLog
          isOpen={showActiveActions}
          onClose={() => setShowActiveActions(false)}
          currentUser={chat.currentUser}
        />
      )}

      {showPromotePanel && (
        <PromoteUserPanel
          isOpen={showPromotePanel}
          onClose={() => setShowPromotePanel(false)}
          currentUser={chat.currentUser}
        />
      )}

      {chat.kickNotification?.show && (
        <KickNotification
          isVisible={chat.kickNotification.show}
          duration={chat.kickNotification.duration}
          onClose={() => {}}
        />
      )}

      {chat.blockNotification?.show && (
        <BlockNotification
          isVisible={chat.blockNotification.show}
          reason={chat.blockNotification.reason}
          onClose={() => {}}
        />
      )}
    </div>
  );
}