import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ChatUser, ChatMessage, ChatRoom } from '@/types/chat';
import { apiRequest } from '@/lib/queryClient';

// تشغيل صوت الإشعار
const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // تجاهل الأخطاء
    });
  } catch (error) {
    // تجاهل الأخطاء
  }
};

export const useChat = () => {
  // الحالات الأساسية
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string>('general');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const socketRef = useRef<Socket | null>(null);

  // الاتصال بـ Socket.IO
  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    const token = localStorage.getItem('authToken');
    if (!token) return;

    socketRef.current = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('✅ Socket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    socket.on('onlineUsers', (users: ChatUser[]) => {
      setOnlineUsers(users);
    });

    socket.on('publicMessage', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
      playNotificationSound();
    });

    socket.on('roomMessage', (data: { roomId: string; message: ChatMessage }) => {
      if (data.roomId === currentRoomId) {
        setMessages(prev => [...prev, data.message]);
        playNotificationSound();
      }
    });

    socket.on('userTyping', (data: { username: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (data.isTyping) {
          newSet.add(data.username);
        } else {
          newSet.delete(data.username);
        }
        return newSet;
      });
    });

    socket.on('userJoined', (user: ChatUser) => {
      setOnlineUsers(prev => {
        const exists = prev.some(u => u.id === user.id);
        return exists ? prev : [...prev, user];
      });
    });

    socket.on('userLeft', (userId: number) => {
      setOnlineUsers(prev => prev.filter(u => u.id !== userId));
    });

    return socket;
  }, [currentRoomId]);

  // قطع الاتصال
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // جلب الغرف
  const fetchRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('/api/rooms');
      if (response.success) {
        setRooms(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      // الغرف الافتراضية في حالة الخطأ
      setRooms([
        { id: 'general', name: 'الدردشة العامة', isBroadcast: false, userCount: 0 },
        { id: 'broadcast', name: 'غرفة البث المباشر', isBroadcast: true, userCount: 0 }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // انضمام لغرفة
  const joinRoom = useCallback(async (roomId: string) => {
    try {
      if (!roomId || roomId === currentRoomId) return;

      // ترك الغرفة الحالية
      if (socketRef.current && currentRoomId) {
        socketRef.current.emit('leaveRoom', { roomId: currentRoomId });
      }

      // انضمام للغرفة الجديدة
      if (socketRef.current) {
        socketRef.current.emit('joinRoom', { roomId });
      }

      // تحديث الحالة
      setCurrentRoomId(roomId);
      setMessages([]); // مسح الرسائل السابقة

      // جلب رسائل الغرفة الجديدة
      await fetchRoomMessages(roomId);

      console.log(`✅ Joined room: ${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
    }
  }, [currentRoomId]);

  // مغادرة غرفة
  const leaveRoom = useCallback((roomId: string) => {
    if (roomId === 'general') return; // لا يمكن ترك الغرفة العامة
    
    if (socketRef.current) {
      socketRef.current.emit('leaveRoom', { roomId });
    }
  }, []);

  // جلب رسائل الغرفة
  const fetchRoomMessages = useCallback(async (roomId: string) => {
    try {
      const response = await apiRequest(`/api/rooms/${roomId}/messages?limit=50`);
      if (response.success) {
        setMessages(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching room messages:', error);
      setMessages([]);
    }
  }, []);

  // إرسال رسالة عامة
  const sendPublicMessage = useCallback((content: string, messageType: string = 'text') => {
    if (!content.trim() || !socketRef.current || !currentUser) return;

    const messageData = {
      content: content.trim(),
      messageType,
      roomId: currentRoomId
    };

    socketRef.current.emit('publicMessage', messageData);
  }, [currentUser, currentRoomId]);

  // إرسال رسالة خاصة
  const sendPrivateMessage = useCallback((receiverId: number, content: string, messageType: string = 'text') => {
    if (!content.trim() || !socketRef.current || !currentUser) return;

    const messageData = {
      receiverId,
      content: content.trim(),
      messageType
    };

    socketRef.current.emit('privateMessage', messageData);
  }, [currentUser]);

  // إشعار الكتابة
  const handleTyping = useCallback(() => {
    if (socketRef.current && currentUser) {
      socketRef.current.emit('typing', { 
        roomId: currentRoomId,
        isTyping: true 
      });

      // إيقاف إشعار الكتابة بعد 3 ثوان
      setTimeout(() => {
        if (socketRef.current && currentUser) {
          socketRef.current.emit('typing', { 
            roomId: currentRoomId,
            isTyping: false 
          });
        }
      }, 3000);
    }
  }, [currentUser, currentRoomId]);

  // تسجيل الدخول
  const login = useCallback(async (username: string, password?: string) => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (response.success && response.user) {
        setCurrentUser(response.user);
        localStorage.setItem('authToken', response.user.id.toString());
        
        // الاتصال بـ Socket بعد تسجيل الدخول
        connectSocket();
        
        // جلب الغرف
        await fetchRooms();
        
        // انضمام للغرفة العامة
        await joinRoom('general');
        
        return { success: true, user: response.user };
      } else {
        return { success: false, error: response.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  }, [connectSocket, fetchRooms, joinRoom]);

  // تسجيل الخروج
  const logout = useCallback(() => {
    disconnectSocket();
    setCurrentUser(null);
    setMessages([]);
    setOnlineUsers([]);
    setRooms([]);
    setCurrentRoomId('general');
    localStorage.removeItem('authToken');
  }, [disconnectSocket]);

  // التحقق من تسجيل الدخول عند تحميل الصفحة
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token && !currentUser) {
      // محاولة استرداد بيانات المستخدم
      apiRequest('/api/auth/me')
        .then(response => {
          if (response.success && response.user) {
            setCurrentUser(response.user);
            connectSocket();
            fetchRooms();
            joinRoom('general');
          } else {
            localStorage.removeItem('authToken');
          }
        })
        .catch(() => {
          localStorage.removeItem('authToken');
        });
    }
  }, [connectSocket, fetchRooms, joinRoom, currentUser]);

  // تنظيف الاتصال عند إلغاء تحميل المكون
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, [disconnectSocket]);

  // إرجاع الواجهة المبسطة
  return {
    // البيانات
    currentUser,
    onlineUsers,
    messages,
    rooms,
    currentRoomId,
    isConnected,
    isLoading,
    typingUsers: Array.from(typingUsers),

    // الوظائف
    login,
    logout,
    sendPublicMessage,
    sendPrivateMessage,
    handleTyping,
    joinRoom,
    leaveRoom,
    fetchRooms,
    
    // وظائف مساعدة
    getCurrentRoomMessages: () => messages,
    getOnlineUsersCount: () => onlineUsers.length,
    isUserOnline: (userId: number) => onlineUsers.some(u => u.id === userId),
  };
};