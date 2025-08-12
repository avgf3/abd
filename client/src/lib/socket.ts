import { io, Socket } from 'socket.io-client';

// Types
interface SocketUser {
  id: number;
  username: string;
  role: string;
}

interface AuthData {
  token: string;
  reconnect?: boolean;
  lastRoomId?: string;
}

interface SocketOptions {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: any) => void;
  onAuth?: (user: SocketUser) => void;
  onAuthError?: (error: any) => void;
}

// Message Queue for offline messages
interface QueuedMessage {
  id: string;
  event: string;
  data: any;
  timestamp: number;
  retries: number;
}

class MessageQueue {
  private queue: QueuedMessage[] = [];
  private readonly MAX_RETRIES = 3;
  private readonly STORAGE_KEY = 'socket_message_queue';
  
  constructor() {
    this.loadFromStorage();
  }
  
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        // تنظيف الرسائل القديمة (أكثر من 5 دقائق)
        const cutoff = Date.now() - 5 * 60 * 1000;
        this.queue = this.queue.filter(msg => msg.timestamp > cutoff);
        this.saveToStorage();
      }
    } catch {
      this.queue = [];
    }
  }
  
  private saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch {}
  }
  
  add(event: string, data: any): void {
    const message: QueuedMessage = {
      id: `${Date.now()}-${Math.random()}`,
      event,
      data,
      timestamp: Date.now(),
      retries: 0
    };
    
    this.queue.push(message);
    this.saveToStorage();
  }
  
  getAll(): QueuedMessage[] {
    return [...this.queue];
  }
  
  remove(id: string): void {
    this.queue = this.queue.filter(msg => msg.id !== id);
    this.saveToStorage();
  }
  
  incrementRetries(id: string): boolean {
    const msg = this.queue.find(m => m.id === id);
    if (msg) {
      msg.retries++;
      this.saveToStorage();
      return msg.retries < this.MAX_RETRIES;
    }
    return false;
  }
  
  clear(): void {
    this.queue = [];
    this.saveToStorage();
  }
}

