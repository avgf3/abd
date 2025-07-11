import { useState, useEffect } from 'react';
import { Bell, MessageCircle, Users, UserPlus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser, Notification } from '@/types/chat';

interface SmartNotificationSystemProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
}

interface NotificationGroup {
  type: 'messages' | 'friends' | 'system' | 'moderation';
  notifications: Notification[];
  count: number;
}

export default function SmartNotificationSystem({ isOpen, onClose, currentUser }: SmartNotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // تصنيف الإشعارات ذكياً
  const categorizeNotifications = (): NotificationGroup[] => {
    const groups: NotificationGroup[] = [
      { type: 'messages', notifications: [], count: 0 },
      { type: 'friends', notifications: [], count: 0 },
      { type: 'system', notifications: [], count: 0 },
      { type: 'moderation', notifications: [], count: 0 }
    ];

    notifications.forEach(notification => {
      if (notification.type === 'private_message' || notification.type === 'message') {
        groups[0].notifications.push(notification);
      } else if (notification.type === 'friend_request' || notification.type === 'friend_accepted') {
        groups[1].notifications.push(notification);
      } else if (notification.type === 'promotion' || notification.type === 'kick' || notification.type === 'mute') {
        groups[3].notifications.push(notification);
      } else {
        groups[2].notifications.push(notification);
      }
    });

    groups.forEach(group => {
      group.count = group.notifications.filter(n => !n.isRead).length;
    });

    return groups;
  };

  const fetchNotifications = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const response = await apiRequest(`/api/notifications/${currentUser.id}`);
      // تحويل البيانات المصنفة إلى قائمة واحدة
      const allNotifications = [
        ...(response.messages || []),
        ...(response.friends || []),
        ...(response.system || []),
        ...(response.moderation || [])
      ];
      setNotifications(allNotifications);
    } catch (error) {
      console.error('خطأ في جلب الإشعارات:', error);
      // إنشاء إشعارات تجريبية في حالة عدم وجود بيانات
      setNotifications([
        {
          id: 1,
          type: 'welcome',
          title: '🎉 مرحباً بك',
          message: 'نرحب بك في منصة الدردشة العربية',
          isRead: false,
          createdAt: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
    } catch (error) {
      console.error('خطأ في تحديد الإشعار كمقروء:', error);
    }
  };

  const markAllAsRead = async (type?: string) => {
    if (!currentUser) return;
    
    try {
      await apiRequest(`/api/notifications/${currentUser.id}/mark-all-read`, {
        method: 'PUT',
        body: { type }
      });
      
      setNotifications(prev => 
        prev.map(n => 
          type ? (n.type === type ? { ...n, isRead: true } : n) : { ...n, isRead: true }
        )
      );
      
      toast({
        title: "تم بنجاح",
        description: "تم تحديد جميع الإشعارات كمقروءة",
      });
    } catch (error) {
      console.error('خطأ في تحديد الإشعارات كمقروءة:', error);
    }
  };

  useEffect(() => {
    if (isOpen && currentUser) {
      fetchNotifications();
    }
  }, [isOpen, currentUser]);

  const groups = categorizeNotifications();
  const totalUnread = groups.reduce((sum, group) => sum + group.count, 0);

  const getTabIcon = (type: string) => {
    switch (type) {
      case 'messages': return <MessageCircle className="w-4 h-4" />;
      case 'friends': return <UserPlus className="w-4 h-4" />;
      case 'system': return <Bell className="w-4 h-4" />;
      case 'moderation': return <Shield className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getTabTitle = (type: string) => {
    switch (type) {
      case 'messages': return 'الرسائل';
      case 'friends': return 'الأصدقاء';
      case 'system': return 'النظام';
      case 'moderation': return 'الإدارة';
      default: return 'عام';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    return `منذ ${Math.floor(diff / 86400)} يوم`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-secondary/95 border border-accent">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-white flex items-center justify-center gap-2">
            <Bell className="w-5 h-5" />
            الإشعارات الذكية
            {totalUnread > 0 && (
              <Badge variant="destructive" className="bg-red-500">
                {totalUnread}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <Tabs defaultValue="messages" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4 bg-accent/30">
              {groups.map((group, index) => (
                <TabsTrigger 
                  key={group.type} 
                  value={group.type}
                  className="text-white flex items-center gap-1"
                >
                  {getTabIcon(group.type)}
                  {getTabTitle(group.type)}
                  {group.count > 0 && (
                    <Badge variant="destructive" className="text-xs ml-1">
                      {group.count}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {groups.map((group) => (
              <TabsContent 
                key={group.type} 
                value={group.type} 
                className="space-y-3 max-h-96 overflow-y-auto"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-white">
                    {getTabTitle(group.type)} ({group.notifications.length})
                  </h3>
                  {group.count > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAllAsRead(group.type)}
                      className="text-xs"
                    >
                      تحديد الكل كمقروء
                    </Button>
                  )}
                </div>

                {group.notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-4xl mb-2">
                      {group.type === 'messages' ? '💬' : 
                       group.type === 'friends' ? '👥' : 
                       group.type === 'moderation' ? '🛡️' : '🔔'}
                    </div>
                    <p>لا توجد إشعارات في هذا القسم</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {group.notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent/20 ${
                          notification.isRead 
                            ? 'bg-accent/10 border-accent/30' 
                            : 'bg-primary/10 border-primary/50'
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white text-sm">
                              {notification.title}
                            </h4>
                            <p className="text-muted-foreground text-sm mt-1">
                              {notification.message}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.createdAt)}
                          </div>
                        </div>
                        
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-primary rounded-full absolute -left-1 top-3"></div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-accent/30">
          <Button
            variant="outline"
            onClick={() => markAllAsRead()}
            disabled={totalUnread === 0}
            className="text-white"
          >
            تحديد الكل كمقروء
          </Button>
          <Button
            onClick={onClose}
            className="bg-primary hover:bg-primary/80 text-white"
          >
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}