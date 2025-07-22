import { useState, useEffect } from 'react';
import UserSidebar from './UserSidebar';
import MessageArea from './MessageArea';
import ProfileModal from './ProfileModal';
import ViewProfileModal from './ViewProfileModal';
import PrivateMessageBox from './PrivateMessageBox';
import UserPopup from './UserPopup';
import SettingsMenu from './SettingsMenu';
import ReportModal from './ReportModal';
import AdminReportsPanel from './AdminReportsPanel';
import NotificationPanel from './NotificationPanel';
import FriendsPanel from './FriendsPanelSimple';
import FriendRequestBadge from './FriendRequestBadge';
import MessagesPanel from './MessagesPanel';
import MessageAlert from './MessageAlert';
import ModerationPanel from './ModerationPanel';
import ReportsLog from '../moderation/ReportsLog';
import ActiveModerationLog from '../moderation/ActiveModerationLog';
import KickNotification from '../moderation/KickNotification';
import BlockNotification from '../moderation/BlockNotification';
import PromoteUserPanel from '../moderation/PromoteUserPanel';
import OwnerAdminPanel from './OwnerAdminPanel';
import ProfileImage from './ProfileImage';
import StealthModeToggle from './StealthModeToggle';
import WelcomeNotification from './WelcomeNotification';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, ThumbsUp, ThumbsDown, Send, Image as ImageIcon, Trash2, Users, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { useChat } from '@/hooks/useChat';
import type { ChatUser, WallPost } from '@/types/chat';

interface ChatInterfaceProps {
  chat: ReturnType<typeof useChat>;
  onLogout: () => void;
}

