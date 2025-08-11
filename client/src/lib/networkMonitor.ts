// مراقب الشبكة لتحسين إدارة الاتصال
export class NetworkMonitor {
  private isOnline = navigator.onLine;
  private listeners: Set<(online: boolean) => void> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck = Date.now();
  
  constructor() {
    // الاستماع لأحداث الشبكة
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // فحص دوري للاتصال
    this.checkInterval = setInterval(() => {
      this.checkConnectivity();
    }, 5000);
  }
  
  private handleOnline = () => {
    console.log('🌐 الشبكة متصلة');
    this.isOnline = true;
    this.notifyListeners(true);
  };
  
  private handleOffline = () => {
    console.log('📵 الشبكة منقطعة');
    this.isOnline = false;
    this.notifyListeners(false);
  };
  
  private async checkConnectivity() {
    // تجنب الفحص المتكرر
    if (Date.now() - this.lastHealthCheck < 4000) return;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      this.lastHealthCheck = Date.now();
      
      if (!this.isOnline && response.ok) {
        this.handleOnline();
      }
    } catch (error) {
      if (this.isOnline) {
        // قد تكون الشبكة منقطعة
        this.handleOffline();
      }
    }
  }
  
  subscribe(callback: (online: boolean) => void) {
    this.listeners.add(callback);
    // إشعار المستمع الجديد بالحالة الحالية
    callback(this.isOnline);
    
    return () => this.listeners.delete(callback);
  }
  
  private notifyListeners(online: boolean) {
    this.listeners.forEach(cb => {
      try {
        cb(online);
      } catch (error) {
        console.error('خطأ في مستمع الشبكة:', error);
      }
    });
  }
  
  getStatus() {
    return this.isOnline;
  }
  
  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    this.listeners.clear();
  }
}

// مثيل مشترك
let networkMonitorInstance: NetworkMonitor | null = null;

export function getNetworkMonitor(): NetworkMonitor {
  if (!networkMonitorInstance) {
    networkMonitorInstance = new NetworkMonitor();
  }
  return networkMonitorInstance;
}