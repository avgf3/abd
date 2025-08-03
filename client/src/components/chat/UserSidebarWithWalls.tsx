import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, ThumbsUp, ThumbsDown, Send, Image as ImageIcon, Trash2, X, Users, Globe, Home } from 'lucide-react';
import SimpleUserMenu from './SimpleUserMenu';
import ProfileImage from './ProfileImage';
import RoomsPanel from './RoomsPanel';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { getImageSrc } from '@/utils/imageUtils';

import type { ChatUser, WallPost, CreateWallPostData, ChatRoom } from '@/types/chat';
import { getUserThemeClasses, getUserThemeStyles, getUserThemeTextColor } from '@/utils/themeUtils';
import UserRoleBadge from './UserRoleBadge';

interface UserSidebarWithWallsProps {
  users: ChatUser[];
  onUserClick: (event: React.MouseEvent, user: ChatUser) => void;
  currentUser?: ChatUser | null;
  activeView?: 'users' | 'walls' | 'rooms';
  rooms?: ChatRoom[];
  currentRoomId?: string;
  onRoomChange?: (roomId: string) => void;
  onAddRoom?: (roomData: { name: string; description: string; image: File | null }) => void;
  onDeleteRoom?: (roomId: string) => void;
  onRefreshRooms?: () => void;
}

