// React and hooks
import React, { useState, useEffect, useMemo, useCallback } from 'react';

// UI Components
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Icons
import { Heart, ThumbsUp, ThumbsDown, Send, Image as ImageIcon, Trash2, X, Users, Globe, Home } from 'lucide-react';

// Chat components
import SimpleUserMenu from './SimpleUserMenu';
import ProfileImage from './ProfileImage';
import RoomsPanel from './RoomsPanel';
import UserRoleBadge from './UserRoleBadge';

// Hooks and utilities
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { getImageSrc } from '@/utils/imageUtils';
import { getUserThemeClasses, getUserThemeStyles, getUserThemeTextColor } from '@/utils/themeUtils';

// Types
import type { ChatUser, WallPost, CreateWallPostData, ChatRoom, UserInteractionProps } from '@/types/chat';

/**
 * UserSidebarWithWalls Component
 * 
 * A comprehensive sidebar component that handles three main views:
 * - Users: List of online users with search functionality
 * - Walls: Wall posts with public/friends tabs, post creation, and reactions
 * - Rooms: Room management through RoomsPanel component
 * 
 * Features:
 * - Optimized with React.memo and useCallback for performance
 * - Centralized state management through props
 * - Error handling with user-friendly messages
 * - Loading states and responsive design
 * - Consistent prop interfaces using standardized types
 * 
 * Performance Optimizations:
 * - Memoized user filtering
 * - Throttled logging in development
 * - Callback optimization for event handlers
 * - Proper dependency arrays for effects
 */
interface UserSidebarWithWallsProps extends UserInteractionProps {
  activeView: 'users' | 'walls' | 'rooms'; // Make this required and fully controlled
  rooms?: ChatRoom[];
  currentRoomId?: string;
  onRoomChange?: (roomId: string) => void;
  onAddRoom?: (roomData: { name: string; description: string; image: File | null }) => void;
  onDeleteRoom?: (roomId: string) => void;
  onRefreshRooms?: () => void;
  onActiveViewChange?: (view: 'users' | 'walls' | 'rooms') => void; // Add callback for parent control
  roomsLoading?: boolean; // Add loading state for rooms
}

