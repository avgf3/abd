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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {}
}

export function getSession(): StoredSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredSession;
  } catch {
    return {};
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
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
  
  // 🔥 إعدادات محسّنة للأداء والاستقرار
  const isDevelopment = (import.meta as any)?.env?.DEV;
  const isProduction = !isDevelopment;
  
  socketInstance = io(serverUrl, {
    path: '/socket.io',
    // 🔥 تحسين النقل - إعطاء أولوية للـ WebSocket مع fallback ذكي
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true, // تذكر الترقية الناجحة
    autoConnect: false,
    reconnection: true,
    // 🔥 تحسين إعادة الاتصال - محاولات محدودة مع تدرج ذكي
    reconnectionAttempts: isProduction ? 15 : 8, // زيادة المحاولات لدعم الخلفية
    reconnectionDelay: isDevelopment ? 1000 : 2000, // تقليل التأخير في التطوير
    reconnectionDelayMax: isProduction ? 15000 : 8000, // زيادة الحد الأقصى لدعم الخلفية
    randomizationFactor: 0.2, // تقليل العشوائية لاتصال أسرع
    // 🔥 تحسين أوقات الاستجابة لدعم العمل في الخلفية
    timeout: isDevelopment ? 20000 : 30000, // timeout أطول لدعم الخلفية
    forceNew: false, // إعادة استخدام الاتصالات الموجودة
    withCredentials: true,
    auth: { deviceId },
    extraHeaders: { 'x-device-id': deviceId },
    // 🔥 إعدادات محسّنة للاستقرار والأداء في الخلفية
    closeOnBeforeunload: false, // لا تغلق عند إعادة التحميل
    // 🔥 تحسين إدارة الاتصال
    multiplex: true, // تمكين multiplexing للأداء الأفضل
    forceBase64: false, // استخدام binary للأداء الأفضل
    // 🔥 إعدادات ping محسنة لدعم العمل في الخلفية
    pingTimeout: isProduction ? 120000 : 60000, // مطابق للخادم - دقيقتان في الإنتاج
    pingInterval: isProduction ? 30000 : 20000, // مطابق للخادم - كل 30 ثانية في الإنتاج
    query: {
      deviceId,
      t: Date.now(), // timestamp لتجنب الكاش
      // 🔥 إضافة معلومات إضافية للتشخيص
      userAgent: navigator.userAgent.slice(0, 100), // معلومات المتصفح (محدودة)
      screen: `${screen.width}x${screen.height}`, // دقة الشاشة
      connection: (navigator as any).connection?.effectiveType || 'unknown', // نوع الاتصال
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
