import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import type { Socket } from 'socket.io-client';

import type { PrivateConversation } from '../../../shared/types';

import { apiRequest } from '@/lib/queryClient';
import { getSocket, saveSession, clearSession } from '@/lib/socket';
import type { ChatUser, ChatMessage, RoomWebSocketMessage as WebSocketMessage } from '@/types/chat';
import type { Notification } from '@/types/chat';
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
      const existingMessages = state.privateConversations[userId] || [];
      
      // منع التكرار - التحقق من وجود الرسالة بنفس ID أو نفس المحتوى والوقت
      const isDuplicate = existingMessages.some(msg => 
        (message.id && msg.id === message.id) || 
        (msg.content === message.content && 
         msg.senderId === message.senderId &&
         Math.abs(new Date(msg.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000)
      );
      
      if (isDuplicate) {
        return state; // تجاهل الرسالة المكررة
      }
      
      return {
        ...state,
        privateConversations: {
          ...state.privateConversations,
          [userId]: [...existingMessages, message]
        }
      };
    }
    
    case 'SET_PRIVATE_CONVERSATION': {
      const { userId, messages } = action.payload;
      // إزالة التكرارات بناءً على ID الرسالة
      const uniqueMessages = messages.reduce((acc: ChatMessage[], msg) => {
        const exists = acc.some(m => 
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
          [userId]: uniqueMessages
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

export function useChat() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const socketRef = useRef<Socket | null>(null);
  const sendTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const broadcastHandlers = useRef<Map<string, (message: any) => void>>(new Map());
  
  // إضافة ref لـ debouncing تحديثات المستخدمين
  const pendingUsersUpdate = useRef<ChatUser[] | null>(null);
  const usersUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  
  // دالة debounced لتحديث قائمة المستخدمين
  const debouncedSetOnlineUsers = useCallback((users: ChatUser[]) => {
    pendingUsersUpdate.current = users;
    
    if (usersUpdateTimer.current) {
      clearTimeout(usersUpdateTimer.current);
    }
    
    usersUpdateTimer.current = setTimeout(() => {
      if (pendingUsersUpdate.current) {
        dispatch({ type: 'SET_ONLINE_USERS', payload: pendingUsersUpdate.current });
        pendingUsersUpdate.current = null;
      }
    }, 100); // تأخير 100ms لتجميع التحديثات
  }, []);
  
  // 🔥 SIMPLIFIED loading management - مصدر واحد
  const loadingRooms = useRef<Set<string>>(new Set());
  
  // Broadcast handlers registry
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
    {
      const filtered = state.onlineUsers.filter(user => user && user.id && user.username && user.userType && !state.ignoredUsers.has(user.id));
      // إزالة التكرارات
      const dedup = new Map<number, ChatUser>();
      for (const u of filtered) { if (!dedup.has(u.id)) dedup.set(u.id, u); }
      return Array.from(dedup.values());
    },
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
  const onlineUsersIntervalRef = useRef<number | null>(null);
  const lastUserListRequestAtRef = useRef<number>(0);
  
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

    // إعداد مؤقّت تحديث دوري لقائمة المتصلين مع Throttle لمنع التحميل الزائد
    if (onlineUsersIntervalRef.current) {
      clearInterval(onlineUsersIntervalRef.current);
    }
    const ouIntervalId = window.setInterval(() => {
      if (!socketInstance.connected) return;
      const now = Date.now();
      if (now - lastUserListRequestAtRef.current >= 10000) {
        try {
          socketInstance.emit('requestOnlineUsers');
          lastUserListRequestAtRef.current = now;
        } catch {}
      }
    }, 30000);
    onlineUsersIntervalRef.current = ouIntervalId;

    // دالة مساعدة لطلب القائمة مع Throttle فوري
    const requestUsersThrottled = () => {
      const now = Date.now();
      if (now - lastUserListRequestAtRef.current >= 1500) {
        try {
          socketInstance.emit('requestOnlineUsers');
          lastUserListRequestAtRef.current = now;
        } catch {}
      }
    };

    // ✅ معالج واحد للرسائل - حذف التضارب
    socketInstance.on('message', (data: any) => {
      try {
        const envelope = data.envelope || data;
        
        // تحديث الثيم عند وصول بث theme_update
        if (envelope.type === 'theme_update') {
          const { userId, userTheme } = envelope as any;
          if (userId && userTheme) {
            if (state.currentUser?.id === userId) {
              dispatch({ type: 'SET_CURRENT_USER', payload: { ...state.currentUser, userTheme } as any });
            }
            const updatedOnline = state.onlineUsers.map(u => u.id === userId ? { ...u, userTheme } : u);
            dispatch({ type: 'SET_ONLINE_USERS', payload: updatedOnline });
          }
        }

        // تحديث تأثير البروفايل فقط عند وصول بث profileEffectChanged
        if (envelope.type === 'profileEffectChanged') {
          const { userId, profileEffect, user } = envelope as any;
          const targetId = userId || user?.id;
          if (targetId) {
            if (state.currentUser?.id === targetId) {
              dispatch({ 
                type: 'SET_CURRENT_USER', 
                payload: { 
                  ...state.currentUser, 
                  profileEffect: (profileEffect ?? user?.profileEffect ?? state.currentUser.profileEffect)
                } as any 
              });
            }
            const updatedOnline = state.onlineUsers.map(u => 
              u.id === targetId 
                ? { 
                    ...u, 
                    profileEffect: (profileEffect ?? user?.profileEffect ?? u.profileEffect)
                  }
                : u
            );
            dispatch({ type: 'SET_ONLINE_USERS', payload: updatedOnline });
          }
        }

        // بث خاص لتحديث لون الاسم فقط
        if (envelope.type === 'usernameColorChanged') {
          const { userId, color, user } = envelope as any;
          const targetId = userId || user?.id;
          if (targetId && color) {
            if (state.currentUser?.id === targetId) {
              dispatch({ type: 'SET_CURRENT_USER', payload: { ...state.currentUser, usernameColor: color } as any });
            }
            const updatedOnline = state.onlineUsers.map(u => u.id === targetId ? { ...u, usernameColor: color } : u);
            dispatch({ type: 'SET_ONLINE_USERS', payload: updatedOnline });
          }
        }

        // تحديث لون صندوق المستخدم (profileBackgroundColor)
        if (envelope.type === 'user_background_updated') {
          const { data } = envelope as any;
          const targetId = data?.userId;
          const color = data?.profileBackgroundColor;
          if (targetId && color) {
            if (state.currentUser?.id === targetId) {
              dispatch({ type: 'SET_CURRENT_USER', payload: { ...state.currentUser, profileBackgroundColor: color } as any });
            }
            const updatedOnline = state.onlineUsers.map(u => u.id === targetId ? { ...u, profileBackgroundColor: color } : u);
            dispatch({ type: 'SET_ONLINE_USERS', payload: updatedOnline });
          }
        }

        // تحديث بيانات المستخدم الموحدة
        if (envelope.type === 'userUpdated') {
          const updatedUser: ChatUser | undefined = (envelope as any).user;
          if (updatedUser && updatedUser.id) {
            if (state.currentUser?.id === updatedUser.id) {
              dispatch({ type: 'SET_CURRENT_USER', payload: { ...state.currentUser, ...updatedUser } as any });
            }
            const updatedOnline = state.onlineUsers.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u);
            dispatch({ type: 'SET_ONLINE_USERS', payload: updatedOnline });
          }
        }
        
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
              
              // إضافة الرسالة للغرفة المناسبة (عام فقط)
              if (!chatMessage.isPrivate) {
                dispatch({ 
                  type: 'ADD_ROOM_MESSAGE', 
                  payload: { roomId, message: chatMessage }
                });
              }
              
              // تشغيل صوت خفيف فقط عند الرسائل العامة في الغرفة الحالية
              if (!chatMessage.isPrivate && chatMessage.senderId !== state.currentUser?.id && roomId === state.currentRoomId) {
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
            const roomId = (envelope as any).roomId || 'general';
            if (roomId !== state.currentRoomId) {
              break;
            }
            if (Array.isArray(envelope.users)) {
              const rawUsers = envelope.users as ChatUser[];
              // فلترة صارمة + إزالة المتجاهلين + إزالة التكرارات
              const filtered = rawUsers.filter(u => u && u.id && u.username && u.userType && !state.ignoredUsers.has(u.id));
              const dedup = new Map<number, ChatUser>();
              for (const u of filtered) { if (!dedup.has(u.id)) dedup.set(u.id, u); }
              const nextUsers = Array.from(dedup.values());
              debouncedSetOnlineUsers(nextUsers);
            }
            break;
          }
          
          case 'roomJoined': {
            const roomId = (envelope as any).roomId;
            if (roomId && roomId !== state.currentRoomId) {
              break;
            }
            // استبدال القائمة بالكامل بقائمة الغرفة المرسلة
            const users = (envelope as any).users;
            if (Array.isArray(users)) {
              debouncedSetOnlineUsers(users);
            }
            break;
          }

          case 'userJoinedRoom': {
            const joinedId = (envelope as any).userId;
            const username = (envelope as any).username || (joinedId ? `User#${joinedId}` : 'User');
            if (joinedId && !state.onlineUsers.find(u => u.id === joinedId)) {
              const placeholder = { id: joinedId, username, role: 'member', userType: 'member', isOnline: true } as ChatUser;
              dispatch({ type: 'SET_ONLINE_USERS', payload: [...state.onlineUsers, placeholder] });
              // محاولة تحديث التفاصيل بسرعة ثم طلب القائمة كنسخة احتياطية
              try {
                apiRequest(`/api/users/${joinedId}?t=${Date.now()}`).then((data: any) => {
                  if (data && data.id) {
                    const replaced = state.onlineUsers.filter(u => u.id !== joinedId).concat([{ ...(data as any), isOnline: true } as ChatUser]);
                    dispatch({ type: 'SET_ONLINE_USERS', payload: replaced });
                  } else {
                    requestUsersThrottled();
                  }
                }).catch(() => requestUsersThrottled());
              } catch {
                requestUsersThrottled();
              }
            } else {
              requestUsersThrottled();
            }
            break;
          }
          
          case 'userJoinedRoomWithDetails': {
            const user = (envelope as any).user;
            if (user && user.id) {
              // إذا كان المستخدم موجود، قم بتحديثه بالبيانات الكاملة
              if (state.onlineUsers.find(u => u.id === user.id)) {
                dispatch({ type: 'SET_ONLINE_USERS', payload: state.onlineUsers.map(u => u.id === user.id ? { ...user, isOnline: true } : u) });
              } else {
                // إذا لم يكن موجود، أضفه بالبيانات الكاملة
                dispatch({ type: 'SET_ONLINE_USERS', payload: [...state.onlineUsers, { ...user, isOnline: true }] });
              }
            }
            break;
          }
          
          case 'userLeftRoom': {
            const leftId = (envelope as any).userId;
            if (leftId) {
              const next = state.onlineUsers.filter(u => u.id !== leftId);
              dispatch({ type: 'SET_ONLINE_USERS', payload: next });
            }
            break;
          }
          case 'userDisconnected': {
            const uid = (envelope as any).userId;
            if (uid) {
              const next = state.onlineUsers.filter(u => u.id !== uid);
              dispatch({ type: 'SET_ONLINE_USERS', payload: next });
            }
            break;
          }
          case 'userConnected': {
            const u = (envelope as any).user;
            if (u && u.id) {
              if (!state.onlineUsers.find(x => x.id === u.id)) {
                dispatch({ type: 'SET_ONLINE_USERS', payload: [...state.onlineUsers, u] });
              } else {
                dispatch({ type: 'SET_ONLINE_USERS', payload: state.onlineUsers.map(x => x.id === u.id ? { ...x, ...u } : x) });
              }
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

    // أحداث مباشرة محتملة لتحديث قائمة المتصلين فوراً إن وُجدت على الخادم
    socketInstance.on('userDisconnected', (payload: any) => {
      const uid = payload?.userId || payload?.id;
      if (uid) {
        const next = state.onlineUsers.filter(u => u.id !== uid);
        dispatch({ type: 'SET_ONLINE_USERS', payload: next });
      }
    });
    socketInstance.on('userConnected', (payload: any) => {
      const user = payload?.user || payload;
      if (user?.id) {
        if (!state.onlineUsers.find(u => u.id === user.id)) {
          dispatch({ type: 'SET_ONLINE_USERS', payload: [...state.onlineUsers, user] });
        } else {
          dispatch({ type: 'SET_ONLINE_USERS', payload: state.onlineUsers.map(u => u.id === user.id ? { ...u, ...user } : u) });
        }
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
      webrtcOfferHandlers.current.forEach((h) => { try { h(payload); } catch (e) { console.warn('webrtc offer handler error', e); } });
    });
    socketInstance.on('webrtc-answer', (payload: any) => {
      webrtcAnswerHandlers.current.forEach((h) => { try { h(payload); } catch (e) { console.warn('webrtc answer handler error', e); } });
    });
    socketInstance.on('webrtc-ice-candidate', (payload: any) => {
      webrtcIceHandlers.current.forEach((h) => { try { h(payload); } catch (e) { console.warn('webrtc ice handler error', e); } });
    });

    // معالج الرسائل الخاصة المحسن
    const handlePrivateMessage = (incoming: any) => {
      try {
        const envelope = incoming?.envelope ? incoming.envelope : incoming;
        const payload = envelope?.message ?? envelope;
        const message = payload?.message ?? payload;
        
        if (message?.sender && state.currentUser) {
          const chatMessage: ChatMessage = {
            id: message.id,
            content: message.content,
            senderId: message.sender.id,
            timestamp: message.timestamp || new Date().toISOString(),
            messageType: message.messageType || 'text',
            sender: message.sender,
            isPrivate: true
          };
          
          // تحديد معرف المحادثة بشكل محسن
          let conversationId: number;
          if (message.senderId === state.currentUser.id) {
            conversationId = message.receiverId;
          } else {
            conversationId = message.senderId;
          }
          
          // التأكد من صحة معرف المحادثة
          if (conversationId && !isNaN(conversationId) && conversationId !== state.currentUser.id) {
            dispatch({ 
              type: 'SET_PRIVATE_MESSAGE', 
              payload: { userId: conversationId, message: chatMessage }
            });
            
            // تشغيل صوت الإشعار فقط للرسائل الواردة
            if (chatMessage.senderId !== state.currentUser.id) {
              playNotificationSound();
            }
          }
        }
      } catch (error) {
        console.error('❌ خطأ في معالجة الرسالة الخاصة:', error);
      }
    };

    socketInstance.on('privateMessage', handlePrivateMessage);

      // معالج حدث الطرد
      socketInstance.on('kicked', (data: any) => {
        if (state.currentUser?.id === data.userId) {
          const kickerName = data.kickerName || 'مشرف';
          const reason = data.reason || 'بدون سبب';
          
          // إظهار رسالة الطرد
          alert(`تم طردك من الدردشة بواسطة ${kickerName}\nالسبب: ${reason}\nيمكنك العودة بعد 15 دقيقة`);
          
          // إظهار عداد الطرد
          dispatch({ type: 'SET_SHOW_KICK_COUNTDOWN', payload: true });
          
          // فصل المستخدم بعد 3 ثواني
          setTimeout(() => {
            clearSession(); // مسح بيانات الجلسة
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

    }, [state.currentUser, state.onlineUsers, state.currentRoomId]);

    // Ensure cleanup on unmount
    useEffect(() => {
      return () => {
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        if (onlineUsersIntervalRef.current) {
          clearInterval(onlineUsersIntervalRef.current);
          onlineUsersIntervalRef.current = null;
        }
      };
    }, []);

  useEffect(() => {
    const handleOnline = () => {
      if (socketRef.current && !socketRef.current.connected) {
        try { socketRef.current.connect(); } catch {}
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
        const ids: number[] = Array.isArray(data) ? data : (Array.isArray((data as any)?.ignoredUsers) ? (data as any).ignoredUsers : []);
        ids.forEach((id) => dispatch({ type: 'IGNORE_USER', payload: id }));
      } catch (e) {
        console.warn('تعذر جلب قائمة المتجاهلين:', e);
      }
    };
    fetchIgnored();
  }, [state.currentUser?.id]);

  // 🔥 SIMPLIFIED Connect function
  const connect = useCallback((user: ChatUser) => {
    dispatch({ type: 'SET_CURRENT_USER', payload: user });
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // تنظيف الاتصال السابق
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
      }

      // استخدام عميل Socket الموحد
      const s = getSocket();
      socketRef.current = s;

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
        
        // طلب قائمة المتصلين فور الاتصال - تمت الإزالة لتجنب سباق التوقيت مع الانضمام للغرفة
        // سيتم استقبال القائمة الصحيحة عبر حدث roomJoined أو onlineUsers الخاص بالغرفة
      }

      // إرسال المصادقة عند الاتصال/إعادة الاتصال يتم من خلال الوحدة المشتركة
      s.on('connect', () => {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
        dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
        dispatch({ type: 'SET_LOADING', payload: false });
        // طلب محدث لقائمة المتصلين بعد الاتصال - تمت الإزالة لتجنب سباق التوقيت
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
  }, [setupSocketListeners, state.currentRoomId]);

  // 🔥 SIMPLIFIED Join room function
  const joinRoom = useCallback((roomId: string) => {
    if (!roomId || roomId === 'public' || roomId === 'friends') {
      roomId = 'general';
    }
    if (state.currentRoomId === roomId) {
      return;
    }

    dispatch({ type: 'SET_CURRENT_ROOM', payload: roomId });
    saveSession({ roomId });

    if (socketRef.current?.connected && state.currentUser?.id) {
      socketRef.current.emit('joinRoom', { 
        roomId,
        userId: state.currentUser.id,
        username: state.currentUser.username 
      });
    }
  }, [state.currentRoomId, state.currentUser]);

  // 🔥 SIMPLIFIED Send message function
  const sendMessage = useCallback((content: string, messageType: string = 'text', receiverId?: number, roomId?: string) => {
    if (!state.currentUser || !socketRef.current?.connected) {
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
      // إرسال خاص عبر مسار منفصل كلياً
      const endpoint = `/api/private-messages/send`;
      apiRequest(endpoint, { method: 'POST', body: {
        senderId: messageData.senderId,
        receiverId,
        content: messageData.content,
        messageType: messageData.messageType || 'text'
      }}).catch(() => {});
    } else {
      socketRef.current.emit('publicMessage', messageData);
    }
  }, [state.currentUser, state.currentRoomId]);

  // 🔥 SIMPLIFIED Send room message function
  const sendRoomMessage = useCallback((content: string, roomId: string, messageType: string = 'text') => {
    return sendMessage(content, messageType, undefined, roomId);
  }, [sendMessage]);

  // 🔥 SIMPLIFIED Disconnect function
  const disconnect = useCallback(() => {
    clearSession(); // مسح بيانات الجلسة
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    }
    
    // إعادة تعيين الحالة
    dispatch({ type: 'CLEAR_ALL', payload: undefined });
  }, []);

  // 🔥 SIMPLIFIED helper functions
  const ignoreUser = useCallback(async (userId: number) => {
    try {
      if (!state.currentUser?.id) return;
      await apiRequest(`/api/users/${state.currentUser.id}/ignore/${userId}`, { method: 'POST' });
      dispatch({ type: 'IGNORE_USER', payload: userId });
    } catch (e) {
      console.error('فشل في تجاهل المستخدم:', e);
    }
  }, [state.currentUser?.id]);

  const unignoreUser = useCallback(async (userId: number) => {
    try {
      if (!state.currentUser?.id) return;
      await apiRequest(`/api/users/${state.currentUser.id}/ignore/${userId}`, { method: 'DELETE' });
      dispatch({ type: 'UNIGNORE_USER', payload: userId });
    } catch (e) {
      console.error('فشل في إلغاء تجاهل المستخدم:', e);
    }
  }, [state.currentUser?.id]);

  const sendTyping = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', { isTyping: true });
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
    if (!state.currentUser?.id) return;
    try {
      const data = await apiRequest(`/api/private-messages/${state.currentUser.id}/${otherUserId}?limit=${limit}`);
      const formatted = Array.isArray((data as any)?.messages)
        ? mapDbMessagesToChatMessages((data as any).messages)
        : [];
      dispatch({ type: 'SET_PRIVATE_CONVERSATION', payload: { userId: otherUserId, messages: formatted } });
    } catch (error) {
      console.error('❌ خطأ في تحميل رسائل الخاص:', error);
    }
  }, [state.currentUser?.id]);

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

    // Newly added helpers for compatibility
    handleTyping,
    getCurrentRoomMessages,
    updateCurrentUser,
    loadPrivateConversation,

    // Broadcast handlers registration
    addBroadcastMessageHandler: (handler: (data: any) => void) => {
      broadcastHandlers.current.set('roomUpdate', handler);
    },
    removeBroadcastMessageHandler: (handler: (data: any) => void) => {
      broadcastHandlers.current.delete('roomUpdate');
    },

    // WebRTC signaling helpers
    sendWebRTCOffer: (targetUserId: number, roomId: string, sdp: any) => {
      if (!socketRef.current?.connected || !state.currentUser) return;
      socketRef.current.emit('webrtc-offer', {
        roomId,
        targetUserId,
        sdp,
        senderId: state.currentUser.id,
      });
    },
    sendWebRTCAnswer: (targetUserId: number, roomId: string, sdp: any) => {
      if (!socketRef.current?.connected || !state.currentUser) return;
      socketRef.current.emit('webrtc-answer', {
        roomId,
        targetUserId,
        sdp,
        senderId: state.currentUser.id,
      });
    },
    sendWebRTCIceCandidate: (targetUserId: number, roomId: string, candidate: any) => {
      if (!socketRef.current?.connected || !state.currentUser) return;
      socketRef.current.emit('webrtc-ice-candidate', {
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