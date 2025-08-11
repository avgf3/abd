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
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
}

let socketInstance: Socket | null = null;
let listenersAttached = false;

function getServerUrl(): string {
  try {
    const isDev = (import.meta as any)?.env?.DEV;
    if (isDev) return 'http://localhost:5000';
    // Always use same-origin in production
    return window.location.origin;
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
      socket.emit('auth', {
        userId: session.userId,
        username: session.username,
        userType: session.userType,
        token: session.token,
        reconnect: isReconnect,
      });

      const joinRoomId = session.roomId || 'general';
      socket.emit('joinRoom', {
        roomId: joinRoomId,
        userId: session.userId,
        username: session.username,
      });
    } catch {}
  };

  socket.on('connect', () => {
    reauth(false);
  });

  socket.on('reconnect', () => {
    reauth(true);
  });

  // If network goes back online, try to connect
  window.addEventListener('online', () => {
    if (!socket.connected) {
      try { socket.connect(); } catch {}
    }
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
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 60000,
    randomizationFactor: 0.5,
    timeout: 20000,
    forceNew: false,
    withCredentials: true,
  });

  attachCoreListeners(socketInstance);
  return socketInstance;
}