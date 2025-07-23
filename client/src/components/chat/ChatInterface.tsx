import { useState, useEffect } from 'react';
import UserSidebarWithWalls from './UserSidebarWithWalls';
import MessageArea from './MessageArea';
import ProfileModal from './ProfileModal';
import ViewProfileModal from './ViewProfileModal';
import PrivateMessageBox from './PrivateMessageBox';
import UserPopup from './UserPopup';
import SettingsMenu from './SettingsMenu';
import ReportModal from './ReportModal';
import AdminReportsPanel from './AdminReportsPanel';
import NotificationPanel from './NotificationPanel';
import FriendsPanel from './FriendsPanelSimple';
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
import WelcomeNotification from './WelcomeNotification';
import ThemeSelector from './ThemeSelector';

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
  const [profileUser, setProfileUser] = useState<ChatUser | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPrivateUser, setSelectedPrivateUser] = useState<ChatUser | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAdminReports, setShowAdminReports] = useState(false);
  const [activeView, setActiveView] = useState<'hidden' | 'users' | 'walls'>('users'); // إظهار المستخدمين افتراضياً

  const [showNotifications, setShowNotifications] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);
  const [showReportsLog, setShowReportsLog] = useState(false);
  const [showActiveActions, setShowActiveActions] = useState(false);
  const [showPromotePanel, setShowPromotePanel] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);


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
    setProfileUser(user);
    setShowProfile(true);
    closeUserPopup();
  };

  // معالج للروابط الشخصية
  const handleProfileLink = (userId: number) => {
    const user = chat.onlineUsers.find(u => u.id === userId);
    if (user) {
      setProfileUser(user);
      setShowProfile(true);
    } else {
      toast({
        title: "مستخدم غير موجود",
        description: "لم نتمكن من العثور على هذا المستخدم",
        variant: "destructive"
      });
    }
  };

  // تفعيل نظام الروابط الشخصية
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/#id(\d+)/);
      if (match) {
        const userId = parseInt(match[1]);
        handleProfileLink(userId);
        // إزالة الهاش من العنوان
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    // فحص الهاش عند تحميل الصفحة
    handleHashChange();
    
    // مراقبة تغييرات الهاش
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [chat.onlineUsers]);

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
      <div className="h-screen flex flex-col" onClick={closeUserPopup}>
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-50 to-blue-50 py-2 px-4 flex justify-between items-center shadow-2xl border-b-2 border-purple-200">
        <div className="flex items-center gap-3">
          {/* زر الحوائط في الزاوية اليسرى */}
          <Button 
            className={`px-2 py-1 rounded-xl transition-all duration-200 flex items-center gap-2 border ${
              activeView === 'walls' ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-white/50 hover:bg-purple-50 border-purple-200 text-purple-700'
            }`}
            onClick={() => setActiveView(activeView === 'walls' ? 'hidden' : 'walls')}
            title="الحوائط"
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-4 h-0.5 bg-current"></div>
              <div className="w-4 h-0.5 bg-current"></div>
              <div className="w-4 h-0.5 bg-current"></div>
            </div>
            الحوائط
          </Button>
          
          {/* زر المستخدمين */}
          <Button 
            className={`px-2 py-1 rounded-xl transition-all duration-200 flex items-center gap-2 border ${
              activeView === 'users' ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-white/50 hover:bg-purple-50 border-purple-200 text-purple-700'
            }`}
            onClick={() => setActiveView(activeView === 'users' ? 'hidden' : 'users')}
            title="المستخدمون المتصلون"
          >
            <span>👥</span>
            المستخدمون ({chat.onlineUsers.filter(u => u.isOnline).length})
          </Button>
          <div className="text-xl">💬</div>
          <div className="text-xl font-bold text-purple-800">
            Arabic<span className="text-purple-600">Chat</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            className="px-3 py-1 rounded-xl bg-white/50 hover:bg-purple-50 border border-purple-200 text-purple-700 transition-all duration-200 flex items-center gap-2 relative"
            onClick={() => setShowNotifications(true)}
          >
            <span>🔔</span>
            إشعارات
          </Button>
          
          <Button 
            className="px-3 py-1 rounded-xl bg-white/50 hover:bg-purple-50 border border-purple-200 text-purple-700 transition-all duration-200 flex items-center gap-2 relative"
            onClick={() => setShowFriends(true)}
          >
            <span>👥</span>
            الأصدقاء
            {/* تنبيه طلبات الصداقة */}
            <FriendRequestBadge currentUser={chat.currentUser} />
          </Button>

          <Button 
            className="px-3 py-1 rounded-xl bg-white/50 hover:bg-purple-50 border border-purple-200 text-purple-700 transition-all duration-200 flex items-center gap-2"
            onClick={() => setShowMessages(true)}
            title="الرسائل"
          >
            <span>✉️</span>
            الرسائل
          </Button>
          
          {/* زر لوحة الإدارة للمشرفين */}
          {chat.currentUser && (chat.currentUser.userType === 'owner' || chat.currentUser.userType === 'admin') && (
            <>
              <Button 
                className="px-3 py-1 rounded-xl bg-white/50 hover:bg-purple-50 border border-purple-200 text-purple-700 transition-all duration-200 flex items-center gap-2"
                onClick={() => setShowModerationPanel(true)}
              >
                <span>🛡️</span>
                إدارة
              </Button>
              
              <StealthModeToggle currentUser={chat.currentUser} />
              
              <Button 
                className="px-3 py-1 rounded-xl bg-red-50 hover:bg-red-100 border border-red-300 text-red-700 transition-all duration-200 flex items-center gap-2 relative"
                onClick={() => setShowReportsLog(true)}
              >
                <span>⚠️</span>
                سجل البلاغات
              </Button>
              
              <Button 
                className="px-3 py-1 rounded-xl bg-yellow-50 hover:bg-yellow-100 border border-yellow-300 text-yellow-700 transition-all duration-200 flex items-center gap-2"
                onClick={() => setShowActiveActions(true)}
              >
                <span>🔒</span>
                سجل الإجراءات النشطة
              </Button>

              {/* زر ترقية المستخدمين - للمالك فقط */}
              {chat.currentUser?.userType === 'owner' && (
                <Button 
                  className="px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-700 transition-all duration-200 flex items-center gap-2"
                  onClick={() => setShowPromotePanel(true)}
                >
                  <span>👑</span>
                  ترقية المستخدمين
                </Button>
              )}
            </>
          )}

          {/* زر خاص بالمالك فقط */}
          {chat.currentUser && chat.currentUser.userType === 'owner' && (
            <Button 
              className="px-3 py-1 rounded-xl bg-purple-100 hover:bg-purple-200 border border-purple-400 text-purple-800 transition-all duration-200 flex items-center gap-2"
              onClick={() => setShowOwnerPanel(true)}
            >
              <span>👑</span>
              إدارة المالك
            </Button>
          )}
          
          <Button 
            className="px-3 py-1 rounded-xl bg-white/50 hover:bg-purple-50 border border-purple-200 text-purple-700 transition-all duration-200 flex items-center gap-2"
            onClick={() => setShowSettings(!showSettings)}
          >
            <span>⚙️</span>
            إعدادات
          </Button>



        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* الشريط الجانبي - يظهر فقط عندما يكون activeView ليس 'hidden' */}
        {activeView !== 'hidden' && (
          <div className={`${activeView === 'walls' ? 'w-96' : 'w-64'} transition-all duration-300`}>
            <UserSidebarWithWalls 
              users={chat.onlineUsers}
              onUserClick={handleUserClick}
              currentUser={chat.currentUser}
              activeView={activeView}
            />
          </div>
        )}
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
        <>
          {profileUser && profileUser.id !== chat.currentUser?.id ? (
            <ViewProfileModal
              user={profileUser}
              currentUser={chat.currentUser}
              onClose={() => {
                setShowProfile(false);
                setProfileUser(null);
              }}
              onIgnoreUser={(userId) => {
                chat.ignoreUser(userId);
              }}
              onPrivateMessage={handlePrivateMessage}
              onAddFriend={handleAddFriend}
            />
          ) : (
            <ProfileModal 
              user={profileUser || chat.currentUser}
              currentUser={chat.currentUser}
              onClose={() => {
                setShowProfile(false);
                setProfileUser(null);
              }}
              onIgnoreUser={(userId) => {
                chat.ignoreUser(userId);
              }}
            />
          )}
        </>
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
            onOpenThemeSelector={() => {
              setShowThemeSelector(true);
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

      {showThemeSelector && (
        <ThemeSelector
          isOpen={showThemeSelector}
          onClose={() => setShowThemeSelector(false)}
          currentUser={chat.currentUser}
          onThemeUpdate={(theme) => {
            console.log('تم تحديث الثيم إلى:', theme);
          }}
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

      {/* إشعار الترحيب */}
      {chat.currentUser && <WelcomeNotification user={chat.currentUser} />}

    </div>
  );
}
