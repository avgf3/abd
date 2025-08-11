import { useState, useEffect, useCallback } from 'react';
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
import UsernameColorPicker from '@/components/profile/UsernameColorPicker';

import MessagesPanel from './MessagesPanel';
import MessageAlert from './MessageAlert';
import ModerationPanel from './ModerationPanel';
import ReportsLog from '../moderation/ReportsLog';
import ActiveModerationLog from '../moderation/ActiveModerationLog';
import KickCountdown from '@/components/moderation/KickCountdown';
import BlockNotification from '../moderation/BlockNotification';
import PromoteUserPanel from '../moderation/PromoteUserPanel';
import OwnerAdminPanel from './OwnerAdminPanel';
import ProfileImage from './ProfileImage';
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
  
  // 🚀 إدارة الغرف عبر hook موحّد محسن
  const {
    rooms,
    loading: roomsLoading,
    fetchRooms,
    addRoom: addRoomViaManager,
    deleteRoom: deleteRoomViaManager,
    isFetching
  } = useRoomManager({ 
    autoRefresh: false, // تحديث يدوي فقط
    cacheTimeout: 10 * 60 * 1000 // 10 دقائق cache
  });

  // 🚀 دوال إدارة الغرف المحسنة
  const handleRoomChange = useCallback(async (roomId: string) => {
    chat.joinRoom(roomId);
  }, [chat]);

  // دالة تحديث الغرف مع منع التكرار
  const handleRefreshRooms = useCallback(async () => {
    if (isFetching) {
      return;
    }
    
    await fetchRooms(true); // فرض التحديث
  }, [fetchRooms, isFetching]);



  // ➕ إضافة غرفة جديدة مع منع التكرار
  const handleAddRoom = useCallback(async (roomData: { name: string; description: string; image: File | null }) => {
    if (!chat.currentUser) return;
    
    try {
      const newRoom = await addRoomViaManager({ ...roomData }, chat.currentUser.id);
      if (newRoom) {
        showSuccessToast(`تم إنشاء غرفة "${roomData.name}" بنجاح`, 'تم إنشاء الغرفة');
      }
    } catch (error) {
      console.error('خطأ في إنشاء الغرفة:', error);
      showErrorToast('فشل في إنشاء الغرفة', 'خطأ');
    }
  }, [chat.currentUser, addRoomViaManager, showSuccessToast, showErrorToast]);

  // ❌ حذف غرفة مع منع التكرار
  const handleDeleteRoom = useCallback(async (roomId: string) => {
    if (!chat.currentUser) return;
    
    try {
      const ok = await deleteRoomViaManager(roomId, chat.currentUser.id);
      if (ok) {
        // الانتقال للغرفة العامة إذا تم حذف الغرفة الحالية
        if (chat.currentRoomId === roomId) {
          chat.joinRoom('general');
        }
        showSuccessToast('تم حذف الغرفة بنجاح', 'تم حذف الغرفة');
      }
    } catch (error) {
      console.error('خطأ في حذف الغرفة:', error);
      showErrorToast('فشل في حذف الغرفة', 'خطأ');
    }
  }, [chat, deleteRoomViaManager, showSuccessToast, showErrorToast]);

  const [showNotifications, setShowNotifications] = useState(false);

  const [showMessages, setShowMessages] = useState(false);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);
  const [showReportsLog, setShowReportsLog] = useState(false);
  const [showActiveActions, setShowActiveActions] = useState(false);
  const [showPromotePanel, setShowPromotePanel] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showUsernameColorPicker, setShowUsernameColorPicker] = useState(false);
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
    // تحميل سجل الرسائل الخاصة عند فتح الصندوق
    try {
      chat.loadPrivateConversation(user.id);
    } catch {}
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
              
              <Button 
                className="glass-effect px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 border"
                onClick={async () => {
                  if (!chat.currentUser) return;
                  try {
                    const endpoint = chat.currentUser.isHidden ? `/api/users/${chat.currentUser.id}/show-online` : `/api/users/${chat.currentUser.id}/hide-online`;
                    const res = await apiRequest(endpoint, { method: 'POST' });
                    const nowHidden = (res as any)?.isHidden ?? !chat.currentUser.isHidden;
                    // تحديث محلي بسيط لحالة المستخدم الحالي
                    (chat.currentUser as any).isHidden = nowHidden;
                  } catch (e) {
                    console.error(e);
                  }
                }}
                title="إخفائي من قائمة المتصلين للجميع"
              >
                <span>{chat.currentUser?.isHidden ? '👁️ إظهار' : '🕵️ إخفاء'}</span>
              </Button>
              
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
      <main className="flex flex-1 overflow-hidden min-h-0">
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
              onRefreshRooms={handleRefreshRooms}
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
                 onTyping={(_isTyping) => chat.sendTyping()}
                 typingUsers={Array.from(chat.typingUsers)}
                 onReportMessage={handleReportUser}
                 onUserClick={handleUserClick}
                 messages={chat.publicMessages}
                 chat={{
                   sendPublicMessage: (content: string) => chat.sendRoomMessage(content, chat.currentRoomId),
                   handleTyping: () => chat.sendTyping()
                 }}
               />
            );
          }
          
          // وإلا استخدم MessageArea العادية
          return (
            <MessageArea 
              messages={chat.publicMessages}
              currentUser={chat.currentUser}
              onSendMessage={(content) => chat.sendRoomMessage(content, chat.currentRoomId)}
              onTyping={() => chat.sendTyping()}
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
      <footer className="bg-secondary py-4 px-6 flex justify-end items-center shadow-2xl border-t border-accent">
        <div className="flex gap-3">
          {/* الحوائط */}
          <Button 
            className={`glass-effect px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeView === 'walls' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            onClick={() => setActiveView(activeView === 'walls' ? 'hidden' : 'walls')}
            title="الحوائط"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Walls">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            الحوائط
          </Button>
          
          {/* المستخدمون */}
          <Button 
            className={`glass-effect px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeView === 'users' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            onClick={() => setActiveView(activeView === 'users' ? 'hidden' : 'users')}
            title="المستخدمون المتصلون"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Users">
              <circle cx="9" cy="7" r="3"></circle>
              <path d="M2 21c0-3.314 2.686-6 6-6h2c3.314 0 6 2.686 6 6"></path>
              <circle cx="17" cy="7" r="3"></circle>
              <path d="M14 21c0-1.657 1.343-3 3-3h1c1.657 0 3 1.343 3 3"></path>
            </svg>
            المستخدمون ({chat.onlineUsers?.length ?? 0})
          </Button>

          {/* الغرف */}
          <Button 
            className={`glass-effect px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeView === 'rooms' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            onClick={() => setActiveView(activeView === 'rooms' ? 'hidden' : 'rooms')}
            title="الغرف"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Rooms">
              <path d="M3 11l9-8 9 8"></path>
              <path d="M5 10v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9"></path>
              <path d="M9 21v-6h6v6"></path>
            </svg>
            الغرف
          </Button>

          {/* الأصدقاء */}
          <Button 
            className={`glass-effect px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeView === 'friends' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            onClick={() => setActiveView(activeView === 'friends' ? 'hidden' : 'friends')}
            title="الأصدقاء"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Friends">
              <circle cx="9" cy="7" r="3"></circle>
              <path d="M2 21c0-3.314 2.686-6 6-6h2c3.314 0 6 2.686 6 6"></path>
              <path d="M19 8v6"></path>
              <path d="M16 11h6"></path>
            </svg>
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
            onOpenUsernameColorPicker={() => {
              setShowUsernameColorPicker(true);
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

      {/* ⚠️ لوحة الإدارة - إزالة التكرار */}
      {showModerationPanel && (
        <ModerationPanel
          isOpen={showModerationPanel}
          onClose={() => setShowModerationPanel(false)}
          currentUser={chat.currentUser}
          onlineUsers={chat.onlineUsers}
        />
      )}

      {/* 👑 لوحة المالك */}
      {showOwnerPanel && (
        <OwnerAdminPanel 
          isOpen={showOwnerPanel}
          onClose={() => setShowOwnerPanel(false)}
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

      {showUsernameColorPicker && chat.currentUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-md w-full">
            <button
              onClick={() => setShowUsernameColorPicker(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 text-xl"
            >
              ✕ إغلاق
            </button>
            <UsernameColorPicker
              currentUser={chat.currentUser}
              onColorUpdate={(color) => {
                // تحديث اللون محلياً
                chat.updateCurrentUser({ ...chat.currentUser, usernameColor: color });
                setShowUsernameColorPicker(false);
              }}
            />
          </div>
        </div>
      )}

      {/* إشعارات الطرد والحجب */}
      {chat.showKickCountdown && (
        <KickCountdown
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
