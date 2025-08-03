import { useState, useEffect, useCallback, useMemo } from 'react';
import UserSidebarWithWalls from './UserSidebarWithWalls';
import MessageArea from './MessageArea';
import BroadcastRoomInterface from './BroadcastRoomInterface';
import ProfileModal from './ProfileModal';
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
import RoomsPanel from './RoomsPanel';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { useChat } from '@/hooks/useChat';
import type { ChatUser, ChatRoom } from '@/types/chat';

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
  
  // إدارة موحدة للعرض النشط
  const [activeView, setActiveView] = useState<'hidden' | 'users' | 'walls' | 'rooms'>('users');
  
  // حالة الغرف
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState('general');
  const [roomsLoading, setRoomsLoading] = useState(true);
  
  // حالات أخرى
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [showReportsLog, setShowReportsLog] = useState(false);
  const [showActiveActions, setShowActiveActions] = useState(false);
  const [showPromotePanel, setShowPromotePanel] = useState(false);
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [newMessageAlert, setNewMessageAlert] = useState<{ show: boolean; sender: ChatUser | null }>({ show: false, sender: null });

  const { toast } = useToast();

  // جلب الغرف من الخادم
  const fetchRooms = useCallback(async () => {
    try {
      console.log('🔄 جلب الغرف من الخادم...');
      setRoomsLoading(true);
      
      const data = await apiRequest('/api/rooms');
      console.log('📊 بيانات الغرف المُستلمة:', data);
      
      if (data.rooms && Array.isArray(data.rooms)) {
        const formattedRooms = data.rooms.map((room: any) => ({
          id: room.id,
          name: room.name,
          description: room.description || '',
          isDefault: room.isDefault || room.is_default || false,
          createdBy: room.createdBy || room.created_by,
          createdAt: new Date(room.createdAt || room.created_at),
          isActive: room.isActive || room.is_active || true,
          userCount: room.userCount || room.user_count || 0,
          icon: room.icon || '',
          isBroadcast: room.isBroadcast || room.is_broadcast || false,
          hostId: room.hostId || room.host_id,
          speakers: room.speakers ? (typeof room.speakers === 'string' ? JSON.parse(room.speakers) : room.speakers) : [],
          micQueue: room.micQueue ? (typeof room.micQueue === 'string' ? JSON.parse(room.micQueue) : room.micQueue) : []
        }));
        
        console.log('✅ تم تنسيق الغرف:', formattedRooms.length, 'غرفة');
        setRooms(formattedRooms);
      } else {
        console.warn('⚠️ بيانات الغرف غير صحيحة:', data);
        throw new Error('بيانات الغرف غير صحيحة');
      }
    } catch (error) {
      console.error('❌ خطأ في جلب الغرف:', error);
      // استخدام غرف افتراضية في حالة الخطأ
      console.log('🔄 استخدام الغرف الافتراضية...');
      setRooms([
        { id: 'general', name: 'الدردشة العامة', description: 'الغرفة الرئيسية للدردشة', isDefault: true, createdBy: 1, createdAt: new Date(), isActive: true, userCount: 0, icon: '', isBroadcast: false, hostId: null, speakers: [], micQueue: [] },
        { id: 'broadcast', name: 'غرفة البث المباشر', description: 'غرفة خاصة للبث المباشر مع نظام المايك', isDefault: false, createdBy: 1, createdAt: new Date(), isActive: true, userCount: 0, icon: '', isBroadcast: true, hostId: 1, speakers: [], micQueue: [] },
        { id: 'music', name: 'أغاني وسهر', description: 'غرفة للموسيقى والترفيه', isDefault: false, createdBy: 1, createdAt: new Date(), isActive: true, userCount: 0, icon: '', isBroadcast: false, hostId: null, speakers: [], micQueue: [] }
      ]);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  // جلب الغرف عند تحميل المكون
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // تحديد الغرفة الحالية في chat hook
  useEffect(() => {
    if (chat.setCurrentRoom) {
      chat.setCurrentRoom(currentRoomId);
    }
  }, [currentRoomId, chat.setCurrentRoom]);

  // معالجة تغيير الغرفة
  const handleRoomChange = useCallback((roomId: string) => {
    console.log('🔄 تغيير الغرفة إلى:', roomId);
    setCurrentRoomId(roomId);
    
    // تنظيف الرسائل وتحديث الغرفة في chat hook
    if (chat.setCurrentRoom) {
      chat.setCurrentRoom(roomId);
    }
    
    toast({
      title: "تم تغيير الغرفة",
      description: `تم الانتقال إلى ${rooms.find(r => r.id === roomId)?.name || roomId}`,
      duration: 2000,
    });
  }, [chat.setCurrentRoom, rooms, toast]);

  // معالجة إضافة غرفة جديدة
  const handleAddRoom = useCallback(async (roomData: { name: string; description: string; image: File | null }) => {
    try {
      console.log('🔄 إضافة غرفة جديدة:', roomData.name);
      
      const formData = new FormData();
      formData.append('name', roomData.name);
      formData.append('description', roomData.description);
      if (roomData.image) {
        formData.append('image', roomData.image);
      }

      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const newRoom = await response.json();
        console.log('✅ تم إنشاء الغرفة:', newRoom);
        
        // إعادة جلب قائمة الغرف لتحديثها
        await fetchRooms();
        
        toast({
          title: "تم إنشاء الغرفة",
          description: `تم إنشاء غرفة "${roomData.name}" بنجاح`,
          duration: 3000,
        });
      } else {
        throw new Error('فشل في إنشاء الغرفة');
      }
    } catch (error) {
      console.error('❌ خطأ في إنشاء الغرفة:', error);
      toast({
        title: "خطأ",
        description: "فشل في إنشاء الغرفة. حاول مرة أخرى.",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [fetchRooms, toast]);

  // معالجة حذف غرفة
  const handleDeleteRoom = useCallback(async (roomId: string) => {
    try {
      console.log('🔄 حذف الغرفة:', roomId);
      
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log('✅ تم حذف الغرفة:', roomId);
        
        // إعادة جلب قائمة الغرف لتحديثها
        await fetchRooms();
        
        // إذا كانت الغرفة المحذوفة هي الغرفة الحالية، انتقل للغرفة العامة
        if (currentRoomId === roomId) {
          setCurrentRoomId('general');
        }
        
        toast({
          title: "تم حذف الغرفة",
          description: "تم حذف الغرفة بنجاح",
          duration: 3000,
        });
      } else {
        throw new Error('فشل في حذف الغرفة');
      }
    } catch (error) {
      console.error('❌ خطأ في حذف الغرفة:', error);
      toast({
        title: "خطأ",
        description: "فشل في حذف الغرفة. حاول مرة أخرى.",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [fetchRooms, currentRoomId, toast]);

  // معالجة النقر على المستخدم
  const handleUserClick = useCallback((event: React.MouseEvent, user: ChatUser) => {
    event.preventDefault();
    setProfileUser(user);
    setShowProfile(true);
  }, []);

  // دالة توحيد تبديل العرض
  const toggleView = useCallback((view: 'users' | 'walls' | 'rooms') => {
    setActiveView(prev => prev === view ? 'hidden' : view);
  }, []);

  // الحصول على الرسائل الحالية حسب الغرفة
  const currentMessages = useMemo(() => {
    if (chat.roomMessages && chat.roomMessages[currentRoomId]) {
      return chat.roomMessages[currentRoomId];
    }
    // إرجاع الرسائل العامة كبديل إذا لم توجد رسائل خاصة بالغرفة
    return chat.publicMessages || [];
  }, [chat.roomMessages, chat.publicMessages, currentRoomId]);

  // دالة إرسال الرسائل مع تحديد الغرفة
  const handleSendMessage = useCallback((content: string, messageType?: string) => {
    if (chat.sendPublicMessage) {
      chat.sendPublicMessage(content, messageType, currentRoomId);
    }
  }, [chat.sendPublicMessage, currentRoomId]);

  // حالات إضافية
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

  // تفعيل التنبيه عند وصول رسالة جديدة
  useEffect(() => {
    if (chat.newMessageSender) {
      setNewMessageAlert({
        show: true,
        sender: chat.newMessageSender,
      });
      
      // إخفاء التنبيه تلقائياً بعد 5 ثوانٍ
      setTimeout(() => {
        setNewMessageAlert({ show: false, sender: null });
        if (chat.setNewMessageSender) {
          chat.setNewMessageSender(null);
        }
      }, 5000);
    }
  }, [chat.newMessageSender, chat.setNewMessageSender]);

  const closeUserPopup = useCallback(() => {
    setUserPopup(prev => ({ ...prev, show: false }));
  }, []);

  const handlePrivateMessage = useCallback((user: ChatUser) => {
    setSelectedPrivateUser(user);
    closeUserPopup();
  }, [closeUserPopup]);

  const closePrivateMessage = useCallback(() => {
    setSelectedPrivateUser(null);
  }, []);

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
      <header className="bg-secondary py-4 px-6 flex justify-between items-center shadow-2xl border-b border-accent">
        <div className="flex items-center gap-3">
          {/* زر الحوائط في الزاوية اليسرى */}
          <Button 
            className={`glass-effect px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeView === 'walls' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            onClick={() => toggleView('walls')}
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
            className={`glass-effect px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeView === 'users' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            onClick={() => toggleView('users')}
            title="المستخدمون المتصلون"
          >
            <span>👥</span>
                          المستخدمون ({chat.onlineUsers.length})
          </Button>

          {/* زر الغرف */}
          <Button 
            className={`glass-effect px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeView === 'rooms' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            onClick={() => toggleView('rooms')}
            title="الغرف"
          >
            <span>🏠</span>
            الغرف
          </Button>

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
            className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2 relative"
            onClick={() => setShowFriends(true)}
          >
            <span>👥</span>
            الأصدقاء
            {/* تنبيه طلبات الصداقة */}
            <FriendRequestBadge currentUser={chat.currentUser} />
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
          <div className={`${activeView === 'walls' ? 'w-96' : 'w-64'} transition-all duration-300`}>
            <UserSidebarWithWalls 
              users={chat.onlineUsers || []}
              onUserClick={(event, user) => {
                event.stopPropagation();
                setUserPopup({
                  show: true,
                  user,
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
              currentUser={chat.currentUser}
              activeView={activeView}
              rooms={rooms}
              currentRoomId={currentRoomId}
              onRoomChange={handleRoomChange}
              onAddRoom={handleAddRoom}
              onDeleteRoom={handleDeleteRoom}
              onRefreshRooms={fetchRooms}
            />
          </div>
        )}
        {(() => {
          const currentRoom = rooms.find(room => room.id === currentRoomId);
          
          // إذا كانت الغرفة من نوع broadcast، استخدم BroadcastRoomInterface
          if (currentRoom?.isBroadcast) {
            return (
              <BroadcastRoomInterface
                currentUser={chat.currentUser}
                room={currentRoom}
                onlineUsers={chat.onlineUsers}
                onSendMessage={(content) => chat.sendRoomMessage(content, currentRoomId)}
                onTyping={chat.handleTyping}
                typingUsers={Array.from(chat.typingUsers)}
                onReportMessage={handleReportUser}
                onUserClick={(event, user) => {
                  event.stopPropagation();
                  setUserPopup({
                    show: true,
                    user,
                    x: event.clientX,
                    y: event.clientY,
                  });
                }}
                chat={{
                  sendPublicMessage: (content: string) => chat.sendRoomMessage(content, currentRoomId),
                  handleTyping: chat.handleTyping
                }}
              />
            );
          }
          
          // وإلا استخدم MessageArea العادية
          return (
            <MessageArea 
              messages={currentMessages}
              currentUser={chat.currentUser}
              onSendMessage={handleSendMessage}
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
