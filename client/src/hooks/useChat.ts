import { useState, useEffect, useRef, useCallback } from 'react';
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
        console.log('تعذر تشغيل صوت الإشعار');
      }
    });
  } catch (error) {
    console.log('تعذر تشغيل صوت الإشعار');
  }
};

export function useChat() {
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([]);
  const [publicMessages, setPublicMessages] = useState<ChatMessage[]>([]);
  const [privateConversations, setPrivateConversations] = useState<PrivateConversation>({});
  const [ignoredUsers, setIgnoredUsers] = useState<Set<number>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [newMessageSender, setNewMessageSender] = useState<ChatUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [kickNotification, setKickNotification] = useState<{show: boolean, duration: number}>({show: false, duration: 0});
  const [blockNotification, setBlockNotification] = useState<{show: boolean, reason: string}>({show: false, reason: ''});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showKickCountdown, setShowKickCountdown] = useState(false);
  
  // تحسين الأداء: مدراء التحسين
  const messageCache = useRef(new MessageCacheManager());
  const networkOptimizer = useRef(new NetworkOptimizer());
  const lastMessageTime = useRef<number>(0);
  
  const ws = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef<number>(0);
  const maxReconnectAttempts = 5;

  // تم تعطيل جميع أكواد الاتصال - لا يوجد أي اتصال بالسيرفر
  const connect = useCallback((user: ChatUser) => {
    setCurrentUser(user);
    setConnectionError('تم تعطيل الاتصال بالسيرفر.');
    setIsConnected(false);
  }, []);

  const disconnect = useCallback(() => {
    // Clear reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectAttempts.current = maxReconnectAttempts; // Prevent auto-reconnect
    
    if (ws.current) {
      ws.current.close(1000, 'User disconnect');
    }
    
    setCurrentUser(null);
    setIsConnected(false);
    setOnlineUsers([]);
    setPublicMessages([]);
    setPrivateConversations({});
    setTypingUsers(new Set());
    setConnectionError(null);
  }, []);

  // إرسال رسالة عامة محسن
  const sendMessage = useCallback(async (content: string, messageType: string = 'text') => {
    setConnectionError('تم تعطيل إرسال الرسائل.');
  }, []);

  // إرسال رسالة خاصة محسن
  const sendPrivateMessage = useCallback(async (receiverId: number, content: string, messageType: string = 'text') => {
    setConnectionError('تم تعطيل إرسال الرسائل.');
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    // تم تعطيل جميع أكواد الاتصال - لا يوجد أي اتصال بالسيرفر
  }, []);

  const handleTyping = useCallback(() => {
    sendTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 1000);
  }, [sendTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disconnect();
    };
  }, [disconnect]);

  // دالة تجاهل مستخدم
  const ignoreUser = useCallback((userId: number) => {
    setIgnoredUsers(prev => new Set([...prev, userId]));
    // إزالة رسائل المستخدم المُتجاهل من الرسائل الحالية
    setPublicMessages(prev => prev.filter(msg => msg.senderId !== userId));
  }, []);

  // دالة إلغاء تجاهل مستخدم  
  const unignoreUser = useCallback((userId: number) => {
    setIgnoredUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  }, []);

  // دالة تبديل وضع الإخفاء (للإدمن والمالك فقط)
  const toggleStealthMode = useCallback(async (isHidden: boolean) => {
    setConnectionError('تم تعطيل إرسال الرسائل.');
  }, []);

  return {
    currentUser,
    onlineUsers,
    publicMessages,
    privateConversations,
    isConnected,
    typingUsers,
    connectionError,
    newMessageSender,
    ignoredUsers,
    kickNotification,
    blockNotification,
    setNewMessageSender,
    connect,
    disconnect,
    ignoreUser,
    unignoreUser,
    toggleStealthMode,
    sendPublicMessage: useCallback((content: string, messageType: string = 'text') => {
      setConnectionError('تم تعطيل إرسال الرسائل.');
      return false;
    }, []),
    sendPrivateMessage,
    handleTyping,
    notifications,
    setNotifications,
    showKickCountdown,
    setShowKickCountdown,
  };
}