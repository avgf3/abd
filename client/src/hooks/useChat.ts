import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import type { Socket } from 'socket.io-client';

import type { PrivateConversation } from '../../../shared/types';

import { apiRequest, queryClient } from '@/lib/queryClient';
import { connectSocket, saveSession, clearSession, getSession } from '@/lib/socket';
import type { ChatUser, ChatMessage } from '@/types/chat';
import type { Notification } from '@/types/chat';
import { mapDbMessagesToChatMessages } from '@/utils/messageUtils';
import { userCache, setCachedUser } from '@/utils/userCacheManager';
import { enqueueOfflineMessage, flushOfflineQueue } from '@/lib/offlineQueue';

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

// State interface
interface ChatState {
  currentUser: ChatUser | null;
  onlineUsers: ChatUser[];
  currentRoomId: string;
  roomMessages: Record<string, ChatMessage[]>;
  privateConversations: PrivateConversation;
  ignoredUsers: Set<number>;
  isConnected: boolean;
  typingUsers: Set<string>;
  connectionError: string | null;
  newMessageSender: ChatUser | null;
  isLoading: boolean;
  notifications: Notification[];
  showKickCountdown: boolean;
  globalSoundEnabled: boolean;
  showSystemMessages: boolean;
}

// Action types
type ChatAction =
  | { type: 'SET_CURRENT_USER'; payload: ChatUser | null }
  | { type: 'SET_ONLINE_USERS'; payload: ChatUser[] }
  | { type: 'SET_ROOM_MESSAGES'; payload: { roomId: string; messages: ChatMessage[] } }
  | { type: 'ADD_ROOM_MESSAGE'; payload: { roomId: string; message: ChatMessage } }
  | { type: 'SET_PRIVATE_MESSAGE'; payload: { userId: number; message: ChatMessage } }
  | { type: 'SET_PRIVATE_CONVERSATION'; payload: { userId: number; messages: ChatMessage[] } }
  | { type: 'PREPEND_PRIVATE_MESSAGES'; payload: { userId: number; messages: ChatMessage[] } }
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
  | { type: 'CLEAR_ALL'; payload: void }
  | { type: 'UPSERT_ONLINE_USER'; payload: ChatUser }
  | { type: 'REMOVE_ONLINE_USER'; payload: number };

// Initial state
const initialState: ChatState = {
  currentUser: null,
  onlineUsers: [],
  currentRoomId: '',
  roomMessages: {},
  privateConversations: {},
  ignoredUsers: new Set(),
  isConnected: false,
  typingUsers: new Set(),
  connectionError: null,
  newMessageSender: null,
  isLoading: false,
  notifications: [],
  showKickCountdown: false,
  globalSoundEnabled: true,
  showSystemMessages: true,
};

