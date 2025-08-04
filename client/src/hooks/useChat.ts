import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ChatUser, ChatMessage, WebSocketMessage, PrivateConversation, Notification } from '@/types/chat';
import { globalNotificationManager, MessageCacheManager, NetworkOptimizer } from '@/lib/chatOptimization';
import { chatAnalytics } from '@/lib/chatAnalytics';
import { apiRequest } from '@/lib/queryClient';

// Audio notification function
const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Fallback: create a simple beep using Web Audio API
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

// State interfaces
interface ChatState {
  currentUser: ChatUser | null;
  onlineUsers: ChatUser[];
  publicMessages: ChatMessage[];
  privateConversations: PrivateConversation;
  ignoredUsers: Set<number>;
  isConnected: boolean;
  typingUsers: Set<string>;
  connectionError: string | null;
  newMessageSender: ChatUser | null;
  isLoading: boolean;
  notifications: Notification[];
  currentRoomId: string;
  roomMessages: Record<string, ChatMessage[]>;
  showKickCountdown: boolean;
  lastUserListUpdate: number; // إضافة تتبع آخر تحديث لقائمة المستخدمين
  messageLoadingStates: Record<string, boolean>; // إضافة حالات تحميل الرسائل للغرف
}

// Action types
type ChatAction = 
  | { type: 'SET_CURRENT_USER'; payload: ChatUser | null }
  | { type: 'SET_ONLINE_USERS'; payload: ChatUser[] }
  | { type: 'ADD_PUBLIC_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_PUBLIC_MESSAGES'; payload: ChatMessage[] }
  | { type: 'ADD_PRIVATE_MESSAGE'; payload: { userId: number; message: ChatMessage } }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_TYPING_USERS'; payload: Set<string> }
  | { type: 'SET_CONNECTION_ERROR'; payload: string | null }
  | { type: 'SET_NEW_MESSAGE_SENDER'; payload: ChatUser | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'SET_ROOM'; payload: string }
  | { type: 'ADD_ROOM_MESSAGE'; payload: { roomId: string; message: ChatMessage | ChatMessage[] } }
  | { type: 'SET_SHOW_KICK_COUNTDOWN'; payload: boolean }
  | { type: 'IGNORE_USER'; payload: number }
  | { type: 'UNIGNORE_USER'; payload: number }
  | { type: 'SET_LAST_USER_UPDATE'; payload: number }
  | { type: 'SET_MESSAGE_LOADING'; payload: { roomId: string; loading: boolean } };

// Initial state
const initialState: ChatState = {
  currentUser: null,
  onlineUsers: [],
  publicMessages: [],
  privateConversations: {},
  ignoredUsers: new Set(),
  isConnected: false,
  typingUsers: new Set(),
  connectionError: null,
  newMessageSender: null,
  isLoading: false,
  notifications: [],
  currentRoomId: 'general',
  roomMessages: {},
  showKickCountdown: false,
  lastUserListUpdate: 0,
  messageLoadingStates: {}
};

