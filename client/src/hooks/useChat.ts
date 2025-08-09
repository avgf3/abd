import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ChatUser, ChatMessage, WebSocketMessage, PrivateConversation, Notification } from '@/types/chat';
import { globalNotificationManager, MessageCacheManager, NetworkOptimizer } from '@/lib/chatOptimization';
import { chatAnalytics } from '@/lib/chatAnalytics';
import { apiRequest } from '@/lib/queryClient';
import { mapDbMessagesToChatMessages } from '@/utils/messageUtils';

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
        // إضافة عدة رسائل (استبدال كامل)
        newRoomMessages[roomId] = message;
      } else {
        // إضافة رسالة واحدة مع فحص التكرار
        if (!newRoomMessages[roomId]) {
          newRoomMessages[roomId] = [];
        }
        
        // فحص عدم وجود الرسالة مسبقاً (بناءً على id و timestamp)
        const existingMessage = newRoomMessages[roomId].find(
          msg => msg.id === message.id || 
          (msg.timestamp === message.timestamp && msg.senderId === message.senderId && msg.content === message.content)
        );
        
        if (!existingMessage) {
          newRoomMessages[roomId] = [...newRoomMessages[roomId], message];
        }
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
  
  // تتبع آخر غرفة طُلب الانضمام لها لمنع تبديل غير مقصود
  const lastRequestedRoomId = useRef<string>('general');
  
  // 🚀 تحسين: فلترة محسنة للمستخدمين المعروضين
  const memoizedOnlineUsers = useMemo(() => {
    return state.onlineUsers.filter(user => {
      // التحقق من صحة بيانات المستخدم
      if (!user?.id || !user?.username || !user?.userType) {
        return false;
      }
      // إخفاء المستخدمين المتجاهلين
      return !state.ignoredUsers.has(user.id);
    });
  }, [state.onlineUsers, state.ignoredUsers]);

  // Notifications state
  const [levelUpNotification, setLevelUpNotification] = useState<{
    show: boolean;
    oldLevel: number;
    newLevel: number;
    user?: any;
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
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
      
      // تنظيف الفترة الزمنية للتحديث الدوري
      if ((socket.current as any)?.userListInterval) {
        clearInterval((socket.current as any).userListInterval);
        (socket.current as any).userListInterval = null;
      }
      
      // معالجة أسباب الانقطاع المختلفة
      if (reason === 'io server disconnect') {
        // Server initiated disconnect - إعادة الاتصال بعد تأخير
        dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'تم قطع الاتصال من قبل الخادم' });
        // إعادة الاتصال بعد 2 ثانية
        setTimeout(() => {
          if (!socket.current?.connected && user) {
            socket.current?.connect();
          }
        }, 2000);
      } else if (reason === 'transport close' || reason === 'transport error') {
        // Network issues - إعادة المحاولة سريعاً
        dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'مشكلة في الاتصال بالشبكة' });
      }
      // Socket.IO سيتولى إعادة الاتصال تلقائياً في معظم الحالات
    });
    
    // معالج إعادة الاتصال
    socket.current.on('reconnect', (attemptNumber) => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
      
      // إعادة المصادقة بعد إعادة الاتصال
      if (user) {
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
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: `محاولة إعادة الاتصال (${attemptNumber})...` });
    });
    
    // معالج فشل إعادة الاتصال
    socket.current.on('reconnect_failed', () => {
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'فشل الاتصال بالخادم نهائياً' });
    });
    
    // معالج خطأ إعادة الاتصال
    socket.current.on('reconnect_error', (error) => {
      });
    
    // معالج ping من الخادم
    socket.current.on('ping', (data) => {
      // الرد فوراً بـ pong
      socket.current?.emit('pong', { timestamp: data.timestamp, receivedAt: Date.now() });
    });

    socket.current.on('socketConnected', (data) => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
    });

    socket.current.on('authenticated', (data) => {
      dispatch({ type: 'SET_CURRENT_USER', payload: data.user });
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      // 🚀 تحسين: تحميل الرسائل مرة واحدة فقط
      loadExistingMessages();
      
      // 🚀 تحسين: إزالة الطلبات الدورية للمستخدمين
      // سيتم تحديث القائمة عبر WebSocket events فقط
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
            if (message.users && Array.isArray(message.users)) {
              // فلترة صارمة للمستخدمين الصالحين فقط
              const validUsers = message.users.filter(user => {
                // التحقق من صحة بيانات المستخدم
                if (!user || !user.id || !user.username || !user.userType) {
                  console.warn('🚫 مستخدم بيانات غير صالحة:', user);
                  return false;
                }
                
                // التحقق من عدم وجود اسم "مستخدم" العام
                if (user.username === 'مستخدم' || user.username === 'User') {
                  console.warn('🚫 اسم مستخدم عام مرفوض:', user.username);
                  return false;
                }
                
                // التحقق من عدم وجود معرف سالب أو صفر
                if (user.id <= 0) {
                  console.warn('🚫 معرف مستخدم غير صالح:', user.id);
                  return false;
                }
                
                return true;
              });
              
              dispatch({ type: 'SET_ONLINE_USERS', payload: validUsers });
            } else {
              console.warn('⚠️ لم يتم استقبال قائمة مستخدمين صحيحة');
              // لا نقوم بمسح القائمة، نبقيها كما هي
            }
            break;
            
          case 'userDisconnected':
            // إزالة المستخدم المنقطع فوراً من القائمة
            if (message.userId) {
              dispatch({ 
                type: 'SET_ONLINE_USERS', 
                payload: state.onlineUsers.filter(user => user.id !== message.userId)
              });
              }
            break;
            
          case 'userJoined':
            // إضافة المستخدم الجديد إذا لم يكن موجوداً
            if (message.user && !state.onlineUsers.find(u => u.id === message.user.id)) {
              dispatch({ 
                type: 'SET_ONLINE_USERS', 
                payload: [...state.onlineUsers, message.user]
              });
              }
            break;
            
          case 'newMessage':
            if (message.message && typeof message.message === 'object' && !message.message.isPrivate) {
              if (!isValidMessage(message.message as ChatMessage)) {
                console.warn('رسالة مرفوضة من الخادم:', message.message);
                break;
              }
              
              if (!state.ignoredUsers.has(message.message.senderId)) {
                const chatMessage = message.message as ChatMessage;
                // استخدام roomId من الرسالة أو من البيانات المرسلة
                const messageRoomId = (chatMessage as any).roomId || message.roomId || 'general';
                
                // إضافة roomId للرسالة
                const messageWithRoom = { ...chatMessage, roomId: messageRoomId };
                
                dispatch({ 
                  type: 'ADD_ROOM_MESSAGE', 
                  payload: { roomId: messageRoomId, message: messageWithRoom }
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
            // يمكن إضافة معالجة محددة هنا لتحديث التفاعلات
            break;

          case 'wallPostDeleted':
            // يمكن إضافة معالجة محددة هنا لإزالة المنشور من القائمة
            break;
            
          case 'roomJoined':
            if (message.roomId) {
              // 🔍 فحص دقيق لتأكيد الانضمام للغرفة الصحيحة
              const target = String(message.roomId);
              const lastRequest = (lastRequestedRoomId.current as any);
              const accept = (lastRequest?.id === target) || target === state.currentRoomId;
              
              if (!accept) {
                console.log(`⚠️ تم تجاهل تأكيد roomJoined للغرفة ${target} - لم يتم طلبها`);
                break;
              }
              
              console.log(`✅ تأكيد الانضمام للغرفة: ${target}`);
              
              // تحديث الغرفة الحالية فقط إذا لزم الأمر
              if (state.currentRoomId !== target) {
                dispatch({ type: 'SET_ROOM', payload: target });
              }
              
              // 🔄 تحميل رسائل الغرفة الجديدة بقوة لضمان الحصول على أحدث الرسائل
              loadRoomMessages(target, true);
            }
            break;

          case 'roomMessages':
            // رسائل الغرفة المُرسلة من السيرفر
            if (message.messages && Array.isArray(message.messages)) {
              const roomId = message.roomId || state.currentRoomId;
              const formattedMessages = message.messages.map((msg: any) => ({
                ...msg,
                roomId: roomId,
                sender: msg.sender || {
                  id: msg.senderId || 0,
                  username: msg.senderUsername || 'مستخدم محذوف',
                  userType: msg.senderUserType || 'guest'
                }
              }));
              
              dispatch({ 
                type: 'ADD_ROOM_MESSAGE', 
                payload: { roomId, message: formattedMessages }
              });
              
              // تحديث الرسائل العامة إذا كانت للغرفة الحالية
              if (roomId === state.currentRoomId) {
                dispatch({ type: 'SET_PUBLIC_MESSAGES', payload: formattedMessages });
              }
            }
            break;
            
          // معالجة رسائل غرفة البث
          case 'micRequest':
          case 'micApproved':
          case 'micRejected':
          case 'speakerRemoved':
          case 'broadcastRoomUpdate':
            // إرسال الرسالة لجميع معالجات البث المسجلة
            broadcastHandlers.current.forEach(handler => {
              try {
                handler(message);
              } catch (error) {
                console.error('خطأ في معالج رسائل البث:', error);
              }
            });
            break;
            
          default:
            // التحقق إذا كانت الرسالة تحتوي على بيانات بث
            if (message.broadcastInfo || message.type?.includes('broadcast') || message.type?.includes('mic')) {
              broadcastHandlers.current.forEach(handler => {
                try {
                  handler(message);
                } catch (error) {
                  console.error('خطأ في معالج رسائل البث:', error);
                }
              });
            }
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
    
    // عدم تعيين قائمة مؤقتة لتفادي الوميض؛ ستأتي القائمة من الخادم حسب الغرفة
    // dispatch({ type: 'SET_ONLINE_USERS', payload: [user] });

    try {
      // تنظيف شامل للاتصال السابق لتجنب التضارب
      if (socket.current) {
        // إزالة جميع المستمعين أولاً
        socket.current.removeAllListeners();
        // قطع الاتصال
        socket.current.disconnect();
        // تنظيف المرجع
        socket.current = null;
        
        // انتظار قصير للتأكد من التنظيف الكامل (بدون await)
        setTimeout(() => {
          // التنظيف مكتمل، لا حاجة لفعل شيء إضافي
        }, 500);
      }

      // إنشاء اتصال Socket.IO جديد
      const isDevelopment = import.meta.env.DEV;
      const serverUrl = isDevelopment 
        ? (import.meta.env.VITE_SERVER_URL || 'http://localhost:5000')
        : window.location.origin;
      
      // تجنب إنشاء اتصال جديد إذا كان الاتصال الحالي قائمًا
      if (socket.current && socket.current.connected) {
        setupSocketListeners(user);
        return;
      }

      socket.current = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 30000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
        reconnectionDelayMax: 15000,
        randomizationFactor: 0.3,
        autoConnect: true,
        forceNew: false, // اتصال واحد مستقر
        upgrade: true,
        rememberUpgrade: true,
        query: {
          userId: user?.id,
          username: user?.username,
          userType: user?.userType,
          timestamp: Date.now()
        }
      });

      // إضافة معالج أخطاء الاتصال المحسن
      socket.current.on('connect_error', (error) => {
        console.error('❌ خطأ اتصال Socket.IO:', error);
        
        // التعامل مع أخطاء 502 بشكل خاص
        if (error.message.includes('502') || error.message.includes('Bad Gateway')) {
          console.warn('🚨 خطأ 502 - الخادم غير متاح مؤقتاً');
          dispatch({ 
            type: 'SET_CONNECTION_ERROR', 
            payload: 'الخادم غير متاح مؤقتاً. جاري المحاولة...' 
          });
        } else {
          dispatch({ 
            type: 'SET_CONNECTION_ERROR', 
            payload: `خطأ في الاتصال: ${error.message}` 
          });
        }
      });

      // معالج إعادة الاتصال المحسن - يقلل من الطلبات المتكررة
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 3;
      
      socket.current.on('reconnect_attempt', (attemptNumber) => {
        reconnectAttempts = attemptNumber;
        if (attemptNumber <= maxReconnectAttempts) {
          dispatch({ 
            type: 'SET_CONNECTION_ERROR', 
            payload: `إعادة الاتصال... (${attemptNumber}/${maxReconnectAttempts})` 
          });
        }
      });

      // معالج نجاح إعادة الاتصال - مع تأخير لتجنب الطلبات المتكررة
      socket.current.on('reconnect', () => {
        dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
        reconnectAttempts = 0;
        
        // تأخير إرسال المصادقة لتجنب التضارب
        setTimeout(() => {
          if (socket.current?.connected && user) {
            socket.current.emit('auth', {
              userId: user.id,
              username: user.username,
              userType: user.userType,
              reconnect: true
            });
          }
        }, 1000);
      });

      // معالج فشل إعادة الاتصال النهائي
      socket.current.on('reconnect_failed', () => {
        console.warn('⚠️ فشل في إعادة الاتصال بعد عدة محاولات');
        dispatch({ 
          type: 'SET_CONNECTION_ERROR', 
          payload: 'فقدان الاتصال. يرجى إعادة تحميل الصفحة.' 
        });
      });

      setupSocketListeners(user);

    } catch (error) {
      console.error('خطأ في الاتصال:', error);
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'فشل في الاتصال بالخادم' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [setupSocketListeners]);

  // Load room messages function محسنة
  const loadRoomMessages = useCallback(async (roomId: string, forceReload: boolean = false) => {
    // تجنب التحميل المتكرر للغرفة نفسها
    const existingMessages = state.roomMessages[roomId];
    if (!forceReload && existingMessages && existingMessages.length > 0) {
      console.log(`✅ استخدام رسائل الغرفة ${roomId} المحفوظة محلياً`);
      return;
    }
    
    // تجنب التحميل المتزامن للغرفة نفسها
    const loadingKey = `loading_${roomId}`;
    if ((loadRoomMessages as any)[loadingKey] && !forceReload) {
      console.log(`⚠️ تحميل رسائل الغرفة ${roomId} قيد التنفيذ بالفعل`);
      return;
    }
    
    (loadRoomMessages as any)[loadingKey] = true;
    
    try {
      console.log(`🔄 تحميل رسائل الغرفة ${roomId} من السيرفر...`);
      
      const data = await apiRequest(`/api/messages/room/${roomId}?limit=50`);
      if ((data as any).messages && Array.isArray((data as any).messages)) {
        const formattedMessages = mapDbMessagesToChatMessages((data as any).messages, roomId);
        
        // ✅ إضافة الرسائل للغرفة (استبدال كامل إذا كان forceReload)
        dispatch({ 
          type: 'ADD_ROOM_MESSAGE', 
          payload: { 
            roomId: roomId, 
            message: formattedMessages 
          }
        });
        
        // تحديث الرسائل العامة إذا كانت للغرفة الحالية
        if (roomId === state.currentRoomId) {
          dispatch({ type: 'SET_PUBLIC_MESSAGES', payload: formattedMessages });
        }
        
        console.log(`✅ تم تحميل ${formattedMessages.length} رسالة للغرفة ${roomId}`);
      } else {
        console.log(`⚠️ لا توجد رسائل في الغرفة ${roomId}`);
      }
    } catch (error) {
      console.error(`❌ خطأ في تحميل رسائل الغرفة ${roomId}:`, error);
    } finally {
      delete (loadRoomMessages as any)[loadingKey];
    }
  }, [state.roomMessages, state.currentRoomId]);

  // Join room function
  const joinRoom = useCallback((roomId: string) => {
    // 🚫 تجنب الانضمام لنفس الغرفة مرة أخرى
    if (state.currentRoomId === roomId) {
      console.log(`✅ أنت موجود في الغرفة ${roomId} بالفعل`);
      return;
    }

    // 🚫 تجنب الطلبات المتكررة السريعة
    if (lastRequestedRoomId.current === roomId) {
      const timeSinceLastRequest = Date.now() - (lastRequestedRoomId.current as any).timestamp;
      if (timeSinceLastRequest < 2000) { // أقل من ثانيتين
        console.log(`⚠️ تم طلب الانضمام للغرفة ${roomId} مؤخراً`);
        return;
      }
    }

    console.log(`🔄 الانضمام للغرفة: ${roomId}`);
    
    // تسجيل وقت الطلب لمنع التكرار
    (lastRequestedRoomId.current as any) = { 
      id: roomId, 
      timestamp: Date.now() 
    };
    
    // 🚀 تغيير الغرفة الحالية فوراً للاستجابة السريعة
    dispatch({ type: 'SET_ROOM', payload: roomId });
    
    // 💾 تحميل رسائل الغرفة المحفوظة محلياً أولاً
    const existingMessages = state.roomMessages[roomId] || [];
    if (existingMessages.length > 0) {
      dispatch({ type: 'SET_PUBLIC_MESSAGES', payload: existingMessages });
    } else {
      // مسح الرسائل إذا لم تكن هناك رسائل محفوظة
      dispatch({ type: 'SET_PUBLIC_MESSAGES', payload: [] });
    }
    
    // 🔄 تحميل رسائل الغرفة من السيرفر (عملية مستقلة)
    loadRoomMessages(roomId);
    
    // 📡 إرسال طلب الانضمام للسيرفر (بدون انتظار استجابة)
    if (socket.current?.connected) {
      socket.current.emit('joinRoom', { 
        roomId,
        userId: state.currentUser?.id,
        timestamp: Date.now() 
      });
    } else {
      console.error('❌ Socket غير متصل، لا يمكن الانضمام للغرفة');
    }
  }, [loadRoomMessages, state.roomMessages, state.currentRoomId, state.currentUser]);

  // Send message function - محسنة
  const sendMessage = useCallback((content: string, messageType: string = 'text', receiverId?: number, roomId?: string) => {
    if (!state.currentUser || !socket.current?.connected) {
      console.error('❌ لا يمكن إرسال الرسالة - المستخدم غير متصل');
      return;
    }

    if (!content.trim()) {
      console.warn('⚠️ محتوى الرسالة فارغ');
      return;
    }

    const targetRoomId = roomId || state.currentRoomId;

    const messageData = {
      senderId: state.currentUser.id,
      content: content.trim(),
      messageType,
      isPrivate: !!receiverId,
      receiverId,
      roomId: targetRoomId,
      timestamp: Date.now() // إضافة timestamp لتجنب التكرار
    };

    if (receiverId) {
      // رسالة خاصة
      socket.current.emit('privateMessage', messageData);
    } else {
      // رسالة عامة
      socket.current.emit('publicMessage', messageData);
    }
  }, [state.currentUser, state.currentRoomId]);

  // دالة إرسال رسالة لغرفة محددة محسنة
  const sendRoomMessage = useCallback((content: string, roomId: string, messageType: string = 'text') => {
    if (!content.trim()) {
      console.warn('⚠️ محتوى الرسالة فارغ');
      return;
    }
    
    return sendMessage(content, messageType, undefined, roomId);
  }, [sendMessage]);

  // دالة للحصول على رسائل الغرفة الحالية محسنة
  const getCurrentRoomMessages = useCallback(() => {
    return state.roomMessages[state.currentRoomId] || [];
  }, [state.roomMessages, state.currentRoomId]);

  // Disconnect function - محسنة لتجنب التضارب
  const disconnect = useCallback(() => {
    if (socket.current) {
      // إزالة جميع المستمعين أولاً لتجنب التداخل
      socket.current.removeAllListeners();
      // قطع الاتصال
      socket.current.disconnect();
      // تنظيف المرجع
      socket.current = null;
    }
    
    // إعادة تعيين الحالة بالكامل
    dispatch({ type: 'SET_CURRENT_USER', payload: null });
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
    dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
    dispatch({ type: 'SET_ONLINE_USERS', payload: [] });
    dispatch({ type: 'SET_PUBLIC_MESSAGES', payload: [] });
    dispatch({ type: 'SET_LOADING', payload: false });
    
    // تنظيف متغيرات التحكم
    isLoadingMessages.current = false;
    // تنظيف معالجات البث
    broadcastHandlers.current = [];
  }, []);

  // إدارة معالجات رسائل البث
  const broadcastHandlers = useRef<Array<(data: any) => void>>([]);

  const addBroadcastMessageHandler = useCallback((handler: (data: any) => void) => {
    broadcastHandlers.current.push(handler);
  }, []);

  const removeBroadcastMessageHandler = useCallback((handler: (data: any) => void) => {
    broadcastHandlers.current = broadcastHandlers.current.filter(h => h !== handler);
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
      return;
    }
    
    // تحقق من وجود رسائل محملة مسبقاً للغرفة العامة
    if (state.roomMessages['general'] && state.roomMessages['general'].length > 0) {
      return;
    }
    
    isLoadingMessages.current = true;
    
    try {
      // تحميل رسائل الغرفة العامة
      const generalData = await apiRequest('/api/messages/room/general?limit=50');
      if ((generalData as any).messages && Array.isArray((generalData as any).messages)) {
        const formattedMessages = mapDbMessagesToChatMessages((generalData as any).messages, 'general');
        
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
    getCurrentRoomMessages,
    loadRoomMessages,
    handleTyping: () => sendTyping(),
    handlePrivateTyping: () => sendTyping(),
    
    // دعم غرفة البث
    addBroadcastMessageHandler,
    removeBroadcastMessageHandler,
  };
}