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
import ProfileImage from './ProfileImage';
import FriendRequestsPanel from './FriendRequestsPanel';
import type { ChatUser } from '@/types/chat';

interface Friend extends ChatUser {
  status: 'online' | 'offline' | 'away';
  lastMessage?: string;
  unreadCount?: number;
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
  const [activeTab, setActiveTab] = useState<'all' | 'online' | 'requests'>('all');
  const [friendRequests, setFriendRequests] = useState({ incoming: [], outgoing: [] });
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // جلب قائمة الأصدقاء الحقيقية
  useEffect(() => {
    if (isOpen && currentUser) {
      fetchFriends();
      fetchFriendRequests();
    }
  }, [isOpen, currentUser]);

  // تحديث حالة الاتصال للأصدقاء
  useEffect(() => {
    if (friends.length > 0) {
      setFriends(prev => 
        prev.map(friend => {
          const onlineUser = onlineUsers.find(u => u.id === friend.id);
          return {
            ...friend,
            isOnline: !!onlineUser,
            status: onlineUser ? 'online' : 'offline'
          };
        })
      );
    }
  }, [onlineUsers, friends.length]);

  const fetchFriends = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const response = await apiRequest(`/api/friends/${currentUser.id}`);
      const friendsData = response.friends || [];
      
      // تحويل البيانات إلى تنسيق Friend
      const formattedFriends: Friend[] = friendsData.map((friend: ChatUser) => ({
        ...friend,
        status: onlineUsers.find(u => u.id === friend.id) ? 'online' : 'offline',
        lastMessage: '', // سيتم جلبها من الرسائل الخاصة
        unreadCount: 0   // سيتم حسابها لاحقاً
      }));
      
      setFriends(formattedFriends);
    } catch (error) {
      console.error('Error fetching friends:', error);
      // في حالة الخطأ، نعرض قائمة فارغة
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendRequests = async () => {
    if (!currentUser) return;
    
    try {
      const [incomingResponse, outgoingResponse] = await Promise.all([
        apiRequest(`/api/friend-requests/incoming/${currentUser.id}`),
        apiRequest(`/api/friend-requests/outgoing/${currentUser.id}`)
      ]);
      
      setFriendRequests({
        incoming: incomingResponse.requests || [],
        outgoing: outgoingResponse.requests || []
      });
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      setFriendRequests({ incoming: [], outgoing: [] });
    }
  };

  const handleAddFriend = async (friendId: number) => {
    if (!currentUser) return;
    
    try {
      await apiRequest('/api/friend-requests', {
        method: 'POST',
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: friendId
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      toast({
        title: 'تم إرسال الطلب',
        description: 'تم إرسال طلب الصداقة بنجاح',
        variant: 'default'
      });
      
      fetchFriendRequests(); // تحديث طلبات الصداقة
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في إرسال طلب الصداقة',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveFriend = async (friendId: number) => {
    if (!currentUser) return;
    
    try {
      await apiRequest(`/api/friends/${currentUser.id}/${friendId}`, {
        method: 'DELETE'
      });
      
      toast({
        title: 'تم الحذف',
        description: 'تم حذف الصديق من قائمتك',
        variant: 'default'
      });
      
      // إزالة الصديق من القائمة فوراً
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الصديق',
        variant: 'destructive'
      });
    }
  };

  const filteredFriends = friends.filter(friend => {
    const matchesSearch = friend.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'online' && friend.isOnline) ||
      (activeTab === 'requests' && false); // لا توجد طلبات صداقة في هذا المثال

    return matchesSearch && matchesTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const formatLastSeen = (lastSeen?: Date) => {
    if (!lastSeen) return '';
    
    const now = Date.now();
    const diff = now - lastSeen.getTime();
    
    if (diff < 60000) return 'منذ لحظات';
    if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`;
    return `منذ ${Math.floor(diff / 86400000)} يوم`;
  };



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[700px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            👥 الأصدقاء
            <Badge variant="secondary">
              {friends.length}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            إدارة قائمة الأصدقاء والرسائل الخاصة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* البحث */}
          <Input
            placeholder="البحث عن صديق..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />

          {/* التبويبات */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('all')}
            >
              الكل ({friends.length})
            </Button>
            <Button
              variant={activeTab === 'online' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('online')}
            >
              متصل ({friends.filter(f => f.isOnline).length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFriendRequests(true)}
              className="relative"
            >
              الطلبات ({friendRequests.incoming.length})
              {friendRequests.incoming.length > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs">
                  {friendRequests.incoming.length}
                </Badge>
              )}
            </Button>
          </div>

          {/* قائمة الأصدقاء */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredFriends.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد أصدقاء'}
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <div key={friend.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <ProfileImage 
                          user={friend} 
                          size="small" 
                        />
                        <div 
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(friend.status)}`}
                        />
                      </div>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {friend.username}
                          {friend.unreadCount && friend.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {friend.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {friend.isOnline ? (
                            friend.status === 'away' ? 'بعيد' : 'متصل'
                          ) : (
                            formatLastSeen(friend.lastSeen)
                          )}
                        </div>
                        {friend.lastMessage && (
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">
                            {friend.lastMessage}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => {
                          onStartPrivateChat(friend);
                          onClose();
                        }}
                      >
                        💬
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveFriend(friend.id)}
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
      
      {/* نافذة طلبات الصداقة */}
      <FriendRequestsPanel
        isOpen={showFriendRequests}
        onClose={() => setShowFriendRequests(false)}
        currentUser={currentUser}
      />
    </Dialog>
  );
}