export default function ChatInterface({ chat, onLogout }: ChatInterfaceProps) {
  const [showProfile, setShowProfile] = useState(false);
  const [profileUser, setProfileUser] = useState<ChatUser | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPrivateUser, setSelectedPrivateUser] = useState<ChatUser | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAdminReports, setShowAdminReports] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);
  const [showReportsLog, setShowReportsLog] = useState(false);
  const [showActiveActions, setShowActiveActions] = useState(false);
  const [showPromotePanel, setShowPromotePanel] = useState(false);
  const [showWall, setShowWall] = useState(false);

  // حالات الحوائط
  const [activeWallTab, setActiveWallTab] = useState<'public' | 'friends'>('public');
  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);
  const [wallLoading, setWallLoading] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const [newMessageAlert, setNewMessageAlert] = useState<{
    show: boolean;
    sender: ChatUser | null;
  }>({
    show: false,
    sender: null,
  });

  const { toast } = useToast();

  // تفعيل التنبيه عند وصول رسالة جديدة
  useEffect(() => {
    if (chat.newMessageSender) {
      setNewMessageAlert({
        show: true,
        sender: chat.newMessageSender,
      });
    }
  }, [chat.newMessageSender]);

  const [reportedUser, setReportedUser] = useState<ChatUser | null>(null);
  const [reportedMessage, setReportedMessage] = useState<{ content: string; id: number } | null>(null);
  const [userPopup, setUserPopup] = useState<{
    show: boolean;
    user: ChatUser | null;
    x: number;
    y: number;
  }>({
    show: false,
    user: null,
    x: 0,
    y: 0,
  });

  const handleUserClick = (event: React.MouseEvent, user: ChatUser) => {
    event.stopPropagation();
    setUserPopup({
      show: true,
      user,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const closeUserPopup = () => {
    setUserPopup(prev => ({ ...prev, show: false }));
  };

  // دوال الحوائط
  const fetchWallPosts = async () => {
    setWallLoading(true);
    try {
      const response = await apiRequest(`/api/wall/posts/${activeWallTab}?userId=${chat.currentUser.id}`, {
        method: 'GET',
      });
      if (response.ok) {
        const data = await response.json();
        setWallPosts(data.posts || []);
      }
    } catch (error) {
      console.error('خطأ في جلب المنشورات:', error);
    } finally {
      setWallLoading(false);
    }
  };

  useEffect(() => {
    if (showWall && chat.currentUser) {
      fetchWallPosts();
    }
  }, [showWall, activeWallTab, chat.currentUser]);

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

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview('');
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !selectedImage) {
      toast({
        title: "محتوى مطلوب",
        description: "يجب إضافة نص أو صورة على الأقل",
        variant: "destructive",
      });
      return;
    }

    if (chat.currentUser.userType === 'guest') {
      toast({
        title: "غير مسموح",
        description: "يجب التسجيل كعضو للنشر على الحائط",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', newPostContent.trim());
      formData.append('type', activeWallTab);
      formData.append('userId', chat.currentUser.id.toString());
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const response = await fetch('/api/wall/posts', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const newPost = await response.json();
        setWallPosts(prev => [newPost.post, ...prev]);
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

  const handleWallReaction = async (postId: number, reactionType: 'like' | 'dislike' | 'heart') => {
    try {
      const response = await apiRequest('/api/wall/react', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          type: reactionType,
          userId: chat.currentUser.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setWallPosts(prev => prev.map(post => 
          post.id === postId ? data.post : post
        ));
      }
    } catch (error) {
      console.error('خطأ في التفاعل:', error);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;

    try {
      const response = await apiRequest(`/api/wall/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: chat.currentUser.id,
        }),
      });

      if (response.ok) {
        setWallPosts(prev => prev.filter(post => post.id !== postId));
        toast({
          title: "تم الحذف",
          description: "تم حذف المنشور بنجاح",
        });
      }
    } catch (error) {
      console.error('خطأ في الحذف:', error);
    }
  };

  const canDeletePost = (post: WallPost) => {
    return post.userId === chat.currentUser.id || 
           ['admin', 'owner', 'moderator'].includes(chat.currentUser.userType);
  };

  const handleReportUser = (user: ChatUser, message?: { content: string; id: number }) => {
    setReportedUser(user);
    setReportedMessage(message || null);
    setShowReportModal(true);
  };

  return (
      <div className="h-screen flex flex-col" onClick={closeUserPopup}>
      {/* Header */}
      <header className="bg-secondary py-4 px-6 flex justify-between items-center shadow-2xl border-b border-accent">
        <div className="flex items-center gap-3">
          <div className="text-2xl">💬</div>
          <div className="text-2xl font-bold text-white">
            Arabic<span className="text-primary">Chat</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2 relative"
            onClick={() => setShowNotifications(true)}
          >
            <span>🔔</span>
            إشعارات
          </Button>
          
          <Button 
            className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2 relative"
            onClick={() => setShowFriends(true)}
          >
            <span>👥</span>
            الأصدقاء
            <FriendRequestBadge currentUser={chat.currentUser} />
          </Button>

          <Button 
            className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2"
            onClick={() => setShowMessages(true)}
            title="الرسائل"
          >
            <span>✉️</span>
            الرسائل
          </Button>
          
          {['owner', 'admin', 'moderator'].includes(chat.currentUser?.userType || '') && (
            <Button 
              className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2"
              onClick={() => setShowModerationPanel(true)}
            >
              <span>🛡️</span>
              الإشراف
            </Button>
          )}
          
          <Button 
            className="glass-effect px-4 py-2 rounded-lg hover:bg-accent transition-all duration-200 flex items-center gap-2"
            onClick={() => setShowSettings(!showSettings)}
          >
            <span>⚙️</span>
            إعدادات
          </Button>

          {/* زر الحوائط */}
          <Button 
            className={`glass-effect px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              showWall ? 'bg-primary/20 hover:bg-primary/30' : 'hover:bg-accent'
            }`}
            onClick={() => setShowWall(!showWall)}
          >
            <span>🏠</span>
            الحوائط
          </Button>

        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar - يتوسع لما الحوائط تكون مفعلة */}
        <div className={`bg-secondary border-l border-accent flex flex-col transition-all duration-300 ${
          showWall ? 'w-96' : 'w-80'
        }`} dir="rtl">
          
          {showWall ? (
            /* عرض الحوائط */
            <>
              {/* رأس الحوائط */}
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

                <Tabs value={activeWallTab} onValueChange={(value) => setActiveWallTab(value as 'public' | 'friends')}>
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

              {/* نموذج النشر */}
              {chat.currentUser?.userType !== 'guest' && (
                <div className="p-3 border-b border-accent/50">
                  <Card className="border-0 shadow-sm bg-background/60">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          {chat.currentUser?.profileImage ? (
                            <img 
                              src={chat.currentUser.profileImage} 
                              alt={chat.currentUser.username}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold text-primary">
                              {chat.currentUser?.username.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium" style={{ color: chat.currentUser?.usernameColor || 'inherit' }}>
                          {chat.currentUser?.username}
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
                {wallLoading ? (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">جاري التحميل...</p>
                  </div>
                ) : wallPosts.length === 0 ? (
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
                    {wallPosts.map((post) => (
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
                          
                          {/* أزرار التفاعل */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/30">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleWallReaction(post.id, 'like')}
                                className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors h-6 px-2"
                              >
                                <ThumbsUp className="h-3 w-3" />
                                <span className="text-xs">{post.totalLikes}</span>
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleWallReaction(post.id, 'heart')}
                                className="flex items-center gap-1 text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-lg transition-colors h-6 px-2"
                              >
                                <Heart className="h-3 w-3" />
                                <span className="text-xs">{post.totalHearts}</span>
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleWallReaction(post.id, 'dislike')}
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
            </>
          ) : (
            /* عرض المتصلين العادي */
            <UserSidebar 
              users={chat.onlineUsers}
              onUserClick={handleUserClick}
              currentUser={chat.currentUser}
            />
          )}
        </div>

        {/* منطقة الدردشة - تتكيف مع عرض الشريط الجانبي */}
        <MessageArea 
          messages={chat.publicMessages}
          currentUser={chat.currentUser}
          onSendMessage={chat.sendPublicMessage}
          onTyping={chat.handleTyping}
          typingUsers={chat.typingUsers}
          onReportMessage={handleReportUser}
          onUserClick={handleUserClick}
        />
      </main>

      {/* Modals and Popups */}
      {showProfile && (
        <>
          {profileUser && profileUser.id !== chat.currentUser?.id ? (
            <ViewProfileModal
              user={profileUser}
              currentUser={chat.currentUser}
              onClose={() => {
                setShowProfile(false);
                setProfileUser(null);
              }}
              onSendPrivateMessage={(user: ChatUser) => {
                setSelectedPrivateUser(user);
                setShowProfile(false);
                setProfileUser(null);
              }}
            />
          ) : (
            <ProfileModal
              user={chat.currentUser}
              onClose={() => setShowProfile(false)}
              onUpdateUser={chat.updateUser}
            />
          )}
        </>
      )}

      {/* User Popup */}
      {userPopup.show && userPopup.user && (
        <UserPopup
          user={userPopup.user}
          currentUser={chat.currentUser}
          position={{ x: userPopup.x, y: userPopup.y }}
          onClose={closeUserPopup}
          onViewProfile={(user: ChatUser) => {
            setProfileUser(user);
            setShowProfile(true);
            closeUserPopup();
          }}
          onSendPrivateMessage={(user: ChatUser) => {
            setSelectedPrivateUser(user);
            closeUserPopup();
          }}
          onReportUser={handleReportUser}
        />
      )}

      {/* Settings Menu */}
      {showSettings && (
        <SettingsMenu
          user={chat.currentUser}
          onClose={() => setShowSettings(false)}
          onLogout={onLogout}
          onShowProfile={() => {
            setShowProfile(true);
            setShowSettings(false);
          }}
        />
      )}

      {/* Private Message Box */}
      {selectedPrivateUser && (
        <PrivateMessageBox
          user={selectedPrivateUser}
          currentUser={chat.currentUser}
          onClose={() => setSelectedPrivateUser(null)}
          onSendMessage={chat.sendPrivateMessage}
          messages={chat.privateMessages[selectedPrivateUser.id] || []}
        />
      )}

      {/* Report Modal */}
      {showReportModal && reportedUser && (
        <ReportModal
          reportedUser={reportedUser}
          reportedMessage={reportedMessage}
          currentUser={chat.currentUser}
          onClose={() => {
            setShowReportModal(false);
            setReportedUser(null);
            setReportedMessage(null);
          }}
        />
      )}

      {/* Admin Reports Panel */}
      {showAdminReports && (
        <AdminReportsPanel
          currentUser={chat.currentUser}
          onClose={() => setShowAdminReports(false)}
        />
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <NotificationPanel
          currentUser={chat.currentUser}
          onClose={() => setShowNotifications(false)}
        />
      )}

      {/* Friends Panel */}
      {showFriends && (
        <FriendsPanel
          currentUser={chat.currentUser}
          onClose={() => setShowFriends(false)}
          onSendPrivateMessage={(user: ChatUser) => {
            setSelectedPrivateUser(user);
            setShowFriends(false);
          }}
        />
      )}

      {/* Messages Panel */}
      {showMessages && (
        <MessagesPanel
          currentUser={chat.currentUser}
          onClose={() => setShowMessages(false)}
          onOpenConversation={(user: ChatUser) => {
            setSelectedPrivateUser(user);
            setShowMessages(false);
          }}
        />
      )}

      {/* Moderation Panel */}
      {showModerationPanel && (
        <ModerationPanel
          currentUser={chat.currentUser}
          onClose={() => setShowModerationPanel(false)}
          onShowReportsLog={() => {
            setShowReportsLog(true);
            setShowModerationPanel(false);
          }}
          onShowActiveActions={() => {
            setShowActiveActions(true);
            setShowModerationPanel(false);
          }}
          onShowPromotePanel={() => {
            setShowPromotePanel(true);
            setShowModerationPanel(false);
          }}
        />
      )}

      {/* Reports Log */}
      {showReportsLog && (
        <ReportsLog
          currentUser={chat.currentUser}
          onClose={() => setShowReportsLog(false)}
        />
      )}

      {/* Active Moderation Log */}
      {showActiveActions && (
        <ActiveModerationLog
          currentUser={chat.currentUser}
          onClose={() => setShowActiveActions(false)}
        />
      )}

      {/* Promote User Panel */}
      {showPromotePanel && (
        <PromoteUserPanel
          currentUser={chat.currentUser}
          onClose={() => setShowPromotePanel(false)}
        />
      )}

      {/* Owner Admin Panel */}
      {showOwnerPanel && (
        <OwnerAdminPanel
          currentUser={chat.currentUser}
          onClose={() => setShowOwnerPanel(false)}
        />
      )}

      {/* Kick Notification */}
      {chat.showKickNotification && (
        <KickNotification
          isVisible={true}
          message="تم طردك من الدردشة"
          onClose={() => chat.setShowKickNotification?.(false)}
        />
      )}

      {/* Block Notification */}
      {chat.showBlockNotification && (
        <BlockNotification
          isVisible={true}
          message="تم حظرك من الدردشة"
          onClose={() => chat.setShowBlockNotification?.(false)}
        />
      )}

      {/* New Message Alert */}
      <MessageAlert
        isOpen={newMessageAlert.show}
        sender={newMessageAlert.sender}
        onClose={() => setNewMessageAlert({ show: false, sender: null })}
        onOpenMessages={() => setShowMessages(true)}
      />

      {/* إشعار الترحيب */}
      {chat.currentUser && <WelcomeNotification user={chat.currentUser} />}

    </div>
  );
}
