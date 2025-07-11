import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface FriendRequestBadgeProps {
  currentUser: ChatUser | null;
  onClick: () => void;
}

export default function FriendRequestBadge({ currentUser, onClick }: FriendRequestBadgeProps) {
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    if (currentUser) {
      fetchRequestCount();
    }
  }, [currentUser]);

  const fetchRequestCount = async () => {
    try {
      const data = await apiRequest(`/api/friends/requests/incoming/${currentUser?.id}`);
      setRequestCount(data.requests?.length || 0);
    } catch (error) {
      console.error('خطأ في جلب طلبات الصداقة:', error);
    }
  };

  if (requestCount === 0) {
    return (
      <Button
        onClick={onClick}
        variant="outline"
        size="sm"
        className="border-gray-600 text-gray-300 hover:bg-gray-700"
      >
        👥 طلبات الصداقة
      </Button>
    );
  }

  return (
    <Button
      onClick={onClick}
      className="bg-blue-600 hover:bg-blue-700 relative"
      size="sm"
    >
      👥 طلبات الصداقة
      <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
        {requestCount > 9 ? '9+' : requestCount}
      </span>
    </Button>
  );
}