import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Users, Crown, Clock, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser, ChatRoom, WebSocketMessage } from '@/types/chat';

interface BroadcastRoomInterfaceProps {
  currentUser: ChatUser | null;
  room: ChatRoom;
  onlineUsers: ChatUser[];
  onSendMessage: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  typingUsers: string[];
  onReportMessage: (user: ChatUser, messageContent?: string, messageId?: number) => void;
  onUserClick: (event: React.MouseEvent, user: ChatUser) => void;
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
  chat
}: BroadcastRoomInterfaceProps) {
  const [broadcastInfo, setBroadcastInfo] = useState<BroadcastInfo | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // جلب معلومات غرفة البث
  const fetchBroadcastInfo = async () => {
    if (!room?.id) {
      console.warn('⚠️ لا يمكن جلب معلومات البث - معرف الغرفة غير صحيح');
      return;
    }

    try {
      const data = await apiRequest(`/api/rooms/${room.id}/broadcast-info`, { method: 'GET' });
      if (data?.info) {
        setBroadcastInfo(data.info);
        } else {
        console.warn('⚠️ لم يتم استلام معلومات غرفة البث صحيحة من الخادم');
        setBroadcastInfo({ hostId: null, speakers: [], micQueue: [] });
      }
    } catch (error: any) {
      console.error('❌ خطأ في جلب معلومات غرفة البث:', error);
      // fallback آمن بدون قيم افتراضية خاطئة
      setBroadcastInfo({ hostId: null, speakers: [], micQueue: [] });
      // للأخطاء الأخرى، عرض toast تحذيري
      toast({
        title: 'تحذير',
        description: 'تعذر جلب آخر تحديثات غرفة البث. سيتم استخدام البيانات المحفوظة.',
        variant: 'default'
      });
    }
  };

  useEffect(() => {
    if (room.isBroadcast) {
      fetchBroadcastInfo();
    }
  }, [room.id, room.isBroadcast]);

  // معالجة الرسائل الجديدة من WebSocket
  useEffect(() => {
    const updateBroadcastInfo = (data: any) => {
      if (data.broadcastInfo) {
        setBroadcastInfo(data.broadcastInfo);
      } else {
        fetchBroadcastInfo();
      }
    };

    const showToast = (title: string, description: string, variant?: 'default' | 'destructive') => {
      toast({ title, description, variant });
    };

    const handleBroadcastMessage = (data: any) => {
      try {
        updateBroadcastInfo(data);
        switch (data.type) {
          case 'micRequest': {
            if (currentUser && (
              currentUser.id === broadcastInfo?.hostId ||
              currentUser.userType === 'admin' ||
              currentUser.userType === 'moderator' ||
              currentUser.userType === 'owner'
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
          default:
            break;
        }
        if (data.type === 'error' && data.message) {
          showToast('خطأ', data.message, 'destructive');
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
  // تقليل التبعيات لمنع إعادة التسجيل المتكرر
  }, [room.id, chat, toast, currentUser?.id, currentUser?.userType]);

  // التحقق من صلاحيات المستخدم
  const isHost = !!currentUser && broadcastInfo?.hostId != null && broadcastInfo.hostId === currentUser.id;
  const isAdmin = !!currentUser && currentUser.userType === 'admin';
  const isModerator = !!currentUser && currentUser.userType === 'moderator';
  const isOwner = !!currentUser && currentUser.userType === 'owner';
  const canManageMic = isHost || isAdmin || isModerator || isOwner;
  const isSpeaker = !!currentUser && !!broadcastInfo && broadcastInfo.speakers.includes(currentUser.id);
  const isInQueue = !!currentUser && !!broadcastInfo && broadcastInfo.micQueue.includes(currentUser.id);
  const canSpeak = isHost || isSpeaker;
  const canRequestMic = !!currentUser && !isHost && !isSpeaker && !isInQueue;

  // طلب المايك
  const handleRequestMic = async () => {
    if (!currentUser) {
      toast({
        title: 'خطأ',
        description: 'يجب تسجيل الدخول أولاً لطلب المايك',
        variant: 'destructive'
      });
      return;
    }

    if (!room?.id) {
      toast({
        title: 'خطأ',
        description: 'معرف الغرفة غير صحيح',
        variant: 'destructive'
      });
      return;
    }

    // التحقق من أن المستخدم لم يطلب المايك بالفعل
    if (isInQueue) {
      toast({
        title: 'تنبيه',
        description: 'أنت بالفعل في قائمة انتظار المايك',
        variant: 'default'
      });
      return;
    }

    if (isSpeaker || isHost) {
      toast({
        title: 'تنبيه',
        description: 'أنت تملك المايك بالفعل',
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
      
      // تحديث معلومات الغرفة
      await fetchBroadcastInfo();
    } catch (error: any) {
      console.error('خطأ في طلب المايك:', error);
      toast({
        title: 'خطأ في طلب المايك',
        description: error?.message || error?.error || 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // الموافقة على طلب المايك
  const handleApproveMic = async (userId: number) => {
    if (!currentUser) {
      toast({ title: 'خطأ', description: 'يجب تسجيل الدخول أولاً', variant: 'destructive' });
      return;
    }
    if (!canManageMic) {
      toast({ title: 'غير مسموح', description: 'ليس لديك صلاحية للموافقة على طلبات المايك', variant: 'destructive' });
      return;
    }
    const targetUser = getUserById(userId);
    if (!targetUser) {
      toast({ title: 'خطأ', description: 'المستخدم غير موجود', variant: 'destructive' });
      return;
    }
    try {
      setIsLoading(true);
      await apiRequest(`/api/rooms/${room.id}/approve-mic/${userId}`, { method: 'POST', body: { approvedBy: currentUser.id } });
      toast({ title: 'تمت الموافقة', description: `تمت الموافقة على طلب ${targetUser.username} للمايك` });
      await fetchBroadcastInfo();
    } catch (error: any) {
      console.error('خطأ في الموافقة على المايك:', error);
      toast({ title: 'خطأ في الموافقة', description: error?.message || error?.error || 'حدث خطأ في الموافقة على الطلب', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // رفض طلب المايك
  const handleRejectMic = async (userId: number) => {
    if (!currentUser) {
      toast({ title: 'خطأ', description: 'يجب تسجيل الدخول أولاً', variant: 'destructive' });
      return;
    }
    if (!canManageMic) {
      toast({ title: 'غير مسموح', description: 'ليس لديك صلاحية لرفض طلبات المايك', variant: 'destructive' });
      return;
    }
    const targetUser = getUserById(userId);
    if (!targetUser) {
      toast({ title: 'خطأ', description: 'المستخدم غير موجود', variant: 'destructive' });
      return;
    }
    try {
      setIsLoading(true);
      await apiRequest(`/api/rooms/${room.id}/reject-mic/${userId}`, { method: 'POST', body: { rejectedBy: currentUser.id } });
      toast({ title: 'تم الرفض', description: `تم رفض طلب ${targetUser.username} للمايك` });
      await fetchBroadcastInfo();
    } catch (error: any) {
      console.error('خطأ في رفض المايك:', error);
      toast({ title: 'خطأ في الرفض', description: error?.message || error?.error || 'حدث خطأ في رفض الطلب', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // إزالة متحدث
  const handleRemoveSpeaker = async (userId: number) => {
    if (!currentUser) {
      toast({ title: 'خطأ', description: 'يجب تسجيل الدخول أولاً', variant: 'destructive' });
      return;
    }
    if (!canManageMic) {
      toast({ title: 'غير مسموح', description: 'ليس لديك صلاحية لإزالة المتحدثين', variant: 'destructive' });
      return;
    }
    if (userId === broadcastInfo?.hostId) {
      toast({ title: 'غير مسموح', description: 'لا يمكن إزالة مضيف الغرفة من المتحدثين', variant: 'destructive' });
      return;
    }
    const targetUser = getUserById(userId);
    if (!targetUser) {
      toast({ title: 'خطأ', description: 'المستخدم غير موجود', variant: 'destructive' });
      return;
    }
    try {
      setIsLoading(true);
      await apiRequest(`/api/rooms/${room.id}/remove-speaker/${userId}`, { method: 'POST', body: { removedBy: currentUser.id } });
      toast({ title: 'تم الإزالة', description: `تم إزالة ${targetUser.username} من المتحدثين بنجاح` });
      await fetchBroadcastInfo();
    } catch (error: any) {
      console.error('خطأ في إزالة المتحدث:', error);
      toast({ title: 'خطأ في الإزالة', description: error?.message || error?.error || 'حدث خطأ في إزالة المتحدث', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // إرسال رسالة
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    
    // استخدام onSendMessage مباشرة بدلاً من chat object
    onSendMessage(messageInput.trim());
    setMessageInput('');
  };

  // جلب معلومات المستخدم
  const getUserById = (userId: number) => {
    return onlineUsers.find(user => user.id === userId);
  };

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
            {broadcastInfo?.hostId != null && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {getUserById(broadcastInfo.hostId!)?.username || 'غير معروف'}
              </Badge>
            )}
          </div>

          {/* المتحدثين */}
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-green-500" />
            <span className="font-medium">المتحدثون:</span>
            <div className="flex gap-1 flex-wrap">
              {broadcastInfo?.speakers.map(userId => {
                const user = getUserById(userId);
                return user ? (
                  <Badge key={userId} variant="outline" className="flex items-center gap-1">
                    {user.username}
                    {canManageMic && (
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
              {broadcastInfo?.speakers.length === 0 && (
                <span className="text-muted-foreground text-sm">لا يوجد متحدثون</span>
              )}
            </div>
          </div>

          {/* قائمة الانتظار */}
          {broadcastInfo?.micQueue.length > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="font-medium">قائمة الانتظار:</span>
              <div className="flex gap-1 flex-wrap">
                {broadcastInfo.micQueue.map(userId => {
                  const user = getUserById(userId);
                  return user ? (
                    <Badge key={userId} variant="outline" className="flex items-center gap-1">
                      {user.username}
                      {canManageMic && (
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
                            className="h-4 w-4 p-0 text-destructive hover:text-destructive"
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
                !broadcastInfo?.speakers.includes(user.id) && 
                !broadcastInfo?.micQueue.includes(user.id) &&
                broadcastInfo?.hostId !== user.id
              ).length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* أزرار التحكم */}
      <div className="flex gap-2 mb-4">
        {canRequestMic && (
          <Button
            onClick={handleRequestMic}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Mic className="w-4 h-4" />
            {isLoading ? 'جاري الإرسال...' : 'طلب المايك'}
          </Button>
        )}

        {isInQueue && (
          <Button variant="outline" disabled className="flex items-center gap-2">
            <Clock className="w-4 h-4 animate-pulse" />
            في قائمة الانتظار
          </Button>
        )}

        {canSpeak && (
          <Button variant="outline" disabled className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-green-500" />
            {isHost ? 'أنت المضيف' : 'يمكنك التحدث'}
          </Button>
        )}

        {canManageMic && broadcastInfo?.micQueue && broadcastInfo.micQueue.length > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {broadcastInfo.micQueue.length} في الانتظار
          </Badge>
        )}
      </div>

      <Separator className="my-4" />

      {/* منطقة الرسائل - نفس التصميم العادي */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* هنا سيتم عرض الرسائل من MessageArea */}
        <div className="text-center text-muted-foreground">
          الرسائل ستظهر هنا
        </div>
      </div>

      {/* منطقة إرسال الرسائل */}
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={"اكتب رسالتك..."}
            disabled={false}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!messageInput.trim() || isLoading}
            className="flex items-center gap-2"
          >
            <Mic className="w-4 h-4" />
            إرسال
          </Button>
        </form>
      </div>
    </div>
  );
}