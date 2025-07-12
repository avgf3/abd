import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ModerationNotificationsProps {
  onMessage: (data: any) => void;
}

export default function ModerationNotifications({ onMessage }: ModerationNotificationsProps) {
  const { toast } = useToast();

  useEffect(() => {
    const handleModerationMessage = (data: any) => {
      const currentUserId = localStorage.getItem('currentUserId');
      if (!currentUserId) return;

      switch (data.type) {
        case 'userMuted':
          if (data.targetUserId === parseInt(currentUserId)) {
            toast({
              title: "🔇 تم كتمك",
              description: `تم كتمك من قبل ${data.moderatorName} لمدة ${data.duration} دقيقة - السبب: ${data.reason}`,
              variant: "destructive",
            });
          }
          break;

        case 'userUnmuted':
          if (data.targetUserId === parseInt(currentUserId)) {
            toast({
              title: "✅ تم إلغاء الكتم",
              description: `تم إلغاء كتمك من قبل ${data.moderatorName} - يمكنك الآن إرسال رسائل عامة`,
              variant: "default",
            });
          }
          break;

        case 'userKicked':
          if (data.targetUserId === parseInt(currentUserId)) {
            toast({
              title: "👋 تم طردك",
              description: `تم طردك من قبل ${data.moderatorName} لمدة ${data.duration} دقيقة - السبب: ${data.reason}`,
              variant: "destructive",
            });
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
          break;

        case 'userBanned':
          if (data.targetUserId === parseInt(currentUserId)) {
            toast({
              title: "🚫 تم حظرك",
              description: `تم حظرك نهائياً من قبل ${data.moderatorName} - السبب: ${data.reason}`,
              variant: "destructive",
            });
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
          break;

        case 'userBlocked':
          if (data.targetUserId === parseInt(currentUserId)) {
            toast({
              title: "🔒 تم حجبك",
              description: `تم حجبك من قبل ${data.moderatorName} - السبب: ${data.reason}`,
              variant: "destructive",
            });
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
          break;

        case 'userPromoted':
          if (data.targetUserId === parseInt(currentUserId)) {
            const roleNames: Record<string, string> = {
              admin: 'إدمن ⭐',
              moderator: 'مشرف 🛡️',
              member: 'عضو 🔵'
            };
            toast({
              title: "🎉 تم ترقيتك!",
              description: `تمت ترقيتك إلى ${roleNames[data.newRole]} من قبل ${data.moderatorName}`,
              variant: "default",
            });
          }
          break;
      }

      // تمرير الرسالة للمعالج الأساسي
      onMessage(data);
    };

    // إضافة مستمع الأحداث
    window.addEventListener('moderationMessage', (event: any) => {
      handleModerationMessage(event.detail);
    });

    return () => {
      window.removeEventListener('moderationMessage', handleModerationMessage);
    };
  }, [toast, onMessage]);

  return null; // هذا المكون لا يعرض شيئاً
}