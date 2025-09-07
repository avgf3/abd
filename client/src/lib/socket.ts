import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

// Enhanced session storage helpers with persistence differentiation
const STORAGE_KEY = 'chat_session';
const LOGOUT_FLAG_KEY = 'chat_explicit_logout';

type StoredSession = {
  userId?: number;
  username?: string;
  userType?: string;
  token?: string;
  roomId?: string;
  wallTab?: string;
  lastActivity?: number;
  deviceId?: string;
  isGuest?: boolean;
};

// تحديد نوع التخزين بناءً على نوع المستخدم
function getStorageForUser(userType?: string) {
  // الأعضاء المسجلون يحصلون على localStorage للاستمرارية
  // الزوار يحصلون على sessionStorage فقط إلا إذا لم يسجلوا خروج صريح
  if (userType === 'member' || userType === 'admin' || userType === 'moderator' || userType === 'owner') {
    return localStorage;
  }
  return sessionStorage;
}

export function saveSession(partial: Partial<StoredSession>) {
  try {
    const existing = getSession();
    const merged: StoredSession = { 
      ...existing, 
      ...partial,
      lastActivity: Date.now()
    };
    
    const storage = getStorageForUser(merged.userType);
    storage.setItem(STORAGE_KEY, JSON.stringify(merged));
    
    // حفظ نسخة احتياطية في النوع الآخر للتوافق
    const backupStorage = storage === localStorage ? sessionStorage : localStorage;
    try {
      backupStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {}
  } catch {}
}

// دالة لتحديث وقت النشاط فقط
export function updateLastActivity() {
  try {
    const existing = getSession();
    if (existing.userId) {
      saveSession({ lastActivity: Date.now() });
    }
  } catch {}
}

export function getSession(): StoredSession {
  try {
    // محاولة جلب من localStorage أولاً (للأعضاء المسجلين)
    let raw = localStorage.getItem(STORAGE_KEY);
    let fromLocal = true;
    
    // إذا لم توجد في localStorage، جرب sessionStorage
    if (!raw) {
      raw = sessionStorage.getItem(STORAGE_KEY);
      fromLocal = false;
    }
    
    if (!raw) return {};
    
    const session = JSON.parse(raw) as StoredSession;
    
    // تحقق من صحة الجلسة
    if (session.lastActivity) {
      const timeDiff = Date.now() - session.lastActivity;
      // انتهاء صلاحية الجلسة بعد 7 أيام للأعضاء، يوم واحد للزوار
      const maxAge = session.userType === 'guest' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      
      if (timeDiff > maxAge) {
        clearSession();
        return {};
      }
    }
    
    return session;
  } catch {
    return {};
  }
}

export function clearSession(isExplicitLogout: boolean = false) {
  try {
    if (isExplicitLogout) {
      // تسجيل خروج صريح - امسح من كل مكان وضع علامة
      localStorage.setItem(LOGOUT_FLAG_KEY, Date.now().toString());
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      // إعادة تحميل أو إغلاق - احتفظ بجلسة الأعضاء المسجلين
      const session = getSession();
      if (session.userType !== 'guest') {
        // لا تمسح جلسة الأعضاء المسجلين عند إعادة التحميل
        sessionStorage.removeItem(STORAGE_KEY); // امسح من session فقط
        return;
      } else {
        // امسح جلسة الزوار
        sessionStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch {}
  
  // إعادة تعيين Socket instance عند مسح الجلسة
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export function wasExplicitLogout(): boolean {
  try {
    const flag = localStorage.getItem(LOGOUT_FLAG_KEY);
    if (flag) {
      const time = parseInt(flag);
      // إذا كان تسجيل الخروج خلال آخر 5 دقائق
      return (Date.now() - time) < 5 * 60 * 1000;
    }
    return false;
  } catch {
    return false;
  }
}

export function clearLogoutFlag() {
  try {
    localStorage.removeItem(LOGOUT_FLAG_KEY);
  } catch {}
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
    
    // تحقق من تسجيل الخروج الصريح
    if (wasExplicitLogout()) {
      console.log('🔒 تم تجاهل إعادة المصادقة بسبب تسجيل الخروج الصريح');
      return;
    }
    
    // لا ترسل auth إذا لم تتوفر جلسة محفوظة صالحة
    if (!session || (!session.userId && !session.username)) return;
    
    console.log(`🔄 إعادة مصادقة ${isReconnect ? '(إعادة اتصال)' : '(اتصال أولي)'} للمستخدم:`, session.username);
    
    try {
      socket.emit('auth', {
        userId: session.userId,
        username: session.username,
        userType: session.userType,
        token: session.token,
        reconnect: isReconnect,
        restoreSession: true, // علامة لإخبار الخادم أن هذه استعادة جلسة
      });

      const joinRoomId = session.roomId;
      if (joinRoomId && joinRoomId !== 'public' && joinRoomId !== 'friends') {
        console.log(`🏠 محاولة إعادة الانضمام للغرفة: ${joinRoomId}`);
        socket.emit('joinRoom', {
          roomId: joinRoomId,
          userId: session.userId,
          username: session.username,
          restore: true, // علامة استعادة الغرفة
        });
      }
    } catch (error) {
      console.error('❌ خطأ في إعادة المصادقة:', error);
    }
  };

  socket.on('connect', () => {
    reauth(false);
    // إذا لم تكن هناك جلسة محفوظة، لا نرسل auth هنا لتفادي مهلة غير ضرورية
  });

  socket.on('reconnect', () => {
    reauth(true);
  });

  // If network goes back online, try to connect with better handling
  window.addEventListener('online', () => {
    console.log('🌐 الشبكة متاحة مرة أخرى - محاولة إعادة الاتصال');
    if (!socket.connected) {
      try {
        // تأخير قصير للسماح للشبكة بالاستقرار
        setTimeout(() => {
          if (!socket.connected) {
            socket.connect();
          }
        }, 1000);
      } catch (error) {
        console.error('❌ خطأ في إعادة الاتصال عند عودة الشبكة:', error);
      }
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
    rememberUpgrade: true, // تذكر الترقية للاتصالات المستقبلية
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity, // محاولات غير محدودة
    reconnectionDelay: 1000, // ابدأ بسرعة
    reconnectionDelayMax: 10000, // حد أقصى معقول
    randomizationFactor: 0.3, // تقليل العشوائية
    timeout: 20000, // timeout معقول
    forceNew: false, // السماح بإعادة استخدام الاتصال
    withCredentials: true,
    auth: { deviceId },
    extraHeaders: { 'x-device-id': deviceId },
    // إعدادات محسنة للاستقرار
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
    if (!s.connected) {
      console.log('🔌 محاولة الاتصال بالخادم...');
      s.connect();
    }
  } catch (error) {
    console.error('❌ خطأ في الاتصال:', error);
  }
  return s;
}

// دالة مساعدة للتحقق من حالة الاتصال
export function isSocketConnected(): boolean {
  return socketInstance?.connected || false;
}

// دالة لإجبار إعادة الاتصال
export function forceReconnect(): void {
  if (socketInstance) {
    console.log('🔄 إجبار إعادة الاتصال...');
    socketInstance.disconnect();
    setTimeout(() => {
      if (socketInstance && !socketInstance.connected) {
        socketInstance.connect();
      }
    }, 1000);
  }
}
