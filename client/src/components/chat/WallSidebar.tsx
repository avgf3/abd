import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, ThumbsUp, ThumbsDown, Send, Image as ImageIcon, Trash2, Users, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { WallPost, CreateWallPostData, ChatUser } from '@/types/chat';

interface WallSidebarProps {
  currentUser: ChatUser;
}

export default function WallSidebar({ currentUser }: WallSidebarProps) {
  const [activeTab, setActiveTab] = useState<'public' | 'friends'>('public');
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // جلب المنشورات
  const fetchPosts = async () => {
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
    fetchPosts();
  }, [activeTab]);

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

    if (currentUser.userType === 'guest') {
      toast({
        title: "غير مسموح",
        description: "يجب التسجيل كعضو للنشر على الحائط",
        variant: "destructive",
      });
      return;
    }

    if (newPostContent.length > 500) {
      toast({
        title: "النص طويل",
        description: "النص يجب أن يكون أقل من 500 حرف",
        variant: "destructive",
      });
      return;
    }

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
        const newPost = await response.json();
        setPosts(prev => [newPost.post, ...prev]);
        setNewPostContent('');
        removeSelectedImage();
        toast({
          title: "تم النشر بنجاح ✨",
          description: "تم نشر المنشور على الحائط",
        });
      } else {
        const error = await response.json();
        toast({
          title: "فشل في النشر",
          description: error.error || "حدث خطأ أثناء النشر",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('خطأ في النشر:', error);
      toast({
        title: "خطأ في الاتصال",
        description: "تعذر الاتصال بالخادم",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // التفاعل مع المنشور
  const handleReaction = async (postId: number, reactionType: 'like' | 'dislike' | 'heart') => {
    try {
      const response = await apiRequest('/api/wall/react', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          type: reactionType,
          userId: currentUser.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(prev => prev.map(post => 
          post.id === postId ? data.post : post
        ));
      }
    } catch (error) {
      console.error('خطأ في التفاعل:', error);
    }
  };

  // حذف المنشور
  const handleDeletePost = async (postId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;

    try {
      const response = await apiRequest(`/api/wall/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.id,
        }),
      });

      if (response.ok) {
        setPosts(prev => prev.filter(post => post.id !== postId));
        toast({
          title: "تم الحذف",
          description: "تم حذف المنشور بنجاح",
        });
      }
    } catch (error) {
      console.error('خطأ في الحذف:', error);
      toast({
        title: "خطأ في الحذف",
        description: "فشل في حذف المنشور",
        variant: "destructive",
      });
    }
  };

  // تحديد ما إذا كان المستخدم يستطيع حذف المنشور
  const canDeletePost = (post: WallPost) => {
    return post.userId === currentUser.id || 
           ['admin', 'owner', 'moderator'].includes(currentUser.userType);
  };

  return (
    <div className="w-80 bg-secondary border-l border-accent flex flex-col h-full" dir="rtl">
      {/* رأس الحائط */}
      <div className="p-4 border-b border-accent bg-gradient-to-l from-primary/5 to-transparent">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Globe className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">الحوائط</h2>
            <p className="text-xs text-muted-foreground">شارك أفكارك</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'public' | 'friends')}>
          <TabsList className="grid w-full grid-cols-2 bg-muted/50 rounded-lg p-1">
            <TabsTrigger value="public" className="rounded-md text-xs flex items-center gap-1">
              <Globe className="h-3 w-3" />
              عام
            </TabsTrigger>
            <TabsTrigger value="friends" className="rounded-md text-xs flex items-center gap-1">
              <Users className="h-3 w-3" />
              أصدقاء
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* نموذج النشر المضغوط */}
      {currentUser.userType !== 'guest' && (
        <div className="p-3 border-b border-accent/50">
          <Card className="border-0 shadow-sm bg-background/60">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  {currentUser.profileImage ? (
                    <img 
                      src={currentUser.profileImage} 
                      alt={currentUser.username}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-primary">
                      {currentUser.username.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium" style={{ color: currentUser.usernameColor || 'inherit' }}>
                  {currentUser.username}
                </span>
              </div>

              <Textarea
                placeholder="ماذا تريد أن تشارك؟"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="mb-2 resize-none border-0 bg-muted/30 rounded-lg text-xs min-h-[60px]"
                maxLength={500}
              />
              
              <div className="text-xs text-muted-foreground mb-2 text-left">
                {newPostContent.length}/500
              </div>
              
              {imagePreview && (
                <div className="relative mb-2 group">
                  <img 
                    src={imagePreview} 
                    alt="معاينة" 
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 left-1 rounded-full w-5 h-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={removeSelectedImage}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="wall-image-upload"
                  />
                  <label htmlFor="wall-image-upload">
                    <Button variant="outline" size="sm" className="cursor-pointer text-xs rounded-lg border-dashed h-7">
                      <ImageIcon className="h-3 w-3 ml-1" />
                      صورة
                    </Button>
                  </label>
                </div>
                
                <Button 
                  onClick={handleCreatePost}
                  disabled={submitting || (!newPostContent.trim() && !selectedImage)}
                  size="sm"
                  className="text-xs h-7 rounded-lg"
                >
                  {submitting ? (
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      نشر...
                    </div>
                  ) : (
                    <>
                      <Send className="h-3 w-3 ml-1" />
                      نشر
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* قائمة المنشورات */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">جاري التحميل...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-3">
              <Globe className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold mb-1">لا توجد منشورات</h3>
            <p className="text-xs text-muted-foreground">
              كن أول من ينشر!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow border-0 bg-background/60 group">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        {post.userProfileImage ? (
                          <img 
                            src={post.userProfileImage} 
                            alt={post.username}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-primary">
                            {post.username.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <div 
                          className="font-semibold text-xs"
                          style={{ color: post.usernameColor || 'inherit' }}
                        >
                          {post.username}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(post.timestamp).toLocaleString('ar-SA', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    
                    {canDeletePost(post) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePost(post.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {post.content && (
                    <p className="mb-2 text-xs leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>
                  )}
                  
                  {post.imageUrl && (
                    <div className="mb-2 rounded-lg overflow-hidden">
                      <img 
                        src={post.imageUrl} 
                        alt="منشور" 
                        className="w-full h-auto object-cover max-h-32 hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => window.open(post.imageUrl, '_blank')}
                      />
                    </div>
                  )}
                  
                  {/* أزرار التفاعل المضغوطة */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReaction(post.id, 'like')}
                        className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors h-6 px-2"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        <span className="text-xs">{post.totalLikes}</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReaction(post.id, 'heart')}
                        className="flex items-center gap-1 text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-lg transition-colors h-6 px-2"
                      >
                        <Heart className="h-3 w-3" />
                        <span className="text-xs">{post.totalHearts}</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReaction(post.id, 'dislike')}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors h-6 px-2"
                      >
                        <ThumbsDown className="h-3 w-3" />
                        <span className="text-xs">{post.totalDislikes}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}