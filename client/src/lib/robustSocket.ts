/**
 * إدارة اتصال Socket.IO محسّن مع آلية إعادة اتصال قوية
 */

import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { getSession, saveSession } from './socket';

interface ConnectionState {
  connected: boolean;
  reconnecting: boolean;
  attempts: number;
  lastError?: Error;
}

interface RobustSocketOptions {
  url?: string;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  reconnectMultiplier?: number;
  maxReconnectInterval?: number;
  onStateChange?: (state: ConnectionState) => void;
  onReconnectAttempt?: (attempt: number) => void;
  onError?: (error: Error) => void;
}

export class RobustSocketManager {
  private socket: Socket | null = null;
  private options: Required<RobustSocketOptions>;
  private state: ConnectionState = {
    connected: false,
    reconnecting: false,
    attempts: 0
  };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private listeners = new Map<string, Set<Function>>();
  private queuedEmits: Array<{ event: string; data: any }> = [];

  constructor(options: RobustSocketOptions = {}) {
    this.options = {
      url: this.getServerUrl(),
      maxReconnectAttempts: Infinity,
      reconnectInterval: 1000,
      reconnectMultiplier: 1.5,
      maxReconnectInterval: 30000,
      onStateChange: () => {},
      onReconnectAttempt: () => {},
      onError: () => {},
      ...options
    };
  }

  /**
   * الحصول على عنوان الخادم
   */
  private getServerUrl(): string {
    try {
      const isDev = (import.meta as any)?.env?.DEV;
      if (isDev) return 'http://localhost:5000';
      return window.location.origin;
    } catch {
      return window.location.origin;
    }
  }

  /**
   * إنشاء اتصال جديد
   */
  connect(): void {
    if (this.socket?.connected) return;

    this.cleanup();
    
    const deviceId = this.getDeviceId();
    
    this.socket = io(this.options.url, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      upgrade: true,
      reconnection: false, // نتحكم في إعادة الاتصال يدوياً
      timeout: 20000,
      forceNew: true,
      withCredentials: true,
      auth: { deviceId },
      extraHeaders: { 'x-device-id': deviceId },
    });

