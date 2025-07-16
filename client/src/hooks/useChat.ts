import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatUser, ChatMessage, WebSocketMessage, PrivateConversation } from '@/types/chat';
import { globalNotificationManager, MessageCacheManager, NetworkOptimizer } from '@/lib/chatOptimization';
import { chatAnalytics } from '@/lib/chatAnalytics';

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
  
  // تحسين الأداء: مدراء التحسين
  const messageCache = useRef(new MessageCacheManager());
  const networkOptimizer = useRef(new NetworkOptimizer());
  const lastMessageTime = useRef<number>(0);
  
  const ws = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef<number>(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback((user: ChatUser) => {
    try {
      setCurrentUser(user);
      setConnectionError(null);
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      // Close existing connection if any
      if (ws.current) {
        ws.current.close();
      }
      
      console.log('محاولة الاتصال بـ WebSocket:', wsUrl);
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
        console.log('WebSocket متصل بنجاح');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        
        // Send authentication
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            type: 'auth',
            userId: user.id,
            username: user.username,
          }));
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'error':
              // عرض رسالة خطأ من نظام مكافحة السبام
              console.error('خطأ من الخادم:', message.message);
              break;
              
            case 'warning':
              // عرض تحذير من نظام مكافحة السبام
              console.warn('تحذير:', message.message);
              break;
              
            case 'onlineUsers':
              if (message.users) {
                // فلترة المستخدمين المتجاهلين والمخفيين من القائمة  
                const filteredUsers = message.users.filter((chatUser: ChatUser) => 
                  !ignoredUsers.has(chatUser.id) && !chatUser.isHidden
                );
                setOnlineUsers(filteredUsers);
              }
              break;
              
            case 'newMessage':
              if (message.message && !message.message.isPrivate) {
                // فحص إذا كان المرسل مُتجاهل
                if (!ignoredUsers.has(message.message.senderId)) {
                  setPublicMessages(prev => [...prev, message.message!]);
                  // Play notification sound for new public messages from others
                  if (message.message.senderId !== user.id) {
                    playNotificationSound();
                  }
                }
              }
              break;
              
            case 'privateMessage':
              if (message.message && message.message.isPrivate) {
                const otherUserId = message.message.senderId === user.id 
                  ? message.message.receiverId! 
                  : message.message.senderId;
                
                // فحص إذا كان المرسل مُتجاهل - لا تظهر رسائله الخاصة
                if (!ignoredUsers.has(message.message.senderId)) {
                  setPrivateConversations(prev => ({
                    ...prev,
                    [otherUserId]: [...(prev[otherUserId] || []), message.message!]
                  }));
                  
                  // Play notification sound for new private messages from others
                  if (message.message.senderId !== user.id) {
                  playNotificationSound();
                  
                  // تعيين المرسل لإظهار التنبيه
                  if (message.message.sender) {
                    setNewMessageSender(message.message.sender);
                  }
                  
                  // إشعار مرئي في المتصفح
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('رسالة خاصة جديدة 📱', {
                      body: `${message.message.sender?.username}: ${message.message.content.slice(0, 50)}...`,
                      icon: '/favicon.ico'
                    });
                  }
                }
              }
              break;
              
            case 'userJoined':
              if (message.user) {
                setOnlineUsers(prev => {
                  const exists = prev.find(u => u.id === message.user!.id);
                  if (exists) return prev;
                  return [...prev, message.user!];
                });
              }
              break;
              
            case 'userLeft':
              if (message.userId) {
                setOnlineUsers(prev => prev.filter(u => u.id !== message.userId));
              }
              break;
              
            case 'moderationAction':
              // التعامل مع إجراءات الإدارة
              if (message.targetUserId === user.id) {
                // المستخدم الحالي تم التأثير عليه
                switch (message.action) {
                  case 'muted':
                    console.warn('⚠️ تم كتمك من الدردشة العامة');
                    break;
                  case 'banned':
                    console.warn('⛔ تم طردك من الدردشة لمدة 15 دقيقة');
                    break;
                  case 'blocked':
                    console.warn('🚫 تم حجبك من الدردشة نهائياً');
                    break;
                }
              }
              
              // تحديث قائمة المستخدمين المتصلين لعكس التغييرات
              setOnlineUsers(prev => 
                prev.map(u => 
                  u.id === message.targetUserId 
                    ? { 
                        ...u, 
                        isMuted: message.action === 'muted' ? true : u.isMuted,
                        isBanned: message.action === 'banned' ? true : u.isBanned,
                        isBlocked: message.action === 'blocked' ? true : u.isBlocked
                      }
                    : u
                )
              );
              break;
              
            case 'typing':
              if (message.username && message.isTyping !== undefined) {
                setTypingUsers(prev => {
                  const newSet = new Set(prev);
                  if (message.isTyping) {
                    newSet.add(message.username!);
                  } else {
                    newSet.delete(message.username!);
                  }
                  return newSet;
                });
                
                // Clear typing indicator after 3 seconds
                if (message.isTyping) {
                  setTimeout(() => {
                    setTypingUsers(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(message.username!);
                      return newSet;
                    });
                  }, 3000);
                }
              }
              break;
              
            case 'notification':
              // إضافة إشعار للمستخدم فقط
              if (message.targetUserId === user.id) {
                setNotifications(prev => [...prev, {
                  id: Date.now(),
                  type: message.notificationType || 'system',
                  username: message.moderatorName || 'النظام',
                  message: message.message,
                  timestamp: new Date()
                }]);
              }
              break;

          }
        } catch (error) {
          console.error('خطأ في معالجة رسالة WebSocket:', error);
        }
      };

      ws.current.onerror = (event) => {
        console.error('WebSocket خطأ:', event);
        setConnectionError('حدث خطأ في الاتصال بالسيرفر.');
        setIsConnected(false);
        
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`محاولة الاتصال المتتالية (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
          reconnectTimeoutRef.current = setTimeout(connect, 5000); // Retry every 5 seconds
        } else {
          console.warn('تجاوزت عدد المحاولات المتتالية للاتصال. إعادة المحاولة بعد 10 ثواني.');
          setTimeout(connect, 10000); // Wait 10 seconds before retrying
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket مغلق:', event.code, event.reason);
        setIsConnected(false);
        setConnectionError('تم فصل الاتصال بالسيرفر.');
        
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`محاولة الاتصال المتتالية (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
          reconnectTimeoutRef.current = setTimeout(connect, 5000); // Retry every 5 seconds
        } else {
          console.warn('تجاوزت عدد المحاولات المتتالية للاتصال. إعادة المحاولة بعد 10 ثواني.');
          setTimeout(connect, 10000); // Wait 10 seconds before retrying
        }
      };

    } catch (error) {
      console.error('خطأ في إعداد الاتصال WebSocket:', error);
      setConnectionError('تعذر تشغيل الاتصال.');
      setIsConnected(false);
    }
  }, [ignoredUsers, user.id]);

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