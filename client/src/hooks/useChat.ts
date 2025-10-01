import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import type { Socket } from 'socket.io-client';

import type { PrivateConversation } from '../../../shared/types';

import { apiRequest, queryClient } from '@/lib/queryClient';
import { connectSocket, saveSession, clearSession, getSession } from '@/lib/socket';
import type { ChatUser, ChatMessage } from '@/types/chat';
import type { Notification } from '@/types/chat';
import { mapDbMessagesToChatMessages } from '@/utils/messageUtils';
import { userCache, setCachedUser } from '@/utils/userCacheManager';

// Audio notification function
const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gain.gain.setValueAtTime(0.001, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.03, audioContext.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch {
        // Silent fail
      }
    });
  } catch {
    // Silent fail
  }
};

// 🔥 SIMPLIFIED State interface - حذف التعقيدات
interface ChatState {
  currentUser: ChatUser | null;
  onlineUsers: ChatUser[];
  currentRoomId: string;
  roomMessages: Record<string, ChatMessage[]>; // ✅ مصدر واحد للحقيقة
  privateConversations: PrivateConversation;
  ignoredUsers: Set<number>;
  isConnected: boolean;
  typingUsers: Set<string>;
  connectionError: string | null;
  newMessageSender: ChatUser | null;
  isLoading: boolean;
  notifications: Notification[];
  showKickCountdown: boolean;
  globalSoundEnabled: boolean;
  showSystemMessages: boolean;
}

// 🔥 SIMPLIFIED Action types - حذف التضارب
type ChatAction =
  | { type: 'SET_CURRENT_USER'; payload: ChatUser | null }
  | { type: 'SET_ONLINE_USERS'; payload: ChatUser[] }
  | { type: 'SET_ROOM_MESSAGES'; payload: { roomId: string; messages: ChatMessage[] } }
  | { type: 'ADD_ROOM_MESSAGE'; payload: { roomId: string; message: ChatMessage } }
  | { type: 'SET_PRIVATE_MESSAGE'; payload: { userId: number; message: ChatMessage } }
  | { type: 'SET_PRIVATE_CONVERSATION'; payload: { userId: number; messages: ChatMessage[] } }
  | { type: 'PREPEND_PRIVATE_MESSAGES'; payload: { userId: number; messages: ChatMessage[] } }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_TYPING_USERS'; payload: Set<string> }
  | { type: 'SET_CONNECTION_ERROR'; payload: string | null }
  | { type: 'SET_NEW_MESSAGE_SENDER'; payload: ChatUser | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'SET_CURRENT_ROOM'; payload: string }
  | { type: 'SET_SHOW_KICK_COUNTDOWN'; payload: boolean }
  | { type: 'IGNORE_USER'; payload: number }
  | { type: 'UNIGNORE_USER'; payload: number }
  | { type: 'CLEAR_ALL'; payload: void }
  | { type: 'UPSERT_ONLINE_USER'; payload: ChatUser }
  | { type: 'REMOVE_ONLINE_USER'; payload: number };

type ReactionCounts = { like: number; dislike: number; heart: number };

// 🔥 SIMPLIFIED Initial state
const initialState: ChatState = {
  currentUser: null,
  onlineUsers: [],
  currentRoomId: '',
  roomMessages: {},
  privateConversations: {},
  ignoredUsers: new Set(),
  isConnected: false,
  typingUsers: new Set(),
  connectionError: null,
  newMessageSender: null,
  isLoading: false,
  notifications: [],
  showKickCountdown: false,
  globalSoundEnabled: true,
  showSystemMessages: true,
};

// 🔥 SIMPLIFIED Reducer function - حذف التعقيدات والتضارب
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CURRENT_USER':
      return {
        ...state,
        currentUser: action.payload,
        globalSoundEnabled:
          typeof (action.payload as any)?.globalSoundEnabled === 'boolean'
            ? (action.payload as any).globalSoundEnabled
            : state.globalSoundEnabled,
        showSystemMessages:
          typeof (action.payload as any)?.showSystemMessages === 'boolean'
            ? (action.payload as any).showSystemMessages
            : state.showSystemMessages,
      };

    case 'SET_ONLINE_USERS': {
      // تحديث الكاش مع قائمة المستخدمين الجديدة
      action.payload.forEach(user => {
        if (user && user.id && user.username) {
          setCachedUser(user);
        }
      });
      // تحديث حالة الاتصال في الكاش
      userCache.updateOnlineStatus(action.payload.map(u => u.id));
      return { ...state, onlineUsers: action.payload };
    }

    case 'SET_ROOM_MESSAGES': {
      const { roomId, messages } = action.payload;
      return {
        ...state,
        roomMessages: { ...state.roomMessages, [roomId]: messages },
      };
    }

    case 'ADD_ROOM_MESSAGE': {
      const { roomId, message } = action.payload;
      const existingMessages = state.roomMessages[roomId] || [];

      // ✅ فحص بسيط للتكرار بناءً على ID أو timestamp+content
      const isDuplicate = existingMessages.some(
        (msg) =>
          msg.id === message.id ||
          (msg.timestamp === message.timestamp &&
            msg.senderId === message.senderId &&
            msg.content === message.content)
      );

      if (isDuplicate) {
        return state; // لا نضيف الرسالة المكررة
      }

      // إخفاء رسائل النظام إذا كان المستخدم يفضل إخفاءها
      if (message.messageType === 'system' && state.showSystemMessages === false) {
        return state;
      }

      return {
        ...state,
        roomMessages: {
          ...state.roomMessages,
          [roomId]: [...existingMessages, message],
        },
      };
    }

    // ملاحظة: تحديثات التفاعلات تُطبّق داخل مستمع السوكت مباشرة عبر dispatch SET_ROOM_MESSAGES

    case 'SET_PRIVATE_MESSAGE': {
      const { userId, message } = action.payload;
      const existingMessages = state.privateConversations[userId] || [];

      // منع التكرار - التحقق من وجود الرسالة بنفس ID أو نفس المحتوى والوقت
      const isDuplicate = existingMessages.some(
        (msg) =>
          (message.id && msg.id === message.id) ||
          (msg.content === message.content &&
            msg.senderId === message.senderId &&
            Math.abs(new Date(msg.timestamp).getTime() - new Date(message.timestamp).getTime()) <
              1000)
      );

      if (isDuplicate) {
        return state; // تجاهل الرسالة المكررة
      }

      return {
        ...state,
        privateConversations: {
          ...state.privateConversations,
          [userId]: [...existingMessages, message],
        },
      };
    }

    case 'SET_PRIVATE_CONVERSATION': {
      const { userId, messages } = action.payload;
      // إزالة التكرارات بناءً على ID الرسالة
      const uniqueMessages = messages.reduce((acc: ChatMessage[], msg) => {
        const exists = acc.some(
          (m) =>
            (msg.id && m.id === msg.id) ||
            (m.content === msg.content &&
              m.senderId === msg.senderId &&
              Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 1000)
        );
        if (!exists) {
          acc.push(msg);
        }
        return acc;
      }, []);

      return {
        ...state,
        privateConversations: {
          ...state.privateConversations,
          [userId]: uniqueMessages,
        },
      };
    }

    case 'PREPEND_PRIVATE_MESSAGES': {
      const { userId, messages } = action.payload;
      const existing = state.privateConversations[userId] || [];
      const existingIds = new Set(existing.map((m) => m.id));
      const toPrepend = messages.filter((m) => !existingIds.has(m.id));
      return {
        ...state,
        privateConversations: {
          ...state.privateConversations,
          [userId]: [...toPrepend, ...existing],
        },
      };
    }

    case 'UPSERT_ONLINE_USER': {
      const incoming = action.payload;
      if (!incoming || !incoming.id) {
        return state;
      }
      
      // تحديث الكاش مع بيانات المستخدم الجديدة
      if (incoming.username) {
        setCachedUser(incoming);
      }
      const existingIndex = state.onlineUsers.findIndex((u) => u.id === incoming.id);
      if (existingIndex === -1) {
        // لا تضف مستخدمًا جديدًا إذا كانت البيانات منقوصة (تحديث جزئي مثل اللون/التأثير)
        const hasMinimum = !!(incoming.username && incoming.userType);
        if (!hasMinimum) {
          return state;
        }
        return { ...state, onlineUsers: [...state.onlineUsers, incoming] };
      }
      const merged = { ...state.onlineUsers[existingIndex], ...incoming } as ChatUser;
      const next = state.onlineUsers.slice();
      next[existingIndex] = merged;
      return { ...state, onlineUsers: next };
    }

    case 'REMOVE_ONLINE_USER': {
      const userId = action.payload;
      return { ...state, onlineUsers: state.onlineUsers.filter((u) => u.id !== userId) };
    }

    case 'SET_CONNECTION_STATUS':
      return { ...state, isConnected: action.payload };

    case 'SET_TYPING_USERS':
      return { ...state, typingUsers: action.payload };

    case 'SET_CONNECTION_ERROR':
      return { ...state, connectionError: action.payload };

    case 'SET_NEW_MESSAGE_SENDER':
      return { ...state, newMessageSender: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };

    case 'SET_CURRENT_ROOM':
      return { ...state, currentRoomId: action.payload };

    case 'SET_SHOW_KICK_COUNTDOWN':
      return { ...state, showKickCountdown: action.payload };

    case 'IGNORE_USER':
      return {
        ...state,
        ignoredUsers: new Set([...state.ignoredUsers, action.payload]),
      };

    case 'UNIGNORE_USER': {
      const newIgnoredUsers = new Set(state.ignoredUsers);
      newIgnoredUsers.delete(action.payload);
      return { ...state, ignoredUsers: newIgnoredUsers };
    }

    case 'CLEAR_ALL':
      return { ...initialState };

    default:
      return state;
  }
}

