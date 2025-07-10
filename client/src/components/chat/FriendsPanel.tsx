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
  onStartPrivateChat: (friend: ChatUser) => void;
}

export default function FriendsPanel({ 
  isOpen, 
  onClose, 
  currentUser, 
  onStartPrivateChat 
}: FriendsPanelProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'online' | 'requests'>('all');
  const { toast } = useToast();

  // محاكاة قائمة الأصدقاء
  useEffect(() => {
    if (isOpen && currentUser) {
      const mockFriends: Friend[] = [
        {
          id: 200,
          username: 'سارة',
          userType: 'member',
          isOnline: true,
          status: 'online',
          profileImage: '/default_avatar.svg',
          lastMessage: 'مرحبا كيف حالك؟',
          unreadCount: 2
        },
        {
          id: 201,
          username: 'محمد',
          userType: 'member',
          isOnline: false,
          status: 'offline',
          profileImage: '/default_avatar.svg',
          lastMessage: 'شكرا لك',
          lastSeen: new Date(Date.now() - 7200000) // ساعتان مضتا
        },
        {
          id: 202,
          username: 'نور',
          userType: 'member',
          isOnline: true,
          status: 'away',
          profileImage: '/default_avatar.svg',
          lastMessage: 'إلى اللقاء',
          unreadCount: 1
        }
      ];
      setFriends(mockFriends);
    }
  }, [isOpen, currentUser]);

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

  const handleRemoveFriend = async (friendId: number) => {
    try {
      setFriends(prev => prev.filter(f => f.id !== friendId));
      toast({
        title: 'تم',
        description: 'تم حذف الصديق من القائمة',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الصديق',
        variant: 'destructive'
      });
    }
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
              variant={activeTab === 'requests' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('requests')}
            >
              طلبات (0)
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
                        <img
                          src={friend.profileImage || '/default_avatar.svg'}
                          alt={friend.username}
                          className="w-10 h-10 rounded-full"
                        />
                        <div 
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(friend.status)}`}
                        />
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
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
    </Dialog>
  );
}