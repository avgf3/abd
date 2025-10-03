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
    // تجنب عرض رسالة الترحيب أكثر من مرة في نفس الجلسة
    if (hasShownWelcome.current) return;
    
    // إشعار ترحيب بالمستخدم الجديد (فقط عند الدخول الأول)
    if (user.userType === 'guest') {
      toast({
        title: '🎉 أهلاً وسهلاً',
        description: `مرحباً بك ${user.username} كضيف في منصة الدردشة العربية!`,
        duration: 5000,
      });
      hasShownWelcome.current = true;
    } else if (user.userType === 'member') {
      toast({
        title: '🌟 مرحباً بعودتك',
        description: `أهلاً بك ${user.username}! اطلع على الرسائل الجديدة والأصدقاء المتصلين`,
        duration: 5000,
      });
      hasShownWelcome.current = true;
    }

    // طلب إذن للإشعارات (فقط مرة واحدة)
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
  }, [user.id, toast]); // تغيير dependency إلى user.id بدلاً من user كاملاً

  return null;
}
