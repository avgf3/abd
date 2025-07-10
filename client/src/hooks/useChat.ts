import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatUser, ChatMessage, WebSocketMessage, PrivateConversation } from '@/types/chat';

// Audio notification function
const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Fallback: create a simple beep using Web Audio API
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
  
  const ws = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback((user: ChatUser) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);
    
    ws.current.onopen = () => {
      setIsConnected(true);
      ws.current?.send(JSON.stringify({
        type: 'auth',
        userId: user.id,
        username: user.username,
      }));
    };

    ws.current.onmessage = (event) => {
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
    };

    ws.current.onclose = () => {
      setIsConnected(false);
    };

    setCurrentUser(user);
  }, []);

  const disconnect = useCallback(() => {
    ws.current?.close();
    setCurrentUser(null);
    setIsConnected(false);
    setOnlineUsers([]);
    setPublicMessages([]);
    setPrivateConversations({});
  }, []);

  const sendPublicMessage = useCallback((content: string, messageType: string = 'text') => {
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify({
        type: 'publicMessage',
        content,
        messageType,
      }));
    }
  }, [isConnected]);

  const sendPrivateMessage = useCallback((receiverId: number, content: string, messageType: string = 'text') => {
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify({
        type: 'privateMessage',
        receiverId,
        content,
        messageType,
      }));
    }
  }, [isConnected]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (ws.current && isConnected && currentUser) {
      ws.current.send(JSON.stringify({
        type: 'typing',
        isTyping,
      }));
    }
  }, [isConnected, currentUser]);

  const handleTyping = useCallback(() => {
    sendTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 1000);
  }, [sendTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
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
    connect,
    disconnect,
    sendPublicMessage,
    sendPrivateMessage,
    handleTyping,
  };
}
