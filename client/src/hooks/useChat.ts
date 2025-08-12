import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, saveSession } from '@/lib/socket';
import type { ChatUser, ChatMessage, RoomWebSocketMessage as WebSocketMessage } from '@/types/chat';
import type { PrivateConversation } from '../../../shared/types';
import type { Notification } from '@/types/chat';
import { apiRequest } from '@/lib/queryClient';
import { mapDbMessagesToChatMessages } from '@/utils/messageUtils';

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
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gain.gain.setValueAtTime(0.1, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        // Silent fail
      }
    });
  } catch (error) {
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
}

// 🔥 SIMPLIFIED Action types - حذف التضارب
type ChatAction = 
  | { type: 'SET_CURRENT_USER'; payload: ChatUser | null }
  | { type: 'SET_ONLINE_USERS'; payload: ChatUser[] }
  | { type: 'SET_ROOM_MESSAGES'; payload: { roomId: string; messages: ChatMessage[] } }
  | { type: 'ADD_ROOM_MESSAGE'; payload: { roomId: string; message: ChatMessage } }
  | { type: 'SET_PRIVATE_MESSAGE'; payload: { userId: number; message: ChatMessage } }
  | { type: 'SET_PRIVATE_CONVERSATION'; payload: { userId: number; messages: ChatMessage[] } }
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
  | { type: 'CLEAR_ALL'; payload: void };

// 🔥 SIMPLIFIED Initial state
const initialState: ChatState = {
  currentUser: null,
  onlineUsers: [],
  currentRoomId: 'general',
  roomMessages: {},
  privateConversations: {},
  ignoredUsers: new Set(),
  isConnected: false,
  typingUsers: new Set(),
  connectionError: null,
  newMessageSender: null,
  isLoading: false,
  notifications: [],
  showKickCountdown: false
};

