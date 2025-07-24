import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
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
  
  // حالة الغرف
  const [currentRoomId, setCurrentRoomId] = useState<string>('general');
  const [roomMessages, setRoomMessages] = useState<Record<string, ChatMessage[]>>({});
  
  // تحديث الرسائل العامة عند تغيير الغرفة
  useEffect(() => {
    const currentMessages = roomMessages[currentRoomId] || [];
    setPublicMessages(currentMessages);
  }, [currentRoomId, roomMessages]);
  
  // إشعارات النقاط والمستويات
  const [levelUpNotification, setLevelUpNotification] = useState<{
    show: boolean;
    oldLevel: number;
    newLevel: number;
    levelInfo?: any;
  }>({ show: false, oldLevel: 1, newLevel: 1 });
  
  const [achievementNotification, setAchievementNotification] = useState<{
    show: boolean;
    message: string;
  }>({ show: false, message: '' });
  
  const [dailyBonusNotification, setDailyBonusNotification] = useState<{
    show: boolean;
    points: number;
  }>({ show: false, points: 0 });
  
  // تحسين الأداء: مدراء التحسين
  const messageCache = useRef(new MessageCacheManager());

  // فلترة الرسائل غير الصالحة
  const isValidMessage = (message: ChatMessage): boolean => {
    // التأكد من وجود بيانات المرسل
    if (!message.sender || !message.sender.username || message.sender.username === 'مستخدم') {
      console.warn('رسالة مرفوضة - بيانات مرسل غير صالحة:', message);
      return false;
    }
    
    // التأكد من وجود محتوى الرسالة
    if (!message.content || message.content.trim() === '') {
      console.warn('رسالة مرفوضة - محتوى فارغ:', message);
      return false;
    }
    
    // التأكد من وجود معرف المرسل
    if (!message.senderId || message.senderId <= 0) {
      console.warn('رسالة مرفوضة - معرف مرسل غير صالح:', message);
      return false;
    }
    
    return true;
  };
  const networkOptimizer = useRef(new NetworkOptimizer());
  const lastMessageTime = useRef<number>(0);
  
  const socket = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef<number>(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback((user: ChatUser) => {
    try {
      console.log('🚀 بدء اتصال المستخدم:', user.username);
      setCurrentUser(user);
      setConnectionError(null);
      setIsLoading(true);
      
      // تنظيف الاتصال السابق
      if (socket.current) {
        console.log('🔄 إغلاق الاتصال السابق');
        socket.current.removeAllListeners();
        socket.current.disconnect();
        socket.current = null;
      }
      
      // إعادة تعيين المتغيرات
      reconnectAttempts.current = 0;
      
      // إنشاء اتصال Socket.IO - إعدادات محسنة ومبسطة
      const getSocketUrl = () => {
        // في الإنتاج، استخدم نفس الخادم
        if (process.env.NODE_ENV === 'production') {
          return window.location.origin;
        }
        
        // للتطوير المحلي - استخدم localhost مباشرة
        const port = window.location.port || '5000';
        return `http://localhost:${port}`;
      };

      const socketUrl = getSocketUrl();
      console.log('🔗 محاولة الاتصال بـ Socket.IO:', socketUrl);
      
      socket.current = io(socketUrl, {
        // إعدادات الاتصال الأساسية
        autoConnect: true,
        forceNew: true,
        
        // إعدادات إعادة الاتصال المحسنة
        reconnection: true,
        reconnectionAttempts: 5,     // عدد أقل من المحاولات
        reconnectionDelay: 2000,     // تأخير أطول قليلاً
        reconnectionDelayMax: 10000, // حد أقصى أطول
        timeout: 15000,              // timeout أقصر
        
        // إعدادات النقل المبسطة
        transports: ['websocket', 'polling'],
        upgrade: true,
        
        // إعدادات الأمان
        secure: window.location.protocol === 'https:',
        withCredentials: false, // تبسيط الأمان
        
        // إعدادات ping/pong
        pingTimeout: 30000,
        pingInterval: 20000,
      });
      
      // معالج الاتصال المحسن
      socket.current.on('connect', () => {
        console.log('🎉 نجح الاتصال بـ Socket.IO');
        console.log(`🚀 نوع النقل: ${socket.current?.io.engine.transport.name}`);
        console.log(`🆔 معرف الاتصال: ${socket.current?.id}`);
        
        setIsConnected(true);
        setConnectionError(null);
        setIsLoading(false);
        reconnectAttempts.current = 0;
        
        // إرسال authentication مع معلومات إضافية
        console.log('🔐 إرسال بيانات المصادقة...');
        socket.current?.emit('auth', {
          userId: user.id,
          username: user.username,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
      });

      // معالج أخطاء الاتصال
      socket.current.on('connect_error', (error) => {
        console.error('❌ خطأ في الاتصال:', error.message);
        setConnectionError(`فشل الاتصال: ${error.message}`);
        setIsConnected(false);
        setIsLoading(false);
        
        reconnectAttempts.current++;
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('🚫 تم الوصول للحد الأقصى من محاولات إعادة الاتصال');
          setConnectionError('فشل الاتصال نهائياً - يرجى إعادة تحديث الصفحة');
        }
      });

      // معالج قطع الاتصال
      socket.current.on('disconnect', (reason) => {
        console.warn('🔌 تم قطع الاتصال:', reason);
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          // الخادم قطع الاتصال، حاول الاتصال مرة أخرى
          console.log('🔄 الخادم قطع الاتصال، محاولة إعادة الاتصال...');
          socket.current?.connect();
        }
      });

      // مراقبة تغيير transport
      socket.current.io.engine.on('upgrade', () => {
        console.log(`⬆️ تم الترقية إلى: ${socket.current?.io.engine.transport.name}`);
      });

      socket.current.io.engine.on('upgradeError', (error) => {
        console.warn('⚠️ فشل ترقية WebSocket، الاستمرار مع polling:', error.message);
      });

      // استقبال رسالة الترحيب من الخادم
      socket.current.on('connected', (data) => {
        console.log('✅ تأكيد الاتصال من الخادم:', data);
        setIsLoading(false);
      });

      // معالجة ping/pong محسنة للحفاظ على الاتصال
      socket.current.on('ping', (data) => {
        const pongData = { 
          timestamp: Date.now(), 
          userId: user.id,
          received: data?.timestamp 
        };
        socket.current?.emit('pong', pongData);
      });

      socket.current.on('message', (message: WebSocketMessage) => {
        try {
          console.log('🔔 رسالة واردة:', message.type);
          
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
                console.log('📥 استلام قائمة المستخدمين:', message.users.length, message.users.map(u => u.username));
                // فلترة المستخدمين المتجاهلين فقط (إظهار المخفيين للإدمن والمالك)
                const filteredUsers = message.users.filter((chatUser: ChatUser) => {
                  // إظهار جميع المستخدمين للإدمن والمالك
                  if (user.userType === 'admin' || user.userType === 'owner') {
                    return !ignoredUsers.has(chatUser.id);
                  }
                  // للمستخدمين العاديين، إخفاء المستخدمين المخفيين والمتجاهلين
                  return !ignoredUsers.has(chatUser.id) && !chatUser.isHidden;
                });
                console.log('👥 المستخدمين بعد الفلترة:', filteredUsers.length, filteredUsers.map(u => u.username));
                setOnlineUsers(filteredUsers);
              }
              break;
              
            case 'userVisibilityChanged':
              // تحديث قائمة المتصلين عند تغيير حالة الإخفاء
              if (message.userId && message.isHidden !== undefined) {
                setOnlineUsers(prev => {
                  if (message.isHidden) {
                    // إزالة المستخدم من القائمة إذا أصبح مخفي
                    return prev.filter(user => user.id !== message.userId);
                  } else {
                    // إضافة المستخدم للقائمة إذا أصبح ظاهر (إذا لم يكن موجود بالفعل)
                    const exists = prev.some(user => user.id === message.userId);
                    if (!exists) {
                      // طلب تحديث قائمة المستخدمين من الخادم
                      socket.current?.emit('requestOnlineUsers');
                    }
                    return prev;
                  }
                });
              }
              break;
              
            case 'newMessage':
              if (message.message && typeof message.message === 'object' && !message.message.isPrivate) {
                // فحص صحة الرسالة أولاً
                if (!isValidMessage(message.message as ChatMessage)) {
                  console.warn('رسالة مرفوضة من الخادم:', message.message);
                  break;
                }
                
                // فحص إذا كان المرسل مُتجاهل
                if (!ignoredUsers.has(message.message.senderId)) {
                  const chatMessage = message.message as ChatMessage;
                  const messageRoomId = (chatMessage as any).roomId || 'general';
                  
                  // إضافة الرسالة للغرفة المناسبة
                  setRoomMessages(prev => ({
                    ...prev,
                    [messageRoomId]: [...(prev[messageRoomId] || []), chatMessage]
                  }));
                  
                  // إضافة للرسائل العامة إذا كانت من الغرفة الحالية
                  if (messageRoomId === currentRoomId) {
                    setPublicMessages(prev => [...prev, chatMessage]);
                    // تشغيل صوت الإشعار للرسائل من الآخرين
                    if (chatMessage.senderId !== user.id) {
                      playNotificationSound();
                    }
                  }
                }
              }
              break;
              
            case 'privateMessage':
              if (message.message && typeof message.message === 'object' && message.message.isPrivate) {
                // فحص صحة الرسالة أولاً
                if (!isValidMessage(message.message as ChatMessage)) {
                  console.warn('رسالة خاصة مرفوضة من الخادم:', message.message);
                  break;
                }
                
                const otherUserId = message.message.senderId === user.id 
                  ? message.message.receiverId! 
                  : message.message.senderId;
                
                // فحص إذا كان المرسل مُتجاهل - لا تظهر رسائله الخاصة
                if (!ignoredUsers.has(message.message.senderId)) {
                  setPrivateConversations(prev => ({
                    ...prev,
                    [otherUserId]: [...(prev[otherUserId] || []), message.message as ChatMessage]
                  }));
                  
                  // Play notification sound for new private messages from others
                  if (message.message.senderId !== user.id) {
                    playNotificationSound();
                    
                    // تعيين المرسل لإظهار التنبيه
                    if ((message.message as ChatMessage).sender) {
                      setNewMessageSender((message.message as ChatMessage).sender!);
                    }
                    
                    // إشعار مرئي في المتصفح
                    if ('Notification' in window && Notification.permission === 'granted') {
                      new Notification('رسالة خاصة جديدة 📱', {
                        body: `${(message.message as ChatMessage).sender?.username}: ${(message.message as ChatMessage).content.slice(0, 50)}...`,
                        icon: '/favicon.ico'
                      });
                    }
                  }
                }
              }
              break;
              
            case 'userJoined':
              if (message.user) {
                console.log('👤 مستخدم جديد انضم:', message.user.username, 'Type:', message.user.userType, 'Hidden:', message.user.isHidden);
                setOnlineUsers(prev => {
                  const exists = prev.find(u => u.id === message.user!.id);
                  if (exists) {
                    console.log('المستخدم موجود بالفعل في القائمة');
                    return prev;
                  }
                  
                  // فحص ما إذا كان المستخدم يجب إظهاره
                  // للإدمن والمالك: إظهار جميع المستخدمين إلا المتجاهلين
                  // للمستخدمين العاديين: إظهار المستخدمين غير المخفيين وغير المتجاهلين
                  const shouldShow = (user.userType === 'admin' || user.userType === 'owner') || 
                                   (!message.user!.isHidden);
                  const isIgnored = ignoredUsers.has(message.user!.id);
                  
                  console.log(`فحص إظهار المستخدم ${message.user!.username}:`, {
                    shouldShow,
                    isIgnored,
                    userType: message.user!.userType,
                    isHidden: message.user!.isHidden,
                    currentUserType: user.userType
                  });
                  
                  if (shouldShow && !isIgnored) {
                    console.log('✅ إضافة المستخدم للقائمة:', message.user!.username);
                    return [...prev, message.user!];
                  }
                  
                  console.log('❌ المستخدم مخفي أو متجاهل');
                  return prev;
                });
              }
              break;
              
            case 'userLeft':
              if (message.userId) {
                setOnlineUsers(prev => prev.filter(u => u.id !== message.userId));
              }
              break;
              
            case 'usernameColorChanged':
              // تحديث لون اسم المستخدم في الوقت الفعلي
              if (message.userId && message.color) {
                setOnlineUsers(prev => 
                  prev.map(user => 
                    user.id === message.userId 
                      ? { ...user, usernameColor: message.color }
                      : user
                  )
                );
                
                // تحديث لون المستخدم الحالي إذا كان هو من غير اللون
                if (currentUser && currentUser.id === message.userId) {
                  setCurrentUser(prev => prev ? { ...prev, usernameColor: message.color } : prev);
                }
              }
              break;
              
            case 'profileEffectChanged':
              // تحديث تأثير البروفايل ولون الاسم معاً
              if (message.userId) {
                setOnlineUsers(prev => 
                  prev.map(user => 
                    user.id === message.userId 
                      ? { 
                          ...user, 
                          profileEffect: message.profileEffect, 
                          usernameColor: message.usernameColor 
                        }
                      : user
                  )
                );
                
                // تحديث المستخدم الحالي
                if (currentUser && currentUser.id === message.userId) {
                  setCurrentUser(prev => prev ? { 
                    ...prev, 
                    profileEffect: message.profileEffect, 
                    usernameColor: message.usernameColor 
                  } : prev);
                }
                
                // تحديث الرسائل بلون الاسم الجديد
                setPublicMessages(prev => prev.map(msg => 
                  msg.sender && msg.sender.id === message.userId
                    ? { 
                        ...msg, 
                        sender: { 
                          ...msg.sender, 
                          profileEffect: message.profileEffect, 
                          usernameColor: message.usernameColor 
                        } 
                      }
                    : msg
                ));
              }
              break;

            case 'theme_update':
              // تحديث ثيم المستخدم في الوقت الفعلي
              if (message.userId && message.userTheme) {
                setOnlineUsers(prev => 
                  prev.map(user => 
                    user.id === message.userId 
                      ? { ...user, userTheme: message.userTheme }
                      : user
                  )
                );
                
                // تحديث ثيم المستخدم الحالي إذا كان هو من غير الثيم
                if (currentUser && currentUser.id === message.userId) {
                  setCurrentUser(prev => prev ? { ...prev, userTheme: message.userTheme } : prev);
                }
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
                  type: (message.notificationType === 'system' || message.notificationType === 'friend' || 
                        message.notificationType === 'moderation' || message.notificationType === 'message') 
                        ? message.notificationType : 'system',
                  username: message.moderatorName || 'النظام',
                  content: typeof message.message === 'string' ? message.message : 'إشعار نظام',
                  timestamp: new Date()
                }]);
              }
              break;

            case 'systemMessage':
              // إضافة رسالة النظام للدردشة العامة
              const systemMessage: ChatMessage = {
                id: Date.now(),
                senderId: 0,
                content: typeof message.message === 'string' ? message.message : 'رسالة نظام',
                messageType: 'text',
                isPrivate: false,
                timestamp: new Date(),
                sender: {
                  id: 0,
                  username: 'النظام',
                  userType: 'admin',
                  profileImage: null,
                  isOnline: true
                }
              };
              
              setPublicMessages(prev => [...prev, systemMessage]);
              
              // إذا تم تطبيق إجراء إداري على المستخدم الحالي
              if (message.targetUserId === user.id) {
                if (message.action === 'muted') {
                  console.log('🔇 تم كتمك من الدردشة العامة');
                  
                  // إضافة إشعار إلى تبويب الإشعارات فقط
                  setNotifications(prev => [...prev, {
                    id: Date.now(),
                    type: 'system',
                    username: 'النظام',
                    content: 'تم كتمك من الدردشة العامة',
                    timestamp: new Date()
                  }]);
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
                
                // تحديث فوري للإشعارات والأصدقاء
                // هذا سيؤدي لإعادة جلب البيانات من الخادم فوراً
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('friendRequestReceived', {
                    detail: { senderId: message.senderId, senderName: message.senderUsername }
                  }));
                }, 100);
              }
              break;
              
            case 'friendRequestAccepted':
              // إشعار قبول طلب الصداقة
              if (message.targetUserId === user.id) {
                console.log('✅ تم قبول طلب صداقتك من:', message.acceptedBy);
                
                // إشعار مرئي
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('تم قبول طلب الصداقة ✅', {
                    body: `${message.acceptedBy} قبل طلب صداقتك`,
                    icon: '/favicon.ico'
                  });
                }
                
                // صوت تنبيه
                playNotificationSound();
                
                // تحديث فوري لقائمة الأصدقاء
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('friendRequestAccepted', {
                    detail: { friendId: message.friendId, friendName: message.acceptedBy }
                  }));
                }, 100);
              }
              break;

            case 'promotion':
              if (message.newRole && user.id) {
                console.log('🎉 تمت ترقيتك:', message.message);
                
                // إشعار مرئي
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('ترقية جديدة! 🎉', {
                    body: typeof message.message === 'string' ? message.message : message.message?.content || 'ترقية جديدة',
                    icon: '/favicon.ico'
                  });
                }
                
                // صوت تنبيه
                playNotificationSound();
                
                // إضافة إشعار للواجهة
                setNotifications(prev => [...prev, {
                  id: Date.now(),
                  type: 'system',
                  username: 'النظام',
                  content: typeof message.message === 'string' ? message.message : 'تم ترقيتك',
                  timestamp: new Date()
                }]);
              }
              break;
              
            case 'levelUp':
              // إشعار ترقية المستوى
              if (message.oldLevel && message.newLevel && message.levelInfo) {
                console.log('🎉 ترقية مستوى!', message);
                
                setLevelUpNotification({
                  show: true,
                  oldLevel: message.oldLevel,
                  newLevel: message.newLevel,
                  levelInfo: message.levelInfo
                });
                
                // إشعار مرئي في المتصفح
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('ترقية مستوى! 🎉', {
                    body: `وصلت للمستوى ${message.newLevel}: ${message.levelInfo?.title}`,
                    icon: '/favicon.ico'
                  });
                }
                
                playNotificationSound();
              }
              break;
              
            case 'achievement':
              // إشعار إنجاز جديد
              if (message.message) {
                console.log('🏆 إنجاز جديد!', message.message);
                
                setAchievementNotification({
                  show: true,
                  message: typeof message.message === 'string' ? message.message : 'إنجاز جديد!'
                });
                
                // إشعار مرئي في المتصفح
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('إنجاز جديد! 🏆', {
                    body: typeof message.message === 'string' ? message.message : 'إنجاز جديد!',
                    icon: '/favicon.ico'
                  });
                }
                
                playNotificationSound();
              }
              break;
              
            case 'dailyBonus':
              // إشعار المكافأة اليومية
              if (message.points) {
                console.log('🎁 مكافأة يومية!', message.points);
                
                setDailyBonusNotification({
                  show: true,
                  points: message.points
                });
                
                // إشعار مرئي في المتصفح
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('مكافأة يومية! 🎁', {
                    body: `حصلت على ${message.points} نقطة!`,
                    icon: '/favicon.ico'
                  });
                }
                
                playNotificationSound();
              }
              break;
              
            case 'pointsAdded':
              // إشعار إضافة نقاط من الإدارة
              if (message.points && message.message) {
                console.log('💎 نقاط من الإدارة!', message);
                
                // إضافة إشعار للواجهة
                setNotifications(prev => [...prev, {
                  id: Date.now(),
                  type: 'system',
                  username: 'الإدارة',
                  content: typeof message.message === 'string' ? message.message : 'حصلت على نقاط من الإدارة',
                  timestamp: new Date()
                }]);
                
                // إشعار مرئي في المتصفح
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('نقاط من الإدارة! 💎', {
                    body: typeof message.message === 'string' ? message.message : 'حصلت على نقاط',
                    icon: '/favicon.ico'
                  });
                }
                
                playNotificationSound();
              }
              break;
              
            case 'pointsReceived':
              // إشعار استلام نقاط من مستخدم آخر
              if (message.points && message.senderName) {
                console.log('🎁 استلام نقاط!', message);
                
                // إضافة إشعار للواجهة
                setNotifications(prev => [...prev, {
                  id: Date.now(),
                  type: 'system',
                  username: message.senderName || 'مستخدم',
                  content: `🎁 تم استلام ${message.points} نقطة من ${message.senderName}`,
                  timestamp: new Date()
                }]);
                
                // إشعار مرئي في المتصفح
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('نقاط جديدة! 🎁', {
                    body: `تم استلام ${message.points} نقطة من ${message.senderName}`,
                    icon: '/favicon.ico'
                  });
                }
                
                playNotificationSound();
              }
              break;
              
            case 'pointsTransfer':
              // إشعار في المحادثة العامة لإرسال النقاط
              if (message.points && message.senderName && message.receiverName) {
                // إضافة رسالة نظام في المحادثة العامة
                const systemMessage: ChatMessage = {
                  id: Date.now(),
                  senderId: 0,
                  content: `💰 تم إرسال ${message.points} نقطة من ${message.senderName} إلى ${message.receiverName}`,
                  messageType: 'text',
                  isPrivate: false,
                  timestamp: new Date(),
                  sender: {
                    id: 0,
                    username: 'النظام',
                    userType: 'admin',
                    role: 'admin',
                    profileBackgroundColor: '#3c0d0d',
                    isOnline: true,
                    isHidden: false,
                    lastSeen: null,
                    joinDate: new Date(),
                    createdAt: new Date(),
                    isMuted: false,
                    muteExpiry: null,
                    isBanned: false,
                    banExpiry: null,
                    isBlocked: false,
                    ignoredUsers: [],
                    usernameColor: '#dc2626',
                    userTheme: 'default',
                    points: 0,
                    level: 1,
                    totalPoints: 0,
                    levelProgress: 0
                  }
                };
                
                setPublicMessages(prev => {
                  const filtered = prev.filter(isValidMessage);
                  const newMessages = [...filtered, systemMessage];
                  return newMessages.slice(-200); // الاحتفاظ بآخر 200 رسالة
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
        } catch (error) {
          console.error('خطأ في معالجة رسالة Socket.IO:', error);
        }
      });

      socket.current.on('disconnect', (reason) => {
        console.log('Socket.IO مقطوع - السبب:', reason);
        setIsConnected(false);
        
        // تنظيف الحالة المحلية فوراً
        setCurrentUser(null);
        setOnlineUsers([]);
        setTypingUsers(new Set());
        
        // معالجة أسباب مختلفة لقطع الاتصال
        if (reason === 'io server disconnect') {
          // الخادم قطع الاتصال عمداً (مثل حظر المستخدم)
          setConnectionError('تم قطع الاتصال من الخادم');
          // لا نعيد الاتصال تلقائياً
          return;
        }
        
        if (reason === 'transport close' || reason === 'ping timeout') {
          // قطع اتصال غير متوقع - نحاول إعادة الاتصال
          setConnectionError('انقطع الاتصال - محاولة إعادة الاتصال...');
          
          // إعادة الاتصال بعد تأخير قصير
          setTimeout(() => {
            if (socket.current && !socket.current.connected) {
              socket.current.connect();
            }
          }, 2000);
        }
      });

      socket.current.on('connect_error', (error) => {
        console.error('خطأ اتصال Socket.IO:', error);
        setIsConnected(false);
        setConnectionError('خطأ في الاتصال مع الخادم');
      });
      
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
    
    if (socket.current) {
      socket.current.disconnect();
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
    if (!currentUser || !socket.current || !socket.current.connected) {
      throw new Error('غير متصل بالخادم');
    }

    // فحص التأخير الزمني
    const now = Date.now();
    if (now - lastMessageTime.current < 500) {
      throw new Error('الرجاء الانتظار قبل إرسال رسالة أخرى');
    }
    lastMessageTime.current = now;

    try {
      const messageData = {
        senderId: currentUser.id,
        content: content.trim(),
        messageType,
        isPrivate: false
      };

      // إرسال إلى الخادم عبر API أولاً
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في إرسال الرسالة');
      }

      const result = await response.json();
      
      // إضافة الرسالة مباشرة للواجهة للحصول على رد فعل فوري
      const newMessage: ChatMessage = {
        id: result.data.id || Date.now(),
        senderId: currentUser.id,
        content: content.trim(),
        messageType: messageType as 'text' | 'image',
        isPrivate: false,
        timestamp: new Date(),
        sender: currentUser
      };
      
      setPublicMessages(prev => [...prev, newMessage]);
      
      console.log('✅ تم إرسال الرسالة بنجاح');
      return result.data;
    } catch (error: any) {
      console.error('❌ خطأ في إرسال الرسالة:', error);
      throw error;
    }
  }, [currentUser]);

  // إرسال رسالة خاصة محسن
  const sendPrivateMessage = useCallback(async (receiverId: number, content: string, messageType: string = 'text') => {
    if (!currentUser || !socket.current || !socket.current.connected) {
      throw new Error('غير متصل بالخادم');
    }

    try {
      const messageData = {
        senderId: currentUser.id,
        receiverId,
        content: content.trim(),
        messageType,
        isPrivate: true
      };

      // إرسال إلى الخادم عبر API
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في إرسال الرسالة');
      }

      const result = await response.json();
      
      // إضافة الرسالة مباشرة للمحادثة الخاصة
      const newMessage: ChatMessage = {
        id: result.data.id || Date.now(),
        senderId: currentUser.id,
        receiverId,
        content: content.trim(),
        messageType: messageType as 'text' | 'image',
        isPrivate: true,
        timestamp: new Date(),
        sender: currentUser
      };
      
      setPrivateConversations(prev => ({
        ...prev,
        [receiverId]: [...(prev[receiverId] || []), newMessage]
      }));
      
      console.log('✅ تم إرسال الرسالة الخاصة بنجاح');
      return result.data;
    } catch (error: any) {
      console.error('❌ خطأ في إرسال الرسالة الخاصة:', error);
      throw error;
    }
  }, [currentUser]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (socket.current && socket.current.connected && currentUser) {
      socket.current.emit('typing', {
        isTyping,
      });
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

  // دالة تحديث نقاط المستخدم (للاستخدام العام)
  const updateUserPoints = useCallback((newPoints: number) => {
    if (currentUser) {
      setCurrentUser(prev => prev ? { ...prev, points: newPoints } : null);
    }
  }, [currentUser]);

  // إضافة الدالة للنطاق العام
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).updateUserPoints = updateUserPoints;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).updateUserPoints;
      }
    };
  }, [updateUserPoints]);

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
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) return;
    
    try {
      await apiRequest(`/api/users/${currentUser.id}/stealth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHidden })
      });
      
      // تحديث حالة المستخدم محلياً
      setCurrentUser(prev => prev ? { ...prev, isHidden } : null);
      
      // إرسال التحديث للخادم عبر Socket.IO
      if (socket.current && socket.current.connected) {
        socket.current.emit('toggleStealth', {
          userId: currentUser.id,
          isHidden
        });
      }
    } catch (error) {
      console.error('فشل في تغيير وضع الإخفاء:', error);
    }
  }, [currentUser]);

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
      if (!content.trim() || !currentUser) return false;
      
      const now = Date.now();
      if (now - lastMessageTime.current < 500) return false;
      lastMessageTime.current = now;
      
      if (socket.current && socket.current.connected) {
        socket.current.emit('publicMessage', {
          content: content.trim(),
          messageType,
          userId: currentUser.id,
          username: currentUser.username,
          roomId: currentRoomId
        });
        return true;
      }
      return false;
    }, [currentUser, currentRoomId]),
    sendPrivateMessage,
    handleTyping,
    notifications,
    setNotifications,
    showKickCountdown,
    setShowKickCountdown,
    
    // إشعارات النقاط والمستويات
    levelUpNotification,
    setLevelUpNotification,
    achievementNotification,
    setAchievementNotification,
    dailyBonusNotification,
    setDailyBonusNotification,
    
    // وظائف الغرف
    currentRoomId,
    setCurrentRoomId,
    roomMessages,
    getCurrentRoomMessages: useCallback(() => {
      return roomMessages[currentRoomId] || [];
    }, [roomMessages, currentRoomId]),
    joinRoom: useCallback((roomId: string) => {
      if (socket.current && socket.current.connected && currentUser) {
        socket.current.emit('joinRoom', { userId: currentUser.id, roomId });
        setCurrentRoomId(roomId);
      }
    }, [currentUser]),
    leaveRoom: useCallback((roomId: string) => {
      if (socket.current && socket.current.connected && currentUser) {
        socket.current.emit('leaveRoom', { userId: currentUser.id, roomId });
      }
    }, [currentUser])
  };
}