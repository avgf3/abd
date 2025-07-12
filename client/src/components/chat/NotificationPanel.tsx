import { useState, useEffect } from 'react';
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
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
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
  const { forceRefreshAll, updateNotifications, updateFriends } = useRealTimeUpdates(currentUser?.id);

  // جلب الإشعارات الحقيقية من قاعدة البيانات
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['/api/notifications', currentUser?.id],
    enabled: !!currentUser?.id && isOpen,
    refetchInterval: 3000 // تحديث كل 3 ثوان
  });

  // جلب عدد الإشعارات غير المقروءة
  const { data: unreadCountData } = useQuery({
    queryKey: ['/api/notifications/unread-count', currentUser?.id],
    enabled: !!currentUser?.id,
    refetchInterval: 2000 // تحديث كل ثانيتين
  });

  // معالج الأحداث للتحديث الفوري عند استلام طلبات الصداقة
  useEffect(() => {
    const handleFriendRequestReceived = () => {
      updateNotifications();
      forceRefreshAll();
    };

    const handleFriendRequestAccepted = () => {
      updateFriends();
      updateNotifications();
    };

    // إضافة مستمعي الأحداث
    window.addEventListener('friendRequestReceived', handleFriendRequestReceived);
    window.addEventListener('friendRequestAccepted', handleFriendRequestAccepted);

    // تنظيف المستمعين عند إلغاء تحميل المكون
    return () => {
      window.removeEventListener('friendRequestReceived', handleFriendRequestReceived);
      window.removeEventListener('friendRequestAccepted', handleFriendRequestAccepted);
    };
  }, [updateNotifications, updateFriends, forceRefreshAll]);

  // تحديد إشعار كمقروء
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/notifications', currentUser?.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/notifications/unread-count', currentUser?.id]
      });
    }
  });

  // تحديد جميع الإشعارات كمقروءة
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/notifications/user/${currentUser?.id}/read-all`, {
        method: 'PUT'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/notifications', currentUser?.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/notifications/unread-count', currentUser?.id]
      });
      toast({
        title: "تم بنجاح",
        description: "تم تحديد جميع الإشعارات كمقروءة",
      });
    }
  });

  // حذف إشعار
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/notifications', currentUser?.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/notifications/unread-count', currentUser?.id]
      });
    }
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = unreadCountData?.count || 0;

  const formatTime = (timestamp: string) => {
    const now = Date.now();
    const notificationTime = new Date(timestamp).getTime();
    const diff = now - notificationTime;
    
    if (diff < 60000) return 'الآن';
    if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`;
    return `منذ ${Math.floor(diff / 86400000)} يوم`;
  };

  const markAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const deleteNotification = (notificationId: number) => {
    deleteNotificationMutation.mutate(notificationId);
  };

  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  // معالجات طلبات الصداقة
  const handleAcceptFriendRequest = async (notification: Notification) => {
    try {
      const requestId = notification.data?.requestId;
      if (!requestId) return;

      await apiRequest(`/api/friend-requests/${requestId}/accept`, {
        method: 'POST',
        body: { userId: currentUser?.id }
      });

      // تحديد الإشعار كمقروء وحذفه بعد القبول
      deleteNotification(notification.id);
      
      // تحديث فوري للبيانات
      forceRefreshAll();

      toast({
        title: "تم قبول طلب الصداقة ✅",
        description: `تمت إضافة ${notification.data?.senderName} كصديق`,
        variant: "default"
      });

    } catch (error) {
      toast({
        title: "خطأ ❌",
        description: "فشل في قبول طلب الصداقة",
        variant: "destructive"
      });
    }
  };

  const handleDeclineFriendRequest = async (notification: Notification) => {
    try {
      const requestId = notification.data?.requestId;
      if (!requestId) return;

      await apiRequest(`/api/friend-requests/${requestId}/decline`, {
        method: 'POST',
        body: { userId: currentUser?.id }
      });

      // تحديد الإشعار كمقروء وحذفه
      deleteNotification(notification.id);
      
      // تحديث فوري للبيانات
      forceRefreshAll();

      toast({
        title: "تم رفض طلب الصداقة",
        description: `تم رفض طلب صداقة ${notification.data?.senderName}`,
        variant: "default"
      });

    } catch (error) {
      toast({
        title: "خطأ ❌",
        description: "فشل في رفض طلب الصداقة",
        variant: "destructive"
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friendRequest':
        return '👫';
      case 'message':
        return '💬';
      case 'moderation':
        return '🛡️';
      case 'promotion':
        return '⭐';
      case 'system':
        return '🔔';
      default:
        return '📢';
    }
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'friendRequest':
        return 'bg-blue-500';
      case 'message':
        return 'bg-green-500';
      case 'moderation':
        return 'bg-red-500';
      case 'promotion':
        return 'bg-yellow-500';
      case 'system':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full bg-white text-black rounded-lg shadow-xl border-2 border-gray-200" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center justify-between text-lg font-bold text-gray-800">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              الإشعارات
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white px-2 py-1 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              جاري تحميل الإشعارات...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>لا توجد إشعارات</p>
            </div>
          ) : (
            notifications.map((notification: Notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-all duration-200 ${
                  notification.isRead 
                    ? 'bg-gray-50 border-gray-200' 
                    : 'bg-blue-50 border-blue-200 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${getNotificationTypeColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-col">
                    {/* أزرار خاصة بطلبات الصداقة الجديدة فقط */}
                    {notification.type === 'friendRequest' && notification.data?.requestId && !notification.isRead && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptFriendRequest(notification)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs"
                        >
                          ✓ قبول
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeclineFriendRequest(notification)}
                          className="border-red-300 text-red-600 hover:bg-red-50 px-3 py-1 text-xs"
                        >
                          ✗ رفض
                        </Button>
                      </div>
                    )}
                    
                    {/* الأزرار العادية */}
                    <div className="flex gap-1 mt-1">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="تحديد كمقروء"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            إغلاق
          </Button>
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              تحديد الكل كمقروء
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}