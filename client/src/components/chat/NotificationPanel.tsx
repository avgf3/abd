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

interface SystemMessage {
  id: number;
  type: 'welcome' | 'rules' | 'system_info';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
}

export default function NotificationPanel({ isOpen, onClose, currentUser }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<SystemMessage[]>([]);
  const { toast } = useToast();

  // رسائل النظام للمستخدمين الجدد
  useEffect(() => {
    if (isOpen) {
      const systemMessages: SystemMessage[] = [
        {
          id: 1,
          type: 'welcome',
          title: '🌟 مرحباً بك في الدردشة العربية',
          message: 'أهلاً وسهلاً بك في منصة الدردشة العربية! نحن سعداء بانضمامك إلينا. هنا يمكنك التواصل مع الأصدقاء، إرسال الرسائل الخاصة، وإضافة أصدقاء جدد. استمتع بتجربة دردشة آمنة ومريحة.',
          timestamp: new Date(),
          isRead: false
        },
        {
          id: 2,
          type: 'rules',
          title: '📋 قوانين المحادثة',
          message: 'يرجى الالتزام بالقوانين التالية: استخدام اللغة المهذبة، احترام جميع المستخدمين، عدم إرسال محتوى غير لائق، عدم التنمر أو المضايقة. نشكركم لتعاونكم في جعل هذا المكان آمناً للجميع.',
          timestamp: new Date(Date.now() - 60000), // دقيقة مضت
          isRead: false
        }
      ];
      setNotifications(systemMessages);
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

  const markAsRead = (messageId: number) => {
    setNotifications(prev => 
      prev.map(message => 
        message.id === messageId 
          ? { ...message, isRead: true }
          : message
      )
    );
  };



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔔 رسائل النظام
            <Badge variant="secondary">
              {notifications.filter(n => !n.isRead).length}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            رسائل ترحيبية ومعلومات مهمة للمستخدمين الجدد
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">📭</div>
              <p>لا توجد رسائل نظام حالياً</p>
            </div>
          ) : (
            notifications.map((message) => (
              <div 
                key={message.id} 
                className={`border rounded-lg p-4 space-y-3 transition-colors cursor-pointer ${
                  !message.isRead 
                    ? 'bg-blue-50 border-blue-200 shadow-sm' 
                    : 'bg-gray-50 border-gray-200'
                }`}
                onClick={() => !message.isRead && markAsRead(message.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      🤖
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-blue-800">
                        نظام الدردشة
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                  {!message.isRead && (
                    <Badge variant="default" className="text-xs bg-blue-500">
                      جديد
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="font-medium text-sm text-gray-800">
                    {message.title}
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {message.message}
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