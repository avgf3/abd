import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Heart,
  ThumbsUp,
  ThumbsDown,
  Send,
  Image as ImageIcon,
  Trash2,
  X,
  Users,
  Globe,
} from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import type { Socket } from 'socket.io-client';

import FriendsTabPanel from './FriendsTabPanel';
import ProfileImage from './ProfileImage';
import RoomComponent from './RoomComponent';
import SimpleUserMenu from './SimpleUserMenu';
import UserRoleBadge from './UserRoleBadge';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { useGrabScroll } from '@/hooks/useGrabScroll';
import { apiRequest } from '@/lib/queryClient';
import { getSocket, saveSession } from '@/lib/socket';
import type { ChatUser, WallPost, CreateWallPostData, ChatRoom } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import CountryFlag from '@/components/ui/CountryFlag';
import {
  getUserEffectStyles,
  getUserEffectClasses,
  getFinalUsernameColor,
  getUserListItemStyles,
  getUserListItemClasses,
  getUsernameDisplayStyle,
} from '@/utils/themeUtils';
import { formatTimeAgo } from '@/utils/timeUtils';

interface UnifiedSidebarProps {
  users: ChatUser[];
  onUserClick: (event: React.MouseEvent, user: ChatUser) => void;
  currentUser?: ChatUser | null;
  activeView?: 'users' | 'walls' | 'rooms' | 'friends';
  rooms?: ChatRoom[];
  currentRoomId?: string;
  onRoomChange?: (roomId: string) => void;
  onAddRoom?: (roomData: { name: string; description: string; image: File | null }) => void;
  onDeleteRoom?: (roomId: string) => void;
  onRefreshRooms?: () => void;
  onStartPrivateChat?: (friend: ChatUser) => void;
}

