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
import type { ChatUser } from '@/types/chat';

interface Notification {
  id: number;
  type: 'friend_request' | 'message' | 'report';
  fromUser: ChatUser;
  content: string;
  timestamp: number;
  read: boolean;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
}

export default function NotificationPanel({ isOpen, onClose, currentUser }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();

  // محاكاة إشعارات تجريبية
  useEffect(() => {
    if (isOpen && currentUser) {
      const mockNotifications: Notification[] = [
        {
          id: 1,
          type: 'friend_request',
          fromUser: {
            id: 100,
            username: 'أحمد',
            userType: 'member',
            isOnline: true,
            profileImage: '/default_avatar.svg'
          },
          content: 'أرسل لك طلب صداقة',
          timestamp: Date.now() - 3600000, // ساعة مضت
          read: false
        },
        {
          id: 2,
          type: 'message',
          fromUser: {
            id: 101,
            username: 'فاطمة',
            userType: 'member',
            isOnline: false,
            profileImage: '/default_avatar.svg'
          },
          content: 'أرسلت لك رسالة خاصة',
          timestamp: Date.now() - 1800000, // نصف ساعة مضت
          read: false
        }
      ];
      setNotifications(mockNotifications);
    }
  }, [isOpen, currentUser]);

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'الآن';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ساعة`;
    return `${Math.floor(diff / 86400000)} يوم`;
  };

  const handleAcceptFriend = async (notificationId: number, friendId: number) => {
    try {
      // محاكاة قبول طلب الصداقة
      toast({
        title: 'تم',
        description: 'تم قبول طلب الصداقة بنجاح',
        variant: 'default'
      });
      
      // إزالة الإشعار
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في قبول طلب الصداقة',
        variant: 'destructive'
      });
    }
  };

  const handleRejectFriend = async (notificationId: number) => {
    try {
      // محاكاة رفض طلب الصداقة
      toast({
        title: 'تم',
        description: 'تم رفض طلب الصداقة',
        variant: 'default'
      });
      
      // إزالة الإشعار
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في رفض طلب الصداقة',
        variant: 'destructive'
      });
    }
  };

  const markAsRead = (notificationId: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request': return '👥';
      case 'message': return '💬';
      case 'report': return '🚨';
      default: return '🔔';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔔 الإشعارات
            {notifications.filter(n => !n.read).length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {notifications.filter(n => !n.read).length}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            إشعارات الرسائل وطلبات الصداقة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              لا توجد إشعارات جديدة
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id}
                className={`border rounded-lg p-4 space-y-3 ${
                  notification.read ? 'bg-gray-50' : 'bg-blue-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div>
                      <div className="font-semibold">
                        {notification.fromUser.username}
                      </div>
                      <div className="text-sm text-gray-600">
                        {notification.content}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTime(notification.timestamp)}
                  </div>
                </div>

                {notification.type === 'friend_request' && !notification.read && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptFriend(notification.id, notification.fromUser.id)}
                    >
                      قبول
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectFriend(notification.id)}
                    >
                      رفض
                    </Button>
                  </div>
                )}

                {notification.type === 'message' && !notification.read && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        markAsRead(notification.id);
                        toast({
                          title: 'تم',
                          description: 'تم فتح الرسالة',
                          variant: 'default'
                        });
                      }}
                    >
                      فتح الرسالة
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsRead(notification.id)}
                    >
                      تجاهل
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
          <Button onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}>
            تحديد الكل كمقروء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}