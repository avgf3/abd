import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import ProfileImage from './ProfileImage';
import type { ChatUser } from '@/types/chat';

interface FriendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
}

export default function FriendsPanel({ isOpen, onClose, currentUser }: FriendsPanelProps) {
  const [friends, setFriends] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && currentUser) {
      fetchFriends();
    }
  }, [isOpen, currentUser]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/api/friends/${currentUser?.id}`);
      setFriends(data.friends || []);
    } catch (error) {
      console.error('خطأ في جلب الأصدقاء:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId: number) => {
    try {
      await apiRequest('/api/friends/remove', {
        method: 'DELETE',
        body: {
          userId: currentUser?.id,
          friendId
        }
      });

      toast({
        title: "تم الحذف",
        description: "تم حذف الصديق من قائمتك",
      });

      fetchFriends();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">👥 قائمة الأصدقاء ({friends.length})</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-400">جاري التحميل...</div>
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400">لا توجد أصدقاء بعد</div>
              <div className="text-sm text-gray-500 mt-2">ابدأ بإضافة أصدقاء من قائمة المتصلين</div>
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                  <ProfileImage user={friend} size="small" />
                  
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      <span style={{ color: friend.usernameColor || '#ffffff' }}>
                        {friend.userType === 'owner' && '👑'}
                        {friend.userType === 'admin' && '⭐'}
                        {friend.userType === 'moderator' && '🛡️'}
                        {friend.username}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${friend.isOnline ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                      {friend.isOnline ? 'متصل الآن' : 'غير متصل'}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-xs"
                    >
                      💬
                    </Button>
                    <Button
                      onClick={() => handleRemoveFriend(friend.id)}
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white text-xs"
                    >
                      ❌
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={onClose} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}