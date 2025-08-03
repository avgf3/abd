import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface FriendRequestBadgeProps {
  currentUser: ChatUser | null;
}

export default function FriendRequestBadge({ currentUser }: FriendRequestBadgeProps) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (currentUser) {
      fetchPendingRequests();
      
      // تحديث العداد كل 30 ثانية
      const interval = setInterval(fetchPendingRequests, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const fetchPendingRequests = async () => {
    if (!currentUser) return;
    
    try {
      const response = await apiRequest(`/api/friend-requests/${currentUser.id}`, { method: 'GET' });
      const incoming = response.incoming || [];
      setPendingCount(incoming.length);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      setPendingCount(0);
    }
  };

  if (pendingCount === 0) return null;

  return (
    <Badge 
      className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full"
    >
      {pendingCount > 9 ? '9+' : pendingCount}
    </Badge>
  );
}