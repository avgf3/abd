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
    
    // 🆕 حفظ معلومات إضافية للذكاء
    const connectionState = {
      lastSaved: Date.now(),
      isActive: true,
      roomId: merged.roomId,
      userId: merged.userId,
      username: merged.username,
      userType: merged.userType
    };
    localStorage.setItem('connection_state', JSON.stringify(connectionState));
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
    // 🆕 مسح معلومات الاتصال الإضافية
    localStorage.removeItem('connection_state');
    localStorage.removeItem('socket_last_connected');
    localStorage.removeItem('socket_connection_stable');
  } catch {}
  // إعادة تعيين Socket instance عند مسح الجلسة
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
}

// 🆕 دالة ذكية لفحص واستعادة الحالة
export function getConnectionHealth(): {
  isHealthy: boolean;
  shouldReconnect: boolean;
  lastConnected: number | null;
  timeSinceLastConnection: number;
  connectionStable: boolean;
} {
  try {
    const lastConnected = localStorage.getItem('socket_last_connected');
    const isStable = localStorage.getItem('socket_connection_stable') === 'true';
    const connectionState = localStorage.getItem('connection_state');
    
    const lastConnectedTime = lastConnected ? parseInt(lastConnected) : null;
    const timeSince = lastConnectedTime ? Date.now() - lastConnectedTime : Infinity;
    
    // 🔥 منطق ذكي لتحديد صحة الاتصال
    const isHealthy = isStable && timeSince < 30000; // أقل من 30 ثانية
    const shouldReconnect = !isHealthy && timeSince > 5000; // أكثر من 5 ثواني
    
    return {
      isHealthy,
      shouldReconnect,
      lastConnected: lastConnectedTime,
      timeSinceLastConnection: timeSince,
      connectionStable: isStable
    };
  } catch {
    return {
      isHealthy: false,
      shouldReconnect: true,
      lastConnected: null,
      timeSinceLastConnection: Infinity,
      connectionStable: false
    };
  }
}

