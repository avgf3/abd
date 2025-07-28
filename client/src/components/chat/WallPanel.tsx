import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, ThumbsUp, ThumbsDown, Send, Image as ImageIcon, Trash2, X, Users, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { getImageSrc } from '@/utils/imageUtils';
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
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // جلب المنشورات
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/wall/posts/${activeTab}?userId=${currentUser.id}`, {
        method: 'GET',
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      } else {
        console.error('خطأ في جلب المنشورات:', response.status);
        toast({
          title: "خطأ",
          description: "فشل في جلب المنشورات",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('خطأ في جلب المنشورات:', error);
      toast({
        title: "خطأ",
        description: "فشل في الاتصال بالخادم",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPosts();
    }
  }, [isOpen, activeTab]);

  // معالجة اختيار الصورة مع تحسينات احترافية
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // فحص نوع الملف
      if (!file.type.startsWith('image/')) {
        toast({
          title: "خطأ في نوع الملف",
          description: "يرجى اختيار صورة صالحة فقط",
          variant: "destructive",
        });
        return;
      }

      // فحص حجم الملف - 10MB حد أقصى
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

  // نشر منشور جديد مع تحسينات
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
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟\nلا يمكن التراجع عن هذا الإجراء.')) return;

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

  // تحديد نسبة العرض للصورة
  const getImageAspectRatio = (imageUrl: string) => {
    return new Promise<number>((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve(img.width / img.height);
      };
      img.src = imageUrl;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" dir="rtl">
      <div className="bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 w-[95vw] h-[92vh] flex flex-col overflow-hidden">
        {/* رأس النافذة المحسن */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 bg-gradient-to-l from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">الحوائط</h2>
              <p className="text-sm text-muted-foreground">شارك أفكارك مع الجميع</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl hover:bg-destructive/10">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* منطقة الحائط - أكثر من الثلث قليلاً */}
          <div className="w-2/5 border-l border-border/50 p-6 flex flex-col bg-gradient-to-b from-muted/20 to-transparent">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'public' | 'friends')} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 backdrop-blur-sm rounded-xl p-1">
                <TabsTrigger value="public" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  الحائط العام
                </TabsTrigger>
                <TabsTrigger value="friends" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  حائط الأصدقاء
                </TabsTrigger>
              </TabsList>

              {/* نموذج النشر المحسن */}
              {currentUser.userType !== 'guest' && (
                <Card className="mb-6 border-0 shadow-lg bg-background/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        {currentUser.profileImage ? (
                          <img 
                            src={getImageSrc(currentUser.profileImage)} 
                            alt={currentUser.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-primary">
                            {currentUser.username.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold" style={{ color: currentUser.usernameColor || 'inherit' }}>
                          {currentUser.username}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ماذا تريد أن تشارك؟
                        </div>
                      </div>
                    </div>

                    <Textarea
                      placeholder="شارك أفكارك، تجاربك، أو أي شيء يخطر ببالك..."
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      className="mb-4 resize-none border-0 bg-muted/30 rounded-xl focus:bg-muted/50 transition-colors min-h-[100px]"
                      maxLength={500}
                    />
                    
                    <div className="text-xs text-muted-foreground mb-4 text-left">
                      {newPostContent.length}/500 حرف
                    </div>
                    
                    {imagePreview && (
                      <div className="relative mb-4 group">
                        <div className="rounded-xl overflow-hidden bg-muted/20 p-2">
                          <img 
                            src={imagePreview} 
                            alt="معاينة" 
                            className="w-full h-auto max-h-48 object-contain rounded-lg"
                          />
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-3 left-3 rounded-full w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={removeSelectedImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                          id="image-upload"
                        />
                        <label htmlFor="image-upload">
                          <Button variant="outline" size="sm" className="cursor-pointer rounded-xl border-dashed hover:bg-primary/5">
                            <ImageIcon className="h-4 w-4 ml-2" />
                            إضافة صورة
                          </Button>
                        </label>
                      </div>
                      
                      <Button 
                        onClick={handleCreatePost}
                        disabled={submitting || (!newPostContent.trim() && !selectedImage)}
                        size="sm"
                        className="rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                      >
                        {submitting ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            جاري النشر...
                          </div>
                        ) : (
                          <>
                            <Send className="h-4 w-4 ml-2" />
                            نشر
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <TabsContent value={activeTab} className="flex-1 overflow-y-auto space-y-4 pr-2">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">جاري تحميل المنشورات...</p>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
                      <Globe className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">لا توجد منشورات بعد</h3>
                    <p className="text-muted-foreground text-sm">
                      كن أول من ينشر على {activeTab === 'public' ? 'الحائط العام' : 'حائط الأصدقاء'}!
                    </p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <Card key={post.id} className="hover:shadow-lg transition-all duration-300 border-0 bg-background/60 backdrop-blur-sm group">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-primary/10">
                                {post.userProfileImage ? (
                                  <img 
                                    src={post.userProfileImage} 
                                    alt={post.username}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-lg font-bold text-primary">
                                    {post.username.charAt(0)}
                                  </span>
                                )}
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                            </div>
                            <div>
                              <div 
                                className="font-bold text-base"
                                style={{ color: post.usernameColor || 'inherit' }}
                              >
                                {post.username}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <span>{new Date(post.timestamp).toLocaleString('ar-SA')}</span>
                                {post.userRole !== 'member' && (
                                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                                    {post.userRole === 'admin' ? 'مدير' : 
                                     post.userRole === 'owner' ? 'مالك' : 
                                     post.userRole === 'moderator' ? 'مراقب' : post.userRole}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {canDeletePost(post) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePost(post.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        {post.content && (
                          <div className="mb-4">
                            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                              {post.content}
                            </p>
                          </div>
                        )}
                        
                        {post.imageUrl && (
                          <div className="mb-4 rounded-xl overflow-hidden bg-muted/10">
                            <img 
                              src={post.imageUrl} 
                              alt="منشور" 
                              className="w-full h-auto object-cover max-h-80 hover:scale-105 transition-transform duration-300 cursor-pointer"
                              style={{
                                aspectRatio: 'auto'
                              }}
                              onClick={() => {
                                // فتح الصورة في نافذة جديدة للعرض الكامل
                                window.open(post.imageUrl, '_blank');
                              }}
                            />
                          </div>
                        )}
                        
                        {/* أزرار التفاعل المحسنة */}
                        <div className="flex items-center justify-between pt-4 border-t border-border/30">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReaction(post.id, 'like')}
                              className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-colors"
                            >
                              <ThumbsUp className="h-4 w-4" />
                              <span className="text-sm font-medium">{post.totalLikes}</span>
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReaction(post.id, 'heart')}
                              className="flex items-center gap-2 text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-xl transition-colors"
                            >
                              <Heart className="h-4 w-4" />
                              <span className="text-sm font-medium">{post.totalHearts}</span>
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReaction(post.id, 'dislike')}
                              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <ThumbsDown className="h-4 w-4" />
                              <span className="text-sm font-medium">{post.totalDislikes}</span>
                            </Button>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            {(post.totalLikes + post.totalHearts + post.totalDislikes)} تفاعل
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* منطقة الشات - أقل من الثلثين قليلاً */}
          <div className="w-3/5 p-6">
            <div className="h-full bg-gradient-to-br from-muted/10 to-muted/20 rounded-2xl flex items-center justify-center text-muted-foreground border border-dashed border-border/50">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <div className="text-4xl">💬</div>
                </div>
                <h3 className="text-xl font-semibold mb-2">منطقة الدردشة المدمجة</h3>
                <p className="text-muted-foreground mb-2">يمكنك مواصلة الدردشة أثناء تصفح الحائط</p>
                <p className="text-sm text-muted-foreground/70">ستظهر رسائل الدردشة هنا قريباً</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}