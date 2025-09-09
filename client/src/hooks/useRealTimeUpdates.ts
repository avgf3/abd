import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

/**
 * Hook لإدارة التحديثات الفورية للواجهة
 */
export function useRealTimeUpdates(currentUserId?: number) {
  const queryClient = useQueryClient();
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  const forceRefreshAll = useCallback(() => {
    if (!currentUserId) return;

    // إلغاء التحديث السابق إذا كان موجوداً
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // تحديث فوري لجميع البيانات المهمة
    const updateQueries = async () => {
      const queries = [
        ['/api/notifications', currentUserId],
        ['/api/notifications/unread-count', currentUserId],
        ['/api/friends', currentUserId],
        ['/api/messages/public'],
      ];

      // إبطال جميع الاستعلامات
      for (const queryKey of queries) {
        await queryClient.invalidateQueries({ queryKey });
      }

      // إعادة جلب البيانات فوراً
      for (const queryKey of queries) {
        queryClient.refetchQueries({ queryKey });
      }
    };

    // تأخير بسيط لضمان اكتمال العملية على الخادم
    updateTimeoutRef.current = setTimeout(updateQueries, 100);
  }, [currentUserId, queryClient]);

  const updateNotifications = useCallback(() => {
    if (!currentUserId) return;

    queryClient.invalidateQueries({
      queryKey: ['/api/notifications', currentUserId],
    });
    queryClient.invalidateQueries({
      queryKey: ['/api/notifications/unread-count', currentUserId],
    });
  }, [currentUserId, queryClient]);

  const updateFriends = useCallback(() => {
    if (!currentUserId) return;

    queryClient.invalidateQueries({
      queryKey: ['/api/friends', currentUserId],
    });
    queryClient.invalidateQueries({
      // تم تعطيل طلبات الصداقة
      queryKey: ['__disabled_friend_requests_incoming__', currentUserId],
    });
    queryClient.invalidateQueries({
      // تم تعطيل طلبات الصداقة
      queryKey: ['__disabled_friend_requests_outgoing__', currentUserId],
    });
  }, [currentUserId, queryClient]);

  const updateMessages = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['/api/messages/public'],
    });
  }, [queryClient]);

  return {
    forceRefreshAll,
    updateNotifications,
    updateFriends,
    updateMessages,
  };
}
