import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatUser, ChatMessage, WebSocketMessage, PrivateConversation } from '@/types/chat';

export function useChat() {
  // Core state
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([]);
  const [publicMessages, setPublicMessages] = useState<ChatMessage[]>([]);
  const [privateConversations, setPrivateConversations] = useState<PrivateConversation>({});
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // WebSocket reference
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef<number>(0);
  const maxReconnectAttempts = 5;

  // Connect to WebSocket
  const connect = useCallback((user: ChatUser) => {
    try {
      setCurrentUser(user);
      setConnectionError(null);
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      // Close existing connection
      if (ws.current) {
        ws.current.close();
      }
      
      console.log('اتصال WebSocket:', wsUrl);
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
        console.log('WebSocket متصل');
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
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('خطأ في معالجة رسالة WebSocket:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket مقطوع');
        setIsConnected(false);
        
        // Attempt reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            if (currentUser) {
              connect(currentUser);
            }
          }, 2000 * reconnectAttempts.current);
        } else {
          setConnectionError('فقدان الاتصال. يرجى إعادة تحميل الصفحة.');
        }
      };

      ws.current.onerror = (error) => {
        console.error('خطأ WebSocket:', error);
        setConnectionError('خطأ في الاتصال');
      };

    } catch (error) {
      console.error('خطأ في الاتصال:', error);
      setConnectionError('فشل في الاتصال');
    }
  }, [currentUser]);

  // Handle WebSocket messages
  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'onlineUsers':
        if (message.users) {
          setOnlineUsers(message.users);
        }
        break;

      case 'newMessage':
        if (message.message) {
          setPublicMessages(prev => [...prev, message.message!]);
        }
        break;

      case 'privateMessage':
        if (message.message) {
          const msg = message.message;
          const otherUserId = msg.senderId === currentUser?.id ? msg.receiverId : msg.senderId;
          
          if (otherUserId) {
            setPrivateConversations(prev => ({
              ...prev,
              [otherUserId]: [...(prev[otherUserId] || []), msg]
            }));
          }
        }
        break;

      case 'userJoined':
        if (message.user) {
          setOnlineUsers(prev => {
            const exists = prev.find(u => u.id === message.user!.id);
            return exists ? prev : [...prev, message.user!];
          });
        }
        break;

      case 'userLeft':
        if (message.userId) {
          setOnlineUsers(prev => prev.filter(u => u.id !== message.userId));
        }
        break;

      case 'userTyping':
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
          
          // Clear typing after 3 seconds
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

      case 'error':
        console.error('خطأ من الخادم:', message.message);
        break;

      case 'userMuted':
      case 'userBanned':
      case 'userKicked':
      case 'userBlocked':
        // Handle moderation notifications
        console.log('إجراء إشراف:', message);
        break;

      default:
        console.log('رسالة غير معروفة:', message);
    }
  };

  // Send public message
  const sendMessage = useCallback((content: string, messageType: 'text' | 'image' = 'text') => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN || !content.trim()) {
      return;
    }

    ws.current.send(JSON.stringify({
      type: 'publicMessage',
      content: content.trim(),
      messageType
    }));
  }, []);

  // Send private message
  const sendPrivateMessage = useCallback((receiverId: number, content: string, messageType: 'text' | 'image' = 'text') => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN || !content.trim()) {
      return;
    }

    ws.current.send(JSON.stringify({
      type: 'privateMessage',
      receiverId,
      content: content.trim(),
      messageType
    }));
  }, []);

  // Send typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.current.send(JSON.stringify({
      type: 'typing',
      isTyping
    }));
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
    }
    
    // Clear timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Reset state
    setCurrentUser(null);
    setOnlineUsers([]);
    setPublicMessages([]);
    setPrivateConversations({});
    setIsConnected(false);
    setTypingUsers(new Set());
    setConnectionError(null);
    reconnectAttempts.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // State
    currentUser,
    onlineUsers,
    publicMessages,
    privateConversations,
    isConnected,
    typingUsers,
    connectionError,
    
    // Actions
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    sendTyping
  };
}