    this.setupEventHandlers();
    this.startHeartbeat();
  }

  /**
   * إعداد معالجات الأحداث
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // معالج الاتصال
    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
      this.updateState({
        connected: true,
        reconnecting: false,
        attempts: 0
      });

      // إعادة المصادقة
      this.authenticate();

      // إرسال الرسائل المؤجلة
      this.flushQueuedEmits();
    });

    // معالج قطع الاتصال
    this.socket.on('disconnect', (reason) => {
      console.warn('❌ Socket disconnected:', reason);
      this.updateState({
        connected: false,
        reconnecting: true
      });

      // إعادة الاتصال إذا لم يكن السبب من جهة المستخدم
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    // معالج الأخطاء
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.updateState({
        connected: false,
        reconnecting: true,
        lastError: error
      });
      this.options.onError(error);
    });

    // معالج heartbeat
    this.socket.on('pong', () => {
      // تم استلام استجابة heartbeat
    });

    // إعادة توجيه الأحداث المسجلة
    this.listeners.forEach((handlers, event) => {
      handlers.forEach(handler => {
        this.socket!.on(event, handler as any);
      });
    });
  }

  /**
   * آلية heartbeat للتحقق من الاتصال
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
        
        // التحقق من الاستجابة بعد 5 ثواني
        setTimeout(() => {
          if (this.socket?.connected && !this.state.reconnecting) {
            // لم نستلم استجابة، نعتبر الاتصال مقطوع
            console.warn('Heartbeat timeout, reconnecting...');
            this.socket.disconnect();
            this.scheduleReconnect();
          }
        }, 5000);
      }
    }, 30000); // كل 30 ثانية
  }

  /**
   * إيقاف heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * جدولة إعادة الاتصال
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    const attempt = this.state.attempts + 1;
    
    if (attempt > this.options.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.updateState({
        reconnecting: false,
        lastError: new Error('Max reconnection attempts reached')
      });
      return;
    }

    // حساب التأخير التصاعدي
    const delay = Math.min(
      this.options.reconnectInterval * Math.pow(this.options.reconnectMultiplier, attempt - 1),
      this.options.maxReconnectInterval
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${attempt})`);
    this.options.onReconnectAttempt(attempt);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.updateState({ attempts: attempt });
      this.connect();
    }, delay);
  }

  /**
   * إلغاء إعادة الاتصال المجدولة
   */
  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * المصادقة التلقائية
   */
  private authenticate(): void {
    const session = getSession();
    if (!session.userId && !session.username) return;

    this.emit('auth', {
      userId: session.userId,
      username: session.username,
      userType: session.userType,
      token: session.token,
      reconnect: this.state.attempts > 0
    });

    // الانضمام للغرفة
    const roomId = session.roomId || 'general';
    this.emit('joinRoom', {
      roomId,
      userId: session.userId,
      username: session.username
    });
  }

  /**
   * تحديث حالة الاتصال
   */
  private updateState(partial: Partial<ConnectionState>): void {
    this.state = { ...this.state, ...partial };
    this.options.onStateChange(this.state);
  }

  /**
   * الحصول على معرف الجهاز
   */
  private getDeviceId(): string {
    try {
      const existing = localStorage.getItem('deviceId');
      if (existing) return existing;
      const id = 'web-' + Math.random().toString(36).slice(2);
      localStorage.setItem('deviceId', id);
      return id;
    } catch {
      return 'web-unknown';
    }
  }

  /**
   * تسجيل مستمع للأحداث
   */
  on(event: string, handler: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(handler);
    
    // إضافة للsocket إذا كان متصل
    if (this.socket?.connected) {
      this.socket.on(event, handler as any);
    }
  }

  /**
   * إلغاء تسجيل مستمع
   */
  off(event: string, handler: Function): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
    
    if (this.socket) {
      this.socket.off(event, handler as any);
    }
  }

  /**
   * إرسال حدث
   */
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      // حفظ في القائمة المؤجلة
      this.queuedEmits.push({ event, data });
    }
  }

  /**
   * إرسال الأحداث المؤجلة
   */
  private flushQueuedEmits(): void {
    while (this.queuedEmits.length > 0) {
      const { event, data } = this.queuedEmits.shift()!;
      this.socket?.emit(event, data);
    }
  }

  /**
   * قطع الاتصال
   */
  disconnect(): void {
    this.cancelReconnect();
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.updateState({
      connected: false,
      reconnecting: false,
      attempts: 0
    });
  }

  /**
   * تنظيف الموارد
   */
  private cleanup(): void {
    this.cancelReconnect();
    this.stopHeartbeat();
    this.queuedEmits = [];
    
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * الحصول على حالة الاتصال
   */
  getState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * التحقق من الاتصال
   */
  isConnected(): boolean {
    return this.state.connected;
  }
}

// مثيل واحد للاستخدام العام
let socketManager: RobustSocketManager | null = null;

export function getRobustSocket(): RobustSocketManager {
  if (!socketManager) {
    socketManager = new RobustSocketManager({
      onStateChange: (state) => {
        // يمكن إضافة معالج عام لتغييرات الحالة
        console.log('Socket state:', state);
      },
      onError: (error) => {
        console.error('Socket error:', error);
      }
    });
  }
  
  return socketManager;
}

/**
 * Hook لاستخدام Socket مع React
 */
import { useEffect, useState, useCallback } from 'react';

export function useRobustSocket() {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    connected: false,
    reconnecting: false,
    attempts: 0
  });
  
  const socketManager = getRobustSocket();

  useEffect(() => {
    const handleStateChange = (state: ConnectionState) => {
      setConnectionState(state);
    };

    // الاشتراك في تغييرات الحالة
    const originalOnStateChange = socketManager['options'].onStateChange;
    socketManager['options'].onStateChange = (state) => {
      originalOnStateChange(state);
      handleStateChange(state);
    };

    // الاتصال إذا لم يكن متصلاً
    if (!socketManager.isConnected()) {
      socketManager.connect();
    }

    return () => {
      // إعادة المعالج الأصلي
      socketManager['options'].onStateChange = originalOnStateChange;
    };
  }, [socketManager]);

  const on = useCallback((event: string, handler: Function) => {
    socketManager.on(event, handler);
    return () => socketManager.off(event, handler);
  }, [socketManager]);

  const emit = useCallback((event: string, data?: any) => {
    socketManager.emit(event, data);
  }, [socketManager]);

  return {
    connected: connectionState.connected,
    reconnecting: connectionState.reconnecting,
    attempts: connectionState.attempts,
    on,
    emit,
    socketManager
  };
}