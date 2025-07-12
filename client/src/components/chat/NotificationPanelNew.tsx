import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onRefresh: () => void;
}

export default function NotificationPanel({ notifications, onClose, onRefresh }: NotificationPanelProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const markAsRead = async (notificationId: number) => {
    try {
      await apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });
      onRefresh();
    } catch (error) {
      console.error('خطأ في تحديث الإشعار:', error);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      await apiRequest('/api/notifications/mark-all-read', {
        method: 'PATCH'
      });
      onRefresh();
      toast({
        title: "تم بنجاح",
        description: "تم تحديد جميع الإشعارات كمقروءة",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث الإشعارات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friendRequest': return '👥';
      case 'friendAccepted': return '✅';
      case 'privateMessage': return '💬';
      case 'promotion': return '⭐';
      case 'moderation': return '⚠️';
      default: return '🔔';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'منذ قليل';
    } else if (diffInHours < 24) {
      return `منذ ${Math.floor(diffInHours)} ساعة`;
    } else {
      return format(date, 'dd MMM yyyy', { locale: ar });
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="h-full bg-gray-800 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">🔔 الإشعارات</h2>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount}</Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>

      {/* Actions */}
      {unreadCount > 0 && (
        <div className="p-4 border-b border-gray-700">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={markAllAsRead}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'جاري التحديث...' : 'تحديد الكل كمقروء'}
          </Button>
        </div>
      )}

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <div className="text-4xl mb-4">🔔</div>
            <p>لا توجد إشعارات</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  notification.isRead 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-blue-600 border-blue-500'
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm mb-1">
                      {notification.title}
                    </div>
                    <div className="text-sm text-gray-300 break-words">
                      {notification.message}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      {formatDate(notification.createdAt)}
                    </div>
                  </div>

                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-1"></div>
                  )}
                </div>

                {/* Action buttons for friend requests */}
                {notification.type === 'friendRequest' && notification.data && (
                  <div className="mt-3 flex gap-2">
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle accept friend request
                      }}
                    >
                      قبول
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle decline friend request
                      }}
                    >
                      رفض
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}