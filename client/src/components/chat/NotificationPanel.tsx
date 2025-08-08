import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Bell, X, Check, Trash2, Users } from 'lucide-react';
import type { ChatUser } from '@/types/chat';

interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
}

export default function NotificationPanel({ isOpen, onClose, currentUser }: NotificationPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastChecked, setLastChecked] = useState<number>(Date.now());

  // جلب الإشعارات - polling محسن
  const { data: notificationsData, isLoading, refetch } = useQuery<{ notifications: Notification[] }>({
    queryKey: ['/api/notifications', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('No user ID');
      return await apiRequest(`/api/notifications?userId=${currentUser.id}&after=${lastChecked}`);
    },
    enabled: !!currentUser?.id && isOpen,
    refetchInterval: isOpen ? 30000 : false, // كل 30 ثانية بدلاً من 3 ثوانٍ عند فتح النافذة
    staleTime: 10000, // البيانات صالحة لمدة 10 ثوانٍ
    gcTime: 5 * 60 * 1000 // حفظ في الكاش لمدة 5 دقائق
  });

  // جلب عدد الإشعارات غير المقروءة - مُحسّن
  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('No user ID');
      return await apiRequest(`/api/notifications/unread-count?userId=${currentUser.id}`);
    },
    enabled: !!currentUser?.id,
    refetchInterval: 60000, // كل دقيقة بدلاً من ثانيتين
    staleTime: 30000, // البيانات صالحة لمدة 30 ثانية
  });

  // Real-time notifications via Socket.IO (مُحسّن)
  useEffect(() => {
    if (!currentUser?.id) return;

    const handleNotificationReceived = (event: CustomEvent) => {
      // تحديث فوري للبيانات
      queryClient.invalidateQueries({
        queryKey: ['/api/notifications', currentUser.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/notifications/unread-count', currentUser.id]
      });
      
      setLastChecked(Date.now());
    };

    const handleFriendRequestReceived = (event: CustomEvent) => {
      // تحديث فوري
      queryClient.invalidateQueries({
        queryKey: ['/api/notifications', currentUser.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/notifications/unread-count', currentUser.id]
      });
      
      // عرض toast notification
      toast({
        title: "طلب صداقة جديد",
        description: `${event.detail.senderName} يريد إضافتك كصديق`,
      });
    };

    const handleFriendRequestAccepted = (event: CustomEvent) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/notifications', currentUser.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/notifications/unread-count', currentUser.id]
      });
      
      toast({
        title: "تم قبول طلب الصداقة",
        description: `${event.detail.friendName} قبل طلب صداقتك`,
      });
    };

    // إضافة مستمعي الأحداث مع cleanup محسن
    window.addEventListener('notificationReceived', handleNotificationReceived as EventListener);
    window.addEventListener('friendRequestReceived', handleFriendRequestReceived as EventListener);
    window.addEventListener('friendRequestAccepted', handleFriendRequestAccepted as EventListener);

    // تنظيف المستمعين
    return () => {
      window.removeEventListener('notificationReceived', handleNotificationReceived as EventListener);
      window.removeEventListener('friendRequestReceived', handleFriendRequestReceived as EventListener);
      window.removeEventListener('friendRequestAccepted', handleFriendRequestAccepted as EventListener);
    };
  }, [currentUser?.id, queryClient, toast]);

  // تحديد إشعار كمقروء - محسن
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
    },
    onSuccess: () => {
      // تحديث فوري وذكي للكاش
      queryClient.setQueryData(
        ['/api/notifications', currentUser?.id],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            notifications: oldData.notifications.map((notif: Notification) =>
              notif.id === arguments[0] ? { ...notif, isRead: true } : notif
            )
          };
        }
      );
      
      // تحديث عدد غير المقروءة
      queryClient.setQueryData(
        ['/api/notifications/unread-count', currentUser?.id],
        (oldData: any) => {
          if (!oldData || oldData.count <= 0) return oldData;
          return { count: oldData.count - 1 };
        }
      );
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "فشل في تحديد الإشعار كمقروء",
        variant: "destructive"
      });
    }
  });

  // تحديد جميع الإشعارات كمقروءة - محسن
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/notifications/user/${currentUser?.id}/read-all`, {
        method: 'PUT'
      });
    },
    onSuccess: () => {
      // تحديث فوري للكاش
      queryClient.setQueryData(
        ['/api/notifications', currentUser?.id],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            notifications: oldData.notifications.map((notif: Notification) => ({
              ...notif,
              isRead: true
            }))
          };
        }
      );
      
      queryClient.setQueryData(
        ['/api/notifications/unread-count', currentUser?.id],
        { count: 0 }
      );
      
      toast({
        title: "تم تحديد جميع الإشعارات كمقروءة",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تحديد الإشعارات كمقروءة",
        variant: "destructive"
      });
    }
  });

  // حذف إشعار - محسن
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: (_, notificationId) => {
      // تحديث فوري للكاش
      queryClient.setQueryData(
        ['/api/notifications', currentUser?.id],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            notifications: oldData.notifications.filter((notif: Notification) => notif.id !== notificationId)
          };
        }
      );
      
      toast({
        title: "تم حذف الإشعار",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في حذف الإشعار",
        variant: "destructive"
      });
    }
  });

  // تحديث الإشعارات يدوياً
  const handleRefresh = useCallback(() => {
    setLastChecked(Date.now());
    refetch();
  }, [refetch]);

  const notifications = notificationsData?.notifications || [];
  const unreadCount = unreadCountData?.count || 0;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
      case 'friend':
        return <Users className="w-4 h-4" />;
      case 'system':
        return <Bell className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'الآن';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} دقيقة`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ساعة`;
    return `${Math.floor(diffInSeconds / 86400)} يوم`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              الإشعارات
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              🔄
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد إشعارات</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border rounded-lg transition-colors ${
                    notification.isRead 
                      ? 'bg-muted/50 border-muted' 
                      : 'bg-primary/5 border-primary/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      <div className={`p-1 rounded ${
                        notification.isRead ? 'text-muted-foreground' : 'text-primary'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                          disabled={markAsReadMutation.isPending}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotificationMutation.mutate(notification.id)}
                        disabled={deleteNotificationMutation.isPending}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="flex-1"
            >
              تحديد الكل كمقروء
            </Button>
          )}
          <Button onClick={onClose} className="flex-1">
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}