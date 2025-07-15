import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import ProfileImage from './ProfileImage';
import type { ChatUser } from '@/types/chat';

interface Friend extends ChatUser {
  status: 'online' | 'offline' | 'away';
}

interface FriendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
  onlineUsers: ChatUser[];
  onStartPrivateChat: (friend: ChatUser) => void;
}

export default function FriendsPanel({ 
  isOpen, 
  onClose, 
  currentUser, 
  onlineUsers,
  onStartPrivateChat 
}: FriendsPanelProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { updateFriends } = useRealTimeUpdates(currentUser?.id);

  useEffect(() => {
    if (isOpen && currentUser) {
      fetchFriends();
    }
  }, [isOpen, currentUser]);

  const fetchFriends = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const response = await apiRequest(`/api/friends/${currentUser.id}`);
      if (response && Array.isArray(response.friends)) {
        const updatedFriends = response.friends.map((friend: any) => ({
          ...friend,
          status: onlineUsers.find(u => u.id === friend.id) ? 'online' : 'offline'
        }));
        setFriends(updatedFriends);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  // تحديث قائمة الأصدقاء عند تغيير المستخدمين المتصلين
  useEffect(() => {
    if (friends.length > 0) {
      setFriends(prev => prev.map(friend => ({
        ...friend,
        status: onlineUsers.find(u => u.id === friend.id) ? 'online' : 'offline'
      })));
    }
  }, [onlineUsers]);

  // معالج الأحداث للتحديث الفوري عند قبول طلبات الصداقة
  useEffect(() => {
    const handleFriendRequestAccepted = () => {
      // إعادة جلب قائمة الأصدقاء فوراً
      if (isOpen && currentUser) {
        fetchFriends();
      }
    };

    window.addEventListener('friendRequestAccepted', handleFriendRequestAccepted);
    
    return () => {
      window.removeEventListener('friendRequestAccepted', handleFriendRequestAccepted);
    };
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleStartChat = (friend: ChatUser) => {
    onStartPrivateChat(friend);
    onClose();
  };

  const filteredFriends = friends.filter(friend => 
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            👥 الأصدقاء
            <Badge variant="secondary">
              {friends.length}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            قائمة أصدقائك والمحادثات الخاصة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="البحث عن صديق..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                جاري تحميل الأصدقاء...
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد أصدقاء حتى الآن'}
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="relative">
                    <ProfileImage
                      imageUrl={friend.profileImage || '/default_avatar.svg'}
                      username={friend.username}
                      size="medium"
                      className="w-12 h-12"
                    />
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(friend.status)}`}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {friend.userType === 'owner' && <span>👑</span>}
                      {friend.userType === 'admin' && <span>⭐</span>}
                      {friend.userType === 'moderator' && <span>🛡️</span>}
                      <h3 
                        className="font-medium truncate"
                        style={{ color: friend.usernameColor || '#000' }}
                      >
                        {friend.username}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500">
                      {friend.status === 'online' ? 'متصل الآن' : 'غير متصل'}
                    </p>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStartChat(friend)}
                    className="shrink-0"
                  >
                    💬 محادثة
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}