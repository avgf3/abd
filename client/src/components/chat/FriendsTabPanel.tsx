import { RefreshCw, Users, UserPlus, MessageCircle, Trash2, Check, X } from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef } from 'react';

import ProfileImage from './ProfileImage';
import SimpleUserMenu from './SimpleUserMenu';
import UserRoleBadge from './UserRoleBadge';

import type { Friend, FriendRequest } from '@/../../shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGrabScroll } from '@/hooks/useGrabScroll';
import { useNotificationManager } from '@/hooks/useNotificationManager';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import { getFinalUsernameColor, getUserListItemStyles, getUserListItemClasses } from '@/utils/themeUtils';
import { formatTimeAgo, getStatusColor } from '@/utils/timeUtils';


// Using shared types for Friend and FriendRequest

interface FriendsTabPanelProps {
  currentUser: ChatUser | null;
  onlineUsers: ChatUser[];
  onStartPrivateChat: (friend: ChatUser) => void;
}

export default function FriendsTabPanel({
  currentUser,
  onlineUsers,
  onStartPrivateChat
}: FriendsTabPanelProps) {
  const friendsScrollRef = useRef<HTMLDivElement>(null);
  useGrabScroll(friendsScrollRef);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [friendRequests, setFriendRequests] = useState<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>({
    incoming: [],
    outgoing: []
  });
  const [loading, setLoading] = useState(false);
  const { showErrorToast, showSuccessToast, updateFriendQueries } = useNotificationManager(currentUser);
  const [isAtBottomFriends, setIsAtBottomFriends] = useState(true);

  // دوال مساعدة لعرض الشارات والأعلام
  const renderUserBadge = useCallback((user: ChatUser) => {
    if (!user) return null;
    return <UserRoleBadge user={user} size={20} />;
  }, []);

  const getCountryEmoji = useCallback((country?: string): string | null => {
    if (!country) return null;
    const token = country.trim().split(' ')[0];
    return token || null;
  }, []);

  const renderCountryFlag = useCallback((user: ChatUser) => {
    const emoji = getCountryEmoji(user.country);
    const boxStyle: React.CSSProperties = {
      width: 20,
      height: 20,
      borderRadius: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      border: 'none'
    };

    if (emoji) {
      return (
        <span style={boxStyle} title={user.country}>
          <span style={{ fontSize: 14, lineHeight: 1 }}>{emoji}</span>
        </span>
      );
    }

    return (
      <span style={boxStyle} title="لم يتم تحديد الدولة">
        <span style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1 }}>?</span>
      </span>
    );
  }, [getCountryEmoji]);

  // التحقق من صلاحيات الإشراف
  const isModerator = currentUser && ['moderator', 'admin', 'owner'].includes(currentUser.userType);
  
  // مراقبة إشعارات طلبات الصداقة للتبديل التلقائي للطلبات
  useEffect(() => {
    const handleFriendRequestReceived = () => {
      // التبديل إلى تبويب الطلبات عند وصول طلب جديد
      setActiveTab('requests');
    };

    window.addEventListener('friendRequestReceived', handleFriendRequestReceived);
    
    return () => {
      window.removeEventListener('friendRequestReceived', handleFriendRequestReceived);
    };
  }, []);

  // جلب قائمة الأصدقاء
  const fetchFriends = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const data = await apiRequest(`/api/friends/${currentUser.id}`);
      if (data && Array.isArray((data as any).friends)) {
        setFriends((data as any).friends.map((friend: any) => ({
          ...friend,
          status: friend.isOnline ? 'online' : 'offline'
        })));
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      showErrorToast("فشل في جلب قائمة الأصدقاء");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // جلب طلبات الصداقة
  const fetchFriendRequests = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const [incoming, outgoing] = await Promise.all([
        apiRequest(`/api/friend-requests/incoming/${currentUser.id}`),
        apiRequest(`/api/friend-requests/outgoing/${currentUser.id}`)
      ]);
      
      setFriendRequests({
        incoming: (incoming as any)?.requests || [],
        outgoing: (outgoing as any)?.requests || []
      });
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      setFriendRequests({ incoming: [], outgoing: [] });
    }
  }, [currentUser]);

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

  // جلب البيانات عند التحميل
  useEffect(() => {
    if (currentUser) {
      fetchFriends();
      fetchFriendRequests();
    }
  }, [currentUser, fetchFriends, fetchFriendRequests]);

  // قبول طلب صداقة
  const handleAcceptRequest = async (requestId: number) => {
    try {
      if (!currentUser?.id) {
        showErrorToast('يجب تسجيل الدخول أولاً');
        return;
      }
      await apiRequest(`/api/friend-requests/${requestId}/accept`, {
        method: 'POST',
        body: { userId: currentUser.id }
      });
      
      showSuccessToast('تم قبول طلب الصداقة بنجاح', 'تم قبول الطلب');
      
      // تحديث البيانات
      fetchFriendRequests();
      fetchFriends();
      updateFriendQueries();
    } catch (error: any) {
      console.error('Accept friend request error:', error);
      showErrorToast(error?.message || 'فشل في قبول طلب الصداقة');
    }
  };

  // رفض طلب صداقة
  const handleRejectRequest = async (requestId: number) => {
    try {
      if (!currentUser?.id) {
        showErrorToast('يجب تسجيل الدخول أولاً');
        return;
      }
      await apiRequest(`/api/friend-requests/${requestId}/decline`, {
        method: 'POST',
        body: { userId: currentUser.id }
      });
      
      showSuccessToast('تم رفض طلب الصداقة بنجاح', 'تم رفض الطلب');
      
      fetchFriendRequests();
      updateFriendQueries();
    } catch (error: any) {
      console.error('Reject friend request error:', error);
      showErrorToast(error?.message || 'فشل في رفض طلب الصداقة');
    }
  };

  // حذف صديق
  const handleRemoveFriend = async (friendId: number) => {
    if (!currentUser) return;
    
    try {
      await apiRequest(`/api/friends/${currentUser.id}/${friendId}`, {
        method: 'DELETE'
      });
      
      showSuccessToast('تم حذف الصديق من قائمتك', 'تم الحذف');
      
      // إزالة الصديق من القائمة فوراً
      setFriends(prev => prev.filter(f => f.id !== friendId));
      updateFriendQueries();
    } catch (error) {
      showErrorToast('فشل في حذف الصديق');
    }
  };

  // تصفية الأصدقاء
  const filteredFriends = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="h-full flex flex-col bg-card/95 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">الأصدقاء</h3>
          </div>
          <Button
            onClick={() => {
              fetchFriends();
              fetchFriendRequests();
            }}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary"
            title="تحديث"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <Button
          variant={activeTab === 'friends' ? 'default' : 'ghost'}
          className={`flex-1 rounded-none py-3 ${
            activeTab === 'friends' 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => setActiveTab('friends')}
        >
          <Users className="w-4 h-4 ml-2" />
          الأصدقاء ({friends.length})
        </Button>
        <Button
          variant={activeTab === 'requests' ? 'default' : 'ghost'}
          className={`flex-1 rounded-none py-3 relative ${
            activeTab === 'requests' 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => setActiveTab('requests')}
        >
          <UserPlus className="w-4 h-4 ml-2" />
          الطلبات
          {friendRequests.incoming.length > 0 && (
            <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[20px] h-5">
              {friendRequests.incoming.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Content */}
      <div
        ref={friendsScrollRef}
        onScroll={() => {
          const el = friendsScrollRef.current;
          if (!el) return;
          const threshold = 80;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
          setIsAtBottomFriends(atBottom);
        }}
        className="relative flex-1 overflow-y-auto p-4 pb-24 cursor-grab"
      >
        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="البحث عن صديق..."
                className="w-full pl-4 pr-10 py-2 rounded-lg bg-background border-input placeholder:text-muted-foreground text-foreground"
              />
            </div>

            {/* Friends List */}
            {loading ? (
              <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="mb-3">👥</div>
                <p className="text-sm">
                  {searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد أصدقاء بعد'}
                </p>
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="text-blue-500 hover:text-blue-700 text-xs mt-2 underline"
                  >
                    مسح البحث
                  </button>
                )}
              </div>
            ) : (
              <ul className="space-y-0">
                {filteredFriends.map((friend) => (
                  <li key={friend.id} className="relative -mx-4">
                    <SimpleUserMenu
                      targetUser={friend}
                      currentUser={currentUser}
                      showModerationActions={isModerator}
                    >
                      <div
                        className={`flex items-center gap-2 p-2 px-4 rounded-none border-b border-gray-200 transition-all duration-200 cursor-pointer w-full ${getUserListItemClasses(friend) || 'bg-white hover:bg-gray-50'}`}
                        style={getUserListItemStyles(friend)}
                        onClick={(e) => onStartPrivateChat(friend)}
                      >
                        <ProfileImage 
                          user={friend} 
                          size="small" 
                          className=""
                          hideRoleBadgeOverlay={true}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span 
                                className="text-base font-medium transition-all duration-300"
                                style={{ 
                                  color: getFinalUsernameColor(friend),
                                  textShadow: getFinalUsernameColor(friend) ? `0 0 10px ${getFinalUsernameColor(friend)}40` : 'none',
                                  filter: getFinalUsernameColor(friend) ? 'drop-shadow(0 0 3px rgba(255,255,255,0.3))' : 'none'
                                }}
                                title={friend.username}
                              >
                                {friend.username}
                              </span>
                              {/* إشارة المكتوم */}
                              {friend.isMuted && (
                                <span className="text-yellow-400 text-xs">🔇</span>
                              )}
                              {friend.unreadCount && friend.unreadCount > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {friend.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {renderUserBadge(friend)}
                              {renderCountryFlag(friend)}
                            </div>
                          </div>
                          {/* حالة الاتصال */}
                          <div className="text-xs text-gray-500 mt-1">
                            {friend.isOnline ? (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                {friend.status === 'away' ? 'بعيد' : 'متصل الآن'}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                غير متصل
                              </span>
                            )}
                          </div>
                          {friend.lastMessage && (
                            <div className="text-xs text-gray-500 truncate">
                              {friend.lastMessage}
                            </div>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartPrivateChat(friend);
                            }}
                            className="bg-blue-500 hover:bg-blue-600"
                            title="محادثة خاصة"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFriend(friend.id);
                            }}
                            className="text-red-500 hover:bg-red-50"
                            title="حذف الصديق"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </SimpleUserMenu>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Friend Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {/* Incoming Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>الطلبات الواردة</span>
                  <Badge variant="secondary">
                    {friendRequests.incoming.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  طلبات الصداقة التي وصلتك من مستخدمين آخرين
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  {friendRequests.incoming.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      لا توجد طلبات صداقة واردة
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {friendRequests.incoming.map((request) => (
                        <div key={request.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <ProfileImage 
                                user={request.user} 
                                size="small" 
                                className=""
                                hideRoleBadgeOverlay={true}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span 
                                    className="font-semibold"
                                    style={{ 
                                      color: getFinalUsernameColor(request.user),
                                      textShadow: getFinalUsernameColor(request.user) ? `0 0 10px ${getFinalUsernameColor(request.user)}40` : 'none',
                                      filter: getFinalUsernameColor(request.user) ? 'drop-shadow(0 0 3px rgba(255,255,255,0.3))' : 'none'
                                    }}
                                  >
                                    {request.user.username}
                                  </span>
                                  {renderUserBadge(request.user)}
                                  {renderCountryFlag(request.user)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {formatTimeAgo(request.createdAt.toString())}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptRequest(request.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-4 h-4 ml-1" />
                                قبول
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectRequest(request.id)}
                              >
                                <X className="w-4 h-4 ml-1" />
                                رفض
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Outgoing Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>الطلبات الصادرة</span>
                  <Badge variant="secondary">
                    {friendRequests.outgoing.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  طلبات الصداقة التي أرسلتها لمستخدمين آخرين
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  {friendRequests.outgoing.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      لا توجد طلبات صداقة صادرة
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {friendRequests.outgoing.map((request) => (
                        <div key={request.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <ProfileImage 
                                user={request.user} 
                                size="small" 
                                className=""
                                hideRoleBadgeOverlay={true}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span 
                                    className="font-semibold"
                                    style={{ 
                                      color: getFinalUsernameColor(request.user),
                                      textShadow: getFinalUsernameColor(request.user) ? `0 0 10px ${getFinalUsernameColor(request.user)}40` : 'none',
                                      filter: getFinalUsernameColor(request.user) ? 'drop-shadow(0 0 3px rgba(255,255,255,0.3))' : 'none'
                                    }}
                                  >
                                    {request.user.username}
                                  </span>
                                  {renderUserBadge(request.user)}
                                  {renderCountryFlag(request.user)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {formatTimeAgo(request.createdAt.toString())}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {request.status === 'pending' ? 'في الانتظار' : 
                                 request.status === 'accepted' ? 'مقبول' : 
                                 request.status === 'declined' ? 'مرفوض' : 'مجاهل'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {!isAtBottomFriends && (
        <div className="absolute bottom-4 right-4 z-10">
          <Button size="sm" onClick={() => {
            const el = friendsScrollRef.current;
            if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
          }} className="px-3 py-1.5 rounded-full text-xs bg-primary text-primary-foreground shadow">
            الانتقال لأسفل
          </Button>
        </div>
      )}
    </div>
  );
}