// Reducer function
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    
    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: action.payload };
    
    case 'ADD_PUBLIC_MESSAGE':
      return { 
        ...state, 
        publicMessages: [...state.publicMessages, action.payload] 
      };
    
    case 'SET_PUBLIC_MESSAGES':
      return { ...state, publicMessages: action.payload };
    
    case 'ADD_PRIVATE_MESSAGE': {
      const { userId, message } = action.payload;
      return {
        ...state,
        privateConversations: {
          ...state.privateConversations,
          [userId]: [...(state.privateConversations[userId] || []), message]
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
    
    case 'SET_ROOM': {
      const currentMessages = state.roomMessages[action.payload] || [];
      return { 
        ...state, 
        currentRoomId: action.payload,
        publicMessages: currentMessages
      };
    }
    
    case 'ADD_ROOM_MESSAGE': {
      const { roomId, message } = action.payload;
      const newRoomMessages = { ...state.roomMessages };
      
      if (Array.isArray(message)) {
        // إضافة عدة رسائل
        newRoomMessages[roomId] = message;
      } else {
        // إضافة رسالة واحدة
        if (!newRoomMessages[roomId]) {
          newRoomMessages[roomId] = [];
        }
        newRoomMessages[roomId] = [...newRoomMessages[roomId], message];
      }
      
      // تحديث الرسائل العامة إذا كانت الغرفة هي الغرفة الحالية
      const updatedPublicMessages = roomId === state.currentRoomId
        ? newRoomMessages[roomId]
        : state.publicMessages;
      
      return {
        ...state,
        roomMessages: newRoomMessages,
        publicMessages: updatedPublicMessages
      };
    }
    
    case 'SET_SHOW_KICK_COUNTDOWN':
      return { ...state, showKickCountdown: action.payload };
    
    case 'IGNORE_USER':
      return { 
        ...state, 
        ignoredUsers: new Set([...state.ignoredUsers, action.payload]) 
      };
    
    case 'UNIGNORE_USER':
      const newIgnoredUsers = new Set(state.ignoredUsers);
      newIgnoredUsers.delete(action.payload);
      return { ...state, ignoredUsers: newIgnoredUsers };
    
    case 'SET_LAST_USER_UPDATE':
      return { ...state, lastUserListUpdate: action.payload };
    
    case 'SET_MESSAGE_LOADING':
      return {
        ...state,
        messageLoadingStates: {
          ...state.messageLoadingStates,
          [action.payload.roomId]: action.payload.loading
        }
      };
    
    default:
      return state;
  }
}

export function useChat() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  
  // Socket connection
  const socket = useRef<Socket | null>(null);
  
  // تحسين الأداء: مدراء التحسين وآليات cache
  const messageCache = useRef(new MessageCacheManager());
  const userListCache = useRef<{ users: ChatUser[]; timestamp: number } | null>(null);
  const roomMessageCache = useRef<Record<string, { messages: ChatMessage[]; timestamp: number }>>({});
  const pendingRequests = useRef<Set<string>>(new Set());
  
  // Debounce للطلبات المتكررة
  const debouncedRequests = useRef<Record<string, NodeJS.Timeout>>({});
  
  // إضافة متغير للوصول إلى import.meta.env
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // دالة مساعدة لمنع الطلبات المتكررة
  const debounceRequest = useCallback((key: string, fn: () => void, delay: number = 1000) => {
    if (debouncedRequests.current[key]) {
      clearTimeout(debouncedRequests.current[key]);
    }
    
    debouncedRequests.current[key] = setTimeout(() => {
      fn();
      delete debouncedRequests.current[key];
    }, delay);
  }, []);
  
  // دالة للتحقق من صحة cache
  const isCacheValid = useCallback((timestamp: number, maxAge: number = 30000) => {
    return Date.now() - timestamp < maxAge;
  }, []);

  // Memoized values to prevent unnecessary re-renders - إصلاح المنطق
  const memoizedOnlineUsers = useMemo(() => {
    // عرض جميع المستخدمين بدون فلترة معقدة
    return state.onlineUsers.filter(user => {
      // إظهار جميع المستخدمين إلا المتجاهلين فقط
      return !state.ignoredUsers.has(user.id);
    });
  }, [state.onlineUsers, state.ignoredUsers]);

  // Notifications state
  const [levelUpNotification, setLevelUpNotification] = useState<{
    show: boolean;
    oldLevel: number;
    newLevel: number;
    levelInfo?: any;
  }>({ show: false, oldLevel: 1, newLevel: 1 });
  
  const [achievementNotification, setAchievementNotification] = useState<{
    show: boolean;
    message: string;
  }>({ show: false, message: '' });
  
  const [dailyBonusNotification, setDailyBonusNotification] = useState<{
    show: boolean;
    points: number;
  }>({ show: false, points: 0 });

  // فلترة الرسائل غير الصالحة - محسنة
  const isValidMessage = useCallback((message: ChatMessage): boolean => {
    // التأكد من وجود بيانات المرسل
    if (!message.sender || !message.sender.username || message.sender.username === 'مستخدم') {
      console.warn('رسالة مرفوضة - بيانات مرسل غير صالحة:', message);
      return false;
    }
    
    // التأكد من وجود محتوى الرسالة
    if (!message.content || message.content.trim() === '') {
      console.warn('رسالة مرفوضة - محتوى فارغ:', message);
      return false;
    }
    
    // التأكد من وجود معرف المرسل
    if (!message.senderId || message.senderId <= 0) {
      console.warn('رسالة مرفوضة - معرف مرسل غير صالح:', message);
      return false;
    }
    
    return true;
  }, []);

  // Socket event handlers - محسّنة مع تقليل الطلبات المتكررة
  const setupSocketListeners = useCallback((user: ChatUser) => {
    if (!socket.current) return;

    socket.current.on('connect', () => {
      console.log('🔗 متصل بالخادم');
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
      
      // إرسال بيانات المصادقة
      socket.current?.emit('auth', {
        userId: user.id,
        username: user.username,
        userType: user.userType
      });
    });

    socket.current.on('disconnect', (reason) => {
      console.log('🔌 انقطع الاتصال:', reason);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
      
      // تنظيف الفترة الزمنية للتحديث الدوري
      if ((socket.current as any)?.userListInterval) {
        clearInterval((socket.current as any).userListInterval);
      }
      
      if (reason === 'io server disconnect') {
        socket.current?.connect();
      }
    });

    socket.current.on('socketConnected', (data) => {
      console.log('🔌 اتصال Socket:', data.message);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
    });

    socket.current.on('authenticated', (data) => {
      console.log('✅ تم الاتصال بنجاح:', data.message);
      dispatch({ type: 'SET_CURRENT_USER', payload: data.user });
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
      
      // تحميل الرسائل الموجودة من قاعدة البيانات مرة واحدة فقط
      loadExistingMessages();
      
      // طلب قائمة المستخدمين المتصلين مع debouncing
      console.log('🔄 طلب قائمة المستخدمين المتصلين...');
      debounceRequest('requestOnlineUsers', () => {
        if (socket.current?.connected) {
          socket.current.emit('requestOnlineUsers');
        }
      }, 500);
      
      // تحديث دوري للمستخدمين مع تقليل التكرار (كل دقيقة بدلاً من 30 ثانية)
      const userListInterval = setInterval(() => {
        if (socket.current?.connected) {
          // فقط إذا لم يكن هناك تحديث حديث
          const timeSinceLastUpdate = Date.now() - (state.lastUserListUpdate || 0);
          if (timeSinceLastUpdate > 45000) { // 45 ثانية
            socket.current.emit('requestOnlineUsers');
          }
        }
      }, 60000); // كل دقيقة
      
      // حفظ معرف الفترة الزمنية للتنظيف لاحقاً
      (socket.current as any).userListInterval = userListInterval;
    });

    socket.current.on('message', (message: WebSocketMessage) => {
      try {
        switch (message.type) {
          case 'error':
            console.error('خطأ من الخادم:', message.message);
            break;
            
          case 'warning':
            console.warn('تحذير:', message.message);
            break;
            
          case 'onlineUsers':
            if (message.users) {
              // تحديث cache المستخدمين
              userListCache.current = {
                users: message.users,
                timestamp: Date.now()
              };
              
              console.log('👥 تحديث قائمة المستخدمين:', message.users.length);
              dispatch({ type: 'SET_ONLINE_USERS', payload: message.users });
              
              // تحديث timestamp آخر تحديث
              dispatch({ type: 'SET_LAST_USER_UPDATE', payload: Date.now() });
            }
            break;
            
          case 'userJoined':
            if (message.user) {
              console.log('👤 مستخدم جديد انضم:', message.user.username);
              // التحقق من عدم وجود المستخدم مسبقاً قبل إضافته
              const userExists = state.onlineUsers.some(u => u.id === message.user.id);
              if (!userExists) {
                dispatch({ type: 'SET_ONLINE_USERS', payload: [...state.onlineUsers, message.user] });
              } else {
                // تحديث بيانات المستخدم الموجود
                const updatedUsers = state.onlineUsers.map(u => 
                  u.id === message.user.id ? message.user : u
                );
                dispatch({ type: 'SET_ONLINE_USERS', payload: updatedUsers });
              }
              
              // طلب قائمة محدثة من الخادم للتأكد
              setTimeout(() => {
                if (socket.current?.connected) {
                  socket.current.emit('requestOnlineUsers');
                }
              }, 500);
            }
            break;
            
          case 'userLeft':
            if (message.userId) {
              console.log('👤 مستخدم غادر:', message.userId);
              const updatedUsers = state.onlineUsers.filter(u => u.id !== message.userId);
              dispatch({ type: 'SET_ONLINE_USERS', payload: updatedUsers });
            }
            break;
            
          case 'newMessage':
            console.log('📨 استقبال رسالة جديدة:', message.message);
            if (message.message && typeof message.message === 'object' && !message.message.isPrivate) {
              if (!isValidMessage(message.message as ChatMessage)) {
                console.warn('رسالة مرفوضة من الخادم:', message.message);
                break;
              }
              
              if (!state.ignoredUsers.has(message.message.senderId)) {
                const chatMessage = message.message as ChatMessage;
                // إضافة roomId من الرسالة مع fallback للغرفة العامة
                const messageRoomId = (chatMessage as any).roomId || 'general';
                console.log(`✅ إضافة رسالة للغرفة ${messageRoomId} (الغرفة الحالية: ${state.currentRoomId})`);
                
                dispatch({ 
                  type: 'ADD_ROOM_MESSAGE', 
                  payload: { roomId: messageRoomId, message: chatMessage }
                });
                
                // تشغيل صوت الإشعار للرسائل من الآخرين في الغرفة الحالية فقط
                if (chatMessage.senderId !== user.id && messageRoomId === state.currentRoomId) {
                  playNotificationSound();
                }

                // إظهار التنبيه فقط للرسائل في الغرفة الحالية
                if (chatMessage.senderId !== user.id && messageRoomId === state.currentRoomId) {
                  dispatch({ type: 'SET_NEW_MESSAGE_SENDER', payload: chatMessage.sender });
                }
              } else {
                console.log('🚫 رسالة من مستخدم متجاهل:', message.message.senderId);
              }
            }
            break;
            
          case 'privateMessage':
            if (message.message && typeof message.message === 'object' && message.message.isPrivate) {
              if (!isValidMessage(message.message as ChatMessage)) {
                console.warn('رسالة خاصة مرفوضة من الخادم:', message.message);
                break;
              }
              
              const otherUserId = message.message.senderId === user.id 
                ? message.message.receiverId! 
                : message.message.senderId;
              
              if (!state.ignoredUsers.has(message.message.senderId)) {
                dispatch({
                  type: 'ADD_PRIVATE_MESSAGE',
                  payload: { userId: otherUserId, message: message.message as ChatMessage }
                });
                
                if (message.message.senderId !== user.id) {
                  playNotificationSound();
                  dispatch({ 
                    type: 'SET_NEW_MESSAGE_SENDER', 
                    payload: (message.message as ChatMessage).sender! 
                  });
                  
                  // إشعار مرئي في المتصفح
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('رسالة خاصة جديدة 📱', {
                      body: `${(message.message as ChatMessage).sender?.username}: ${(message.message as ChatMessage).content.slice(0, 50)}...`,
                      icon: '/favicon.ico'
                    });
                  }
                }
              }
            }
            break;

          case 'typing':
            if (message.username && message.isTyping !== undefined) {
              dispatch({
                type: 'SET_TYPING_USERS',
                payload: message.isTyping 
                  ? new Set([...state.typingUsers, message.username])
                  : new Set([...state.typingUsers].filter(u => u !== message.username))
              });
            }
            break;

          case 'kicked':
            dispatch({ type: 'SET_SHOW_KICK_COUNTDOWN', payload: true });
            break;

          case 'newWallPost':
            console.log('📌 منشور جديد على الحائط:', message.post);
            // يمكن إضافة معالجة محددة هنا لتحديث قائمة المنشورات
            // أو إرسال إشعار للمستخدم
            if (message.post?.username !== user.username) {
              // إشعار صوتي للمنشورات الجديدة
              playNotificationSound();
              
              // إشعار مرئي في المتصفح
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('منشور جديد على الحائط 📌', {
                  body: `${message.post.username} نشر منشوراً جديداً`,
                  icon: '/favicon.ico'
                });
              }
            }
            break;

          case 'wallPostReaction':
            console.log('👍 تفاعل جديد على منشور:', message.post);
            // يمكن إضافة معالجة محددة هنا لتحديث التفاعلات
            break;

          case 'wallPostDeleted':
            console.log('🗑️ تم حذف منشور:', message.postId);
            // يمكن إضافة معالجة محددة هنا لإزالة المنشور من القائمة
            break;
            
          case 'roomJoined':
            if (message.roomId) {
              console.log(`✅ تم الانضمام للغرفة: ${message.roomId}`);
              dispatch({ type: 'SET_ROOM', payload: message.roomId });
              
              // تحميل رسائل الغرفة الجديدة مع cache
              debounceRequest(`loadRoom_${message.roomId}`, () => {
                loadRoomMessages(message.roomId);
              }, 300);
              
              // تحديث قائمة المستخدمين في الغرفة
              if (message.users) {
                userListCache.current = {
                  users: message.users,
                  timestamp: Date.now()
                };
                dispatch({ type: 'SET_ONLINE_USERS', payload: message.users });
              }
            }
            break;
            
                      case 'userJoinedRoom':
              if (message.username && message.roomId) {
                console.log(`👤 ${message.username} انضم للغرفة: ${message.roomId}`);
                
                // إذا كانت الغرفة هي الغرفة الحالية، تحديث محدود
                if (message.roomId === state.currentRoomId) {
                  // تحديث مؤجل لتجنب التحديثات المتكررة
                  debounceRequest('updateUsersAfterJoin', () => {
                    if (socket.current?.connected) {
                      socket.current.emit('requestOnlineUsers');
                    }
                  }, 1000); // انتظار ثانية واحدة
                }
              }
              break;
              
            case 'userLeftRoom':
              if (message.username && message.roomId) {
                console.log(`👤 ${message.username} غادر الغرفة: ${message.roomId}`);
                
                // إذا كانت الغرفة هي الغرفة الحالية، تحديث محدود
                if (message.roomId === state.currentRoomId) {
                  // تحديث مؤجل لتجنب التحديثات المتكررة
                  debounceRequest('updateUsersAfterLeave', () => {
                    if (socket.current?.connected) {
                      socket.current.emit('requestOnlineUsers');
                    }
                  }, 1000); // انتظار ثانية واحدة
                }
              }
              break;

          default:
            break;
        }
      } catch (error) {
        console.error('خطأ في معالجة الرسالة:', error);
      }
    });
  }, [state.lastUserListUpdate, debounceRequest, loadExistingMessages]);

  // Connect function - محسنة
  const connect = useCallback((user: ChatUser) => {
    dispatch({ type: 'SET_CURRENT_USER', payload: user });
    dispatch({ type: 'SET_LOADING', payload: true });
    
    // إضافة المستخدم الحالي للقائمة فوراً
    dispatch({ type: 'SET_ONLINE_USERS', payload: [user] });

    try {
      // إنشاء اتصال Socket.IO
      if (!socket.current) {
        // Use dynamic URL: production uses current origin, development uses localhost
        const isDevelopment = import.meta.env.DEV;
        const serverUrl = isDevelopment 
          ? (import.meta.env.VITE_SERVER_URL || 'http://localhost:5000')
          : window.location.origin;
        
        console.log('🔌 جاري الاتصال بـ Socket.IO على:', serverUrl);
        socket.current = io(serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          autoConnect: true,
          forceNew: false
        });
      }

      setupSocketListeners(user);

    } catch (error) {
      console.error('خطأ في الاتصال:', error);
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'فشل في الاتصال بالخادم' });
    }
  }, [setupSocketListeners]);

  // Load room messages function - محسنة مع cache
  const loadRoomMessages = useCallback(async (roomId: string) => {
    // منع التحميل المتكرر
    const requestKey = `loadRoom_${roomId}`;
    if (pendingRequests.current.has(requestKey)) {
      console.log(`⏳ طلب تحميل الغرفة ${roomId} قيد التنفيذ بالفعل`);
      return;
    }
    
    // التحقق من cache
    const cached = roomMessageCache.current[roomId];
    if (cached && isCacheValid(cached.timestamp, 60000)) { // cache لمدة دقيقة
      console.log(`💾 استخدام cache للغرفة ${roomId}`);
      dispatch({ 
        type: 'ADD_ROOM_MESSAGE', 
        payload: { roomId, message: cached.messages }
      });
      return;
    }

    // إظهار حالة التحميل
    dispatch({ type: 'SET_MESSAGE_LOADING', payload: { roomId, loading: true } });
    pendingRequests.current.add(requestKey);

    try {
      console.log(`📥 تحميل رسائل الغرفة: ${roomId}`);
      const response = await fetch(`/api/messages/room/${roomId}?limit=50`);
      if (response.ok) {
        const data = await response.json();
        if (data.messages && Array.isArray(data.messages)) {
          console.log(`✅ تم تحميل ${data.messages.length} رسالة من الغرفة ${roomId}`);
          
          // تحويل الرسائل إلى التنسيق المطلوب
          const formattedMessages = data.messages.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            senderId: msg.senderId,
            sender: msg.sender,
            messageType: msg.messageType || 'text',
            isPrivate: msg.isPrivate || false,
            roomId: msg.roomId || roomId
          }));
          
          // حفظ في cache
          roomMessageCache.current[roomId] = {
            messages: formattedMessages,
            timestamp: Date.now()
          };
          
          // إضافة الرسائل للغرفة
          dispatch({ 
            type: 'ADD_ROOM_MESSAGE', 
            payload: { roomId, message: formattedMessages }
          });
        }
      } else {
        console.error(`❌ فشل في تحميل رسائل الغرفة ${roomId}:`, response.status);
      }
    } catch (error) {
      console.error(`❌ خطأ في تحميل رسائل الغرفة ${roomId}:`, error);
    } finally {
      dispatch({ type: 'SET_MESSAGE_LOADING', payload: { roomId, loading: false } });
      pendingRequests.current.delete(requestKey);
    }
  }, [isCacheValid]);

  // Join room function
  const joinRoom = useCallback((roomId: string) => {
    console.log(`🔄 انضمام للغرفة: ${roomId}`);
    // لا نغير الغرفة الحالية حتى نتلقى تأكيد من السيرفر
    socket.current?.emit('joinRoom', { roomId });
  }, []);

  // Send message function - محسنة
  const sendMessage = useCallback((content: string, messageType: string = 'text', receiverId?: number, roomId?: string) => {
    if (!state.currentUser || !socket.current?.connected) {
      console.error('❌ لا يمكن إرسال الرسالة - المستخدم غير متصل');
      return;
    }

    const targetRoomId = roomId || state.currentRoomId;

    const messageData = {
      senderId: state.currentUser.id,
      content,
      messageType,
      isPrivate: !!receiverId,
      receiverId,
      roomId: targetRoomId
    };

    console.log('📤 إرسال رسالة:', messageData);
    
    if (receiverId) {
      // رسالة خاصة
      socket.current.emit('privateMessage', messageData);
    } else {
      // رسالة عامة
      socket.current.emit('publicMessage', messageData);
    }
  }, [state.currentUser, state.currentRoomId]);

  // دالة إرسال رسالة لغرفة محددة
  const sendRoomMessage = useCallback((content: string, roomId: string, messageType: string = 'text') => {
    return sendMessage(content, messageType, undefined, roomId);
  }, [sendMessage]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (socket.current) {
      socket.current.disconnect();
      socket.current = null;
    }
    
    dispatch({ type: 'SET_CURRENT_USER', payload: null });
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
    dispatch({ type: 'SET_ONLINE_USERS', payload: [] });
    dispatch({ type: 'SET_PUBLIC_MESSAGES', payload: [] });
  }, []);

  // Ignore/Unignore user functions
  const ignoreUser = useCallback((userId: number) => {
    dispatch({ type: 'IGNORE_USER', payload: userId });
  }, []);

  const unignoreUser = useCallback((userId: number) => {
    dispatch({ type: 'UNIGNORE_USER', payload: userId });
  }, []);

  // إلغاء - لا نريد جلب جميع المستخدمين، فقط المتصلين
  const fetchAllUsers = useCallback(() => {
    // استخدام requestOnlineUsers بدلاً من الاستدعاء المباشر
    requestOnlineUsers();
  }, [requestOnlineUsers]);

  // طلب قائمة المستخدمين المحسن مع cache
  const requestOnlineUsers = useCallback(() => {
    // التحقق من cache أولاً
    if (userListCache.current && isCacheValid(userListCache.current.timestamp, 15000)) {
      console.log('💾 استخدام cache لقائمة المستخدمين');
      dispatch({ type: 'SET_ONLINE_USERS', payload: userListCache.current.users });
      return;
    }

    debounceRequest('requestOnlineUsers', () => {
      if (socket.current?.connected) {
        socket.current.emit('requestOnlineUsers');
      }
    }, 500);
  }, [isCacheValid, debounceRequest]);

  // تحميل الرسائل الموجودة من قاعدة البيانات - محسنة
  const loadExistingMessages = useCallback(async () => {
    // منع التحميل المتكرر
    if (pendingRequests.current.has('loadExisting')) {
      return;
    }
    
    pendingRequests.current.add('loadExisting');
    
    try {
      console.log('📥 تحميل الرسائل الموجودة من قاعدة البيانات...');
      
      // تحميل رسائل الغرفة العامة مع cache
      const generalCached = roomMessageCache.current['general'];
      if (generalCached && isCacheValid(generalCached.timestamp, 120000)) { // cache لمدتين
        console.log('💾 استخدام cache للرسائل العامة');
        dispatch({ 
          type: 'ADD_ROOM_MESSAGE', 
          payload: { roomId: 'general', message: generalCached.messages }
        });
        
        if (state.currentRoomId === 'general') {
          dispatch({ type: 'SET_PUBLIC_MESSAGES', payload: generalCached.messages });
        }
        return;
      }
      
      const generalResponse = await fetch('/api/messages/room/general?limit=50');
      if (generalResponse.ok) {
        const generalData = await generalResponse.json();
        if (generalData.messages && Array.isArray(generalData.messages)) {
          console.log(`✅ تم تحميل ${generalData.messages.length} رسالة من الغرفة العامة`);
          
          const formattedMessages = generalData.messages.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            senderId: msg.senderId,
            sender: msg.sender,
            messageType: msg.messageType || 'text',
            isPrivate: msg.isPrivate || false,
            roomId: msg.roomId || 'general'
          }));
          
          // حفظ في cache
          roomMessageCache.current['general'] = {
            messages: formattedMessages,
            timestamp: Date.now()
          };
          
          dispatch({ 
            type: 'ADD_ROOM_MESSAGE', 
            payload: { roomId: 'general', message: formattedMessages }
          });
          
          if (state.currentRoomId === 'general') {
            dispatch({ type: 'SET_PUBLIC_MESSAGES', payload: formattedMessages });
          }
        }
      }
    } catch (error) {
      console.error('❌ خطأ في تحميل الرسائل:', error);
    } finally {
      pendingRequests.current.delete('loadExisting');
    }
  }, [state.currentRoomId, isCacheValid]);

  // Send typing indicator - محسنة مع throttling
  const sendTyping = useCallback(() => {
    if (socket.current?.connected) {
      socket.current.emit('typing', { isTyping: true });
    }
  }, []);

  return {
    // State
    currentUser: state.currentUser,
    onlineUsers: memoizedOnlineUsers,
    publicMessages: state.publicMessages,
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
    
    // Actions
    connect,
    disconnect,
    sendMessage,
    joinRoom,
    ignoreUser,
    unignoreUser,
    sendTyping,
    fetchAllUsers,
    setShowKickCountdown: (show: boolean) => dispatch({ type: 'SET_SHOW_KICK_COUNTDOWN', payload: show }),
    setNewMessageSender: (sender: ChatUser | null) => dispatch({ type: 'SET_NEW_MESSAGE_SENDER', payload: sender }),

    // إصلاح: دوال مطلوبة للمكونات
    sendPublicMessage: (content: string) => sendMessage(content, 'text'),
    sendPrivateMessage: (receiverId: number, content: string) => sendMessage(content, 'text', receiverId),
    sendRoomMessage: (content: string, roomId: string) => sendRoomMessage(content, roomId),
    loadRoomMessages,
    handleTyping: () => sendTyping(),
    handlePrivateTyping: () => sendTyping(),
  };
}