// Reducer function
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CURRENT_USER':
      return {
        ...state,
        currentUser: action.payload,
        globalSoundEnabled:
          typeof (action.payload as any)?.globalSoundEnabled === 'boolean'
            ? (action.payload as any).globalSoundEnabled
            : state.globalSoundEnabled,
        showSystemMessages:
          typeof (action.payload as any)?.showSystemMessages === 'boolean'
            ? (action.payload as any).showSystemMessages
            : state.showSystemMessages,
      };

    case 'SET_ONLINE_USERS': {
      action.payload.forEach(user => {
        if (user && user.id && user.username) {
          setCachedUser(user);
        }
      });
      userCache.updateOnlineStatus(action.payload.map(u => u.id));
      return { ...state, onlineUsers: action.payload };
    }

    case 'SET_ROOM_MESSAGES': {
      const { roomId, messages } = action.payload;
      return {
        ...state,
        roomMessages: { ...state.roomMessages, [roomId]: messages },
      };
    }

    case 'ADD_ROOM_MESSAGE': {
      const { roomId, message } = action.payload;
      const existingMessages = state.roomMessages[roomId] || [];

      const isDuplicate = existingMessages.some(
        (msg) =>
          msg.id === message.id ||
          (msg.timestamp === message.timestamp &&
            msg.senderId === message.senderId &&
            msg.content === message.content)
      );

      if (isDuplicate) {
        return state;
      }

      if (message.messageType === 'system' && state.showSystemMessages === false) {
        return state;
      }

      return {
        ...state,
        roomMessages: {
          ...state.roomMessages,
          [roomId]: [...existingMessages, message],
        },
      };
    }

    case 'SET_PRIVATE_MESSAGE': {
      const { userId, message } = action.payload;
      const existingMessages = state.privateConversations[userId] || [];

      const isDuplicate = existingMessages.some(
        (msg) =>
          (message.id && msg.id === message.id) ||
          (msg.content === message.content &&
            msg.senderId === message.senderId &&
            Math.abs(new Date(msg.timestamp).getTime() - new Date(message.timestamp).getTime()) <
              1000)
      );

      if (isDuplicate) {
        return state;
      }

      return {
        ...state,
        privateConversations: {
          ...state.privateConversations,
          [userId]: [...existingMessages, message],
        },
      };
    }

    case 'SET_PRIVATE_CONVERSATION': {
      const { userId, messages } = action.payload;
      const uniqueMessages = messages.reduce((acc: ChatMessage[], msg) => {
        const exists = acc.some(
          (m) =>
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
          [userId]: uniqueMessages,
        },
      };
    }

    case 'PREPEND_PRIVATE_MESSAGES': {
      const { userId, messages } = action.payload;
      const existing = state.privateConversations[userId] || [];
      const existingIds = new Set(existing.map((m) => m.id));
      const toPrepend = messages.filter((m) => !existingIds.has(m.id));
      return {
        ...state,
        privateConversations: {
          ...state.privateConversations,
          [userId]: [...toPrepend, ...existing],
        },
      };
    }

    case 'UPSERT_ONLINE_USER': {
      const incoming = action.payload;
      if (!incoming || !incoming.id) {
        return state;
      }
      
      if (incoming.username) {
        setCachedUser(incoming);
      }
      const existingIndex = state.onlineUsers.findIndex((u) => u.id === incoming.id);
      if (existingIndex === -1) {
        const hasMinimum = !!(incoming.username && incoming.userType);
        if (!hasMinimum) {
          return state;
        }
        return { ...state, onlineUsers: [...state.onlineUsers, incoming] };
      }
      const merged = { ...state.onlineUsers[existingIndex], ...incoming } as ChatUser;
      const next = state.onlineUsers.slice();
      next[existingIndex] = merged;
      return { ...state, onlineUsers: next };
    }

    case 'REMOVE_ONLINE_USER': {
      const userId = action.payload;
      return { ...state, onlineUsers: state.onlineUsers.filter((u) => u.id !== userId) };
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
        notifications: [...state.notifications, action.payload],
      };

    case 'SET_CURRENT_ROOM':
      return { ...state, currentRoomId: action.payload };

    case 'SET_SHOW_KICK_COUNTDOWN':
      return { ...state, showKickCountdown: action.payload };

    case 'IGNORE_USER':
      return {
        ...state,
        ignoredUsers: new Set([...state.ignoredUsers, action.payload]),
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
  const loadingRooms = useRef<Set<string>>(new Set());
  const broadcastHandlers = useRef<Set<(data: any) => void>>(new Set());
  const webrtcOfferHandlers = useRef<Set<(data: any) => void>>(new Set());
  const webrtcAnswerHandlers = useRef<Set<(data: any) => void>>(new Set());
  const webrtcIceHandlers = useRef<Set<(data: any) => void>>(new Set());

  // Notification states
  const [levelUpNotification, setLevelUpNotification] = useState<any>(null);
  const [achievementNotification, setAchievementNotification] = useState<any>(null);
  const [dailyBonusNotification, setDailyBonusNotification] = useState<any>(null);

  // Refs to avoid stale closures
  const currentUserRef = useRef<ChatUser | null>(null);
  const currentRoomIdRef = useRef<string>(initialState.currentRoomId);
  const ignoredUsersRef = useRef<Set<number>>(new Set());
  const roomMessagesRef = useRef<Record<string, ChatMessage[]>>({});
  const typingTimersRef = useRef<Map<number, number>>(new Map());
  const isFlushingOutboxRef = useRef<boolean>(false);
  const lastJoinEmitTsRef = useRef<number>(0);
  const kickHandledRef = useRef<boolean>(false);
  const pendingJoinRoomRef = useRef<string | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    currentUserRef.current = state.currentUser;
  }, [state.currentUser]);
  useEffect(() => {
    currentRoomIdRef.current = state.currentRoomId;
  }, [state.currentRoomId]);
  useEffect(() => {
    ignoredUsersRef.current = state.ignoredUsers;
  }, [state.ignoredUsers]);
  useEffect(() => {
    roomMessagesRef.current = state.roomMessages;
  }, [state.roomMessages]);

  // Memoized current room messages
  const currentRoomMessages = useMemo(() => {
    return state.roomMessages[state.currentRoomId] || [];
  }, [state.roomMessages, state.currentRoomId]);

  // Memoized online users
  const memoizedOnlineUsers = useMemo(() => {
    const filtered = state.onlineUsers.filter(
      (user) =>
        user && user.id && user.username && user.userType && !state.ignoredUsers.has(user.id)
    );
    const dedup = new Map<number, ChatUser>();
    for (const u of filtered) {
      if (!dedup.has(u.id)) dedup.set(u.id, u);
    }
    return Array.from(dedup.values());
  }, [state.onlineUsers, state.ignoredUsers]);

  // Simple message loading
  const loadRoomMessages = useCallback(
    async (roomId: string, forceReload: boolean = false) => {
      if (!forceReload && state.roomMessages[roomId]?.length > 0) {
        return;
      }

      if (loadingRooms.current.has(roomId)) {
        return;
      }

      loadingRooms.current.add(roomId);

      try {
        const data = await apiRequest(`/api/messages/room/${roomId}/latest?limit=12`);

        if (data?.messages && Array.isArray(data.messages)) {
          const formattedMessages = mapDbMessagesToChatMessages(data.messages, roomId);
          dispatch({
            type: 'SET_ROOM_MESSAGES',
            payload: { roomId, messages: formattedMessages },
          });
        }
      } catch (error) {
        console.error(`❌ خطأ في تحميل رسائل الغرفة ${roomId}:`, error);
      } finally {
        loadingRooms.current.delete(roomId);
      }
    },
    [state.roomMessages]
  );

  // Simplified socket event handling
  const setupSocketListeners = useCallback((socketInstance: Socket) => {
    socketInstance.on('connect', () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
      flushOfflineQueue();
      
      // Simple ping every 20 seconds
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      pingIntervalRef.current = window.setInterval(() => {
        if (socketInstance.connected) {
          socketInstance.emit('client_ping');
        }
      }, 20000);
    });

    socketInstance.on('disconnect', () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('❌ خطأ اتصال Socket.IO:', error);
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'خطأ في الاتصال' });
    });

    // Handle messages
    socketInstance.on('message', (data: any) => {
      try {
        if (!data || !data.type) return;

        switch (data.type) {
          case 'onlineUsers':
            if (Array.isArray(data.users)) {
              dispatch({ type: 'SET_ONLINE_USERS', payload: data.users });
            }
            break;

          case 'newMessage':
            if (data.message && data.message.roomId) {
              const message = data.message;
              const formattedMessage = {
                id: message.id,
                content: message.content,
                senderId: message.senderId,
                senderUsername: message.sender?.username || 'مجهول',
                timestamp: message.createdAt || new Date().toISOString(),
                messageType: message.messageType || 'text',
                roomId: message.roomId,
                reactions: message.reactions || { like: 0, dislike: 0, heart: 0 },
                myReaction: message.myReaction || null,
                sender: message.sender,
                textColor: message.textColor,
                bold: message.bold,
              } as ChatMessage;

              dispatch({
                type: 'ADD_ROOM_MESSAGE',
                payload: { roomId: message.roomId, message: formattedMessage },
              });

              // Play notification sound
              if (
                state.globalSoundEnabled &&
                message.senderId !== currentUserRef.current?.id &&
                message.messageType !== 'system'
              ) {
                playNotificationSound();
              }
            }
            break;

          case 'roomJoined':
            if (data.roomId) {
              dispatch({ type: 'SET_CURRENT_ROOM', payload: data.roomId });
              if (Array.isArray(data.users)) {
                dispatch({ type: 'SET_ONLINE_USERS', payload: data.users });
              }
            }
            break;

          case 'userUpdated':
            if (data.user && data.user.id) {
              dispatch({ type: 'UPSERT_ONLINE_USER', payload: data.user });
            }
            break;

          case 'levelUp':
            setLevelUpNotification(data);
            break;

          case 'error':
            dispatch({ type: 'SET_CONNECTION_ERROR', payload: data.message || 'خطأ غير معروف' });
            break;
        }
      } catch (error) {
        console.error('❌ خطأ في معالجة رسالة Socket:', error);
      }
    });

    // Handle private messages
    socketInstance.on('privateMessage', (data: any) => {
      try {
        if (data && data.message) {
          const message = data.message;
          const formattedMessage = {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            senderUsername: message.sender?.username || 'مجهول',
            timestamp: message.createdAt || new Date().toISOString(),
            messageType: 'text',
            roomId: 'private',
            reactions: { like: 0, dislike: 0, heart: 0 },
            myReaction: null,
            sender: message.sender,
          } as ChatMessage;

          const otherUserId = message.senderId === currentUserRef.current?.id
            ? message.receiverId
            : message.senderId;

          dispatch({
            type: 'SET_PRIVATE_MESSAGE',
            payload: { userId: otherUserId, message: formattedMessage },
          });

          if (
            state.globalSoundEnabled &&
            message.senderId !== currentUserRef.current?.id
          ) {
            playNotificationSound();
          }
        }
      } catch (error) {
        console.error('❌ خطأ في معالجة الرسالة الخاصة:', error);
      }
    });

    // Handle WebRTC events
    socketInstance.on('webrtc-offer', (data: any) => {
      broadcastHandlers.current.forEach((handler) => {
        try {
          handler({ type: 'webrtc-offer', data });
        } catch {}
      });
      webrtcOfferHandlers.current.forEach((handler) => {
        try {
          handler(data);
        } catch {}
      });
    });

    socketInstance.on('webrtc-answer', (data: any) => {
      broadcastHandlers.current.forEach((handler) => {
        try {
          handler({ type: 'webrtc-answer', data });
        } catch {}
      });
      webrtcAnswerHandlers.current.forEach((handler) => {
        try {
          handler(data);
        } catch {}
      });
    });

    socketInstance.on('webrtc-ice-candidate', (data: any) => {
      broadcastHandlers.current.forEach((handler) => {
        try {
          handler({ type: 'webrtc-ice-candidate', data });
        } catch {}
      });
      webrtcIceHandlers.current.forEach((handler) => {
        try {
          handler(data);
        } catch {}
      });
    });
  }, [state.globalSoundEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      typingTimersRef.current.forEach((id) => {
        try {
          clearTimeout(id);
        } catch {}
      });
      typingTimersRef.current.clear();
    };
  }, []);

  // Connect function
  const connect = useCallback(async (user: ChatUser) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_CURRENT_USER', payload: user });

      saveSession({
        userId: user.id,
        username: user.username,
        userType: user.userType,
        token: (user as any).token,
      });

      const socketInstance = connectSocket();
      socket.current = socketInstance;

      setupSocketListeners(socketInstance);

      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error('خطأ في الاتصال:', error);
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'خطأ في الاتصال بالخادم' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [setupSocketListeners]);

  // Disconnect function
  const disconnect = useCallback(() => {
    clearSession();
    if (socket.current) {
      socket.current.removeAllListeners();
      socket.current.disconnect();
      socket.current = null;
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    }
    dispatch({ type: 'CLEAR_ALL', payload: undefined });
  }, []);

  // Join room function
  const joinRoom = useCallback(
    async (roomId: string) => {
      if (!socket.current || !socket.current.connected) {
        pendingJoinRoomRef.current = roomId;
        return;
      }

      const now = Date.now();
      if (now - lastJoinEmitTsRef.current < 1000) {
        return;
      }
      lastJoinEmitTsRef.current = now;

      try {
        socket.current.emit('joinRoom', { roomId });
        dispatch({ type: 'SET_CURRENT_ROOM', payload: roomId });
        saveSession({ roomId });
        await loadRoomMessages(roomId);
      } catch (error) {
        console.error('خطأ في الانضمام للغرفة:', error);
      }
    },
    [loadRoomMessages]
  );

  // Send message function
  const sendMessage = useCallback(
    async (content: string, messageType: string = 'text', options: any = {}) => {
      if (!socket.current || !socket.current.connected || !state.currentRoomId) {
        enqueueOfflineMessage({
          content,
          messageType,
          roomId: state.currentRoomId,
          timestamp: new Date().toISOString(),
          ...options,
        });
        return;
      }

      try {
        socket.current.emit('publicMessage', {
          content,
          messageType,
          roomId: state.currentRoomId,
          ...options,
        });
      } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
      }
    },
    [state.currentRoomId]
  );

  // Other utility functions
  const ignoreUser = useCallback(async (userId: number) => {
    try {
      if (!state.currentUser?.id) return;
      await apiRequest(`/api/users/${userId}/ignore`, { method: 'POST' });
      dispatch({ type: 'IGNORE_USER', payload: userId });
    } catch (error) {
      console.error('خطأ في تجاهل المستخدم:', error);
    }
  }, [state.currentUser?.id]);

  const unignoreUser = useCallback(async (userId: number) => {
    try {
      if (!state.currentUser?.id) return;
      await apiRequest(`/api/users/${userId}/ignore`, { method: 'DELETE' });
      dispatch({ type: 'UNIGNORE_USER', payload: userId });
    } catch (error) {
      console.error('خطأ في إلغاء تجاهل المستخدم:', error);
    }
  }, [state.currentUser?.id]);

  return {
    // State
    currentUser: state.currentUser,
    onlineUsers: memoizedOnlineUsers,
    currentRoomId: state.currentRoomId,
    currentRoomMessages,
    privateConversations: state.privateConversations,
    isConnected: state.isConnected,
    connectionError: state.connectionError,
    isLoading: state.isLoading,
    notifications: state.notifications,
    showKickCountdown: state.showKickCountdown,
    typingUsers: state.typingUsers,
    globalSoundEnabled: state.globalSoundEnabled,
    showSystemMessages: state.showSystemMessages,

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
    joinRoom,
    sendMessage,
    ignoreUser,
    unignoreUser,
    loadRoomMessages,

    // Handler registries
    broadcastHandlers: broadcastHandlers.current,
    webrtcOfferHandlers: webrtcOfferHandlers.current,
    webrtcAnswerHandlers: webrtcAnswerHandlers.current,
    webrtcIceHandlers: webrtcIceHandlers.current,
  };
};