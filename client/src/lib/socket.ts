import { io, Socket } from 'socket.io-client';

// Session storage helpers
const STORAGE_KEY = 'chat_session';
const QUEUE_KEY = 'pending_messages';

type StoredSession = {
  userId?: number;
  username?: string;
  userType?: string;
  token?: string;
  roomId?: string;
  lastRoomId?: string; // لحفظ آخر غرفة
};

type PendingMessage = {
  id: string;
  event: string;
  data: any;
  timestamp: number;
  retries: number;
};

// ==================== Session Management ====================
export function saveSession(partial: Partial<StoredSession>) {
  try {
    const existing = getSession();
    const merged: StoredSession = { ...existing, ...partial };
    
    // حفظ آخر غرفة تم الانضمام إليها
    if (partial.roomId) {
      merged.lastRoomId = partial.roomId;
    }
    
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (error) {
    console.error('Error saving session:', error);
  }
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
    sessionStorage.removeItem(QUEUE_KEY);
  } catch {}
}

// ==================== Message Queue Management ====================
class MessageQueue {
  private queue: PendingMessage[] = [];
  private processing = false;
  private maxRetries = 3;
  
  constructor() {
    this.loadFromStorage();
  }
  
  private loadFromStorage() {
    try {
      const stored = sessionStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        // تنظيف الرسائل القديمة (أكثر من 5 دقائق)
        const now = Date.now();
        this.queue = this.queue.filter(msg => 
          now - msg.timestamp < 5 * 60 * 1000
        );
        this.saveToStorage();
      }
    } catch {
      this.queue = [];
    }
  }
  
  private saveToStorage() {
    try {
      sessionStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch {}
  }
  
  add(event: string, data: any) {
    const message: PendingMessage = {
      id: `${Date.now()}-${Math.random()}`,
      event,
      data,
      timestamp: Date.now(),
      retries: 0
    };
    
    this.queue.push(message);
    this.saveToStorage();
    this.process();
  }
  
  async process() {
    if (this.processing || !socketInstance?.connected) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const message = this.queue[0];
      
      try {
        // إرسال الرسالة مع انتظار تأكيد
        const sent = await this.sendWithAck(message);
        
        if (sent) {
          // إزالة الرسالة من الطابور بعد النجاح
          this.queue.shift();
          this.saveToStorage();
        } else {
          // زيادة عدد المحاولات
          message.retries++;
          
          if (message.retries >= this.maxRetries) {
            // إزالة الرسالة بعد فشل المحاولات
            this.queue.shift();
            console.error('Message dropped after max retries:', message);
          } else {
            // الانتظار قبل المحاولة مرة أخرى
            await new Promise(resolve => setTimeout(resolve, 1000 * message.retries));
          }
          
          this.saveToStorage();
        }
      } catch (error) {
        console.error('Error processing message:', error);
        break;
      }
    }
    
    this.processing = false;
  }
  
  private sendWithAck(message: PendingMessage): Promise<boolean> {
    return new Promise((resolve) => {
      if (!socketInstance?.connected) {
        resolve(false);
        return;
      }
      
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);
      
      // إرسال مع callback للتأكيد
      socketInstance.emit(message.event, message.data, (ack: any) => {
        clearTimeout(timeout);
        resolve(true);
      });
      
      // في حالة عدم دعم الخادم للـ acknowledgments
      if (message.event === 'sendMessage' || message.event === 'joinRoom') {
        clearTimeout(timeout);
        resolve(true);
      }
    });
  }
  
  clear() {
    this.queue = [];
    this.saveToStorage();
  }
}

// ==================== Socket Singleton ====================
let socketInstance: Socket | null = null;
let messageQueue: MessageQueue | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let isReconnecting = false;

function getServerUrl(): string {
  try {
    const isDev = (import.meta as any)?.env?.DEV;
    if (isDev) return 'http://localhost:5000';
    return window.location.origin;
  } catch {
    return window.location.origin;
  }
}

// ==================== Connection Management ====================
function createSocketInstance(): Socket {
  const socket = io(getServerUrl(), {
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true,
    autoConnect: false, // سنتحكم في الاتصال يدوياً
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
    timeout: 20000,
    forceNew: false,
    withCredentials: true,
    // Heartbeat settings
    pingInterval: 25000,
    pingTimeout: 60000,
  });
  
  attachEventListeners(socket);
  return socket;
}

