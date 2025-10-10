import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Users, UserPlus, MessageCircle, Trash2, Check, X } from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

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
import CountryFlag from '@/components/ui/CountryFlag';
import {
  getFinalUsernameColor,
  getUserListItemStyles,
  getUserListItemClasses,
  getUsernameDisplayStyle,
} from '@/utils/themeUtils';
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
  onStartPrivateChat,
}: FriendsTabPanelProps) {
  const friendsScrollRef = useRef<HTMLDivElement>(null);
  useGrabScroll(friendsScrollRef);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const { showErrorToast, showSuccessToast, updateFriendQueries } =
    useNotificationManager(currentUser);
  const [isAtBottomFriends, setIsAtBottomFriends] = useState(true);
  const queryClient = useQueryClient();

  // جلب الأصدقاء عبر React Query مع كاش متسق
  const {
    data: friendsData,
    isLoading: isLoadingFriends,
    isFetching: isFetchingFriends,
    refetch: refetchFriends,
  } = useQuery<{ friends: Friend[] }>({
    queryKey: ['/api/friends', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('No user ID');
      return await apiRequest(`/api/friends/${currentUser.id}`);
    },
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const rawFriends = (friendsData as any)?.friends || [];
  const friendsWithStatus = useMemo(() => {
    return rawFriends.map((friend: any) => {
      const onlineUser = onlineUsers.find((u) => u.id === friend.id);
      return {
        ...friend,
        isOnline: !!onlineUser,
        status: onlineUser ? 'online' : 'offline',
      };
    });
  }, [rawFriends, onlineUsers]);

  // جلب طلبات الصداقة (واردة وصادرة)
  const {
    data: incomingData,
    isFetching: isFetchingIncoming,
    refetch: refetchIncoming,
  } = useQuery<{ requests: FriendRequest[] }>({
    queryKey: ['/api/friend-requests/incoming', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('No user ID');
      return await apiRequest(`/api/friend-requests/incoming/${currentUser.id}`);
    },
    enabled: !!currentUser?.id,
    staleTime: 60 * 1000,
  });
  const {
    data: outgoingData,
    isFetching: isFetchingOutgoing,
    refetch: refetchOutgoing,
  } = useQuery<{ requests: FriendRequest[] }>({
    queryKey: ['/api/friend-requests/outgoing', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('No user ID');
      return await apiRequest(`/api/friend-requests/outgoing/${currentUser.id}`);
    },
    enabled: !!currentUser?.id,
    staleTime: 60 * 1000,
  });

  const incomingRequests = (incomingData as any)?.requests || [];
  const outgoingRequests = (outgoingData as any)?.requests || [];

  // Mutations: قبول/رفض الطلبات وحذف صديق
  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      if (!currentUser?.id) throw new Error('No user ID');
      return await apiRequest(`/api/friend-requests/${requestId}/accept`, {
        method: 'POST',
        body: { userId: currentUser.id },
      });
    },
    onSuccess: () => {
      showSuccessToast('تم قبول طلب الصداقة بنجاح', 'تم قبول الطلب');
      queryClient.invalidateQueries({ queryKey: ['/api/friends', currentUser?.id] });
      queryClient.invalidateQueries({
        queryKey: ['/api/friend-requests/incoming', currentUser?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/friend-requests/outgoing', currentUser?.id],
      });
      updateFriendQueries();
    },
    onError: (error: any) => {
      showErrorToast(error?.message || 'فشل في قبول طلب الصداقة');
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      if (!currentUser?.id) throw new Error('No user ID');
      return await apiRequest(`/api/friend-requests/${requestId}/decline`, {
        method: 'POST',
        body: { userId: currentUser.id },
      });
    },
    onSuccess: () => {
      showSuccessToast('تم رفض طلب الصداقة بنجاح', 'تم رفض الطلب');
      queryClient.invalidateQueries({
        queryKey: ['/api/friend-requests/incoming', currentUser?.id],
      });
      updateFriendQueries();
    },
    onError: (error: any) => {
      showErrorToast(error?.message || 'فشل في رفض طلب الصداقة');
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: async (friendId: number) => {
      if (!currentUser?.id) throw new Error('No user ID');
      return await apiRequest(`/api/friends/${currentUser.id}/${friendId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_data, friendId) => {
      showSuccessToast('تم حذف الصديق من قائمتك', 'تم الحذف');
      // تحديث الكاش فورياً
      queryClient.setQueryData(['/api/friends', currentUser?.id], (oldData: any) => {
        if (!oldData?.friends) return oldData;
        return {
          ...oldData,
          friends: oldData.friends.filter((f: any) => f.id !== friendId),
        };
      });
      updateFriendQueries();
    },
    onError: () => {
      showErrorToast('فشل في حذف الصديق');
    },
  });

  // دوال التحديث اليدوي (تستخدم في زر التحديث)
  const fetchFriends = useCallback(() => {
    if (!currentUser?.id) return;
    refetchFriends();
  }, [currentUser?.id, refetchFriends]);

  const fetchFriendRequests = useCallback(() => {
    if (!currentUser?.id) return;
    refetchIncoming();
    refetchOutgoing();
  }, [currentUser?.id, refetchIncoming, refetchOutgoing]);

  // دوال مساعدة لعرض الشارات والأعلام
  const renderUserBadge = useCallback((user: ChatUser) => {
    if (!user) return null;
    return <UserRoleBadge user={user} size={20} />;
  }, []);

  // استبدال إيموجي العلم بصورة علم حقيقية
  const renderCountryFlag = useCallback((user: ChatUser) => <CountryFlag country={user.country} size={14} />, []);

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

  // تحديث حالة الاتصال للأصدقاء يتم الآن تلقائياً عبر friendsWithStatus المشتقة من الكاش

  // جلب البيانات عند التحميل (يعتمد على React Query)
  useEffect(() => {
    if (currentUser) {
      fetchFriends();
      fetchFriendRequests();
    }
  }, [currentUser, fetchFriends, fetchFriendRequests]);

  // قبول طلب صداقة
  const handleAcceptRequest = async (requestId: number) => {
    if (!currentUser?.id) {
      showErrorToast('يجب تسجيل الدخول أولاً');
      return;
    }
    await acceptRequestMutation.mutateAsync(requestId);
  };

  // رفض طلب صداقة
  const handleRejectRequest = async (requestId: number) => {
    if (!currentUser?.id) {
      showErrorToast('يجب تسجيل الدخول أولاً');
      return;
    }
    await rejectRequestMutation.mutateAsync(requestId);
  };

  // حذف صديق
  const handleRemoveFriend = async (friendId: number) => {
    if (!currentUser) return;
    await removeFriendMutation.mutateAsync(friendId);
  };

  // تصفية الأصدقاء
  const filteredFriends = friendsWithStatus.filter((friend) =>
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
      <div className="flex border-b border-border">
        <Button
          variant={activeTab === 'friends' ? 'default' : 'ghost'}
          className={`flex-1 rounded-none py-3`}
          onClick={() => setActiveTab('friends')}
        >
          <Users className="w-4 h-4 ml-2" />
          الأصدقاء ({friendsWithStatus.length})
        </Button>
        <Button
          variant={activeTab === 'requests' ? 'default' : 'ghost'}
          className={`flex-1 rounded-none py-3 relative`}
          onClick={() => setActiveTab('requests')}
        >
          <UserPlus className="w-4 h-4 ml-2" />
          الطلبات
          {incomingRequests.length > 0 && (
            <Badge className="absolute -top-1 -right-1 text-destructive bg-destructive/10 border-destructive/30 text-xs min-w-[20px] h-5">
              {incomingRequests.length}
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
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </span>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="البحث عن صديق..."
                className="w-full pl-4 pr-10 py-2 rounded-lg bg-background border-input placeholder:text-muted-foreground text-foreground"
              />
            </div>

            {/* Friends List */}
            {isLoadingFriends || isFetchingFriends ? (
              <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="mb-3">👥</div>
                <p className="text-sm">
                  {searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد أصدقاء بعد'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-primary hover:opacity-80 text-xs mt-2 underline"
                  >
                    مسح البحث
                  </button>
                )}
              </div>
            ) : (
              <ul className="space-y-0">
                {filteredFriends.map((friend) => (
                  <li key={friend.id} className="relative -mx-4 list-none">
                    <SimpleUserMenu
                      targetUser={friend}
                      currentUser={currentUser}
                      showModerationActions={isModerator}
                    >
                      <div
                        className={`flex items-center gap-2 py-1.5 px-3 rounded-none border-b border-border/20 transition-colors duration-200 cursor-pointer w-full ${getUserListItemClasses(friend) || 'hover:bg-primary/10'}`}
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
                              {(() => {
                                const uds = getUsernameDisplayStyle(friend);
                                return (
                                  <span
                                    className={`text-sm font-medium transition-all duration-300 ${uds.className || ''}`}
                                    style={uds.style}
                                    title={friend.username}
                                  >
                                    {friend.username}
                                  </span>
                                );
                              })()}
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
                            className="text-destructive hover:bg-destructive/10"
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
            <Card className="bg-[var(--friends-requests-bg,var(--card))]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>الطلبات الواردة</span>
                  <Badge variant="secondary">{incomingRequests.length}</Badge>
                </CardTitle>
                <CardDescription>طلبات الصداقة التي وصلتك من مستخدمين آخرين</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  {incomingRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">لا توجد طلبات صداقة واردة</div>
                  ) : (
                    <div className="space-y-3">
                      {incomingRequests.map((request) => (
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
                                  {(() => {
                                    const uds = getUsernameDisplayStyle(request.user);
                                    return (
                                      <span
                                        className={`text-sm font-medium transition-all duration-300 ${uds.className || ''}`}
                                        style={uds.style}
                                        title={request.user.username}
                                      >
                                        {request.user.username}
                                      </span>
                                    );
                                  })()}
                                  {renderUserBadge(request.user)}
                                  {renderCountryFlag(request.user)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {formatTimeAgo(request.createdAt.toString())}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                onClick={() => handleAcceptRequest(request.id)}
                                className="bg-green-600 hover:bg-green-700 h-8 w-8 rounded-full"
                                title="قبول"
                                aria-label="قبول"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleRejectRequest(request.id)}
                                className="h-8 w-8 rounded-full"
                                title="رفض"
                                aria-label="رفض"
                              >
                                <X className="w-4 h-4" />
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
            <Card className="bg-[var(--friends-requests-bg,var(--card))]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>الطلبات الصادرة</span>
                  <Badge variant="secondary">{outgoingRequests.length}</Badge>
                </CardTitle>
                <CardDescription>طلبات الصداقة التي أرسلتها لمستخدمين آخرين</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  {outgoingRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">لا توجد طلبات صداقة صادرة</div>
                  ) : (
                    <div className="space-y-3">
                      {outgoingRequests.map((request) => (
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
                                  {(() => {
                                    const uds = getUsernameDisplayStyle(request.user);
                                    return (
                                      <span
                                        className={`text-sm font-medium transition-all duration-300 ${uds.className || ''}`}
                                        style={uds.style}
                                        title={request.user.username}
                                      >
                                        {request.user.username}
                                      </span>
                                    );
                                  })()}
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
                                {request.status === 'pending'
                                  ? 'في الانتظار'
                                  : request.status === 'accepted'
                                    ? 'مقبول'
                                    : request.status === 'declined'
                                      ? 'مرفوض'
                                      : 'مجاهل'}
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
          <Button
            size="sm"
            onClick={() => {
              const el = friendsScrollRef.current;
              if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
            }}
            className="px-3 py-1.5 rounded-full text-xs bg-primary text-primary-foreground shadow"
          >
            الانتقال لأسفل
          </Button>
        </div>
      )}
    </div>
  );
}
