import { useState, useEffect } from 'react';
import UnifiedSidebar from './UserSidebarWithWalls';
import MessageArea from './MessageArea';
import BroadcastRoomInterface from './BroadcastRoomInterface';
import ProfileModal from './ProfileModal';
import PrivateMessageBox from './PrivateMessageBox';
import UserPopup from './UserPopup';
import SettingsMenu from './SettingsMenu';
import ReportModal from './ReportModal';
import AdminReportsPanel from './AdminReportsPanel';
import NotificationPanel from './NotificationPanel';

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
// import RoomComponent from './RoomComponent';
import { useRoomManager } from '@/hooks/useRoomManager';

import { Button } from '@/components/ui/button';
import { useNotificationManager } from '@/hooks/useNotificationManager';
import { apiRequest } from '@/lib/queryClient';
import type { useChat } from '@/hooks/useChat';
import type { ChatUser, ChatRoom } from '@/types/chat';

interface ChatInterfaceProps {
  chat: ReturnType<typeof useChat>;
  onLogout: () => void;
}

export default function ChatInterface({ chat, onLogout }: ChatInterfaceProps) {
  const { showSuccessToast, showErrorToast } = useNotificationManager(chat.currentUser);
  const [showProfile, setShowProfile] = useState(false);
  const [profileUser, setProfileUser] = useState<ChatUser | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPrivateUser, setSelectedPrivateUser] = useState<ChatUser | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAdminReports, setShowAdminReports] = useState(false);
  const [activeView, setActiveView] = useState<'hidden' | 'users' | 'walls' | 'rooms' | 'friends'>('users'); // إظهار المستخدمين افتراضياً
  
  // إدارة الغرف عبر hook موحّد
  const {
    rooms,
    loading: roomsLoading,
    fetchRooms,
    addRoom: addRoomViaManager,
    deleteRoom: deleteRoomViaManager
  } = useRoomManager({ autoRefresh: false });

  // دوال إدارة الغرف
  const handleRoomChange = async (roomId: string) => {
    chat.joinRoom(roomId);
  };



  const handleAddRoom = async (roomData: { name: string; description: string; image: File | null }) => {
    if (!chat.currentUser) return;
    const newRoom = await addRoomViaManager({ ...roomData }, chat.currentUser.id);
    if (newRoom) {
      showSuccessToast(`تم إنشاء غرفة "${roomData.name}" بنجاح`, 'تم إنشاء الغرفة');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!chat.currentUser) return;
    const ok = await deleteRoomViaManager(roomId, chat.currentUser.id);
    if (ok) {
      if (chat.currentRoomId === roomId) chat.joinRoom('general');
      showSuccessToast('تم حذف الغرفة بنجاح', 'تم حذف الغرفة');
    } else {
      showErrorToast('حدث خطأ أثناء حذف الغرفة', 'خطأ في حذف الغرفة');
    }
  };

  const [showNotifications, setShowNotifications] = useState(false);

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

  // Auto-switch to friends tab when friend request is accepted
  useEffect(() => {
    const handleFriendRequestAccepted = (event: CustomEvent) => {
      setActiveView('friends');
    };

    window.addEventListener('friendRequestAccepted', handleFriendRequestAccepted as EventListener);
    return () => {
      window.removeEventListener('friendRequestAccepted', handleFriendRequestAccepted as EventListener);
    };
  }, []);
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
      const response = await apiRequest('/api/friend-requests', {
        method: 'POST',
        body: {
          senderId: chat.currentUser.id,
          receiverId: user.id,
        }
      });
      
      showSuccessToast(`تم إرسال طلب صداقة إلى ${user.username}`, "تمت الإضافة");
    } catch (error) {
      console.error('Friend request error:', error);
      showErrorToast(error instanceof Error ? error.message : "لم نتمكن من إرسال طلب الصداقة", "خطأ");
    }
    closeUserPopup();
  };

  const handleIgnoreUser = (user: ChatUser) => {
    chat.ignoreUser(user.id);
    showSuccessToast(`تم تجاهل المستخدم ${user.username} - لن ترى رسائله بعد الآن`, "تم التجاهل");
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
      showErrorToast("لم نتمكن من العثور على هذا المستخدم", "مستخدم غير موجود");
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
      {/* Header - بدون التبويبات الأربعة */}
      <header className="bg-secondary py-4 px-6 flex justify-between items-center shadow-2xl border-b border-accent">
        <div className="flex items-center gap-3">
          <div className="text-2xl">💬</div>
          <div className="text-2xl font-bold text-white">
            Arabic<span className="text-primary">Chat</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2 relative"
            onClick={() => setShowNotifications(true)}
          >
            <span>🔔</span>
            إشعارات
          </Button>
          
          <Button 
            className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2"
            onClick={() => setShowMessages(true)}
            title="الرسائل"
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="24" height="18" viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="20" width="110" height="60" fill="white" stroke="#444" strokeWidth="1.5"/>
                <polygon points="5,20 60,55 115,20" fill="white" stroke="#444" strokeWidth="1.5"/>
                <line x1="5" y1="20" x2="60" y2="55" stroke="#555" strokeWidth="1"/>
                <line x1="115" y1="20" x2="60" y2="55" stroke="#555" strokeWidth="1"/>
              </svg>
            </span>
            الرسائل
          </Button>
          
          {/* زر لوحة الإدارة للمشرفين */}
          {chat.currentUser && (chat.currentUser.userType === 'owner' || chat.currentUser.userType === 'admin') && (
            <>
              <Button 
                className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2"
                onClick={() => setShowModerationPanel(true)}
              >
                <span>🛡️</span>
                إدارة
              </Button>
              
              <StealthModeToggle currentUser={chat.currentUser} />
              
              <Button 
                className="glass-effect px-4 py-2 rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center gap-2 border border-red-400 relative"
                onClick={() => setShowReportsLog(true)}
              >
                <span>⚠️</span>
                سجل البلاغات
              </Button>
              
              <Button 
                className="glass-effect px-4 py-2 rounded-lg hover:bg-yellow-600 transition-all duration-200 flex items-center gap-2 border border-yellow-400"
                onClick={() => setShowActiveActions(true)}
              >
                <span>🔒</span>
                سجل الإجراءات النشطة
              </Button>

              {/* زر ترقية المستخدمين - للمالك فقط */}
              {chat.currentUser?.userType === 'owner' && (
                <Button 
                  className="glass-effect px-4 py-2 rounded-lg hover:bg-blue-600 transition-all duration-200 flex items-center gap-2"
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
              className="glass-effect px-4 py-2 rounded-lg hover:bg-purple-600 transition-all duration-200 flex items-center gap-2 border border-purple-400"
              onClick={() => setShowOwnerPanel(true)}
            >
              <span>👑</span>
              إدارة المالك
            </Button>
          )}
          
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
        {/* الشريط الجانبي - يظهر فقط عندما يكون activeView ليس 'hidden' */}
        {activeView !== 'hidden' && (
          <div className={`${activeView === 'walls' ? 'w-96' : activeView === 'friends' ? 'w-80' : 'w-64'} transition-all duration-300`}>
            <UnifiedSidebar 
              users={chat.onlineUsers}
              onUserClick={handleUserClick}
              currentUser={chat.currentUser}
              activeView={activeView}
              rooms={rooms}
              currentRoomId={chat.currentRoomId}
              onRoomChange={handleRoomChange}
              onAddRoom={handleAddRoom}
              onDeleteRoom={handleDeleteRoom}
              onRefreshRooms={fetchRooms}
              onStartPrivateChat={setSelectedPrivateUser}
            />
          </div>
        )}
        {(() => {
          const currentRoom = rooms.find(room => room.id === chat.currentRoomId);
          
          // إذا كانت الغرفة من نوع broadcast، استخدم BroadcastRoomInterface
          if (currentRoom?.isBroadcast) {
            return (
                            <BroadcastRoomInterface
                 currentUser={chat.currentUser}
                 room={currentRoom}
                 onlineUsers={chat.onlineUsers}
                 onSendMessage={(content) => chat.sendRoomMessage(content, chat.currentRoomId)}
                 onTyping={chat.handleTyping}
                 typingUsers={Array.from(chat.typingUsers)}
                 onReportMessage={handleReportUser}
                 onUserClick={handleUserClick}
                 messages={chat.getCurrentRoomMessages()}
                 chat={{
                   sendPublicMessage: (content: string) => chat.sendRoomMessage(content, chat.currentRoomId),
                   handleTyping: chat.handleTyping,
                   addBroadcastMessageHandler: chat.addBroadcastMessageHandler,
                   removeBroadcastMessageHandler: chat.removeBroadcastMessageHandler
                 }}
               />
            );
          }
          
          // وإلا استخدم MessageArea العادية
          return (
            <MessageArea 
              messages={chat.getCurrentRoomMessages()}
              currentUser={chat.currentUser}
              onSendMessage={(content) => chat.sendRoomMessage(content, chat.currentRoomId)}
              onTyping={chat.handleTyping}
              typingUsers={chat.typingUsers}
              onReportMessage={handleReportUser}
              onUserClick={handleUserClick}
              onlineUsers={chat.onlineUsers}
              currentRoomName={currentRoom?.name || 'الدردشة العامة'}
            />
          );
        })()}
      </main>

      {/* Footer - مع التبويبات الأربعة المنقولة */}
      <footer className="bg-secondary py-4 px-6 flex justify-between items-center shadow-2xl border-t border-accent">
        <div className="flex items-center gap-3">
          {/* مساحة فارغة في اليسار */}
        </div>
        <div className="flex gap-3">
          {/* التبويبات الأربعة المنقولة من الـ header */}
          <Button 
            className={`glass-effect px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeView === 'walls' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
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
          
          <Button 
            className={`glass-effect px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeView === 'users' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            onClick={() => setActiveView(activeView === 'users' ? 'hidden' : 'users')}
            title="المستخدمون المتصلون"
          >
            <span>👥</span>
            المستخدمون ({chat.onlineUsers?.length ?? 0})
          </Button>

          <Button 
            className={`glass-effect px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeView === 'rooms' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            onClick={() => setActiveView(activeView === 'rooms' ? 'hidden' : 'rooms')}
            title="الغرف"
          >
            <span>🏠</span>
            الغرف
          </Button>

          <Button 
            className={`glass-effect px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeView === 'friends' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            onClick={() => setActiveView(activeView === 'friends' ? 'hidden' : 'friends')}
            title="الأصدقاء"
          >
            <span>👨‍👩‍👧‍👦</span>
            الأصدقاء
          </Button>
        </div>
      </footer>

      {/* Modals and Popups */}
      {showProfile && (
        <>
          {profileUser && profileUser.id !== chat.currentUser?.id ? (
            <ProfileModal
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
            }}
        />
      )}

      {/* إشعارات الطرد والحجب */}
      {chat.showKickCountdown && (
        <KickNotification
          isVisible={chat.showKickCountdown}
          durationMinutes={15}
          onClose={() => chat.setShowKickCountdown(false)}
        />
      )}
      {/* إشعار الحجب (block) */}
      {chat.notifications && chat.notifications.some(n => n.type === 'moderation' && n.content.includes('حظر')) && (
        <BlockNotification
          isVisible={true}
          reason={chat.notifications.find(n => n.type === 'moderation' && n.content.includes('حظر'))?.content || ''}
          onClose={() => {}}
        />
      )}

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
