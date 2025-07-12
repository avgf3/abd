import { useState, useEffect, useRef } from 'react';
import type { ChatUser, ChatMessage } from '@/types/chat';

interface CleanChatHook {
  // State
  user: ChatUser | null;
  users: ChatUser[];
  messages: ChatMessage[];
  friends: ChatUser[];
  friendRequests: any[];
  notifications: any[];
  isConnected: boolean;
  
  // Actions
  connect: (user: ChatUser) => void;
  disconnect: () => void;
  sendMessage: (content: string, recipientId?: number) => void;
  sendFriendRequest: (targetUserId: number) => void;
  acceptFriendRequest: (senderId: number) => void;
  declineFriendRequest: (senderId: number) => void;
  removeFriend: (friendId: number) => void;
  
  // UI State
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;
}

export function useCleanChat(): CleanChatHook {
  const [user, setUser] = useState<ChatUser | null>(null);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [friends, setFriends] = useState<ChatUser[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection
  const connectWebSocket = (userData: ChatUser) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('🔗 WebSocket connected');
      setIsConnected(true);
      
      // Authenticate
      wsRef.current?.send(JSON.stringify({
        type: 'authenticate',
        userId: userData.id,
        username: userData.username
      }));
    };
    
    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };
    
    wsRef.current.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'newMessage':
        setMessages(prev => [...prev, data.message]);
        break;
        
      case 'userOnline':
        setUsers(prev => prev.map(u => 
          u.id === data.userId ? { ...u, isOnline: true } : u
        ));
        break;
        
      case 'userOffline':
        setUsers(prev => prev.map(u => 
          u.id === data.userId ? { ...u, isOnline: false } : u
        ));
        break;
        
      case 'friendRequest':
        loadFriendRequests();
        loadNotifications();
        break;
        
      case 'friendshipAccepted':
        loadFriends();
        break;
        
      case 'friendRemoved':
        loadFriends();
        break;
        
      case 'userUpdated':
        setUsers(prev => prev.map(u => 
          u.id === data.user.id ? data.user : u
        ));
        break;
    }
  };

  // API calls
  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'خطأ في الخادم' }));
      throw new Error(errorData.error || 'خطأ في الخادم');
    }
    
    return response.json();
  };

  const loadUsers = async () => {
    try {
      const data = await apiRequest('/api/users');
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const data = await apiRequest('/api/messages/public');
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadFriends = async () => {
    if (!user) return;
    try {
      const data = await apiRequest(`/api/friends/${user.id}`);
      setFriends(data.friends || []);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadFriendRequests = async () => {
    if (!user) return;
    try {
      const data = await apiRequest(`/api/friend-requests/${user.id}`);
      setFriendRequests(data.requests || []);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await apiRequest(`/api/notifications/${user.id}`);
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Chat actions
  const connect = (userData: ChatUser) => {
    setUser(userData);
    connectWebSocket(userData);
    loadUsers();
    loadMessages();
    loadFriends();
    loadFriendRequests();
    loadNotifications();
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setUser(null);
    setUsers([]);
    setMessages([]);
    setFriends([]);
    setFriendRequests([]);
    setNotifications([]);
    setIsConnected(false);
  };

  const sendMessage = (content: string, recipientId?: number) => {
    if (!user || !wsRef.current || !content.trim()) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'sendMessage',
      senderId: user.id,
      recipientId,
      content: content.trim(),
      isPublic: !recipientId
    }));
  };

  const sendFriendRequest = async (targetUserId: number) => {
    if (!user) return;
    try {
      await apiRequest('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({
          senderId: user.id,
          receiverId: targetUserId
        })
      });
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  };

  const acceptFriendRequest = async (senderId: number) => {
    if (!user) return;
    try {
      await apiRequest('/api/friends/accept', {
        method: 'POST',
        body: JSON.stringify({
          senderId,
          receiverId: user.id
        })
      });
      await loadFriends();
      await loadFriendRequests();
      await loadNotifications();
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const declineFriendRequest = async (senderId: number) => {
    if (!user) return;
    try {
      await apiRequest('/api/friends/decline', {
        method: 'POST',
        body: JSON.stringify({
          senderId,
          receiverId: user.id
        })
      });
      await loadFriendRequests();
      await loadNotifications();
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  };

  const removeFriend = async (friendId: number) => {
    if (!user) return;
    try {
      await apiRequest(`/api/friends/${user.id}/${friendId}`, {
        method: 'DELETE'
      });
      await loadFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  // Typing indicator
  const sendTyping = (typing: boolean) => {
    if (wsRef.current && user) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        userId: user.id,
        username: user.username,
        isTyping: typing
      }));
    }
  };

  const handleSetTyping = (typing: boolean) => {
    setIsTyping(typing);
    sendTyping(typing);
    
    if (typing) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        sendTyping(false);
      }, 2000);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    user,
    users,
    messages,
    friends,
    friendRequests,
    notifications,
    isConnected,
    connect,
    disconnect,
    sendMessage,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    isTyping,
    setIsTyping: handleSetTyping
  };
}