const UserSidebarWithWalls = React.memo(function UserSidebarWithWalls({ 
  users, 
  onUserClick, 
  currentUser, 
  activeView, // Use prop directly, no local state
  rooms = [],
  currentRoomId = '',
  onRoomChange,
  onAddRoom,
  onDeleteRoom,
  onRefreshRooms,
  onActiveViewChange,
  roomsLoading = false
}: UserSidebarWithWallsProps) {
  // Remove duplicate activeView state - use prop instead
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'public' | 'friends'>('public');
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Memoize filtered users to prevent unnecessary recalculations
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const lowercaseSearch = searchTerm.toLowerCase();
    return users.filter(user =>
      user && user.username && user.username.toLowerCase().includes(lowercaseSearch)
    );
  }, [users, searchTerm]);

  // Optimize logging with throttling
  useEffect(() => {
    if (users.length === 0) return;
    
    // Only log in development mode and throttle it
    if (process.env.NODE_ENV === 'development') {
      const timeoutId = setTimeout(() => {
        console.log('👥 UserSidebarWithWalls - عدد المستخدمين:', users.length);
      }, 1000); // Throttle logging to once per second
      
      return () => clearTimeout(timeoutId);
    }
  }, [users.length]); // Only depend on length, not the entire array

  // جلب المنشورات مع معالجة أفضل للأخطاء
  const fetchPosts = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      console.log(`🔄 UserSidebar: جاري جلب المنشورات للنوع: ${activeTab}, المستخدم: ${currentUser.id}`);
      
      const response = await fetch(`/api/wall/posts/${activeTab}?userId=${currentUser.id}`, {
        method: 'GET',
      });
      
      console.log(`📡 UserSidebar: استجابة الخادم: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📄 UserSidebar: البيانات المستلمة:', data);
        console.log(`📊 UserSidebar: عدد المنشورات: ${data.posts?.length || 0}`);
        
        const posts = data.posts || data.data || data || [];
        setPosts(posts);
        console.log('✅ UserSidebar: تم تحديث المنشورات في الواجهة');
      } else {
        const errorText = await response.text();
        console.error('❌ UserSidebar: خطأ في جلب المنشورات:', response.status, errorText);
        
        toast({
          title: "خطأ في تحميل المنشورات",
          description: `تعذر تحميل منشورات ${activeTab === 'public' ? 'الحائط العام' : 'الأصدقاء'}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ UserSidebar: خطأ في الاتصال بالخادم:', error);
      
      toast({
        title: "خطأ في الاتصال",
        description: "تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser, activeTab, toast]);

  useEffect(() => {
    if (activeView === 'walls' && currentUser) {
      fetchPosts();
    }
  }, [activeView, activeTab, currentUser]);

  // تحديث activeView عند تغيير propActiveView
  useEffect(() => {
    if (activeView) {
      // setActiveView(propActiveView); // This line is removed as per the new_code
    }
  }, [activeView]);

  // معالجة اختيار الصورة مع useCallback للتحسين
  const handleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [toast]);

  // إزالة الصورة المختارة مع useCallback
  const removeSelectedImage = useCallback(() => {
    setSelectedImage(null);
    setImagePreview('');
  }, []);

  // نشر منشور جديد مع useCallback للتحسين
  const handleCreatePost = useCallback(async () => {
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

      const response = await fetch('/api/wall/posts', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ UserSidebar: استجابة النشر:', result);
        
        const newPost = result.post || result;
        console.log('📝 UserSidebar: المنشور الجديد:', newPost);
        
        // إضافة المنشور للقائمة فوراً
        setPosts(prev => [newPost, ...prev]);
        console.log('✅ UserSidebar: تم إضافة المنشور للقائمة محلياً');
        
        toast({
          title: "تم النشر",
          description: "تم نشر منشورك بنجاح",
        });
        setNewPostContent('');
        removeSelectedImage();
        // fetchPosts(); // لا نحتاج لهذا لأننا أضفنا المنشور محلياً
      } else {
        const errorText = await response.text();
        console.error('❌ UserSidebar: خطأ في النشر:', response.status, errorText);
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
  }, [newPostContent, selectedImage, currentUser, activeTab, toast, removeSelectedImage]);

  // معالجة الإعجاب
  const handleLike = async (postId: number, type: 'like' | 'heart' | 'dislike') => {
    if (!currentUser) return;
    
    try {
      const response = await apiRequest('/api/wall/react', {
        method: 'POST',
        body: {
          postId,
          userId: currentUser.id,
          type: type, // تم تغيير reactionType إلى type لمطابقة الخادم
        }
      });

      if (response.ok) {
        fetchPosts();
      }
    } catch (error) {
      console.error('خطأ في التفاعل:', error);
    }
  };

  // حذف منشور
  const handleDeletePost = async (postId: number) => {
    if (!currentUser) return;
    
    try {
      const response = await apiRequest(`/api/wall/posts/${postId}`, {
        method: 'DELETE',
        body: { userId: currentUser.id }
      });

      if (response.ok) {
        toast({
          title: "تم الحذف",
          description: "تم حذف المنشور بنجاح",
        });
        fetchPosts();
      }
    } catch (error) {
      toast({
        title: "خطأ في الحذف",
        description: "لم نتمكن من حذف المنشور",
        variant: "destructive",
      });
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `قبل ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `قبل ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `قبل ${days} يوم`;
  };

  return (
    <aside className="w-full bg-white text-sm overflow-hidden border-l border-gray-200 shadow-lg flex flex-col">
      {/* Header with current view title */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-800">
          {activeView === 'users' && 'المستخدمون المتصلون'}
          {activeView === 'walls' && 'الحوائط'}
          {activeView === 'rooms' && 'الغرف'}
        </h3>
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
                {users.length}
              </span>
            </div>
            
            <ul className="space-y-1">
              {filteredUsers.map((user) => (
                <li key={user.id} className="relative">
                  <SimpleUserMenu
                    targetUser={user}
                    currentUser={currentUser}
                  >
                    <div
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-200 cursor-pointer w-full ${
                        getUserThemeClasses(user)
                      }`}
                      style={{ 
                        ...getUserThemeStyles(user)
                      }}
                      onClick={(e) => onUserClick(e, user)}
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
                              className="text-sm font-medium transition-all duration-300"
                              style={{ 
                                color: user.usernameColor || getUserThemeTextColor(user),
                                textShadow: user.usernameColor ? `0 0 10px ${user.usernameColor}40` : 'none',
                                filter: user.usernameColor ? 'drop-shadow(0 0 3px rgba(255,255,255,0.3))' : 'none'
                              }}
                              title={user.username}
                            >
                              {user.username}
                            </span>
                            {user.isMuted && (
                              <span className="text-yellow-400 text-xs">🔇</span>
                            )}
                          </div>
                          <div className="flex items-center">
                            <UserRoleBadge user={user} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </SimpleUserMenu>
                </li>
              ))}
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
                                                              {/* Post badge for user role */}
                                {post.userRole === 'owner' && <span className="text-yellow-400">👑</span>}
                                {post.userRole === 'admin' && <span className="text-blue-400">⭐</span>}
                                {post.userRole === 'moderator' && <span className="text-green-400">🛡️</span>}
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
                            onClick={() => handleLike(post.id, 'like')}
                            className="flex items-center gap-1 text-blue-600 hover:bg-blue-50"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span className="text-xs">{post.totalLikes || 0}</span>
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleLike(post.id, 'heart')}
                            className="flex items-center gap-1 text-red-600 hover:bg-red-50"
                          >
                            <Heart className="w-4 h-4" />
                            <span className="text-xs">{post.totalHearts || 0}</span>
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleLike(post.id, 'dislike')}
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
        <div className="flex-1 flex flex-col">
          {roomsLoading && (
            <div className="flex items-center justify-center p-4 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
              جاري تحميل الغرف...
            </div>
          )}
          <RoomsPanel
            currentUser={currentUser}
            rooms={rooms}
            currentRoomId={currentRoomId}
            onRoomChange={onRoomChange}
            onAddRoom={onAddRoom}
            onDeleteRoom={onDeleteRoom}
            onRefreshRooms={onRefreshRooms}
          />
        </div>
      )}
    </aside>
  );
});

export default UserSidebarWithWalls;