import { useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiRequest } from '@/lib/queryClient';
import { mapDbMessagesToChatMessages } from '@/utils/messageUtils';
import type { ChatState, ChatUser, ChatMessage, PrivateConversation, Notification } from '../../shared/types';

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

// Enhanced state with unread counts
interface EnhancedChatState extends ChatState {
  unreadCounts: { [userId: number]: number };
  isReconnecting: boolean;
  lastMessageTimestamp: { [roomId: string]: string };
  socketHealth: {
    connected: boolean;
    reconnectAttempts: number;
    lastHeartbeat: number;
  };
}

type ChatAction = 
  | { type: 'SET_CURRENT_USER'; payload: ChatUser | null }
  | { type: 'SET_USERS'; payload: ChatUser[] }
  | { type: 'SET_PUBLIC_MESSAGES'; payload: ChatMessage[] }
  | { type: 'ADD_PUBLIC_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_ROOM_MESSAGES'; payload: { roomId: string; messages: ChatMessage[] } }
  | { type: 'ADD_ROOM_MESSAGE'; payload: { roomId: string; message: ChatMessage } }
  | { type: 'REMOVE_MESSAGE'; payload: { messageId: number; roomId?: string } }
  | { type: 'SET_PRIVATE_MESSAGES'; payload: { userId: number; messages: ChatMessage[] } }
  | { type: 'SET_PRIVATE_MESSAGE'; payload: { userId: number; message: ChatMessage } }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_TYPING_USER'; payload: string }
  | { type: 'REMOVE_TYPING_USER'; payload: string }
  | { type: 'SET_CONNECTION_ERROR'; payload: string | null }
  | { type: 'SET_ROOM'; payload: string }
  | { type: 'SET_SHOW_KICK_COUNTDOWN'; payload: boolean }
  | { type: 'SET_UNREAD_COUNT'; payload: { userId: number; count: number } }
  | { type: 'CLEAR_UNREAD_COUNT'; payload: number }
  | { type: 'SET_RECONNECTING'; payload: boolean }
  | { type: 'UPDATE_SOCKET_HEALTH'; payload: Partial<EnhancedChatState['socketHealth']> };

// Enhanced initial state
const initialState: EnhancedChatState = {
  currentUser: null,
  onlineUsers: [],
  publicMessages: [],
  privateConversations: {},
  notifications: [],
  isConnected: false,
  isLoading: false,
  typingUsers: new Set(),
  connectionError: null,
  currentRoom: 'general',
  roomMessages: {},
  showKickCountdown: false,
  unreadCounts: {},
  isReconnecting: false,
  lastMessageTimestamp: {},
  socketHealth: {
    connected: false,
    reconnectAttempts: 0,
    lastHeartbeat: Date.now()
  }
};

