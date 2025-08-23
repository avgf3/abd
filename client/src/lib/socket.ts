import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

// Simple session storage helpers
const STORAGE_KEY = 'chat_session';

type StoredSession = {
  userId?: number;
  username?: string;
  userType?: string;
  token?: string;
  roomId?: string;
  wallTab?: string;
};

export function saveSession(partial: Partial<StoredSession>) {
  try {
    const existing = getSession();
    const merged: StoredSession = { ...existing, ...partial };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {}
}

export function getSession(): StoredSession {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredSession;
  } catch {
    return {};
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
  // إعادة تعيين Socket instance عند مسح الجلسة
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
    listenersAttached = false;
  }
}

let socketInstance: Socket | null = null;
let listenersAttached = false;

function getServerUrl(): string {
  try {
    const isDev = (import.meta as any)?.env?.DEV;
    if (isDev) return 'http://localhost:5000';
    
    // في الإنتاج، استخدم نفس الأصل دائماً
    // هذا يضمن التوافق مع أي بيئة استضافة
    const protocol = window.location.protocol;
    const host = window.location.host;
    return `${protocol}//${host}`;
  } catch {
    return window.location.origin;
  }
}

function attachCoreListeners(socket: Socket) {
  if (listenersAttached) return;
  listenersAttached = true;

  const reauth = (isReconnect: boolean) => {
    const session = getSession();
    // لا ترسل auth إذا لم تتوفر جلسة محفوظة صالحة
    if (!session || (!session.userId && !session.username)) return;
    try {
      socket.emit('auth', {
        userId: session.userId,
        username: session.username,
        userType: session.userType,
        token: session.token,
        reconnect: isReconnect,
      });

      let joinRoomId = session.roomId || 'general';
      if (joinRoomId === 'public' || joinRoomId === 'friends') {
        joinRoomId = 'general';
      }
      socket.emit('joinRoom', {
        roomId: joinRoomId,
        userId: session.userId,
        username: session.username,
      });
    } catch {}
  };

  socket.on('connect', () => {
    reauth(false);
    // إذا لم تكن هناك جلسة محفوظة، لا نرسل auth هنا لتفادي مهلة غير ضرورية
  });

  socket.on('reconnect', () => {
    reauth(true);
  });

  // If network goes back online, try to connect
  window.addEventListener('online', () => {
    if (!socket.connected) {
      try {
        socket.connect();
      } catch {}
    }
  });
}

export function getSocket(): Socket {
  // إذا كان هناك socket قديم وتم مسح الجلسة، أنشئ واحد جديد
  if (socketInstance && !getSession().userId && !getSession().username) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
    listenersAttached = false;
  }

  if (socketInstance) return socketInstance;

  const deviceId = (() => {
    try {
      const existing = localStorage.getItem('deviceId');
      if (existing) return existing;
      const id = 'web-' + Math.random().toString(36).slice(2);
      localStorage.setItem('deviceId', id);
      return id;
    } catch {
      return 'web-unknown';
    }
  })();

  const serverUrl = getServerUrl();
  console.log('🔌 الاتصال بـ Socket.IO على:', serverUrl);

  socketInstance = io(serverUrl, {
    path: '/socket.io',
    // استخدم polling فقط على Render لتجنب مشاكل WebSocket
    transports: window.location.hostname.includes('.onrender.com') 
      ? ['polling'] 
      : ['polling', 'websocket'],
    upgrade: !window.location.hostname.includes('.onrender.com'), // لا ترقية على Render
    rememberUpgrade: false,
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity, // محاولات غير محدودة
    reconnectionDelay: 3000,
    reconnectionDelayMax: 30000, // زيادة الحد الأقصى
    randomizationFactor: 0.5,
    timeout: 30000, // زيادة timeout
    forceNew: true,
    withCredentials: true,
    auth: { deviceId },
    extraHeaders: { 'x-device-id': deviceId },
    // إعدادات إضافية للاستقرار
    closeOnBeforeunload: false, // لا تغلق عند إعادة التحميل
    query: {
      deviceId,
      t: Date.now(), // timestamp لتجنب الكاش
    },
  });

  attachCoreListeners(socketInstance);
  
  // Connect explicitly after listeners are attached
  try {
    socketInstance.connect();
  } catch (error) {
    console.error('❌ خطأ في الاتصال بـ Socket.IO:', error);
  }
  
  // إضافة معالج لإعادة الاتصال عند تغيير حالة الشبكة
  window.addEventListener('online', () => {
    console.log('📡 الإنترنت متصل، محاولة إعادة الاتصال...');
    if (socketInstance && !socketInstance.connected) {
      socketInstance.connect();
    }
  });
  
  window.addEventListener('offline', () => {
    console.log('📵 الإنترنت منقطع');
  });
  
  return socketInstance;
}
