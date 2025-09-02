import { useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Menu,
  Settings,
  Bell,
  MessageSquare,
  MessageCircle,
  Crown,
  Shield,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';
import { lazy, Suspense, useState, useEffect, useCallback, useMemo } from 'react';

import BlockNotification from '../moderation/BlockNotification';
import MessageAlert from './MessageAlert';
import ProfileImage from './ProfileImage';
import WelcomeNotification from './WelcomeNotification';
// Remove static heavy imports; use lazy-loaded variants instead
const ActiveModerationLog = lazy(() => import('../moderation/ActiveModerationLog'));
const PromoteUserPanel = lazy(() => import('../moderation/PromoteUserPanel'));
const ReportsLog = lazy(() => import('../moderation/ReportsLog'));

const AdminReportsPanel = lazy(() => import('./AdminReportsPanel'));
const BroadcastRoomInterface = lazy(() => import('./BroadcastRoomInterface'));
const MessageArea = lazy(() => import('./MessageArea'));
const MessagesPanel = lazy(() => import('./MessagesPanel'));
const ModerationPanel = lazy(() => import('./ModerationPanel'));
const NotificationPanel = lazy(() => import('./NotificationPanel'));
const OwnerAdminPanel = lazy(() => import('./OwnerAdminPanel'));
const PrivateMessageBox = lazy(() => import('./PrivateMessageBox'));
const ProfileModal = lazy(() => import('./ProfileModal'));
const ReportModal = lazy(() => import('./ReportModal'));
const SettingsMenu = lazy(() => import('./SettingsMenu'));
const ThemeSelector = lazy(() => import('./ThemeSelector'));
const UserPopup = lazy(() => import('./UserPopup'));
const UnifiedSidebar = lazy(() => import('./UserSidebarWithWalls'));
const StoryViewer = lazy(() => import('@/components/ui/StoryViewer'));

const KickCountdown = lazy(() => import('@/components/moderation/KickCountdown'));
const UsernameColorPicker = lazy(() => import('@/components/profile/UsernameColorPicker'));
const RichestModal = lazy(() => import('@/components/ui/RichestModal'));
const StoriesSettings = lazy(() => import('@/components/ui/StoriesSettings'));
// import RoomComponent from './RoomComponent';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import type { UseChatReturn } from '@/hooks/useChat';
import { useNotificationManager } from '@/hooks/useNotificationManager';
import { useRoomManager } from '@/hooks/useRoomManager';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser, ChatRoom } from '@/types/chat';
import { setCachedUser } from '@/utils/userCacheManager';
import { getPmLastOpened } from '@/utils/messageUtils';

interface ChatInterfaceProps {
  chat: UseChatReturn;
  onLogout: () => void;
}