export const useChat = () => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const socket = useRef<Socket | null>(null);

  // 🔥 SIMPLIFIED loading management - مصدر واحد
  const loadingRooms = useRef<Set<string>>(new Set());

  // Broadcast handlers registry
  const broadcastHandlers = useRef<Set<(data: any) => void>>(new Set());

  // WebRTC signaling handlers registries
  const webrtcOfferHandlers = useRef<Set<(data: any) => void>>(new Set());
  const webrtcAnswerHandlers = useRef<Set<(data: any) => void>>(new Set());
  const webrtcIceHandlers = useRef<Set<(data: any) => void>>(new Set());

  // Notification states
  const [levelUpNotification, setLevelUpNotification] = useState<any>(null);
  const [achievementNotification, setAchievementNotification] = useState<any>(null);
  const [dailyBonusNotification, setDailyBonusNotification] = useState<any>(null);

  // Refs to avoid stale closures in socket listeners
  const currentUserRef = useRef<ChatUser | null>(null);
  const currentRoomIdRef = useRef<string>(initialState.currentRoomId);
  const ignoredUsersRef = useRef<Set<number>>(new Set());
  const roomMessagesRef = useRef<Record<string, ChatMessage[]>>({});
  const typingTimersRef = useRef<Map<number, number>>(new Map());
  // Throttle لمنع إرسال joinRoom أكثر من مرة خلال نافذة زمنية قصيرة
  const lastJoinEmitTsRef = useRef<number>(0);
  // Prevent duplicate handling for kick/ban events and centralize navigation
  const kickHandledRef = useRef<boolean>(false);
  // Track pending room join request if requested before socket connects
  const pendingJoinRoomRef = useRef<string | null>(null);

  useEffect(() => {
    currentUserRef.current = state.currentUser;
  }, [state.currentUser]);
  useEffect(() => {
    currentRoomIdRef.current = state.currentRoomId;
  }, [state.currentRoomId]);
  useEffect(() => {
    ignoredUsersRef.current = state.ignoredUsers;
  }, [state.ignoredUsers]);
  useEffect(() => {
    roomMessagesRef.current = state.roomMessages;
  }, [state.roomMessages]);

  // ✅ Memoized current room messages - حل مشكلة الـ performance
  const currentRoomMessages = useMemo(() => {
    return state.roomMessages[state.currentRoomId] || [];
  }, [state.roomMessages, state.currentRoomId]);

  // ✅ Memoized online users
  const memoizedOnlineUsers = useMemo(() => {
    const filtered = state.onlineUsers.filter(
      (user) =>
        user && user.id && user.username && user.userType && !state.ignoredUsers.has(user.id)
    );
    // إزالة التكرارات
    const dedup = new Map<number, ChatUser>();
    for (const u of filtered) {
      if (!dedup.has(u.id)) dedup.set(u.id, u);
    }
    return Array.from(dedup.values());
  }, [state.onlineUsers, state.ignoredUsers]);

  // 🔥 SIMPLIFIED Message loading - حذف التعقيدات
  const loadRoomMessages = useCallback(
    async (roomId: string, forceReload: boolean = false) => {
      // نعتمد الآن على Socket لإرسال آخر الرسائل عند الانضمام،
      // لكن نُبقي هذا كنسخة احتياطية سريعة تطلب 12 رسالة فقط.

      if (!forceReload && state.roomMessages[roomId]?.length > 0) {
        return;
      }

      if (loadingRooms.current.has(roomId)) {
        return;
      }

      loadingRooms.current.add(roomId);

      try {
        const data = await apiRequest(`/api/messages/room/${roomId}/latest?limit=12`);

        if (data?.messages && Array.isArray(data.messages)) {
          const formattedMessages = mapDbMessagesToChatMessages(data.messages, roomId);
          dispatch({
            type: 'SET_ROOM_MESSAGES',
            payload: { roomId, messages: formattedMessages },
          });
        }
      } catch (error) {
        console.error(`❌ خطأ في تحميل رسائل الغرفة ${roomId}:`, error);
      } finally {
        loadingRooms.current.delete(roomId);
      }
    },
    [state.roomMessages]
  );

  // Track ping interval to avoid leaks
  const pingIntervalRef = useRef<number | null>(null);
  const backgroundPingIntervalRef = useRef<number | null>(null);
  const isBackgroundRef = useRef<boolean>(false);
  const socketWorkerRef = useRef<Worker | null>(null);
  const serviceWorkerRef = useRef<ServiceWorker | null>(null);

  // 🔥 SIMPLIFIED Socket event handling - حذف التضارب
  const setupSocketListeners = useCallback((socketInstance: Socket) => {
    // 🔥 تهيئة Service Worker للحفاظ على الاتصال في الخلفية
    const initServiceWorker = async () => {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          serviceWorkerRef.current = navigator.serviceWorker.controller;
          
          // إعداد معالج رسائل Service Worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            const { type, data } = event.data;
            
            switch (type) {
              case 'background-ping-success':
                console.log('✅ Service Worker: ping نجح في الخلفية');
                break;
            }
          });
          
          // تهيئة Service Worker
          serviceWorkerRef.current.postMessage({
            type: 'init-background-sync',
            data: { serverUrl: window.location.origin }
          });
          
          console.log('🚀 تم تهيئة Service Worker للـ Socket.IO');
        }
      } catch (error) {
        console.warn('⚠️ لا يمكن تهيئة Service Worker:', error);
      }
    };
    
    // تهيئة Service Worker
    initServiceWorker();
    
    // 🔥 تهيئة Web Worker للحفاظ على الاتصال في الخلفية
    const initSocketWorker = () => {
      try {
        if (typeof Worker !== 'undefined' && !socketWorkerRef.current) {
          socketWorkerRef.current = new Worker('/socket-worker.js');
          
          // معالجة رسائل Web Worker
          socketWorkerRef.current.onmessage = (event) => {
            const { type, data } = event.data;
            
            switch (type) {
              case 'send-ping':
                // إرسال ping للخادم
                if (socketInstance.connected) {
                  socketInstance.emit('client_ping');
                }
                break;
                
              case 'worker-ready':
                console.log('🔧 Web Worker جاهز للعمل');
                break;
                
              case 'worker-error':
                console.error('❌ خطأ في Web Worker:', data.error);
                break;
            }
          };
          
          // تهيئة Web Worker
          socketWorkerRef.current.postMessage({
            type: 'init',
            data: { pingInterval: 20000 }
          });
          
          console.log('🚀 تم تهيئة Web Worker للـ Socket.IO');
        }
      } catch (error) {
        console.warn('⚠️ لا يمكن تهيئة Web Worker:', error);
      }
    };
    
    // تهيئة Web Worker
    initSocketWorker();
    // مزامنة حالة الاتصال مع Web Worker ليعرف متى يُرسل ping
    try {
      socketInstance.on('connect', () => {
        try {
          if (socketWorkerRef.current) {
            socketWorkerRef.current.postMessage({
              type: 'socket-status',
              data: { connected: true },
            });
          }
        } catch {}
      });
      socketInstance.on('disconnect', () => {
        try {
          if (socketWorkerRef.current) {
            socketWorkerRef.current.postMessage({
              type: 'socket-status',
              data: { connected: false },
            });
          }
        } catch {}
      });
      socketInstance.on('connect_error', () => {
        try {
          if (socketWorkerRef.current) {
            socketWorkerRef.current.postMessage({
              type: 'socket-status',
              data: { connected: false },
            });
          }
        } catch {}
      });
    } catch {}

    
    // 🔥 حافظ على الاتصال عبر ping/pong محسّن مع قياس الكمون
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (backgroundPingIntervalRef.current) {
      clearInterval(backgroundPingIntervalRef.current);
    }
    
    let lastPingTime = 0;
    
    // 🔥 نظام ping/pong ذكي يتكيف مع حالة الصفحة
    const startPing = (interval: number) => {
      const pingId = window.setInterval(() => {
        if (socketInstance.connected) {
          lastPingTime = Date.now();
          socketInstance.emit('client_ping');
        }
      }, interval);
      return pingId;
    };
    
    // بدء ping عادي (كل 20 ثانية)
    pingIntervalRef.current = startPing(20000);
    
    // 🔥 قياس الكمون وتسجيل حالة الاتصال
    socketInstance.on('client_pong', (data: any) => {
      if (lastPingTime > 0) {
        const latency = Date.now() - lastPingTime;
        // تسجيل الكمون للتشخيص (في بيئة التطوير فقط)
        if ((import.meta as any)?.env?.DEV && latency > 1000) {
          console.warn(`⚠️ كمون عالي: ${latency}ms`);
        }
      }
    });

    // 🔥 معالجات Page Visibility API للحفاظ على الاتصال في الخلفية
    const handleVisibilityChange = () => {
      if (document.hidden && !isBackgroundRef.current) {
        // الصفحة أصبحت في الخلفية - استخدام Web Worker للping
        isBackgroundRef.current = true;
        console.log('🔄 الصفحة في الخلفية - تفعيل Web Worker للping');
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        // تفعيل Web Worker و Service Worker للping في الخلفية
        if (socketWorkerRef.current) {
          socketWorkerRef.current.postMessage({
            type: 'start-ping',
            data: { interval: 60000 } // ping كل 60 ثانية في الخلفية
          });
        }
        
        if (serviceWorkerRef.current) {
          serviceWorkerRef.current.postMessage({
            type: 'start-background-ping',
            data: { interval: 60000 } // ping كل 60 ثانية في الخلفية
          });
        }
        
        if (!socketWorkerRef.current && !serviceWorkerRef.current) {
          // fallback إلى ping أبطأ إذا لم يتوفر Web Worker أو Service Worker
          backgroundPingIntervalRef.current = startPing(60000);
        }
        
      } else if (!document.hidden && isBackgroundRef.current) {
        // الصفحة عادت للمقدمة - إيقاف Web Worker واستعادة ping العادي
        isBackgroundRef.current = false;
        console.log('🔄 الصفحة في المقدمة - إيقاف Web Worker واستعادة ping العادي');
        
        // إيقاف Web Worker و Service Worker
        if (socketWorkerRef.current) {
          socketWorkerRef.current.postMessage({
            type: 'stop-ping',
            data: {}
          });
        }
        
        if (serviceWorkerRef.current) {
          serviceWorkerRef.current.postMessage({
            type: 'stop-background-ping',
            data: {}
          });
        }
        
        if (backgroundPingIntervalRef.current) {
          clearInterval(backgroundPingIntervalRef.current);
        }
        // ping عادي في المقدمة (كل 20 ثانية)
        pingIntervalRef.current = startPing(20000);

        // حاول إعادة الاتصال فور العودة إذا كان الاتصال مقطوعاً
        try {
          if (!socketInstance.connected) {
            socketInstance.connect();
          }
        } catch {}
      }
    };

    // إضافة معالج Page Visibility
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // دعم أفضل لدورة حياة الصفحة على الأجهزة المحمولة: pageshow/pagehide
    const handlePageShow = () => {
      try {
        if (socket.current && !socket.current.connected) {
          socket.current.connect();
        }
      } catch {}
    };
    const handlePageHide = () => {
      try {
        // تأكيد تفعيل الping في الخلفية عند الانتقال للخلفية
        if (socketWorkerRef.current) {
          socketWorkerRef.current.postMessage({ type: 'start-ping', data: { interval: 60000 } });
        }
        if (serviceWorkerRef.current) {
          serviceWorkerRef.current.postMessage({ type: 'start-background-ping', data: { interval: 60000 } });
        }
      } catch {}
    };
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pagehide', handlePageHide);
    
    // تنظيف معالج Page Visibility عند إغلاق Socket
    const originalDisconnect = socketInstance.disconnect;
    socketInstance.disconnect = function() {
      try {
        if (socketWorkerRef.current) {
          socketWorkerRef.current.postMessage({
            type: 'socket-status',
            data: { connected: false },
          });
        }
      } catch {}
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      try { window.removeEventListener('pageshow', handlePageShow); } catch {}
      try { window.removeEventListener('pagehide', handlePageHide); } catch {}
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (backgroundPingIntervalRef.current) {
        clearInterval(backgroundPingIntervalRef.current);
      }
      // تنظيف Web Worker و Service Worker
      if (socketWorkerRef.current) {
        socketWorkerRef.current.postMessage({ type: 'cleanup' });
        socketWorkerRef.current.terminate();
        socketWorkerRef.current = null;
      }
      
      if (serviceWorkerRef.current) {
        serviceWorkerRef.current.postMessage({
          type: 'stop-background-ping',
          data: {}
        });
        serviceWorkerRef.current = null;
      }
      return originalDisconnect.call(this);
    };

    // بعد المصادقة الناجحة من الخادم، انضم تلقائياً للغرفة المطلوبة أو العامة
    socketInstance.on('authenticated', () => {
      try {
        let desired = (
          pendingJoinRoomRef.current ||
          (() => {
            try { return getSession()?.roomId as string | undefined; } catch { return undefined; }
          })() ||
          currentRoomIdRef.current ||
          'general'
        );
        // تجاهل معرفات غير صالحة وتحويلها للغرفة العامة
        if (desired === 'public' || desired === 'friends' || !desired?.trim()) {
          desired = 'general';
        }
        if (!currentUserRef.current) return;
        // إذا كان هناك طلب انضمام جارٍ أو نحن بالفعل في نفس الغرفة، لا ترسل
        if (pendingJoinRoomRef.current !== null) return;
        if (currentRoomIdRef.current && currentRoomIdRef.current === desired) return;
        // Throttle: امنع التكرار خلال نافذة قصيرة
        const now = Date.now();
        if (now - lastJoinEmitTsRef.current < 1500) return;
        pendingJoinRoomRef.current = desired;
        lastJoinEmitTsRef.current = now;
        socketInstance.emit('joinRoom', {
          roomId: desired,
          userId: currentUserRef.current.id,
          username: currentUserRef.current.username,
        });
      } catch {}
    });

    // لم نعد نستخدم polling لقائمة المتصلين؛ السيرفر يبث التحديثات مباشرة

    // ✅ استقبال إشعار جديد مباشر من الخادم وتحديث الواجهة فوراً
    socketInstance.on('newNotification', (payload: any) => {
      try {
        // أبلغ نظام الإشعارات لتحديث الكاش والعداد مباشرة
        const detail = { notification: payload?.notification } as any;
        window.dispatchEvent(new CustomEvent('notificationReceived', { detail }));
        // زيادة فورية لعداد الإشعارات غير المقروءة في واجهة المستخدم
        try {
          const userId = currentUserRef.current?.id;
          if (userId) {
            const { queryClient } = require('@/lib/queryClient');
            const qc = queryClient as import('@tanstack/react-query').QueryClient;
            const key = ['/api/notifications/unread-count', userId];
            const old = qc.getQueryData(key) as any;
            const current = typeof old?.count === 'number' ? old.count : 0;
            qc.setQueryData(key, { count: current + 1 });
          }
        } catch {}
      } catch {}
    });

    // ✅ معالج واحد للرسائل - حذف التضارب
    socketInstance.on('message', (data: any) => {
      try {
        const envelope = data.envelope || data;

        // تم إزالة مسار authenticated داخل قناة message لتجنّب انضمام مكرر

        // تحديث تأثير البروفايل فقط عند وصول بث profileEffectChanged
        if (envelope.type === 'profileEffectChanged') {
          const { userId, profileEffect, user } = envelope as any;
          const targetId = userId || user?.id;
          if (targetId) {
            if (currentUserRef.current?.id === targetId) {
              dispatch({
                type: 'SET_CURRENT_USER',
                payload: {
                  ...currentUserRef.current!,
                  profileEffect:
                    profileEffect ?? user?.profileEffect ?? currentUserRef.current?.profileEffect,
                } as any,
              });
            }
            dispatch({
              type: 'UPSERT_ONLINE_USER',
              payload: { id: targetId, profileEffect: profileEffect ?? user?.profileEffect } as any,
            });
          }
        }

        // إشعار نظامي عام يصل عبر قناة الرسائل الموحدة
        if (envelope.type === 'systemNotification') {
          try {
            const detail = { notification: (envelope as any).notification } as any;
            window.dispatchEvent(new CustomEvent('notificationReceived', { detail }));
          } catch {}
        }

        // بث خاص لتحديث لون الاسم فقط
        if (envelope.type === 'usernameColorChanged') {
          const { userId, color, user } = envelope as any;
          const targetId = userId || user?.id;
          if (targetId && color) {
            if (currentUserRef.current?.id === targetId) {
              dispatch({
                type: 'SET_CURRENT_USER',
                payload: { ...currentUserRef.current!, usernameColor: color } as any,
              });
            }
            dispatch({
              type: 'UPSERT_ONLINE_USER',
              payload: { id: targetId, usernameColor: color } as any,
            });
          }
        }

        // تحديث لون صندوق المستخدم (profileBackgroundColor)
        if (envelope.type === 'user_background_updated') {
          const { data } = envelope as any;
          const targetId = data?.userId;
          const color = data?.profileBackgroundColor;
          if (targetId && color) {
            if (currentUserRef.current?.id === targetId) {
              dispatch({
                type: 'SET_CURRENT_USER',
                payload: { ...currentUserRef.current!, profileBackgroundColor: color } as any,
              });
            }
            dispatch({
              type: 'UPSERT_ONLINE_USER',
              payload: { id: targetId, profileBackgroundColor: color } as any,
            });
          }
        }

        // تحديث صورة المستخدم
        if (envelope.type === 'userAvatarUpdated') {
          const { userId, avatarHash, avatarVersion, users } = envelope as any;

          if (userId) {
            // تحديث المستخدم في القائمة
            dispatch({
              type: 'UPSERT_ONLINE_USER',
              payload: { id: userId, avatarHash, avatarVersion } as any,
            });

            // إذا كان المستخدم الحالي
            if (currentUserRef.current?.id === userId) {
              dispatch({
                type: 'SET_CURRENT_USER',
                payload: {
                  ...currentUserRef.current!,
                  avatarHash: avatarHash || (currentUserRef.current as any).avatarHash,
                  avatarVersion: avatarVersion || (currentUserRef.current as any).avatarVersion,
                } as any,
              });
            }
          }

          // تحديث قائمة المستخدمين إذا تم إرسالها
          if (users && Array.isArray(users)) {
            dispatch({ type: 'SET_ONLINE_USERS', payload: users });
          }
        }

        // تحديث صورة المستخدم الحالي عبر جميع الأجهزة
        if (envelope.type === 'selfAvatarUpdated') {
          const { avatarHash, avatarVersion } = envelope as any;

          if (currentUserRef.current) {
            dispatch({
              type: 'SET_CURRENT_USER',
              payload: {
                ...currentUserRef.current!,
                avatarHash: avatarHash || (currentUserRef.current as any).avatarHash,
                avatarVersion: avatarVersion || (currentUserRef.current as any).avatarVersion,
              } as any,
            });
          }
        }

        // تحديث بيانات المستخدم الموحدة
        if (envelope.type === 'userUpdated') {
          const updatedUser: ChatUser | undefined = (envelope as any).user;
          if (updatedUser && updatedUser.id) {
            const isCurrent = currentUserRef.current?.id === updatedUser.id;
            const currentRoom = currentRoomIdRef.current;
            const incomingRoom = (updatedUser as any)?.currentRoom as string | null | undefined;

            // منع حقن المستخدمين عبر الغرف: لا تحدّث قائمة الغرفة الحالية إذا كان التحديث لغرفة أخرى
            if (!isCurrent && currentRoom && incomingRoom && incomingRoom !== currentRoom) {
              // ما يزال مسموحاً تحديث المستخدم الحالي فقط
              // تجاهل إدراج المستخدم في قائمة هذه الغرفة
            } else {
              if ((updatedUser as any).isHidden === true) {
                dispatch({ type: 'REMOVE_ONLINE_USER', payload: updatedUser.id });
              } else {
                dispatch({ type: 'UPSERT_ONLINE_USER', payload: updatedUser });
              }
            }

            // دمج فوري لبيانات المستخدم الحالي
            if (isCurrent && currentUserRef.current) {
              dispatch({
                type: 'SET_CURRENT_USER',
                payload: { ...currentUserRef.current, ...updatedUser } as any,
              });
            }

            // جلب نسخة كاملة عند الحاجة للمستخدم الحالي فقط
            if (
              isCurrent &&
              (!updatedUser.profileImage ||
                (typeof updatedUser.profileImage === 'string' &&
                  !updatedUser.profileImage.startsWith('data:')))
            ) {
              try {
                apiRequest(`/api/users/${updatedUser.id}`)
                  .then((full: any) => {
                    if (full && full.id) {
                      setCachedUser(full as ChatUser);
                      if (currentUserRef.current?.id === updatedUser.id) {
                        dispatch({
                          type: 'SET_CURRENT_USER',
                          payload: { ...currentUserRef.current!, ...full } as any,
                        });
                      }
                    }
                  })
                  .catch(() => {});
              } catch {}
            }
          }
        }

        switch (envelope.type) {
          case 'typing': {
            const uid = (envelope as any).userId;
            const isTyping = !!(envelope as any).isTyping;
            const username = (envelope as any).username || (uid ? `User#${uid}` : '');
            if (!uid || uid === currentUserRef.current?.id) break;
            const next = new Set(state.typingUsers);
            if (isTyping) {
              next.add(username);
              // clear previous timer
              const t = typingTimersRef.current.get(uid);
              if (t) {
                clearTimeout(t);
                typingTimersRef.current.delete(uid);
              }
              const timeoutId = window.setTimeout(() => {
                const after = new Set(
                  currentRoomIdRef.current ? Array.from(next) : Array.from(state.typingUsers)
                );
                after.delete(username);
                dispatch({ type: 'SET_TYPING_USERS', payload: after });
                const tmp = typingTimersRef.current.get(uid);
                if (tmp) {
                  clearTimeout(tmp);
                  typingTimersRef.current.delete(uid);
                }
              }, 3000);
              typingTimersRef.current.set(uid, timeoutId);
            } else {
              next.delete(username);
              const t = typingTimersRef.current.get(uid);
              if (t) {
                clearTimeout(t);
                typingTimersRef.current.delete(uid);
              }
            }
            dispatch({ type: 'SET_TYPING_USERS', payload: next });
            break;
          }
          case 'newMessage': {
            const { message } = envelope;
            if (message?.sender && message.content) {
              const roomId = message.roomId || 'general';

              // تحويل الرسالة لتنسيق ChatMessage
              const chatMessage: ChatMessage = {
                id: message.id,
                content: message.content,
                senderId: message.sender.id,
                timestamp: message.timestamp || new Date().toISOString(),
                messageType: message.messageType || 'text',
                sender: message.sender,
                roomId,
                isPrivate: Boolean(message.isPrivate),
                reactions: message.reactions || { like: 0, dislike: 0, heart: 0 },
                myReaction: message.myReaction ?? null,
                attachments: message.attachments || [],
                textColor: message.textColor,
                bold: message.bold,
              };

              // إضافة الرسالة للغرفة المناسبة (عام فقط)
              if (!chatMessage.isPrivate) {
                dispatch({
                  type: 'ADD_ROOM_MESSAGE',
                  payload: { roomId, message: chatMessage },
                });
              }

              // تشغيل صوت خفيف فقط عند الرسائل العامة في الغرفة الحالية
              if (
                !chatMessage.isPrivate &&
                chatMessage.senderId !== currentUserRef.current?.id &&
                roomId === currentRoomIdRef.current &&
                (currentUserRef.current as any)?.globalSoundEnabled !== false
              ) {
                playNotificationSound();
              }
            }
            break;
          }
          case 'reactionUpdated': {
            const { roomId, messageId, counts, myReaction, reactorId } = envelope as any;
            const targetRoom = roomId || currentRoomIdRef.current;
            if (!targetRoom || !messageId) break;
            const existing = roomMessagesRef.current[targetRoom] || [];
            const next = existing.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    reactions: {
                      like: counts?.like ?? m.reactions?.like ?? 0,
                      dislike: counts?.dislike ?? m.reactions?.dislike ?? 0,
                      heart: counts?.heart ?? m.reactions?.heart ?? 0,
                    },
                    myReaction:
                      reactorId && reactorId === currentUserRef.current?.id
                        ? (myReaction ?? null)
                        : (m.myReaction ?? null),
                  }
                : m
            );
            dispatch({
              type: 'SET_ROOM_MESSAGES',
              payload: { roomId: targetRoom, messages: next },
            });
            break;
          }
          case 'messageDeleted': {
            const { messageId, roomId } = envelope as any;
            if (messageId && roomId) {
              const existing = roomMessagesRef.current[roomId] || [];
              const next = existing.filter((m) => m.id !== messageId);
              dispatch({ type: 'SET_ROOM_MESSAGES', payload: { roomId, messages: next } });
            }
            break;
          }

          case 'roomMessages': {
            const { messages, roomId: payloadRoomId } = envelope as any;
            if (Array.isArray(messages)) {
              const roomId = payloadRoomId || currentRoomIdRef.current;
              const formattedMessages = mapDbMessagesToChatMessages(messages, roomId);
              dispatch({
                type: 'SET_ROOM_MESSAGES',
                payload: { roomId, messages: formattedMessages },
              });
            }
            break;
          }

          case 'onlineUsers': {
            const roomId = (envelope as any).roomId || 'general';
            if (roomId !== currentRoomIdRef.current) {
              break;
            }
            if (Array.isArray(envelope.users)) {
              const rawUsers = envelope.users as ChatUser[];
              // فلترة صارمة + إزالة المتجاهلين + إزالة التكرارات
              const filtered = rawUsers.filter(
                (u) => u && u.id && u.username && u.userType && !ignoredUsersRef.current.has(u.id)
              );
              const dedup = new Map<number, ChatUser>();
              for (const u of filtered) {
                if (!dedup.has(u.id)) dedup.set(u.id, u);
              }
              const nextUsers = Array.from(dedup.values());
              dispatch({ type: 'SET_ONLINE_USERS', payload: nextUsers });
            }
            break;
          }

          case 'roomJoined': {
            const roomId = (envelope as any).roomId;
            if (roomId && roomId !== currentRoomIdRef.current) {
              // Switch local state to the confirmed room and persist session
              dispatch({ type: 'SET_CURRENT_ROOM', payload: roomId });
              try { saveSession({ roomId }); } catch {}
            }
            // تنظيف queue الانضمام: تم تأكيد الانضمام
            try {
              if (pendingJoinRoomRef.current === roomId) {
                pendingJoinRoomRef.current = null;
              }
            } catch {}
            // استبدال القائمة بالكامل بقائمة الغرفة المرسلة (مع فلترة وإزالة التكرارات)
            const users = (envelope as any).users;
            if (Array.isArray(users)) {
              const rawUsers = users as ChatUser[];
              const filtered = rawUsers.filter(
                (u) => u && u.id && u.username && u.userType && !ignoredUsersRef.current.has(u.id)
              );
              const dedup = new Map<number, ChatUser>();
              for (const u of filtered) {
                if (!dedup.has(u.id)) dedup.set(u.id, u);
              }
              dispatch({ type: 'SET_ONLINE_USERS', payload: Array.from(dedup.values()) });
            }
            break;
          }

          // userJoinedRoom/userLeftRoom تم استبدالهما برسائل system محفوظة
          case 'userDisconnected': {
            const uid = (envelope as any).userId;
            if (uid) {
              dispatch({ type: 'REMOVE_ONLINE_USER', payload: uid });
            }
            break;
          }
          case 'userConnected': {
            const u = (envelope as any).user;
            if (u && u.id) {
              dispatch({ type: 'UPSERT_ONLINE_USER', payload: u });
            }
            break;
          }

          case 'kicked': {
            // إظهار عدّاد الطرد للمستخدم المستهدف فقط
            const targetId = envelope.targetUserId;
            if (targetId && targetId === currentUserRef.current?.id) {
              if (!kickHandledRef.current) {
                kickHandledRef.current = true;
                // عرض العدّاد وتعطيل الجلسة فوراً بدون إعادة تحميل الآن
                dispatch({ type: 'SET_SHOW_KICK_COUNTDOWN', payload: true });
                try { clearSession(); } catch {}
                try { socket.current?.disconnect(); } catch {}
              }
              // إشعار المستخدم مرة واحدة فقط
              const duration = (envelope as any).duration || 15;
              const reason = (envelope as any).reason || 'بدون سبب';
              const moderator = (envelope as any).moderator || 'مشرف';
              alert(
                `تم طردك من الدردشة بواسطة ${moderator}\nالسبب: ${reason}\nالمدة: ${duration} دقيقة`
              );
            }
            break;
          }

          case 'blocked': {
            // معالجة الحجب النهائي
            if (currentUserRef.current?.id) {
              const reason = (envelope as any).reason || 'بدون سبب';
              const moderator = (envelope as any).moderator || 'مشرف';
              alert(`تم حجبك نهائياً من الدردشة بواسطة ${moderator}\nالسبب: ${reason}`);
              // فصل المستخدم وإعادة توجيهه
              setTimeout(() => {
                window.location.href = '/';
              }, 3000);
            }
            break;
          }

          case 'moderationAction': {
            // في حالة وصول بث عام بإجراء "banned"، فعّل العدّاد إذا كنت أنت الهدف
            const action = (envelope as any).action;
            const targetId = (envelope as any).targetUserId;
            if (action === 'banned' && targetId && targetId === currentUserRef.current?.id) {
              dispatch({ type: 'SET_SHOW_KICK_COUNTDOWN', payload: true });
            }
            break;
          }

          case 'error':
          case 'warning': {
            console.warn('⚠️ خطأ من السيرفر:', envelope.message);
            
            // عرض رسالة الخطأ للمستخدم إذا كانت تتعلق بغرفة مقفلة
            if (envelope.message && (envelope.message.includes('مقفلة') || envelope.message.includes('locked'))) {
              // إرسال حدث مخصص لعرض رسالة خطأ
              try {
                window.dispatchEvent(new CustomEvent('roomLockError', { 
                  detail: { message: envelope.message }
                }));
              } catch {}
            }
            break;
          }

          // ✅ بثوص الأصدقاء: تحويلها إلى أحداث متصفح لتفعيل إبطال الكاش عبر useNotificationManager
          case 'friendRequestReceived': {
            const targetId = (envelope as any).targetUserId;
            if (targetId && targetId === currentUserRef.current?.id) {
              const detail = {
                senderName: (envelope as any).senderName,
                senderId: (envelope as any).senderId,
              } as any;
              try {
                window.dispatchEvent(new CustomEvent('friendRequestReceived', { detail }));
              } catch {}
            }
            break;
          }
          case 'friendRequestAccepted': {
            const targetId = (envelope as any).targetUserId;
            if (targetId && targetId === currentUserRef.current?.id) {
              const detail = { friendName: (envelope as any).senderName } as any;
              try {
                window.dispatchEvent(new CustomEvent('friendRequestAccepted', { detail }));
              } catch {}
            }
            break;
          }
          case 'friendAdded': {
            const targetId = (envelope as any).targetUserId;
            if (targetId && targetId === currentUserRef.current?.id) {
              const detail = {
                friendId: (envelope as any).friendId,
                friendName: (envelope as any).friendName,
              } as any;
              try {
                window.dispatchEvent(new CustomEvent('friendAdded', { detail }));
              } catch {}
            }
            break;
          }

          default: {
            break;
          }
        }
      } catch (error) {
        console.error('❌ خطأ في معالجة رسالة Socket:', error);
      }
    });

    // أحداث مباشرة محتملة لتحديث قائمة المتصلين فوراً إن وُجدت على الخادم
    socketInstance.on('userDisconnected', (payload: any) => {
      const uid = payload?.userId || payload?.id;
      if (uid) {
        dispatch({ type: 'REMOVE_ONLINE_USER', payload: uid });
      }
    });
    socketInstance.on('userConnected', (payload: any) => {
      const user = payload?.user || payload;
      if (user?.id) {
        dispatch({ type: 'UPSERT_ONLINE_USER', payload: user });
      }
    });

    // بث تحديثات غرفة البث وأحداث المايك عبر قنوات Socket المخصصة
    const emitToBroadcastHandlers = (payload: any) => {
      broadcastHandlers.current.forEach((handler) => {
        try {
          handler(payload);
        } catch (err) {
          /* ignore single handler error */
        }
      });
    };

    socketInstance.on('roomUpdate', (message: any) => {
      emitToBroadcastHandlers(message);
    });

    // Handle chat lock updates
    socketInstance.on('chatLockUpdated', (message: any) => {
      emitToBroadcastHandlers({ type: 'chatLockUpdated', ...message });
    });

    // توافق مع REST endpoints التي تبث أحداث المايك كأحداث مستقلة
    socketInstance.on('micRequested', (message: any) => {
      emitToBroadcastHandlers({ type: 'micRequest', ...message });
    });
    socketInstance.on('micApproved', (message: any) => {
      emitToBroadcastHandlers({ type: 'micApproved', ...message });
    });
    socketInstance.on('micRejected', (message: any) => {
      emitToBroadcastHandlers({ type: 'micRejected', ...message });
    });
    socketInstance.on('speakerRemoved', (message: any) => {
      emitToBroadcastHandlers({ type: 'speakerRemoved', ...message });
    });

    // WebRTC signaling relays
    socketInstance.on('webrtc-offer', (payload: any) => {
      webrtcOfferHandlers.current.forEach((h) => {
        try {
          h(payload);
        } catch (e) {
          console.warn('webrtc offer handler error', e);
        }
      });
    });
    socketInstance.on('webrtc-answer', (payload: any) => {
      webrtcAnswerHandlers.current.forEach((h) => {
        try {
          h(payload);
        } catch (e) {
          console.warn('webrtc answer handler error', e);
        }
      });
    });
    socketInstance.on('webrtc-ice-candidate', (payload: any) => {
      webrtcIceHandlers.current.forEach((h) => {
        try {
          h(payload);
        } catch (e) {
          console.warn('webrtc ice handler error', e);
        }
      });
    });

    // معالج الرسائل الخاصة المحسن
    const handlePrivateMessage = (incoming: any) => {
      try {
        const envelope = incoming?.envelope ? incoming.envelope : incoming;
        const payload = envelope?.message ?? envelope;
        const message = payload?.message ?? payload;

        if (message?.sender && currentUserRef.current) {
          const chatMessage: ChatMessage = {
            id: message.id,
            content: message.content,
            senderId: message.sender.id,
            timestamp: message.timestamp || new Date().toISOString(),
            messageType: message.messageType || 'text',
            sender: message.sender,
            receiverId: message.receiverId,
            isPrivate: true,
            attachments: message.attachments || [],
          };

          // تجاهل رسائل الحالات في محادثات الطرفين إذا أردنا فصلها لاحقاً (سنبقيها الآن ولكن نضع علامة)
          const isStoryChannel = Array.isArray(chatMessage.attachments) && chatMessage.attachments.some((a: any) => a?.channel === 'story');

          // تحديد معرف المحادثة بشكل محسن
          let conversationId: number;
          if (message.senderId === currentUserRef.current.id) {
            conversationId = message.receiverId;
          } else {
            conversationId = message.senderId;
          }

          // التأكد من صحة معرف المحادثة
          if (
            conversationId &&
            !isNaN(conversationId) &&
            conversationId !== currentUserRef.current.id
          ) {
            dispatch({
              type: 'SET_PRIVATE_MESSAGE',
              payload: { userId: conversationId, message: chatMessage },
            });

            // تشغيل صوت الإشعار فقط للرسائل الواردة
            if (chatMessage.senderId !== currentUserRef.current.id) {
              if ((currentUserRef.current as any)?.globalSoundEnabled !== false) {
                playNotificationSound();
              }
              // عرض تنبيه مرئي للمُرسل
              try {
                dispatch({ type: 'SET_NEW_MESSAGE_SENDER', payload: message.sender as any });
              } catch {}
            }

            // إشعار الواجهة بوصول/إرسال رسالة خاصة لتحديث تبويب الرسائل فوراً
            try {
              const detail = {
                otherUserId: conversationId,
                senderId: message.senderId,
                receiverId: message.receiverId,
                storyChannel: isStoryChannel,
              } as any;
              window.dispatchEvent(new CustomEvent('privateMessageReceived', { detail }));
            } catch {}
          }
        }
      } catch (error) {
        console.error('❌ خطأ في معالجة الرسالة الخاصة:', error);
      }
    };

    socketInstance.on('privateMessage', handlePrivateMessage);

    // معالج حدث الطرد (نسخة مبسطة بدون إعادة توجيه فوري)
    socketInstance.on('kicked', (data: any) => {
      if (currentUserRef.current?.id === data.userId) {
        if (!kickHandledRef.current) {
          kickHandledRef.current = true;
          const kickerName = data.kickerName || 'مشرف';
          const reason = data.reason || 'بدون سبب';
          alert(
            `تم طردك من الدردشة بواسطة ${kickerName}\nالسبب: ${reason}\nيمكنك العودة بعد 15 دقيقة`
          );
          dispatch({ type: 'SET_SHOW_KICK_COUNTDOWN', payload: true });
          try { clearSession(); } catch {}
          try { socketInstance.disconnect(); } catch {}
        }
      }
    });

    // معالج حدث الحجب
    socketInstance.on('blocked', (data: any) => {
      if (currentUserRef.current?.id) {
        const reason = data.reason || 'بدون سبب';
        const moderator = data.moderator || 'مشرف';

        // إظهار رسالة الحجب
        alert(`تم حجبك نهائياً من الدردشة بواسطة ${moderator}\nالسبب: ${reason}`);

        // فصل المستخدم فوراً وإعادة توجيهه
        clearSession(); // مسح بيانات الجلسة
        socketInstance.disconnect();
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
    });

    // معالج أخطاء المصادقة
    socketInstance.on('error', (data: any) => {
      if (data.action === 'blocked' || data.action === 'device_blocked') {
        alert(data.message);
        clearSession(); // مسح بيانات الجلسة
        socketInstance.disconnect();
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else if (data.action === 'banned') {
        const timeLeft = data.timeLeft || 0;
        alert(`${data.message}\nالوقت المتبقي: ${timeLeft} دقيقة`);
        dispatch({ type: 'SET_SHOW_KICK_COUNTDOWN', payload: true });
      } else {
        console.error('خطأ من السيرفر:', data.message);
      }
    });
  }, []);

  // Ensure cleanup on unmount
  useEffect(() => {
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (backgroundPingIntervalRef.current) {
        clearInterval(backgroundPingIntervalRef.current);
        backgroundPingIntervalRef.current = null;
      }
      // تنظيف Web Worker و Service Worker
      if (socketWorkerRef.current) {
        socketWorkerRef.current.postMessage({ type: 'cleanup' });
        socketWorkerRef.current.terminate();
        socketWorkerRef.current = null;
      }
      
      if (serviceWorkerRef.current) {
        serviceWorkerRef.current.postMessage({
          type: 'stop-background-ping',
          data: {}
        });
        serviceWorkerRef.current = null;
      }
      // clear typing timers
      typingTimersRef.current.forEach((id) => {
        try {
          clearTimeout(id);
        } catch {}
      });
      typingTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      if (socket.current && !socket.current.connected) {
        try {
          socket.current.connect();
        } catch {}
      }
    };
    const handleOffline = () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // عند تحديد المستخدم الحالي، اجلب قائمة المتجاهلين الخاصة به مرة واحدة
    const fetchIgnored = async () => {
      if (!state.currentUser?.id) return;
      try {
        const data = await apiRequest(`/api/users/${state.currentUser.id}/ignored`);
        const ids: number[] = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.ignoredUsers)
            ? (data as any).ignoredUsers
            : [];
        ids.forEach((id) => dispatch({ type: 'IGNORE_USER', payload: id }));
      } catch (e) {
        console.warn('تعذر جلب قائمة المتجاهلين:', e);
      }
    };
    fetchIgnored();
  }, [state.currentUser?.id]);

  // Prefetch recent private conversations messages on first entry
  const prefetchedConversationsRef = useRef(false);
  useEffect(() => {
    const PREFETCH_CONVERSATIONS_MAX = 20; // قابل للتعديل
    const prefetch = async () => {
      if (!state.currentUser?.id || prefetchedConversationsRef.current) return;
      prefetchedConversationsRef.current = true;
      try {
        const conv = await apiRequest(
          `/api/private-messages/conversations/${state.currentUser.id}?limit=50`
        );
        const items: Array<{ otherUserId: number }> = Array.isArray((conv as any)?.conversations)
          ? (conv as any).conversations
          : [];
        const targets = items.map((i) => i.otherUserId).slice(0, PREFETCH_CONVERSATIONS_MAX);
        await Promise.all(
          targets.map(async (otherId) => {
            try {
              const data = await apiRequest(
                `/api/private-messages/${state.currentUser!.id}/${otherId}?limit=20`
              );
              const formatted = Array.isArray((data as any)?.messages)
                ? mapDbMessagesToChatMessages((data as any).messages)
                : [];
              if (formatted.length > 0) {
                dispatch({
                  type: 'SET_PRIVATE_CONVERSATION',
                  payload: { userId: otherId, messages: formatted },
                });
              }
            } catch {}
          })
        );
      } catch (e) {
        console.warn('تعذر الجلب المسبق لمحادثات الخاص:', e);
      }
    };
    prefetch();
  }, [state.currentUser?.id]);

  // 🔥 SIMPLIFIED Connect function
  const connect = useCallback(
    (user: ChatUser) => {
      dispatch({ type: 'SET_CURRENT_USER', payload: user });
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        // تنظيف الاتصال السابق
        if (socket.current) {
          socket.current.removeAllListeners();
          socket.current.disconnect();
          socket.current = null;
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
        }
        
        // استخدام عميل Socket الموحد
        const s = connectSocket();
        socket.current = s;
        
        // حفظ الجلسة
        saveSession({ userId: user.id, username: user.username, userType: user.userType });

        // إعداد المستمعين
        setupSocketListeners(s);

        // إذا كان متصلاً بالفعل، أرسل المصادقة فقط، والانضمام سيتم بعد التأكيد
        if (s.connected) {
          s.emit('auth', {
            userId: user.id,
            username: user.username,
            userType: user.userType,
          });
        }

        // إرسال المصادقة عند الاتصال/إعادة الاتصال يتم من خلال الوحدة المشتركة
        s.on('connect', () => {
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
          dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
          dispatch({ type: 'SET_LOADING', payload: false });

          // إعادة إرسال المصادقة فقط، والانضمام للغرفة بعد Event roomJoined
          try {
            s.emit('auth', {
              userId: user.id,
              username: user.username,
              userType: user.userType,
            });
          } catch {}

          // Prefetch expected data shortly after connection success
          try {
            // غُصن خفيف لتفادي إزعاج الشبكة فوراً
            setTimeout(() => {
              try {
                // Prefetch rooms list
                queryClient.prefetchQuery({
                  queryKey: ['/api/rooms', user.id],
                  queryFn: async () => apiRequest('/api/rooms'),
                  staleTime: 60_000,
                });
                // Prefetch notifications count
                queryClient.prefetchQuery({
                  queryKey: ['/api/notifications/unread-count', user.id],
                  queryFn: async () => apiRequest(`/api/notifications/${user.id}/unread-count`),
                  staleTime: 60_000,
                });
                // Prefetch friends list (if endpoint supported)
                queryClient.prefetchQuery({
                  queryKey: ['/api/friends', user.id],
                  queryFn: async () => apiRequest(`/api/friends/${user.id}`),
                  staleTime: 60_000,
                });
              } catch {}
            }, 300);
          } catch {}
        });

        // معالج فشل إعادة الاتصال النهائي
        s.on('reconnect_failed', () => {
          console.warn('⚠️ فشل في إعادة الاتصال بعد عدة محاولات');
          dispatch({
            type: 'SET_CONNECTION_ERROR',
            payload: 'فقدان الاتصال. يرجى إعادة تحميل الصفحة.',
          });
        });

        // تحديث حالة الاتصال عند الانفصال
        s.on('disconnect', () => {
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
        });

        // معالجة أخطاء الاتصال
        s.on('connect_error', (error) => {
          console.error('❌ خطأ في الاتصال:', error);
          dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'فشل الاتصال بالسيرفر' });
        });
      } catch (error) {
        console.error('خطأ في الاتصال:', error);
        dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'خطأ في الاتصال بالخادم' });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [setupSocketListeners, state.currentRoomId]
  );

  // 🔥 SIMPLIFIED Join room function
  const joinRoom = useCallback(
    (roomId: string) => {
      if (!roomId || roomId === 'public' || roomId === 'friends') {
        console.warn('Invalid room ID provided to joinRoom:', roomId);
        return;
      }
      // حارس لمنع التكرار: إذا كانت نفس الغرفة محلياً أو كانت في قائمة انتظار الانضمام، لا تعيد الإرسال
      if (state.currentRoomId === roomId || pendingJoinRoomRef.current === roomId) {
        return;
      }

      // Do NOT change local room yet; wait for server ack (roomJoined)
      if (socket.current?.connected && state.currentUser?.id) {
        const now = Date.now();
        if (now - lastJoinEmitTsRef.current < 1000) {
          return;
        }
        lastJoinEmitTsRef.current = now;
        socket.current.emit('joinRoom', {
          roomId,
          userId: state.currentUser.id,
          username: state.currentUser.username,
        });
        // تمييز أن لدينا طلب انضمام جارٍ لتفادي إعادة الإرسال من مسارات أخرى
        pendingJoinRoomRef.current = roomId;
        // لا نحدث lastSeen محلياً إطلاقاً؛ الاعتماد على بث الخادم فقط
        try { saveSession({ roomId }); } catch {}
      } else {
        // Queue join until we reconnect
        pendingJoinRoomRef.current = roomId;
        // لا تحديثات محلية للحالة الزمنية؛ فقط حفظ الجلسة لإعادة الانضمام
        try { saveSession({ roomId }); } catch {}
      }
    },
    [state.currentRoomId, state.currentUser]
  );

  // لا نقوم بتوليد lastSeen محلياً. الخادم هو المصدر الوحيد للحقيقة.

  // 🔥 SIMPLIFIED Send message function
  const sendMessage = useCallback(
    (
      content: string,
      messageType: string = 'text',
      receiverId?: number,
      roomId?: string,
      textColor?: string,
      bold?: boolean
    ): Promise<boolean> | void => {
      if (!state.currentUser) {
        console.error('❌ لا يمكن إرسال الرسالة - لا يوجد مستخدم حالي');
        return;
      }

      const trimmed = typeof content === 'string' ? content.trim() : '';
      if (!trimmed) {
        console.warn('⚠️ محتوى الرسالة فارغ');
        return;
      }

      // اكتشاف الصور المرسلة كـ base64
      const detectedType =
        messageType === 'text' && trimmed.startsWith('data:image') ? 'image' : messageType;

      if (receiverId) {
        // إرسال خاص عبر REST مع إرجاع Promise وإضافة تفاؤلية للمحادثة
        const endpoint = `/api/private-messages/send`;
        return apiRequest(endpoint, {
          method: 'POST',
          body: {
            senderId: state.currentUser.id,
            receiverId,
            content: trimmed,
            messageType: detectedType || 'text',
            textColor,
            bold,
          },
        })
          .then((res: any) => {
            const sender = state.currentUser as ChatUser;
            const apiMsg = (res && (res as any).message) || null;
            const chatMessage: ChatMessage = {
              id: apiMsg?.id ?? Date.now(),
              content: trimmed,
              senderId: sender.id,
              timestamp: (apiMsg?.timestamp as string) || new Date().toISOString(),
              messageType: detectedType || 'text',
              sender: apiMsg?.sender || sender,
              receiverId,
              isPrivate: true,
              attachments: apiMsg?.attachments || [],
            } as any;
            // إضافة تفاؤلية للمحادثة حتى يصل بث الخادم
            dispatch({ type: 'SET_PRIVATE_MESSAGE', payload: { userId: receiverId, message: chatMessage } });
            return true;
          });
      }

      // إرسال عام عبر Socket.IO — يتطلب اتصالاً وانضماماً للغرفة
      if (!socket.current?.connected) {
        console.error('❌ لا يمكن إرسال الرسالة العامة - غير متصل');
        return;
      }
      const targetRoomId = roomId || state.currentRoomId || 'general';
      socket.current.emit('publicMessage', {
        senderId: state.currentUser.id,
        content: trimmed,
        messageType: detectedType,
        isPrivate: false,
        receiverId: undefined,
        roomId: targetRoomId,
        textColor,
        bold,
      });
    },
    [state.currentUser, state.currentRoomId, dispatch]
  );

  // 🔥 SIMPLIFIED Send room message function
  const sendRoomMessage = useCallback(
    (content: string, roomId: string, messageType: string = 'text') => {
      return sendMessage(content, messageType, undefined, roomId);
    },
    [sendMessage]
  );

  // 🔥 SIMPLIFIED Disconnect function
  const disconnect = useCallback(() => {
    clearSession(); // مسح بيانات الجلسة
    if (socket.current) {
      socket.current.removeAllListeners();
      socket.current.disconnect();
      socket.current = null;
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    }

    // إعادة تعيين الحالة
    dispatch({ type: 'CLEAR_ALL', payload: undefined });
  }, []);

  // 🔥 SIMPLIFIED helper functions
  const ignoreUser = useCallback(
    async (userId: number) => {
      try {
        if (!state.currentUser?.id) return;
        await apiRequest(`/api/users/${state.currentUser.id}/ignore/${userId}`, { method: 'POST' });
        dispatch({ type: 'IGNORE_USER', payload: userId });
      } catch (e) {
        console.error('فشل في تجاهل المستخدم:', e);
      }
    },
    [state.currentUser?.id]
  );

  const unignoreUser = useCallback(
    async (userId: number) => {
      try {
        if (!state.currentUser?.id) return;
        await apiRequest(`/api/users/${state.currentUser.id}/ignore/${userId}`, {
          method: 'DELETE',
        });
        dispatch({ type: 'UNIGNORE_USER', payload: userId });
      } catch (e) {
        console.error('فشل في إلغاء تجاهل المستخدم:', e);
      }
    },
    [state.currentUser?.id]
  );

  const sendTyping = useCallback(() => {
    // تم تعطيل مؤشر الكتابة في الغرف العامة
  }, []);

  // إرسال مؤشر كتابة للخاص (DM)
  const sendPrivateTyping = useCallback((targetUserId: number) => {
    try {
      if (!targetUserId || !socket.current?.connected) return;
      socket.current.emit('privateTyping', { targetUserId, isTyping: true });
    } catch {}
  }, []);

  // Compatibility helpers for UI components
  const handleTyping = useCallback(() => {
    sendTyping();
  }, [sendTyping]);

  const getCurrentRoomMessages = useCallback(() => currentRoomMessages, [currentRoomMessages]);

  const updateCurrentUser = useCallback(
    (updates: Partial<ChatUser>) => {
      if (!state.currentUser) return;
      const merged = { ...state.currentUser, ...updates } as ChatUser;
      dispatch({ type: 'SET_CURRENT_USER', payload: merged });
    },
    [state.currentUser]
  );

  // تحميل سجل المحادثة الخاصة عند فتحها
  const loadPrivateConversation = useCallback(
    async (otherUserId: number, limit: number = 50) => {
      if (!state.currentUser?.id) return;
      try {
        const data = await apiRequest(
          `/api/private-messages/${state.currentUser.id}/${otherUserId}?limit=${limit}`
        );
        const formatted = Array.isArray((data as any)?.messages)
          ? mapDbMessagesToChatMessages((data as any).messages)
          : [];
        dispatch({
          type: 'SET_PRIVATE_CONVERSATION',
          payload: { userId: otherUserId, messages: formatted },
        });
      } catch (error) {
        console.error('❌ خطأ في تحميل رسائل الخاص:', error);
      }
    },
    [state.currentUser?.id]
  );

  const loadOlderPrivateConversation = useCallback(
    async (otherUserId: number, limit: number = 20) => {
      if (!state.currentUser?.id) return { addedCount: 0, hasMore: false };
      try {
        const existing = state.privateConversations[otherUserId] || [];
        const earliestTs =
          existing.length > 0 ? new Date(existing[0].timestamp).toISOString() : undefined;
        const url = `/api/private-messages/${state.currentUser.id}/${otherUserId}?limit=${limit}${
          earliestTs ? `&beforeTs=${encodeURIComponent(earliestTs)}` : ''
        }`;
        const data = await apiRequest(url);
        const formatted = Array.isArray((data as any)?.messages)
          ? mapDbMessagesToChatMessages((data as any).messages)
          : [];
        if (formatted.length > 0) {
          dispatch({
            type: 'PREPEND_PRIVATE_MESSAGES',
            payload: { userId: otherUserId, messages: formatted },
          });
        }
        const hasMore = !!(data as any)?.hasMore;
        return { addedCount: formatted.length, hasMore };
      } catch (error) {
        console.error('❌ خطأ في تحميل رسائل أقدم للخاص:', error);
        return { addedCount: 0, hasMore: false };
      }
    },
    [state.currentUser?.id, state.privateConversations]
  );

  return {
    // State
    currentUser: state.currentUser,
    onlineUsers: memoizedOnlineUsers,
    publicMessages: currentRoomMessages, // ✅ مصدر واحد للحقيقة
    privateConversations: state.privateConversations,
    ignoredUsers: state.ignoredUsers,
    isConnected: state.isConnected,
    typingUsers: state.typingUsers,
    connectionError: state.connectionError,
    newMessageSender: state.newMessageSender,
    isLoading: state.isLoading,
    notifications: state.notifications,
    currentRoomId: state.currentRoomId,
    roomMessages: state.roomMessages,
    showKickCountdown: state.showKickCountdown,

    // Notification states
    levelUpNotification,
    setLevelUpNotification,
    achievementNotification,
    setAchievementNotification,
    dailyBonusNotification,
    setDailyBonusNotification,

    // ✅ Actions - مبسطة وواضحة
    connect,
    disconnect,
    sendMessage,
    sendRoomMessage,
    joinRoom,
    loadRoomMessages,
    ignoreUser,
    unignoreUser,
    sendTyping,
    setShowKickCountdown: (show: boolean) =>
      dispatch({ type: 'SET_SHOW_KICK_COUNTDOWN', payload: show }),
    setNewMessageSender: (sender: ChatUser | null) =>
      dispatch({ type: 'SET_NEW_MESSAGE_SENDER', payload: sender }),

    // Convenience wrappers
    sendPublicMessage: (content: string) => sendMessage(content, 'text'),

    // Newly added helpers for compatibility
    handleTyping,
    sendPrivateTyping,
    getCurrentRoomMessages,
    updateCurrentUser,
    loadPrivateConversation,
    loadOlderPrivateConversation,

    // Broadcast handlers registration
    addBroadcastMessageHandler: (handler: (data: any) => void) => {
      broadcastHandlers.current.add(handler);
    },
    removeBroadcastMessageHandler: (handler: (data: any) => void) => {
      broadcastHandlers.current.delete(handler);
    },

    // WebRTC signaling helpers
    sendWebRTCOffer: (targetUserId: number, roomId: string, sdp: any) => {
      if (!socket.current?.connected || !state.currentUser) return;
      socket.current.emit('webrtc-offer', {
        roomId,
        targetUserId,
        sdp,
        senderId: state.currentUser.id,
      });
    },
    sendWebRTCAnswer: (targetUserId: number, roomId: string, sdp: any) => {
      if (!socket.current?.connected || !state.currentUser) return;
      socket.current.emit('webrtc-answer', {
        roomId,
        targetUserId,
        sdp,
        senderId: state.currentUser.id,
      });
    },
    sendWebRTCIceCandidate: (targetUserId: number, roomId: string, candidate: any) => {
      if (!socket.current?.connected || !state.currentUser) return;
      socket.current.emit('webrtc-ice-candidate', {
        roomId,
        targetUserId,
        candidate,
        senderId: state.currentUser.id,
      });
    },
    onWebRTCOffer: (handler: (data: any) => void) => {
      webrtcOfferHandlers.current.add(handler);
    },
    offWebRTCOffer: (handler: (data: any) => void) => {
      webrtcOfferHandlers.current.delete(handler);
    },
    onWebRTCAnswer: (handler: (data: any) => void) => {
      webrtcAnswerHandlers.current.add(handler);
    },
    offWebRTCAnswer: (handler: (data: any) => void) => {
      webrtcAnswerHandlers.current.delete(handler);
    },
    onWebRTCIceCandidate: (handler: (data: any) => void) => {
      webrtcIceHandlers.current.add(handler);
    },
    offWebRTCIceCandidate: (handler: (data: any) => void) => {
      webrtcIceHandlers.current.delete(handler);
    },
  };
};

export type UseChatReturn = ReturnType<typeof useChat>;
