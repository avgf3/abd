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
import { lazy, Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'wouter';
import { saveSession } from '@/lib/socket';

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
import { setCachedUser, getCachedUserWithMerge } from '@/utils/userCacheManager';
import { getPmLastOpened, setPmListLastOpened } from '@/utils/messageUtils';
import { getFinalUsernameColor } from '@/utils/themeUtils';

interface ChatInterfaceProps {
  chat: UseChatReturn;
  onLogout: () => void;
}

export default function ChatInterface({ chat, onLogout }: ChatInterfaceProps) {
  const [, setLocation] = useLocation();
  const { showSuccessToast, showErrorToast } = useNotificationManager(chat.currentUser);
  const [showProfile, setShowProfile] = useState(false);
  const [profileUser, setProfileUser] = useState<ChatUser | null>(null);
  // 🔊 مشغل موسيقى البروفايل العالمي
  const profileAudioRef = useRef<HTMLAudioElement | null>(null);
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
    updateRoomUserCount,
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
        } else {
          showErrorToast('لم يتم استلام بيانات الغرفة من الخادم', 'فشل الإنشاء');
        }
      } catch (error: any) {
        const msg = error?.message || 'فشل في إنشاء الغرفة';
        showErrorToast(msg, 'خطأ');
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
          if (chat.currentRoomId === roomId) {
            chat.joinRoom('general');
          }
          showSuccessToast('تم حذف الغرفة بنجاح', 'تم حذف الغرفة');
        } else {
          showErrorToast('تعذر حذف الغرفة', 'خطأ');
        }
      } catch (error: any) {
        const msg = error?.message || 'فشل في حذف الغرفة';
        showErrorToast(msg, 'خطأ');
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
      const onRoomUpdate = (payload: any) => {
        // معالجة تحديث عدد المستخدمين في الوقت الفعلي
        if (payload.type === 'userCountUpdate' && payload.roomId && typeof payload.userCount === 'number') {
          updateRoomUserCount(payload.roomId, payload.userCount);
        } else {
          // جلب مُجبر لتحديث القائمة فوراً لباقي التحديثات
          fetchRooms(true).catch(() => {});
        }
      };
      
      const onChatLockUpdate = (payload: any) => {
        // تحديث إعدادات قفل الدردشة فوراً
        if (payload.roomId && payload.roomId === chat.currentRoomId) {
          fetchRooms(true).catch(() => {});
        }
      };
      
      s.on('roomUpdate', onRoomUpdate);
      s.on('chatLockUpdated', onChatLockUpdate);
      
      return () => {
        try { 
          s.off('roomUpdate', onRoomUpdate);
          s.off('chatLockUpdated', onChatLockUpdate);
        } catch {}
      };
    } catch {
      // ignore if socket not available
    }
  }, [fetchRooms, chat.currentRoomId]);

  // تحديث عدادات الغرف في الوقت الحقيقي بناءً على أحداث سوكت
  useEffect(() => {
    try {
      const { getSocket } = require('@/lib/socket');
      const s = getSocket();

      const onMessage = (envelope: any) => {
        try {
          if (!envelope || typeof envelope !== 'object') return;
          switch (envelope.type) {
            case 'onlineUsers': {
              const roomId = envelope.roomId;
              if (typeof roomId === 'string' && Array.isArray(envelope.users)) {
                updateRoomUserCount(roomId, envelope.users.length);
              }
              break;
            }
            case 'userUpdated': {
              const u = envelope.user;
              // إذا كانت نافذة البروفايل مفتوحة لذات المستخدم، حدّث العرض فوراً لضمان مزامنة lastSeen/الغرفة
              if (showProfile && u && profileUser && u.id === profileUser.id) {
                setProfileUser((prev) => (prev ? ({ ...prev, ...u } as any) : prev));
              }
              break;
            }
            case 'roomJoined': {
              const roomId = envelope.roomId;
              if (typeof roomId === 'string' && Array.isArray(envelope.users)) {
                updateRoomUserCount(roomId, envelope.users.length);
              }
              break;
            }
            // تم الاستغناء عن userJoinedRoom/userLeftRoom لصالح بث onlineUsers + رسائل system
            default:
              break;
          }
        } catch {}
      };

      s.on('message', onMessage);
      return () => {
        try { s.off('message', onMessage); } catch {}
      };
    } catch {
      // ignore
    }
  }, [rooms, updateRoomUserCount]);

  

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
  // تفاصيل المستخدمين المتجاهلين (اسم + معلومات إضافية إن توفرت للّون)
  const [ignoredUsersData, setIgnoredUsersData] = useState<Map<number, Partial<ChatUser> & { id: number; username: string }>>(new Map());

  // عند فتح نافذة المتجاهلين: اجلب قائمة المتجاهلين بأسمائهم مباشرة (بدون كاش)
  useEffect(() => {
    if (!showIgnoredUsers) return;
    
    let cancelled = false;
    
    const fetchIgnoredUsersData = async () => {
      try {
        const currentUserId = chat.currentUser?.id;
        if (!currentUserId) return;
        
        const data = await apiRequest(`/api/users/${currentUserId}/ignored?detailed=true`);
        
        if (cancelled) return;
        
        const map = new Map<number, Partial<ChatUser> & { id: number; username: string }>();
        const list: Array<Partial<ChatUser> & { id: number; username: string }> = Array.isArray((data as any)?.users)
          ? (data as any).users
          : [];
        
        list.forEach((u) => {
          if (u && typeof u.id === 'number' && u.username) {
            map.set(u.id, u);
          }
        });
        
        setIgnoredUsersData(map);
      } catch (error) {
        console.error('❌ خطأ في جلب بيانات المستخدمين المتجاهلين:', error);
        // في حالة الخطأ، نحاول استخدام البيانات المتاحة من المستخدمين المتصلين
        const fallbackMap = new Map<number, { id: number; username: string }>();
        Array.from(chat.ignoredUsers || []).forEach(id => {
          const onlineUser = chat.onlineUsers.find(u => u.id === id);
          if (onlineUser) {
            fallbackMap.set(id, { id: onlineUser.id, username: onlineUser.username });
          }
        });
        setIgnoredUsersData(fallbackMap);
      }
    };
    
    fetchIgnoredUsersData();
    
    return () => { 
      cancelled = true; 
    };
  }, [showIgnoredUsers, chat.currentUser?.id]);
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
      // استخدم مسار path param المتوافق دائماً، مع إبقاء query endpoint كاحتياطي داخل الخادم
      return await apiRequest(`/api/notifications/${currentUserId}/unread-count`);
    },
    enabled: !!currentUserId,
    // التحديث يتم عبر أحداث الوقت الحقيقي (invalidate في useNotificationManager)
    refetchInterval: false,
    staleTime: 30000,
  });
  const unreadNotificationsCount = unreadNotifData?.count || 0;

  // When opening notifications panel, optimistically clear the badge immediately
  const handleOpenNotifications = useCallback(() => {
    try {
      if (currentUserId) {
        queryClient.setQueryData(['/api/notifications/unread-count', currentUserId], { count: 0 });
      }
    } catch {}
    setShowNotifications(true);
  }, [currentUserId, queryClient]);

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

  // Listen for spam stats updates via socket to refresh the reports badge instantly
  useEffect(() => {
    try {
      const { getSocket } = require('@/lib/socket');
      const s = getSocket();
      const onMessage = (payload: any) => {
        if (payload?.type === 'spamStatsUpdated') {
          try {
            queryClient.setQueryData(['/api/spam-stats', currentUserId], { stats: payload.stats });
          } catch {}
        }
      };
      s.on('message', onMessage);
      return () => {
        try { s.off('message', onMessage); } catch {}
      };
    } catch {}
  }, [currentUserId, queryClient]);

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

  // مزامنة قراءات الخاص بين التبويبات: عند وصول حدث conversationRead صفّر الشارة محلياً
  useEffect(() => {
    const onConversationRead = (data: any) => {
      try {
        if (!chat.currentUser?.id) return;
        // تحديث قائمة المحادثات لتحديث unreadCount
        queryClient.invalidateQueries({
          queryKey: ['/api/private-messages/conversations', chat.currentUser.id],
        });
      } catch {}
    };
    // يتم بث الحدث عبر socket ضمن قناة message، لذا نلتقطه من useChat reducer عبر نافذة events
    window.addEventListener('conversationRead' as any, onConversationRead as any);
    return () => window.removeEventListener('conversationRead' as any, onConversationRead as any);
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
    // إغلاق أي نوافذ مفتوحة فوراً
    try { setShowRichest(false); } catch {}
    closeUserPopup();
    
    // تنظيف البيانات القديمة أولاً
    setProfileUser(null);
    
    // ثم عرض البيانات الجديدة فوراً
    const startProfileAudioForUser = (u?: ChatUser | null) => {
      try {
        if (
          u?.profileMusicUrl &&
          (u as any).profileMusicEnabled !== false &&
          (chat.currentUser as any)?.globalSoundEnabled !== false
        ) {
          if (!profileAudioRef.current) {
            profileAudioRef.current = new Audio();
          }
          const audio = profileAudioRef.current;
          audio.src = u.profileMusicUrl;
          const vol = typeof u.profileMusicVolume === 'number' ? u.profileMusicVolume : 70;
          audio.volume = Math.max(0, Math.min(1, (vol || 70) / 100));
          audio.loop = true;
          // استئناف التشغيل بشكل موثوق
          audio.pause();
          audio.currentTime = 0;
          const tryPlay = async (mutedFirst = true) => {
            try {
              audio.muted = false;
              await audio.play();
            } catch (e) {
              if (mutedFirst) {
                try {
                  audio.muted = true;
                  await audio.play();
                  setTimeout(() => {
                    try { audio.muted = false; } catch {}
                  }, 120);
                } catch {
                  const onFirstGesture = async () => {
                    try { await audio.play(); } catch {}
                    window.removeEventListener('click', onFirstGesture);
                    window.removeEventListener('touchstart', onFirstGesture);
                  };
                  window.addEventListener('click', onFirstGesture, { once: true });
                  window.addEventListener('touchstart', onFirstGesture, { once: true });
                }
              }
            }
          };
          tryPlay(true);
        } else {
          try { profileAudioRef.current?.pause(); } catch {}
        }
      } catch {}
    };

    setTimeout(async () => {
      if (chat.currentUser && user.id === chat.currentUser.id) {
        setProfileUser(chat.currentUser);
      } else {
        // تحميل البيانات الكاملة من الخادم مع تحديث الكاش، واستخدام الكاش كاحتياطي عند الفشل
        try {
          const fullUserData = await apiRequest(`/api/users/${user.id}`);
          if (fullUserData && (fullUserData as any).id) {
            setCachedUser(fullUserData as ChatUser);
            setProfileUser(fullUserData as ChatUser);
            // إعادة محاولة تشغيل موسيقى البروفايل بعد توفر البيانات الكاملة
            startProfileAudioForUser(fullUserData as ChatUser);
          } else {
            const merged = getCachedUserWithMerge(user.id, user as Partial<ChatUser>);
            setProfileUser(merged);
            startProfileAudioForUser(merged);
          }
        } catch {
          const merged = getCachedUserWithMerge(user.id, user as Partial<ChatUser>);
          setProfileUser(merged);
          startProfileAudioForUser(merged);
        }
      }
      setShowProfile(true);
    }, 0);
    try {
      // محاولة مبدئية لتشغيل الموسيقى من بيانات المستخدم الأولية (قد تُستبدل بعد جلب البيانات الكاملة)
      startProfileAudioForUser(user);
    } catch {}

    // جلب نسخة محدثة وكاملة من الخادم لتوحيد عرض البروفايل (خاصة لمستخدمي VIP ذوي البيانات المختصرة)
    try {
      const uid = user?.id;
      if (uid) {
        (async () => {
          try {
            const data = await apiRequest(`/api/users/${uid}`);
            if (data && (data as any).id) {
              setCachedUser(data as any);
              setProfileUser(data as any);
              // تأكيد تشغيل الموسيقى بعد الجلب النهائي
              startProfileAudioForUser(data as ChatUser);
            }
          } catch {}
        })();
      }
    } catch {}
  };

  const handleViewStories = (user?: ChatUser) => {
    setShowStoryViewer({ show: true, userId: user?.id || undefined });
    closeUserPopup();
  };

  // Render story viewer
  { /* keep near bottom overlays */ }

  // معالج للروابط الشخصية
  const handleProfileLink = async (userId: number) => {
    // البحث عن المستخدم في القائمة أولاً
    let user = chat.onlineUsers.find((u) => u.id === userId);
    
    if (!user) {
      // محاولة جلب البيانات من السيرفر
      try {
        const data = await apiRequest(`/api/users/${userId}`);
        if (data && (data as any).id) {
          user = data as ChatUser;
        }
      } catch (error) {
        showErrorToast('لم نتمكن من العثور على هذا المستخدم', 'مستخدم غير موجود');
        return;
      }
    }
    
    // استخدام handleViewProfile الموحد
    if (user) {
      handleViewProfile(user);
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
        // إذا كان الرابط يشير إلى المستخدم الحالي، افتح ببيانات حية مباشرة
        if (chat.currentUser && chat.currentUser.id === userId) {
          setProfileUser(chat.currentUser);
          setShowProfile(true);
        } else {
          handleProfileLink(userId);
        }
        window.history.replaceState(null, '', window.location.pathname);
      } else if (pmMatch) {
        const userId = parseInt(pmMatch[1]);
        const openPm = async () => {
          let user = chat.onlineUsers.find((u) => u.id === userId);
          if (!user) {
            try {
              const data = await apiRequest(`/api/users/${userId}`);
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
    // تحميل فوري للمكون والبيانات عند تحميل الصفحة
    const preloadImmediately = async () => {
      try {
        // تحميل المكون فوراً
        preloadRichestModule();
        
        // تحميل البيانات فوراً مع إعطاء الأولوية للبيانات المحفوظة محلياً
        const cachedData = queryClient.getQueryData(['/api/vip']);
        if (!cachedData) {
          // إذا لم تكن البيانات محفوظة، احملها فوراً
          await queryClient.prefetchQuery({
            queryKey: ['/api/vip'],
            queryFn: () => apiRequest('/api/vip?limit=10'),
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
          });
        }
        
        if (isOwnerOrAdmin) {
          const cachedCandidates = queryClient.getQueryData(['/api/vip/candidates']);
          if (!cachedCandidates) {
            await queryClient.prefetchQuery({
              queryKey: ['/api/vip/candidates'],
              queryFn: () => apiRequest('/api/vip/candidates'),
              staleTime: 5 * 60 * 1000,
              gcTime: 10 * 60 * 1000,
            });
          }
        }
      } catch {}
    };

    // تشغيل فوري بدلاً من انتظار idle
    preloadImmediately();
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
      style={{ overflowX: 'hidden' }}
    >
      {/* Modern Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 modern-nav app-header safe-area-top h-14 px-2 sm:px-4 flex justify-start items-center ${isMobile ? 'mobile-header' : ''}`}
      >
        <div className={`flex gap-1 sm:gap-2 overflow-x-hidden max-w-full ${isMobile ? 'justify-evenly w-full' : ''}`}>
          <Button
            className={`glass-effect rounded-lg hover:bg-accent transition-all duration-200 flex items-center ${
              isMobile ? 'flex-1 px-2 py-2 text-xs gap-1.5' : 'px-3 py-2 gap-2'
            }`}
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className={isMobile ? "w-[18px] h-[18px]" : "w-4 h-4"} />
            <span className={`font-medium ${isMobile ? 'tab-text-hide' : ''}`}>إعدادات</span>
          </Button>

          <Button
            className={`glass-effect rounded-lg hover:bg-accent transition-all duration-200 flex items-center border border-yellow-400 ${
              isMobile ? 'flex-1 px-2 py-2 text-xs gap-1.5' : 'px-3 py-2 gap-2'
            }`}
            onMouseEnter={prefetchVip}
            onFocus={prefetchVip}
            onClick={() => setShowRichest(true)}
            title="الأثرياء"
          >
            <Crown className={isMobile ? "w-[18px] h-[18px] text-yellow-400" : "w-4 h-4 text-yellow-400"} />
          </Button>

          {/* زر إضافة غرفة جديدة للمالك */}
          {chat.currentUser && chat.currentUser.userType === 'owner' && (
            <Button
              className={`glass-effect rounded-lg hover:bg-accent transition-all duration-200 flex items-center ${
                isMobile ? 'flex-1 px-2 py-2 text-xs gap-1.5' : 'px-3 py-2 gap-2'
              }`}
              onClick={() => setShowAddRoomDialog(true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={isMobile ? "18" : "16"}
                height={isMobile ? "18" : "16"}
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
              <span className={`font-medium ${isMobile ? 'tab-text-hide' : ''}`}>إضافة غرفة</span>
            </Button>
          )}

          {/* زر خاص بالمالك فقط */}
          {chat.currentUser && chat.currentUser.userType === 'owner' && (
            <Button
              className={`glass-effect rounded-lg hover:bg-purple-600 transition-all duration-200 flex items-center border border-purple-400 ${
                isMobile ? 'flex-1 px-2 py-2 text-xs gap-1.5' : 'px-4 py-2 gap-2'
              }`}
              onClick={() => setShowOwnerPanel(true)}
            >
              <Crown className={isMobile ? "w-[18px] h-[18px]" : "w-4 h-4"} />
              <span className={`font-medium ${isMobile ? 'tab-text-hide' : ''}`}>إدارة المالك</span>
            </Button>
          )}

          {/* زر لوحة الإدارة للمشرفين */}
          {chat.currentUser &&
            (chat.currentUser.userType === 'owner' || chat.currentUser.userType === 'admin') && (
              <>
                {/* زر ترقية المستخدمين - للمالك فقط */}
                {chat.currentUser?.userType === 'owner' && (
                  <Button
                    className={`glass-effect rounded-lg hover:bg-blue-600 transition-all duration-200 flex items-center ${
                      isMobile ? 'flex-1 px-2 py-2 text-xs gap-1.5' : 'px-4 py-2 gap-2'
                    }`}
                    onClick={() => setShowPromotePanel(true)}
                  >
                    <Crown className={isMobile ? "w-[18px] h-[18px]" : "w-4 h-4"} />
                    <span className={`font-medium ${isMobile ? 'tab-text-hide' : ''}`}>ترقية المستخدمين</span>
                  </Button>
                )}

                <Button
                  className={`glass-effect rounded-lg hover:bg-yellow-600 transition-all duration-200 flex items-center border border-yellow-400 ${
                    isMobile ? 'flex-1 px-2 py-2 text-xs gap-1.5' : 'px-4 py-2 gap-2'
                  }`}
                  onClick={() => setShowActiveActions(true)}
                >
                  <Lock className={isMobile ? "w-[18px] h-[18px]" : "w-4 h-4"} />
                  <span className={`font-medium ${isMobile ? 'tab-text-hide' : ''}`}>سجل الإجراءات النشطة</span>
                </Button>

                <Button
                  className={`glass-effect rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center border border-red-400 relative ${
                    isMobile ? 'flex-1 px-2 py-2 text-xs gap-1.5' : 'px-4 py-2 gap-2'
                  }`}
                  onClick={() => setShowReportsLog(true)}
                >
                  <AlertTriangle className={isMobile ? "w-[18px] h-[18px]" : "w-4 h-4"} />
                  <span className={`font-medium ${isMobile ? 'tab-text-hide' : ''}`}>سجل البلاغات</span>
                  {pendingReportsCount > 0 && (
                    <span className="absolute -top-2 -right-2 inline-flex items-center justify-center text-[10px] min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white">
                      {pendingReportsCount}
                    </span>
                  )}
                </Button>

                <Button
                  className={`glass-effect rounded-lg transition-all duration-200 flex items-center border ${
                    isMobile ? 'flex-1 px-2 py-2 text-xs gap-1.5' : 'px-4 py-2 gap-2'
                  }`}
                  onClick={async () => {
                    if (!chat.currentUser) return;
                    try {
                      const endpoint = chat.currentUser.isHidden
                        ? `/api/users/${chat.currentUser.id}/show-online`
                        : `/api/users/${chat.currentUser.id}/hide-online`;
                      const res = await apiRequest(endpoint, { method: 'POST' });
                      const nowHidden = (res as any)?.isHidden ?? !chat.currentUser.isHidden;
                      // تحديث حالة المستخدم عبر setState لضمان إعادة التصيير
                      chat.updateCurrentUser?.({ isHidden: nowHidden } as any);
                      try {
                        const msg = (res as any)?.message || (nowHidden ? 'تم إخفاؤك من قائمة المتصلين' : 'تم إظهارك في قائمة المتصلين');
                        showSuccessToast(msg, 'تم التحديث');
                      } catch {}
                    } catch (e) {
                      showErrorToast('تعذر تحديث حالة الظهور', 'خطأ');
                    }
                  }}
                  title="إخفائي من قائمة المتصلين للجميع"
                >
                  {chat.currentUser?.isHidden ? (
                    <>
                      <Eye className={isMobile ? "w-[18px] h-[18px]" : "w-4 h-4"} />
                      <span className={`font-medium ${isMobile ? 'tab-text-hide' : ''}`}>إظهار</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className={isMobile ? "w-[18px] h-[18px]" : "w-4 h-4"} />
                      <span className={`font-medium ${isMobile ? 'tab-text-hide' : ''}`}>إخفاء</span>
                    </>
                  )}
                </Button>

                <Button
                  className={`glass-effect rounded-lg hover:bg-accent transition-all duration-200 flex items-center ${
                    isMobile ? 'flex-1 px-2 py-2 text-xs gap-1.5' : 'px-4 py-2 gap-2'
                  }`}
                  onClick={() => setShowModerationPanel(true)}
                >
                  <Shield className={isMobile ? "w-[18px] h-[18px]" : "w-4 h-4"} />
                  <span className={`font-medium ${isMobile ? 'tab-text-hide' : ''}`}>إدارة</span>
                </Button>
              </>
            )}

          <Button
            className={`glass-effect rounded-lg hover:bg-accent transition-all duration-200 flex items-center ${
              isMobile ? 'flex-1 px-2 py-2 text-xs gap-1.5' : 'px-4 py-2 gap-2'
            }`}
            onClick={() => { try { if (chat.currentUser?.id) setPmListLastOpened(chat.currentUser.id); } catch {} setShowMessages(true); }}
            title="الرسائل"
          >
            <MessageSquare className={isMobile ? "w-[18px] h-[18px]" : "w-4 h-4"} />
            <span className={`font-medium ${isMobile ? 'tab-text-hide' : ''}`}>الرسائل</span>
            {totalUnreadPrivateMessages > 0 && (
              <span className="ml-2 inline-flex items-center justify-center text-[10px] min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white">
                {totalUnreadPrivateMessages}
              </span>
            )}
          </Button>

          <Button
            className={`glass-effect rounded-lg hover:bg-accent transition-all duration-200 flex items-center relative ${
              isMobile ? 'flex-1 px-2 py-2 text-xs gap-1.5' : 'px-4 py-2 gap-2'
            }`}
            onClick={handleOpenNotifications}
          >
            <Bell className={isMobile ? "w-[18px] h-[18px]" : "w-4 h-4"} />
            <span className={`font-medium ${isMobile ? 'tab-text-hide' : ''}`}>إشعارات</span>
            {unreadNotificationsCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center text-[10px] min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white">
                {unreadNotificationsCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content - تحسين التخطيط للجوال */}
      <main
        className={`flex flex-1 overflow-hidden min-h-0 ${isMobile ? 'flex-col' : 'flex-col sm:flex-row'}`}
        style={{ 
          paddingTop: 'var(--app-header-height)', 
          paddingBottom: isMobile ? 'calc(var(--app-footer-height) + env(safe-area-inset-bottom))' : 'var(--app-footer-height)', 
          height: 'var(--app-body-height)'
        }}
      >
        {/* الشريط الجانبي - على الجوال يعرض بملء الشاشة عند اختيار التبويب */}
        {activeView !== 'hidden' && (
          <div
            className={`${
              isMobile && typeof window !== 'undefined' && window.innerWidth <= 768
                ? 'fixed top-0 left-0 right-0 bottom-0 z-40 bg-background/95 backdrop-blur-md' 
                : activeView === 'walls' ? 'w-full sm:w-96' : activeView === 'friends' ? 'w-full sm:w-80' : 'w-full sm:w-64'
            } max-w-full sm:shrink-0 transition-all duration-300 min-h-0 flex flex-col`}
            style={{ 
              maxHeight: (isMobile && typeof window !== 'undefined' && window.innerWidth <= 768) ? '100dvh' : 'calc(100dvh - var(--app-header-height) - var(--app-footer-height))',
              paddingTop: (isMobile && typeof window !== 'undefined' && window.innerWidth <= 768) ? 'var(--app-header-height)' : '0',
              paddingBottom: (isMobile && typeof window !== 'undefined' && window.innerWidth <= 768) ? 'var(--app-footer-height)' : '0'
            }}
          >
            {/* زر إغلاق للجوال */}
            {isMobile && typeof window !== 'undefined' && window.innerWidth <= 768 && (
              <div className="flex justify-between items-center p-4 border-b border-border">
                <h2 className="text-lg font-semibold">
                  {activeView === 'walls' && 'الحائط'}
                  {activeView === 'users' && 'المستخدمون المتصلون'}
                  {activeView === 'rooms' && 'الغرف'}
                  {activeView === 'friends' && 'الأصدقاء'}
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveView('hidden')}
                  className="p-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </Button>
              </div>
            )}
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
                  <Suspense fallback={null}>
                    <BroadcastRoomInterface
                      currentUser={chat.currentUser}
                      room={currentRoom}
                      onlineUsers={chat.onlineUsers}
                      onSendMessage={(content) => {
                        chat.sendMessage(content, 'text', undefined, chat.currentRoomId);
                      }}
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
                  className={`flex-1 flex min-h-0 ${isMobile ? 'w-full' : ''}`}
                  style={{ 
                    maxHeight: isMobile ? 'var(--app-body-height)' : 'calc(100dvh - var(--app-header-height) - var(--app-footer-height))',
                    minHeight: isMobile ? 'var(--app-body-height)' : 'auto'
                  }}
                >
                  <Suspense fallback={null}>
                    <MessageArea
                      messages={chat.publicMessages}
                      currentUser={chat.currentUser}
                      onSendMessage={(content, messageType, textColor, bold) => {
                        // Get composer style values
                        const finalTextColor = textColor || '#000000';
                        const finalBold = bold || false;
                        chat.sendMessage(content, messageType || 'text', undefined, chat.currentRoomId, finalTextColor, finalBold);
                      }}
                      onTyping={() => chat.sendTyping()}
                      typingUsers={chat.typingUsers}
                      onReportMessage={handleReportUser}
                      onUserClick={handleUserClick}
                      onlineUsers={chat.onlineUsers}
                      currentRoomName={currentRoom?.name || 'الدردشة العامة'}
                      currentRoomId={chat.currentRoomId}
                      ignoredUserIds={chat.ignoredUsers}
                      chatLockAll={currentRoom?.chatLockAll}
                      chatLockVisitors={currentRoom?.chatLockVisitors}
                    />
                  </Suspense>
                </div>
              );
            })()
          : null}
      </main>

      {/* Modern Footer Navigation */}
      {!showRichest && (
      <footer
        className={`fixed bottom-0 left-0 right-0 z-[60] modern-nav app-footer safe-area-bottom h-14 px-2 sm:px-4 flex justify-start items-center ${isMobile ? 'mobile-footer' : ''}`}
      >
        <div className={`flex gap-1 sm:gap-2 overflow-x-hidden max-w-full ${isMobile ? 'justify-evenly w-full' : ''}`}>
          {/* الحوائط */}
          <Button
            size="sm"
            className={`glass-effect themed-nav transition-all duration-200 flex items-center gap-1.5 ${
              isMobile ? 'flex-1 px-2 py-2 text-xs' : 'px-2 py-1.5 text-sm'
            }${activeView === 'walls' ? ' themed-active' : ' hover:bg-accent'} rounded-lg`}
            onClick={() => setActiveView((prev) => (prev === 'walls' ? 'hidden' : 'walls'))}
            title="الحائط"
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
            <span className={isMobile ? 'tab-text-hide' : ''}>الحائط</span>
          </Button>

          {/* المستخدمون */}
          <Button
            size="sm"
            className={`glass-effect themed-nav transition-all duration-200 flex items-center gap-1.5 ${
              isMobile ? 'flex-1 px-2 py-2 text-xs' : 'px-2 py-1.5 text-sm'
            }${activeView === 'users' ? ' themed-active' : ' hover:bg-accent'} rounded-lg`}
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
            <span className={isMobile ? 'tab-text-hide' : ''}>المستخدمون ({chat.onlineUsers?.length ?? 0})</span>
          </Button>

          {/* الغرف */}
          <Button
            size="sm"
            className={`glass-effect themed-nav transition-all duration-200 flex items-center gap-1.5 ${
              isMobile ? 'flex-1 px-2 py-2 text-xs' : 'px-2 py-1.5 text-sm'
            }${activeView === 'rooms' ? ' themed-active' : ' hover:bg-accent'} rounded-lg`}
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
            <span className={isMobile ? 'tab-text-hide' : ''}>الغرف</span>
          </Button>

          {/* الأصدقاء */}
          <Button
            size="sm"
            className={`glass-effect themed-nav transition-all duration-200 flex items-center gap-1.5 ${
              isMobile ? 'flex-1 px-2 py-2 text-xs' : 'px-2 py-1.5 text-sm'
            }${activeView === 'friends' ? ' themed-active' : ' hover:bg-accent'} rounded-lg`}
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
            <span className={isMobile ? 'tab-text-hide' : ''}>الأصدقاء</span>
          </Button>
        </div>
      </footer>
      )}

      {/* Modals and Popups */}
      {showProfile && (
        <Suspense fallback={<div className="p-4 text-center">...جاري التحميل</div>}>
          <>
            {profileUser && profileUser.id !== chat.currentUser?.id ? (
              <ProfileModal
                key={`profile-${profileUser?.id || 'none'}`}
                user={profileUser}
                currentUser={chat.currentUser}
                externalAudioManaged
                onClose={() => {
                  setShowProfile(false);
                  setProfileUser(null);
                  try { profileAudioRef.current?.pause(); } catch {}
                }}
                onUpdate={(updatedUser) => {
                  if (!updatedUser || !updatedUser.id) return;
                  // لا تحدث حالة المستخدم الحالي إلا إذا كان هو المعني بالتحديث
                  if (chat.currentUser?.id === updatedUser.id) {
                    const updates: any = {
                      profileEffect: updatedUser.profileEffect,
                      usernameColor: updatedUser.usernameColor,
                      profileBackgroundColor: updatedUser.profileBackgroundColor,
                    };
                    if (typeof (updatedUser as any)?.dmPrivacy === 'string') {
                      updates.dmPrivacy = (updatedUser as any).dmPrivacy;
                    }
                    chat.updateCurrentUser(updates);
                  }
                  // تحديث/تنظيف الكاش دائماً للمستخدم الذي تم تحديثه
                  setCachedUser(updatedUser);
                  // إيقاف الصوت الخارجي إذا تمت إزالة موسيقى البروفايل
                  if (!updatedUser.profileMusicUrl) {
                    try { profileAudioRef.current?.pause(); } catch {}
                    try { if (profileAudioRef.current) profileAudioRef.current.src = ''; } catch {}
                  }
                }}
              />
            ) : (
              <ProfileModal
                key={`profile-${chat.currentUser?.id || profileUser?.id || 'self'}`}
                // مرّر نسخة حية دومًا لمستخدمك الحالي عند فتح بروفايلك
                user={chat.currentUser || profileUser}
                currentUser={chat.currentUser}
                externalAudioManaged
                onClose={() => {
                  setShowProfile(false);
                  setProfileUser(null);
                  try { profileAudioRef.current?.pause(); } catch {}
                }}
                onUpdate={(updatedUser) => {
                  // تحديث بيانات المستخدم الحالي في قائمة المتصلون
                  if (updatedUser && updatedUser.id) {
                    const updates: any = {
                      profileEffect: updatedUser.profileEffect,
                      usernameColor: updatedUser.usernameColor,
                      profileBackgroundColor: updatedUser.profileBackgroundColor,
                    };
                    if (typeof (updatedUser as any)?.dmPrivacy === 'string') {
                      updates.dmPrivacy = (updatedUser as any).dmPrivacy;
                    }
                    chat.updateCurrentUser(updates);
                    // تحديث/تنظيف الكاش بعد التحديث الناجح
                    setCachedUser(updatedUser);
                    // إيقاف الصوت الخارجي إذا تمت إزالة موسيقى البروفايل
                    if (!updatedUser.profileMusicUrl) {
                      try { profileAudioRef.current?.pause(); } catch {}
                      try { if (profileAudioRef.current) profileAudioRef.current.src = ''; } catch {}
                    }
                  }
                }}
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

              // تشغيل الموسيقى الخاصة بالمستخدم الحالي لو متاحة
              try {
                const u = chat.currentUser;
                if (
                  u?.profileMusicUrl &&
                  (u as any).profileMusicEnabled !== false &&
                  (chat.currentUser as any)?.globalSoundEnabled !== false
                ) {
                  if (!profileAudioRef.current) profileAudioRef.current = new Audio();
                  const audio = profileAudioRef.current;
                  audio.src = u.profileMusicUrl;
                  const vol = typeof u.profileMusicVolume === 'number' ? u.profileMusicVolume : 70;
                  audio.volume = Math.max(0, Math.min(1, (vol || 70) / 100));
                  audio.loop = true;
                  audio.pause();
                  audio.currentTime = 0;
                  audio.play().catch(async () => {
                    try {
                      audio.muted = true;
                      await audio.play();
                      setTimeout(() => { try { audio.muted = false; } catch {} }, 120);
                    } catch {}
                  });
                } else {
                  try { profileAudioRef.current?.pause(); } catch {}
                }
              } catch {}

              // ثم اجلب نسخة محدثة وكاملة لتوحيد العرض مع قائمة المستخدمين
              try {
                const userId = chat.currentUser?.id;
                if (userId) {
                  (async () => {
                    try {
                      const data = await apiRequest(`/api/users/${userId}`);
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
            onOpenRooms={() => { try { setShowSettings(false); } catch {}; try { setActiveView('hidden'); } catch {}; try { saveSession({ roomId: 'public' as any }); } catch {}; setLocation('/rooms'); }}
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
            currentRoomId={chat.currentRoomId}
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
              className="absolute left-2 top-2 px-2 py-1 hover:bg-red-100 text-red-600 text-sm font-medium rounded"
              aria-label="إغلاق"
              title="إغلاق"
            >
              ✖️
            </button>
            <Suspense fallback={<div className="p-4 text-center">...جاري التحميل</div>}>
              <UsernameColorPicker
                currentUser={chat.currentUser}
                onColorUpdate={(value) => {
                  // دعم كلٍ من اللون والتدرج: إذا كان value تدرجاً فحدّث usernameGradient محلياً
                  const isGradient = typeof value === 'string' && value.trim().toLowerCase().startsWith('linear-gradient(');
                  if (isGradient) {
                    chat.updateCurrentUser({ usernameGradient: value, usernameColor: null } as any);
                  } else {
                    chat.updateCurrentUser({ usernameColor: value, usernameGradient: null } as any);
                  }
                  setShowUsernameColorPicker(false);
                }}
                onUserFieldsUpdate={(partial) => {
                  // تحديث فوري محلي لتأثير/تدرج/لون الاسم بدون انتظار بث WebSocket
                  chat.updateCurrentUser(partial as any);
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
      {showRichest && (
        <Suspense fallback={null}>
          <RichestModal
            isOpen={showRichest}
            onClose={() => setShowRichest(false)}
            currentUser={chat.currentUser}
            onUserClick={(e, u) => { try { e.stopPropagation(); } catch {}; try { setShowRichest(false); } catch {}; handleViewProfile(u); }}
          />
        </Suspense>
      )}

      {showIgnoredUsers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card text-foreground border border-border rounded-lg shadow-xl w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">المستخدمون المتجاهلون</h3>
              <button
                onClick={() => setShowIgnoredUsers(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {(!chat.ignoredUsers || chat.ignoredUsers.size === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="mb-3">✅</div>
                  <p className="text-sm">لا توجد مستخدمين متجاهلين</p>
                </div>
              ) : (
                Array.from(chat.ignoredUsers || []).map((id) => {
                const ignoredUser = ignoredUsersData.get(id);
                const onlineUser = chat.onlineUsers.find((u) => u.id === id);
                const user = ignoredUser || onlineUser;
                const colorUser = onlineUser || ignoredUser;
                
                return (
                  <div key={id} className="flex items-center justify-between p-2 border border-border rounded bg-background/60 hover:bg-accent/10 transition-colors">
                    <div className="flex items-center gap-2">
                      {user ? (
                        <div style={{ width: 36 * 1.4, height: 36 * 1.4, flexShrink: 0 }}>
                          <ProfileImage user={user as ChatUser} size="small" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground">
                          👤
                        </div>
                      )}
                      <span className="font-medium" style={{ color: colorUser ? getFinalUsernameColor(colorUser as any) : undefined }}>
                        {user?.username}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => chat.unignoreUser?.(id)}>
                      إلغاء التجاهل
                    </Button>
                  </div>
                );
              })
              )}
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
