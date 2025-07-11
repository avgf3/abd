import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import ProfileImage from '../chat/ProfileImage';
import type { ChatUser } from '@/types/chat';

interface FriendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser;
  onStartChat: (user: ChatUser) => void;
}

interface FriendRequest {
  id: number;
  senderId: number;
  receiverId: number;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  sender: {
    id: number;
    username: string;
    profileImage: string | null;
    userType: string;
  };
  receiver: {
    id: number;
    username: string;
    profileImage: string | null;
    userType: string;
  };
}

export default function FriendsPanel({ isOpen, onClose, currentUser, onStartChat }: FriendsPanelProps) {
  const [friends, setFriends] = useState<ChatUser[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  // تحميل البيانات عند فتح اللوحة
  useEffect(() => {
    if (isOpen && currentUser) {
      loadFriends();
      loadFriendRequests();
    }
  }, [isOpen, currentUser]);

  const loadFriends = async () => {
    try {
      const response = await apiRequest(`/api/friends/${currentUser.id}`);
      setFriends(response.friends || []);
    } catch (error) {
      console.error('خطأ في تحميل الأصدقاء:', error);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const [incomingRes, outgoingRes] = await Promise.all([
        apiRequest(`/api/friend-requests/incoming/${currentUser.id}`),
        apiRequest(`/api/friend-requests/outgoing/${currentUser.id}`)
      ]);
      
      setIncomingRequests(incomingRes.requests || []);
      setOutgoingRequests(outgoingRes.requests || []);
    } catch (error) {
      console.error('خطأ في تحميل طلبات الصداقة:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiRequest(`/api/users/search?q=${encodeURIComponent(searchQuery)}&userId=${currentUser.id}`);
      setSearchResults(response.users || []);
    } catch (error) {
      console.error('خطأ في البحث:', error);
      toast({
        title: "خطأ في البحث",
        description: "لم نتمكن من البحث عن المستخدمين",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (receiverId: number) => {
    try {
      await apiRequest('/api/friend-requests', {
        method: 'POST',
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: receiverId
        })
      });

      toast({
        title: "تم إرسال طلب الصداقة",
        description: "سيتم إشعار المستخدم بطلبك"
      });

      loadFriendRequests();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إرسال طلب الصداقة",
        variant: "destructive"
      });
    }
  };

  const respondToFriendRequest = async (requestId: number, action: 'accept' | 'decline') => {
    try {
      await apiRequest(`/api/friend-requests/${requestId}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ userId: currentUser.id })
      });

      toast({
        title: action === 'accept' ? "تم قبول طلب الصداقة" : "تم رفض طلب الصداقة",
        description: action === 'accept' ? "أصبحتما أصدقاء الآن" : "تم رفض الطلب"
      });

      loadFriendRequests();
      if (action === 'accept') {
        loadFriends();
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في الاستجابة لطلب الصداقة",
        variant: "destructive"
      });
    }
  };

  const cancelFriendRequest = async (requestId: number) => {
    try {
      await apiRequest(`/api/friend-requests/${requestId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ userId: currentUser.id })
      });

      toast({
        title: "تم إلغاء طلب الصداقة",
        description: "تم إلغاء الطلب بنجاح"
      });

      loadFriendRequests();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إلغاء طلب الصداقة",
        variant: "destructive"
      });
    }
  };

  const removeFriend = async (friendId: number) => {
    if (!confirm('هل أنت متأكد من إزالة هذا الصديق؟')) return;

    try {
      await apiRequest(`/api/friends/${currentUser.id}/${friendId}`, {
        method: 'DELETE'
      });

      toast({
        title: "تم إزالة الصديق",
        description: "تم إزالة الصديق من قائمتك"
      });

      loadFriends();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إزالة الصديق",
        variant: "destructive"
      });
    }
  };

  const getUserRankBadge = (userType: string, username: string) => {
    if (username === 'عبود') {
      return <span className="text-yellow-400">👑</span>;
    }
    
    switch (userType) {
      case 'owner':
        return <span className="text-yellow-400">👑</span>;
      case 'admin':
        return <span className="text-blue-400">⭐</span>;
      case 'moderator':
        return <span className="text-green-400">🛡️</span>;
      default:
        return null;
    }
  };

  const isRequestPending = (userId: number) => {
    return outgoingRequests.some(req => req.receiverId === userId && req.status === 'pending');
  };

  const isFriend = (userId: number) => {
    return friends.some(friend => friend.id === userId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white border border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            🤝 إدارة الأصدقاء
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-black/40">
            <TabsTrigger value="friends" className="data-[state=active]:bg-purple-600">
              الأصدقاء ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="incoming" className="data-[state=active]:bg-blue-600">
              طلبات واردة ({incomingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="data-[state=active]:bg-green-600">
              طلبات صادرة ({outgoingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-orange-600">
              البحث
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4">
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {friends.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    لا يوجد أصدقاء بعد
                  </div>
                ) : (
                  friends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <ProfileImage user={friend} size="small" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{friend.username}</span>
                            {getUserRankBadge(friend.userType, friend.username)}
                          </div>
                          <span className={`text-xs ${friend.isOnline ? 'text-green-400' : 'text-gray-400'}`}>
                            {friend.isOnline ? 'متصل' : 'غير متصل'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => onStartChat(friend)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 text-sm"
                        >
                          💬 رسالة
                        </Button>
                        <Button
                          onClick={() => removeFriend(friend.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 text-sm"
                        >
                          ❌ إزالة
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="incoming" className="mt-4">
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {incomingRequests.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    لا توجد طلبات صداقة واردة
                  </div>
                ) : (
                  incomingRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <ProfileImage user={request.sender} size="small" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{request.sender.username}</span>
                            {getUserRankBadge(request.sender.userType, request.sender.username)}
                          </div>
                          <span className="text-xs text-gray-400">
                            طلب صداقة منذ {new Date(request.createdAt).toLocaleDateString('ar')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => respondToFriendRequest(request.id, 'accept')}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 text-sm"
                        >
                          ✅ قبول
                        </Button>
                        <Button
                          onClick={() => respondToFriendRequest(request.id, 'decline')}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 text-sm"
                        >
                          ❌ رفض
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="outgoing" className="mt-4">
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {outgoingRequests.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    لا توجد طلبات صداقة صادرة
                  </div>
                ) : (
                  outgoingRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <ProfileImage user={request.receiver} size="small" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{request.receiver.username}</span>
                            {getUserRankBadge(request.receiver.userType, request.receiver.username)}
                          </div>
                          <span className="text-xs text-yellow-400">
                            في انتظار الرد منذ {new Date(request.createdAt).toLocaleDateString('ar')}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => cancelFriendRequest(request.id)}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 text-sm"
                      >
                        🚫 إلغاء
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="search" className="mt-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن مستخدمين..."
                  className="flex-1 bg-black/30 border-purple-500/30 text-white"
                  onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                />
                <Button
                  onClick={searchUsers}
                  disabled={isSearching || !searchQuery.trim()}
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  {isSearching ? '🔍' : '🔍 بحث'}
                </Button>
              </div>

              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {searchResults.length === 0 && searchQuery ? (
                    <div className="text-center text-gray-400 py-8">
                      لا توجد نتائج للبحث
                    </div>
                  ) : (
                    searchResults.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <ProfileImage user={user} size="small" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{user.username}</span>
                              {getUserRankBadge(user.userType, user.username)}
                            </div>
                            <span className={`text-xs ${user.isOnline ? 'text-green-400' : 'text-gray-400'}`}>
                              {user.isOnline ? 'متصل' : 'غير متصل'}
                            </span>
                          </div>
                        </div>
                        <div>
                          {user.id === currentUser.id ? (
                            <span className="text-gray-400 text-sm">هذا أنت</span>
                          ) : isFriend(user.id) ? (
                            <span className="text-green-400 text-sm">✅ صديق</span>
                          ) : isRequestPending(user.id) ? (
                            <span className="text-yellow-400 text-sm">⏳ مُرسل</span>
                          ) : (
                            <Button
                              onClick={() => sendFriendRequest(user.id)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 text-sm"
                            >
                              ➕ إضافة صديق
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}