import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

  // إضافة logging للتشخيص المحسن
  React.useEffect(() => {
    console.log(`📊 قائمة المتصلين تحديث: ${users.length} مستخدم`, users.map(u => ({
      id: u.id,
      username: u.username,
      userType: u.userType
    })));
  }, [users]);

  // جلب المنشورات
  const fetchPosts = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await apiRequest(`/api/wall/posts/${activeTab}?userId=${currentUser.id}`);
      const posts = (data as any).posts || (data as any).data || data || [];
      setPosts(posts);
    } catch (error) {
      console.error('❌ UserSidebar: خطأ في الاتصال بالخادم:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (activeView === 'walls' && currentUser) {
      fetchPosts();
    }
  }, [activeView, fetchPosts]);

  // تحديث activeView عند تغيير propActiveView
  useEffect(() => {
    if (propActiveView) {
      setActiveView(propActiveView);
    }
  }, [propActiveView]);

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
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === postId ? data.post : post
          )
        );
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
    <aside className="w-full bg-white text-sm overflow-hidden border-l border-gray-200 shadow-lg flex flex-col">
      {/* Toggle Buttons - always visible now */}
      <div className="flex border-b border-gray-200">
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

      {/* Users View */}
      {activeView === 'users' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="relative">
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="البحث عن المستخدمين..."
              className="w-full pl-4 pr-10 py-2 rounded-lg bg-gray-50 border-gray-300 placeholder:text-gray-500 text-gray-900"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-green-600 text-base">
              <span className="text-xs">●</span>
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
                        className={`flex items-center gap-2 p-2 px-4 rounded-lg transition-all duration-200 cursor-pointer w-full ${
                          getUserThemeClasses(user)
                        }`}
                        style={{ 
                          ...getUserThemeStyles(user)
                        }}
                        onClick={(e) => handleUserClick(e, user)}
                      >
                        <ProfileImage 
                          user={user} 
                          size="small" 
                          className="transition-transform hover:scale-105"
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
                                {user.username} {renderUserBadge(user)}
                              </span>
                              {/* إشارة المكتوم */}
                              {user.isMuted && (
                                <span className="text-yellow-400 text-xs">🔇</span>
                              )}
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
      )}

      {/* Walls View */}
      {activeView === 'walls' && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Wall Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'public' | 'friends')} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 m-2">
              <TabsTrigger value="public" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                عام
              </TabsTrigger>
              <TabsTrigger value="friends" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                الأصدقاء
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-2">
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
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                          id="image-upload"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => document.getElementById('image-upload')?.click()}
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
                              {/* شارة الرتبة حسب النظام الجديد */}
                              {post.userRole === 'owner' && (
                                <img src="/svgs/crown.svg" alt="owner" className="w-4 h-4 inline-block" />
                              )}
                              {post.userRole === 'admin' && (
                                <span className="inline-block text-yellow-500">⭐</span>
                              )}
                              {post.userRole === 'moderator' && (
                                <span className="inline-block">🛡️</span>
                              )}
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
            </div>
          </Tabs>
        </div>
      )}

      {/* Rooms View */}
      {activeView === 'rooms' && (
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
      )}

      {/* Friends View */}
      {activeView === 'friends' && (
        <FriendsTabPanel
          currentUser={currentUser}
          onlineUsers={users}
          onStartPrivateChat={onStartPrivateChat || (() => {})}
        />
      )}
    </aside>
  );
}