// 🆕 دالة ذكية للتحقق من ضرورة إعادة الاتصال عند العودة للصفحة
export function shouldReconnectOnPageShow(): boolean {
  try {
    const health = getConnectionHealth();
    const session = getSession();
    
    // إذا لا توجد جلسة، لا حاجة لإعادة الاتصال
    if (!session.userId && !session.username) return false;
    
    // إذا كان الاتصال صحي، لا حاجة لإعادة الاتصال
    if (health.isHealthy) return false;
    
    // إذا مر وقت طويل، أعد الاتصال
    return health.shouldReconnect;
  } catch {
    return true; // في حالة الخطأ، من الأفضل إعادة الاتصال
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

  // 🚀 نظام إعادة اتصال ذكي ومتقدم
  let reconnectAttempt = 0;
  let maxReconnectAttempt = 0;
  let isManualDisconnect = false;

  const reauth = (isReconnect: boolean) => {
    const session = getSession();
    if (!session || (!session.userId && !session.username)) return;
    try {
      socket.emit('auth', {
        userId: session.userId,
        username: session.username,
        userType: session.userType,
        token: session.token,
        reconnect: isReconnect,
        // 🆕 معلومات إضافية للذكاء
        reconnectAttempt,
        timestamp: Date.now(),
      });
    } catch {}
  };

  // 🔥 معالجة الاتصال الناجح
  socket.on('connect', () => {
    console.log('🟢 Socket متصل بنجاح');
    reconnectAttempt = 0; // إعادة تعيين العداد
    reauth(false);
    
    // 🆕 حفظ حالة الاتصال في localStorage
    try {
      localStorage.setItem('socket_last_connected', Date.now().toString());
      localStorage.setItem('socket_connection_stable', 'true');
    } catch {}
  });

  // 🔥 معالجة إعادة الاتصال الذكية
  socket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 إعادة اتصال ناجحة - محاولة #${attemptNumber}`);
    reconnectAttempt = attemptNumber;
    maxReconnectAttempt = Math.max(maxReconnectAttempt, attemptNumber);
    reauth(true);
    
    // 🆕 تحديث إحصائيات الاتصال
    try {
      localStorage.setItem('socket_last_reconnected', Date.now().toString());
      localStorage.setItem('socket_max_reconnect_attempts', maxReconnectAttempt.toString());
    } catch {}
  });

  // 🔥 معالجة محاولات إعادة الاتصال
  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`🔄 محاولة إعادة اتصال #${attemptNumber}`);
    reconnectAttempt = attemptNumber;
    
    // 🆕 استراتيجية ذكية حسب رقم المحاولة
    if (attemptNumber > 5) {
      // بعد 5 محاولات، جرب تغيير النقل
      socket.io.opts.transports = ['polling', 'websocket'];
    }
    if (attemptNumber > 10) {
      // بعد 10 محاولات، أعد تعيين الاتصال بالكامل
      try {
        socket.disconnect();
        setTimeout(() => socket.connect(), 1000);
      } catch {}
    }
  });

  // 🔥 معالجة أخطاء الاتصال
  socket.on('connect_error', (error) => {
    console.warn(`❌ خطأ اتصال: ${error.message}`);
    
    // 🆕 حفظ معلومات الخطأ للتشخيص
    try {
      const errorInfo = {
        message: error.message,
        timestamp: Date.now(),
        attempt: reconnectAttempt,
        transport: socket.io.engine?.transport?.name || 'unknown'
      };
      localStorage.setItem('socket_last_error', JSON.stringify(errorInfo));
    } catch {}
  });

  // 🔥 معالجة قطع الاتصال الذكية
  socket.on('disconnect', (reason) => {
    console.log(`🔴 Socket منقطع - السبب: ${reason}`);
    
    // 🆕 تحليل سبب الانقطاع
    isManualDisconnect = reason === 'io client disconnect';
    
    try {
      localStorage.setItem('socket_last_disconnected', Date.now().toString());
      localStorage.setItem('socket_disconnect_reason', reason);
      localStorage.setItem('socket_connection_stable', 'false');
    } catch {}
    
    // 🚀 إعادة اتصال ذكية حسب السبب
    if (!isManualDisconnect) {
      if (reason === 'transport close' || reason === 'transport error') {
        // مشكلة في النقل - جرب نقل مختلف
        socket.io.opts.transports = socket.io.opts.transports.reverse();
      }
      
      // محاولة إعادة اتصال فورية للأسباب المؤقتة
      if (reason === 'ping timeout' || reason === 'transport close') {
        setTimeout(() => {
          if (!socket.connected) {
            socket.connect();
          }
        }, 100);
      }
    }
  });

  // 🔥 معالجة عودة الشبكة
  window.addEventListener('online', () => {
    console.log('🌐 الشبكة عادت - محاولة إعادة اتصال');
    if (!socket.connected && !isManualDisconnect) {
      try {
        socket.connect();
      } catch {}
    }
  });

  // 🔥 معالجة انقطاع الشبكة
  window.addEventListener('offline', () => {
    console.log('📴 الشبكة منقطعة');
    try {
      localStorage.setItem('socket_network_offline', Date.now().toString());
    } catch {}
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
    // 🚀 إعدادات ذكية مثل المواقع الناجحة
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true, // تذكر الترقية الناجحة
    autoConnect: false,
    reconnection: true,
    // 🔥 إعادة اتصال لانهائية وذكية مثل المواقع الناجحة
    reconnectionAttempts: Infinity, // لا يستسلم أبداً!
    reconnectionDelay: 200, // بداية سريعة جداً
    reconnectionDelayMax: 2000, // حد أقصى منخفض للسرعة
    randomizationFactor: 0.1, // عشوائية قليلة للسرعة
    // 🔥 أوقات استجابة سريعة جداً
    timeout: 8000, // مهلة قصيرة للكشف السريع عن المشاكل
    forceNew: false,
    withCredentials: true,
    auth: { deviceId, token: sessionForHandshake?.token },
    extraHeaders: { 'x-device-id': deviceId },
    // 🔥 إعدادات محسّنة للاستقرار الذكي
    closeOnBeforeunload: false, // لا تغلق عند إعادة التحميل
    forceBase64: false,
    // 🔥 معلومات تشخيصية ذكية
    query: {
      deviceId,
      t: Date.now(),
      userAgent: navigator.userAgent.slice(0, 100),
      screen: `${screen.width}x${screen.height}`,
      connection: (navigator as any).connection?.effectiveType || 'unknown',
      // 🆕 معلومات إضافية للذكاء
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
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
