import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, ThumbsUp, ThumbsDown, Send, Image as ImageIcon, Trash2, X, Users, Globe, Home, UserPlus } from 'lucide-react';
import SimpleUserMenu from './SimpleUserMenu';
import ProfileImage from './ProfileImage';
import RoomComponent from './RoomComponent';
import FriendsTabPanel from './FriendsTabPanel';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { getImageSrc } from '@/utils/imageUtils';

import type { ChatUser, WallPost, CreateWallPostData, ChatRoom } from '@/types/chat';
import { getUserThemeClasses, getUserThemeStyles, getUserThemeTextColor } from '@/utils/themeUtils';
import { formatTimeAgo } from '@/utils/timeUtils';
import UserRoleBadge from './UserRoleBadge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Socket } from 'socket.io-client';
import { getSocket, saveSession } from '@/lib/socket';
import { useGrabScroll } from '@/hooks/useGrabScroll';



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
  onStartPrivateChat
}: UnifiedSidebarProps) {
  const [activeView, setActiveView] = useState<'users' | 'walls' | 'rooms' | 'friends'>(propActiveView || 'users');
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

  // 🚀 تحسين: استخدام useMemo لفلترة المستخدمين لتحسين الأداء
  const validUsers = useMemo(() => {
    return users.filter(user => {
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
  }, [users]);

  const filteredUsers = useMemo(() => {
    // تطبيق البحث على المستخدمين الصالحين فقط
    if (!searchTerm.trim()) return validUsers;
    
    return validUsers.filter(user => {
      return user.username.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [validUsers, searchTerm]);

  // 🚀 تحسين: استخدام مكون UserRoleBadge المركزي
  const renderUserBadge = useCallback((user: ChatUser) => {
    if (!user) return null;
    return <UserRoleBadge user={user} size={20} />;
  }, []);

  const getCountryEmoji = useCallback((country?: string): string | null => {
    if (!country) return null;
    const token = country.trim().split(' ')[0];
    return token || null;
  }, []);

  const renderCountryFlag = useCallback((user: ChatUser) => {
    const emoji = getCountryEmoji(user.country);
    const boxStyle: React.CSSProperties = {
      width: 20,
      height: 20,
      borderRadius: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      border: 'none'
    };

    if (emoji) {
      return (
        <span style={boxStyle} title={user.country}>
          <span style={{ fontSize: 14, lineHeight: 1 }}>{emoji}</span>
        </span>
      );
    }

    return (
      <span style={boxStyle} title="لم يتم تحديد الدولة">
        <span style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1 }}>?</span>
      </span>
    );
  }, [getCountryEmoji]);

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
  const handleUserClick = useCallback((e: React.MouseEvent, user: ChatUser) => {
    e.stopPropagation();
    onUserClick(e, user);
  }, [onUserClick]);

  // التحقق من صلاحيات الإشراف
  const isModerator = useMemo(() => 
    currentUser && ['moderator', 'admin', 'owner'].includes(currentUser.userType)
  , [currentUser]);

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
      return await apiRequest(`/api/wall/posts/${activeTab}?userId=${currentUser.id}`)
    },
    enabled: activeView === 'walls' && !!currentUser?.id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    initialData: () => queryClient.getQueryData(['/api/wall/posts', activeTab, currentUser?.id]) as any,
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

      // حفظ سياق التبويب لسهولة التعافي بعد إعادة الاتصال
      saveSession({ roomId: activeTab });

      const onMessage = (payload: any) => {
        try {
          // يدعم الشكل {type: ...} أو {envelope: {type: ...}}
          const message = payload?.envelope || payload || {};
          if (message.type === 'newWallPost') {
            const postType = message.wallType || message.post?.type || 'public';
            if (postType === activeTab) {
              setPosts(prev => [message.post, ...prev]);
              queryClient.setQueryData(['/api/wall/posts', activeTab, currentUser.id], (old: any) => {
                const oldPosts: WallPost[] = old?.posts || [];
                return { ...(old || {}), posts: [message.post, ...oldPosts] };
              });
            }
          } else if (message.type === 'wallPostReaction') {
            setPosts(prev => prev.map(p => p.id === message.post?.id ? message.post : p));
            queryClient.setQueryData(['/api/wall/posts', activeTab, currentUser.id], (old: any) => {
              const oldPosts: WallPost[] = old?.posts || [];
              return { ...(old || {}), posts: oldPosts.map((p) => p.id === message.post?.id ? message.post : p) };
            });
          } else if (message.type === 'wallPostDeleted') {
            setPosts(prev => prev.filter(p => p.id !== message.postId));
            queryClient.setQueryData(['/api/wall/posts', activeTab, currentUser.id], (old: any) => {
              const oldPosts: WallPost[] = old?.posts || [];
              return { ...(old || {}), posts: oldPosts.filter((p) => p.id !== message.postId) };
            });
          }
        } catch {}
      };

      s.on('message', onMessage);
      return () => {
        try { s.off('message', onMessage); } catch {}
      };
    }
  }, [activeView, activeTab, currentUser?.id, queryClient]);

  // معالجة اختيار الصورة
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "خطأ في نوع الملف",
          description: "يرجى اختيار صورة صالحة فقط",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "حجم الملف كبير",
          description: "حجم الصورة يجب أن يكون أقل من 10 ميجابايت",
          variant: "destructive",
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
        title: "محتوى مطلوب",
        description: "يجب إضافة نص أو صورة على الأقل",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser || currentUser.userType === 'guest') {
      toast({
        title: "غير مسموح",
        description: "الضيوف لا يمكنهم نشر المنشورات",
        variant: "destructive",
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
        setPosts(prev => [newPost, ...prev]);
        queryClient.setQueryData(['/api/wall/posts', activeTab, currentUser.id], (old: any) => {
          const oldPosts = old?.posts || [];
          return { ...(old || {}), posts: [newPost, ...oldPosts] };
        });
        toast({
          title: "تم النشر",
          description: "تم نشر منشورك بنجاح",
        });
        setNewPostContent('');
        removeSelectedImage();
      } else {
        throw new Error('فشل في نشر المنشور');
      }
    } catch (error) {
      toast({
        title: "خطأ في النشر",
        description: "حدث خطأ أثناء نشر المنشور",
        variant: "destructive",
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
        }
      });

      const data = result as any;
      if (data?.post) {
        setPosts(prevPosts => prevPosts.map(post => post.id === postId ? data.post : post));
        queryClient.setQueryData(['/api/wall/posts', activeTab, currentUser.id], (old: any) => {
          const oldPosts: WallPost[] = old?.posts || [];
          return { ...(old || {}), posts: oldPosts.map(p => p.id === postId ? data.post : p) };
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
        body: { userId: currentUser.id }
      });

      toast({
        title: "تم الحذف",
        description: "تم حذف المنشور بنجاح",
      });
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      queryClient.setQueryData(['/api/wall/posts', activeTab, currentUser.id], (old: any) => {
        const oldPosts: WallPost[] = old?.posts || [];
        return { ...(old || {}), posts: oldPosts.filter(p => p.id !== postId) };
      });
    } catch (error) {
      toast({
        title: "خطأ في الحذف",
        description: "لم نتمكن من حذف المنشور",
        variant: "destructive",
      });
    }
  };

  // تم نقل دالة formatTimeAgo إلى utils/timeUtils.ts (تستخدم من الاستيراد أعلاه)

  return (
    <aside className="w-full bg-white text-sm overflow-hidden border-l border-gray-200 shadow-lg flex flex-col h-full max-h-screen">
      {/* Toggle Buttons - always visible now */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        <Button
          variant={activeView === 'users' ? 'default' : 'ghost'}
          className={`flex-1 rounded-none py-3 ${
            activeView === 'users' 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => setActiveView('users')}
        >
          <Users className="w-4 h-4 ml-2" />
          المستخدمون
        </Button>
        <Button
          variant={activeView === 'walls' ? 'default' : 'ghost'}
          className={`flex-1 rounded-none py-3 ${
            activeView === 'walls' 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => setActiveView('walls')}
        >
          <Home className="w-4 h-4 ml-2" />
          الحوائط
        </Button>
        <Button
          variant={activeView === 'rooms' ? 'default' : 'ghost'}
          className={`flex-1 rounded-none py-3 ${
            activeView === 'rooms' 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => setActiveView('rooms')}
        >
          <Users className="w-4 h-4 ml-2" />
          الغرف
        </Button>
        <Button
          variant={activeView === 'friends' ? 'default' : 'ghost'}
          className={`flex-1 rounded-none py-3 ${
            activeView === 'friends' 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => setActiveView('friends')}
        >
          <UserPlus className="w-4 h-4 ml-2" />
          الأصدقاء
        </Button>
      </div>

      {/* Users View - تحسين التمرير */}
      {activeView === 'users' && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Search Bar - ثابت في الأعلى */}
          <div className="p-4 bg-white border-b border-gray-100 flex-shrink-0">
            <div className="relative">
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="البحث عن المستخدمين..."
                className="w-full pl-4 pr-10 py-2 rounded-lg bg-white border-gray-300 placeholder:text-gray-500 text-gray-900"
              />
            </div>
          </div>
          
          {/* Users List - قابل للتمرير */}
          <div ref={usersScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 cursor-grab bg-white" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-green-600 text-base">
              المتصلون الآن
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                {validUsers.length}
              </span>
            </div>
            
            <ul className="space-y-1">
              {filteredUsers.map((user) => {
                // 🚀 تحسين: التحقق من وجود البيانات المطلوبة
                if (!user?.username || !user?.userType) {
                  return null;
                }
                
                return (
                  <li key={user.id} className="relative -mx-4">
                    <SimpleUserMenu
                      targetUser={user}
                      currentUser={currentUser}
                      showModerationActions={isModerator}
                    >
                      <div
                        className={`flex items-center gap-2 p-2 px-4 rounded-none border-b border-gray-200 transition-all duration-200 cursor-pointer w-full bg-white ${getUserThemeClasses(user)}`}
                        style={getUserThemeStyles(user)}
                        onClick={(e) => handleUserClick(e, user)}
                      >
                        <ProfileImage 
                          user={user} 
                          size="small" 
                          className=""
                          hideRoleBadgeOverlay={true}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span 
                                className="text-base font-medium transition-all duration-300"
                                style={{ 
                                  color: user.usernameColor || getUserThemeTextColor(user),
                                  textShadow: user.usernameColor ? `0 0 10px ${user.usernameColor}40` : 'none',
                                  filter: user.usernameColor ? 'drop-shadow(0 0 3px rgba(255,255,255,0.3))' : 'none'
                                }}
                                title={user.username}
                              >
                                {user.username}
                              </span>
                              {/* إشارة المكتوم */}
                              {user.isMuted && (
                                <span className="text-yellow-400 text-xs">🔇</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {renderUserBadge(user)}
                              {renderCountryFlag(user)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </SimpleUserMenu>
                  </li>
                );
              })}
            </ul>
            
            {filteredUsers.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <div className="mb-3">
                  {searchTerm ? '🔍' : '👥'}
                </div>
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
            )}
            </div>
          </div>
        </div>
      )}

      {/* Walls View - تحسين التمرير */}
      {activeView === 'walls' && (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Wall Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'public' | 'friends')} className="flex-1 flex flex-col">
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
              style={{ maxHeight: 'calc(100vh - 250px)' }}
            >
              {/* Post Creation */}
              {currentUser && currentUser.userType !== 'guest' && (
                <Card className="mb-4 border border-gray-200">
                  <CardContent className="p-3">
                    <Textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder={`ما الذي تريد مشاركته مع ${activeTab === 'public' ? 'الجميع' : 'أصدقائك'}؟`}
                      className="mb-3 min-h-[80px] resize-none text-sm"
                      maxLength={500}
                    />
                    
                    {imagePreview && (
                      <div className="relative mb-3">
                        <img src={imagePreview} alt="Preview" className="w-full max-h-40 object-cover rounded-lg" />
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
                        {submitting ? 'جاري النشر...' : (
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
                  <div className="text-center py-8 text-gray-500">
                    لا توجد منشورات حتى الآن
                  </div>
                ) : (
                  posts.map((post) => (
                    <Card key={post.id} className="border border-gray-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                            {post.userProfileImage ? (
                              <img src={getImageSrc(post.userProfileImage)} alt={post.username} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs">{post.username.charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span 
                                className="font-medium text-sm"
                                style={{ color: post.usernameColor || 'inherit' }}
                              >
                                {post.username}
                              </span>
                              {/* 🏅 شارة الرتبة الموحدة */}
                              <UserRoleBadge 
                                user={{ userType: post.userRole } as ChatUser} 
                                size={16} 
                              />
                            </div>
                            <p className="text-xs text-gray-500">{formatTimeAgo(post.timestamp.toString())}</p>
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
                  <Button size="sm" onClick={() => {
                    const el = wallsScrollRef.current;
                    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                  }} className="px-3 py-1.5 rounded-full text-xs bg-primary text-primary-foreground shadow">
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
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 150px)' }}>
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
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 150px)' }}>
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