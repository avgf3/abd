import { io, Socket } from 'socket.io-client';

// Simple session storage helpers
const STORAGE_KEY = 'chat_session';

type StoredSession = {
  userId?: number;
  username?: string;
  userType?: string;
  token?: string;
  roomId?: string;
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
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

let socketInstance: Socket | null = null;
let listenersAttached = false;

function getServerUrl(): string {
  try {
    const isDev = (import.meta as any)?.env?.DEV;
    return isDev ? 'http://localhost:5000' : window.location.origin;
  } catch {
    return window.location.origin;
  }
}

function attachCoreListeners(socket: Socket) {
  if (listenersAttached) return;
  listenersAttached = true;

  const reauth = (isReconnect: boolean) => {
    const session = getSession();
    if (!session || (!session.userId && !session.username)) return;
    try {
      // إرسال المصادقة فوراً
      socket.emit('auth', {
        userId: session.userId,
        username: session.username,
        userType: session.userType,
        token: session.token,
        reconnect: isReconnect,
      });

      // انتظار قصير ثم انضمام للغرفة
      setTimeout(() => {
        const joinRoomId = session.roomId || 'general';
        socket.emit('joinRoom', {
          roomId: joinRoomId,
          userId: session.userId,
          username: session.username,
        });
      }, 50);
    } catch {}
  };

  socket.on('connect', () => {
    console.log('🟢 Socket connected');
    reauth(false);
  });

  socket.on('reconnect', () => {
    console.log('🔄 Socket reconnected');
    reauth(true);
  });

  // تحسين إدارة الاتصال عند عودة الشبكة
  window.addEventListener('online', () => {
    if (!socket.connected) {
      try { 
        console.log('🌐 Network back online, reconnecting...');
        socket.connect(); 
      } catch {}
    }
  });
  
  // إضافة معالج للفصل
  socket.on('disconnect', (reason) => {
    console.log('🔴 Socket disconnected:', reason);
  });
}

export function getSocket(): Socket {
  if (socketInstance) return socketInstance;

  socketInstance = io(getServerUrl(), {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10, // تقليل عدد المحاولات لتسريع الفشل
    reconnectionDelay: 500, // تقليل فترة الانتظار الأولى
    reconnectionDelayMax: 30000, // تقليل الحد الأقصى
    randomizationFactor: 0.2, // تقليل العشوائية
    timeout: 10000, // تقليل timeout للاتصال الأولي
    forceNew: false,
    withCredentials: false, // تقليل الأمان للسرعة
  });

  attachCoreListeners(socketInstance);
  return socketInstance;
}