function attachEventListeners(socket: Socket) {
  // Connection events
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    isReconnecting = false;
    
    // المصادقة
    authenticateSocket(false);
    
    // معالجة الرسائل المعلقة
    if (messageQueue) {
      messageQueue.process();
    }
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    
    // إعادة الاتصال التلقائي للأسباب المؤقتة
    if (reason === 'io server disconnect') {
      // الخادم قطع الاتصال، نحتاج إعادة اتصال يدوي
      attemptReconnect();
    }
  });
  
  socket.on('reconnect', (attemptNumber) => {
    console.log('Socket reconnected after', attemptNumber, 'attempts');
    isReconnecting = false;
    
    // إعادة المصادقة والانضمام للغرفة
    authenticateSocket(true);
  });
  
  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('Reconnection attempt', attemptNumber);
    isReconnecting = true;
  });
  
  socket.on('reconnect_error', (error) => {
    console.error('Reconnection error:', error);
  });
  
  socket.on('reconnect_failed', () => {
    console.error('Reconnection failed');
    isReconnecting = false;
    // محاولة إعادة الاتصال يدوياً بعد فترة
    attemptReconnect();
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
  
  // Auth response
  socket.on('authSuccess', (data) => {
    console.log('Authentication successful:', data);
    
    // الانضمام التلقائي لآخر غرفة
    const session = getSession();
    const roomToJoin = session.lastRoomId || session.roomId || 'general';
    
    if (roomToJoin) {
      socket.emit('joinRoom', {
        roomId: roomToJoin,
        userId: session.userId,
        username: session.username,
      });
    }
  });
  
  socket.on('authError', (error) => {
    console.error('Authentication error:', error);
    // يمكن إضافة منطق لإعادة تسجيل الدخول
  });
  
  // Network events
  window.addEventListener('online', () => {
    console.log('Network online');
    if (!socket.connected && !isReconnecting) {
      socket.connect();
    }
  });
  
  window.addEventListener('offline', () => {
    console.log('Network offline');
  });
  
  // Page visibility
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !socket.connected && !isReconnecting) {
      socket.connect();
    }
  });
}

function authenticateSocket(isReconnect: boolean) {
  const session = getSession();
  if (!session || (!session.userId && !session.username)) {
    console.log('No session for authentication');
    return;
  }
  
  if (!socketInstance?.connected) {
    console.log('Socket not connected for authentication');
    return;
  }
  
  try {
    socketInstance.emit('auth', {
      userId: session.userId,
      username: session.username,
      userType: session.userType,
      token: session.token,
      reconnect: isReconnect,
    });
  } catch (error) {
    console.error('Error during authentication:', error);
  }
}

function attemptReconnect() {
  if (isReconnecting || !socketInstance) return;
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  
  reconnectTimer = setTimeout(() => {
    if (!socketInstance?.connected) {
      console.log('Attempting manual reconnection...');
      socketInstance.connect();
    }
  }, 5000);
}

// ==================== Public API ====================
export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = createSocketInstance();
    messageQueue = new MessageQueue();
    
    // الاتصال التلقائي إذا كان هناك جلسة
    const session = getSession();
    if (session.userId || session.username) {
      socketInstance.connect();
    }
  }
  
  return socketInstance;
}

export function connectSocket() {
  const socket = getSocket();
  if (!socket.connected && !isReconnecting) {
    socket.connect();
  }
}

export function disconnectSocket() {
  if (socketInstance) {
    isReconnecting = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    socketInstance.disconnect();
  }
}

export function isSocketConnected(): boolean {
  return socketInstance?.connected || false;
}

// إرسال رسالة مع دعم الطابور
export function sendMessage(event: string, data: any) {
  const socket = getSocket();
  
  if (socket.connected) {
    socket.emit(event, data);
  } else {
    // إضافة للطابور في حالة عدم الاتصال
    messageQueue?.add(event, data);
  }
}

// تنظيف عند الخروج
export function cleanupSocket() {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
  
  if (messageQueue) {
    messageQueue.clear();
    messageQueue = null;
  }
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  isReconnecting = false;
}