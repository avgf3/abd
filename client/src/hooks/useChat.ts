import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatUser, ChatMessage, WebSocketMessage, PrivateConversation } from '@/types/chat';

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
                setPublicMessages(prev => [...prev, message.message!]);
                // Play notification sound for new public messages from others
                if (message.message.senderId !== user.id) {
                  playNotificationSound();
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
        
        // إعادة الاتصال التلقائي إذا لم يكن الإغلاق متعمدًا
        if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Exponential backoff
          
          console.log(`محاولة إعادة الاتصال ${reconnectAttempts.current}/${maxReconnectAttempts} خلال ${delay}ms`);
          setConnectionError(`محاولة إعادة الاتصال... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (user && (!ws.current || ws.current.readyState === WebSocket.CLOSED)) {
              connect(user);
            }
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setConnectionError('فشل في الاتصال. يرجى إعادة تحميل الصفحة.');
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

  return {
    currentUser,
    onlineUsers,
    publicMessages,
    privateConversations,
    isConnected,
    typingUsers,
    connectionError,
    newMessageSender,
    setNewMessageSender,
    connect,
    disconnect,
    sendPublicMessage: sendMessage,
    sendPrivateMessage,
    handleTyping,
  };
}