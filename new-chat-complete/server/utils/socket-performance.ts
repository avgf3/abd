/**
 * نظام مراقبة وتحسين أداء Socket.IO
 */

interface SocketMetrics {
  connections: number;
  totalMessages: number;
  messagesPerSecond: number;
  averageLatency: number;
  reconnections: number;
  errors: number;
  lastUpdated: Date;
}

interface ConnectionInfo {
  id: string;
  userId?: number;
  connectedAt: Date;
  lastPing: Date;
  latency: number;
  messageCount: number;
  transport: 'websocket' | 'polling';
}

class SocketPerformanceMonitor {
  private metrics: SocketMetrics = {
    connections: 0,
    totalMessages: 0,
    messagesPerSecond: 0,
    averageLatency: 0,
    reconnections: 0,
    errors: 0,
    lastUpdated: new Date(),
  };

  private connections = new Map<string, ConnectionInfo>();
  private messageHistory: number[] = [];
  private latencyHistory: number[] = [];
  private readonly MAX_HISTORY = 60; // الاحتفاظ بآخر 60 ثانية

  constructor() {
    // تنظيف البيانات القديمة كل دقيقة
    setInterval(() => {
      this.cleanupOldData();
      this.updateMetrics();
    }, 60000);

    // تحديث معدل الرسائل كل ثانية
    setInterval(() => {
      this.updateMessagesPerSecond();
    }, 1000);
  }

  // تسجيل اتصال جديد
  onConnection(socketId: string, transport: 'websocket' | 'polling') {
    this.connections.set(socketId, {
      id: socketId,
      connectedAt: new Date(),
      lastPing: new Date(),
      latency: 0,
      messageCount: 0,
      transport,
    });
    this.metrics.connections = this.connections.size;
    
    console.log(`🔗 اتصال جديد: ${socketId} عبر ${transport} (إجمالي: ${this.metrics.connections})`);
  }

  // تسجيل انقطاع اتصال
  onDisconnection(socketId: string, reason: string) {
    const connection = this.connections.get(socketId);
    if (connection) {
      const duration = Date.now() - connection.connectedAt.getTime();
      console.log(`❌ انقطاع اتصال: ${socketId} بعد ${Math.round(duration / 1000)}s - السبب: ${reason}`);
      
      this.connections.delete(socketId);
      this.metrics.connections = this.connections.size;
    }
  }

  // تسجيل إعادة اتصال
  onReconnection(socketId: string) {
    this.metrics.reconnections++;
    console.log(`🔄 إعادة اتصال: ${socketId} (إجمالي: ${this.metrics.reconnections})`);
  }

  // تسجيل رسالة
  onMessage(socketId: string, eventName: string) {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.messageCount++;
      connection.lastPing = new Date();
    }
    