// Singleton Socket Manager
class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;
  private messageQueue = new MessageQueue();
  private isAuthenticated = false;
  private currentUser: SocketUser | null = null;
  private lastRoomId: string | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  
  private constructor() {}
  
  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }
  
  private getSocketUrl(): string {
    if (typeof window === 'undefined') return '';
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // في بيئة التطوير، استخدم المنفذ 5000
    if (import.meta.env.DEV) {
      return 'ws://localhost:5000';
    }
    
    return `${protocol}//${host}`;
  }
  
  private createSocket(): Socket {
    const socketUrl = this.getSocketUrl();
    
    return io(socketUrl, {
      autoConnect: false, // لا يتصل تلقائياً
      reconnection: true,
      reconnectionAttempts: this.MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      path: '/socket.io/',
      // إعدادات الـ heartbeat
      pingInterval: 25000,
      pingTimeout: 60000,
      // إرسال الكوكيز
      withCredentials: true
    });
  }
  
  connect(token: string, options?: SocketOptions): Socket {
    // إذا كان متصلاً بالفعل، أعد الـ socket الحالي
    if (this.socket?.connected) {
      return this.socket;
    }
    
    // إنشاء socket جديد إذا لم يكن موجوداً
    if (!this.socket) {
      this.socket = this.createSocket();
      this.setupEventHandlers(options);
    }
    
    // حفظ التوكن في localStorage
    if (token) {
      localStorage.setItem('auth_token', token);
    }
    
    // الاتصال
    this.socket.connect();
    
    return this.socket;
  }
  
  private setupEventHandlers(options?: SocketOptions) {
    if (!this.socket) return;
    
    // معالج الاتصال
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      
      // المصادقة التلقائية باستخدام التوكن المحفوظ
      const token = localStorage.getItem('auth_token');
      if (token) {
        this.authenticate(token, true);
      }
      
      options?.onConnect?.();
    });
    
    // معالج قطع الاتصال
    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isAuthenticated = false;
      
      // إضافة الرسائل المعلقة للطابور
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        // قطع اتصال متعمد، لا نحاول إعادة الاتصال
        this.lastRoomId = null;
      }
      
      options?.onDisconnect?.(reason);
    });
    
    // معالج الأخطاء
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      options?.onError?.(error);
    });
    
    // معالج إعادة الاتصال
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      
      // إعادة المصادقة
      const token = localStorage.getItem('auth_token');
      if (token) {
        this.authenticate(token, true);
      }
    });
    
    // معالج فشل إعادة الاتصال
    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      this.messageQueue.clear();
    });
    
    // معالج نجاح المصادقة
    this.socket.on('authSuccess', (data: { user: SocketUser }) => {
      console.log('Authentication successful:', data.user.username);
      this.isAuthenticated = true;
      this.currentUser = data.user;
      
      // لا نقوم بالانضمام من العميل بعد المصادقة لتجنب الازدواج؛ الخادم سيتكفل بذلك
      // معالجة الرسائل المعلقة
      this.processQueuedMessages();
      
      options?.onAuth?.(data.user);
    });
    
    // معالج فشل المصادقة
    this.socket.on('authError', (error) => {
      console.error('Authentication failed:', error);
      this.isAuthenticated = false;
      this.currentUser = null;
      
      // حذف التوكن غير الصالح
      localStorage.removeItem('auth_token');
      
      options?.onAuthError?.(error);
    });
  }
  
  authenticate(token: string, isReconnect = false): void {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }
    
    const authData: AuthData = {
      token,
      reconnect: isReconnect,
      lastRoomId: this.lastRoomId || undefined
    };
    
    this.socket.emit('auth', authData);
  }
  
  private processQueuedMessages(): void {
    if (!this.socket?.connected || !this.isAuthenticated) return;
    
    const messages = this.messageQueue.getAll();
    
    messages.forEach(msg => {
      try {
        this.socket!.emit(msg.event, msg.data);
        this.messageQueue.remove(msg.id);
      } catch (error) {
        console.error('Error sending queued message:', error);
        
        // إعادة المحاولة أو حذف الرسالة
        if (!this.messageQueue.incrementRetries(msg.id)) {
          this.messageQueue.remove(msg.id);
        }
      }
    });
  }
  
  emit(event: string, data?: any): void {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }
    
    if (!this.socket.connected || !this.isAuthenticated) {
      // إضافة للطابور إذا لم يكن متصلاً
      this.messageQueue.add(event, data);
      return;
    }
    
    try {
      this.socket.emit(event, data);
    } catch (error) {
      console.error('Error emitting event:', event, error);
      this.messageQueue.add(event, data);
    }
  }
  
  on(event: string, handler: (...args: any[]) => void): void {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }
    
    this.socket.on(event, handler);
  }
  
  off(event: string, handler?: (...args: any[]) => void): void {
    if (!this.socket) return;
    
    if (handler) {
      this.socket.off(event, handler);
    } else {
      this.socket.off(event);
    }
  }
  
  joinRoom(roomId: string): void {
    this.lastRoomId = roomId;
    this.emit('joinRoom', { roomId });
    
    // حفظ آخر غرفة في localStorage
    localStorage.setItem('last_room_id', roomId);
  }
  
  leaveRoom(roomId: string): void {
    if (this.lastRoomId === roomId) {
      this.lastRoomId = null;
      localStorage.removeItem('last_room_id');
    }
    
    this.emit('leaveRoom', { roomId });
  }
  
  disconnect(): void {
    if (this.socket) {
      this.isAuthenticated = false;
      this.currentUser = null;
      this.lastRoomId = null;
      this.messageQueue.clear();
      
      this.socket.disconnect();
      this.socket = null;
    }
    
    // تنظيف localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('last_room_id');
  }
  
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
  
  isUserAuthenticated(): boolean {
    return this.isAuthenticated;
  }
  
  getCurrentUser(): SocketUser | null {
    return this.currentUser;
  }
  
  getSocket(): Socket | null {
    // Lazily create the socket instance if it doesn't exist yet
    if (!this.socket) {
      this.socket = this.createSocket();
      // Initialize default event handlers without custom options
      this.setupEventHandlers();
    }
    return this.socket;
  }
  
  getLastRoomId(): string | null {
    return this.lastRoomId || localStorage.getItem('last_room_id');
  }

  saveSession(payload: SaveSessionPayload): void {
    try {
      if (payload.token) {
        localStorage.setItem('auth_token', payload.token);
      }

      const resolvedRoomId = payload.lastRoomId ?? payload.roomId;
      if (resolvedRoomId) {
        this.lastRoomId = resolvedRoomId;
        localStorage.setItem('last_room_id', resolvedRoomId);
      }

      if (
        typeof payload.userId === 'number' &&
        typeof payload.username === 'string' &&
        typeof payload.userType === 'string'
      ) {
        this.currentUser = {
          id: payload.userId,
          username: payload.username,
          role: payload.userType
        };
      }
    } catch {
      // ignore storage errors
    }
  }
}

// تصدير instance واحد
const socketManager = SocketManager.getInstance();

// تصدير الدوال المساعدة
export const connectSocket = (token: string, options?: SocketOptions) => 
  socketManager.connect(token, options);

export const getSocket = () => 
  socketManager.getSocket();

export const emitEvent = (event: string, data?: any) => 
  socketManager.emit(event, data);

export const sendMessage = (event: string, data?: any) =>
  socketManager.emit(event, data);

export const onEvent = (event: string, handler: (...args: any[]) => void) => 
  socketManager.on(event, handler);

export const offEvent = (event: string, handler?: (...args: any[]) => void) => 
  socketManager.off(event, handler);

export const joinRoom = (roomId: string) => 
  socketManager.joinRoom(roomId);

export const leaveRoom = (roomId: string) => 
  socketManager.leaveRoom(roomId);

export const disconnectSocket = () => 
  socketManager.disconnect();

export const isSocketConnected = () => 
  socketManager.isConnected();

export const isAuthenticated = () => 
  socketManager.isUserAuthenticated();

export const getCurrentUser = () => 
  socketManager.getCurrentUser();

export const getLastRoomId = () => 
  socketManager.getLastRoomId();

export type SaveSessionPayload = {
  roomId?: string;
  lastRoomId?: string;
  userId?: number;
  username?: string;
  userType?: string;
  token?: string;
};

export const saveSession = (payload: SaveSessionPayload) =>
  socketManager.saveSession(payload);

// تصدير الـ manager نفسه للاستخدامات المتقدمة
export default socketManager;