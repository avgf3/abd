import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Users, Crown, Clock, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser, ChatRoom, RoomWebSocketMessage as WebSocketMessage, ChatMessage } from '@/types/chat';
import { normalizeBroadcastInfo } from '@/utils/roomUtils';
import MessageArea from './MessageArea';

interface BroadcastRoomInterfaceProps {
  currentUser: ChatUser | null;
  room: ChatRoom;
  onlineUsers: ChatUser[];
  onSendMessage: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  typingUsers: string[];
  onReportMessage: (user: ChatUser, messageContent?: string, messageId?: number) => void;
  onUserClick: (event: React.MouseEvent, user: ChatUser) => void;
  messages: ChatMessage[];
  chat: {
    sendPublicMessage?: (content: string) => void;
    handleTyping?: () => void;
    addBroadcastMessageHandler?: (handler: (data: any) => void) => void;
    removeBroadcastMessageHandler?: (handler: (data: any) => void) => void;
  };
}

interface BroadcastInfo {
  hostId: number | null;
  speakers: number[];
  micQueue: number[];
}

export default function BroadcastRoomInterface({
  currentUser,
  room,
  onlineUsers,
  onSendMessage,
  onTyping,
  typingUsers,
  onReportMessage,
  onUserClick,
  messages,
  chat
}: BroadcastRoomInterfaceProps) {
  const [broadcastInfo, setBroadcastInfo] = useState<BroadcastInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const { toast } = useToast();

  // 🚀 مُحسَّن: جلب معلومات البث مع منع التكرار الكامل
  const fetchBroadcastInfo = useCallback(async (force = false) => {
    if (!room?.id || !room.isBroadcast) {
      console.warn('⚠️ الغرفة ليست غرفة بث صالحة');
      return;
    }

    const now = Date.now();
    // منع الطلبات المتكررة (أقل من 5 ثوانٍ)
    if (!force && (now - lastFetchTime) < 5000) {
      return;
    }

    try {
      setLastFetchTime(now);
      const data = await apiRequest(`/api/rooms/${room.id}/broadcast-info`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // timeout بعد 5 ثوانٍ
      });
      
      if (data?.info) {
        setBroadcastInfo(normalizeBroadcastInfo(data.info));
      } else {
        setBroadcastInfo({ hostId: null, speakers: [], micQueue: [] });
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        console.warn('⏰ انتهت مهلة جلب معلومات البث');
        return;
      }
      
      console.error('❌ خطأ في جلب معلومات غرفة البث:', error);
      setBroadcastInfo({ hostId: null, speakers: [], micQueue: [] });
      
      if (error.status !== 404) {
        toast({
          title: 'تحذير',
          description: 'تعذر جلب آخر تحديثات غرفة البث',
          variant: 'default'
        });
      }
    }
  }, [room?.id, room?.isBroadcast, lastFetchTime, toast]);

  // تحميل أولي محسن
  useEffect(() => {
    if (room.isBroadcast && !broadcastInfo) {
      fetchBroadcastInfo(true);
    }
  }, [room.id, room.isBroadcast, broadcastInfo, fetchBroadcastInfo]);

  // 🚀 مُحسَّن: معالجة رسائل WebSocket مع منع التكرار
  useEffect(() => {
    const handleBroadcastMessage = (data: any) => {
      try {
        // تحديث معلومات البث من WebSocket مباشرة
        if (data.broadcastInfo) {
          setBroadcastInfo(normalizeBroadcastInfo(data.broadcastInfo));
        }

        // معالجة أنواع الرسائل المختلفة
        const showToast = (title: string, description: string, variant?: 'default' | 'destructive') => {
          toast({ title, description, variant });
        };

        switch (data.type) {
          case 'micRequest': {
            if (currentUser && (
              currentUser.id === broadcastInfo?.hostId ||
              ['admin', 'moderator', 'owner'].includes(currentUser.userType)
            )) {
              showToast('طلب مايك جديد', data.content || `${data.username} يطلب المايك`);
            }
            break;
          }
          case 'micApproved':
            showToast('تمت الموافقة على المايك', data.content || 'تمت الموافقة على طلب المايك');
            break;
          case 'micRejected':
            showToast('تم رفض المايك', data.content || 'تم رفض طلب المايك', 'destructive');
            break;
          case 'speakerRemoved':
            showToast('تم إزالة متحدث', data.content || 'تم إزالة متحدث من الغرفة');
            break;
          case 'error':
            if (data.message) {
              showToast('خطأ', data.message, 'destructive');
            }
            break;
        }
      } catch (error) {
        console.error('خطأ في معالجة رسالة WebSocket للبث:', error);
      }
    };

    if (chat.addBroadcastMessageHandler) {
      chat.addBroadcastMessageHandler(handleBroadcastMessage);
    }

    return () => {
      if (chat.removeBroadcastMessageHandler) {
        chat.removeBroadcastMessageHandler(handleBroadcastMessage);
      }
    };
  }, [room.id, chat, toast, currentUser?.id, currentUser?.userType, broadcastInfo?.hostId]);

  // 🚀 مُحسَّن: حساب صلاحيات المستخدم
  const userPermissions = useMemo(() => {
    if (!currentUser || !broadcastInfo) {
      return {
        isHost: false,
        canManageMic: false,
        isSpeaker: false,
        isInQueue: false,
        canSpeak: false,
        canRequestMic: false
      };
    }

    const speakers = Array.isArray(broadcastInfo.speakers) ? broadcastInfo.speakers : [];
    const micQueue = Array.isArray(broadcastInfo.micQueue) ? broadcastInfo.micQueue : [];
    
    const isHost = broadcastInfo.hostId === currentUser.id;
    const isAdmin = ['admin', 'moderator', 'owner'].includes(currentUser.userType);
    const isSpeaker = speakers.includes(currentUser.id);
    const isInQueue = micQueue.includes(currentUser.id);

    return {
      isHost,
      canManageMic: isHost || isAdmin,
      isSpeaker,
      isInQueue,
      canSpeak: isHost || isSpeaker,
      canRequestMic: !isHost && !isSpeaker && !isInQueue
    };
  }, [currentUser, broadcastInfo]);

  // جلب معلومات المستخدم
  const getUserById = useCallback((userId: number) => {
    return onlineUsers.find(user => user.id === userId);
  }, [onlineUsers]);

  // 🚀 مُحسَّن: طلب المايك مع معالجة أفضل للأخطاء
  const handleRequestMic = useCallback(async () => {
    if (!currentUser || !room?.id) {
      toast({
        title: 'خطأ',
        description: 'يجب تسجيل الدخول أولاً',
        variant: 'destructive'
      });
      return;
    }

    if (!userPermissions.canRequestMic) {
      let message = 'لا يمكنك طلب المايك';
      if (userPermissions.isInQueue) message = 'أنت في قائمة انتظار المايك بالفعل';
      if (userPermissions.canSpeak) message = 'أنت تملك المايك بالفعل';
      
      toast({
        title: 'تنبيه',
        description: message,
        variant: 'default'
      });
      return;
    }

    try {
      setIsLoading(true);
      await apiRequest(`/api/rooms/${room.id}/request-mic`, {
        method: 'POST',
        body: { userId: currentUser.id }
      });

      toast({
        title: 'تم إرسال الطلب',
        description: 'تم إرسال طلب المايك للمسؤولين بنجاح',
      });
      
      // تحديث معلومات الغرفة بعد تأخير قصير
      setTimeout(() => fetchBroadcastInfo(true), 1000);
    } catch (error: any) {
      console.error('خطأ في طلب المايك:', error);
      toast({
        title: 'خطأ في طلب المايك',
        description: error?.message || 'حدث خطأ غير متوقع',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, room?.id, userPermissions, toast, fetchBroadcastInfo]);

  // 🚀 مُحسَّن: الموافقة على طلب المايك
  const handleApproveMic = useCallback(async (userId: number) => {
    if (!currentUser || !userPermissions.canManageMic) {
      toast({ 
        title: 'غير مسموح', 
        description: 'ليس لديك صلاحية للموافقة على طلبات المايك', 
        variant: 'destructive' 
      });
      return;
    }
    
    const targetUser = getUserById(userId);
    if (!targetUser) {
      toast({ title: 'خطأ', description: 'المستخدم غير موجود', variant: 'destructive' });
      return;
    }
    
    try {
      setIsLoading(true);
      await apiRequest(`/api/rooms/${room.id}/approve-mic/${userId}`, { 
        method: 'POST', 
        body: { approvedBy: currentUser.id } 
      });
      
      toast({ 
        title: 'تمت الموافقة', 
        description: `تمت الموافقة على طلب ${targetUser.username} للمايك` 
      });
      
      setTimeout(() => fetchBroadcastInfo(true), 1000);
    } catch (error: any) {
      console.error('خطأ في الموافقة على المايك:', error);
      toast({ 
        title: 'خطأ في الموافقة', 
        description: error?.message || 'حدث خطأ في الموافقة على الطلب', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, userPermissions.canManageMic, room.id, getUserById, toast, fetchBroadcastInfo]);

  // 🚀 مُحسَّن: رفض طلب المايك
  const handleRejectMic = useCallback(async (userId: number) => {
    if (!currentUser || !userPermissions.canManageMic) {
      toast({ 
        title: 'غير مسموح', 
        description: 'ليس لديك صلاحية لرفض طلبات المايك', 
        variant: 'destructive' 
      });
      return;
    }
    
    const targetUser = getUserById(userId);
    if (!targetUser) {
      toast({ title: 'خطأ', description: 'المستخدم غير موجود', variant: 'destructive' });
      return;
    }
    
    try {
      setIsLoading(true);
      await apiRequest(`/api/rooms/${room.id}/reject-mic/${userId}`, { 
        method: 'POST', 
        body: { rejectedBy: currentUser.id } 
      });
      
      toast({ 
        title: 'تم الرفض', 
        description: `تم رفض طلب ${targetUser.username} للمايك` 
      });
      
      setTimeout(() => fetchBroadcastInfo(true), 1000);
    } catch (error: any) {
      console.error('خطأ في رفض المايك:', error);
      toast({ 
        title: 'خطأ في الرفض', 
        description: error?.message || 'حدث خطأ في رفض الطلب', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, userPermissions.canManageMic, room.id, getUserById, toast, fetchBroadcastInfo]);

  // 🚀 مُحسَّن: إزالة متحدث
  const handleRemoveSpeaker = useCallback(async (userId: number) => {
    if (!currentUser || !userPermissions.canManageMic) {
      toast({ 
        title: 'غير مسموح', 
        description: 'ليس لديك صلاحية لإزالة المتحدثين', 
        variant: 'destructive' 
      });
      return;
    }
    
    if (userId === broadcastInfo?.hostId) {
      toast({ 
        title: 'غير مسموح', 
        description: 'لا يمكن إزالة مضيف الغرفة من المتحدثين', 
        variant: 'destructive' 
      });
      return;
    }
    
    const targetUser = getUserById(userId);
    if (!targetUser) {
      toast({ title: 'خطأ', description: 'المستخدم غير موجود', variant: 'destructive' });
      return;
    }
    
    try {
      setIsLoading(true);
      await apiRequest(`/api/rooms/${room.id}/remove-speaker/${userId}`, { 
        method: 'POST', 
        body: { removedBy: currentUser.id } 
      });
      
      toast({ 
        title: 'تم الإزالة', 
        description: `تم إزالة ${targetUser.username} من المتحدثين بنجاح` 
      });
      
      setTimeout(() => fetchBroadcastInfo(true), 1000);
    } catch (error: any) {
      console.error('خطأ في إزالة المتحدث:', error);
      toast({ 
        title: 'خطأ في الإزالة', 
        description: error?.message || 'حدث خطأ في إزالة المتحدث', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, userPermissions.canManageMic, room.id, broadcastInfo?.hostId, getUserById, toast, fetchBroadcastInfo]);

  // تعيين القيم الافتراضية الآمنة
  const speakers = broadcastInfo?.speakers || [];
  const micQueue = broadcastInfo?.micQueue || [];

  return (
    <div className="flex flex-col h-full">
      {/* شريط معلومات غرفة البث */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mic className="w-5 h-5 text-primary" />
            غرفة البث المباشر
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* المضيف */}
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-500" />
            <span className="font-medium">المضيف:</span>
            {broadcastInfo?.hostId ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                {getUserById(broadcastInfo.hostId)?.username || 'غير معروف'}
              </Badge>
            ) : (
              <span className="text-muted-foreground text-sm">لا يوجد مضيف</span>
            )}
          </div>

          {/* المتحدثين */}
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-green-500" />
            <span className="font-medium">المتحدثون:</span>
            <div className="flex gap-1 flex-wrap">
              {speakers.map(userId => {
                const user = getUserById(userId);
                return user ? (
                  <Badge key={userId} variant="outline" className="flex items-center gap-1">
                    {user.username}
                    {userPermissions.canManageMic && userId !== broadcastInfo?.hostId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveSpeaker(userId)}
                        disabled={isLoading}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </Badge>
                ) : null;
              })}
              {speakers.length === 0 && (
                <span className="text-muted-foreground text-sm">لا يوجد متحدثون</span>
              )}
            </div>
          </div>

          {/* قائمة الانتظار */}
          {micQueue.length > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="font-medium">قائمة الانتظار:</span>
              <div className="flex gap-1 flex-wrap">
                {micQueue.map(userId => {
                  const user = getUserById(userId);
                  return user ? (
                    <Badge key={userId} variant="outline" className="flex items-center gap-1">
                      {user.username}
                      {userPermissions.canManageMic && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0 text-green-600 hover:text-green-600"
                            onClick={() => handleApproveMic(userId)}
                            disabled={isLoading}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0 text-red-600 hover:text-red-600"
                            onClick={() => handleRejectMic(userId)}
                            disabled={isLoading}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* المستمعون */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="font-medium">المستمعون:</span>
            <Badge variant="secondary">
              {onlineUsers.filter(user => 
                !speakers.includes(user.id) && 
                !micQueue.includes(user.id) &&
                broadcastInfo?.hostId !== user.id
              ).length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* أزرار التحكم */}
      <div className="flex gap-2 mb-4">
        {userPermissions.canRequestMic && (
          <Button
            onClick={handleRequestMic}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Mic className="w-4 h-4" />
            {isLoading ? 'جاري الإرسال...' : 'طلب المايك'}
          </Button>
        )}

        {userPermissions.isInQueue && (
          <Button variant="outline" disabled className="flex items-center gap-2">
            <Clock className="w-4 h-4 animate-pulse" />
            في قائمة الانتظار
          </Button>
        )}

        {userPermissions.canSpeak && (
          <Button variant="outline" disabled className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-green-500" />
            {userPermissions.isHost ? 'أنت المضيف' : 'يمكنك التحدث'}
          </Button>
        )}

        {userPermissions.canManageMic && micQueue.length > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {micQueue.length} في الانتظار
          </Badge>
        )}
      </div>

      <Separator className="my-4" />

      {/* منطقة الرسائل الموحدة */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <MessageArea
          messages={messages}
          currentUser={currentUser}
          onSendMessage={onSendMessage}
          onTyping={() => onTyping(true)}
          typingUsers={new Set(typingUsers)}
          onReportMessage={onReportMessage}
          onUserClick={onUserClick}
          onlineUsers={onlineUsers}
          currentRoomName={room?.name || 'غرفة البث'}
        />
      </div>
    </div>
  );
}