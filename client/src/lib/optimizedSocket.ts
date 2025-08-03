import { io, Socket } from 'socket.io-client';
import type { ChatUser } from '@/types/chat';

interface OptimizedSocketOptions {
  serverUrl?: string;
  enableLogging?: boolean;
  maxReconnectionAttempts?: number;
  reconnectionDelay?: number;
  timeout?: number;
  enableThrottling?: boolean;
  throttleDelay?: number;
}

// مدير Socket.IO محسن
export class OptimizedSocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectionAttempts: number;
  private reconnectionDelay: number;
  private timeout: number;
  private enableLogging: boolean;
  private enableThrottling: boolean;
  private throttleDelay: number;
  private lastMessageTime = 0;
  private messageQueue: Array<{ event: string; data: any }> = [];
  private isProcessingQueue = false;

  constructor(options: OptimizedSocketOptions = {}) {
    this.maxReconnectionAttempts = options.maxReconnectionAttempts || 5;
    this.reconnectionDelay = options.reconnectionDelay || 1000;
    this.timeout = options.timeout || 10000;
    this.enableLogging = options.enableLogging || false;
    this.enableThrottling = options.enableThrottling || true;
    this.throttleDelay = options.throttleDelay || 100;
  }

  // إنشاء اتصال Socket.IO محسن
  connect(serverUrl: string, user: ChatUser): Promise<Socket> {
    return new Promise((resolve, reject) => {
      try {
        if (this.enableLogging) {
          console.log('🔌 جاري الاتصال بـ Socket.IO على:', serverUrl);
        }

        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: this.timeout,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectionAttempts,
          reconnectionDelay: this.reconnectionDelay,
          reconnectionDelayMax: 5000,
          maxReconnectionAttempts: this.maxReconnectionAttempts,
          autoConnect: true,
          forceNew: false,
          upgrade: true,
          rememberUpgrade: true,
          secure: true,
          rejectUnauthorized: false,
        });

        // إعداد مراقب الاتصال
        this.setupConnectionMonitoring();

        // إعداد مراقب الأخطاء
        this.setupErrorHandling();

        // إعداد مراقب الرسائل
        this.setupMessageHandling();

        // إرسال بيانات المصادقة
        this.socket.on('connect', () => {
          if (this.enableLogging) {
            console.log('✅ تم الاتصال بنجاح');
          }
          
          this.reconnectAttempts = 0;
          
          // إرسال بيانات المصادقة
          this.socket?.emit('auth', {
            userId: user.id,
            username: user.username,
            userType: user.userType
          });
          
          resolve(this.socket!);
        });

        this.socket.on('connect_error', (error) => {
          if (this.enableLogging) {
            console.error('❌ خطأ في الاتصال:', error);
          }
          reject(error);
        });

      } catch (error) {
        if (this.enableLogging) {
          console.error('❌ خطأ في إنشاء الاتصال:', error);
        }
        reject(error);
      }
    });
  }

  // إعداد مراقب الاتصال
  private setupConnectionMonitoring() {
    if (!this.socket) return;

    this.socket.on('disconnect', (reason) => {
      if (this.enableLogging) {
        console.log('🔌 انقطع الاتصال:', reason);
      }
      
      this.reconnectAttempts++;
      
      if (reason === 'io server disconnect') {
        // إعادة الاتصال يدوياً
        setTimeout(() => {
          this.socket?.connect();
        }, this.reconnectionDelay);
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      if (this.enableLogging) {
        console.log(`🔄 إعادة الاتصال #${attemptNumber}`);
      }
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      if (this.enableLogging) {
        console.log(`🔄 محاولة إعادة الاتصال #${attemptNumber}`);
      }
    });

    this.socket.on('reconnect_error', (error) => {
      if (this.enableLogging) {
        console.error('❌ خطأ في إعادة الاتصال:', error);
      }
    });

    this.socket.on('reconnect_failed', () => {
      if (this.enableLogging) {
        console.error('❌ فشل في إعادة الاتصال');
      }
    });
  }

  // إعداد معالجة الأخطاء
  private setupErrorHandling() {
    if (!this.socket) return;

    this.socket.on('error', (error) => {
      if (this.enableLogging) {
        console.error('❌ خطأ في Socket:', error);
      }
    });

    this.socket.on('connect_error', (error) => {
      if (this.enableLogging) {
        console.error('❌ خطأ في الاتصال:', error);
      }
    });
  }

  // إعداد معالجة الرسائل
  private setupMessageHandling() {
    if (!this.socket) return;

    this.socket.on('message', (data) => {
      if (this.enableLogging) {
        console.log('📨 استقبال رسالة:', data);
      }
    });
  }

  // إرسال رسالة مع throttling
  emit(event: string, data: any): boolean {
    if (!this.socket?.connected) {
      if (this.enableLogging) {
        console.warn('⚠️ Socket غير متصل، إضافة الرسالة للقائمة');
      }
      this.messageQueue.push({ event, data });
      return false;
    }

    if (this.enableThrottling) {
      const now = Date.now();
      if (now - this.lastMessageTime < this.throttleDelay) {
        if (this.enableLogging) {
          console.warn('⚠️ تم throttling الرسالة:', event);
        }
        return false;
      }
      this.lastMessageTime = now;
    }

    try {
      this.socket.emit(event, data);
      return true;
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ خطأ في إرسال الرسالة:', error);
      }
      return false;
    }
  }

  // معالجة قائمة الرسائل المعلقة
  private processMessageQueue() {
    if (this.isProcessingQueue || !this.socket?.connected) return;

    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.socket?.emit(message.event, message.data);
      }
    }

    this.isProcessingQueue = false;
  }

  // إضافة مراقب للرسائل
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // إزالة مراقب للرسائل
  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  // الحصول على حالة الاتصال
  get connected(): boolean {
    return this.socket?.connected || false;
  }

  // الحصول على معرف الاتصال
  get id(): string | undefined {
    return this.socket?.id;
  }

  // قطع الاتصال
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // تنظيف الموارد
  cleanup(): void {
    this.disconnect();
    this.messageQueue = [];
    this.reconnectAttempts = 0;
    this.lastMessageTime = 0;
  }
}

