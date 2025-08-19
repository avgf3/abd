import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, Check, Trash2, Users } from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNotificationManager } from '@/hooks/useNotificationManager';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import { formatTimeAgo } from '@/utils/timeUtils';

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
  const queryClient = useQueryClient();
  const [lastChecked, setLastChecked] = useState<number>(Date.now());
  const { showErrorToast, showSuccessToast } = useNotificationManager(currentUser);

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

  // Real-time notifications are now handled by useNotificationManager hook

  // تحديد إشعار كمقروء - محسن
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
    },
    onSuccess: (_data, variables) => {
      // تحديث فوري وذكي للكاش
      queryClient.setQueryData(
        ['/api/notifications', currentUser?.id],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            notifications: oldData.notifications.map((notif: Notification) =>
              notif.id === variables ? { ...notif, isRead: true } : notif
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
      showErrorToast("فشل في تحديد الإشعار كمقروء");
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
      
      showSuccessToast("تم تحديد جميع الإشعارات كمقروءة");
    },
    onError: () => {
      showErrorToast("فشل في تحديد الإشعارات كمقروءة");
    }
  });

  // تحديد جميع الإشعارات المرئية (بعد الاستبعاد/الفلترة) كمقروءة فقط
  const handleMarkAllVisibleAsRead = useCallback(async () => {
    const unreadVisible = filteredByType.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadVisible.length === 0) return;
    try {
      await Promise.all(
        unreadVisible.map((id) => apiRequest(`/api/notifications/${id}/read`, { method: 'PUT' }))
      );

      // تحديث الكاش محلياً
      queryClient.setQueryData(
        ['/api/notifications', currentUser?.id],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            notifications: oldData.notifications.map((notif: Notification) =>
              unreadVisible.includes(notif.id) ? { ...notif, isRead: true } : notif
            )
          };
        }
      );

      queryClient.setQueryData(
        ['/api/notifications/unread-count', currentUser?.id],
        (oldData: any) => {
          if (!oldData) return oldData;
          const next = Math.max(0, (oldData.count || 0) - unreadVisible.length);
          return { count: next };
        }
      );

      showSuccessToast("تم تحديد الإشعارات المرئية كمقروءة");
    } catch {
      showErrorToast("فشل في تحديد الإشعارات المرئية كمقروءة");
    }
  }, [filteredByType, queryClient, currentUser?.id, showSuccessToast, showErrorToast]);

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
      
      showSuccessToast("تم حذف الإشعار");
    },
    onError: () => {
      showErrorToast("فشل في حذف الإشعار");
    }
  });

  // تحديث الإشعارات يدوياً
  const handleRefresh = useCallback(() => {
    setLastChecked(Date.now());
    refetch();
  }, [refetch]);

  const notifications = notificationsData?.notifications || [];

  // استبعاد إشعارات الرسائل من التبويب + مرشّح حسب الفئة
  type FilterKey = 'all' | 'friends' | 'system' | 'rewards';
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const filteredByType = useMemo(() => {
    // استبعاد رسائل الخاص من العرض فقط
    const base = notifications.filter((n) => n.type !== 'message');
    if (activeFilter === 'all') return base;
    if (activeFilter === 'friends') {
      const friendTypes = new Set(['friend_request', 'friend_accepted', 'friend', 'friendRequest', 'friendAccepted']);
      return base.filter((n) => friendTypes.has(n.type));
    }
    if (activeFilter === 'system') {
      const systemTypes = new Set(['system', 'moderation', 'promotion']);
      return base.filter((n) => systemTypes.has(n.type));
    }
    if (activeFilter === 'rewards') {
      const rewardTypes = new Set(['points_received', 'daily_bonus', 'achievement', 'level_up']);
      return base.filter((n) => rewardTypes.has(n.type));
    }
    return base;
  }, [notifications, activeFilter]);

  // عدّاد غير المقروء الظاهر (بعد الاستبعاد/الفلترة) لعرضه في التبويب
  const displayUnreadCount = useMemo(() => filteredByType.filter((n) => !n.isRead).length, [filteredByType]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
      case 'friend':
      case 'friendRequest':
      case 'friendAccepted':
      case 'friend_accepted':
        return <Users className="w-4 h-4" />;
      case 'level_up':
        return <span className="text-base">🎉</span>;
      case 'points_received':
        return <span className="text-base">💰</span>;
      case 'daily_bonus':
        return <span className="text-base">🎁</span>;
      case 'achievement':
        return <span className="text-base">🏆</span>;
      case 'promotion':
        return <span className="text-base">⬆️</span>;
      case 'moderation':
        return <span className="text-base">⚠️</span>;
      // 'message' مستبعد من العرض
      case 'system':
        return <Bell className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  // تم حذف دالة formatTimeAgoLocal - نستخدم formatTimeAgo مباشرة من utils/timeUtils.ts

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              الإشعارات
              {displayUnreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {displayUnreadCount}
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

        {/* شريط المرشّحات البسيط */}
        <div className="px-2 pb-2">
          <div className="flex flex-wrap gap-2">
            <Button variant={activeFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setActiveFilter('all')}>الكل</Button>
            <Button variant={activeFilter === 'friends' ? 'default' : 'outline'} size="sm" onClick={() => setActiveFilter('friends')}>الأصدقاء</Button>
            <Button variant={activeFilter === 'system' ? 'default' : 'outline'} size="sm" onClick={() => setActiveFilter('system')}>النظام</Button>
            <Button variant={activeFilter === 'rewards' ? 'default' : 'outline'} size="sm" onClick={() => setActiveFilter('rewards')}>المكافآت</Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            </div>
          ) : filteredByType.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد إشعارات</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredByType.map((notification) => (
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
          {displayUnreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllVisibleAsRead}
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