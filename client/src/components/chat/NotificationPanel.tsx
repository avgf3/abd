import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ChatUser } from '@/types/chat';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
}

export default function NotificationPanel({ isOpen, onClose, currentUser }: NotificationPanelProps) {
  const [notifications] = useState([
    {
      id: 1,
      type: 'friend_request',
      title: 'طلب صداقة جديد',
      message: 'أحمد أرسل لك طلب صداقة',
      timestamp: new Date(),
      read: false
    },
    {
      id: 2,
      type: 'promotion',
      title: 'ترقية في المنصة',
      message: 'تم ترقيتك إلى مشرف!',
      timestamp: new Date(Date.now() - 3600000),
      read: true
    }
  ]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request': return '👥';
      case 'promotion': return '⭐';
      case 'message': return '💬';
      case 'warning': return '⚠️';
      default: return '🔔';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">🔔 الإشعارات</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400">لا توجد إشعارات جديدة</div>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-3 rounded-lg border-r-4 ${
                    notification.read 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-blue-900/50 border-blue-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{notification.title}</div>
                      <div className="text-gray-300 text-sm mt-1">{notification.message}</div>
                      <div className="text-xs text-gray-500 mt-2">
                        {notification.timestamp.toLocaleString('ar-SA')}
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={onClose}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              إغلاق
            </Button>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              تعيين الكل كمقروء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}