export default function UnifiedSidebar({
  users,
  onUserClick,
  currentUser,
  activeView: propActiveView,
  rooms = [],
  currentRoomId = '',
  onRoomChange,
  onAddRoom,
  onDeleteRoom,
  onRefreshRooms,
  onStartPrivateChat,
}: UnifiedSidebarProps) {
  const [activeView, setActiveView] = useState<'users' | 'walls' | 'rooms' | 'friends'>(
    propActiveView || 'users'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'public' | 'friends'>('public');
  const [postsByTab, setPostsByTab] = useState<{ public: WallPost[]; friends: WallPost[] }>({
    public: [],
    friends: [],
  });
  const [loadingByTab, setLoadingByTab] = useState<{ public: boolean; friends: boolean }>({
    public: false,
    friends: false,
  });
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // YouTube helpers (same logic as messages)
  const isAllowedYouTubeHost = useCallback((host: string) => {
    const h = host.toLowerCase();
    return (
      h === 'youtube.com' ||
      h === 'www.youtube.com' ||
      h === 'm.youtube.com' ||
      h === 'youtu.be' ||
      h === 'www.youtu.be' ||
      h === 'youtube-nocookie.com' ||
      h === 'www.youtube-nocookie.com'
    );
  }, []);

  const extractYouTubeId = useCallback(
    (rawUrl: string): string | null => {
      try {
        let u = rawUrl.trim();
        if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
        const url = new URL(u);
        if (!isAllowedYouTubeHost(url.hostname)) return null;
        const v = url.searchParams.get('v');
        if (v && /^[a-zA-Z0-9_-]{6,15}$/.test(v)) return v;
        if (/^\/(shorts|embed)\//.test(url.pathname)) {
          const id = url.pathname.split('/')[2] || '';
          return /^[a-zA-Z0-9_-]{6,15}$/.test(id) ? id : null;
        }
        if (url.hostname.toLowerCase().includes('youtu.be')) {
          const id = url.pathname.replace(/^\//, '');
          return /^[a-zA-Z0-9_-]{6,15}$/.test(id) ? id : null;
        }
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length > 0) {
          const last = parts[parts.length - 1];
          if (/^[a-zA-Z0-9_-]{6,15}$/.test(last)) return last;
        }
        return null;
      } catch {
        return null;
      }
    },
    [isAllowedYouTubeHost]
  );

  const parseYouTubeFromText = useCallback(
    (text: string): { cleaned: string; ids: string[] } => {
      if (!text) return { cleaned: '', ids: [] };
      const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
      const matches = text.match(urlRegex) || [];
      const ids: string[] = [];
      for (const m of matches) {
        const id = extractYouTubeId(m);
        if (id) ids.push(id);
      }
      let cleaned = text;
      for (const m of matches) {
        if (extractYouTubeId(m)) {
          cleaned = cleaned.split(m).join('').replace(/\s{2,}/g, ' ').trim();
        }
      }
      return { cleaned, ids };
    },
    [extractYouTubeId]
  );

  // دالة ترتيب المستخدمين حسب الرتب
  const getRankOrder = (userType: string): number => {
    switch (userType) {
      case 'owner':
        return 1;
      case 'admin':
        return 2;
      case 'moderator':
        return 3;
      case 'bot':
        return 4; // البوتات بعد المشرفين
      case 'member':
        return 5;
      case 'guest':
        return 6;
      default:
        return 7;
    }
  };

  // 🚀 تحسين: استخدام useMemo لفلترة وترتيب المستخدمين لتحسين الأداء
  const validUsers = useMemo(() => {
    const filtered = users.filter((user) => {
      // فلترة صارمة للمستخدمين الصالحين
      if (!user?.id || !user?.username || !user?.userType) {
        console.warn('🚫 مستخدم بيانات غير صالحة في القائمة:', user);
        return false;
      }

      // رفض الأسماء العامة
      if (user.username === 'مستخدم' || user.username === 'User' || user.username.trim() === '') {
        return false;
      }

      // رفض المعرفات غير الصالحة
      if (user.id <= 0) {
        return false;
      }

      return true;
    });

    // إزالة التكرارات حسب id
    const dedup = new Map<number, ChatUser>();
    for (const u of filtered) {
      if (!dedup.has(u.id)) dedup.set(u.id, u);
    }

    // ترتيب المستخدمين حسب الرتب: المالك أولاً، ثم الإدمن، ثم المشرف، ثم الأعضاء، ثم الضيوف
    // وداخل كل رتبة ترتيب أبجدي بالاسم
    const sorted = Array.from(dedup.values()).sort((a, b) => {
      const rankA = getRankOrder(a.userType);
      const rankB = getRankOrder(b.userType);

      // إذا كانت الرتب مختلفة، رتب حسب الرتبة
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // إذا كانت الرتب متساوية، رتب أبجدياً بالاسم
      return a.username.localeCompare(b.username, 'ar');
    });

    // طباعة الترتيب للتحقق من صحته (فقط في وضع التطوير)
    if (process.env.NODE_ENV === 'development' && sorted.length > 0) {
    }

    return sorted;
  }, [users]);

  const filteredUsers = useMemo(() => {
    // تطبيق البحث على المستخدمين الصالحين فقط
    if (!searchTerm.trim()) return validUsers;

    return validUsers.filter((user) => {
      return user.username.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [validUsers, searchTerm]);

  // 🚀 تحسين: استخدام مكون UserRoleBadge المركزي
  const renderUserBadge = useCallback((user: ChatUser) => {
    if (!user) return null;
    const baseSize = 20;
    const adjustedSize = user.userType === 'owner' ? Math.round(baseSize * 0.85) : baseSize;
    return <UserRoleBadge user={user} size={adjustedSize} />;
  }, []);

  // استبدال إيموجي العلم بصورة علم حقيقية
  const renderCountryFlag = useCallback(
    (user: ChatUser) => <CountryFlag country={user.country} size={14} />, []
  );

  // 🚀 تحسين: دالة formatLastSeen محسنة بدون "غير معروف"
  const formatLastSeen = useCallback((lastSeen?: string | Date) => {
    if (!lastSeen) return '';

    const lastSeenDate = lastSeen instanceof Date ? lastSeen : new Date(lastSeen);

    if (isNaN(lastSeenDate.getTime())) {
      return '';
    }

    const now = new Date();
    const diff = now.getTime() - lastSeenDate.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'متصل الآن';
    if (minutes < 60) return `قبل ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `قبل ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `قبل ${days} يوم`;
  }, []);

  // معالج النقر مع إيقاف انتشار الحدث
  const handleUserClick = useCallback(
    (e: React.MouseEvent, user: ChatUser) => {
      e.stopPropagation();
      onUserClick(e, user);
    },
    [onUserClick]
  );

  // التحقق من صلاحيات الإشراف
  const isModerator = useMemo(
    () => currentUser && ['moderator', 'admin', 'owner'].includes(currentUser.userType),
    [currentUser]
  );

  // 🗑️ حذف useEffect فارغ

  // جلب المنشورات عبر React Query مع كاش قوي
  const socketRef = useRef<Socket | null>(null);
  const usersScrollRef = useRef<HTMLDivElement>(null);
  const wallsScrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottomSidebarWall, setIsAtBottomSidebarWall] = useState(true);
  const wallImageInputRef = useRef<HTMLInputElement>(null);

  useGrabScroll(usersScrollRef);
  useGrabScroll(wallsScrollRef);

  const { data: wallData, isFetching } = useQuery<{ success?: boolean; posts: WallPost[] }>({
    queryKey: ['/api/wall/posts', activeTab, currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return { posts: [] } as any;
      return await apiRequest(`/api/wall/posts/${activeTab}?userId=${currentUser.id}`);
    },
    enabled: activeView === 'walls' && !!currentUser?.id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    initialData: () =>
      queryClient.getQueryData(['/api/wall/posts', activeTab, currentUser?.id]) as any,
  });

  useEffect(() => {
    const data = wallData as unknown as { posts?: WallPost[] } | undefined;
    setLoadingByTab((prev) => ({ ...prev, [activeTab]: isFetching }));
    if (data?.posts) {
      setPostsByTab((prev) => ({ ...prev, [activeTab]: data.posts! }));
    }
  }, [wallData, isFetching, activeTab]);

  // تحديث activeView عند تغيير propActiveView
  useEffect(() => {
    if (propActiveView) {
      setActiveView(propActiveView);
    }
  }, [propActiveView]);

  // اشترك في Socket للتحديث الفوري لمنشورات الحائط
  useEffect(() => {
    if (activeView === 'walls' && currentUser?.id) {
      if (!socketRef.current) {
        const s = getSocket();
        socketRef.current = s;
      }

      const s = socketRef.current!;

      // حفظ سياق الحائط في الجلسة بدون العبث بـ roomId
      saveSession({ wallTab: activeTab });

      const onMessage = (payload: any) => {
        try {
          // يدعم الشكل {type: ...} أو {envelope: {type: ...}}
          const message = payload?.envelope || payload || {};
          if (message.type === 'newWallPost') {
            const postType: 'public' | 'friends' =
              (message.wallType || message.post?.type || 'public') === 'friends' ? 'friends' : 'public';
            // حدّث بيانات التبويب المقابل دائماً
            setPostsByTab((prev) => ({ ...prev, [postType]: [message.post, ...(prev[postType] || [])] }));
            queryClient.setQueryData(
              ['/api/wall/posts', postType, currentUser.id],
              (old: any) => {
                const oldPosts: WallPost[] = old?.posts || [];
                return { ...(old || {}), posts: [message.post, ...oldPosts] };
              }
            );
          } else if (message.type === 'wallPostReaction') {
            const postType: 'public' | 'friends' =
              (message.wallType || message.post?.type || 'public') === 'friends' ? 'friends' : 'public';
            setPostsByTab((prev) => ({
              ...prev,
              [postType]: (prev[postType] || []).map((p) => (p.id === message.post?.id ? message.post : p)),
            }));
            queryClient.setQueryData(['/api/wall/posts', postType, currentUser.id], (old: any) => {
              const oldPosts: WallPost[] = old?.posts || [];
              return {
                ...(old || {}),
                posts: oldPosts.map((p) => (p.id === message.post?.id ? message.post : p)),
              };
            });
          } else if (message.type === 'wallPostDeleted') {
            const postType: 'public' | 'friends' = (message.wallType || 'public') === 'friends' ? 'friends' : 'public';
            setPostsByTab((prev) => ({
              ...prev,
              [postType]: (prev[postType] || []).filter((p) => p.id !== message.postId),
            }));
            queryClient.setQueryData(['/api/wall/posts', postType, currentUser.id], (old: any) => {
              const oldPosts: WallPost[] = old?.posts || [];
              return { ...(old || {}), posts: oldPosts.filter((p) => p.id !== message.postId) };
            });
          }
        } catch {}
      };

      s.on('message', onMessage);
      return () => {
        s.off('message', onMessage);
      };
    }
  }, [activeView, activeTab, currentUser?.id, queryClient]);

  // معالجة اختيار الصورة
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'خطأ في نوع الملف',
          description: 'يرجى اختيار صورة صالحة فقط',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'حجم الملف كبير',
          description: 'حجم الصورة يجب أن يكون أقل من 10 ميجابايت',
          variant: 'destructive',
        });
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // إزالة الصورة المختارة
  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview('');
  };

  // نشر منشور جديد
  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !selectedImage) {
      toast({
        title: 'محتوى مطلوب',
        description: 'يجب إضافة نص أو صورة على الأقل',
        variant: 'destructive',
      });
      return;
    }

    if (!currentUser || currentUser.userType === 'guest') {
      toast({
        title: 'غير مسموح',
        description: 'الضيوف لا يمكنهم نشر المنشورات',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', newPostContent);
      formData.append('type', activeTab); // تم تغيير postType إلى type لمطابقة الخادم
      formData.append('userId', currentUser.id.toString());

      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const result = await apiRequest('/api/wall/posts', {
        method: 'POST',
        body: formData,
      });

      const data = result as any;
      if (data?.post) {
        const newPost = data.post || data;
        setPostsByTab((prev) => ({ ...prev, [activeTab]: [newPost, ...(prev[activeTab] || [])] }));
        queryClient.setQueryData(['/api/wall/posts', activeTab, currentUser.id], (old: any) => {
          const oldPosts = old?.posts || [];
          return { ...(old || {}), posts: [newPost, ...oldPosts] };
        });
        toast({
          title: 'تم النشر',
          description: 'تم نشر منشورك بنجاح',
        });
        setNewPostContent('');
        removeSelectedImage();
      } else {
        throw new Error('فشل في نشر المنشور');
      }
    } catch (error) {
      toast({
        title: 'خطأ في النشر',
        description: 'حدث خطأ أثناء نشر المنشور',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // التفاعل مع منشور
  const handleReaction = async (postId: number, type: 'like' | 'dislike' | 'heart') => {
    if (!currentUser) return;

    try {
      const result = await apiRequest('/api/wall/react', {
        method: 'POST',
        body: {
          postId,
          userId: currentUser.id,
          type: type, // تم تغيير reactionType إلى type لمطابقة الخادم
        },
      });

      const data = result as any;
      if (data?.post) {
        setPostsByTab((prev) => ({
          ...prev,
          [activeTab]: (prev[activeTab] || []).map((post) => (post.id === postId ? data.post : post)),
        }));
        queryClient.setQueryData(['/api/wall/posts', activeTab, currentUser.id], (old: any) => {
          const oldPosts: WallPost[] = old?.posts || [];
          return { ...(old || {}), posts: oldPosts.map((p) => (p.id === postId ? data.post : p)) };
        });
      }
    } catch (error) {
      console.error('خطأ في التفاعل:', error);
    }
  };

  // حذف منشور
  const handleDeletePost = async (postId: number) => {
    if (!currentUser) return;

    try {
      await apiRequest(`/api/wall/posts/${postId}`, {
        method: 'DELETE',
        body: { userId: currentUser.id },
      });

      toast({
        title: 'تم الحذف',
        description: 'تم حذف المنشور بنجاح',
      });
      setPostsByTab((prev) => ({
        ...prev,
        [activeTab]: (prev[activeTab] || []).filter((post) => post.id !== postId),
      }));
      queryClient.setQueryData(['/api/wall/posts', activeTab, currentUser.id], (old: any) => {
        const oldPosts: WallPost[] = old?.posts || [];
        return { ...(old || {}), posts: oldPosts.filter((p) => p.id !== postId) };
      });
    } catch (error) {
      toast({
        title: 'خطأ في الحذف',
        description: 'لم نتمكن من حذف المنشور',
        variant: 'destructive',
      });
    }
  };

  // تم نقل دالة formatTimeAgo إلى utils/timeUtils.ts (تستخدم من الاستيراد أعلاه)

  // عنصر مستخدم فرعي معزول لتحسين الأداء
  const UserListItem = useMemo(
    () =>
      React.memo(({ user }: { user: ChatUser }) => {
        if (!user?.username || !user?.userType) return null;
        
        // التحقق من وجود إطار للمستخدم
        const hasFrame = !!(user as any)?.profileFrame;
        
        return (
          <div key={user.id} className="relative" role="listitem">
            <SimpleUserMenu
              targetUser={user}
              currentUser={currentUser}
              showModerationActions={isModerator}
            >
              <div
                className={`flex items-center gap-2 py-0.5 px-1 rounded-none border-b border-border transition-colors duration-200 cursor-pointer w-full ${getUserListItemClasses(user)} hover:bg-accent/10`}
                style={getUserListItemStyles(user)}
                onClick={(e) => handleUserClick(e as any, user)}
              >
                {/* حاوية الصورة - حجم ثابت وموحد */}
                <div style={{ 
                  marginLeft: 4, 
                  width: 47,  // حجم ثابت موحد (36 * 1.3 = 46.8 ≈ 47)
                  height: 47, // حجم ثابت موحد
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ProfileImage user={user} size="small" pixelSize={36} className="" hideRoleBadgeOverlay={true} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {(() => {
                        const uds = getUsernameDisplayStyle(user);
                        return (
                          <span
                            className={`ac-user-name transition-colors duration-300 truncate ${uds.className || ''}`}
                            style={uds.style}
                            title={user.username}
                          >
                            {user.username}
                          </span>
                        );
                      })()}
                      {user.isMuted && <span className="text-yellow-400 text-xs flex-shrink-0">🔇</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {renderUserBadge(user)}
                      {renderCountryFlag(user)}
                    </div>
                  </div>
                </div>
              </div>
            </SimpleUserMenu>
          </div>
        );
      }),
    [currentUser, isModerator, renderCountryFlag, renderUserBadge]
  );

  return (
    <aside
      className={`w-full bg-sidebar text-sidebar-foreground text-sm overflow-hidden border-l border-sidebar-border shadow-lg flex flex-col h-full max-h-screen ${isMobile ? 'sidebar mobile-scroll' : ''}`}
      style={{ overscrollBehaviorX: 'none' }}
    >
      {/* Top toggle buttons removed; bottom bar is the sole navigation */}

      {/* Users View - تحسين التمرير */}
      {activeView === 'users' && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Search Bar - ثابت في الأعلى (تصغير الطول بحجم التبويبات) */}
          <div className={`${isMobile ? 'p-2' : 'p-2'} bg-sidebar border-b border-sidebar-border flex-shrink-0`}>
            <div className="relative">
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="البحث عن المستخدمين..."
                className={`w-full pl-4 pr-10 ${isMobile ? 'py-1.5 text-sm' : 'py-1.5'} rounded-lg bg-background border-input placeholder:text-muted-foreground text-foreground`}
                style={isMobile ? { fontSize: '16px' } : {}}
              />
            </div>
          </div>

          {/* Users List - Virtualized */}
          <div className={"bg-background users-list-reset flex-1 min-h-0 overflow-hidden flex flex-col"}>
            <div className="bg-primary text-primary-foreground mb-1 mx-0 mt-0 rounded-none">
              <div className="flex items-center justify-between px-3 py-1.5">
                <div className="flex items-center gap-2 font-bold text-sm">
                  المتصلون الآن
                  <span className="bg-white/20 text-white px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                    {validUsers.length}
                  </span>
                </div>
                {/* تمت إزالة: مرتب حسب الرتب */}
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">
                <div className="mb-3">{searchTerm ? '🔍' : '👥'}</div>
                <p className="text-sm">
                  {searchTerm ? 'لا توجد نتائج للبحث' : 'لا يوجد مستخدمون متصلون حالياً'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-primary hover:opacity-80 text-xs mt-2 underline"
                  >
                    مسح البحث
                  </button>
                )}
              </div>
            ) : (
              <div className="px-0 flex-1 min-h-0" role="list">
                <Virtuoso
                  style={{ height: '100%' }}
                  totalCount={filteredUsers.length}
                  itemContent={(index) => {
                    const user = filteredUsers[index];
                    return <UserListItem key={user.id} user={user} />;
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Walls View - تحسين التمرير */}
      {activeView === 'walls' && (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-background">
          {/* Wall Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'public' | 'friends')}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <TabsList className="grid w-full grid-cols-2 m-2 flex-shrink-0 bg-background text-foreground border border-border rounded-lg p-1">
              <TabsTrigger value="public" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                عام
              </TabsTrigger>
              <TabsTrigger value="friends" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                الأصدقاء
              </TabsTrigger>
            </TabsList>

            <div
              ref={wallsScrollRef}
              onScroll={() => {
                const el = wallsScrollRef.current;
                if (!el) return;
                const threshold = 80;
                const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
                setIsAtBottomSidebarWall(atBottom);
              }}
              className="flex-1 overflow-y-auto px-2 pb-4 cursor-grab"
            >
              {/* Post Creation */}
              {currentUser && currentUser.userType !== 'guest' && (
                <Card className="mb-4 border border-sidebar-border text-sidebar-foreground" style={{ background: 'var(--wall-post-bg)' }}>
                  <CardContent className="p-3">
                    <Textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder={`ما الذي تريد مشاركته مع ${activeTab === 'public' ? 'الجميع' : 'أصدقائك'}؟`}
                      className="mb-3 min-h-[80px] resize-none text-sm bg-transparent text-foreground border-input"
                      maxLength={500}
                    />

                    {imagePreview && (
                      <div className="relative mb-3">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full max-h-40 object-cover rounded-lg"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 left-2"
                          onClick={removeSelectedImage}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <input
                          ref={wallImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground"
                          onClick={() => wallImageInputRef.current?.click()}
                        >
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                      </div>

                      <Button
                        size="sm"
                        onClick={handleCreatePost}
                        disabled={submitting || (!newPostContent.trim() && !selectedImage)}
                      >
                        {submitting ? (
                          'جاري النشر...'
                        ) : (
                          <>
                            <Send className="w-4 h-4 ml-1" />
                            نشر
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Posts List */}
              <TabsContent value="public" className="mt-0 space-y-3">
                {loadingByTab.public ? (
                  <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
                ) : postsByTab.public.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">لا توجد منشورات حتى الآن</div>
                ) : (
                  postsByTab.public.map((post) => (
                    <Card key={post.id} className="border border-border wall-post-card">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const frameFromPost = (post as any)?.userProfileFrame as string | undefined;
                            const tagFromPost = (post as any)?.userProfileTag as string | undefined;
                            const effectiveUser: ChatUser = {
                              id: post.userId,
                              username: post.username,
                              userType: post.userRole || 'member',
                              profileImage: post.userProfileImage,
                              usernameColor: post.usernameColor,
                            } as ChatUser;
                            if (frameFromPost) (effectiveUser as any).profileFrame = frameFromPost;
                            if (tagFromPost) (effectiveUser as any).profileTag = tagFromPost;
                            const hasFrame = Boolean((effectiveUser as any)?.profileFrame);
                            const containerSize = 32; // حجم موحد لجميع المستخدمين
                            return (
                              <div style={{ width: containerSize, height: containerSize, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <ProfileImage 
                                  user={effectiveUser}
                                  size="small"
                                  pixelSize={29}
                                  hideRoleBadgeOverlay={true}
                                />
                              </div>
                            );
                          })()}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-medium text-sm cursor-pointer hover:underline"
                                onClick={(e) => {
                                  const targetUser: ChatUser = {
                                    id: post.userId,
                                    username: post.username,
                                    role: (post.userRole as any) || 'member',
                                    userType: post.userRole || 'member',
                                    isOnline: true,
                                    profileImage: post.userProfileImage,
                                    usernameColor: post.usernameColor,
                                  } as ChatUser;
                                  handleUserClick(e as any, targetUser);
                                }}
                                title="عرض خيارات المستخدم"
                              >
                                {(() => {
                                  const uds = getUsernameDisplayStyle({ userType: post.userRole || 'member', usernameGradient: (post as any)?.usernameGradient, usernameEffect: (post as any)?.usernameEffect, usernameColor: post.usernameColor });
                                  return (
                                    <span className={`${uds.className || ''}`} style={uds.style}>
                                      {post.username}
                                    </span>
                                  );
                                })()}
                              </span>
                              {/* تمت إزالة الشارات بجانب الاسم وفق المطلوب */}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatTimeAgo(post.timestamp.toString())}
                            </p>
                          </div>
                          {(currentUser?.id === post.userId ||
                            currentUser?.userType === 'owner' ||
                            currentUser?.userType === 'admin') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeletePost(post.id)}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        {post.content && (
                          (() => {
                            const { cleaned, ids } = parseYouTubeFromText(post.content);
                            return (
                              <>
                                {cleaned && (
                                  <p className="text-sm mb-3 whitespace-pre-wrap wall-text">{cleaned}</p>
                                )}
                                {ids.length > 0 && (
                                  <div className="relative w-full mb-3" style={{ paddingTop: '56.25%' }}>
                                    <iframe
                                      src={`https://www.youtube.com/embed/${ids[0]}`}
                                      className="absolute inset-0 w-full h-full rounded-lg"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                      allowFullScreen
                                      title="يوتيوب"
                                    />
                                  </div>
                                )}
                              </>
                            );
                          })()
                        )}

                        {post.imageUrl && (
                          <img
                            src={post.imageUrl}
                            alt="Post image"
                            className="w-full max-h-80 object-contain rounded-lg mb-3 bg-muted/10"
                          />
                        )}

                        {/* Reactions */}
                        <div className="flex items-center gap-4 pt-3 border-t border-border/30">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReaction(post.id, 'like')}
                            className="flex items-center gap-1 text-primary hover:bg-primary/10"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span className="text-xs">{post.totalLikes || 0}</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReaction(post.id, 'heart')}
                            className="flex items-center gap-1 text-accent hover:bg-accent/10"
                          >
                            <Heart className="w-4 h-4" />
                            <span className="text-xs">{post.totalHearts || 0}</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReaction(post.id, 'dislike')}
                            className="flex items-center gap-1 text-muted-foreground hover:bg-accent/10"
                          >
                            <ThumbsDown className="w-4 h-4" />
                            <span className="text-xs">{post.totalDislikes || 0}</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
              <TabsContent value="friends" className="mt-0 space-y-3">
                {loadingByTab.friends ? (
                  <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
                ) : postsByTab.friends.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">لا توجد منشورات حتى الآن</div>
                ) : (
                  postsByTab.friends.map((post) => (
                    <Card key={post.id} className="border border-border wall-post-card">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const frameFromPost = (post as any)?.userProfileFrame as string | undefined;
                            const tagFromPost = (post as any)?.userProfileTag as string | undefined;
                            const effectiveUser: ChatUser = {
                              id: post.userId,
                              username: post.username,
                              userType: post.userRole || 'member',
                              profileImage: post.userProfileImage,
                              usernameColor: post.usernameColor,
                            } as ChatUser;
                            if (frameFromPost) (effectiveUser as any).profileFrame = frameFromPost;
                            if (tagFromPost) (effectiveUser as any).profileTag = tagFromPost;
                            const hasFrame = Boolean((effectiveUser as any)?.profileFrame);
                            const containerSize = 32; // حجم موحد لجميع المستخدمين
                            return (
                              <div style={{ width: containerSize, height: containerSize, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <ProfileImage 
                                  user={effectiveUser}
                                  size="small"
                                  pixelSize={29}
                                  hideRoleBadgeOverlay={true}
                                />
                              </div>
                            );
                          })()}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-medium text-sm cursor-pointer hover:underline"
                                onClick={(e) => {
                                  const targetUser: ChatUser = {
                                    id: post.userId,
                                    username: post.username,
                                    role: (post.userRole as any) || 'member',
                                    userType: post.userRole || 'member',
                                    isOnline: true,
                                    profileImage: post.userProfileImage,
                                    usernameColor: post.usernameColor,
                                  } as ChatUser;
                                  handleUserClick(e as any, targetUser);
                                }}
                                title="عرض خيارات المستخدم"
                              >
                                {(() => {
                                  const uds = getUsernameDisplayStyle({ userType: post.userRole || 'member', usernameGradient: (post as any)?.usernameGradient, usernameEffect: (post as any)?.usernameEffect, usernameColor: post.usernameColor });
                                  return (
                                    <span className={`${uds.className || ''}`} style={uds.style}>
                                      {post.username}
                                    </span>
                                  );
                                })()}
                              </span>
                              {/* تمت إزالة الشارات بجانب الاسم وفق المطلوب */}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatTimeAgo(post.timestamp.toString())}
                            </p>
                          </div>
                          {(currentUser?.id === post.userId ||
                            currentUser?.userType === 'owner' ||
                            currentUser?.userType === 'admin') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeletePost(post.id)}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        {post.content && (
                          (() => {
                            const { cleaned, ids } = parseYouTubeFromText(post.content);
                            return (
                              <>
                                {cleaned && (
                                  <p className="text-sm mb-3 whitespace-pre-wrap wall-text">{cleaned}</p>
                                )}
                                {ids.length > 0 && (
                                  <div className="relative w-full mb-3" style={{ paddingTop: '56.25%' }}>
                                    <iframe
                                      src={`https://www.youtube.com/embed/${ids[0]}`}
                                      className="absolute inset-0 w-full h-full rounded-lg"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                      allowFullScreen
                                      title="يوتيوب"
                                    />
                                  </div>
                                )}
                              </>
                            );
                          })()
                        )}

                        {post.imageUrl && (
                          <img
                            src={post.imageUrl}
                            alt="Post image"
                            className="w-full max-h-80 object-contain rounded-lg mb-3 bg-muted/10"
                          />
                        )}

                        {/* Reactions */}
                        <div className="flex items-center gap-4 pt-3 border-t border-border/30">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReaction(post.id, 'like')}
                            className="flex items-center gap-1 text-primary hover:bg-primary/10"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span className="text-xs">{post.totalLikes || 0}</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReaction(post.id, 'heart')}
                            className="flex items-center gap-1 text-accent hover:bg-accent/10"
                          >
                            <Heart className="w-4 h-4" />
                            <span className="text-xs">{post.totalHearts || 0}</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReaction(post.id, 'dislike')}
                            className="flex items-center gap-1 text-muted-foreground hover:bg-accent/10"
                          >
                            <ThumbsDown className="w-4 h-4" />
                            <span className="text-xs">{post.totalDislikes || 0}</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {!isAtBottomSidebarWall && (
                <div className="absolute bottom-4 right-4 z-10">
                  <Button
                    size="sm"
                    onClick={() => {
                      const el = wallsScrollRef.current;
                      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 rounded-full text-xs bg-primary text-primary-foreground shadow"
                  >
                    الانتقال لأسفل
                  </Button>
                </div>
              )}
            </div>
          </Tabs>
        </div>
      )}

      {/* Rooms View - تحسين التمرير */}
      {activeView === 'rooms' && (
        <div
          className="flex-1 min-h-0 flex flex-col overflow-hidden"
          style={{ height: '100%', overflowX: 'hidden' }}
        >
          <RoomComponent
            currentUser={currentUser}
            rooms={rooms}
            currentRoomId={currentRoomId}
            onRoomChange={onRoomChange}
            onAddRoom={onAddRoom}
            onDeleteRoom={onDeleteRoom}
            onRefreshRooms={onRefreshRooms}
            viewMode="list"
            showSearch={true}
            compact={true}
          />
        </div>
      )}

      {/* Friends View - تحسين التمرير */}
      {activeView === 'friends' && (
        <div
          className="flex-1 min-h-0 flex flex-col overflow-hidden"
          style={{ height: '100%' }}
        >
          <FriendsTabPanel
            currentUser={currentUser}
            onlineUsers={users}
            onStartPrivateChat={onStartPrivateChat || (() => {})}
          />
        </div>
      )}
    </aside>
  );
}
