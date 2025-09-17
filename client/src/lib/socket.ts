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
    // تنظيف keep-alive interval
    const keepAliveInterval = (socketInstance as any).__keepAliveInterval;
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
    
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
    
    // 🔥 إرسال ping دوري محسن للحفاظ على الاتصال نشطاً
    const keepAliveInterval = setInterval(() => {
      if (socket.connected) {
        try {
          socket.emit('client_ping', { t: Date.now() });
        } catch (error) {
          console.warn('فشل إرسال ping:', error);
          clearInterval(keepAliveInterval);
        }
      } else {
        clearInterval(keepAliveInterval);
      }
    }, 15000); // كل 15 ثانية - أكثر تكراراً للـ free tier
    
    // حفظ معرف الـ interval للتنظيف لاحقاً
    (socket as any).__keepAliveInterval = keepAliveInterval;
  });

  socket.on('reconnect', () => {
    reauth(true);
  });

  socket.on('disconnect', () => {
    // تنظيف keep-alive interval عند الانقطاع
    const keepAliveInterval = (socket as any).__keepAliveInterval;
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      (socket as any).__keepAliveInterval = null;
    }
  });

  // If network goes back online, try to connect
  window.addEventListener('online', () => {
    if (!socket.connected) {
      try {
        socket.connect();
      } catch {}
    }
  });

  // معالجة أخطاء الاتصال
  socket.on('connect_error', (error) => {
    console.warn('خطأ في الاتصال:', error.message);
  });

  // معالجة أخطاء إعادة الاتصال
  socket.on('reconnect_error', (error) => {
    console.warn('خطأ في إعادة الاتصال:', error.message);
  });

  // معالجة pong من الخادم مع مراقبة محسنة
  socket.on('client_pong', (data) => {
    const latency = Date.now() - data.t;
    if (latency > 3000) { // إذا كان الكمون أكثر من 3 ثواني
      console.warn(`كمون عالي: ${latency}ms`);
    }
  });

  // معالجة server_ping من الخادم
  socket.on('server_ping', (data) => {
    try {
      socket.emit('server_pong', { t: data.t, clientTime: Date.now() });
    } catch (error) {
      console.warn('فشل إرسال server_pong:', error);
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
    // 🔥 تحسين إعادة الاتصال - محاولات أكثر ذكاءً للـ free tier
    reconnectionAttempts: isProduction ? 8 : 5, // زيادة المحاولات للـ free tier
    reconnectionDelay: isDevelopment ? 2000 : 2000, // تأخير أقصر للاستجابة السريعة
    reconnectionDelayMax: isProduction ? 10000 : 8000, // تقليل الحد الأقصى للاستجابة السريعة
    randomizationFactor: 0.3, // تقليل العشوائية للاستجابة المتسقة
    // 🔥 تحسين أوقات الاستجابة للـ free tier
    timeout: isDevelopment ? 20000 : 30000, // timeout أطول للـ free tier
    forceNew: false, // إعادة استخدام الاتصالات الموجودة
    withCredentials: true,
    auth: { deviceId },
    extraHeaders: { 'x-device-id': deviceId },
    // 🔥 إعدادات محسّنة للاستقرار والأداء
    closeOnBeforeunload: false, // لا تغلق عند إعادة التحميل
    // 🔥 تحسين إدارة الاتصال
    multiplex: true, // تمكين multiplexing للأداء الأفضل
    forceBase64: false, // استخدام binary للأداء الأفضل
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