// Hook لاستخدام Socket.IO محسن
export function useOptimizedSocket(options: OptimizedSocketOptions = {}) {
  const socketManager = new OptimizedSocketManager(options);

  const connect = async (serverUrl: string, user: ChatUser) => {
    return socketManager.connect(serverUrl, user);
  };

  const emit = (event: string, data: any) => {
    return socketManager.emit(event, data);
  };

  const on = (event: string, callback: (...args: any[]) => void) => {
    socketManager.on(event, callback);
  };

  const off = (event: string, callback?: (...args: any[]) => void) => {
    socketManager.off(event, callback);
  };

  const disconnect = () => {
    socketManager.disconnect();
  };

  const cleanup = () => {
    socketManager.cleanup();
  };

  return {
    connect,
    emit,
    on,
    off,
    disconnect,
    cleanup,
    connected: socketManager.connected,
    id: socketManager.id,
  };
}

// مدير متعدد للاتصالات
export class MultiSocketManager {
  private connections = new Map<string, OptimizedSocketManager>();

  // إنشاء اتصال جديد
  createConnection(name: string, options: OptimizedSocketOptions = {}): OptimizedSocketManager {
    const manager = new OptimizedSocketManager(options);
    this.connections.set(name, manager);
    return manager;
  }

  // الحصول على اتصال
  getConnection(name: string): OptimizedSocketManager | undefined {
    return this.connections.get(name);
  }

  // قطع جميع الاتصالات
  disconnectAll(): void {
    this.connections.forEach(manager => {
      manager.disconnect();
    });
  }

  // تنظيف جميع الاتصالات
  cleanupAll(): void {
    this.connections.forEach(manager => {
      manager.cleanup();
    });
    this.connections.clear();
  }

  // الحصول على عدد الاتصالات النشطة
  get activeConnections(): number {
    return Array.from(this.connections.values()).filter(manager => manager.connected).length;
  }
}

// تصدير المدير المتعدد
export const multiSocketManager = new MultiSocketManager();