export default function ChatInterface({ chat, onLogout }: ChatInterfaceProps) {
  const { showSuccessToast, showErrorToast } = useNotificationManager(chat.currentUser);
  const [showProfile, setShowProfile] = useState(false);
  const [profileUser, setProfileUser] = useState<ChatUser | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPrivateUser, setSelectedPrivateUser] = useState<ChatUser | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState<{ show: boolean; userId?: number | null }>({ show: false, userId: null });
  const [showAdminReports, setShowAdminReports] = useState(false);
  const [showStoriesSettings, setShowStoriesSettings] = useState(false);
  const [activeView, setActiveView] = useState<'hidden' | 'users' | 'walls' | 'rooms' | 'friends'>(
    () => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'hidden' : 'users')
  );
  const isMobile = useIsMobile();
  const [showAddRoomDialog, setShowAddRoomDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomImage, setNewRoomImage] = useState<File | null>(null);

  const queryClient = useQueryClient();
  // 🚀 إدارة الغرف عبر hook موحّد محسن
  const {
    rooms,
    loading: roomsLoading,
    fetchRooms,
    addRoom: addRoomViaManager,
    deleteRoom: deleteRoomViaManager,
    isFetching,
  } = useRoomManager({
    autoRefresh: false, // تحديث يدوي فقط
    cacheTimeout: 10 * 60 * 1000, // 10 دقائق cache
  });

  // جلب الغرف عند الدخول لأول مرة لضمان ظهور التبويب مباشرة
  useEffect(() => {
    fetchRooms(false).catch(() => {});
  }, [fetchRooms]);

  // الاستماع لأخطاء الغرف المقفلة
  useEffect(() => {
    const handleRoomLockError = (event: Event) => {
      const customEvent = event as CustomEvent;
      const message = customEvent.detail?.message || 'الغرفة مقفلة ولا يمكن الدخول إليها';
      showErrorToast(message, 'غرفة مقفلة');
    };

    window.addEventListener('roomLockError', handleRoomLockError);
    return () => window.removeEventListener('roomLockError', handleRoomLockError);
  }, [showErrorToast]);

  // 🚀 دوال إدارة الغرف المحسنة
  const handleRoomChange = useCallback(
    async (roomId: string) => {
      chat.joinRoom(roomId);
    },
    [chat]
  );

  // دالة تحديث الغرف مع منع التكرار
  const handleRefreshRooms = useCallback(async () => {
    if (isFetching) {
      return;
    }

    await fetchRooms(true); // فرض التحديث
  }, [fetchRooms, isFetching]);

  // ➕ إضافة غرفة جديدة مع منع التكرار
  const handleAddRoom = useCallback(
    async (roomData: { name: string; description: string; image: File | null }) => {
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
    },
    [chat.currentUser, addRoomViaManager, showSuccessToast, showErrorToast]
  );

  // ❌ حذف غرفة مع منع التكرار
  const handleDeleteRoom = useCallback(
    async (roomId: string) => {
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
    },
    [chat, deleteRoomViaManager, showSuccessToast, showErrorToast]
  );

  const submitNewRoom = useCallback(async () => {
    await handleAddRoom({
      name: newRoomName,
      description: newRoomDescription,
      image: newRoomImage,
    });
    setShowAddRoomDialog(false);
    setNewRoomName('');
    setNewRoomDescription('');
    setNewRoomImage(null);
  }, [handleAddRoom, newRoomName, newRoomDescription, newRoomImage]);

  // الاستماع لتحديثات الغرف عبر Socket.IO من خلال حدث roomUpdate
  useEffect(() => {
    try {
      const { getSocket } = require('@/lib/socket');
      const s = getSocket();
      const onRoomUpdate = (_payload: any) => {
        // جلب مُجبر لتحديث القائمة فوراً
        fetchRooms(true).catch(() => {});
      };
      s.on('roomUpdate', onRoomUpdate);
      return () => {
        try { s.off('roomUpdate', onRoomUpdate); } catch {}
      };
    } catch {
      // ignore if socket not available
    }
  }, [fetchRooms]);

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

  // === Unread badges logic ===
  const currentUserId = chat.currentUser?.id;

  // Notifications unread count (server)
  const { data: unreadNotifData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return { count: 0 } as any;
      return await apiRequest(`/api/notifications/unread-count?userId=${currentUserId}`);
    },
    enabled: !!currentUserId,
    // التحديث يتم عبر أحداث الوقت الحقيقي (invalidate في useNotificationManager)
    refetchInterval: false,
    staleTime: 30000,
  });
  const unreadNotificationsCount = unreadNotifData?.count || 0;

  // Private messages unread total (local + minimal server data)
  const totalUnreadPrivateMessages = useMemo(() => {
    if (!currentUserId) return 0;
    let total = 0;
    const conversations = chat.privateConversations || {};
    for (const key of Object.keys(conversations)) {
      const otherId = parseInt(key, 10);
      if (!Number.isFinite(otherId)) continue;
      const lastOpened = getPmLastOpened(currentUserId, otherId);
      const conv = conversations[otherId] || [];
      const unread = conv.filter(
        (m: any) => m && m.senderId === otherId && new Date(m.timestamp).getTime() > lastOpened
      ).length;
      total += unread;
    }
    return total;
  }, [chat.privateConversations, currentUserId]);

  // Pending moderation reports count (owner/admin only)
  const isOwnerOrAdmin = chat.currentUser && (chat.currentUser.userType === 'owner' || chat.currentUser.userType === 'admin');
  const { data: spamStats } = useQuery<{ stats: { pendingReports: number } } | null>({
    queryKey: ['/api/spam-stats', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null as any;
      return await apiRequest(`/api/spam-stats?userId=${currentUserId}`);
    },
    enabled: !!currentUserId && !!isOwnerOrAdmin,
    // لا حاجة لـ polling هنا أيضاً
    refetchInterval: false,
    staleTime: 30000,
  });
  const pendingReportsCount = spamStats?.stats?.pendingReports || 0;

  // تفعيل التنبيه عند وصول رسالة جديدة
  useEffect(() => {
    if (chat.newMessageSender) {
      setNewMessageAlert({
        show: true,
        sender: chat.newMessageSender,
      });
    }
  }, [chat.newMessageSender]);

  // Prefetch private conversations on user entry
  useEffect(() => {
    if (chat.currentUser?.id) {
      queryClient.prefetchQuery({
        queryKey: ['/api/private-messages/conversations', chat.currentUser.id],
        queryFn: async () =>
          await apiRequest(`/api/private-messages/conversations/${chat.currentUser.id}?limit=50`),
        staleTime: 30_000,
      });
    }
  }, [chat.currentUser?.id, queryClient]);

  // إعادة جلب/إبطال كاش قائمة المحادثات فور استقبال رسالة خاصة (حتى ولو كانت النافذة مغلقة)
  useEffect(() => {
    const handler = () => {
      if (!chat.currentUser?.id) return;
      try {
        queryClient.invalidateQueries({
          queryKey: ['/api/private-messages/conversations', chat.currentUser.id],
        });
        queryClient.prefetchQuery({
          queryKey: ['/api/private-messages/conversations', chat.currentUser.id],
          queryFn: async () =>
            await apiRequest(`/api/private-messages/conversations/${chat.currentUser.id}?limit=50`),
          staleTime: 0,
        });
      } catch {}
    };
    window.addEventListener('privateMessageReceived', handler);
    return () => window.removeEventListener('privateMessageReceived', handler);
  }, [chat.currentUser?.id, queryClient]);

  // Auto-switch to friends tab when friend request is accepted
  useEffect(() => {
    const handleFriendRequestAccepted = (event: CustomEvent) => {
      setActiveView('friends');
    };

    window.addEventListener('friendRequestAccepted', handleFriendRequestAccepted as EventListener);
    return () => {
      window.removeEventListener(
        'friendRequestAccepted',
        handleFriendRequestAccepted as EventListener
      );
    };
  }, []);
  const [reportedUser, setReportedUser] = useState<ChatUser | null>(null);
  const [reportedMessage, setReportedMessage] = useState<{ content: string; id: number } | null>(
    null
  );
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
    setUserPopup({ show: true, user, x: event.clientX, y: event.clientY });
  };

  const closeUserPopup = () => {
    setUserPopup((prev) => ({ ...prev, show: false }));
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
        },
      });

      showSuccessToast(`تم إرسال طلب صداقة إلى ${user.username}`, 'تمت الإضافة');
    } catch (error) {
      console.error('Friend request error:', error);
      showErrorToast(
        error instanceof Error ? error.message : 'لم نتمكن من إرسال طلب الصداقة',
        'خطأ'
      );
    }
    closeUserPopup();
  };

  const handleIgnoreUser = (user: ChatUser) => {
    chat.ignoreUser(user.id);
    showSuccessToast(
      `تم تجاهل ${user.username}. لن ترى رسائله العامة أو الخاصة ولن يستطيع إرسال طلب صداقة لك.`,
      'تم التجاهل'
    );
    closeUserPopup();
  };

  const handleViewProfile = (user: ChatUser) => {
    setProfileUser(user);
    setShowProfile(true);
    closeUserPopup();
  };

  const handleViewStories = (user?: ChatUser) => {
    setShowStoryViewer({ show: true, userId: user?.id || undefined });
    closeUserPopup();
  };

  // Render story viewer
  { /* keep near bottom overlays */ }

  // معالج للروابط الشخصية
  const handleProfileLink = (userId: number) => {
    const user = chat.onlineUsers.find((u) => u.id === userId);
    if (user) {
      setProfileUser(user);
      setShowProfile(true);
    } else {
      showErrorToast('لم نتمكن من العثور على هذا المستخدم', 'مستخدم غير موجود');
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
          let user = chat.onlineUsers.find((u) => u.id === userId);
          if (!user) {
            try {
              const data = await apiRequest(`/api/users/${userId}?t=${Date.now()}`);
              if (data && data.id) {
                user = data as any;
                // تحديث الكاش مع بيانات المستخدم
                setCachedUser(user);
              }
            } catch {}
          }
          if (user) {
            setSelectedPrivateUser(user);
            setShowPmBox(true);
          } else {
            showErrorToast('لم نتمكن من العثور على هذا المستخدم', 'مستخدم غير موجود');
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
    setReportedMessage(
      messageContent && messageId ? { content: messageContent, id: messageId } : null
    );
    setShowReportModal(true);
    closeUserPopup();
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setReportedUser(null);
    setReportedMessage(null);
  };

  const [showRichest, setShowRichest] = useState(false);

  // Preload RichestModal chunk and prefetch VIP data on idle
  const preloadRichestModule = useCallback(() => {
    try {
      // Vite will cache this dynamic import and load the chunk ahead of time
      // Ignore returned promise; we just want to warm the chunk
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      import('@/components/ui/RichestModal');
    } catch {}
  }, []);

  useEffect(() => {
    const runOnIdle = (cb: () => void, timeout = 1200) => {
      try {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(cb, { timeout });
          return;
        }
      } catch {}
      setTimeout(cb, timeout);
    };

    runOnIdle(async () => {
      try {
        preloadRichestModule();
        await queryClient.prefetchQuery({
          queryKey: ['/api/vip'],
          queryFn: () => apiRequest('/api/vip?limit=10'),
          staleTime: 5 * 60 * 1000,
          gcTime: 10 * 60 * 1000,
        });
        if (isOwnerOrAdmin) {
          await queryClient.prefetchQuery({
            queryKey: ['/api/vip/candidates'],
            queryFn: () => apiRequest('/api/vip/candidates'),
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
          });
        }
      } catch {}
    }, 400);
  }, [preloadRichestModule, queryClient, isOwnerOrAdmin]);

  const prefetchVip = useCallback(async () => {
    try {
      preloadRichestModule();
      await queryClient.prefetchQuery({
        queryKey: ['/api/vip'],
        queryFn: () => apiRequest('/api/vip?limit=10'),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      });
      if (isOwnerOrAdmin) {
        await queryClient.prefetchQuery({
          queryKey: ['/api/vip/candidates'],
          queryFn: () => apiRequest('/api/vip/candidates'),
          staleTime: 5 * 60 * 1000,
          gcTime: 10 * 60 * 1000,
        });
      }
    } catch {}
  }, [preloadRichestModule, queryClient, isOwnerOrAdmin]);

  // Global socket listener to keep VIP cache fresh even when modal is closed
  useEffect(() => {
    try {
      const { getSocket } = require('@/lib/socket');
      const s = getSocket();
      const onMessage = (payload: any) => {
        if (payload?.type === 'vipUpdated') {
          try {
            const users = Array.isArray(payload.users) ? payload.users.slice(0, 10) : [];
            queryClient.setQueryData(['/api/vip'], { users });
          } catch {}
        }
      };
      s.on('message', onMessage);
      return () => {
        try { s.off('message', onMessage); } catch {}
      };
    } catch {}
  }, [queryClient]);

  const SkeletonBlock = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse bg-muted rounded ${className}`} />
  );

  return (
    <div
      className={`min-h-[100dvh] flex flex-col chat-container ${isMobile ? 'mobile-layout' : 'desktop-layout'}`}
      onClick={closeUserPopup}
    >
      {/* Modern Header */}
      <header
        className={`sticky top-0 z-40 modern-nav min-h-[2.5rem] py-1.5 px-4 sm:py-1.5 sm:px-8 flex ${isMobile ? 'flex-col gap-2' : 'flex-row flex-nowrap'} justify-between items-center`}
      >
        <div
          className={`flex gap-2 ${isMobile ? 'flex-wrap justify-center w-full' : 'flex-1 overflow-x-auto pr-2'} ${chat.currentUser?.userType === 'owner' ? '' : 'max-w-[calc(100%-180px)]'}`}
        >
          <Button
            className="glass-effect px-3 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4" />
            <span className="font-medium">إعدادات</span>
          </Button>

          <Button
            className="glass-effect px-3 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2 border border-yellow-400"
            onMouseEnter={prefetchVip}
            onFocus={prefetchVip}
            onClick={() => setShowRichest(true)}
            title="الأثرياء"
          >
            <Crown className="w-4 h-4 text-yellow-400" />
            <span className="font-medium">الأثرياء</span>
          </Button>

          {/* زر إضافة غرفة جديدة للمالك */}
          {chat.currentUser && chat.currentUser.userType === 'owner' && (
            <Button
              className="glass-effect px-3 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2"
              onClick={() => setShowAddRoomDialog(true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              <span className="font-medium">إضافة غرفة</span>
            </Button>
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
          {chat.currentUser &&
            (chat.currentUser.userType === 'owner' || chat.currentUser.userType === 'admin') && (
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
                  {pendingReportsCount > 0 && (
                    <span className="absolute -top-2 -right-2 inline-flex items-center justify-center text-[10px] min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white">
                      {pendingReportsCount}
                    </span>
                  )}
                </Button>

                <Button
                  className="glass-effect px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 border"
                  onClick={async () => {
                    if (!chat.currentUser) return;
                    try {
                      const endpoint = chat.currentUser.isHidden
                        ? `/api/users/${chat.currentUser.id}/show-online`
                        : `/api/users/${chat.currentUser.id}/hide-online`;
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
            {totalUnreadPrivateMessages > 0 && (
              <span className="ml-2 inline-flex items-center justify-center text-[10px] min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white">
                {totalUnreadPrivateMessages}
              </span>
            )}
          </Button>

          <Button
            className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2 relative"
            onClick={() => setShowNotifications(true)}
          >
            <Bell className="w-4 h-4" />
            إشعارات
            {unreadNotificationsCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center text-[10px] min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white">
                {unreadNotificationsCount}
              </span>
            )}
          </Button>
        </div>

        {/* الشعار ثابت على اليسار وبألوان ثابتة لا تتأثر بالثيم */}
        <div
          className={`flex items-center gap-2 cursor-pointer select-none flex-shrink-0 ${isMobile ? 'self-start' : ''}`}
          onClick={() => {
            if (isMobile) setActiveView('hidden');
          }}
        >
          <MessageCircle className="w-5 h-5" style={{ color: '#667eea' }} />
          <div className="text-lg sm:text-xl font-bold whitespace-nowrap" style={{ color: '#ffffff' }}>
            Arabic<span style={{ color: '#667eea' }}>Chat</span>
          </div>
        </div>
      </header>

      {/* Main Content - تحسين التخطيط لمنع التداخل */}
      <main
        className={`flex flex-1 overflow-hidden min-h-0 ${isMobile ? 'flex-col' : 'flex-col sm:flex-row'}`}
        style={{ paddingBottom: isMobile ? 'calc(3.5rem + env(safe-area-inset-bottom))' : '3.5rem' }}
      >
        {/* الشريط الجانبي - على الجوال يعرض بملء الشاشة عند اختيار التبويب */}
        {activeView !== 'hidden' && (
          <div
            className={`${isMobile ? 'w-full flex-1 min-h-0' : activeView === 'walls' ? 'w-full sm:w-96' : activeView === 'friends' ? 'w-full sm:w-80' : 'w-full sm:w-64'} max-w-full sm:shrink-0 transition-all duration-300 min-h-0 flex flex-col`}
            style={{ maxHeight: 'calc(100vh - 96px)' }}
          >
            <Suspense
              fallback={
                <div className="p-4 space-y-2">
                  <SkeletonBlock className="h-6 w-1/2" />
                  <SkeletonBlock className="h-10 w-full" />
                  <SkeletonBlock className="h-10 w-full" />
                  <SkeletonBlock className="h-10 w-3/4" />
                </div>
              }
            >
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
            </Suspense>
          </div>
        )}
        {!isMobile || activeView === 'hidden'
          ? (() => {
              const currentRoom = rooms.find((room) => room.id === chat.currentRoomId);

              // إذا كانت الغرفة من نوع broadcast، استخدم BroadcastRoomInterface
              if (currentRoom?.isBroadcast) {
                return (
                  <Suspense fallback={<div className="p-4 text-center">...جاري التحميل</div>}>
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
                        sendPublicMessage: (content: string) =>
                          chat.sendRoomMessage(content, chat.currentRoomId),
                        handleTyping: () => chat.sendTyping(),
                        addBroadcastMessageHandler: (handler: (data: any) => void) =>
                          chat.addBroadcastMessageHandler?.(handler),
                        removeBroadcastMessageHandler: (handler: (data: any) => void) =>
                          chat.removeBroadcastMessageHandler?.(handler),
                        sendWebRTCIceCandidate: (
                          toUserId: number,
                          roomId: string,
                          candidate: RTCIceCandidateInit
                        ) => chat.sendWebRTCIceCandidate?.(toUserId, roomId, candidate),
                        sendWebRTCOffer: (
                          toUserId: number,
                          roomId: string,
                          offer: RTCSessionDescriptionInit
                        ) => chat.sendWebRTCOffer?.(toUserId, roomId, offer),
                        sendWebRTCAnswer: (
                          toUserId: number,
                          roomId: string,
                          answer: RTCSessionDescriptionInit
                        ) => chat.sendWebRTCAnswer?.(toUserId, roomId, answer),
                        onWebRTCOffer: (handler: (payload: any) => void) =>
                          chat.onWebRTCOffer?.(handler),
                        offWebRTCOffer: (handler: (payload: any) => void) =>
                          chat.offWebRTCOffer?.(handler),
                        onWebRTCIceCandidate: (handler: (payload: any) => void) =>
                          chat.onWebRTCIceCandidate?.(handler),
                        offWebRTCIceCandidate: (handler: (payload: any) => void) =>
                          chat.offWebRTCIceCandidate?.(handler),
                        onWebRTCAnswer: (handler: (payload: any) => void) =>
                          chat.onWebRTCAnswer?.(handler),
                        offWebRTCAnswer: (handler: (payload: any) => void) =>
                          chat.offWebRTCAnswer?.(handler),
                      }}
                    />
                  </Suspense>
                );
              }

              // وإلا استخدم MessageArea العادية مع حماية من التداخل
              return (
                <div
                  className="flex-1 flex min-h-0"
                  style={{ maxHeight: 'calc(100vh - 96px)' }}
                >
                  <Suspense fallback={<div className="p-4 space-y-3"><SkeletonBlock className="h-6 w-1/3" /><SkeletonBlock className="h-40 w-full" /></div>}>
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
                  </Suspense>
                </div>
              );
            })()
          : null}
      </main>

      {/* Modern Footer Navigation */}
      <footer
        className={`fixed bottom-0 left-0 right-0 z-10 modern-nav h-14 px-2 sm:px-4 flex justify-start items-center ${isMobile ? 'mobile-footer' : ''}`}
        style={{ paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : '0' }}
      >
        <div className="flex gap-1 sm:gap-2 overflow-x-auto max-w-full">
          {/* الحوائط */}
          <Button
            size="sm"
            className={`${'glass-effect px-2 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 text-sm'}${
              activeView === 'walls' ? ' bg-primary text-primary-foreground' : ' hover:bg-accent'
            }`}
            onClick={() => setActiveView((prev) => (prev === 'walls' ? 'hidden' : 'walls'))}
            title="الحوائط"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-label="Walls"
            >
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            الحوائط
          </Button>

          {/* المستخدمون */}
          <Button
            size="sm"
            className={`${'glass-effect px-2 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 text-sm'}${
              activeView === 'users' ? ' bg-primary text-primary-foreground' : ' hover:bg-accent'
            }`}
            onClick={() => setActiveView((prev) => (prev === 'users' ? 'hidden' : 'users'))}
            title="المستخدمون المتصلون"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-label="Users"
            >
              <circle cx="9" cy="7" r="3"></circle>
              <path d="M2 21c0-3.314 2.686-6 6-6h2c3.314 0 6 2.686 6 6"></path>
              <circle cx="17" cy="7" r="3"></circle>
              <path d="M14 21c0-1.657 1.343-3 3-3h1c1.657 0 3 1.343 3 3"></path>
            </svg>
            المستخدمون ({chat.onlineUsers?.length ?? 0})
          </Button>

          {/* الغرف */}
          <Button
            size="sm"
            className={`${'glass-effect px-2 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 text-sm'}${
              activeView === 'rooms' ? ' bg-primary text-primary-foreground' : ' hover:bg-accent'
            }`}
            onClick={() => setActiveView((prev) => (prev === 'rooms' ? 'hidden' : 'rooms'))}
            title="الغرف"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-label="Rooms"
            >
              <path d="M3 11l9-8 9 8"></path>
              <path d="M5 10v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9"></path>
              <path d="M9 21v-6h6v6"></path>
            </svg>
            الغرف
          </Button>

          {/* الأصدقاء */}
          <Button
            size="sm"
            className={`${'glass-effect px-2 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 text-sm'}${
              activeView === 'friends' ? ' bg-primary text-primary-foreground' : ' hover:bg-accent'
            }`}
            onClick={() => setActiveView((prev) => (prev === 'friends' ? 'hidden' : 'friends'))}
            title="الأصدقاء"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-label="Friends"
            >
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
        <Suspense fallback={<div className="p-4 text-center">...جاري التحميل</div>}>
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
                onUpdate={(updatedUser) => {
                  // تحديث بيانات المستخدم في قائمة المتصلون
                  if (updatedUser && updatedUser.id) {
                    chat.updateCurrentUser({
                      profileEffect: updatedUser.profileEffect,
                      usernameColor: updatedUser.usernameColor,
                      profileBackgroundColor: updatedUser.profileBackgroundColor,
                    });
                  }
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
                onUpdate={(updatedUser) => {
                  // تحديث بيانات المستخدم الحالي في قائمة المتصلون
                  if (updatedUser && updatedUser.id) {
                    chat.updateCurrentUser({
                      profileEffect: updatedUser.profileEffect,
                      usernameColor: updatedUser.usernameColor,
                      profileBackgroundColor: updatedUser.profileBackgroundColor,
                    });
                  }
                }}
                onReportUser={(u) => handleReportUser(u)}
              />
            )}
          </>
        </Suspense>
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
              <Input
                id="room-name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="مثال: الدردشة العامة 2"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="room-desc">الوصف</Label>
              <Textarea
                id="room-desc"
                value={newRoomDescription}
                onChange={(e) => setNewRoomDescription(e.target.value)}
                placeholder="نبذة قصيرة عن الغرفة"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="room-image">صورة الغرفة (اختياري)</Label>
              <Input
                id="room-image"
                type="file"
                accept="image/*"
                onChange={(e) => setNewRoomImage(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowAddRoomDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={submitNewRoom} disabled={!newRoomName.trim()}>
                حفظ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* لوحة الرسائل */}
      {showMessages && (
        <Suspense fallback={null}>
          <MessagesPanel
            isOpen={showMessages}
            onClose={() => setShowMessages(false)}
            currentUser={chat.currentUser}
            privateConversations={chat.privateConversations}
            onlineUsers={chat.onlineUsers}
            onStartPrivateChat={(user) => {
              setShowMessages(false);
              setSelectedPrivateUser(user);
              setShowPmBox(true);
            }}
          />
        </Suspense>
      )}

      {/* صندوق الرسائل الخاصة */}
      {showPmBox && selectedPrivateUser && (
        <Suspense fallback={null}>
          <PrivateMessageBox
            isOpen={showPmBox}
            onClose={() => setShowPmBox(false)}
            user={selectedPrivateUser}
            currentUser={chat.currentUser}
            messages={chat.privateConversations[selectedPrivateUser.id] || []}
            onSendMessage={(content) => chat.sendMessage(content, 'text', selectedPrivateUser.id)}
            onLoadMore={() => (chat as any).loadOlderPrivateConversation?.(selectedPrivateUser.id, 20)}
            onViewProfile={(u) => handleViewProfile(u)}
            onViewStoryByUser={(uid) => setShowStoryViewer({ show: true, userId: uid })}
          />
        </Suspense>
      )}

      {userPopup.show && userPopup.user && (
        <Suspense fallback={null}>
          <UserPopup
            user={userPopup.user}
            x={userPopup.x}
            y={userPopup.y}
            onPrivateMessage={() => {
              closeUserPopup();
              setTimeout(() => handlePrivateMessage(userPopup.user!), 0);
            }}
            onAddFriend={() => handleAddFriend(userPopup.user!)}
            onIgnore={() => {
              handleIgnoreUser(userPopup.user!);
            }}
            onViewProfile={() => handleViewProfile(userPopup.user!)}
            onViewStories={() => handleViewStories(userPopup.user!)}
            currentUser={chat.currentUser}
            onClose={closeUserPopup}
          />
        </Suspense>
      )}

      {showSettings && (
        <Suspense fallback={null}>
          <SettingsMenu
            onOpenProfile={() => {
              // افتح فوراً ببيانات المستخدم الحالية لسرعة الاستجابة
              if (chat.currentUser) {
                setProfileUser(chat.currentUser);
              }
              setShowProfile(true);
              setShowSettings(false);

              // ثم اجلب نسخة محدثة وكاملة لتوحيد العرض مع قائمة المستخدمين
              try {
                const userId = chat.currentUser?.id;
                if (userId) {
                  (async () => {
                    try {
                      const data = await apiRequest(`/api/users/${userId}?t=${Date.now()}`);
                      if (data && (data as any).id) {
                        setProfileUser(data as any);
                      }
                    } catch {}
                  })();
                }
              } catch {}
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
            onOpenStories={() => {
              setShowStoriesSettings(true);
              setShowSettings(false);
            }}
            onOpenIgnoredUsers={() => {
              setShowIgnoredUsers(true);
              setShowSettings(false);
            }}
            currentUser={chat.currentUser}
          />
        </Suspense>
      )}

      {showReportModal && (
        <Suspense fallback={null}>
          <ReportModal
            isOpen={showReportModal}
            onClose={closeReportModal}
            reportedUser={reportedUser}
            currentUser={chat.currentUser}
            messageContent={reportedMessage?.content}
            messageId={reportedMessage?.id}
          />
        </Suspense>
      )}

      {showNotifications && (
        <Suspense fallback={null}>
          <NotificationPanel
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
            currentUser={chat.currentUser}
          />
        </Suspense>
      )}

      {/* Admin Reports Panel */}
      {showAdminReports && chat.currentUser && chat.currentUser.userType === 'owner' && (
        <Suspense fallback={null}>
          <AdminReportsPanel
            isOpen={showAdminReports}
            onClose={() => setShowAdminReports(false)}
            currentUser={chat.currentUser}
          />
        </Suspense>
      )}

      {/* ⚠️ لوحة الإدارة - إزالة التكرار */}
      {showModerationPanel && (
        <Suspense fallback={null}>
          <ModerationPanel
            isOpen={showModerationPanel}
            onClose={() => setShowModerationPanel(false)}
            currentUser={chat.currentUser}
            onlineUsers={chat.onlineUsers}
          />
        </Suspense>
      )}

      {/* 👑 لوحة المالك */}
      {showOwnerPanel && (
        <Suspense fallback={null}>
          <OwnerAdminPanel
            isOpen={showOwnerPanel}
            onClose={() => setShowOwnerPanel(false)}
            currentUser={chat.currentUser}
            onlineUsers={chat.onlineUsers}
          />
        </Suspense>
      )}

      {showReportsLog && (
        <Suspense fallback={null}>
          <ReportsLog
            isVisible={showReportsLog}
            onClose={() => setShowReportsLog(false)}
            currentUser={chat.currentUser}
          />
        </Suspense>
      )}

      {showActiveActions && (
        <Suspense fallback={null}>
          <ActiveModerationLog
            isVisible={showActiveActions}
            onClose={() => setShowActiveActions(false)}
            currentUser={chat.currentUser}
          />
        </Suspense>
      )}

      {showPromotePanel && (
        <Suspense fallback={null}>
          <PromoteUserPanel
            isVisible={showPromotePanel}
            onClose={() => setShowPromotePanel(false)}
            currentUser={chat.currentUser}
            onlineUsers={chat.onlineUsers}
          />
        </Suspense>
      )}

      {showThemeSelector && (
        <Suspense fallback={null}>
          <ThemeSelector
            isOpen={showThemeSelector}
            onClose={() => setShowThemeSelector(false)}
            currentUser={chat.currentUser}
            onThemeUpdate={(theme) => {
              // لم يعد هناك تحديث لكل مستخدم هنا؛ الثيم الآن عام للموقع
            }}
          />
        </Suspense>
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
            <Suspense fallback={<div className="p-4 text-center">...جاري التحميل</div>}>
              <UsernameColorPicker
                currentUser={chat.currentUser}
                onColorUpdate={(color) => {
                  chat.updateCurrentUser({ usernameColor: color } as any);
                  setShowUsernameColorPicker(false);
                }}
              />
            </Suspense>
          </div>
        </div>
      )}

      {showStoriesSettings && (
        <Suspense fallback={null}>
          <StoriesSettings
            isOpen={showStoriesSettings}
            onClose={() => setShowStoriesSettings(false)}
            currentUser={chat.currentUser}
          />
        </Suspense>
      )}

      {/* إشعارات الطرد والحجب */}
      {chat.showKickCountdown && (
        <Suspense fallback={null}>
          <KickCountdown
            isVisible={chat.showKickCountdown}
            durationMinutes={15}
            onClose={() => chat.setShowKickCountdown(false)}
          />
        </Suspense>
      )}
      {/* إشعار الحجب (block) */}
      {chat.notifications &&
        chat.notifications.some((n) => n.type === 'moderation' && n.content.includes('حظر')) && (
          <BlockNotification
            isVisible={true}
            reason={
              chat.notifications.find((n) => n.type === 'moderation' && n.content.includes('حظر'))
                ?.content || ''
            }
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

      {/* نافذة الأثرياء */}
      <Suspense
        fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 modal-overlay" />
            <div className="relative w-[90vw] max-w-[20rem] sm:max-w-[22rem] bg-card rounded-xl overflow-hidden shadow-2xl">
              <div className="bg-primary p-3">
                <div className="animate-pulse h-6 w-32 bg-white/30 rounded" />
              </div>
              <div className="p-3 space-y-2">
                <div className="animate-pulse h-10 bg-muted rounded" />
                <div className="animate-pulse h-10 bg-muted rounded" />
                <div className="animate-pulse h-10 bg-muted rounded" />
                <div className="animate-pulse h-10 bg-muted rounded" />
                <div className="animate-pulse h-10 bg-muted rounded" />
                <div className="animate-pulse h-10 bg-muted rounded" />
                <div className="animate-pulse h-10 bg-muted rounded" />
                <div className="animate-pulse h-10 bg-muted rounded" />
              </div>
            </div>
          </div>
        }
      >
        <RichestModal
          isOpen={showRichest}
          onClose={() => setShowRichest(false)}
          currentUser={chat.currentUser}
          onUserClick={handleUserClick}
        />
      </Suspense>

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
                const u = chat.onlineUsers.find((u) => u.id === id);
                return (
                  <div key={id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      {u ? (
                        <ProfileImage user={u} size="small" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                          ?
                        </div>
                      )}
                      <span className="font-medium">
                        {u ? u.username : `مستخدم غير متصل #${id}`}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => chat.unignoreUser?.(id)}>
                      إلغاء التجاهل
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showStoryViewer.show && (
        <Suspense fallback={null}>
          <StoryViewer
            initialUserId={showStoryViewer.userId || undefined}
            onClose={() => setShowStoryViewer({ show: false, userId: null })}
          />
        </Suspense>
      )}
    </div>
  );
}
