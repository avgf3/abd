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

// ICE servers helper with enhanced TURN support and fallbacks
const getIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [
    // STUN servers - للاكتشاف الأساسي
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];
  
  try {
    const env = (import.meta as any)?.env || {};
    
    // TURN servers من متغيرات البيئة
    const turnUrl = env?.VITE_TURN_URL || (window as any)?.__TURN_URL__;
    const turnUsername = env?.VITE_TURN_USERNAME || (window as any)?.__TURN_USERNAME__;
    const turnCredential = env?.VITE_TURN_CREDENTIAL || (window as any)?.__TURN_CREDENTIAL__;
    
    if (turnUrl && turnUsername && turnCredential) {
      servers.push({ 
        urls: turnUrl, 
        username: turnUsername, 
        credential: turnCredential 
      });
    }
    
    // TURN servers مجانية كـ fallback
    const freeTurnServers = [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp'
    ];
    
    freeTurnServers.forEach(url => {
      servers.push({ 
        urls: url,
        username: 'openrelayproject',
        credential: 'openrelayproject'
      });
    });
    
  } catch (error) {
    console.warn('خطأ في إعداد ICE servers:', error);
  }
  
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

  // محاولة تشغيل الصوت تلقائياً عند أول تفاعل من المستخدم لتجاوز حظر Autoplay
  useEffect(() => {
    const tryAutoPlayOnce = () => {
      try {
        audioRef.current?.play()?.then(() => setPlaybackBlocked(false)).catch(() => {});
      } catch {}
    };
    try {
      document.addEventListener('click', tryAutoPlayOnce, { once: true, capture: true });
      document.addEventListener('pointerdown', tryAutoPlayOnce, { once: true, capture: true } as any);
      document.addEventListener('keydown', tryAutoPlayOnce, { once: true, capture: true } as any);
      document.addEventListener('touchstart', tryAutoPlayOnce, { once: true, capture: true } as any);
    } catch {}
    return () => {
      try { document.removeEventListener('click', tryAutoPlayOnce, { capture: true } as any); } catch {}
      try { document.removeEventListener('pointerdown', tryAutoPlayOnce, { capture: true } as any); } catch {}
      try { document.removeEventListener('keydown', tryAutoPlayOnce, { capture: true } as any); } catch {}
      try { document.removeEventListener('touchstart', tryAutoPlayOnce, { capture: true } as any); } catch {}
    };
  }, []);

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
  // استبعاد البوتات من الاعتبار كمستمعين فعليين
  const humanOnlineUsers = onlineUsers.filter((u) => (u as any)?.userType !== 'bot');
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
      // التحقق من السياق الآمن
      if (window.isSecureContext) {
        return true;
      }
      
      const host = window.location.hostname;
      const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
      
      if (isLocalhost) {
        return true;
      }
      
      console.warn('⚠️ السياق غير آمن - قد لا يعمل WebRTC');
      return false;
    } catch (error) {
      console.error('خطأ في التحقق من السياق الآمن:', error);
      return false;
    }
  };

  const checkWebRTCSupport = () => {
    try {
      // التحقق من دعم WebRTC
      if (!window.RTCPeerConnection) {
        throw new Error('المتصفح لا يدعم RTCPeerConnection');
      }
      
      if (!navigator.mediaDevices) {
        throw new Error('المتصفح لا يدعم mediaDevices');
      }
      
      if (!navigator.mediaDevices.getUserMedia) {
        throw new Error('المتصفح لا يدعم getUserMedia');
      }
      
      return true;
    } catch (error) {
      console.error('❌ المتصفح لا يدعم WebRTC:', error);
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

    // قائمة constraints متدرجة من الأفضل للأبسط
    const constraintsList: MediaStreamConstraints[] = [
      // جودة عالية مع معالجة متقدمة
      {
        audio: {
          deviceId: undefined, // استخدام الجهاز الافتراضي
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
          latency: 0.01,
        } as MediaTrackConstraints,
        video: false,
      },
      // جودة متوسطة
      {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 44100,
        } as MediaTrackConstraints,
        video: false,
      },
      // جودة منخفضة
      {
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        } as MediaTrackConstraints,
        video: false,
      },
      // أبسط constraint ممكن
      { audio: true, video: false },
    ];

    let lastError: any = null;
    
    for (let i = 0; i < constraintsList.length; i++) {
      const constraints = constraintsList[i];
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // التحقق من صحة الـ stream
        if (!stream || stream.getAudioTracks().length === 0) {
          throw new Error('لم يتم الحصول على مسارات صوتية صحيحة');
        }
        
        // تأكد من تفعيل جميع المسارات الصوتية
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true;
          });
        
        return stream;
        
      } catch (err: any) {
        lastError = err;
        console.warn(`فشل في المستوى ${i + 1}:`, err.name, err.message);
        
        // إذا كان الخطأ نهائي (مثل NotAllowedError)، توقف عن المحاولة
        const errorName = err?.name || '';
        if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
          break;
        }
        
        // إذا كان الخطأ بسبب عدم وجود جهاز، توقف
        if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
          break;
        }
        
        // استمر في المحاولة مع constraint أبسط
      }
    }

    // معالجة الأخطاء مع رسائل واضحة
    const errorName = lastError?.name || 'Error';
    const errorMessage = lastError?.message || '';
    
    switch (errorName) {
      case 'NotAllowedError':
        throw new Error('تم رفض إذن الميكروفون. يرجى السماح بالوصول للميكروفون في إعدادات المتصفح ثم إعادة تحميل الصفحة.');
      
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        throw new Error('لم يتم العثور على جهاز ميكروفون متاح. تأكد من توصيل الميكروفون أو اختيار الجهاز الصحيح في إعدادات المتصفح.');
      
      case 'NotReadableError':
        throw new Error('يتعذر الوصول إلى الميكروفون (قد يكون مشغولاً بتطبيق آخر). أغلق التطبيقات الأخرى التي تستخدم الميكروفون وحاول مجدداً.');
      
      case 'OverconstrainedError':
        throw new Error('إعدادات الميكروفون غير مدعومة على هذا الجهاز. سيتم استخدام إعدادات أبسط.');
      
      case 'SecurityError':
        throw new Error('لا يمكن الوصول إلى الميكروفون بسبب إعدادات الأمان. تأكد من استخدام اتصال آمن (HTTPS) أو localhost.');
      
      case 'AbortError':
        throw new Error('تم إلغاء طلب الميكروفون. حاول مرة أخرى.');
      
      case 'TypeError':
        throw new Error('خطأ في نوع البيانات. تأكد من أن المتصفح يدعم WebRTC.');
      
      default:
        throw new Error(`تعذر الحصول على صوت من الميكروفون: ${errorMessage || errorName}`);
    }
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
      // 1. فحص السياق الآمن
      if (!isSecureContext()) {
        throw new Error('يتطلب الميكروفون اتصالاً آمناً. افتح الموقع عبر HTTPS (أو محلياً على localhost).');
      }
      
      // 2. فحص دعم WebRTC
      if (!checkWebRTCSupport()) {
        throw new Error('المتصفح لا يدعم WebRTC. يرجى استخدام متصفح حديث.');
      }
      
      // 3. فحص أذونات الميكروفون
      const perm = await queryMicrophonePermission();
      if (perm === 'denied') {
        throw new Error('تم رفض إذن الميكروفون. افتح إعدادات الموقع ومنح الإذن ثم أعد تحميل الصفحة.');
      }
      
      // 4. فحص وجود جهاز ميكروفون
      const hasInput = await hasAudioInputDevice();
      if (!hasInput) {
        throw new Error('لا يوجد جهاز ميكروفون متاح على هذا الجهاز.');
      }
      
      // 5. الحصول على الميكروفون
      const stream = await getUserMediaWithFallbacks();
      setLocalStream(stream);
      setIsBroadcasting(true);
      
      // 6. إنشاء اتصالات مع المستمعين
      const listeners = humanOnlineUsers.filter(
        (u) => u.id !== currentUser.id && !speakers.includes(u.id) && u.id !== broadcastInfo?.hostId
      );
      
      for (const listener of listeners) {
        try {
          const pc = new RTCPeerConnection({ iceServers: getIceServers() });
          
          // إضافة مراقبة حالة الاتصال
          pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed') {
              toast({
                title: 'مشكلة في الاتصال',
                description: `فشل الاتصال مع ${listener.username}`,
                variant: 'destructive',
              });
            } else if (pc.connectionState === 'connected') {
              }
          };
          
          pc.oniceconnectionstatechange = () => {
            };
          
          // إضافة مسارات الصوت
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
            });
          
          // إرسال ICE candidates
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              chat.sendWebRTCIceCandidate?.(listener.id, room.id, event.candidate);
            }
          };
          
          peersRef.current.set(listener.id, pc);
          
          // إنشاء وإرسال العرض
          const offer = await pc.createOffer({ offerToReceiveAudio: false });
          await pc.setLocalDescription(offer);
          
          chat.sendWebRTCOffer?.(listener.id, room.id, offer);
          
        } catch (error) {
          console.error(`❌ خطأ في إنشاء اتصال مع ${listener.username}:`, error);
        }
      }
      
      toast({
        title: 'بدأ البث الصوتي',
        description: `تم بدء البث الصوتي بنجاح لـ ${listeners.length} مستمع`,
      });
      
      } catch (err) {
      console.error('❌ خطأ في بدء البث:', err);
      explainStartBroadcastError(err);
    }
  }, [currentUser, room.id, onlineUsers, speakers, broadcastInfo?.hostId, chat, toast]);

  // While broadcasting, send offers to any new listeners who appear later
  useEffect(() => {
    const run = async () => {
      if (!isBroadcasting || !localStream || !currentUser || !room.id) return;
      const listeners = humanOnlineUsers.filter(
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

          pc.ontrack = async (event) => {
            if (!audioRef.current) {
              console.warn('⚠️ عنصر الصوت غير متاح بعد. سيتم المحاولة لاحقاً.');
              return;
            }

            const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
            if (!stream) {
              console.warn('⚠️ لم يتم استقبال stream صحيح');
              return;
            }

            // التحقق من وجود مسارات صوتية
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
              console.warn('⚠️ لا توجد مسارات صوتية في الـ stream');
              return;
            }

            // تعيين الـ stream للعنصر الصوتي
            if (audioRef.current.srcObject !== stream) {
              audioRef.current.srcObject = stream;
            }

            // تأكد من عدم كتم الصوت افتراضياً
            audioRef.current.muted = false;
            audioRef.current.volume = 1.0;

            // محاولة تشغيل الصوت مع معالجة الأخطاء
            try {
              await audioRef.current.play();
              setPlaybackBlocked(false);
              audioRef.current?.addEventListener('canplay', () => {
                });
              audioRef.current?.addEventListener('playing', () => {
                });
              audioRef.current?.addEventListener('error', (e) => {
                console.error('❌ خطأ في تشغيل الصوت:', e);
              });
            } catch (err) {
              console.error('❌ فشل في تشغيل الصوت:', err);
              setPlaybackBlocked(true);
              toast({
                title: 'تشغيل الصوت محظور',
                description: 'اضغط على زر "تشغيل الصوت" للسماح بالتشغيل',
                variant: 'default',
              });
            }
          };
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              chat.sendWebRTCIceCandidate?.(fromUserId, room.id, event.candidate);
            }
          };
          peersRef.current.set(fromUserId, pc);
        }
        try { pc.addTransceiver('audio', { direction: 'recvonly' }); } catch {}
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
  const listenerCount = humanOnlineUsers.filter(
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
    <div className="flex-1 flex flex-col min-h-0">
      {/* عنصر صوتي مخفي مخصص لتشغيل صوت البث لدى المستمعين، مهيأ دائماً */}
      <div className="hidden">
        <audio
          ref={audioRef}
          playsInline
          autoPlay
          controlsList="nodownload noplaybackrate"
          onLoadedMetadata={() => {
            try {
              setPlaybackBlocked(false);
            } catch {}
          }}
        >
        </audio>
            
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
        <div className="p-3 sm:p-4 border-b bg-muted/30 space-y-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-500" />
            <span className="font-medium">المضيف:</span>
            {broadcastInfo?.hostId != null && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {getUserById(broadcastInfo.hostId!)?.username || ''}
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

          
        </div>
      )}

      {/* شريط تحكم خفيف ومتماسك - يظهر على الجوال فقط */}
      <div className="px-3 sm:px-4 py-2 flex flex-wrap items-center gap-2 border-b bg-background/50 sm:hidden flex-shrink-0">
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

      {/* تخطيط سطح المكتب: عمود جانبي يسار + منطقة الرسائل */}
      <div className="flex-1 min-h-0 flex">
        {/* منطقة الرسائل */}
        <div className="flex-1 min-h-0 flex flex-col">
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
            chatLockAll={room?.chatLockAll}
            chatLockVisitors={room?.chatLockVisitors}
          />
        </div>

        {/* عمود التحكم الجانبي - يظهر على الشاشات المتوسطة فما فوق, يوضع يساراً في RTL بترتيب العناصر */}
        <div className="hidden sm:flex flex-col gap-2 w-56 lg:w-64 border-l bg-background/50 p-3">
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
              className="justify-start"
            >
              <PlayCircle className="w-4 h-4" /> تشغيل الصوت
            </Button>
          )}

          {canRequestMic && (
            <Button onClick={handleRequestMic} disabled={isLoading} className="w-full justify-start">
              <Mic className="w-4 h-4" />
              {isLoading ? 'جاري الإرسال...' : 'طلب المايك'}
            </Button>
          )}

          {canSpeak && !isBroadcasting && (
            <Button onClick={startBroadcast} className="w-full justify-start">
              <Mic className="w-4 h-4" /> بدء البث الصوتي
            </Button>
          )}
          {canSpeak && isBroadcasting && (
            <Button variant="outline" onClick={stopBroadcast} className="w-full justify-start">
              <MicOff className="w-4 h-4" /> إيقاف البث الصوتي
            </Button>
          )}

          {isInQueue && (
            <Button variant="outline" disabled className="w-full justify-start">
              <Clock className="w-4 h-4 animate-pulse" /> في قائمة الانتظار
            </Button>
          )}

          {canSpeak && (
            <div className="w-full flex items-center gap-2 justify-start text-xs px-2 py-1 rounded border bg-muted/40">
              <Mic className="w-3 h-3 text-green-500" /> {isHost ? 'أنت المضيف' : 'يمكنك التحدث'}
            </div>
          )}

          {isListener && (
            <Button type="button" onClick={toggleMute} variant="ghost" className="w-full justify-start">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
            </Button>
          )}

          {canManageMic && micQueue.length > 0 && (
            <div className="w-full flex items-center gap-2 justify-start text-xs px-2 py-1 rounded border bg-muted/40">
              <Clock className="w-3 h-3" /> {micQueue.length} في الانتظار
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
