import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Users, Crown, Clock, Check, X, Volume2, VolumeX } from 'lucide-react';
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
    sendWebRTCIceCandidate?: (toUserId: number, roomId: string, candidate: RTCIceCandidateInit) => void;
    sendWebRTCOffer?: (toUserId: number, roomId: string, offer: RTCSessionDescriptionInit) => void;
    sendWebRTCAnswer?: (toUserId: number, roomId: string, answer: RTCSessionDescriptionInit) => void;
    onWebRTCOffer?: (handler: (payload: any) => void) => void;
    offWebRTCOffer?: (handler: (payload: any) => void) => void;
    onWebRTCIceCandidate?: (handler: (payload: any) => void) => void;
    offWebRTCIceCandidate?: (handler: (payload: any) => void) => void;
    onWebRTCAnswer?: (handler: (payload: any) => void) => void;
    offWebRTCAnswer?: (handler: (payload: any) => void) => void;
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
  const { toast } = useToast();

  // WebRTC states
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const peersRef = React.useRef<Map<number, RTCPeerConnection>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // جلب معلومات غرفة البث
  // 🚀 جلب معلومات البث مع منع التكرار
  const fetchBroadcastInfo = useCallback(async () => {
    if (!room?.id) {
      console.warn('⚠️ لا يمكن جلب معلومات البث - معرف الغرفة غير صحيح');
      return;
    }

    // 🚫 منع الطلبات المتكررة
    const fetchKey = `broadcast_${room.id}`;
    if ((fetchBroadcastInfo as any).loading === fetchKey) {
      return;
    }

    (fetchBroadcastInfo as any).loading = fetchKey;

    try {
      const data = await apiRequest(`/api/rooms/${room.id}/broadcast-info`, { method: 'GET' });
      if (data?.info) {
        setBroadcastInfo(normalizeBroadcastInfo(data.info));
        } else {
        console.warn('⚠️ لم يتم استلام معلومات غرفة البث صحيحة من الخادم');
        setBroadcastInfo({ hostId: null, speakers: [], micQueue: [] });
      }
    } catch (error: any) {
      console.error('❌ خطأ في جلب معلومات غرفة البث:', error);
      // fallback آمن بدون قيم افتراضية خاطئة
      setBroadcastInfo({ hostId: null, speakers: [], micQueue: [] });
      
      // عرض toast تحذيري فقط للأخطاء المهمة
      if (error.status !== 404) {
        toast({
          title: 'تحذير',
          description: 'تعذر جلب آخر تحديثات غرفة البث. سيتم استخدام البيانات المحفوظة.',
          variant: 'default'
        });
      }
    } finally {
      delete (fetchBroadcastInfo as any).loading;
    }
  }, [room?.id, toast]);

  useEffect(() => {
    if (room.isBroadcast) {
      fetchBroadcastInfo();
    }
  }, [room.id, room.isBroadcast]);

  // معالجة الرسائل الجديدة من WebSocket
  useEffect(() => {
    const updateBroadcastInfo = (data: any) => {
      if (data.broadcastInfo) {
        setBroadcastInfo(normalizeBroadcastInfo(data.broadcastInfo));
      }
      // 🗑️ حذف fetchBroadcastInfo المكرر - سيتم التحديث تلقائياً
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
  const speakers = Array.isArray(broadcastInfo?.speakers) ? broadcastInfo!.speakers : [];
  const micQueue = Array.isArray(broadcastInfo?.micQueue) ? broadcastInfo!.micQueue : [];
  const isHost = !!currentUser && broadcastInfo?.hostId != null && broadcastInfo.hostId === currentUser.id;
  const isAdmin = !!currentUser && currentUser.userType === 'admin';
  const isModerator = !!currentUser && currentUser.userType === 'moderator';
  const isOwner = !!currentUser && currentUser.userType === 'owner';
  const canManageMic = isHost || isAdmin || isModerator || isOwner;
  const isSpeaker = !!currentUser && speakers.includes(currentUser.id);
  const isInQueue = !!currentUser && micQueue.includes(currentUser.id);
  const canSpeak = isHost || isSpeaker;
  const canRequestMic = !!currentUser && !isHost && !isSpeaker && !isInQueue;
  const isListener = !!currentUser && !canSpeak;

  // ============= WebRTC helpers =============
  const stopBroadcast = useCallback(() => {
    setIsBroadcasting(false);
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    setLocalStream(null);
  }, [localStream]);

  useEffect(() => {
    return () => stopBroadcast();
  }, [stopBroadcast]);

  const startBroadcast = useCallback(async () => {
    if (!currentUser || !room.id) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setLocalStream(stream);
      setIsBroadcasting(true);
      // Create peer connections per listener (lazy: on offer request)
      // Actively send offers to currently online listeners (non-speakers)
      const listeners = onlineUsers.filter(u => u.id !== currentUser.id && !speakers.includes(u.id) && u.id !== broadcastInfo?.hostId);
      for (const listener of listeners) {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            chat.sendWebRTCIceCandidate?.(listener.id, room.id, event.candidate);
          }
        };
        peersRef.current.set(listener.id, pc);
        const offer = await pc.createOffer({ offerToReceiveAudio: false });
        await pc.setLocalDescription(offer);
        chat.sendWebRTCOffer?.(listener.id, room.id, offer);
      }
    } catch (err) {
      console.error('startBroadcast error:', err);
      toast({ title: 'فشل بدء البث الصوتي', description: 'تحقق من صلاحيات الميكروفون', variant: 'destructive' });
    }
  }, [currentUser, room.id, onlineUsers, speakers, broadcastInfo?.hostId, chat, toast]);

  // While broadcasting, send offers to any new listeners who appear later
  useEffect(() => {
    const run = async () => {
      if (!isBroadcasting || !localStream || !currentUser || !room.id) return;
      const listeners = onlineUsers.filter(u => u.id !== currentUser.id && !speakers.includes(u.id) && u.id !== broadcastInfo?.hostId);
      for (const listener of listeners) {
        if (peersRef.current.has(listener.id)) continue;
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            chat.sendWebRTCIceCandidate?.(listener.id, room.id, event.candidate);
          }
        };
        peersRef.current.set(listener.id, pc);
        const offer = await pc.createOffer({ offerToReceiveAudio: false });
        await pc.setLocalDescription(offer);
        chat.sendWebRTCOffer?.(listener.id, room.id, offer);
      }
    };
    run();
  }, [isBroadcasting, localStream, onlineUsers, currentUser?.id, room.id, speakers, broadcastInfo?.hostId, chat]);

  // Listener side: handle offers/answers/ice
  useEffect(() => {
    if (!isListener || !currentUser || !room.id) return;
    const handleOffer = async (payload: any) => {
      try {
        if (payload?.roomId !== room.id) return;
        const fromUserId = payload.senderId;
        let pc = peersRef.current.get(fromUserId);
        if (!pc) {
          pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
          pc.ontrack = (event) => {
            // Play the first audio track
            if (!audioRef.current) return;
            const [remoteStream] = event.streams;
            audioRef.current.srcObject = remoteStream;
            audioRef.current.muted = isMuted;
            audioRef.current.play().catch(() => {});
          };
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              chat.sendWebRTCIceCandidate?.(fromUserId, room.id, event.candidate);
            }
          };
          peersRef.current.set(fromUserId, pc);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        chat.sendWebRTCAnswer?.(fromUserId, room.id, answer);
      } catch (err) {
        console.error('handleOffer error:', err);
      }
    };
    const handleAnswer = async (_payload: any) => {
      // Listener doesn't process answers
    };
    const handleIce = async (payload: any) => {
      try {
        if (payload?.roomId !== room.id) return;
        const fromUserId = payload.senderId;
        const pc = peersRef.current.get(fromUserId);
        if (pc && payload.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      } catch {}
    };

    chat.onWebRTCOffer?.(handleOffer);
    chat.onWebRTCIceCandidate?.(handleIce);
    chat.onWebRTCAnswer?.(handleAnswer);

    return () => {
      chat.offWebRTCOffer?.(handleOffer);
      chat.offWebRTCIceCandidate?.(handleIce);
      chat.offWebRTCAnswer?.(handleAnswer);
    };
  }, [isListener, currentUser?.id, room.id, chat, isMuted]);

  // Host/Speaker side: handle answers/ice from listeners
  useEffect(() => {
    if (!canSpeak || !currentUser || !room.id) return;
    const handleAnswer = async (payload: any) => {
      try {
        if (payload?.roomId !== room.id) return;
        const fromUserId = payload.senderId;
        const pc = peersRef.current.get(fromUserId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
      } catch (err) {}
    };
    const handleIce = async (payload: any) => {
      try {
        if (payload?.roomId !== room.id) return;
        const fromUserId = payload.senderId;
        const pc = peersRef.current.get(fromUserId);
        if (pc && payload.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      } catch {}
    };

    chat.onWebRTCAnswer?.(handleAnswer);
    chat.onWebRTCIceCandidate?.(handleIce);

    return () => {
      chat.offWebRTCAnswer?.(handleAnswer);
      chat.offWebRTCIceCandidate?.(handleIce);
    };
  }, [canSpeak, currentUser?.id, room.id, chat]);

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

  // إرسال رسالة - تمت إزالته لصالح MessageArea
  // جلب معلومات المستخدم
  const getUserById = (userId: number) => {
    return onlineUsers.find(user => user.id === userId);
  };

  // UI Helpers
  const listenerCount = onlineUsers.filter(user => 
    !speakers.includes(user.id) && 
    !micQueue.includes(user.id) &&
    broadcastInfo?.hostId !== user.id
  ).length;

  const toggleMute = () => {
    setIsMuted((m) => {
      const next = !m;
      if (audioRef.current) {
        audioRef.current.muted = next;
      }
      return next;
    });
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
              {speakers.map(userId => {
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
            <Badge variant="secondary">{listenerCount}</Badge>
          </div>

          {/* عناصر التحكم في البث */}
          <div className="flex flex-wrap gap-2 mt-2">
            {canSpeak && !isBroadcasting && (
              <Button onClick={startBroadcast} className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                بدء البث الصوتي
              </Button>
            )}
            {canSpeak && isBroadcasting && (
              <Button variant="outline" onClick={stopBroadcast} className="flex items-center gap-2">
                <MicOff className="w-4 h-4" />
                إيقاف البث الصوتي
              </Button>
            )}
            {isListener && (
              <Button type="button" onClick={toggleMute} variant="ghost" className="flex items-center gap-2">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
              </Button>
            )}
          </div>
          <audio ref={audioRef} hidden playsInline />
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

        {canManageMic && micQueue.length > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {micQueue.length} في الانتظار
          </Badge>
        )}
      </div>

      <Separator className="my-4" />

      {/* منطقة الرسائل الموحدة */}
      <div className="flex-1 min-h-0">
        <MessageArea
          messages={messages}
          currentUser={currentUser}
          onSendMessage={(content) => onSendMessage(content)}
          onTyping={() => onTyping(true)}
          typingUsers={new Set(typingUsers)}
          onReportMessage={(u, c, id) => onReportMessage(u, c, id)}
          onUserClick={onUserClick}
          onlineUsers={onlineUsers}
          currentRoomName={room?.name || 'غرفة البث'}
        />
      </div>
    </div>
  );
}