import { useEffect, useRef } from 'react';

import { useToast } from '@/hooks/use-toast';
import type { ChatUser } from '@/types/chat';

interface WelcomeNotificationProps {
  user: ChatUser;
}

export default function WelcomeNotification({ user }: WelcomeNotificationProps) {
  const { toast } = useToast();
  const hasShownWelcome = useRef(false);

  useEffect(() => {
    // التأكد من عرض الرسالة مرة واحدة فقط
    if (hasShownWelcome.current) return;
    hasShownWelcome.current = true;

    // إشعار ترحيب بالمستخدم الجديد
    if (user.userType === 'guest') {
      toast({
        title: '🎉 أهلاً وسهلاً',
        description: `مرحباً بك ${user.username} كضيف في منصة الدردشة العربية!`,
        duration: 5000,
      });
    } else if (user.userType === 'member') {
      toast({
        title: '🌟 مرحباً بعودتك',
        description: `أهلاً بك ${user.username}! اطلع على الرسائل الجديدة والأصدقاء المتصلين`,
        duration: 5000,
      });
    }

    // طلب إذن للإشعارات
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification('مرحباً بك في الدردشة العربية! 💬', {
            body: 'ستحصل على إشعارات للرسائل الجديدة وطلبات الصداقة',
            icon: '/favicon.ico',
          });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