export default function UserSidebarWithWalls({ 
  users, 
  onUserClick, 
  currentUser, 
  activeView: propActiveView = 'users',
  rooms = [],
  currentRoomId = '',
  onRoomChange,
  onAddRoom,
  onDeleteRoom,
  onRefreshRooms
}: UserSidebarWithWallsProps) {
  // استخدام activeView من الـ props مباشرة بدلاً من إنشاء حالة محلية
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'public' | 'friends'>('public');
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // تصفية المستخدمين مع التحقق من وجودهم
  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    return users.filter(user =>
      user && 
      user.username && 
      typeof user.username === 'string' &&
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // إضافة logging للتشخيص
  useEffect(() => {
    console.log('👥 UserSidebarWithWalls - عدد المستخدمين:', users?.length || 0);
    console.log('👥 UserSidebarWithWalls - العرض النشط:', propActiveView);
    console.log('👥 UserSidebarWithWalls - الغرف:', rooms?.length || 0);
  }, [users, propActiveView, rooms]);

  // جلب المنشورات مع التحسين
  const fetchPosts = useCallback(async () => {
    if (!currentUser || propActiveView !== 'walls') return;
    
    setLoading(true);
    try {
      console.log(`🔄 جلب المنشورات للنوع: ${activeTab}, المستخدم: ${currentUser.id}`);
      
      const response = await fetch(`/api/wall/posts/${activeTab}?userId=${currentUser.id}`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        const posts = data.posts || data.data || data || [];
        setPosts(posts);
        console.log('✅ تم تحديث المنشورات:', posts.length);
      } else {
        console.warn('⚠️ خطأ في جلب المنشورات:', response.status);
        setPosts([]);
      }
    } catch (error) {
      console.error('❌ خطأ في الاتصال:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, activeTab, propActiveView]);

  // جلب المنشورات عند الحاجة فقط
  useEffect(() => {
    if (propActiveView === 'walls' && currentUser) {
      fetchPosts();
    }
  }, [propActiveView, currentUser, activeTab, fetchPosts]);

  // وظائف معالجة المنشورات
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const removeImage = useCallback(() => {
    setSelectedImage(null);
    setImagePreview('');
  }, []);

  const submitPost = useCallback(async () => {
    if (!newPostContent.trim() || !currentUser || submitting) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', newPostContent.trim());
      formData.append('type', activeTab);
      formData.append('userId', currentUser.id.toString());
      
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const response = await fetch('/api/wall/posts', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setNewPostContent('');
        removeImage();
        await fetchPosts();
        toast({
          title: "تم نشر المنشور",
          description: "تم نشر منشورك بنجاح",
          duration: 3000,
        });
      } else {
        throw new Error('فشل في نشر المنشور');
      }
    } catch (error) {
      console.error('❌ خطأ في نشر المنشور:', error);
      toast({
        title: "خطأ",
        description: "فشل في نشر المنشور. حاول مرة أخرى.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  }, [newPostContent, currentUser, submitting, activeTab, selectedImage, removeImage, fetchPosts, toast]);

  // وظائف التفاعل مع المنشورات
  const handleReaction = useCallback(async (postId: number, reactionType: 'like' | 'dislike' | 'heart') => {
    if (!currentUser) return;

    try {
      const response = await fetch('/api/wall/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          userId: currentUser.id,
          type: reactionType,
        }),
      });

      if (response.ok) {
        await fetchPosts();
      }
    } catch (error) {
      console.error('❌ خطأ في التفاعل:', error);
    }
  }, [currentUser, fetchPosts]);

  const deletePost = useCallback(async (postId: number) => {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/wall/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (response.ok) {
        await fetchPosts();
        toast({
          title: "تم حذف المنشور",
          description: "تم حذف المنشور بنجاح",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('❌ خطأ في حذف المنشور:', error);
    }
  }, [currentUser, fetchPosts, toast]);

  // وظائف المساعدة
  const getUserRankBadge = useCallback((user: ChatUser) => {
    if (user.userType === 'owner') {
      return <img src="/svgs/crown.svg" alt="owner" style={{width: 24, height: 24, display: 'inline'}} />;
    }
    if (user.userType === 'admin') {
      return <span style={{fontSize: 24, display: 'inline'}}>⭐</span>;
    }
    if (user.userType === 'moderator') {
      return <span style={{fontSize: 24, display: 'inline'}}>🛡️</span>;
    }
    // المزيد من الرتب...
    return null;
  }, []);

  const formatLastSeen = useCallback((lastSeen?: Date) => {
    if (!lastSeen) return 'غير معروف';
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'متصل الآن';
    if (minutes < 60) return `قبل ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `قبل ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `قبل ${days} يوم`;
  }, []);

  return (
    <aside className="h-full bg-white flex flex-col shadow-lg border-l border-gray-200">
      {/* Header مع أزرار التبويب */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex gap-1">
          <Button
            variant={propActiveView === 'users' ? 'default' : 'ghost'}
            size="sm"
            className={`flex-1 text-xs transition-all duration-200 ${
              propActiveView === 'users' 
                ? 'bg-blue-500 text-white shadow-md' 
                : 'hover:bg-gray-100'
            }`}
            onClick={() => {/* يتم التحكم من المكون الأب */}}
            title="المستخدمون المتصلون"
          >
            <Users className="w-4 h-4 mr-1" />
            المتصلون
          </Button>
          
          <Button
            variant={propActiveView === 'walls' ? 'default' : 'ghost'}
            size="sm"
            className={`flex-1 text-xs transition-all duration-200 ${
              propActiveView === 'walls'
                ? 'bg-green-500 text-white shadow-md'
                : 'hover:bg-gray-100'
            }`}
            onClick={() => {/* يتم التحكم من المكون الأب */}}
            title="الحوائط"
          >
            <Globe className="w-4 h-4 mr-1" />
            الحوائط
          </Button>
          
          <Button
            variant={propActiveView === 'rooms' ? 'default' : 'ghost'}
            size="sm"
            className={`flex-1 text-xs transition-all duration-200 ${
              propActiveView === 'rooms'
                ? 'bg-purple-500 text-white shadow-md'
                : 'hover:bg-gray-100'
            }`}
            onClick={() => {/* يتم التحكم من المكون الأب */}}
            title="الغرف"
          >
            <Home className="w-4 h-4 mr-1" />
            الغرف
          </Button>
        </div>
      </div>

      {/* المحتوى حسب التبويب النشط */}
      <div className="flex-1 overflow-hidden">
        {propActiveView === 'users' && (
          <div className="h-full flex flex-col">
            {/* شريط البحث */}
            <div className="p-3 border-b">
              <div className="relative">
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="البحث عن المستخدمين..."
                  className="w-full pl-4 pr-10 py-2 rounded-lg bg-gray-50 border-gray-300 text-sm"
                />
              </div>
            </div>
            
            {/* قائمة المستخدمين */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex items-center gap-2 font-bold text-green-600 text-sm mb-3">
                <span className="text-xs">●</span>
                المتصلون الآن
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                  {filteredUsers.length}
                </span>
              </div>
              
              <div className="space-y-1">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="relative">
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
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span 
                                className="text-sm font-medium transition-all duration-300 truncate"
                                style={{ 
                                  color: user.usernameColor || getUserThemeTextColor(user),
                                  textShadow: user.usernameColor ? `0 0 10px ${user.usernameColor}40` : 'none'
                                }}
                                title={user.username}
                              >
                                {user.username}
                              </span>
                              {getUserRankBadge(user)}
                              {user.isMuted && (
                                <span className="text-yellow-400 text-xs">🔇</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </SimpleUserMenu>
                  </div>
                ))}
              </div>
              
              {filteredUsers.length === 0 && (
                <div className="text-center text-gray-500 py-6 text-sm">
                  {searchTerm ? 'لا توجد نتائج للبحث' : 'لا يوجد مستخدمون متصلون'}
                </div>
              )}
            </div>
          </div>
        )}

        {propActiveView === 'walls' && (
          <div className="h-full flex flex-col">
            {/* تبويبات الحوائط */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'public' | 'friends')} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 m-2">
                <TabsTrigger value="public" className="text-xs">العامة</TabsTrigger>
                <TabsTrigger value="friends" className="text-xs">الأصدقاء</TabsTrigger>
              </TabsList>

              {/* محتوى التبويبات */}
              <div className="flex-1 overflow-hidden">
                <TabsContent value="public" className="h-full m-0">
                  <div className="h-full flex flex-col">
                    {/* نموذج إضافة منشور */}
                    {currentUser && (
                      <div className="p-3 border-b bg-gray-50">
                        <div className="space-y-2">
                          <Textarea
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="ما الذي تفكر فيه؟"
                            className="resize-none text-sm"
                            rows={2}
                          />
                          
                          {imagePreview && (
                            <div className="relative">
                              <img 
                                src={imagePreview} 
                                alt="معاينة" 
                                className="w-full h-32 object-cover rounded-lg border"
                              />
                              <Button
                                onClick={removeImage}
                                variant="destructive"
                                size="sm"
                                className="absolute top-2 right-2"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageSelect}
                              className="hidden"
                              id="wallImageInput"
                            />
                            <label htmlFor="wallImageInput">
                              <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                                <span>
                                  <ImageIcon className="w-4 h-4" />
                                </span>
                              </Button>
                            </label>
                            <Button 
                              onClick={submitPost}
                              disabled={!newPostContent.trim() || submitting}
                              size="sm"
                              className="flex-1"
                            >
                              {submitting ? 'جاري النشر...' : 'نشر'}
                              <Send className="w-4 h-4 mr-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* قائمة المنشورات */}
                    <div className="flex-1 overflow-y-auto p-3">
                      {loading ? (
                        <div className="text-center py-6">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                          <p className="text-sm text-gray-500 mt-2">جاري تحميل المنشورات...</p>
                        </div>
                      ) : posts.length > 0 ? (
                        <div className="space-y-3">
                          {posts.map((post) => (
                            <Card key={post.id} className="text-sm">
                              <CardHeader className="p-3 pb-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <ProfileImage 
                                      user={{
                                        id: post.userId,
                                        username: post.username,
                                        profileImage: post.userProfileImage,
                                        profileBackgroundColor: '#f3f4f6',
                                        userType: post.userRole as any,
                                        role: post.userRole as any,
                                        isOnline: false,
                                        isHidden: false,
                                        lastSeen: null,
                                        joinDate: new Date(),
                                        createdAt: new Date(),
                                        isMuted: false,
                                        muteExpiry: null,
                                        isBanned: false,
                                        banExpiry: null,
                                        isBlocked: false,
                                        ignoredUsers: [],
                                        usernameColor: post.usernameColor || '',
                                        userTheme: '',
                                        profileEffect: '',
                                        points: 0,
                                        level: 1,
                                        totalPoints: 0,
                                        levelProgress: 0,
                                      }}
                                      size="small"
                                    />
                                    <div>
                                      <div className="font-medium" style={{ color: post.usernameColor }}>
                                        {post.username}
                                        <UserRoleBadge userType={post.userRole as any} />
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {new Date(post.timestamp).toLocaleString('ar-EG')}
                                      </div>
                                    </div>
                                  </div>
                                  {currentUser?.id === post.userId && (
                                    <Button
                                      onClick={() => deletePost(post.id)}
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="p-3 pt-0">
                                <p className="text-sm mb-2">{post.content}</p>
                                {post.imageUrl && (
                                  <img 
                                    src={getImageSrc(post.imageUrl)} 
                                    alt="منشور" 
                                    className="w-full rounded-lg border max-h-48 object-cover"
                                  />
                                )}
                                <div className="flex items-center gap-3 mt-3 pt-2 border-t">
                                  <Button
                                    onClick={() => handleReaction(post.id, 'like')}
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center gap-1 text-blue-500"
                                  >
                                    <ThumbsUp className="w-4 h-4" />
                                    <span className="text-xs">{post.totalLikes}</span>
                                  </Button>
                                  <Button
                                    onClick={() => handleReaction(post.id, 'heart')}
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center gap-1 text-red-500"
                                  >
                                    <Heart className="w-4 h-4" />
                                    <span className="text-xs">{post.totalHearts}</span>
                                  </Button>
                                  <Button
                                    onClick={() => handleReaction(post.id, 'dislike')}
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center gap-1 text-gray-500"
                                  >
                                    <ThumbsDown className="w-4 h-4" />
                                    <span className="text-xs">{post.totalDislikes}</span>
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-sm text-gray-500">لا توجد منشورات بعد</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="friends" className="h-full m-0">
                  {/* نفس المحتوى لكن للأصدقاء */}
                  <div className="h-full flex flex-col">
                    {/* نموذج إضافة منشور للأصدقاء */}
                    {currentUser && (
                      <div className="p-3 border-b bg-gray-50">
                        <div className="space-y-2">
                          <Textarea
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="شارك شيئاً مع أصدقائك..."
                            className="resize-none text-sm"
                            rows={2}
                          />
                          
                          <div className="flex gap-2">
                            <Button 
                              onClick={submitPost}
                              disabled={!newPostContent.trim() || submitting}
                              size="sm"
                              className="flex-1"
                            >
                              {submitting ? 'جاري النشر...' : 'نشر للأصدقاء'}
                              <Send className="w-4 h-4 mr-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* قائمة منشورات الأصدقاء */}
                    <div className="flex-1 overflow-y-auto p-3">
                      {loading ? (
                        <div className="text-center py-6">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                          <p className="text-sm text-gray-500 mt-2">جاري تحميل منشورات الأصدقاء...</p>
                        </div>
                      ) : posts.length > 0 ? (
                        <div className="space-y-3">
                          {posts.map((post) => (
                            <Card key={post.id} className="text-sm border-green-200">
                              {/* نفس تصميم المنشور لكن مع ألوان مختلفة للأصدقاء */}
                              <CardHeader className="p-3 pb-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <ProfileImage 
                                      user={{
                                        id: post.userId,
                                        username: post.username,
                                        profileImage: post.userProfileImage,
                                        profileBackgroundColor: '#f3f4f6',
                                        userType: post.userRole as any,
                                        role: post.userRole as any,
                                        isOnline: false,
                                        isHidden: false,
                                        lastSeen: null,
                                        joinDate: new Date(),
                                        createdAt: new Date(),
                                        isMuted: false,
                                        muteExpiry: null,
                                        isBanned: false,
                                        banExpiry: null,
                                        isBlocked: false,
                                        ignoredUsers: [],
                                        usernameColor: post.usernameColor || '',
                                        userTheme: '',
                                        profileEffect: '',
                                        points: 0,
                                        level: 1,
                                        totalPoints: 0,
                                        levelProgress: 0,
                                      }}
                                      size="small"
                                    />
                                    <div>
                                      <div className="font-medium text-green-600">
                                        {post.username}
                                        <span className="text-xs bg-green-100 text-green-700 px-1 rounded mr-1">صديق</span>
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {new Date(post.timestamp).toLocaleString('ar-EG')}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="p-3 pt-0">
                                <p className="text-sm mb-2">{post.content}</p>
                                {post.imageUrl && (
                                  <img 
                                    src={getImageSrc(post.imageUrl)} 
                                    alt="منشور" 
                                    className="w-full rounded-lg border max-h-48 object-cover"
                                  />
                                )}
                                <div className="flex items-center gap-3 mt-3 pt-2 border-t">
                                  <Button
                                    onClick={() => handleReaction(post.id, 'like')}
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center gap-1 text-blue-500"
                                  >
                                    <ThumbsUp className="w-4 h-4" />
                                    <span className="text-xs">{post.totalLikes}</span>
                                  </Button>
                                  <Button
                                    onClick={() => handleReaction(post.id, 'heart')}
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center gap-1 text-red-500"
                                  >
                                    <Heart className="w-4 h-4" />
                                    <span className="text-xs">{post.totalHearts}</span>
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-sm text-gray-500">لا توجد منشورات من الأصدقاء بعد</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}

        {propActiveView === 'rooms' && (
          <RoomsPanel
            currentUser={currentUser}
            rooms={rooms}
            currentRoomId={currentRoomId}
            onRoomChange={onRoomChange}
            onAddRoom={onAddRoom}
            onDeleteRoom={onDeleteRoom}
            onRefreshRooms={onRefreshRooms}
          />
        )}
      </div>
    </aside>
  );
}