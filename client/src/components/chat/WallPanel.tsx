import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, ThumbsUp, ThumbsDown, Send, Image as ImageIcon, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { WallPost, CreateWallPostData, ChatUser } from '@/types/chat';

interface WallPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser;
}

export default function WallPanel({ isOpen, onClose, currentUser }: WallPanelProps) {
  const [activeTab, setActiveTab] = useState<'public' | 'friends'>('public');
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const { toast } = useToast();

  // جلب المنشورات
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await apiRequest(`/api/wall/posts/${activeTab}`, {
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
    if (isOpen) {
      fetchPosts();
    }
  }, [isOpen, activeTab]);

  // معالجة اختيار الصورة
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "خطأ",
          description: "حجم الصورة يجب أن يكون أقل من 5 ميجابايت",
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
        title: "خطأ",
        description: "يجب إضافة نص أو صورة",
        variant: "destructive",
      });
      return;
    }

    if (currentUser.userType === 'guest') {
      toast({
        title: "خطأ",
        description: "الضيوف لا يمكنهم النشر على الحائط",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('content', newPostContent);
      formData.append('type', activeTab);
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
          title: "تم النشر",
          description: "تم نشر المنشور بنجاح",
        });
      } else {
        const error = await response.json();
        toast({
          title: "خطأ",
          description: error.error || "فشل في نشر المنشور",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('خطأ في النشر:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في النشر",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
        title: "خطأ",
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-background rounded-lg shadow-xl w-[90vw] h-[90vh] flex flex-col">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-primary">الحوائط</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 flex">
          {/* منطقة الحائط - ثلث الصفحة */}
          <div className="w-1/3 border-l p-4 flex flex-col">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'public' | 'friends')}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="public">الحائط العام</TabsTrigger>
                <TabsTrigger value="friends">حائط الأصدقاء</TabsTrigger>
              </TabsList>

              {/* نموذج النشر */}
              {currentUser.userType !== 'guest' && (
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <Textarea
                      placeholder="ماذا تريد أن تشارك؟"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      className="mb-3 resize-none"
                      rows={3}
                    />
                    
                    {imagePreview && (
                      <div className="relative mb-3">
                        <img 
                          src={imagePreview} 
                          alt="معاينة" 
                          className="max-h-32 rounded-lg object-cover w-full"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 left-2"
                          onClick={removeSelectedImage}
                        >
                          <X className="h-3 w-3" />
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
                          id="image-upload"
                        />
                        <label htmlFor="image-upload">
                          <Button variant="outline" size="sm" className="cursor-pointer">
                            <ImageIcon className="h-4 w-4 ml-2" />
                            صورة
                          </Button>
                        </label>
                      </div>
                      
                      <Button 
                        onClick={handleCreatePost}
                        disabled={loading}
                        size="sm"
                      >
                        <Send className="h-4 w-4 ml-2" />
                        نشر
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <TabsContent value={activeTab} className="flex-1 overflow-y-auto space-y-4">
                {loading ? (
                  <div className="text-center py-8">جاري التحميل...</div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد منشورات بعد
                  </div>
                ) : (
                  posts.map((post) => (
                    <Card key={post.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                              {post.userProfileImage ? (
                                <img 
                                  src={post.userProfileImage} 
                                  alt={post.username}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-bold">
                                  {post.username.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div>
                              <div 
                                className="font-semibold text-sm"
                                style={{ color: post.usernameColor || 'inherit' }}
                              >
                                {post.username}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(post.timestamp).toLocaleString('ar-SA')}
                              </div>
                            </div>
                          </div>
                          
                          {canDeletePost(post) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePost(post.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        {post.content && (
                          <p className="mb-3 text-sm leading-relaxed">{post.content}</p>
                        )}
                        
                        {post.imageUrl && (
                          <div className="mb-3">
                            <img 
                              src={post.imageUrl} 
                              alt="منشور" 
                              className="rounded-lg max-w-full h-auto object-cover max-h-64"
                            />
                          </div>
                        )}
                        
                        {/* أزرار التفاعل */}
                        <div className="flex items-center gap-4 pt-3 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReaction(post.id, 'like')}
                            className="flex items-center gap-1 text-green-600 hover:text-green-700"
                          >
                            <ThumbsUp className="h-4 w-4" />
                            <span className="text-xs">{post.totalLikes}</span>
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReaction(post.id, 'dislike')}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <ThumbsDown className="h-4 w-4" />
                            <span className="text-xs">{post.totalDislikes}</span>
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReaction(post.id, 'heart')}
                            className="flex items-center gap-1 text-pink-600 hover:text-pink-700"
                          >
                            <Heart className="h-4 w-4" />
                            <span className="text-xs">{post.totalHearts}</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* منطقة الشات - ثلثين الصفحة */}
          <div className="w-2/3 p-4">
            <div className="h-full bg-muted/20 rounded-lg flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-2xl mb-2">💬</div>
                <p>منطقة الدردشة ستظهر هنا</p>
                <p className="text-sm mt-1">يمكنك مواصلة الدردشة أثناء تصفح الحائط</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}