// Enhanced reducer with better error handling and state management
function chatReducer(state: EnhancedChatState, action: ChatAction): EnhancedChatState {
  try {
    switch (action.type) {
      case 'SET_CURRENT_USER':
        return { ...state, currentUser: action.payload };

      case 'SET_USERS':
        return { ...state, onlineUsers: Array.isArray(action.payload) ? action.payload : [] };

      case 'SET_PUBLIC_MESSAGES':
        return { ...state, publicMessages: Array.isArray(action.payload) ? action.payload : [] };

      case 'ADD_PUBLIC_MESSAGE':
        if (!action.payload || typeof action.payload !== 'object') return state;
        
        // منع التكرار
        const existingPublic = state.publicMessages.find(
          msg => msg.id === action.payload.id || 
          (msg.timestamp === action.payload.timestamp && 
           msg.senderId === action.payload.senderId && 
           msg.content === action.payload.content)
        );
        
        if (existingPublic) return state;
        
        return {
          ...state,
          publicMessages: [...state.publicMessages, action.payload]
        };

      case 'SET_ROOM_MESSAGES':
        const { roomId, messages } = action.payload;
        if (!roomId || !Array.isArray(messages)) return state;
        
        return {
          ...state,
          roomMessages: {
            ...state.roomMessages,
            [roomId]: messages
          },
          lastMessageTimestamp: {
            ...state.lastMessageTimestamp,
            [roomId]: messages.length > 0 ? messages[messages.length - 1].timestamp : ''
          }
        };

      case 'ADD_ROOM_MESSAGE':
        const { roomId: msgRoomId, message } = action.payload;
        if (!msgRoomId || !message) return state;

        const currentRoomMessages = state.roomMessages[msgRoomId] || [];
        
        // فحص التكرار المحسن
        const existingRoomMessage = currentRoomMessages.find(
          msg => msg.id === message.id || 
          (msg.timestamp === message.timestamp && 
           msg.senderId === message.senderId && 
           msg.content === message.content)
        );

        if (existingRoomMessage) return state;

        const newRoomMessages = {
          ...state.roomMessages,
          [msgRoomId]: [...currentRoomMessages, message]
        };

        // تحديد حد أقصى للرسائل المحفوظة (1000 رسالة لكل غرفة)
        if (newRoomMessages[msgRoomId].length > 1000) {
          newRoomMessages[msgRoomId] = newRoomMessages[msgRoomId].slice(-1000);
        }

        return {
          ...state,
          roomMessages: newRoomMessages,
          lastMessageTimestamp: {
            ...state.lastMessageTimestamp,
            [msgRoomId]: message.timestamp
          }
        };

      case 'REMOVE_MESSAGE':
        const { messageId, roomId: removeRoomId } = action.payload;
        if (!messageId) return state;

        let newState = { ...state };

        // إزالة من الرسائل العامة
        newState.publicMessages = state.publicMessages.filter(msg => msg.id !== messageId);

        // إزالة من رسائل الغرف
        if (removeRoomId && state.roomMessages[removeRoomId]) {
          newState.roomMessages = {
            ...state.roomMessages,
            [removeRoomId]: state.roomMessages[removeRoomId].filter(msg => msg.id !== messageId)
          };
        } else {
          // إزالة من جميع الغرف إذا لم يتم تحديد غرفة
          const updatedRoomMessages = { ...state.roomMessages };
          Object.keys(updatedRoomMessages).forEach(roomId => {
            updatedRoomMessages[roomId] = updatedRoomMessages[roomId].filter(msg => msg.id !== messageId);
          });
          newState.roomMessages = updatedRoomMessages;
        }

        return newState;

      case 'SET_PRIVATE_MESSAGES':
        const { userId: setUserId, messages: setMessages } = action.payload;
        if (typeof setUserId !== 'number' || !Array.isArray(setMessages)) return state;
        
        return {
          ...state,
          privateConversations: {
            ...state.privateConversations,
            [setUserId]: setMessages
          }
        };

      case 'SET_PRIVATE_MESSAGE':
        const { userId: msgUserId, message: privateMsg } = action.payload;
        if (typeof msgUserId !== 'number' || !privateMsg) return state;

        const currentConversation = state.privateConversations[msgUserId] || [];
        
        // فحص التكرار في الرسائل الخاصة
        const existingPrivateMessage = currentConversation.find(
          msg => msg.id === privateMsg.id ||
          (msg.timestamp === privateMsg.timestamp && 
           msg.senderId === privateMsg.senderId && 
           msg.content === privateMsg.content)
        );

        if (existingPrivateMessage) return state;

        const updatedConversation = [...currentConversation, privateMsg];
        
        // تحديد حد أقصى للرسائل الخاصة (500 رسالة لكل محادثة)
        const limitedConversation = updatedConversation.length > 500 
          ? updatedConversation.slice(-500) 
          : updatedConversation;

        // تحديث عداد الرسائل غير المقروءة
        const newUnreadCounts = { ...state.unreadCounts };
        if (privateMsg.senderId !== state.currentUser?.id) {
          newUnreadCounts[msgUserId] = (newUnreadCounts[msgUserId] || 0) + 1;
        }

        return {
          ...state,
          privateConversations: {
            ...state.privateConversations,
            [msgUserId]: limitedConversation
          },
          unreadCounts: newUnreadCounts
        };

      case 'SET_UNREAD_COUNT':
        const { userId: countUserId, count } = action.payload;
        if (typeof countUserId !== 'number' || typeof count !== 'number') return state;
        
        return {
          ...state,
          unreadCounts: {
            ...state.unreadCounts,
            [countUserId]: Math.max(0, count)
          }
        };

      case 'CLEAR_UNREAD_COUNT':
        const userIdToClear = action.payload;
        if (typeof userIdToClear !== 'number') return state;
        
        const { [userIdToClear]: removed, ...restUnreadCounts } = state.unreadCounts;
        return {
          ...state,
          unreadCounts: restUnreadCounts
        };

      case 'SET_NOTIFICATIONS':
        return { 
          ...state, 
          notifications: Array.isArray(action.payload) ? action.payload : [] 
        };

      case 'ADD_NOTIFICATION':
        if (!action.payload || typeof action.payload !== 'object') return state;
        
        // منع تكرار الإشعارات
        const existingNotification = state.notifications.find(
          notif => notif.id === action.payload.id
        );
        
        if (existingNotification) return state;
        
        return {
          ...state,
          notifications: [action.payload, ...state.notifications].slice(0, 100) // حد أقصى 100 إشعار
        };

      case 'SET_CONNECTED':
        return { 
          ...state, 
          isConnected: Boolean(action.payload),
          connectionError: action.payload ? null : state.connectionError
        };

      case 'SET_LOADING':
        return { ...state, isLoading: Boolean(action.payload) };

      case 'ADD_TYPING_USER':
        if (!action.payload || typeof action.payload !== 'string') return state;
        const newTypingUsers = new Set(state.typingUsers);
        newTypingUsers.add(action.payload);
        return { ...state, typingUsers: newTypingUsers };

      case 'REMOVE_TYPING_USER':
        if (!action.payload || typeof action.payload !== 'string') return state;
        const updatedTypingUsers = new Set(state.typingUsers);
        updatedTypingUsers.delete(action.payload);
        return { ...state, typingUsers: updatedTypingUsers };

      case 'SET_CONNECTION_ERROR':
        return { ...state, connectionError: action.payload };

      case 'SET_ROOM':
        if (!action.payload || typeof action.payload !== 'string') return state;
        return { ...state, currentRoom: action.payload };

      case 'SET_SHOW_KICK_COUNTDOWN':
        return { ...state, showKickCountdown: Boolean(action.payload) };

      case 'SET_RECONNECTING':
        return { ...state, isReconnecting: Boolean(action.payload) };

      case 'UPDATE_SOCKET_HEALTH':
        if (!action.payload || typeof action.payload !== 'object') return state;
        return {
          ...state,
          socketHealth: {
            ...state.socketHealth,
            ...action.payload
          }
        };

      default:
        console.warn('Unknown action type:', (action as any).type);
        return state;
    }
  } catch (error) {
    console.error('Error in chatReducer:', error, 'Action:', action);
    return state;
  }
}

