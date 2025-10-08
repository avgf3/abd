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
  const sessionForHandshake = getSession();
  
  socketInstance = io(serverUrl, {
    path: '/socket.io',
    // Prefer websocket but allow polling fallback; aligns with server config
    transports: ['websocket', 'polling'],
    upgrade: true,
    // rememberUpgrade is a client option but can cause sticky WS usage across origins; disable
    rememberUpgrade: false,
    autoConnect: false,
    reconnection: true,
    // 🔥 تحسين إعادة الاتصال - محاولات محدودة مع تدرج ذكي
    reconnectionAttempts: isProduction ? 10 : 5, // محاولات محدودة بدلاً من لانهائية
    reconnectionDelay: isDevelopment ? 1000 : 2000, // تقليل التأخير في التطوير
    reconnectionDelayMax: isProduction ? 10000 : 5000, // تقليل الحد الأقصى
    randomizationFactor: 0.3, // تقليل العشوائية لاتصال أسرع
    // 🔥 تحسين أوقات الاستجابة
    timeout: isDevelopment ? 15000 : 20000, // timeout أقل لاستجابة أسرع
    forceNew: false, // إعادة استخدام الاتصالات الموجودة
    withCredentials: true,
    auth: { deviceId, token: sessionForHandshake?.token },
    extraHeaders: { 'x-device-id': deviceId },
    // 🔥 إعدادات محسّنة للاستقرار والأداء
    closeOnBeforeunload: false, // لا تغلق عند إعادة التحميل
    // Avoid non-standard client options (keep to safe set)
    forceBase64: false,
    // 🔥 إعدادات ping مخصصة (هذه الخيارات للخادم فقط، لكن نتركها للتوثيق)
    // pingTimeout: isProduction ? 60000 : 30000, // مطابق للخادم
    // pingInterval: isProduction ? 25000 : 15000, // مطابق للخادم
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
