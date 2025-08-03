import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect, useRef } from 'react';
import type { ChatUser, ChatMessage, ChatRoom, Notification } from '@/types/chat';

// تقسيم الحالة لتقليل نطاق التأثير
interface MessageState {
  byRoom: Record<string, ChatMessage[]>;
  private: Record<number, ChatMessage[]>;
  lastMessageId: Record<string, number>;
  isLoading: boolean;
}

interface UserState {
  online: ChatUser[];
  offline: ChatUser[];
  ignored: Set<number>;
  typing: Set<string>;
  lastUpdated: number;
}

interface RoomState {
  current: string;
  available: ChatRoom[];
  isLoading: boolean;
}

interface NotificationState {
  items: Notification[];
  unreadCount: number;
  lastCleared: number;
}

interface UIState {
  showKickCountdown: boolean;
  showProfile: boolean;
  showSettings: boolean;
  activeView: 'users' | 'walls' | 'rooms' | 'hidden';
}

// الحالة المجمعة
interface OptimizedChatState {
  messages: MessageState;
  users: UserState;
  rooms: RoomState;
  notifications: NotificationState;
  ui: UIState;
  currentUser: ChatUser | null;
  isConnected: boolean;
  connectionError: string | null;
}

// أنواع الإجراءات
type ChatAction = 
  // إجراءات الرسائل
  | { type: 'ADD_MESSAGE'; payload: { roomId: string; message: ChatMessage } }
  | { type: 'SET_ROOM_MESSAGES'; payload: { roomId: string; messages: ChatMessage[] } }
  | { type: 'ADD_PRIVATE_MESSAGE'; payload: { userId: number; message: ChatMessage } }
  | { type: 'SET_MESSAGES_LOADING'; payload: boolean }
  | { type: 'CLEANUP_OLD_MESSAGES'; payload: { roomId: string; maxCount: number } }
  
  // إجراءات المستخدمين
  | { type: 'SET_ONLINE_USERS'; payload: ChatUser[] }
  | { type: 'SET_OFFLINE_USERS'; payload: ChatUser[] }
  | { type: 'ADD_ONLINE_USER'; payload: ChatUser }
  | { type: 'REMOVE_ONLINE_USER'; payload: number }
  | { type: 'IGNORE_USER'; payload: number }
  | { type: 'UNIGNORE_USER'; payload: number }
  | { type: 'SET_TYPING_USERS'; payload: Set<string> }
  | { type: 'UPDATE_USERS_TIMESTAMP' }
  
  // إجراءات الغرف
  | { type: 'SET_CURRENT_ROOM'; payload: string }
  | { type: 'SET_AVAILABLE_ROOMS'; payload: ChatRoom[] }
  | { type: 'SET_ROOMS_LOADING'; payload: boolean }
  
  // إجراءات الإشعارات
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'CLEAR_NOTIFICATIONS'; payload?: number }
  | { type: 'UPDATE_UNREAD_COUNT'; payload: number }
  
  // إجراءات واجهة المستخدم
  | { type: 'SET_SHOW_KICK_COUNTDOWN'; payload: boolean }
  | { type: 'SET_SHOW_PROFILE'; payload: boolean }
  | { type: 'SET_SHOW_SETTINGS'; payload: boolean }
  | { type: 'SET_ACTIVE_VIEW'; payload: UIState['activeView'] }
  
  // إجراءات عامة
  | { type: 'SET_CURRENT_USER'; payload: ChatUser | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_CONNECTION_ERROR'; payload: string | null };

// الحالة الأولية
const initialState: OptimizedChatState = {
  messages: {
    byRoom: {},
    private: {},
    lastMessageId: {},
    isLoading: false
  },
  users: {
    online: [],
    offline: [],
    ignored: new Set(),
    typing: new Set(),
    lastUpdated: 0
  },
  rooms: {
    current: 'general',
    available: [],
    isLoading: false
  },
  notifications: {
    items: [],
    unreadCount: 0,
    lastCleared: 0
  },
  ui: {
    showKickCountdown: false,
    showProfile: false,
    showSettings: false,
    activeView: 'users'
  },
  currentUser: null,
  isConnected: false,
  connectionError: null
};

// المخفض المحسن
function optimizedChatReducer(state: OptimizedChatState, action: ChatAction): OptimizedChatState {
  switch (action.type) {
    // إجراءات الرسائل
    case 'ADD_MESSAGE': {
      const { roomId, message } = action.payload;
      const currentMessages = state.messages.byRoom[roomId] || [];
      
      return {
        ...state,
        messages: {
          ...state.messages,
          byRoom: {
            ...state.messages.byRoom,
            [roomId]: [...currentMessages, message]
          },
          lastMessageId: {
            ...state.messages.lastMessageId,
            [roomId]: message.id || Date.now()
          }
        }
      };
    }
    
    case 'SET_ROOM_MESSAGES': {
      const { roomId, messages } = action.payload;
      
      return {
        ...state,
        messages: {
          ...state.messages,
          byRoom: {
            ...state.messages.byRoom,
            [roomId]: messages
          }
        }
      };
    }
    
    case 'ADD_PRIVATE_MESSAGE': {
      const { userId, message } = action.payload;
      const currentPrivateMessages = state.messages.private[userId] || [];
      
      return {
        ...state,
        messages: {
          ...state.messages,
          private: {
            ...state.messages.private,
            [userId]: [...currentPrivateMessages, message]
          }
        }
      };
    }
    
    case 'CLEANUP_OLD_MESSAGES': {
      const { roomId, maxCount } = action.payload;
      const currentMessages = state.messages.byRoom[roomId] || [];
      
      if (currentMessages.length > maxCount) {
        const trimmed = currentMessages.slice(-maxCount);
        
        return {
          ...state,
          messages: {
            ...state.messages,
            byRoom: {
              ...state.messages.byRoom,
              [roomId]: trimmed
            }
          }
        };
      }
      
      return state;
    }
    
    // إجراءات المستخدمين
    case 'SET_ONLINE_USERS': {
      return {
        ...state,
        users: {
          ...state.users,
          online: action.payload,
          lastUpdated: Date.now()
        }
      };
    }
    
    case 'ADD_ONLINE_USER': {
      const userExists = state.users.online.some(u => u.id === action.payload.id);
      
      if (userExists) {
        // تحديث المستخدم الموجود
        const updatedOnline = state.users.online.map(u => 
          u.id === action.payload.id ? action.payload : u
        );
        
        return {
          ...state,
          users: {
            ...state.users,
            online: updatedOnline,
            lastUpdated: Date.now()
          }
        };
      } else {
        // إضافة مستخدم جديد
        return {
          ...state,
          users: {
            ...state.users,
            online: [...state.users.online, action.payload],
            lastUpdated: Date.now()
          }
        };
      }
    }
    
    case 'REMOVE_ONLINE_USER': {
      return {
        ...state,
        users: {
          ...state.users,
          online: state.users.online.filter(u => u.id !== action.payload),
          lastUpdated: Date.now()
        }
      };
    }
    
    case 'IGNORE_USER': {
      const newIgnored = new Set(state.users.ignored);
      newIgnored.add(action.payload);
      
      return {
        ...state,
        users: {
          ...state.users,
          ignored: newIgnored
        }
      };
    }
    
    case 'UNIGNORE_USER': {
      const newIgnored = new Set(state.users.ignored);
      newIgnored.delete(action.payload);
      
      return {
        ...state,
        users: {
          ...state.users,
          ignored: newIgnored
        }
      };
    }
    
    case 'SET_TYPING_USERS': {
      return {
        ...state,
        users: {
          ...state.users,
          typing: action.payload
        }
      };
    }
    
    // إجراءات الغرف
    case 'SET_CURRENT_ROOM': {
      return {
        ...state,
        rooms: {
          ...state.rooms,
          current: action.payload
        }
      };
    }
    
    case 'SET_AVAILABLE_ROOMS': {
      return {
        ...state,
        rooms: {
          ...state.rooms,
          available: action.payload
        }
      };
    }
    
    // إجراءات الإشعارات
    case 'ADD_NOTIFICATION': {
      return {
        ...state,
        notifications: {
          ...state.notifications,
          items: [...state.notifications.items, action.payload],
          unreadCount: state.notifications.unreadCount + 1
        }
      };
    }
    
    case 'CLEAR_NOTIFICATIONS': {
      return {
        ...state,
        notifications: {
          ...state.notifications,
          items: [],
          unreadCount: 0,
          lastCleared: action.payload || Date.now()
        }
      };
    }
    
    // إجراءات واجهة المستخدم
    case 'SET_SHOW_KICK_COUNTDOWN': {
      return {
        ...state,
        ui: {
          ...state.ui,
          showKickCountdown: action.payload
        }
      };
    }
    
    case 'SET_ACTIVE_VIEW': {
      return {
        ...state,
        ui: {
          ...state.ui,
          activeView: action.payload
        }
      };
    }
    
    // إجراءات عامة
    case 'SET_CURRENT_USER': {
      return {
        ...state,
        currentUser: action.payload
      };
    }
    
    case 'SET_CONNECTION_STATUS': {
      return {
        ...state,
        isConnected: action.payload
      };
    }
    
    case 'SET_CONNECTION_ERROR': {
      return {
        ...state,
        connectionError: action.payload
      };
    }
    
    default:
      return state;
  }
}

// إنترفيس المحتوى
interface OptimizedChatContextType {
  // State
  messages: MessageState;
  users: UserState;
  rooms: RoomState;
  notifications: NotificationState;
  ui: UIState;
  currentUser: ChatUser | null;
  isConnected: boolean;
  connectionError: string | null;
  
  // Actions
  addMessage: (roomId: string, message: ChatMessage) => void;
  setRoomMessages: (roomId: string, messages: ChatMessage[]) => void;
  addPrivateMessage: (userId: number, message: ChatMessage) => void;
  cleanupOldMessages: (roomId: string, maxCount?: number) => void;
  
  setOnlineUsers: (users: ChatUser[]) => void;
  addOnlineUser: (user: ChatUser) => void;
  removeOnlineUser: (userId: number) => void;
  ignoreUser: (userId: number) => void;
  unignoreUser: (userId: number) => void;
  setTypingUsers: (users: Set<string>) => void;
  
  setCurrentRoom: (roomId: string) => void;
  setAvailableRooms: (rooms: ChatRoom[]) => void;
  
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
  
  setShowKickCountdown: (show: boolean) => void;
  setActiveView: (view: UIState['activeView']) => void;
  
  setCurrentUser: (user: ChatUser | null) => void;
  setConnectionStatus: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  
  // Computed values
  filteredOnlineUsers: ChatUser[];
  currentRoomMessages: ChatMessage[];
  unreadNotificationsCount: number;
}

// إنشاء المحتوى
const OptimizedChatContext = createContext<OptimizedChatContextType | undefined>(undefined);

// مزود المحتوى المحسن
export function OptimizedChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(optimizedChatReducer, initialState);
  
  // تنظيف تلقائي للرسائل القديمة
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      Object.keys(state.messages.byRoom).forEach(roomId => {
        const messages = state.messages.byRoom[roomId];
        if (messages && messages.length > 100) {
          dispatch({ 
            type: 'CLEANUP_OLD_MESSAGES', 
            payload: { roomId, maxCount: 100 } 
          });
        }
      });
    }, 60000); // كل دقيقة
    
    return () => clearInterval(cleanupInterval);
  }, [state.messages.byRoom]);
  
  // Actions محسنة مع useCallback
  const addMessage = useCallback((roomId: string, message: ChatMessage) => {
    dispatch({ type: 'ADD_MESSAGE', payload: { roomId, message } });
  }, []);
  
  const setRoomMessages = useCallback((roomId: string, messages: ChatMessage[]) => {
    dispatch({ type: 'SET_ROOM_MESSAGES', payload: { roomId, messages } });
  }, []);
  
  const addPrivateMessage = useCallback((userId: number, message: ChatMessage) => {
    dispatch({ type: 'ADD_PRIVATE_MESSAGE', payload: { userId, message } });
  }, []);
  
  const cleanupOldMessages = useCallback((roomId: string, maxCount: number = 100) => {
    dispatch({ type: 'CLEANUP_OLD_MESSAGES', payload: { roomId, maxCount } });
  }, []);
  
  const setOnlineUsers = useCallback((users: ChatUser[]) => {
    dispatch({ type: 'SET_ONLINE_USERS', payload: users });
  }, []);
  
  const addOnlineUser = useCallback((user: ChatUser) => {
    dispatch({ type: 'ADD_ONLINE_USER', payload: user });
  }, []);
  
  const removeOnlineUser = useCallback((userId: number) => {
    dispatch({ type: 'REMOVE_ONLINE_USER', payload: userId });
  }, []);
  
  const ignoreUser = useCallback((userId: number) => {
    dispatch({ type: 'IGNORE_USER', payload: userId });
  }, []);
  
  const unignoreUser = useCallback((userId: number) => {
    dispatch({ type: 'UNIGNORE_USER', payload: userId });
  }, []);
  
  const setTypingUsers = useCallback((users: Set<string>) => {
    dispatch({ type: 'SET_TYPING_USERS', payload: users });
  }, []);
  
  const setCurrentRoom = useCallback((roomId: string) => {
    dispatch({ type: 'SET_CURRENT_ROOM', payload: roomId });
  }, []);
  
  const setAvailableRooms = useCallback((rooms: ChatRoom[]) => {
    dispatch({ type: 'SET_AVAILABLE_ROOMS', payload: rooms });
  }, []);
  
  const addNotification = useCallback((notification: Notification) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  }, []);
  
  const clearNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  }, []);
  
  const setShowKickCountdown = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_KICK_COUNTDOWN', payload: show });
  }, []);
  
  const setActiveView = useCallback((view: UIState['activeView']) => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
  }, []);
  
  const setCurrentUser = useCallback((user: ChatUser | null) => {
    dispatch({ type: 'SET_CURRENT_USER', payload: user });
  }, []);
  
  const setConnectionStatus = useCallback((connected: boolean) => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: connected });
  }, []);
  
  const setConnectionError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_CONNECTION_ERROR', payload: error });
  }, []);
  
  // القيم المحسوبة مع useMemo
  const filteredOnlineUsers = useMemo(() => {
    return state.users.online.filter(user => !state.users.ignored.has(user.id));
  }, [state.users.online, state.users.ignored]);
  
  const currentRoomMessages = useMemo(() => {
    return state.messages.byRoom[state.rooms.current] || [];
  }, [state.messages.byRoom, state.rooms.current]);
  
  const unreadNotificationsCount = useMemo(() => {
    return state.notifications.unreadCount;
  }, [state.notifications.unreadCount]);
  
  const contextValue: OptimizedChatContextType = {
    // State
    messages: state.messages,
    users: state.users,
    rooms: state.rooms,
    notifications: state.notifications,
    ui: state.ui,
    currentUser: state.currentUser,
    isConnected: state.isConnected,
    connectionError: state.connectionError,
    
    // Actions
    addMessage,
    setRoomMessages,
    addPrivateMessage,
    cleanupOldMessages,
    setOnlineUsers,
    addOnlineUser,
    removeOnlineUser,
    ignoreUser,
    unignoreUser,
    setTypingUsers,
    setCurrentRoom,
    setAvailableRooms,
    addNotification,
    clearNotifications,
    setShowKickCountdown,
    setActiveView,
    setCurrentUser,
    setConnectionStatus,
    setConnectionError,
    
    // Computed values
    filteredOnlineUsers,
    currentRoomMessages,
    unreadNotificationsCount
  };
  
  return (
    <OptimizedChatContext.Provider value={contextValue}>
      {children}
    </OptimizedChatContext.Provider>
  );
}

// Hook لاستخدام المحتوى المحسن
export function useOptimizedChat() {
  const context = useContext(OptimizedChatContext);
  
  if (context === undefined) {
    throw new Error('useOptimizedChat must be used within an OptimizedChatProvider');
  }
  
  return context;
}