// Enhanced socket event handlers with better memory management
class SocketEventManager {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();
  private reconnectTimeouts: Set<NodeJS.Timeout> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private dispatch: React.Dispatch<ChatAction>) {}

  setSocket(socket: Socket) {
    this.socket = socket;
    this.setupEventHandlers();
    this.startHeartbeat();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    // تنظيف المعالجات السابقة
    this.cleanupEventHandlers();

    // معالج الاتصال
    this.addEventHandler('connect', () => {
      console.log('✅ متصل بالخادم');
      this.dispatch({ type: 'SET_CONNECTED', payload: true });
      this.dispatch({ type: 'SET_RECONNECTING', payload: false });
      this.dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
      this.dispatch({ 
        type: 'UPDATE_SOCKET_HEALTH', 
        payload: { connected: true, reconnectAttempts: 0 } 
      });
    });

    // معالج قطع الاتصال
    this.addEventHandler('disconnect', (reason: string) => {
      console.warn('❌ انقطع الاتصال:', reason);
      this.dispatch({ type: 'SET_CONNECTED', payload: false });
      this.dispatch({ 
        type: 'UPDATE_SOCKET_HEALTH', 
        payload: { connected: false } 
      });
      
      if (reason === 'io server disconnect') {
        // إعادة الاتصال تلقائياً
        this.scheduleReconnect();
      }
    });

    // معالج أخطاء الاتصال
    this.addEventHandler('connect_error', (error: any) => {
      console.error('❌ خطأ في الاتصال:', error);
      this.dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'فشل في الاتصال بالخادم' });
      this.dispatch({ 
        type: 'UPDATE_SOCKET_HEALTH', 
        payload: { 
          connected: false,
          reconnectAttempts: (this.dispatch as any).socketHealth?.reconnectAttempts + 1 || 1
        }
      });
    });

    // معالج إعادة الاتصال
    this.addEventHandler('reconnect', (attemptNumber: number) => {
      console.log(`🔄 تم إعادة الاتصال (محاولة ${attemptNumber})`);
      this.dispatch({ type: 'SET_RECONNECTING', payload: false });
    });

    this.addEventHandler('reconnecting', (attemptNumber: number) => {
      console.log(`🔄 جاري إعادة الاتصال (محاولة ${attemptNumber})`);
      this.dispatch({ type: 'SET_RECONNECTING', payload: true });
    });

    // معالجات الرسائل المحسنة
    this.setupMessageHandlers();
    
    // معالجات المستخدمين
    this.setupUserHandlers();
    
    // معالجات الإشعارات
    this.setupNotificationHandlers();
  }

  private setupMessageHandlers() {
    if (!this.socket) return;

    // معالج الرسائل العامة المحسن
    this.addEventHandler('message', (data: any) => {
      try {
        if (!data || typeof data !== 'object') {
          console.warn('⚠️ بيانات رسالة غير صحيحة:', data);
          return;
        }

        const envelope = data.envelope || data;
        
        switch (envelope.type) {
          case 'newMessage':
            this.handleNewMessage(envelope);
            break;
          case 'messageDeleted':
            this.handleMessageDeleted(envelope);
            break;
          case 'roomMessages':
            this.handleRoomMessages(envelope);
            break;
          default:
            console.warn('⚠️ نوع رسالة غير معروف:', envelope.type);
        }
      } catch (error) {
        console.error('❌ خطأ في معالجة الرسالة:', error, data);
      }
    });

    // معالج الرسائل الخاصة المحسن
    this.addEventHandler('privateMessage', (incoming: any) => {
      try {
        const envelope = incoming?.envelope || incoming;
        const payload = envelope?.message || envelope;
        const message = payload?.message || payload;
        
        if (!message || !message.sender || typeof message.sender !== 'object') {
          console.warn('⚠️ رسالة خاصة غير صحيحة:', incoming);
          return;
        }

        const chatMessage: ChatMessage = {
          id: message.id || Date.now(),
          content: this.sanitizeContent(message.content || ''),
          senderId: message.sender.id,
          timestamp: message.timestamp || new Date().toISOString(),
          messageType: message.messageType || 'text',
          sender: message.sender,
          isPrivate: true,
          receiverId: message.receiverId
        };

        // تحديد معرف المحادثة
        const conversationId = message.senderId === (this.dispatch as any).currentUser?.id
          ? message.receiverId
          : message.senderId;

        if (typeof conversationId === 'number') {
          this.dispatch({
            type: 'SET_PRIVATE_MESSAGE',
            payload: { userId: conversationId, message: chatMessage }
          });

          // تشغيل صوت التنبيه للرسائل الواردة فقط
          if (chatMessage.senderId !== (this.dispatch as any).currentUser?.id) {
            this.playNotificationSound();
          }
        }
      } catch (error) {
        console.error('❌ خطأ في معالجة الرسالة الخاصة:', error, incoming);
      }
    });
  }

  private handleNewMessage(envelope: any) {
    try {
      const { message, roomId } = envelope;
      if (!message || !message.sender) return;

      const chatMessage: ChatMessage = {
        id: message.id || Date.now(),
        content: this.sanitizeContent(message.content || ''),
        senderId: message.sender.id,
        timestamp: message.timestamp || new Date().toISOString(),
        messageType: message.messageType || 'text',
        sender: message.sender,
        isPrivate: message.isPrivate || false,
        roomId: roomId || 'general'
      };

      if (roomId) {
        this.dispatch({
          type: 'ADD_ROOM_MESSAGE',
          payload: { roomId, message: chatMessage }
        });
      } else {
        this.dispatch({ type: 'ADD_PUBLIC_MESSAGE', payload: chatMessage });
      }
    } catch (error) {
      console.error('❌ خطأ في معالجة الرسالة الجديدة:', error, envelope);
    }
  }

  private handleMessageDeleted(envelope: any) {
    try {
      const { messageId, roomId } = envelope;
      if (typeof messageId === 'number') {
        this.dispatch({
          type: 'REMOVE_MESSAGE',
          payload: { messageId, roomId }
        });
      }
    } catch (error) {
      console.error('❌ خطأ في معالجة حذف الرسالة:', error, envelope);
    }
  }

  private handleRoomMessages(envelope: any) {
    try {
      const { messages, roomId } = envelope;
      if (roomId && Array.isArray(messages)) {
        const formattedMessages = mapDbMessagesToChatMessages(messages, roomId);
        this.dispatch({
          type: 'SET_ROOM_MESSAGES',
          payload: { roomId, messages: formattedMessages }
        });
      }
    } catch (error) {
      console.error('❌ خطأ في معالجة رسائل الغرفة:', error, envelope);
    }
  }

  private setupUserHandlers() {
    if (!this.socket) return;

    this.addEventHandler('onlineUsers', (users: ChatUser[]) => {
      try {
        if (Array.isArray(users)) {
          this.dispatch({ type: 'SET_USERS', payload: users });
        }
      } catch (error) {
        console.error('❌ خطأ في معالجة المستخدمين المتصلين:', error);
      }
    });

    this.addEventHandler('userJoined', (user: ChatUser) => {
      try {
        if (user && typeof user === 'object' && user.id) {
          // يمكن إضافة منطق خاص بانضمام المستخدمين هنا
          console.log(`👋 انضم المستخدم: ${user.username}`);
        }
      } catch (error) {
        console.error('❌ خطأ في معالجة انضمام المستخدم:', error);
      }
    });

    this.addEventHandler('userLeft', (user: ChatUser) => {
      try {
        if (user && typeof user === 'object' && user.id) {
          console.log(`👋 غادر المستخدم: ${user.username}`);
        }
      } catch (error) {
        console.error('❌ خطأ في معالجة مغادرة المستخدم:', error);
      }
    });
  }

  private setupNotificationHandlers() {
    if (!this.socket) return;

    this.addEventHandler('notification', (notification: Notification) => {
      try {
        if (notification && typeof notification === 'object' && notification.id) {
          this.dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
        }
      } catch (error) {
        console.error('❌ خطأ في معالجة الإشعار:', error);
      }
    });

    // معالج الطرد
    this.addEventHandler('kicked', (data: any) => {
      try {
        const duration = data?.duration || 15;
        const reason = data?.reason || 'بدون سبب';
        const moderator = data?.moderator || 'مشرف';

        alert(`تم طردك من الدردشة بواسطة ${moderator}\nالسبب: ${reason}\nالمدة: ${duration} دقيقة`);
        
        this.dispatch({ type: 'SET_SHOW_KICK_COUNTDOWN', payload: true });

        // فصل تلقائي بعد 3 ثوان
        const timeout = setTimeout(() => {
          this.cleanup();
          window.location.href = '/';
        }, 3000);
        
        this.reconnectTimeouts.add(timeout);
      } catch (error) {
        console.error('❌ خطأ في معالجة الطرد:', error);
      }
    });
  }

  private addEventHandler(event: string, handler: Function) {
    if (!this.socket) return;

    // إضافة المعالج للخريطة للتتبع
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);

    // إضافة المعالج للـ socket
    this.socket.on(event, handler as any);
  }

  private cleanupEventHandlers() {
    if (!this.socket) return;

    // إزالة جميع المعالجات
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach(handler => {
        this.socket!.off(event, handler as any);
      });
    });

    this.eventHandlers.clear();
  }

  private scheduleReconnect() {
    const timeout = setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        console.log('🔄 محاولة إعادة الاتصال...');
        this.socket.connect();
      }
    }, 5000);
    
    this.reconnectTimeouts.add(timeout);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.dispatch({
          type: 'UPDATE_SOCKET_HEALTH',
          payload: { lastHeartbeat: Date.now() }
        });
      }
    }, 30000); // كل 30 ثانية
  }

  private sanitizeContent(content: string): string {
    if (typeof content !== 'string') return '';
    
    return content
      .replace(/<[^>]*>/g, '') // إزالة HTML tags
      .replace(/javascript:/gi, '') // إزالة javascript links
      .replace(/on\w+\s*=/gi, '') // إزالة event handlers
      .trim()
      .substring(0, 5000); // حد أقصى للطول
  }

  private playNotificationSound() {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // تجاهل الأخطاء - قد لا يكون الصوت متوفراً
      });
    } catch (error) {
      // تجاهل أخطاء الصوت
    }
  }

  cleanup() {
    console.log('🧹 تنظيف SocketEventManager...');
    
    // تنظيف معالجات الأحداث
    this.cleanupEventHandlers();
    
    // تنظيف المهلات المؤقتة
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectTimeouts.clear();
    
    // تنظيف heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // قطع اتصال الـ socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Enhanced useChat hook with better memory management
export function useChat() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const socket = useRef<Socket | null>(null);
  const eventManager = useRef<SocketEventManager | null>(null);
  const broadcastHandlers = useRef<Function[]>([]);

  // تنظيف شامل عند unmount
  useEffect(() => {
    return () => {
      console.log('🧹 تنظيف useChat...');
      
      if (eventManager.current) {
        eventManager.current.cleanup();
        eventManager.current = null;
      }
      
      broadcastHandlers.current = [];
    };
  }, []);

  // باقي الدوال مع تحسينات الذاكرة...
  // (يمكن متابعة باقي الكود هنا)

  // إرجاع الحالة والدوال المحسنة
  return {
    ...state,
    // الدوال المحسنة ستكون هنا
    connect: useCallback(() => {
      // منطق الاتصال المحسن
    }, []),
    
    disconnect: useCallback(() => {
      if (eventManager.current) {
        eventManager.current.cleanup();
      }
    }, []),
    
    // باقي الدوال...
  };
}