    this.metrics.totalMessages++;
    this.messageHistory.push(Date.now());
  }

  // تسجيل ping/pong للكمون
  onPing(socketId: string, latency: number) {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.latency = latency;
      connection.lastPing = new Date();
    }
    
    this.latencyHistory.push(latency);
    if (this.latencyHistory.length > this.MAX_HISTORY) {
      this.latencyHistory.shift();
    }
  }

  // تسجيل خطأ
  onError(socketId: string, error: string) {
    this.metrics.errors++;
    console.error(`⚠️ خطأ Socket.IO [${socketId}]: ${error}`);
  }

  // تحديث معدل الرسائل في الثانية
  private updateMessagesPerSecond() {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // عد الرسائل في الثانية الماضية
    const recentMessages = this.messageHistory.filter(time => time >= oneSecondAgo);
    this.metrics.messagesPerSecond = recentMessages.length;
  }

  // تنظيف البيانات القديمة
  private cleanupOldData() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // تنظيف تاريخ الرسائل
    this.messageHistory = this.messageHistory.filter(time => time >= oneMinuteAgo);
    
    // تنظيف الاتصالات المنقطعة منذ أكثر من 5 دقائق
    const fiveMinutesAgo = now - 300000;
    for (const [socketId, connection] of this.connections.entries()) {
      if (connection.lastPing.getTime() < fiveMinutesAgo) {
        console.warn(`🧹 تنظيف اتصال قديم: ${socketId}`);
        this.connections.delete(socketId);
      }
    }
  }

  // تحديث المقاييس
  private updateMetrics() {
    this.metrics.connections = this.connections.size;
    
    // حساب متوسط الكمون
    if (this.latencyHistory.length > 0) {
      const sum = this.latencyHistory.reduce((a, b) => a + b, 0);
      this.metrics.averageLatency = Math.round(sum / this.latencyHistory.length);
    }
    
    this.metrics.lastUpdated = new Date();
  }

  // الحصول على المقاييس الحالية
  getMetrics(): SocketMetrics {
    return { ...this.metrics };
  }

  // الحصول على معلومات الاتصالات النشطة
  getActiveConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  // الحصول على إحصائيات النقل
  getTransportStats() {
    const stats = { websocket: 0, polling: 0 };
    for (const connection of this.connections.values()) {
      stats[connection.transport]++;
    }
    return stats;
  }

  // فحص صحة الاتصالات
  getHealthStatus() {
    const totalConnections = this.metrics.connections;
    const avgLatency = this.metrics.averageLatency;
    const errorRate = this.metrics.errors / Math.max(this.metrics.totalMessages, 1);
    
    let status = 'healthy';
    const issues: string[] = [];
    
    if (avgLatency > 1000) {
      status = 'warning';
      issues.push(`كمون عالي: ${avgLatency}ms`);
    }
    
    if (errorRate > 0.05) { // أكثر من 5% أخطاء
      status = 'critical';
      issues.push(`معدل أخطاء عالي: ${(errorRate * 100).toFixed(1)}%`);
    }
    
    if (totalConnections > 1000) {
      status = 'warning';
      issues.push(`عدد اتصالات عالي: ${totalConnections}`);
    }
    
    return {
      status,
      issues,
      metrics: this.getMetrics(),
      transportStats: this.getTransportStats(),
    };
  }

  // طباعة تقرير الأداء
  printPerformanceReport() {
    const metrics = this.getMetrics();
    const transportStats = this.getTransportStats();
    
    console.log('\n📊 تقرير أداء Socket.IO:');
    console.log(`🔗 الاتصالات النشطة: ${metrics.connections}`);
    console.log(`📨 إجمالي الرسائل: ${metrics.totalMessages}`);
    console.log(`⚡ رسائل/ثانية: ${metrics.messagesPerSecond}`);
    console.log(`⏱️ متوسط الكمون: ${metrics.averageLatency}ms`);
    console.log(`🔄 إعادة الاتصالات: ${metrics.reconnections}`);
    console.log(`❌ الأخطاء: ${metrics.errors}`);
    console.log(`🌐 WebSocket: ${transportStats.websocket}, Polling: ${transportStats.polling}`);
    console.log(`🕒 آخر تحديث: ${metrics.lastUpdated.toISOString()}\n`);
  }
}

// إنشاء مثيل واحد
export const socketPerformanceMonitor = new SocketPerformanceMonitor();

// تصدير دالة لإعداد المراقبة
export function setupSocketMonitoring(io: any) {
  io.on('connection', (socket: any) => {
    const transport = socket.conn.transport.name;
    socketPerformanceMonitor.onConnection(socket.id, transport);
    
    // مراقبة تغيير النقل
    socket.conn.on('upgrade', () => {
      const newTransport = socket.conn.transport.name;
      console.log(`🚀 ترقية النقل: ${socket.id} إلى ${newTransport}`);
    });
    
    // مراقبة الرسائل
    const originalEmit = socket.emit;
    socket.emit = function(...args: any[]) {
      socketPerformanceMonitor.onMessage(socket.id, args[0]);
      return originalEmit.apply(socket, args);
    };
    
    // مراقبة ping/pong
    socket.on('pong', (latency: number) => {
      socketPerformanceMonitor.onPing(socket.id, latency);
    });
    
    // مراقبة الأخطاء
    socket.on('error', (error: any) => {
      socketPerformanceMonitor.onError(socket.id, error.message || error);
    });
    
    // مراقبة الانقطاع
    socket.on('disconnect', (reason: string) => {
      socketPerformanceMonitor.onDisconnection(socket.id, reason);
    });
    
    // مراقبة إعادة الاتصال
    socket.on('reconnect', () => {
      socketPerformanceMonitor.onReconnection(socket.id);
    });
  });
  
  // طباعة تقرير دوري كل 5 دقائق
  setInterval(() => {
    socketPerformanceMonitor.printPerformanceReport();
  }, 300000);
}