// 🔥 SIMPLIFIED Reducer function - حذف التعقيدات والتضارب
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    
    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: action.payload };
    
    case 'SET_ROOM_MESSAGES': {
      const { roomId, messages } = action.payload;
      return { 
        ...state, 
        roomMessages: { ...state.roomMessages, [roomId]: messages }
      };
    }
    
    case 'ADD_ROOM_MESSAGE': {
      const { roomId, message } = action.payload;
      const existingMessages = state.roomMessages[roomId] || [];
      
      // ✅ فحص بسيط للتكرار بناءً على ID أو timestamp+content
      const isDuplicate = existingMessages.some(msg => 
        msg.id === message.id || 
        (msg.timestamp === message.timestamp && 
         msg.senderId === message.senderId && 
         msg.content === message.content)
      );
      
      if (isDuplicate) {
        return state; // لا نضيف الرسالة المكررة
      }
      
      return {
        ...state,
        roomMessages: {
          ...state.roomMessages,
          [roomId]: [...existingMessages, message]
        }
      };
    }
    
    case 'SET_PRIVATE_MESSAGE': {
      const { userId, message } = action.payload;
      return {
        ...state,
        privateConversations: {
          ...state.privateConversations,
          [userId]: [...(state.privateConversations[userId] || []), message]
        }
      };
    }
    
    case 'SET_PRIVATE_CONVERSATION': {
      const { userId, messages } = action.payload;
      return {
        ...state,
        privateConversations: {
          ...state.privateConversations,
          [userId]: messages
        }
      };
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
        notifications: [...state.notifications, action.payload] 
      };
    
    case 'SET_CURRENT_ROOM':
      return { ...state, currentRoomId: action.payload };
    
    case 'SET_SHOW_KICK_COUNTDOWN':
      return { ...state, showKickCountdown: action.payload };
    
    case 'IGNORE_USER':
      return { 
        ...state, 
        ignoredUsers: new Set([...state.ignoredUsers, action.payload]) 
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

  // ✅ Memoized current room messages - حل مشكلة الـ performance
  const currentRoomMessages = useMemo(() => {
    return state.roomMessages[state.currentRoomId] || [];
  }, [state.roomMessages, state.currentRoomId]);

  // ✅ Memoized online users
  const memoizedOnlineUsers = useMemo(() => 
    state.onlineUsers.filter(user => !state.ignoredUsers.has(user.id)),
    [state.onlineUsers, state.ignoredUsers]
  );

      // 🔥 SIMPLIFIED Message loading - حذف التعقيدات
  const loadRoomMessages = useCallback(async (roomId: string, forceReload: boolean = false) => {
    // نعتمد الآن على Socket لإرسال آخر الرسائل عند الانضمام،
    // لكن نُبقي هذا كنسخة احتياطية سريعة تطلب 10 رسائل فقط.

    if (!forceReload && state.roomMessages[roomId]?.length > 0) {
      return;
    }

    if (loadingRooms.current.has(roomId)) {
      return;
    }

    loadingRooms.current.add(roomId);
    
    try {
      const data = await apiRequest(`/api/messages/room/${roomId}/latest?limit=10`);
      
      if (data?.messages && Array.isArray(data.messages)) {
        const formattedMessages = mapDbMessagesToChatMessages(data.messages, roomId);
        dispatch({ 
          type: 'SET_ROOM_MESSAGES', 
          payload: { roomId, messages: formattedMessages }
        });
      }
    } catch (error) {
      console.error(`❌ خطأ في تحميل رسائل الغرفة ${roomId}:`, error);
    } finally {
      loadingRooms.current.delete(roomId);
    }
  }, [state.roomMessages]);

      // Track ping interval to avoid leaks
    const pingIntervalRef = useRef<number | null>(null);
    
      // 🔥 SIMPLIFIED Socket event handling - حذف التضارب
    const setupSocketListeners = useCallback((socketInstance: Socket) => {
      // حافظ على الاتصال عبر ping/pong مخصص عند السكون
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      const pingId = window.setInterval(() => {
        if (socketInstance.connected) {
          socketInstance.emit('client_ping');
        }
      }, 20000);
      pingIntervalRef.current = pingId;
      socketInstance.on('client_pong', () => {});

      // لم نعد نستخدم ping/pong المخصصين؛ نعتمد فقط على client_ping/client_pong للحفاظ على الاتصال

      // ✅ معالج واحد للرسائل - حذف التضارب
      socketInstance.on('message', (data: any) => {
      try {
        const envelope = data.envelope || data;
        
        switch (envelope.type) {
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
                isPrivate: Boolean(message.isPrivate)
              };
              
              // إضافة الرسالة للغرفة المناسبة
              dispatch({ 
                type: 'ADD_ROOM_MESSAGE', 
                payload: { roomId, message: chatMessage }
              });
              
              // تشغيل صوت خفيف فقط عند الرسائل العامة في الغرفة الحالية
              if (chatMessage.senderId !== state.currentUser?.id && roomId === state.currentRoomId) {
                playNotificationSound();
              }
            }
            break;
          }
          case 'messageDeleted': {
            const { messageId, roomId } = envelope as any;
            if (messageId && roomId) {
              const existing = state.roomMessages[roomId] || [];
              const next = existing.filter((m) => m.id !== messageId);
              dispatch({ type: 'SET_ROOM_MESSAGES', payload: { roomId, messages: next } });
            }
            break;
          }
          
          case 'roomMessages': {
            const { messages, roomId: payloadRoomId } = envelope as any;
            if (Array.isArray(messages)) {
              const roomId = payloadRoomId || state.currentRoomId;
              const formattedMessages = mapDbMessagesToChatMessages(messages, roomId);
              dispatch({ 
                type: 'SET_ROOM_MESSAGES', 
                payload: { roomId, messages: formattedMessages }
              });
            }
            break;
          }
          
          case 'onlineUsers': {
            if (Array.isArray(envelope.users)) {
              dispatch({ type: 'SET_ONLINE_USERS', payload: envelope.users });
            }
            break;
          }
          
          case 'userJoined': {
            if (envelope.user) {
              dispatch({ 
                type: 'SET_ONLINE_USERS', 
                payload: [...state.onlineUsers.filter(u => u.id !== envelope.user.id), envelope.user] 
              });
            }
            break;
          }
          
          case 'userLeft': {
            if (envelope.userId) {
              dispatch({ 
                type: 'SET_ONLINE_USERS', 
                payload: state.onlineUsers.filter(u => u.id !== envelope.userId) 
              });
            }
            break;
          }
          
          case 'kicked': {
            // إظهار عدّاد الطرد للمستخدم المستهدف فقط
            const targetId = envelope.targetUserId;
            if (targetId && targetId === state.currentUser?.id) {
              dispatch({ type: 'SET_SHOW_KICK_COUNTDOWN', payload: true });
              // إضافة رسالة واضحة للمستخدم
              const duration = (envelope as any).duration || 15;
              const reason = (envelope as any).reason || 'بدون سبب';
              const moderator = (envelope as any).moderator || 'مشرف';
              alert(`تم طردك من الدردشة بواسطة ${moderator}\nالسبب: ${reason}\nالمدة: ${duration} دقيقة`);
            }
            break;
          }
          
          case 'blocked': {
            // معالجة الحجب النهائي
            if (state.currentUser?.id) {
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
            if (action === 'banned' && targetId && targetId === state.currentUser?.id) {
              dispatch({ type: 'SET_SHOW_KICK_COUNTDOWN', payload: true });
            }
            break;
          }
          
          case 'error':
          case 'warning': {
            console.warn('⚠️ خطأ من السيرفر:', envelope.message);
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

    // بث تحديثات غرفة البث وأحداث المايك عبر قنوات Socket المخصصة
    const emitToBroadcastHandlers = (payload: any) => {
      broadcastHandlers.current.forEach((handler) => {
        try { handler(payload); } catch (err) { /* ignore single handler error */ }
      });
    };

    socketInstance.on('roomUpdate', (message: any) => {
      emitToBroadcastHandlers(message);
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
      webrtcOfferHandlers.current.forEach((h) => { try { h(payload); } catch {} });
    });
    socketInstance.on('webrtc-answer', (payload: any) => {
      webrtcAnswerHandlers.current.forEach((h) => { try { h(payload); } catch {} });
    });
    socketInstance.on('webrtc-ice-candidate', (payload: any) => {
      webrtcIceHandlers.current.forEach((h) => { try { h(payload); } catch {} });
    });

    // معالج الرسائل الخاصة
    // Unified private message handling
    const handlePrivateMessage = (incoming: any) => {
      try {
        const envelope = incoming?.envelope ? incoming.envelope : incoming;
        const payload = envelope?.message ?? envelope;
        const message = payload?.message ?? payload;
        if (message?.sender) {
          const chatMessage: ChatMessage = {
            id: message.id,
            content: message.content,
            senderId: message.sender.id,
            timestamp: message.timestamp || new Date().toISOString(),
            messageType: message.messageType || 'text',
            sender: message.sender,
            isPrivate: true
          };
          const conversationId = message.senderId === state.currentUser?.id 
            ? message.receiverId 
            : message.senderId;
          dispatch({ 
            type: 'SET_PRIVATE_MESSAGE', 
            payload: { userId: conversationId, message: chatMessage }
          });
          if (chatMessage.senderId !== state.currentUser?.id) {
            playNotificationSound();
          }
        }
      } catch (error) {
        console.error('❌ خطأ في معالجة الرسالة الخاصة:', error);
      }
    };

    socketInstance.on('privateMessage', handlePrivateMessage);
    // ملاحظة: نتعامل مع الرسائل الخاصة فقط عبر حدث 'privateMessage' المخصص لتجنّب التكرار
    // منع أي إشعار يشبه الخاص من مسار الرسائل العامة

      // معالج حدث الطرد
      socketInstance.on('kicked', (data: any) => {
        if (state.currentUser?.id) {
          const duration = data.duration || 15;
          const reason = data.reason || 'بدون سبب';
          const moderator = data.moderator || 'مشرف';
          
          // إظهار رسالة الطرد
          alert(`تم طردك من الدردشة بواسطة ${moderator}\nالسبب: ${reason}\nالمدة: ${duration} دقيقة`);
          
          // إظهار عداد الطرد
          dispatch({ type: 'SET_SHOW_KICK_COUNTDOWN', payload: true });
          
          // فصل المستخدم بعد 3 ثواني
          setTimeout(() => {
            socketInstance.disconnect();
            window.location.href = '/';
          }, 3000);
        }
      });

      // معالج حدث الحجب
      socketInstance.on('blocked', (data: any) => {
        if (state.currentUser?.id) {
          const reason = data.reason || 'بدون سبب';
          const moderator = data.moderator || 'مشرف';
          
          // إظهار رسالة الحجب
          alert(`تم حجبك نهائياً من الدردشة بواسطة ${moderator}\nالسبب: ${reason}`);
          
          // فصل المستخدم فوراً وإعادة توجيهه
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

    }, [state.currentUser, state.onlineUsers, state.currentRoomId]);

    // Ensure cleanup on unmount
    useEffect(() => {
      return () => {
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
      };
    }, []);

  useEffect(() => {
    const handleOnline = () => {
      if (socket.current && !socket.current.connected) {
        try { socket.current.connect(); } catch {}
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

  // 🔥 SIMPLIFIED Connect function
  const connect = useCallback((user: ChatUser) => {
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
      const s = getSocket();
      socket.current = s;

      // حفظ الجلسة
      saveSession({ userId: user.id, username: user.username, userType: user.userType });

      // إعداد المستمعين
      setupSocketListeners(s);

      // إذا كان متصلاً بالفعل، أرسل المصادقة والانضمام فوراً
      if (s.connected) {
        s.emit('auth', {
          userId: user.id,
          username: user.username,
          userType: user.userType,
        });
        s.emit('joinRoom', {
          roomId: state.currentRoomId || 'general',
          userId: user.id,
          username: user.username,
        });
      }

      // إرسال المصادقة عند الاتصال/إعادة الاتصال يتم من خلال الوحدة المشتركة
      s.on('connect', () => {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
        dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
        dispatch({ type: 'SET_LOADING', payload: false });
      });

      // معالج فشل إعادة الاتصال النهائي
      s.on('reconnect_failed', () => {
        console.warn('⚠️ فشل في إعادة الاتصال بعد عدة محاولات');
        dispatch({ 
          type: 'SET_CONNECTION_ERROR', 
          payload: 'فقدان الاتصال. يرجى إعادة تحميل الصفحة.' 
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
  }, [setupSocketListeners]);

  // 🔥 SIMPLIFIED Join room function
  const joinRoom = useCallback((roomId: string) => {
    if (state.currentRoomId === roomId) {
      return;
    }

    dispatch({ type: 'SET_CURRENT_ROOM', payload: roomId });
    saveSession({ roomId });

    // لا نطلق طلب REST هنا، سنعتمد على Socket لإرسال آخر 10 رسائل بعد الانضمام
    // loadRoomMessages(roomId);

    if (socket.current?.connected) {
      socket.current.emit('joinRoom', { 
        roomId,
        userId: state.currentUser?.id,
        username: state.currentUser?.username 
      });
    }
  }, [loadRoomMessages, state.currentRoomId, state.currentUser]);

  // 🔥 SIMPLIFIED Send message function
  const sendMessage = useCallback((content: string, messageType: string = 'text', receiverId?: number, roomId?: string) => {
    if (!state.currentUser || !socket.current?.connected) {
      console.error('❌ لا يمكن إرسال الرسالة - المستخدم غير متصل');
      return;
    }

    const trimmed = typeof content === 'string' ? content.trim() : '';
    if (!trimmed) {
      console.warn('⚠️ محتوى الرسالة فارغ');
      return;
    }

    // اكتشاف الصور المرسلة كـ base64
    const detectedType = (messageType === 'text' && trimmed.startsWith('data:image')) ? 'image' : messageType;

    const messageData = {
      senderId: state.currentUser.id,
      content: trimmed,
      messageType: detectedType,
      isPrivate: !!receiverId,
      receiverId,
      roomId: roomId || state.currentRoomId
    };

    if (receiverId) {
      socket.current.emit('privateMessage', messageData);
    } else {
      socket.current.emit('publicMessage', messageData);
    }
  }, [state.currentUser, state.currentRoomId]);

  // 🔥 SIMPLIFIED Send room message function
  const sendRoomMessage = useCallback((content: string, roomId: string, messageType: string = 'text') => {
    return sendMessage(content, messageType, undefined, roomId);
  }, [sendMessage]);

  // 🔥 SIMPLIFIED Disconnect function
  const disconnect = useCallback(() => {
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
  const ignoreUser = useCallback((userId: number) => {
    dispatch({ type: 'IGNORE_USER', payload: userId });
  }, []);

  const unignoreUser = useCallback((userId: number) => {
    dispatch({ type: 'UNIGNORE_USER', payload: userId });
  }, []);

  const sendTyping = useCallback(() => {
    if (socket.current?.connected) {
      socket.current.emit('typing', { isTyping: true });
    }
  }, []);

  // Compatibility helpers for UI components
  const handleTyping = useCallback(() => {
    sendTyping();
  }, [sendTyping]);

  const getCurrentRoomMessages = useCallback(() => currentRoomMessages, [currentRoomMessages]);

  const updateCurrentUser = useCallback((updates: Partial<ChatUser>) => {
    if (!state.currentUser) return;
    const merged = { ...state.currentUser, ...updates } as ChatUser;
    dispatch({ type: 'SET_CURRENT_USER', payload: merged });
  }, [state.currentUser]);

  // تحميل سجل المحادثة الخاصة عند فتحها
  const loadPrivateConversation = useCallback(async (otherUserId: number, limit: number = 50) => {
    if (!state.currentUser) return;
    try {
      const data = await apiRequest(`/api/messages/private/${state.currentUser.id}/${otherUserId}?limit=${limit}`);
      const formatted = Array.isArray((data as any)?.messages)
        ? mapDbMessagesToChatMessages((data as any).messages)
        : [];
      dispatch({ type: 'SET_PRIVATE_CONVERSATION', payload: { userId: otherUserId, messages: formatted } });
    } catch (error) {
      console.error('❌ خطأ في تحميل رسائل الخاص:', error);
    }
  }, [state.currentUser]);

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
    setShowKickCountdown: (show: boolean) => dispatch({ type: 'SET_SHOW_KICK_COUNTDOWN', payload: show }),
    setNewMessageSender: (sender: ChatUser | null) => dispatch({ type: 'SET_NEW_MESSAGE_SENDER', payload: sender }),

    // Convenience wrappers
    sendPublicMessage: (content: string) => sendMessage(content, 'text'),
    sendPrivateMessage: (receiverId: number, content: string) => sendMessage(content, 'text', receiverId),

    // Newly added helpers for compatibility
    handleTyping,
    getCurrentRoomMessages,
    updateCurrentUser,
    loadPrivateConversation,

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
    onWebRTCOffer: (handler: (data: any) => void) => { webrtcOfferHandlers.current.add(handler); },
    offWebRTCOffer: (handler: (data: any) => void) => { webrtcOfferHandlers.current.delete(handler); },
    onWebRTCAnswer: (handler: (data: any) => void) => { webrtcAnswerHandlers.current.add(handler); },
    offWebRTCAnswer: (handler: (data: any) => void) => { webrtcAnswerHandlers.current.delete(handler); },
    onWebRTCIceCandidate: (handler: (data: any) => void) => { webrtcIceHandlers.current.add(handler); },
    offWebRTCIceCandidate: (handler: (data: any) => void) => { webrtcIceHandlers.current.delete(handler); },
  };
};