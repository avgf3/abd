import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, saveSession } from '@/lib/socket';
import type { ChatUser, ChatMessage, WebSocketMessage, PrivateConversation, Notification } from '@/types/chat';
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

      // 🔥 SIMPLIFIED Socket event handling - حذف التضارب
    const setupSocketListeners = useCallback((socketInstance: Socket) => {
      // إزالة جميع المستمعين السابقين قبل إضافة الجدد
      socketInstance.removeAllListeners('message');
      socketInstance.removeAllListeners('ping');
      socketInstance.removeAllListeners('client_pong');
      
      // حافظ على الاتصال عبر ping/pong مخصص عند السكون
      const pingInterval = setInterval(() => {
        if (socketInstance.connected) {
          socketInstance.emit('client_ping');
        }
      }, 30000); // زيادة الفاصل الزمني لتقليل الحمل
      
      socketInstance.on('client_pong', () => {
        // console.log('🏓 Pong received');
      });

      // استجابة لنبض السيرفر المخصص للحفاظ على الاتصال
      socketInstance.on('ping', () => {
        try { 
          socketInstance.emit('pong', { t: Date.now() }); 
        } catch {}
      });

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
                roomId
              };
              
              // إضافة الرسالة للغرفة المناسبة
              dispatch({ 
                type: 'ADD_ROOM_MESSAGE', 
                payload: { roomId, message: chatMessage }
              });
              
              // تشغيل الإشعار للرسائل الجديدة في الغرفة الحالية
              if (chatMessage.senderId !== state.currentUser?.id && roomId === state.currentRoomId) {
                playNotificationSound();
                dispatch({ type: 'SET_NEW_MESSAGE_SENDER', payload: message.sender });
              }
            }
            break;
          }
          
          case 'messageDeleted': {
            const { messageId, roomId } = envelope as any;
            if (messageId && roomId) {
              const existing = state.roomMessages[roomId] || [];
              const next = existing.filter((m) => m.id !== messageId);
              dispatch({ 
                type: 'SET_ROOM_MESSAGES', 
                payload: { roomId, messages: next }
              });
            }
            break;
          }
          
          case 'onlineUsers': {
            const { users, roomId } = envelope;
            if (Array.isArray(users) && roomId === state.currentRoomId) {
              dispatch({ type: 'SET_ONLINE_USERS', payload: users });
            }
            break;
          }
          
          case 'roomMessages': {
            const { messages, roomId } = envelope;
            if (Array.isArray(messages) && roomId) {
              const formattedMessages = messages.map((msg: any) => ({
                id: msg.id,
                content: msg.content,
                senderId: msg.senderId,
                timestamp: msg.timestamp,
                messageType: msg.messageType || 'text',
                sender: msg.sender,
                roomId: msg.roomId || roomId
              }));
              dispatch({ 
                type: 'SET_ROOM_MESSAGES', 
                payload: { roomId, messages: formattedMessages }
              });
            }
            break;
          }
          
          case 'roomJoined': {
            const { roomId, users } = envelope;
            console.log('✅ انضمام مؤكد للغرفة:', roomId);
            if (users && Array.isArray(users)) {
              dispatch({ type: 'SET_ONLINE_USERS', payload: users });
            }
            dispatch({ type: 'SET_LOADING', payload: false });
            break;
          }
          
          case 'error': {
            console.error('❌ خطأ من السيرفر:', envelope.message);
            dispatch({ type: 'SET_CONNECTION_ERROR', payload: envelope.message });
            break;
          }
          
          case 'userJoinedRoom':
          case 'userLeftRoom': {
            // إعادة جلب قائمة المستخدمين للغرفة الحالية
            if (envelope.roomId === state.currentRoomId) {
              // سيتم تحديث القائمة تلقائياً عبر onlineUsers
            }
            break;
          }
          
          default:
            // console.log('🔄 رسالة غير معروفة:', envelope.type);
            break;
        }
      } catch (error) {
        console.error('خطأ في معالجة رسالة Socket:', error);
      }
    });

      // تنظيف عند إغلاق الاتصال
      return () => {
        clearInterval(pingInterval);
        socketInstance.removeAllListeners('message');
        socketInstance.removeAllListeners('ping');
        socketInstance.removeAllListeners('client_pong');
      };
    }, [state.currentUser, state.currentRoomId, state.roomMessages]);

  // ✅ مبسط: مصدر واحد للحقيقة لكل البيانات
  const privateMessages = useMemo(() => state.privateConversations, [state.privateConversations]);
  const ignoredUsers = useMemo(() => state.ignoredUsers, [state.ignoredUsers]);
  const typingUsers = useMemo(() => Array.from(state.typingUsers), [state.typingUsers]);

  // ✅ تحسين معالجة الاتصال والانقطاع
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 الشبكة متاحة مرة أخرى');
      if (socket.current && !socket.current.connected && state.currentUser) {
        try { 
          socket.current.connect(); 
          // إعادة المصادقة بعد إعادة الاتصال
          setTimeout(() => {
            if (socket.current?.connected && state.currentUser) {
              socket.current.emit('auth', {
                userId: state.currentUser.id,
                username: state.currentUser.username,
                userType: state.currentUser.userType,
                reconnect: true
              });
            }
          }, 500);
        } catch {}
      }
    };
    
    const handleOffline = () => {
      console.log('🔴 انقطع الاتصال بالشبكة');
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'انقطع الاتصال بالإنترنت' });
    };

    // فحص دوري لحالة الاتصال
    const connectionCheckInterval = setInterval(() => {
      if (socket.current && state.currentUser) {
        if (!socket.current.connected) {
          console.log('🔄 فحص الاتصال: غير متصل، محاولة إعادة الاتصال');
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
          try {
            socket.current.connect();
          } catch (error) {
            console.error('فشل في إعادة الاتصال:', error);
          }
        } else {
          // التأكد من المصادقة
          if (state.connectionError) {
            dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
          }
          if (!state.isConnected) {
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
          }
        }
      }
    }, 10000); // فحص كل 10 ثوان

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectionCheckInterval);
    };
  }, [state.currentUser, state.connectionError, state.isConnected]);

  // 🔥 SIMPLIFIED Connect function
  const connect = useCallback((user: ChatUser) => {
    console.log('🚀 بدء الاتصال للمستخدم:', user.username);
    dispatch({ type: 'SET_CURRENT_USER', payload: user });
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // تنظيف الاتصال السابق
      if (socket.current) {
        socket.current.removeAllListeners();
        socket.current.disconnect();
        socket.current = null;
      }

      // استخدام عميل Socket الموحد
      const s = getSocket();
      socket.current = s;

      // حفظ الجلسة فوراً
      saveSession({ 
        userId: user.id, 
        username: user.username, 
        userType: user.userType,
        roomId: state.currentRoomId || 'general'
      });

      // إعداد المستمعين
      setupSocketListeners(s);

      // معالج الاتصال المحسن
      s.on('connect', () => {
        console.log('✅ اتصال Socket مؤكد');
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
        dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
        dispatch({ type: 'SET_LOADING', payload: false });
      });

      // معالج المصادقة المؤكدة
      s.on('authenticated', (data: any) => {
        console.log('✅ مصادقة مؤكدة:', data.user?.username);
        // تحديث بيانات المستخدم إذا لزم الأمر
        if (data.user && data.user.username !== user.username) {
          dispatch({ type: 'SET_CURRENT_USER', payload: { ...user, ...data.user } });
        }
      });

      // إذا كان متصلاً بالفعل، أرسل المصادقة فوراً
      if (s.connected) {
        console.log('🔗 Socket متصل، إرسال مصادقة...');
        s.emit('auth', {
          userId: user.id,
          username: user.username,
          userType: user.userType,
        });
      }

      // معالج فشل إعادة الاتصال النهائي
      s.on('reconnect_failed', () => {
        console.warn('⚠️ فشل في إعادة الاتصال بعد عدة محاولات');
        dispatch({ 
          type: 'SET_CONNECTION_ERROR', 
          payload: 'فقدان الاتصال. يرجى إعادة تحميل الصفحة.' 
        });
      });

      // تحديث حالة الاتصال عند الانفصال
      s.on('disconnect', (reason) => {
        console.log('🔴 انقطع الاتصال:', reason);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
      });

      // معالجة أخطاء الاتصال
      s.on('connect_error', (error) => {
        console.error('❌ خطأ في الاتصال:', error);
        dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'فشل الاتصال بالسيرفر' });
        dispatch({ type: 'SET_LOADING', payload: false });
      });

    } catch (error) {
      console.error('خطأ في الاتصال:', error);
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'خطأ في الاتصال بالخادم' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [setupSocketListeners, state.currentRoomId]);

  // 🔥 SIMPLIFIED Join room function
  const joinRoom = useCallback((roomId: string) => {
    console.log('🚪 محاولة الانضمام للغرفة:', roomId);
    
    if (state.currentRoomId === roomId) {
      console.log('⚠️ الغرفة نفسها، لا حاجة للتغيير');
      return;
    }

    // تحديث الغرفة الحالية فوراً في الحالة
    dispatch({ type: 'SET_CURRENT_ROOM', payload: roomId });
    
    // حفظ الغرفة الجديدة في الجلسة مع الحفاظ على بيانات المستخدم
    saveSession({ 
      roomId,
      userId: state.currentUser?.id,
      username: state.currentUser?.username,
      userType: state.currentUser?.userType
    });

    // إرسال طلب الانضمام للغرفة عبر Socket
    if (socket.current?.connected && state.currentUser) {
      console.log('📡 إرسال طلب انضمام للغرفة:', roomId);
      socket.current.emit('joinRoom', { 
        roomId,
        userId: state.currentUser.id,
        username: state.currentUser.username 
      });
    } else {
      console.warn('⚠️ Socket غير متصل أو المستخدم غير موجود');
    }
  }, [state.currentRoomId, state.currentUser]);

  // 🔥 SIMPLIFIED Send message function
  const sendMessage = useCallback((content: string, messageType: string = 'text', receiverId?: number, roomId?: string) => {
    // فحص الاتصال والمستخدم
    if (!state.currentUser) {
      console.error('❌ لا يمكن إرسال الرسالة - المستخدم غير متصل');
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'يجب تسجيل الدخول أولاً' });
      return false;
    }

    if (!socket.current) {
      console.error('❌ لا يمكن إرسال الرسالة - Socket غير موجود');
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'فقدان الاتصال بالخادم' });
      return false;
    }

    if (!socket.current.connected) {
      console.error('❌ لا يمكن إرسال الرسالة - Socket غير متصل');
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'الاتصال منقطع، يتم إعادة المحاولة...' });
      
      // محاولة إعادة الاتصال
      try {
        socket.current.connect();
      } catch (error) {
        console.error('فشل في إعادة الاتصال:', error);
      }
      return false;
    }

    if (!content.trim()) {
      console.warn('⚠️ محتوى الرسالة فارغ');
      return false;
    }

    try {
      const messageData = {
        senderId: state.currentUser.id,
        senderUsername: state.currentUser.username, // إضافة اسم المستخدم للتأكد
        content: content.trim(),
        messageType,
        isPrivate: !!receiverId,
        receiverId,
        roomId: roomId || state.currentRoomId,
        timestamp: new Date().toISOString()
      };

      // إرسال الرسالة
      if (receiverId) {
        console.log('📤 إرسال رسالة خاصة لـ:', receiverId);
        socket.current.emit('privateMessage', messageData);
      } else {
        console.log('📤 إرسال رسالة عامة في الغرفة:', messageData.roomId);
        socket.current.emit('publicMessage', messageData);
      }

      // مسح رسالة الخطأ إذا تم الإرسال بنجاح
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
      return true;

    } catch (error) {
      console.error('❌ خطأ في إرسال الرسالة:', error);
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'فشل في إرسال الرسالة' });
      return false;
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

  return {
    // State
    currentUser: state.currentUser,
    onlineUsers: memoizedOnlineUsers,
    publicMessages: currentRoomMessages, // ✅ مصدر واحد للحقيقة
    privateConversations: privateMessages,
    ignoredUsers: ignoredUsers,
    isConnected: state.isConnected,
    typingUsers: typingUsers,
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

    // ✅ Convenience functions
    sendPublicMessage: (content: string) => sendMessage(content, 'text'),
    sendPrivateMessage: (receiverId: number, content: string) => sendMessage(content, 'text', receiverId),

    // Newly added helpers for compatibility
    handleTyping,
    getCurrentRoomMessages,
    updateCurrentUser,
  };
}