import {
  Mic,
  MicOff,
  Users,
  Crown,
  Clock,
  Check,
  X,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  PlayCircle,
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import MessageArea from './MessageArea';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type {
  ChatUser,
  ChatRoom,
  RoomWebSocketMessage as WebSocketMessage,
  ChatMessage,
} from '@/types/chat';
import { normalizeBroadcastInfo } from '@/utils/roomUtils';

// ICE servers helper with optional TURN support via env
const getIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478?transport=udp' },
  ];
  try {
    const env = (import.meta as any)?.env || {};
    const turnUrl = env?.VITE_TURN_URL || (window as any)?.__TURN_URL__;
    const turnUsername = env?.VITE_TURN_USERNAME || (window as any)?.__TURN_USERNAME__;
    const turnCredential = env?.VITE_TURN_CREDENTIAL || (window as any)?.__TURN_CREDENTIAL__;
    if (turnUrl && turnUsername && turnCredential) {
      servers.push({ urls: turnUrl, username: turnUsername, credential: turnCredential });
    }
  } catch {}
  return servers;
};

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
    sendWebRTCIceCandidate?: (
      toUserId: number,
      roomId: string,
      candidate: RTCIceCandidateInit
    ) => void;
    sendWebRTCOffer?: (toUserId: number, roomId: string, offer: RTCSessionDescriptionInit) => void;
    sendWebRTCAnswer?: (
      toUserId: number,
      roomId: string,
      answer: RTCSessionDescriptionInit
    ) => void;
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
  chat,
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
  const [isInfoCollapsed, setIsInfoCollapsed] = useState(true);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);

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
          variant: 'default',
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
            if (
              currentUser &&
              (currentUser.id === broadcastInfo?.hostId ||
                currentUser.userType === 'admin' ||
                currentUser.userType === 'moderator' ||
                currentUser.userType === 'owner')
            ) {
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
  const isHost =
    !!currentUser && broadcastInfo?.hostId != null && broadcastInfo.hostId === currentUser.id;
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

  // Environment and permission helpers for microphone
  const isSecureContext = () => {
    try {
      if (window.isSecureContext) return true;
      const host = window.location.hostname;
      return host === 'localhost' || host === '127.0.0.1';
    } catch {
      return false;
    }
  };

  const queryMicrophonePermission = async (): Promise<
    'granted' | 'denied' | 'prompt' | 'unknown'
  > => {
    try {
      // Not universally supported (e.g., Safari), so guard it
      const perms: any = (navigator as any).permissions;
      const result = await perms?.query?.({ name: 'microphone' as any });
      if (!result) return 'unknown';
      return (result.state as 'granted' | 'denied' | 'prompt') || 'unknown';
    } catch {
      return 'unknown';
    }
  };

  const hasAudioInputDevice = async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return true; // best-effort
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some((d) => d.kind === 'audioinput');
    } catch {
      return true; // do not block on failure
    }
  };

  const getUserMediaWithFallbacks = async (): Promise<MediaStream> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('المتصفح لا يدعم الوصول للميكروفون (getUserMedia غير متوفر)');
    }

    const constraintsList: MediaStreamConstraints[] = [
      {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } as MediaTrackConstraints,
        video: false,
      },
      { audio: { channelCount: 1, sampleRate: 44100 } as MediaTrackConstraints, video: false },
      { audio: true, video: false },
    ];

    let lastError: any = null;
    for (const constraints of constraintsList) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        // Ensure all audio tracks are enabled
        stream.getAudioTracks().forEach((t) => (t.enabled = true));
        return stream;
      } catch (err: any) {
        lastError = err;
        // Overconstrained → try next; Permission denied/NotAllowed may be final
        const name = err?.name || '';
        if (name === 'NotAllowedError' || name === 'SecurityError') break;
        // If device busy or not found, try next fallback too
      }
    }

    // Rethrow the last error with a friendlier message
    const name = lastError?.name || 'Error';
    const message = lastError?.message || '';
    if (name === 'NotAllowedError') {
      throw new Error('تم رفض إذن الميكروفون. افتح إعدادات الموقع ومنح الإذن ثم أعد تحميل الصفحة.');
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      throw new Error(
        'لم يتم العثور على جهاز ميكروفون متاح. تأكد من توصيل الميكروفون أو اختيار الجهاز الصحيح.'
      );
    }
    if (name === 'NotReadableError') {
      throw new Error(
        'يتعذر الوصول إلى الميكروفون (قد يكون مشغولاً بتطبيق آخر). أغلق التطبيقات الأخرى وحاول مجدداً.'
      );
    }
    if (name === 'OverconstrainedError') {
      throw new Error('إعدادات الميكروفون غير مدعومة على هذا الجهاز. حاول مرة أخرى.');
    }
    if (name === 'SecurityError') {
      throw new Error(
        'لا يمكن الوصول إلى الميكروفون بسبب إعدادات الأمان. تأكد من استخدام اتصال آمن (HTTPS).'
      );
    }
    throw new Error(message || 'تعذر الحصول على صوت من الميكروفون.');
  };

  const explainStartBroadcastError = (error: unknown) => {
    const err = error as any;
    const msg = typeof err === 'string' ? err : err?.message;
    toast({
      title: 'فشل بدء البث الصوتي',
      description: msg || 'تحقق من صلاحيات الميكروفون',
      variant: 'destructive',
    });
  };

  const startBroadcast = useCallback(async () => {
    if (!currentUser || !room.id) return;
    try {
      if (!isSecureContext()) {
        throw new Error(
          'يتطلب الميكروفون اتصالاً آمناً. افتح الموقع عبر HTTPS (أو محلياً على localhost).'
        );
      }

      const perm = await queryMicrophonePermission();
      if (perm === 'denied') {
        throw new Error(
          'تم رفض إذن الميكروفون. افتح إعدادات الموقع ومنح الإذن ثم أعد تحميل الصفحة.'
        );
      }

      const hasInput = await hasAudioInputDevice();
      if (!hasInput) {
        throw new Error('لا يوجد جهاز ميكروفون متاح على هذا الجهاز.');
      }

      const stream = await getUserMediaWithFallbacks();
      setLocalStream(stream);
      setIsBroadcasting(true);

      // Create peer connections per listener (lazy: on offer request)
      // Actively send offers to currently online listeners (non-speakers)
      const listeners = onlineUsers.filter(
        (u) => u.id !== currentUser.id && !speakers.includes(u.id) && u.id !== broadcastInfo?.hostId
      );
      for (const listener of listeners) {
        const pc = new RTCPeerConnection({ iceServers: getIceServers() });

        // Add connection state monitoring
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed') {
            toast({
              title: 'مشكلة في الاتصال',
              description: `فشل الاتصال مع ${listener.username}`,
              variant: 'destructive',
            });
          }
        };

        pc.oniceconnectionstatechange = () => {};

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

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

      toast({
        title: 'بدأ البث الصوتي',
        description: 'تم بدء البث الصوتي بنجاح',
      });
    } catch (err) {
      console.error('❌ startBroadcast error:', err);
      explainStartBroadcastError(err);
    }
  }, [currentUser, room.id, onlineUsers, speakers, broadcastInfo?.hostId, chat, toast]);

  // While broadcasting, send offers to any new listeners who appear later
  useEffect(() => {
    const run = async () => {
      if (!isBroadcasting || !localStream || !currentUser || !room.id) return;
      const listeners = onlineUsers.filter(
        (u) => u.id !== currentUser.id && !speakers.includes(u.id) && u.id !== broadcastInfo?.hostId
      );
      for (const listener of listeners) {
        if (peersRef.current.has(listener.id)) continue;
        const pc = new RTCPeerConnection({ iceServers: getIceServers() });
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
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
  }, [
    isBroadcasting,
    localStream,
    onlineUsers,
    currentUser?.id,
    room.id,
    speakers,
    broadcastInfo?.hostId,
    chat,
  ]);

  // Listener side: handle offers/answers/ice
  useEffect(() => {
    if (!isListener || !currentUser || !room.id) return;
    const handleOffer = async (payload: any) => {
      try {
        if (payload?.roomId !== room.id) return;
        const fromUserId = payload.senderId;
        let pc = peersRef.current.get(fromUserId);
        if (!pc) {
          pc = new RTCPeerConnection({ iceServers: getIceServers() });

          // Add connection state monitoring
          pc.onconnectionstatechange = () => {};

          pc.oniceconnectionstatechange = () => {};

          pc.ontrack = (event) => {
            // Play the first audio track
            if (!audioRef.current) {
              console.warn('⚠️ Audio element not ready');
              return;
            }
            const [remoteStream] = event.streams;
            audioRef.current.srcObject = remoteStream;
            audioRef.current.muted = isMuted;
            audioRef.current
              .play()
              .then(() => {
                setPlaybackBlocked(false);
              })
              .catch((err) => {
                console.error('❌ Audio playback blocked:', err);
                setPlaybackBlocked(true);
                toast({
                  title: 'تشغيل الصوت محظور',
                  description: 'اضغط على زر "تشغيل الصوت" للسماح بالتشغيل',
                  variant: 'default',
                });
              });
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
        console.error('❌ handleOffer error:', err);
        toast({
          title: 'خطأ في الاتصال',
          description: 'حدث خطأ في إنشاء اتصال الصوت',
          variant: 'destructive',
        });
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
      } catch (err) {
        console.error('❌ handleIce error:', err);
      }
    };

    chat.onWebRTCOffer?.(handleOffer);
    chat.onWebRTCIceCandidate?.(handleIce);
    chat.onWebRTCAnswer?.(handleAnswer);

    return () => {
      chat.offWebRTCOffer?.(handleOffer);
      chat.offWebRTCIceCandidate?.(handleIce);
      chat.offWebRTCAnswer?.(handleAnswer);
    };
  }, [isListener, currentUser?.id, room.id, chat, isMuted, toast]);

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
        variant: 'destructive',
      });
      return;
    }

    if (!room?.id) {
      toast({
        title: 'خطأ',
        description: 'معرف الغرفة غير صحيح',
        variant: 'destructive',
      });
      return;
    }

    // التحقق من أن المستخدم لم يطلب المايك بالفعل
    if (isInQueue) {
      toast({
        title: 'تنبيه',
        description: 'أنت بالفعل في قائمة انتظار المايك',
        variant: 'default',
      });
      return;
    }

    if (isSpeaker || isHost) {
      toast({
        title: 'تنبيه',
        description: 'أنت تملك المايك بالفعل',
        variant: 'default',
      });
      return;
    }

    try {
      setIsLoading(true);
      await apiRequest(`/api/rooms/${room.id}/request-mic`, {
        method: 'POST',
        body: { userId: currentUser.id },
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
        variant: 'destructive',
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
      toast({
        title: 'غير مسموح',
        description: 'ليس لديك صلاحية للموافقة على طلبات المايك',
        variant: 'destructive',
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
        body: { approvedBy: currentUser.id },
      });
      toast({
        title: 'تمت الموافقة',
        description: `تمت الموافقة على طلب ${targetUser.username} للمايك`,
      });
      await fetchBroadcastInfo();
    } catch (error: any) {
      console.error('خطأ في الموافقة على المايك:', error);
      toast({
        title: 'خطأ في الموافقة',
        description: error?.message || error?.error || 'حدث خطأ في الموافقة على الطلب',
        variant: 'destructive',
      });
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
      toast({
        title: 'غير مسموح',
        description: 'ليس لديك صلاحية لرفض طلبات المايك',
        variant: 'destructive',
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
        body: { rejectedBy: currentUser.id },
      });
      toast({ title: 'تم الرفض', description: `تم رفض طلب ${targetUser.username} للمايك` });
      await fetchBroadcastInfo();
    } catch (error: any) {
      console.error('خطأ في رفض المايك:', error);
      toast({
        title: 'خطأ في الرفض',
        description: error?.message || error?.error || 'حدث خطأ في رفض الطلب',
        variant: 'destructive',
      });
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
      toast({
        title: 'غير مسموح',
        description: 'ليس لديك صلاحية لإزالة المتحدثين',
        variant: 'destructive',
      });
      return;
    }
    if (userId === broadcastInfo?.hostId) {
      toast({
        title: 'غير مسموح',
        description: 'لا يمكن إزالة مضيف الغرفة من المتحدثين',
        variant: 'destructive',
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
        body: { removedBy: currentUser.id },
      });
      toast({
        title: 'تم الإزالة',
        description: `تم إزالة ${targetUser.username} من المتحدثين بنجاح`,
      });
      await fetchBroadcastInfo();
    } catch (error: any) {
      console.error('خطأ في إزالة المتحدث:', error);
      toast({
        title: 'خطأ في الإزالة',
        description: error?.message || error?.error || 'حدث خطأ في إزالة المتحدث',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // إرسال رسالة - تمت إزالته لصالح MessageArea
  // جلب معلومات المستخدم
  const getUserById = (userId: number) => {
    return onlineUsers.find((user) => user.id === userId);
  };

  // UI Helpers
  const listenerCount = onlineUsers.filter(
    (user) =>
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
    <div className="flex-1 flex min-h-0" style={{ maxHeight: 'calc(100vh - 96px)' }}>
      <div className="flex flex-col flex-1 min-h-0">
        {/* شريط علوي بسيط مماثل لباقي الغرف */}
        <div className="modern-nav px-3 py-2 sm:px-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-primary" />
              <span className="font-semibold text-base">غرفة البث المباشر</span>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {listenerCount} مستمع
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {isListener && playbackBlocked && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    try {
                      audioRef.current?.play();
                      setPlaybackBlocked(false);
                    } catch {}
                  }}
                >
                  <PlayCircle className="w-4 h-4" /> تشغيل الصوت
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsInfoCollapsed((v) => !v)}
                title={isInfoCollapsed ? 'عرض التفاصيل' : 'إخفاء التفاصيل'}
              >
                {isInfoCollapsed ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* لوحة التفاصيل القابلة للطي */}
        {!isInfoCollapsed && (
          <div className="p-3 sm:p-4 border-b bg-muted/30 space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">المضيف:</span>
              {broadcastInfo?.hostId != null && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {getUserById(broadcastInfo.hostId!)?.username || 'غير معروف'}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mic className="w-4 h-4 text-green-500" /> {speakers.length} متحدث
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-orange-500" /> {micQueue.length} انتظار
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4 text-blue-500" /> {listenerCount} مستمع
              </span>
            </div>

            <div className="flex items-start gap-2">
              <Mic className="w-4 h-4 text-green-500 mt-1" />
              <div className="flex-1">
                <span className="font-medium">المتحدثون:</span>
                <div className="mt-1 flex gap-1 flex-wrap">
                  {speakers.map((userId) => {
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
            </div>

            {micQueue.length > 0 && (
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-orange-500 mt-1" />
                <div className="flex-1">
                  <span className="font-medium">قائمة الانتظار:</span>
                  <div className="mt-1 flex gap-1 flex-wrap">
                    {micQueue.map((userId) => {
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
              </div>
            )}

            <div className="hidden">
              <audio
                ref={audioRef}
                playsInline
                autoPlay
                controlsList="nodownload noplaybackrate"
                className="w-0 h-0 opacity-0 pointer-events-none"
              />
            </div>
          </div>
        )}

        {/* شريط تحكم خفيف ومتماسك */}
        <div className="px-3 sm:px-4 py-2 flex flex-wrap items-center gap-2 border-b bg-background/50">
          {canRequestMic && (
            <Button onClick={handleRequestMic} disabled={isLoading} className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              {isLoading ? 'جاري الإرسال...' : 'طلب المايك'}
            </Button>
          )}

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

          {isListener && (
            <Button type="button" onClick={toggleMute} variant="ghost" className="flex items-center gap-2">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
            </Button>
          )}

          {canManageMic && micQueue.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {micQueue.length} في الانتظار
            </Badge>
          )}
        </div>

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
            currentRoomId={room?.id}
            fixedComposer={true}
          />
        </div>
      </div>
    </div>
  );
}
