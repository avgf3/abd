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
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // دالة ترتيب المستخدمين حسب الرتب
  const getRankOrder = (userType: string): number => {
    switch (userType) {
      case 'owner':
        return 1;
      case 'admin':
        return 2;
      case 'moderator':
        return 3;
      case 'member':
        return 4;
      case 'guest':
        return 5;
      default:
        return 6;
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
    return <UserRoleBadge user={user} size={20} />;
  }, []);

  // استبدال إيموجي العلم بصورة علم حقيقية
  const renderCountryFlag = useCallback(
    (user: ChatUser) => <CountryFlag country={user.country} size={14} />, []
  );

  // 🚀 تحسين: دالة formatLastSeen محسنة
  const formatLastSeen = useCallback((lastSeen?: string | Date) => {
    if (!lastSeen) return 'غير معروف';

    const lastSeenDate = lastSeen instanceof Date ? lastSeen : new Date(lastSeen);

    if (isNaN(lastSeenDate.getTime())) {
      return 'غير معروف';
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
    if (data?.posts) setPosts(data.posts);
    setLoading(isFetching);
  }, [wallData, isFetching]);

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
            const postType = message.wallType || message.post?.type || 'public';
            if (postType === activeTab) {
              setPosts((prev) => [message.post, ...prev]);
              queryClient.setQueryData(
                ['/api/wall/posts', activeTab, currentUser.id],
                (old: any) => {
                  const oldPosts: WallPost[] = old?.posts || [];
                  return { ...(old || {}), posts: [message.post, ...oldPosts] };
                }
              );
            }
          } else if (message.type === 'wallPostReaction') {
            setPosts((prev) => prev.map((p) => (p.id === message.post?.id ? message.post : p)));
            queryClient.setQueryData(['/api/wall/posts', activeTab, currentUser.id], (old: any) => {
              const oldPosts: WallPost[] = old?.posts || [];
              return {
                ...(old || {}),
                posts: oldPosts.map((p) => (p.id === message.post?.id ? message.post : p)),
              };
            });
          } else if (message.type === 'wallPostDeleted') {
            setPosts((prev) => prev.filter((p) => p.id !== message.postId));
            queryClient.setQueryData(['/api/wall/posts', activeTab, currentUser.id], (old: any) => {
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
        setPosts((prev) => [newPost, ...prev]);
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
        setPosts((prevPosts) => prevPosts.map((post) => (post.id === postId ? data.post : post)));
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
      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
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
        return (
          <div key={user.id} className="relative" role="listitem">
            <SimpleUserMenu
              targetUser={user}
              currentUser={currentUser}
              showModerationActions={isModerator}
            >
              <div
                className={`flex items-center gap-2 py-1.5 px-0 rounded-none border-b border-black transition-colors duration-200 cursor-pointer w-full ${getUserListItemClasses(user)} hover:bg-accent/10`}
                style={getUserListItemStyles(user)}
                onClick={(e) => handleUserClick(e as any, user)}
              >
                <ProfileImage user={user} size="small" className="" hideRoleBadgeOverlay={true} />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-base font-medium transition-colors duration-300"
                        style={{
                          color: getFinalUsernameColor(user),
                        }}
                        title={user.username}
                      >
                        {user.username}
                      </span>
                      {user.isMuted && <span className="text-yellow-400 text-xs">🔇</span>}
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
      className={`w-full bg-card text-sm overflow-hidden border-l border-border shadow-lg flex flex-col h-full max-h-screen ${isMobile ? 'sidebar mobile-scroll' : ''}`}
    >
      {/* Top toggle buttons removed; bottom bar is the sole navigation */}

      {/* Users View - تحسين التمرير */}
      {activeView === 'users' && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Search Bar - ثابت في الأعلى (تصغير الطول بحجم التبويبات) */}
          <div className={`${isMobile ? 'p-2' : 'p-2'} bg-card border-b border-border flex-shrink-0`}>
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
              <div className="text-center text-gray-500 py-6">
                <div className="mb-3">{searchTerm ? '🔍' : '👥'}</div>
                <p className="text-sm">
                  {searchTerm ? 'لا توجد نتائج للبحث' : 'لا يوجد مستخدمون متصلون حالياً'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-blue-500 hover:text-blue-700 text-xs mt-2 underline"
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
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-card">
          {/* Wall Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'public' | 'friends')}
            className="flex-1 flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-2 m-2 flex-shrink-0">
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
                <Card className="mb-4 border border-border bg-card">
                  <CardContent className="p-3">
                    <Textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder={`ما الذي تريد مشاركته مع ${activeTab === 'public' ? 'الجميع' : 'أصدقائك'}؟`}
                      className="mb-3 min-h-[80px] resize-none text-sm bg-background text-foreground border-input"
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
                          onClick={() => wallImageInputRef.current?.click()}
                        >
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                      </div>

                      <Button
                        size="sm"
                        onClick={handleCreatePost}
                        disabled={submitting || (!newPostContent.trim() && !selectedImage)}
                        className="bg-blue-500 hover:bg-blue-600"
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
              <TabsContent value={activeTab} className="mt-0 space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">لا توجد منشورات حتى الآن</div>
                ) : (
                  posts.map((post) => (
                    <Card key={post.id} className="border border-border bg-card">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                            {post.userProfileImage ? (
                              <img
                                src={getImageSrc(post.userProfileImage)}
                                alt={post.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs">{post.username.charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-medium text-sm cursor-pointer hover:underline"
                                style={{ color: post.usernameColor || 'inherit' }}
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
                                {post.username}
                              </span>
                              {/* 🏅 شارة الرتبة الموحدة */}
                              <UserRoleBadge
                                user={{ userType: post.userRole } as ChatUser}
                                size={16}
                              />
                            </div>
                            <p className="text-xs text-gray-500">
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
                              className="text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        {post.content && (
                          <p className="text-sm mb-3 whitespace-pre-wrap">{post.content}</p>
                        )}

                        {post.imageUrl && (
                          <img
                            src={post.imageUrl}
                            alt="Post image"
                            className="w-full max-h-60 object-cover rounded-lg mb-3"
                          />
                        )}

                        {/* Reactions */}
                        <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReaction(post.id, 'like')}
                            className="flex items-center gap-1 text-blue-600 hover:bg-blue-50"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span className="text-xs">{post.totalLikes || 0}</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReaction(post.id, 'heart')}
                            className="flex items-center gap-1 text-red-600 hover:bg-red-50"
                          >
                            <Heart className="w-4 h-4" />
                            <span className="text-xs">{post.totalHearts || 0}</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReaction(post.id, 'dislike')}
                            className="flex items-center gap-1 text-gray-600 hover:bg-gray-50"
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
          style={{ height: '100%' }}
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
