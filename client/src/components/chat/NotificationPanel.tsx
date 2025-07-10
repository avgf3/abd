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

interface AdminNotification {
  id: number;
  type: 'admin_announcement' | 'moderation_alert' | 'system_update';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  fromAdmin: ChatUser;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
}

export default function NotificationPanel({ isOpen, onClose, currentUser }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const { toast } = useToast();

  // إشعارات المشرفين فقط
  useEffect(() => {
    if (isOpen) {
      const adminNotifications: AdminNotification[] = [
        {
          id: 1,
          type: 'admin_announcement',
          title: '📢 إعلان من الإدارة',
          message: 'مرحباً بكم في الدردشة العربية، يرجى الالتزام بقوانين المحادثة واحترام جميع المستخدمين',
          timestamp: new Date(Date.now() - 3600000), // ساعة مضت
          isRead: false,
          fromAdmin: {
            id: 1,
            username: 'عبود',
            userType: 'owner',
            isOnline: true
          }
        },
        {
          id: 2,
          type: 'moderation_alert',
          title: '⚠️ تنبيه إداري',
          message: 'تذكير: استخدام اللغة المهذبة مطلوب في جميع المحادثات. المخالفات ستؤدي للطرد',
          timestamp: new Date(Date.now() - 7200000), // ساعتان مضتا
          isRead: true,
          fromAdmin: {
            id: 1,
            username: 'عبود',
            userType: 'owner',
            isOnline: true
          }
        },
        {
          id: 3,
          type: 'system_update',
          title: '🔧 تحديث النظام',
          message: 'تم إضافة ميزات جديدة للدردشة وتحسين الأمان. استمتعوا بالتجربة المحدثة!',
          timestamp: new Date(Date.now() - 86400000), // يوم مضى
          isRead: true,
          fromAdmin: {
            id: 1,
            username: 'عبود',
            userType: 'owner',
            isOnline: true
          }
        }
      ];
      setNotifications(adminNotifications);
    }
  }, [isOpen]);

  const formatTime = (timestamp: Date) => {
    const now = Date.now();
    const diff = now - timestamp.getTime();
    
    if (diff < 60000) return 'الآن';
    if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`;
    return `منذ ${Math.floor(diff / 86400000)} يوم`;
  };

  const markAsRead = (notificationId: number) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📢 إشعارات الإدارة
            <Badge variant="secondary">
              {notifications.filter(n => !n.isRead).length}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            تنبيهات وإعلانات من فريق الإدارة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">📭</div>
              <p>لا توجد إشعارات إدارية حالياً</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`border rounded-lg p-4 space-y-3 transition-colors cursor-pointer ${
                  !notification.isRead 
                    ? 'bg-yellow-50 border-yellow-200 shadow-sm' 
                    : 'bg-gray-50 border-gray-200'
                }`}
                onClick={() => !notification.isRead && markAsRead(notification.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                      👑
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-blue-800">
                        {notification.fromAdmin.username} - {notification.fromAdmin.userType === 'owner' ? 'المالك' : 'مشرف'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTime(notification.timestamp)}
                      </div>
                    </div>
                  </div>
                  {!notification.isRead && (
                    <Badge variant="default" className="text-xs bg-red-500">
                      جديد
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="font-medium text-sm text-gray-800">
                    {notification.title}
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {notification.message}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline" className="w-full">
            ✖️ إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}