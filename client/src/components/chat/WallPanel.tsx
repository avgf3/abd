import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, ThumbsUp, ThumbsDown, Send, Image as ImageIcon, Trash2, X, Users, Globe } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

import WallPostList from './WallPostList';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useGrabScroll } from '@/hooks/useGrabScroll';
import { apiRequest } from '@/lib/queryClient';
import { getSocket, saveSession } from '@/lib/socket';
import type { WallPost, CreateWallPostData, ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import { AvatarWithFrame } from '@/components/ui/AvatarWithFrame';

interface WallPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser;
}

export default function WallPanel({ isOpen, onClose, currentUser }: WallPanelProps) {
  const [activeTab, setActiveTab] = useState<'public' | 'friends'>('public');
  const [posts, setPosts] = useState<WallPost[]>(() => []);
  const [loading, setLoading] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const socket = useRef<Socket | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const panelScrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottomWall, setIsAtBottomWall] = useState(true);
  const wallImageInputRef = useRef<HTMLInputElement>(null);

  useGrabScroll(panelScrollRef);

  const handleWallScroll = useCallback(() => {
    const el = panelScrollRef.current;
    if (!el) return;
    const threshold = 80;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    setIsAtBottomWall(atBottom);
  }, []);

  const scrollWallToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = panelScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  // جلب المنشورات عبر React Query مع كاش قوي
  const { data: wallData, isFetching } = useQuery<{ success?: boolean; posts: WallPost[] }>({
    queryKey: ['/api/wall/posts', activeTab, currentUser.id],
    queryFn: async () => await apiRequest(`/api/wall/posts/${activeTab}?userId=${currentUser.id}`),
    enabled: isOpen && !!currentUser?.id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    initialData: () => queryClient.getQueryData(['/api/wall/posts', activeTab, currentUser.id]) as any,
  });

  useEffect(() => {
    const data = wallData as unknown as { posts?: WallPost[] } | undefined;
    if (data?.posts) {
      setPosts(data.posts);
    }
    setLoading(isFetching);
  }, [wallData, isFetching]);

  // إعداد Socket.IO للتحديثات الفورية
  useEffect(() => {
    if (isOpen && !socket.current) {
      // استخدام Socket الموحد
      const s = getSocket();
      socket.current = s;

      // حفظ نوع الحائط في الجلسة كحقل سياقي (اختياري)
      saveSession({ wallTab: activeTab });
      
      // معالج المنشورات الجديدة
      s.on('message', (message: any) => {
        if (message.type === 'newWallPost') {
          const postType = message.wallType || message.post?.type || 'public';
          if (postType === activeTab) {
            setPosts(prevPosts => [message.post, ...prevPosts]);
            // تحديث الكاش
            queryClient.setQueryData(['/api/wall/posts', activeTab, currentUser.id], (old: any) => {
              const oldPosts = old?.posts || [];
              return { ...(old || {}), posts: [message.post, ...oldPosts] };
            });
            toast({
              title: "منشور جديد ✨",
              description: `منشور جديد من ${message.post.username}`,
            });
          }
        } else if (message.type === 'wallPostReaction') {
          setPosts(prevPosts => prevPosts.map(post => post.id === message.post.id ? message.post : post));
          queryClient.setQueryData(['/api/wall/posts', activeTab, currentUser.id], (old: any) => {
            const oldPosts: WallPost[] = old?.posts || [];
            return { ...(old || {}), posts: oldPosts.map(p => p.id === message.post.id ? message.post : p) };
          });
        } else if (message.type === 'wallPostDeleted') {
          setPosts(prevPosts => prevPosts.filter(post => post.id !== message.postId));
          queryClient.setQueryData(['/api/wall/posts', activeTab, currentUser.id], (old: any) => {
            const oldPosts: WallPost[] = old?.posts || [];
            return { ...(old || {}), posts: oldPosts.filter(p => p.id !== message.postId) };
          });
        }
      });
    }

    return () => {
      if (socket.current) {
        // لا نفصل الاتصال العام، فقط نزيل المستمع المحلي
        socket.current.off('message');
        socket.current = null;
      }
    };
  }, [isOpen, activeTab, toast]);

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

      const result = await apiRequest('/api/wall/posts', {
        method: 'POST',
        body: formData,
      });

      const data = result as any;
      if (data?.post) {
        const newPost = data.post || data;
        // إضافة المنشور للقائمة فوراً
        setPosts(prev => [newPost, ...prev]);
        queryClient.setQueryData(['/api/wall/posts', activeTab, currentUser.id], (old: any) => {
          const oldPosts = old?.posts || [];
          return { ...(old || {}), posts: [newPost, ...oldPosts] };
        });
        setNewPostContent('');
        removeSelectedImage();
        toast({
          title: "تم النشر بنجاح ✨",
          description: "تم نشر المنشور على الحائط",
        });
      } else {
        const errorText = result.error || result.message || 'Unknown error';
        console.error('❌ خطأ في النشر:', result.status, errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        toast({
          title: "فشل في النشر",
          description: errorData.error || "حدث خطأ أثناء النشر",
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
      const result = await apiRequest('/api/wall/react', {
        method: 'POST',
        body: {
          postId,
          type: reactionType,
          userId: currentUser.id,
        },
      });

      const data = result as any;
      if (data?.post) {
        setPosts(prev => prev.map(post => post.id === postId ? data.post : post));
        queryClient.setQueryData(['/api/wall/posts', activeTab, currentUser.id], (old: any) => {
          const oldPosts: WallPost[] = old?.posts || [];
          return { ...(old || {}), posts: oldPosts.map(p => p.id === postId ? data.post : p) };
        });
      }
    } catch (error) {
      console.error('خطأ في التفاعل:', error);
    }
  };

  // حذف المنشور
  const handleDeletePost = async (postId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟\nلا يمكن التراجع عن هذا الإجراء.')) return;

    try {
      await apiRequest(`/api/wall/posts/${postId}`, {
        method: 'DELETE',
        body: {
          userId: currentUser.id,
        },
      });

      setPosts(prev => prev.filter(post => post.id !== postId));
      queryClient.setQueryData(['/api/wall/posts', activeTab, currentUser.id], (old: any) => {
        const oldPosts: WallPost[] = old?.posts || [];
        return { ...(old || {}), posts: oldPosts.filter(p => p.id !== postId) };
      });
      toast({
        title: "تم الحذف",
        description: "تم حذف المنشور بنجاح",
      });
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-6" dir="rtl">
      <div className="bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 w-full sm:w-[95vw] h-[92dvh] sm:h-[92vh] flex flex-col overflow-hidden min-h-0 max-w-[1200px]">
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

        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden min-h-0">
          {/* منطقة الحائط - أكثر من الثلث قليلاً */}
          <div className="w-full sm:w-2/5 border-l border-border/50 p-4 sm:p-6 flex flex-col bg-gradient-to-b from-muted/20 to-transparent min-h-0">
                          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'public' | 'friends')} className="flex-1 flex flex-col min-h-0">
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
                        <AvatarWithFrame
                          src={getImageSrc(currentUser.profileImage)}
                          alt={currentUser.username}
                          fallback={currentUser.username.charAt(0)}
                          frame={currentUser.avatarFrame || 'none'}
                          imageSize={40}
                          frameThickness={Math.round(40 * 0.12)}
                        />
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
                          ref={wallImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer rounded-xl border-dashed hover:bg-primary/5"
                          onClick={() => wallImageInputRef.current?.click()}
                        >
                          <ImageIcon className="h-4 w-4 ml-2" />
                          إضافة صورة
                        </Button>
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

              <TabsContent value={activeTab} className="flex-1">
                <div ref={panelScrollRef} onScroll={handleWallScroll} className="relative overflow-y-auto space-y-4 pr-2 pb-24 cursor-grab">
                  <WallPostList
                    posts={posts}
                    loading={loading}
                    emptyFor={activeTab}
                    currentUser={currentUser}
                    onDelete={handleDeletePost}
                    onReact={handleReaction}
                    canDelete={canDeletePost}
                  />
                  {!isAtBottomWall && (
                    <div className="absolute bottom-4 right-4 z-10">
                      <Button size="sm" onClick={() => scrollWallToBottom('smooth')} className="px-3 py-1.5 rounded-full text-xs bg-primary text-primary-foreground shadow">
                        الانتقال لأسفل
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* منطقة الشات - أقل من الثلثين قليلاً */}
          <div className="w-full sm:w-3/5 p-4 sm:p-6 mt-4 sm:mt-0">
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