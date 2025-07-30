import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ChatUser, ChatMessage, WebSocketMessage, PrivateConversation, Notification, ChatRoom } from '@/types/chat';
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
  rooms: ChatRoom[];
  roomsLoading: boolean;
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
  | { type: 'ADD_ROOM_MESSAGE'; payload: { roomId: string; message: ChatMessage } }
  | { type: 'SET_SHOW_KICK_COUNTDOWN'; payload: boolean }
  | { type: 'IGNORE_USER'; payload: number }
  | { type: 'UNIGNORE_USER'; payload: number }
  | { type: 'SET_ROOMS'; payload: ChatRoom[] }
  | { type: 'SET_ROOMS_LOADING'; payload: boolean }
  | { type: 'ADD_ROOM'; payload: ChatRoom }
  | { type: 'REMOVE_ROOM'; payload: string }
  | { type: 'UPDATE_ROOM_USER_COUNT'; payload: { roomId: string; count: number } };

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
  rooms: [],
  roomsLoading: false
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
    
    case 'ADD_PRIVATE_MESSAGE':
      const { userId, message } = action.payload;
      return {
        ...state,
        privateConversations: {
          ...state.privateConversations,
          [userId]: [...(state.privateConversations[userId] || []), message]
        }
      };
    
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
    
    case 'SET_ROOM':
      const currentMessages = state.roomMessages[action.payload] || [];
      return { 
        ...state, 
        currentRoomId: action.payload,
        publicMessages: currentMessages
      };
    
    case 'ADD_ROOM_MESSAGE':
      const { roomId, message: roomMessage } = action.payload;
      const updatedRoomMessages = {
        ...state.roomMessages,
        [roomId]: [...(state.roomMessages[roomId] || []), roomMessage]
      };
      
      // If it's the current room, also update public messages
      const updatedPublicMessages = roomId === state.currentRoomId
        ? [...state.publicMessages, roomMessage]
        : state.publicMessages;
      
      return {
        ...state,
        roomMessages: updatedRoomMessages,
        publicMessages: updatedPublicMessages
      };
    
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
    
    case 'SET_ROOMS':
      return { ...state, rooms: action.payload };
    
    case 'SET_ROOMS_LOADING':
      return { ...state, roomsLoading: action.payload };
    
    case 'ADD_ROOM':
      return { ...state, rooms: [...state.rooms, action.payload] };
    
    case 'REMOVE_ROOM':
      return { 
        ...state, 
        rooms: state.rooms.filter(room => room.id !== action.payload) 
      };
    
    case 'UPDATE_ROOM_USER_COUNT':
      return {
        ...state,
        rooms: state.rooms.map(room => 
          room.id === action.payload.roomId 
            ? { ...room, userCount: action.payload.count }
            : room
        )
      };
    
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
      
      // جلب الغرف عند الاتصال
      fetchRooms();
      
      // الانضمام للغرفة العامة افتراضياً
      setTimeout(() => {
        socket.current?.emit('joinRoom', { roomId: 'general' });
      }, 1000);
      
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

    socket.current.on('connected', (data) => {
      console.log('✅ تم الاتصال بنجاح:', data.message);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
      dispatch({ type: 'SET_CURRENT_USER', payload: data.user });
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
      
      // طلب قائمة جميع المستخدمين (المتصلين وغير المتصلين)
      console.log('🔄 طلب قائمة جميع المستخدمين...');
      fetchAllUsers();
      
      // إضافة طلب للمستخدمين المتصلين أيضاً
      socket.current?.emit('requestOnlineUsers');
      
      // طلب إضافي بعد ثانية واحدة للتأكد
      setTimeout(() => {
        if (socket.current?.connected) {
          console.log('🔄 طلب إضافي لقائمة المستخدمين...');
          fetchAllUsers();
          socket.current.emit('requestOnlineUsers');
        }
      }, 1000);
      
      // تحديث دوري لقائمة المستخدمين كل 30 ثانية
      const userListInterval = setInterval(() => {
        if (socket.current?.connected) {
          socket.current.emit('requestOnlineUsers');
        }
      }, 30000);
      
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
                // استخدام roomId من الرسالة مع fallback للغرفة العامة
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
              console.log(`✅ تأكيد انضمام للغرفة: ${message.roomId}`);
              dispatch({ type: 'SET_ROOM', payload: message.roomId });
              // تحديث عدد المستخدمين في الغرف
              fetchRooms();
            }
            break;
            
          case 'userJoinedRoom':
            if (message.username && message.roomId) {
              console.log(`👤 ${message.username} انضم للغرفة: ${message.roomId}`);
              // تحديث عدد المستخدمين في الغرف
              fetchRooms();
            }
            break;
          
          case 'userLeftRoom':
            if (message.username && message.roomId) {
              console.log(`👤 ${message.username} غادر الغرفة: ${message.roomId}`);
              // تحديث عدد المستخدمين في الغرف
              fetchRooms();
            }
            break;
          
          case 'roomCreated':
            if (message.room) {
              console.log('🏠 غرفة جديدة تم إنشاؤها:', message.room.name);
              const newRoom = {
                id: message.room.id,
                name: message.room.name,
                description: message.room.description || '',
                isDefault: message.room.is_default || false,
                createdBy: message.room.created_by,
                createdAt: new Date(message.room.created_at),
                isActive: message.room.is_active !== false,
                userCount: message.room.user_count || 0,
                icon: message.room.icon || '',
                isBroadcast: message.room.is_broadcast || false,
                hostId: message.room.host_id,
                speakers: message.room.speakers ? (typeof message.room.speakers === 'string' ? JSON.parse(message.room.speakers) : message.room.speakers) : [],
                micQueue: message.room.mic_queue ? (typeof message.room.mic_queue === 'string' ? JSON.parse(message.room.mic_queue) : message.room.mic_queue) : []
              };
              dispatch({ type: 'ADD_ROOM', payload: newRoom });
            }
            break;
          
          case 'roomDeleted':
            if (message.roomId) {
              console.log('🗑️ غرفة تم حذفها:', message.roomId);
              dispatch({ type: 'REMOVE_ROOM', payload: message.roomId });
            }
            break;
          
          case 'roomUserCountUpdated':
            if (message.roomId && typeof message.userCount === 'number') {
              console.log(`📊 تحديث عدد المستخدمين في الغرفة ${message.roomId}: ${message.userCount}`);
              // تحديث عدد المستخدمين في الغرفة المحددة
              dispatch({
                type: 'UPDATE_ROOM_USER_COUNT',
                payload: { roomId: message.roomId, count: message.userCount }
              });
            }
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
      // إنشاء اتصال Socket.IO
      if (!socket.current) {
        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
        socket.current = io(serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });
      }

      setupSocketListeners(user);

    } catch (error) {
      console.error('خطأ في الاتصال:', error);
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'فشل في الاتصال بالخادم' });
    }
  }, [setupSocketListeners]);

  // Fetch rooms function
  const fetchRooms = useCallback(async () => {
    try {
      console.log('🔄 بدء جلب الغرف من الخادم...');
      dispatch({ type: 'SET_ROOMS_LOADING', payload: true });
      const response = await apiRequest('/api/rooms', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        console.log('📦 بيانات الغرف المستلمة:', data);
        const formattedRooms = data.rooms.map((room: any) => ({
          id: room.id,
          name: room.name,
          description: room.description || '',
          isDefault: room.isDefault || room.is_default || false,
          createdBy: room.createdBy || room.created_by,
          createdAt: new Date(room.createdAt || room.created_at),
          isActive: room.isActive || room.is_active || true,
          userCount: room.userCount || room.user_count || 0,
          icon: room.icon || '',
          isBroadcast: room.isBroadcast || room.is_broadcast || false,
          hostId: room.hostId || room.host_id,
          speakers: room.speakers ? (typeof room.speakers === 'string' ? JSON.parse(room.speakers) : room.speakers) : [],
          micQueue: room.micQueue ? (typeof room.micQueue === 'string' ? JSON.parse(room.micQueue) : room.micQueue) : []
        }));
        console.log('✅ الغرف المنسقة:', formattedRooms);
        dispatch({ type: 'SET_ROOMS', payload: formattedRooms });
      } else {
        console.error('❌ خطأ في API الغرف:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('خطأ في جلب الغرف:', error);
      // استخدام غرف افتراضية في حالة الخطأ
      const fallbackRooms = [
        { id: 'general', name: 'الدردشة العامة', description: 'الغرفة الرئيسية للدردشة', isDefault: true, createdBy: 1, createdAt: new Date(), isActive: true, userCount: 0, icon: '', isBroadcast: false, hostId: null, speakers: [], micQueue: [] },
        { id: 'broadcast', name: 'غرفة البث المباشر', description: 'غرفة خاصة للبث المباشر مع نظام المايك', isDefault: false, createdBy: 1, createdAt: new Date(), isActive: true, userCount: 0, icon: '', isBroadcast: true, hostId: 1, speakers: [], micQueue: [] },
        { id: 'music', name: 'أغاني وسهر', description: 'غرفة للموسيقى والترفيه', isDefault: false, createdBy: 1, createdAt: new Date(), isActive: true, userCount: 0, icon: '', isBroadcast: false, hostId: null, speakers: [], micQueue: [] }
      ];
      console.log('🔄 استخدام الغرف الافتراضية:', fallbackRooms);
      dispatch({ type: 'SET_ROOMS', payload: fallbackRooms });
    } finally {
      dispatch({ type: 'SET_ROOMS_LOADING', payload: false });
    }
  }, []);

  // Join room function - محسنة
  const joinRoom = useCallback(async (roomId: string) => {
    console.log(`🔄 انضمام للغرفة: ${roomId}`);
    
    try {
      // تحديث الغرفة الحالية فوراً
      dispatch({ type: 'SET_ROOM', payload: roomId });
      
      // إرسال طلب الانضمام عبر Socket.IO
      socket.current?.emit('joinRoom', { roomId });
      
      // استدعاء API للانضمام (إذا كان المستخدم مسجل دخول)
      if (state.currentUser) {
        try {
          const response = await apiRequest(`/api/rooms/${roomId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.currentUser.id })
          });
          
          if (!response.ok) {
            console.warn('⚠️ فشل في تسجيل الانضمام في قاعدة البيانات');
          }
        } catch (apiError) {
          console.warn('⚠️ خطأ في API انضمام الغرفة:', apiError);
        }
      }
      
      // جلب رسائل الغرفة إذا لم تكن محملة من قبل
      if (!state.roomMessages[roomId]) {
        try {
          const response = await apiRequest(`/api/messages/room/${roomId}`, { method: 'GET' });
          if (response.ok) {
            const data = await response.json();
            const messages = data.messages || [];
            // إضافة الرسائل للغرفة
            messages.forEach((message: ChatMessage) => {
              dispatch({ 
                type: 'ADD_ROOM_MESSAGE', 
                payload: { roomId, message }
              });
            });
          }
        } catch (error) {
          console.error('خطأ في جلب رسائل الغرفة:', error);
        }
      }
      
    } catch (error) {
      console.error('خطأ في الانضمام للغرفة:', error);
    }
  }, [state.roomMessages, state.currentUser]);

  // Send message function - محسنة
  const sendMessage = useCallback((content: string, messageType: string = 'text', receiverId?: number) => {
    if (!state.currentUser || !socket.current?.connected) {
      console.error('❌ لا يمكن إرسال الرسالة - المستخدم غير متصل');
      return;
    }

    const messageData = {
      senderId: state.currentUser.id,
      content,
      messageType,
      isPrivate: !!receiverId,
      receiverId,
      roomId: state.currentRoomId
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
  const fetchAllUsers = useCallback(async () => {
    // لا نفعل شيء - نكتفي بالمستخدمين المتصلين من Socket
    console.log('🔄 تم تجاهل fetchAllUsers - نكتفي بالمستخدمين المتصلين');
  }, []);

  // Send typing indicator - محسنة مع throttling
  const sendTyping = useCallback(() => {
    if (socket.current?.connected) {
      socket.current.emit('typing', { isTyping: true });
    }
  }, []);

  // جلب الغرف عند الاتصال الأولي
  useEffect(() => {
    if (state.isConnected && state.rooms.length === 0) {
      console.log('🔄 جلب الغرف عند الاتصال الأولي...');
      fetchRooms();
    }
  }, [state.isConnected, state.rooms.length, fetchRooms]);

  // جلب الغرف فور تسجيل الدخول
  useEffect(() => {
    if (state.currentUser && state.rooms.length === 0) {
      console.log('🔄 جلب الغرف فور تسجيل الدخول...');
      fetchRooms();
    }
  }, [state.currentUser, fetchRooms]);

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
    rooms: state.rooms,
    roomsLoading: state.roomsLoading,
    
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
    fetchRooms,
    ignoreUser,
    unignoreUser,
    sendTyping,
    fetchAllUsers,
    setShowKickCountdown: (show: boolean) => dispatch({ type: 'SET_SHOW_KICK_COUNTDOWN', payload: show }),
    setNewMessageSender: (sender: ChatUser | null) => dispatch({ type: 'SET_NEW_MESSAGE_SENDER', payload: sender }),

    // إصلاح: دوال مطلوبة للمكونات
    sendPublicMessage: (content: string) => sendMessage(content, 'text'),
    sendPrivateMessage: (receiverId: number, content: string) => sendMessage(content, 'text', receiverId),
    handleTyping: () => sendTyping(),
    handlePrivateTyping: () => sendTyping(),
  };
}