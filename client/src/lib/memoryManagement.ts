/**
 * أدوات إدارة الذاكرة ومنع التسريبات
 */

/**
 * مدير تنظيف الموارد
 */
export class CleanupManager {
  private cleanupFunctions: Set<() => void> = new Set();
  private timeouts: Set<NodeJS.Timeout> = new Set();
  private intervals: Set<NodeJS.Timeout> = new Set();
  private eventListeners: Array<{
    target: EventTarget;
    type: string;
    listener: EventListener;
    options?: boolean | AddEventListenerOptions;
  }> = [];

  /**
   * إضافة دالة تنظيف
   */
  addCleanup(cleanup: () => void): void {
    this.cleanupFunctions.add(cleanup);
  }

  /**
   * إضافة timeout مع تتبع تلقائي
   */
  setTimeout(
    callback: () => void,
    delay: number
  ): NodeJS.Timeout {
    const timeout = setTimeout(() => {
      callback();
      this.timeouts.delete(timeout);
    }, delay);
    
    this.timeouts.add(timeout);
    return timeout;
  }

  /**
   * إضافة interval مع تتبع تلقائي
   */
  setInterval(
    callback: () => void,
    delay: number
  ): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    this.intervals.add(interval);
    return interval;
  }

  /**
   * إضافة event listener مع تتبع تلقائي
   */
  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(type, listener, options);
    this.eventListeners.push({ target, type, listener, options });
  }

  /**
   * إزالة timeout محدد
   */
  clearTimeout(timeout: NodeJS.Timeout): void {
    clearTimeout(timeout);
    this.timeouts.delete(timeout);
  }

  /**
   * إزالة interval محدد
   */
  clearInterval(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    this.intervals.delete(interval);
  }

  /**
   * تنظيف جميع الموارد
   */
  cleanup(): void {
    // تنظيف timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();

    // تنظيف intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();

    // تنظيف event listeners
    this.eventListeners.forEach(({ target, type, listener, options }) => {
      target.removeEventListener(type, listener, options);
    });
    this.eventListeners = [];

    // تنظيف دوال التنظيف المخصصة
    this.cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
    this.cleanupFunctions.clear();
  }
}

/**
 * Hook لإدارة التنظيف في React components
 */
import { useEffect, useRef } from 'react';

export function useCleanup() {
  const managerRef = useRef<CleanupManager | null>(null);

  useEffect(() => {
    managerRef.current = new CleanupManager();

    return () => {
      managerRef.current?.cleanup();
      managerRef.current = null;
    };
  }, []);

  return managerRef.current!;
}

/**
 * مراقب استخدام الذاكرة
 */
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private checkInterval: NodeJS.Timeout | null = null;
  private warningThreshold = 0.8; // 80% من الذاكرة المتاحة
  private criticalThreshold = 0.9; // 90% من الذاكرة المتاحة

  private constructor() {}

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  /**
   * بدء مراقبة الذاكرة
   */
  startMonitoring(interval: number = 30000): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, interval);

    // فحص فوري
    this.checkMemoryUsage();
  }

  /**
   * إيقاف المراقبة
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * فحص استخدام الذاكرة
   */
  private checkMemoryUsage(): void {
    if (!('memory' in performance)) return;

    const memInfo = (performance as any).memory;
    const usageRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;

    if (usageRatio > this.criticalThreshold) {
      console.error('🚨 Critical memory usage:', {
        used: this.formatBytes(memInfo.usedJSHeapSize),
        total: this.formatBytes(memInfo.jsHeapSizeLimit),
        ratio: `${(usageRatio * 100).toFixed(1)}%`
      });
      
      // محاولة تنظيف الذاكرة
      this.attemptMemoryCleanup();
    } else if (usageRatio > this.warningThreshold) {
      console.warn('⚠️ High memory usage:', {
        used: this.formatBytes(memInfo.usedJSHeapSize),
        total: this.formatBytes(memInfo.jsHeapSizeLimit),
        ratio: `${(usageRatio * 100).toFixed(1)}%`
      });
    }
  }

  /**
   * محاولة تنظيف الذاكرة
   */
  private attemptMemoryCleanup(): void {
    // إرسال حدث مخصص للتطبيق للقيام بتنظيف
    window.dispatchEvent(new CustomEvent('memory-pressure', {
      detail: { level: 'critical' }
    }));

    // محاولة جمع القمامة إذا كانت متاحة
    if ('gc' in window) {
      try {
        (window as any).gc();
        console.log('Manual garbage collection triggered');
      } catch (error) {
        console.error('Failed to trigger garbage collection:', error);
      }
    }
  }

  /**
   * تنسيق البايتات إلى وحدة قابلة للقراءة
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

/**
 * مدير ذاكرة تخزين الرسائل
 */
export class MessageCache {
  private cache = new Map<string, any[]>();
  private maxMessagesPerRoom = 500;
  private maxRooms = 10;

  /**
   * إضافة رسائل إلى الذاكرة المؤقتة
   */
  addMessages(roomId: string, messages: any[]): void {
    let roomMessages = this.cache.get(roomId) || [];
    
    // دمج الرسائل الجديدة
    roomMessages = [...roomMessages, ...messages];
    
    // الاحتفاظ بآخر N رسالة فقط
    if (roomMessages.length > this.maxMessagesPerRoom) {
      roomMessages = roomMessages.slice(-this.maxMessagesPerRoom);
    }
    
    this.cache.set(roomId, roomMessages);
    
    // تنظيف الغرف القديمة إذا تجاوزنا الحد
    this.cleanupOldRooms();
  }

  /**
   * الحصول على رسائل غرفة
   */
  getMessages(roomId: string): any[] {
    return this.cache.get(roomId) || [];
  }

  /**
   * تنظيف الغرف القديمة
   */
  private cleanupOldRooms(): void {
    if (this.cache.size <= this.maxRooms) return;
    
    // حذف أقدم الغرف
    const roomsToDelete = this.cache.size - this.maxRooms;
    const iterator = this.cache.keys();
    
    for (let i = 0; i < roomsToDelete; i++) {
      const oldestRoom = iterator.next().value;
      this.cache.delete(oldestRoom);
    }
  }

  /**
   * مسح ذاكرة غرفة محددة
   */
  clearRoom(roomId: string): void {
    this.cache.delete(roomId);
  }

  /**
   * مسح كل الذاكرة المؤقتة
   */
  clearAll(): void {
    this.cache.clear();
  }
}

/**
 * Hook لتنظيف الذاكرة عند الضغط
 */
export function useMemoryPressure(onPressure: () => void) {
  useEffect(() => {
    const handleMemoryPressure = (event: CustomEvent) => {
      if (event.detail.level === 'critical') {
        onPressure();
      }
    };

    window.addEventListener('memory-pressure', handleMemoryPressure as EventListener);
    
    return () => {
      window.removeEventListener('memory-pressure', handleMemoryPressure as EventListener);
    };
  }, [onPressure]);
}

// بدء مراقبة الذاكرة تلقائياً
if (typeof window !== 'undefined') {
  MemoryMonitor.getInstance().startMonitoring();
}