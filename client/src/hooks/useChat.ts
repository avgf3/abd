import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { io, Socket } from 'socket.io-client';
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
    // تجنب التحميل المتكرر
    if (!forceReload && state.roomMessages[roomId]?.length > 0) {
      console.log(`✅ رسائل الغرفة ${roomId} محملة مسبقاً`);
      return;
    }

    // تجنب التحميل المتزامن
    if (loadingRooms.current.has(roomId)) {
      console.log(`⏳ تحميل الغرفة ${roomId} قيد التنفيذ`);
      return;
    }

    loadingRooms.current.add(roomId);
    
    try {
      console.log(`🔄 تحميل رسائل الغرفة ${roomId}...`);
      const data = await apiRequest(`/api/messages/room/${roomId}?limit=20`);
      
      if (data?.messages && Array.isArray(data.messages)) {
        const formattedMessages = mapDbMessagesToChatMessages(data.messages, roomId);
        dispatch({ 
          type: 'SET_ROOM_MESSAGES', 
          payload: { roomId, messages: formattedMessages }
        });
        console.log(`✅ تم تحميل ${formattedMessages.length} رسالة للغرفة ${roomId}`);
      }
    } catch (error) {
      console.error(`❌ خطأ في تحميل رسائل الغرفة ${roomId}:`, error);
    } finally {
      loadingRooms.current.delete(roomId);
    }
  }, [state.roomMessages]);

  // 🔥 SIMPLIFIED Socket event handling - حذف التضارب
  const setupSocketListeners = useCallback((socketInstance: Socket) => {
    console.log('🔗 إعداد مستمعي Socket...');

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
          
          case 'roomMessages': {
            const { messages } = envelope;
            if (Array.isArray(messages)) {
              const roomId = state.currentRoomId;
              const formattedMessages = messages.map((msg: any) => ({
                id: msg.id,
                content: msg.content,
                senderId: msg.senderId,
                timestamp: msg.timestamp,
                messageType: msg.messageType || 'text',
                sender: msg.sender,
                roomId
              }));
              
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
          
          case 'error':
          case 'warning': {
            console.warn('⚠️ خطأ من السيرفر:', envelope.message);
            break;
          }
          
          default: {
            console.log('📨 رسالة غير معروفة:', envelope.type);
            break;
          }
        }
      } catch (error) {
        console.error('❌ خطأ في معالجة رسالة Socket:', error);
      }
    });

    // معالج الرسائل الخاصة
    socketInstance.on('privateMessage', (data: any) => {
      try {
        const { message } = data;
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
          
          // تحديد معرف المحادثة (المرسل أو المستقبل)
          const conversationId = message.senderId === state.currentUser?.id 
            ? message.receiverId 
            : message.senderId;
          
          dispatch({ 
            type: 'SET_PRIVATE_MESSAGE', 
            payload: { userId: conversationId, message: chatMessage }
          });
          
          // إشعار للرسائل الخاصة
          if (chatMessage.senderId !== state.currentUser?.id) {
            playNotificationSound();
          }
        }
      } catch (error) {
        console.error('❌ خطأ في معالجة الرسالة الخاصة:', error);
      }
    });

    // معالجات الاتصال
    socketInstance.on('connect', () => {
      console.log('✅ تم الاتصال بالسيرفر');
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ انقطع الاتصال بالسيرفر');
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ خطأ في الاتصال:', error);
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'فشل الاتصال بالسيرفر' });
    });

  }, [state.currentUser, state.onlineUsers, state.currentRoomId]);

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
      }

      const serverUrl = import.meta.env.DEV 
        ? 'http://localhost:5000'
        : window.location.origin;

      socket.current = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true,
        forceNew: true,
        query: {
          userId: user.id?.toString() || '',
          username: user.username || '',
          userType: user.userType || 'guest'
        }
      });

      // إعداد المستمعين
      setupSocketListeners(socket.current);

      // إرسال المصادقة عند الاتصال
      socket.current.on('connect', () => {
        socket.current?.emit('auth', {
          userId: user.id,
          username: user.username,
          userType: user.userType
        });
        dispatch({ type: 'SET_LOADING', payload: false });
      });
        
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

      setupSocketListeners(socket.current);

    } catch (error) {
      console.error('خطأ في الاتصال:', error);
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'خطأ في الاتصال بالخادم' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [setupSocketListeners]);

  // 🔥 SIMPLIFIED Join room function
  const joinRoom = useCallback((roomId: string) => {
    // تجنب الانضمام لنفس الغرفة
    if (state.currentRoomId === roomId) {
      console.log(`✅ أنت موجود في الغرفة ${roomId} بالفعل`);
      return;
    }
    
    console.log(`🔄 الانضمام للغرفة: ${roomId}`);
    
    // تغيير الغرفة الحالية
    dispatch({ type: 'SET_CURRENT_ROOM', payload: roomId });
    
    // تحميل رسائل الغرفة إذا لم تكن محملة
    loadRoomMessages(roomId);
    
    // إرسال طلب الانضمام للسيرفر
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

    if (!content.trim()) {
      console.warn('⚠️ محتوى الرسالة فارغ');
      return;
    }

    const messageData = {
      senderId: state.currentUser.id,
      content: content.trim(),
      messageType,
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

    // ✅ Convenience functions
    sendPublicMessage: (content: string) => sendMessage(content, 'text'),
    sendPrivateMessage: (receiverId: number, content: string) => sendMessage(content, 'text', receiverId),
  };
}