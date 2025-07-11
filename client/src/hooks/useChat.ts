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
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [newMessageSender, setNewMessageSender] = useState<ChatUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ignoredUsers, setIgnoredUsers] = useState<Set<number>>(new Set());
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
                setOnlineUsers(message.users);
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
              
            case 'moderationAction':
              // إضافة رسالة النظام للدردشة العامة
              const systemMessage = {
                id: Date.now(),
                content: message.message,
                timestamp: new Date().toISOString(),
                user: {
                  id: 0,
                  username: 'النظام',
                  userType: 'system' as const,
                  profileImage: null,
                  isOnline: true,
                  status: 'online' as const
                },
                isSystem: true
              };
              
              setPublicMessages(prev => [...prev, systemMessage]);
              
              // إذا تم تطبيق إجراء إداري على المستخدم الحالي
              if (message.targetUserId === user.id) {
                if (message.action === 'muted') {
                  console.log('🔇 تم كتمك من الدردشة العامة');
                  
                  // إضافة إشعار إلى تبويب الإشعارات
                  setNotifications(prev => [...prev, {
                    id: Date.now(),
                    type: 'system',
                    username: 'النظام',
                    message: 'تم كتمك من الدردشة العامة',
                    timestamp: new Date()
                  }]);
                  
                  // إظهار إشعار الكتم
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('تم كتمك 🔇', {
                      body: 'لا يمكنك إرسال رسائل في الدردشة العامة',
                      icon: '/favicon.ico'
                    });
                  }
                } else if (message.action === 'unmuted') {
                  console.log('🔊 تم إلغاء كتمك من الدردشة');
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('تم إلغاء الكتم 🔊', {
                      body: 'يمكنك الآن إرسال رسائل في الدردشة العامة',
                      icon: '/favicon.ico'
                    });
                  }
                } else if (message.action === 'banned') {
                  console.log('⏰ تم طردك من الدردشة لمدة 15 دقيقة');
                  setKickNotification({ show: true, duration: message.duration || 15 });
                } else if (message.action === 'blocked') {
                  console.log('🚫 تم حجبك نهائياً من الموقع');
                  setBlockNotification({ show: true, reason: message.reason || 'مخالفة قوانين الدردشة' });
                  setTimeout(() => {
                    window.location.reload();
                  }, 1000);
                }
              }
              break;

            case 'kicked':
              if (message.targetUserId === user.id) {
                setKickNotification({ 
                  show: true, 
                  duration: message.duration || 15 
                });
              }
              break;

            case 'blocked':
              if (message.targetUserId === user.id) {
                setBlockNotification({ 
                  show: true, 
                  reason: message.reason || 'مخالفة قوانين الموقع' 
                });
              }
              break;
              
            case 'friendRequest':
              // تنبيه طلب صداقة جديد
              if (message.targetUserId === user.id) {
                console.log('📨 طلب صداقة جديد من:', message.senderUsername);
                
                // إشعار مرئي في المتصفح
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('طلب صداقة جديد 👥', {
                    body: `${message.senderUsername} يريد إضافتك كصديق`,
                    icon: '/favicon.ico'
                  });
                }
                
                // صوت تنبيه
                playNotificationSound();
                
                // إضافة إشعار حقيقي للواجهة
                setNotifications(prev => [...prev, {
                  id: Date.now(),
                  type: 'friendRequest',
                  username: message.senderUsername,
                  message: `${message.senderUsername} يريد إضافتك كصديق`,
                  timestamp: new Date()
                }]);
              }
              break;

            case 'promotion':
              if (message.newRole && user.id) {
                console.log('🎉 تمت ترقيتك:', message.message);
                
                // إشعار مرئي
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('ترقية جديدة! 🎉', {
                    body: message.message,
                    icon: '/favicon.ico'
                  });
                }
                
                // صوت تنبيه
                playNotificationSound();
                
                // إضافة إشعار للواجهة
                setNotifications(prev => [...prev, {
                  id: Date.now(),
                  type: 'promotion',
                  username: 'النظام',
                  message: message.message,
                  timestamp: new Date()
                }]);
              }
              break;
              
            case 'userUpdated':
              if (message.user) {
                setOnlineUsers(prev => 
                  prev.map(u => u.id === message.user!.id ? message.user! : u)
                );
                if (message.user.id === user.id) {
                  setCurrentUser(message.user);
                }
              }
              break;
          }
        } catch (error) {
          console.error('خطأ في معالجة رسالة WebSocket:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket مقطوع - الكود:', event.code, 'السبب:', event.reason);
        setIsConnected(false);
        
        // إعادة الاتصال الذكي مع تحسين الاستقرار
        if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          // تأخير تدريجي مع حد أقصى 10 ثوان
          const delay = Math.min(2000 * reconnectAttempts.current, 10000);
          
          console.log(`محاولة إعادة الاتصال ${reconnectAttempts.current}/${maxReconnectAttempts} خلال ${delay}ms`);
          setConnectionError(`إعادة الاتصال... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            // فحص حالة الشبكة قبل إعادة المحاولة
            if (navigator.onLine && user && (!ws.current || ws.current.readyState === WebSocket.CLOSED)) {
              connect(user);
            } else if (!navigator.onLine) {
              setConnectionError('لا يوجد اتصال بالإنترنت');
            }
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setConnectionError('فشل في الاتصال بالخادم. تحقق من الإنترنت وأعد المحاولة.');
        }
      };

      ws.current.onerror = (error) => {
        console.error('خطأ WebSocket:', error);
        setIsConnected(false);
        setConnectionError('خطأ في الاتصال مع الخادم');
      };
      
    } catch (error) {
      console.error('خطأ في الاتصال:', error);
      setIsConnected(false);
      setConnectionError('خطأ في إنشاء الاتصال');
    }
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

  const sendMessage = useCallback((content: string, messageType: string = 'text') => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'publicMessage',
        content,
        messageType,
      }));
      return true;
    }
    return false;
  }, []);

  const sendPrivateMessage = useCallback((receiverId: number, content: string, messageType: string = 'text') => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'privateMessage',
        receiverId,
        content,
        messageType,
      }));
      return true;
    }
    return false;
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && currentUser) {
      ws.current.send(JSON.stringify({
        type: 'typing',
        isTyping,
      }));
    }
  }, [currentUser]);

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
    sendPublicMessage: useCallback((content: string, messageType: string = 'text') => {
      if (!content.trim() || !currentUser) return false;
      
      const now = Date.now();
      if (now - lastMessageTime.current < 500) return false;
      lastMessageTime.current = now;
      
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'publicMessage',
          content: content.trim(),
          messageType,
          userId: currentUser.id,
          username: currentUser.username
        }));
        return true;
      }
      return false;
    }, [currentUser]),
    sendPrivateMessage,
    handleTyping,
  };
}