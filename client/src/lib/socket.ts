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
  lastAuthTime?: number;
  isAuthenticated?: boolean;
};

export function saveSession(partial: Partial<StoredSession>) {
  try {
    const existing = getSession();
    const merged: StoredSession = { 
      ...existing, 
      ...partial,
      lastAuthTime: partial.token ? Date.now() : existing.lastAuthTime,
      isAuthenticated: !!partial.token || !!partial.userId
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    
    // حفظ الرمز المميز في كوكي أيضاً للاستمرارية
    if (partial.token) {
      document.cookie = `auth_token=${partial.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    }
  } catch (error) {
    console.warn('فشل في حفظ الجلسة:', error);
  }
}

// دالة مساعدة لاستخراج الرمز المميز من الكوكيز
function getTokenFromCookies(): string | null {
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'auth_token' && value) {
        return value; // إزالة decodeURIComponent لتجنب مشاكل التشفير
      }
    }
  } catch (error) {
    console.warn('فشل في قراءة الكوكيز:', error);
  }
  return null;
}

export function getSession(): StoredSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let session: StoredSession = {};
    
    if (raw) {
      session = JSON.parse(raw) as StoredSession;
    }
    
    // محاولة استرداد الرمز المميز من الكوكي إذا لم يكن موجوداً في localStorage
    if (!session.token) {
      const tokenFromCookie = getTokenFromCookies();
      if (tokenFromCookie) {
        session.token = tokenFromCookie;
        // حفظ الرمز المميز في localStorage للاستخدام المستقبلي
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        } catch {}
      }
    }
    
    return session;
  } catch (error) {
    console.warn('فشل في قراءة الجلسة:', error);
    return {};
  }
}

// دالة لاستخراج الرمز المميز من استجابة تسجيل الدخول
export function extractTokenFromResponse(response: any): string | null {
  try {
    // محاولة استخراج الرمز المميز من الكوكيز أولاً
    const tokenFromCookie = getTokenFromCookies();
    if (tokenFromCookie) {
      return tokenFromCookie;
    }
    
    // محاولة استخراج الرمز المميز من الاستجابة مباشرة
    if (response?.token) {
      return response.token;
    }
    
    // محاولة استخراج الرمز المميز من بيانات المستخدم
    if (response?.user?.token) {
      return response.user.token;
    }
    
    return null;
  } catch (error) {
    console.warn('فشل في استخراج الرمز المميز:', error);
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    // مسح الكوكي أيضاً
    document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Lax';
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
    if (isDev) return 'http://localhost:3000';
    
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

  // معالجة Page Visibility API للحفاظ على الاتصال
  const handleVisibilityChange = () => {
    const isVisible = !document.hidden;
    if (isVisible && !socket.connected) {
      // إعادة الاتصال عند العودة للواجهة الأمامية
      try {
        socket.connect();
      } catch {}
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // تنظيف المستمع عند إزالة Socket
  socket.on('disconnect', () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
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
    autoConnect: true, // اتصال تلقائي مستمر
    reconnection: true,
    // 🔥 تحسين إعادة الاتصال - محاولات محدودة مع تدرج ذكي
    reconnectionAttempts: Infinity, // محاولات لا نهائية للاتصال المستمر
    reconnectionDelay: 1000, // إعادة الاتصال بسرعة
    reconnectionDelayMax: 5000, // حد أقصى قصير
    randomizationFactor: 0.3, // تقليل العشوائية لاتصال أسرع
    // 🔥 تحسين أوقات الاستجابة
    timeout: isDevelopment ? 15000 : 20000, // timeout أقل لاستجابة أسرع
    forceNew: false, // إعادة استخدام الاتصالات الموجودة
    withCredentials: true,
    auth: { deviceId },
    extraHeaders: { 'x-device-id': deviceId },
    // 🔥 إعدادات محسّنة للاستقرار والأداء
    closeOnBeforeunload: false, // عدم إغلاق الاتصال أبداً للحفاظ على الاتصال المستمر
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
  
  // الاتصال التلقائي مفعل الآن
  return socketInstance;
}

export function connectSocket(): Socket {
  const s = getSocket();
  try {
    if (!s.connected) s.connect();
  } catch {}
  return s;
}
