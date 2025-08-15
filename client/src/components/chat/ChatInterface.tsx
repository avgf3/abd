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
import MessagesPanel from './MessagesPanel';
import UsernameColorPicker from '@/components/profile/UsernameColorPicker';


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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Menu, Settings, Bell, MessageSquare, MessageCircle, Crown, Shield, AlertTriangle, Eye, EyeOff, Lock } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const [activeView, setActiveView] = useState<'hidden' | 'users' | 'walls' | 'rooms' | 'friends'>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'hidden' : 'users'));
  const isMobile = useIsMobile();
  const [showAddRoomDialog, setShowAddRoomDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomImage, setNewRoomImage] = useState<File | null>(null);
  
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
  
  const submitNewRoom = useCallback(async () => {
    await handleAddRoom({ name: newRoomName, description: newRoomDescription, image: newRoomImage });
    setShowAddRoomDialog(false);
    setNewRoomName('');
    setNewRoomDescription('');
    setNewRoomImage(null);
  }, [handleAddRoom, newRoomName, newRoomDescription, newRoomImage]);
  
  const [showNotifications, setShowNotifications] = useState(false);

  const [showMessages, setShowMessages] = useState(false);
  const [showPmBox, setShowPmBox] = useState(false);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);
  const [showReportsLog, setShowReportsLog] = useState(false);
  const [showActiveActions, setShowActiveActions] = useState(false);
  const [showPromotePanel, setShowPromotePanel] = useState(false);
  const [showIgnoredUsers, setShowIgnoredUsers] = useState(false);
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
    closeUserPopup();
    setShowPmBox(true);
  };

  useEffect(() => {
    if (showPmBox && selectedPrivateUser && (chat as any).loadPrivateConversation) {
      (chat as any).loadPrivateConversation(selectedPrivateUser.id, 50);
    }
  }, [showPmBox, selectedPrivateUser]);

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
    showSuccessToast(`تم تجاهل ${user.username}. لن ترى رسائله العامة أو الخاصة ولن يستطيع إرسال طلب صداقة لك.`, "تم التجاهل");
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
      const profileMatch = hash.match(/#id(\d+)/);
      const pmMatch = hash.match(/#pm(\d+)/);
      if (profileMatch) {
        const userId = parseInt(profileMatch[1]);
        handleProfileLink(userId);
        window.history.replaceState(null, '', window.location.pathname);
      } else if (pmMatch) {
        const userId = parseInt(pmMatch[1]);
        const openPm = async () => {
          let user = chat.onlineUsers.find(u => u.id === userId);
          if (!user) {
            try {
              const data = await apiRequest(`/api/users/${userId}?t=${Date.now()}`);
              if (data && data.id) {
                user = data as any;
              }
            } catch {}
          }
          if (user) {
            setSelectedPrivateUser(user);
            setShowPmBox(true);
          } else {
            showErrorToast("لم نتمكن من العثور على هذا المستخدم", "مستخدم غير موجود");
          }
          window.history.replaceState(null, '', window.location.pathname);
        };
        openPm();
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
      <div className="min-h-[100dvh] flex flex-col" onClick={closeUserPopup}>
      {/* Header - بدون التبويبات الأربعة */}
      <header className="sticky top-0 z-40 bg-secondary py-1.5 px-3 sm:py-2 sm:px-6 flex flex-wrap gap-2 justify-between items-center shadow-2xl border-b border-accent">
        <div className="flex gap-3 overflow-x-auto max-w-full pr-2">
          <Button
            className="glass-effect px-3 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4" />
            إعدادات
          </Button>

          {/* قائمة ثلاث شرائط للمالك */}
          {chat.currentUser && chat.currentUser.userType === 'owner' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="glass-effect px-3 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2">
                  <Menu className="w-5 h-5" />
                  المزيد
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8}>
                <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowAddRoomDialog(true)}>
                  إضافة غرفة جديدة
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* زر خاص بالمالك فقط */}
          {chat.currentUser && chat.currentUser.userType === 'owner' && (
            <Button 
              className="glass-effect px-4 py-2 rounded-lg hover:bg-purple-600 transition-all duration-200 flex items-center gap-2 border border-purple-400"
              onClick={() => setShowOwnerPanel(true)}
            >
              <Crown className="w-4 h-4" />
              إدارة المالك
            </Button>
          )}
          
          {/* زر لوحة الإدارة للمشرفين */}
          {chat.currentUser && (chat.currentUser.userType === 'owner' || chat.currentUser.userType === 'admin') && (
            <>
              {/* زر ترقية المستخدمين - للمالك فقط */}
              {chat.currentUser?.userType === 'owner' && (
                <Button 
                  className="glass-effect px-4 py-2 rounded-lg hover:bg-blue-600 transition-all duration-200 flex items-center gap-2"
                  onClick={() => setShowPromotePanel(true)}
                >
                  <Crown className="w-4 h-4" />
                  ترقية المستخدمين
                </Button>
              )}

              <Button 
                className="glass-effect px-4 py-2 rounded-lg hover:bg-yellow-600 transition-all duration-200 flex items-center gap-2 border border-yellow-400"
                onClick={() => setShowActiveActions(true)}
              >
                <Lock className="w-4 h-4" />
                سجل الإجراءات النشطة
              </Button>
              
              <Button 
                className="glass-effect px-4 py-2 rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center gap-2 border border-red-400 relative"
                onClick={() => setShowReportsLog(true)}
              >
                <AlertTriangle className="w-4 h-4" />
                سجل البلاغات
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
                {chat.currentUser?.isHidden ? (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>إظهار</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4" />
                    <span>إخفاء</span>
                  </>
                )}
              </Button>
              
              <Button 
                className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2"
                onClick={() => setShowModerationPanel(true)}
              >
                <Shield className="w-4 h-4" />
                إدارة
              </Button>
            </>
          )}

          <Button 
            className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2"
            onClick={() => setShowMessages(true)}
            title="الرسائل"
          >
            <MessageSquare className="w-4 h-4" />
            الرسائل
          </Button>
          
          <Button 
            className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2 relative"
            onClick={() => setShowNotifications(true)}
          >
            <Bell className="w-4 h-4" />
            إشعارات
          </Button>

          {/* الشعار بجانب الإشعارات */}
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => { if (isMobile) setActiveView('hidden'); }}>
            <MessageCircle className="w-5 h-5 text-primary" />
            <div className="text-lg sm:text-xl font-bold text-white truncate">
              Arabic<span className="text-primary">Chat</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content - تحسين التخطيط لمنع التداخل */}
      <main className="flex flex-1 overflow-hidden min-h-0 flex-col sm:flex-row" style={{ paddingBottom: '80px' }}>
        {/* الشريط الجانبي - على الجوال يعرض بملء الشاشة عند اختيار التبويب */}
        {activeView !== 'hidden' && (
          <div className={`${isMobile ? 'w-full flex-1 min-h-0' : activeView === 'walls' ? 'w-full sm:w-96' : activeView === 'friends' ? 'w-full sm:w-80' : 'w-full sm:w-64'} max-w-full sm:shrink-0 transition-all duration-300 min-h-0 flex flex-col`} style={{ maxHeight: 'calc(100vh - 160px)' }}>
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
              onStartPrivateChat={(user) => {
                setSelectedPrivateUser(user);
                setShowPmBox(true);
              }}
            />
          </div>
        )}
                {(!isMobile || activeView === 'hidden') ? (() => {
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
                   handleTyping: () => chat.sendTyping(),
                   addBroadcastMessageHandler: (handler: (data: any) => void) => chat.addBroadcastMessageHandler?.(handler),
                   removeBroadcastMessageHandler: (handler: (data: any) => void) => chat.removeBroadcastMessageHandler?.(handler),
                   sendWebRTCIceCandidate: (toUserId: number, roomId: string, candidate: RTCIceCandidateInit) => chat.sendWebRTCIceCandidate?.(toUserId, roomId, candidate),
                   sendWebRTCOffer: (toUserId: number, roomId: string, offer: RTCSessionDescriptionInit) => chat.sendWebRTCOffer?.(toUserId, roomId, offer),
                   sendWebRTCAnswer: (toUserId: number, roomId: string, answer: RTCSessionDescriptionInit) => chat.sendWebRTCAnswer?.(toUserId, roomId, answer),
                   onWebRTCOffer: (handler: (payload: any) => void) => chat.onWebRTCOffer?.(handler),
                   offWebRTCOffer: (handler: (payload: any) => void) => chat.offWebRTCOffer?.(handler),
                   onWebRTCIceCandidate: (handler: (payload: any) => void) => chat.onWebRTCIceCandidate?.(handler),
                   offWebRTCIceCandidate: (handler: (payload: any) => void) => chat.offWebRTCIceCandidate?.(handler),
                   onWebRTCAnswer: (handler: (payload: any) => void) => chat.onWebRTCAnswer?.(handler),
                   offWebRTCAnswer: (handler: (payload: any) => void) => chat.offWebRTCAnswer?.(handler),
                 }}
               />
            );
          }
          
                      // وإلا استخدم MessageArea العادية مع حماية من التداخل
            return (
              <div className="flex-1 flex flex-col min-h-0 relative" style={{ maxHeight: 'calc(100vh - 160px)' }}>
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
                  currentRoomId={chat.currentRoomId}
                  ignoredUserIds={chat.ignoredUsers}
                />
              </div>
            );
         })() : null}
       </main>

      {/* Footer - تبويبات سفلية محسنة لتجنب التداخل مع منطقة الإرسال */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 bg-secondary py-1.5 px-3 sm:py-2 sm:px-6 flex justify-start items-center shadow-2xl border-t border-accent" style={{ transform: 'translateY(-80px)' }}>
        <div className="flex gap-2 sm:gap-3 overflow-x-auto max-w-full">
          {/* الحوائط */}
                     <Button 
             className={`${'glass-effect px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 '}${
               activeView === 'walls' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
             }`}
             onClick={() => setActiveView(prev => (prev === 'walls' ? 'hidden' : 'walls'))}
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
             className={`${'glass-effect px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 '}${
               activeView === 'users' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
             }`}
             onClick={() => setActiveView(prev => (prev === 'users' ? 'hidden' : 'users'))}
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
            className={`${'glass-effect px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 '}${
              activeView === 'rooms' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            onClick={() => setActiveView(prev => (prev === 'rooms' ? 'hidden' : 'rooms'))}
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
            className={`${'glass-effect px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 '}${
              activeView === 'friends' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            onClick={() => setActiveView(prev => (prev === 'friends' ? 'hidden' : 'friends'))}
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
              onReportUser={(u) => handleReportUser(u)}
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
              onReportUser={(u) => handleReportUser(u)}
            />
          )}
        </>
      )}

      {/* Dialog: إضافة غرفة جديدة */}
      <Dialog open={showAddRoomDialog} onOpenChange={setShowAddRoomDialog}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>إضافة غرفة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="room-name">اسم الغرفة</Label>
              <Input id="room-name" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="مثال: الدردشة العامة 2" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="room-desc">الوصف</Label>
              <Textarea id="room-desc" value={newRoomDescription} onChange={(e) => setNewRoomDescription(e.target.value)} placeholder="نبذة قصيرة عن الغرفة" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="room-image">صورة الغرفة (اختياري)</Label>
              <Input id="room-image" type="file" accept="image/*" onChange={(e) => setNewRoomImage(e.target.files?.[0] || null)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowAddRoomDialog(false)}>إلغاء</Button>
              <Button onClick={submitNewRoom} disabled={!newRoomName.trim()}>حفظ</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* لوحة الرسائل */}
      {showMessages && (
        <MessagesPanel
          isOpen={showMessages}
          onClose={() => setShowMessages(false)}
          currentUser={chat.currentUser}
          privateConversations={chat.privateConversations}
          onlineUsers={chat.onlineUsers}
          onStartPrivateChat={(user) => { setShowMessages(false); setSelectedPrivateUser(user); setShowPmBox(true); }}
        />
      )}

      {/* صندوق الرسائل الخاصة */}
      {showPmBox && selectedPrivateUser && (
        <PrivateMessageBox
          isOpen={showPmBox}
          onClose={() => setShowPmBox(false)}
          user={selectedPrivateUser}
          currentUser={chat.currentUser}
          messages={chat.privateConversations[selectedPrivateUser.id] || []}
          onSendMessage={(content) => chat.sendMessage(content, 'text', selectedPrivateUser.id)}
        />
      )}


      {userPopup.show && userPopup.user && (
        <UserPopup
          user={userPopup.user}
          x={userPopup.x}
          y={userPopup.y}
          onPrivateMessage={() => { closeUserPopup(); setTimeout(() => handlePrivateMessage(userPopup.user!), 0); }}
          onAddFriend={() => handleAddFriend(userPopup.user!)}
          onIgnore={() => {
            handleIgnoreUser(userPopup.user!);
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
            onOpenIgnoredUsers={() => {
              setShowIgnoredUsers(true);
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
            if (chat.updateCurrentUser) {
              chat.updateCurrentUser({ userTheme: theme });
            }
          }}
        />
      )}

      {showUsernameColorPicker && chat.currentUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-md w-full">
            <button
              onClick={() => setShowUsernameColorPicker(false)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-red-600"
              aria-label="إغلاق"
            >
              ×
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

      {showIgnoredUsers && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">المستخدمون المتجاهلون</h3>
          <button
            onClick={() => setShowIgnoredUsers(false)}
            className="text-gray-500 hover:text-gray-700"
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {Array.from(chat.ignoredUsers || []).map((id) => {
            const u = chat.onlineUsers.find(u => u.id === id);
            return (
              <div key={id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  {u ? (
                    <ProfileImage user={u} size="small" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">?</div>
                  )}
                  <span className="font-medium">{u ? u.username : `مستخدم غير متصل #${id}`}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => chat.unignoreUser?.(id)}>إلغاء التجاهل</Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  )}

    </div>
  );
}
