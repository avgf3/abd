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
    // listeners are scoped to instance via a private flag now
  }
}

let socketInstance: Socket | null = null;

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
  const anySocket = socket as any;
  if (anySocket.__coreListenersAttached) return;
  anySocket.__coreListenersAttached = true;

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

      // 🔧 إصلاح: انتظار المصادقة قبل الانضمام للغرفة
      const joinRoomId = session.roomId;
      if (joinRoomId && joinRoomId !== 'public' && joinRoomId !== 'friends') {
        // انتظار قصير للتأكد من اكتمال المصادقة
        setTimeout(() => {
          if (socket.connected && socket.id) {
            socket.emit('joinRoom', {
              roomId: joinRoomId,
              userId: session.userId,
              username: session.username,
            });
          }
        }, 1000); // انتظار ثانية واحدة
      }
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
    // listeners are scoped to instance via a private flag now
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
  socketInstance = io(serverUrl, {
    path: '/socket.io',
    // استخدم WebSocket كخيار أساسي حيثما أمكن
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: false,
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity, // محاولات غير محدودة
    reconnectionDelay: 1000, // 🔧 تقليل تأخير إعادة الاتصال
    reconnectionDelayMax: 10000, // 🔧 تقليل الحد الأقصى
    randomizationFactor: 0.2, // 🔧 تقليل العشوائية
    timeout: 10000, // 🔧 تقليل timeout للاستجابة الأسرع
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
  
  // لا نتصل تلقائياً هنا بعد الآن؛ الاتصال يتم صراحةً عبر connectSocket()
  return socketInstance;
}

export function connectSocket(): Socket {
  const s = getSocket();
  try {
    if (!s.connected) s.connect();
  } catch {}
  return s;
}
