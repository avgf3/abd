import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatUser, ChatMessage, WebSocketMessage, PrivateConversation } from '@/types/chat';

export function useSimpleChat() {
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([]);
  const [publicMessages, setPublicMessages] = useState<ChatMessage[]>([]);
  const [privateConversations, setPrivateConversations] = useState<PrivateConversation>({});
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const lastMessageTime = useRef<number>(0);

  const connect = useCallback((user: ChatUser) => {
    try {
      setCurrentUser(user);
      setConnectionError(null);
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      if (ws.current) {
        ws.current.close();
      }
      
      console.log('محاولة الاتصال بـ WebSocket:', wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket متصل بنجاح');
        setIsConnected(true);
        setConnectionError(null);
        
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
            case 'onlineUsers':
              if (message.users) {
                setOnlineUsers(message.users);
              }
              break;
              
            case 'newMessage':
              if (message.message && !message.message.isPrivate) {
                setPublicMessages(prev => [...prev, message.message!]);
              }
              break;
              
            case 'privateMessage':
              if (message.message) {
                const msg = message.message;
                setPrivateConversations(prev => ({
                  ...prev,
                  [msg.senderId === currentUser?.id ? msg.receiverId! : msg.senderId]: [
                    ...(prev[msg.senderId === currentUser?.id ? msg.receiverId! : msg.senderId] || []),
                    msg
                  ]
                }));
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
              }
              break;
          }
        } catch (error) {
          console.error('خطأ في معالجة رسالة WebSocket:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('خطأ في WebSocket:', error);
        setConnectionError('فشل في الاتصال بالخادم');
        setIsConnected(false);
      };

      ws.current.onclose = () => {
        console.log('تم قطع الاتصال مع WebSocket');
        setIsConnected(false);
        setOnlineUsers([]);
        setTypingUsers(new Set());
      };

    } catch (error) {
      console.error('خطأ في إنشاء اتصال WebSocket:', error);
      setConnectionError('فشل في الاتصال');
    }
  }, []);

  const disconnect = useCallback(() => {
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

  const sendPublicMessage = useCallback((content: string, messageType: string = 'text') => {
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
  }, [currentUser]);

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
    
    setTimeout(() => {
      sendTyping(false);
    }, 1000);
  }, [sendTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
    connect,
    disconnect,
    sendPublicMessage,
    sendPrivateMessage,
    sendTyping: handleTyping,
  };
}