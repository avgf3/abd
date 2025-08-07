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
  | { type: 'UNIGNORE_USER'; payload: number };

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
  showKickCountdown: false
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
    
    default:
      return state;
  }
}

export function useChat() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  
  // Socket connection
  const socket = useRef<Socket | null>(null);
  
  // تحسين الأداء: مدراء التحسين
  const messageCache = useRef(new MessageCacheManager());
  
  // إضافة متغير لتتبع حالة التحميل
  const isLoadingMessages = useRef(false);
  
  // إضافة متغير للوصول إلى import.meta.env
  const isDevelopment = process.env.NODE_ENV === 'development';
  
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

  // Socket event handlers - مُحسّنة
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
        (socket.current as any).userListInterval = null;
      }
      
      // معالجة أسباب الانقطاع المختلفة
      if (reason === 'io server disconnect') {
        // Server initiated disconnect - إعادة الاتصال بعد تأخير
        console.log('❌ قطع الاتصال من قبل الخادم');
        dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'تم قطع الاتصال من قبل الخادم' });
        // إعادة الاتصال بعد 2 ثانية
        setTimeout(() => {
          if (!socket.current?.connected && user) {
            console.log('🔄 محاولة إعادة الاتصال...');
            socket.current?.connect();
          }
        }, 2000);
      } else if (reason === 'transport close' || reason === 'transport error') {
        // Network issues - إعادة المحاولة سريعاً
        console.log('🔄 مشكلة في الشبكة - إعادة محاولة الاتصال...');
        dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'مشكلة في الاتصال بالشبكة' });
      }
      // Socket.IO سيتولى إعادة الاتصال تلقائياً في معظم الحالات
    });
    
    // معالج إعادة الاتصال
    socket.current.on('reconnect', (attemptNumber) => {
      console.log(`✅ تمت إعادة الاتصال بنجاح بعد ${attemptNumber} محاولة`);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
      
      // إعادة المصادقة بعد إعادة الاتصال
      if (user) {
        console.log('🔐 إعادة المصادقة...');
        if (user.userType === 'guest') {
          socket.current?.emit('authenticate', {
            username: user.username,
            userType: user.userType
          });
        } else {
          socket.current?.emit('auth', {
            userId: user.id,
            username: user.username,
            userType: user.userType
          });
        }
      }
    });
    
    // معالج محاولة إعادة الاتصال
    socket.current.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 محاولة إعادة الاتصال رقم ${attemptNumber}...`);
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: `محاولة إعادة الاتصال (${attemptNumber})...` });
    });
    
    // معالج فشل إعادة الاتصال
    socket.current.on('reconnect_failed', () => {
      console.log('❌ فشلت جميع محاولات إعادة الاتصال');
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'فشل الاتصال بالخادم نهائياً' });
    });
    
    // معالج خطأ إعادة الاتصال
    socket.current.on('reconnect_error', (error) => {
      console.log('❌ خطأ في إعادة الاتصال:', error.message);
    });
    
    // معالج ping من الخادم
    socket.current.on('ping', (data) => {
      // الرد فوراً بـ pong
      socket.current?.emit('pong', { timestamp: data.timestamp, receivedAt: Date.now() });
    });

    socket.current.on('socketConnected', (data) => {
      console.log('🔌 اتصال Socket:', data.message);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
    });

    socket.current.on('authenticated', (data) => {
      console.log('✅ تم الاتصال بنجاح:', data.message);
      dispatch({ type: 'SET_CURRENT_USER', payload: data.user });
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      // تحميل الرسائل مرة واحدة فقط
      loadExistingMessages();
      
      // طلب قائمة المستخدمين المتصلين مرة واحدة
      socket.current?.emit('requestOnlineUsers');
      
      // تحديث دوري محدود لقائمة المستخدمين كل دقيقة
      const userListInterval = setInterval(() => {
        if (socket.current?.connected) {
          socket.current.emit('requestOnlineUsers');
        }
      }, 60000); // كل دقيقة بدلاً من 30 ثانية
      
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
              // تبسيط عرض المستخدمين - عرض الكل بدون فلترة معقدة
              console.log('👥 تحديث قائمة المستخدمين:', message.users.length);
              console.log('👥 المستخدمون:', message.users.map(u => u.username).join(', '));
              console.log('👥 قبل التحديث كان لدينا:', state.onlineUsers.length, 'مستخدم');
              dispatch({ type: 'SET_ONLINE_USERS', payload: message.users });
              console.log('✅ تم تحديث قائمة المستخدمين بنجاح');
            } else {
              console.warn('⚠️ لم يتم استقبال قائمة مستخدمين');
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
              
              // تحميل رسائل الغرفة الجديدة
              loadRoomMessages(message.roomId);
              
              // تحديث قائمة المستخدمين في الغرفة
              if (message.users) {
                dispatch({ type: 'SET_ONLINE_USERS', payload: message.users });
              }
              
              // إرسال رسالة ترحيب محلية (لا تُحفظ في قاعدة البيانات)
              const welcomeMessage: ChatMessage = {
                id: Date.now(),
                content: `مرحباً بك في غرفة ${message.roomId}! 👋`,
                timestamp: new Date(),
                senderId: -1, // معرف خاص للنظام
                sender: {
                  id: -1,
                  username: 'النظام',
                  userType: 'moderator',
                  role: 'system',
                  level: 0,
                  points: 0,
                  achievements: [],
                  lastSeen: new Date(),
                  isOnline: true,
                  isBanned: false,
                  isActive: true,
                  currentRoom: '',
                  settings: {
                    theme: 'default',
                    language: 'ar',
                    notifications: true,
                    soundEnabled: true,
                    privateMessages: true
                  }
                },
                messageType: 'system',
                isPrivate: false
              };
              
              dispatch({ 
                type: 'ADD_ROOM_MESSAGE', 
                payload: { roomId: message.roomId, message: welcomeMessage }
              });
            }
            
            // طلب قائمة محدثة من المستخدمين المتصلين في الغرفة
            setTimeout(() => {
              if (socket.current?.connected) {
                socket.current.emit('requestOnlineUsers');
              }
            }, 500); // زيادة التأخير لتقليل الطلبات
            break;
            
          default:
            break;
        }
      } catch (error) {
        console.error('خطأ في معالجة الرسالة:', error);
      }
    });
  }, [state.ignoredUsers, state.typingUsers, state.onlineUsers, isValidMessage]);

  // Connect function - محسنة
  const connect = useCallback((user: ChatUser) => {
    dispatch({ type: 'SET_CURRENT_USER', payload: user });
    dispatch({ type: 'SET_LOADING', payload: true });
    
    // إضافة المستخدم الحالي للقائمة فوراً
    dispatch({ type: 'SET_ONLINE_USERS', payload: [user] });

    try {
      // تنظيف الاتصال السابق إذا كان موجوداً
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }

      // إنشاء اتصال Socket.IO جديد
      const isDevelopment = import.meta.env.DEV;
      const serverUrl = isDevelopment 
        ? (import.meta.env.VITE_SERVER_URL || 'http://localhost:5000')
        : window.location.origin;
      
      console.log('🔌 جاري الاتصال بـ Socket.IO على:', serverUrl);
      socket.current = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 10, // زيادة عدد المحاولات
        reconnectionDelay: 1000, // تقليل التأخير بين المحاولات
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        autoConnect: true,
        forceNew: false, // عدم فرض اتصال جديد للسماح بإعادة الاتصال
        query: {
          userId: user?.id,
          username: user?.username,
          userType: user?.userType
        }
      });

      setupSocketListeners(user);

    } catch (error) {
      console.error('خطأ في الاتصال:', error);
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'فشل في الاتصال بالخادم' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [setupSocketListeners]);

  // Load room messages function
  const loadRoomMessages = useCallback(async (roomId: string) => {
    // منع التحميل المتعدد للغرفة نفسها
    if (state.roomMessages[roomId] && state.roomMessages[roomId].length > 0) {
      console.log(`✅ رسائل الغرفة ${roomId} محملة مسبقاً`);
      return;
    }
    
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
          
          // إضافة الرسائل للغرفة
          dispatch({ 
            type: 'ADD_ROOM_MESSAGE', 
            payload: { 
              roomId: roomId, 
              message: formattedMessages 
            }
          });
        }
      } else {
        console.error(`❌ فشل في تحميل رسائل الغرفة ${roomId}:`, response.status);
      }
    } catch (error) {
      console.error(`❌ خطأ في تحميل رسائل الغرفة ${roomId}:`, error);
    }
  }, [state.roomMessages]);

  // Join room function
  const joinRoom = useCallback((roomId: string) => {
    console.log(`🔄 انضمام للغرفة: ${roomId}`);
    // لا نغير الغرفة الحالة حتى نتلقى تأكيد من السيرفر
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

  // Send typing indicator - محسنة مع throttling
  const sendTyping = useCallback(() => {
    if (socket.current?.connected) {
      socket.current.emit('typing', { isTyping: true });
    }
  }, []);

  // تحميل الرسائل الموجودة من قاعدة البيانات
  const loadExistingMessages = useCallback(async () => {
    // منع التحميل المتعدد
    if (isLoadingMessages.current) {
      console.log('⏸️ تحميل الرسائل قيد التقدم بالفعل...');
      return;
    }
    
    // تحقق من وجود رسائل محملة مسبقاً للغرفة العامة
    if (state.roomMessages['general'] && state.roomMessages['general'].length > 0) {
      console.log('✅ رسائل الغرفة العامة محملة مسبقاً');
      return;
    }
    
    isLoadingMessages.current = true;
    
    try {
      console.log('📥 تحميل الرسائل الموجودة من قاعدة البيانات...');
      
      // تحميل رسائل الغرفة العامة
      const generalResponse = await fetch('/api/messages/room/general?limit=50');
      if (generalResponse.ok) {
        const generalData = await generalResponse.json();
        if (generalData.messages && Array.isArray(generalData.messages)) {
          console.log(`✅ تم تحميل ${generalData.messages.length} رسالة من الغرفة العامة`);
          
          // تحويل الرسائل إلى التنسيق المطلوب
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
          
          // إضافة الرسائل للغرفة العامة
          dispatch({ 
            type: 'ADD_ROOM_MESSAGE', 
            payload: { 
              roomId: 'general', 
              message: formattedMessages 
            }
          });
          
          // تحديث الرسائل العامة إذا كانت الغرفة الحالية هي العامة
          if (state.currentRoomId === 'general') {
            dispatch({ type: 'SET_PUBLIC_MESSAGES', payload: formattedMessages });
          }
        }
      } else {
        console.error('❌ فشل في تحميل رسائل الغرفة العامة:', generalResponse.status);
      }

      // سيتم تحميل رسائل الغرف عند الانضمام إليها فقط
      // بدلاً من تحميل غرف مُحددة مسبقاً
    } catch (error) {
      console.error('❌ خطأ في تحميل الرسائل:', error);
    } finally {
      isLoadingMessages.current = false;
    }
  }, [state.currentRoomId, state.roomMessages]);

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