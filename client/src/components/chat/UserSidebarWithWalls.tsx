import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, ThumbsUp, ThumbsDown, Send, Image as ImageIcon, Trash2, X, Users, Globe, Home } from 'lucide-react';
import SimpleUserMenu from './SimpleUserMenu';
import ProfileImage from './ProfileImage';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

import type { ChatUser, WallPost, CreateWallPostData } from '@/types/chat';
import { getUserThemeClasses, getUserThemeStyles, getUserThemeTextColor } from '@/utils/themeUtils';

interface UserSidebarWithWallsProps {
  users: ChatUser[];
  onUserClick: (event: React.MouseEvent, user: ChatUser) => void;
  currentUser?: ChatUser | null;
}

export default function UserSidebarWithWalls({ users, onUserClick, currentUser }: UserSidebarWithWallsProps) {
  const [activeView, setActiveView] = useState<'users' | 'walls'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'public' | 'friends'>('public');
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const filteredUsers = users.filter(user =>
    user.isOnline && user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // جلب المنشورات
  const fetchPosts = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const response = await apiRequest(`/api/wall/posts/${activeTab}?userId=${currentUser.id}`, {
        method: 'GET',
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('خطأ في جلب المنشورات:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'walls' && currentUser) {
      fetchPosts();
    }
  }, [activeView, activeTab, currentUser]);

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
      formData.append('postType', activeTab);
      formData.append('userId', currentUser.id.toString());
      
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const response = await fetch('/api/wall/posts', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "تم النشر",
          description: "تم نشر منشورك بنجاح",
        });
        setNewPostContent('');
        removeSelectedImage();
        fetchPosts();
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

  // معالجة الإعجاب
  const handleLike = async (postId: number, type: 'like' | 'heart' | 'dislike') => {
    if (!currentUser) return;
    
    try {
      const response = await apiRequest('/api/wall/posts/react', {
        method: 'POST',
        body: {
          postId,
          userId: currentUser.id,
          reactionType: type,
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

  const getUserRankBadge = (userType: string, username: string) => {
    if (username === 'عبود') {
      return <span className="text-yellow-400">👑</span>;
    }
    
    switch (userType) {
      case 'owner':
        return <span className="text-yellow-400">👑</span>;
      case 'admin':
        return <span className="text-blue-400">⭐</span>;
      case 'moderator':
        return <span className="text-green-400">🛡️</span>;
      default:
        return null;
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
    <aside className="w-96 bg-white text-sm overflow-hidden border-l border-gray-200 shadow-lg flex flex-col">
      {/* Toggle Buttons */}
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
                {users.filter(u => u.isOnline).length}
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
                              {getUserRankBadge(user.userType, user.username)} {user.username}
                            </span>
                            {user.isMuted && (
                              <span className="text-yellow-400 text-xs">🔇</span>
                            )}
                          </div>
                          <span 
                            className="text-xs font-medium"
                            style={{ 
                              color: user.userType === 'owner' ? '#000000' : '#10B981'
                            }}
                          >
                            متصل
                          </span>
                        </div>
                      </div>
                    </div>
                  </SimpleUserMenu>
                </li>
              ))}
            </ul>
            
            {filteredUsers.length === 0 && (
              <div className="text-center text-gray-500 py-6">
                {searchTerm ? 'لا توجد نتائج للبحث' : 'لا يوجد مستخدمون متصلون'}
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
                              <img src={post.userProfileImage} alt={post.username} className="w-full h-full object-cover" />
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
                              {getUserRankBadge(post.userRole, post.username)}
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
    </aside>
  );
}