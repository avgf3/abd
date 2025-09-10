/**
 * نظام إدارة وحد الاتصالات المتزامنة لدعم 3000 متصل
 */

import type { Server as SocketIOServer } from 'socket.io';

interface ConnectionStats {
  total: number;
  byIP: Map<string, number>;
  byRoom: Map<string, number>;
  startTime: number;
  lastCleanup: number;
}

class ConnectionLimiter {
  private stats: ConnectionStats;
  private readonly maxTotalConnections: number;
  private readonly maxConnectionsPerIP: number;
  private readonly cleanupInterval: number;

  constructor(maxTotal = 3000, maxPerIP = 50) {
    this.maxTotalConnections = maxTotal;
    this.maxConnectionsPerIP = maxPerIP;
    this.cleanupInterval = 5 * 60 * 1000; // 5 دقائق

    this.stats = {
      total: 0,
      byIP: new Map(),
      byRoom: new Map(),
      startTime: Date.now(),
      lastCleanup: Date.now(),
    };

    // تنظيف دوري للبيانات القديمة
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  /**
   * فحص إمكانية قبول اتصال جديد
   */
  canAcceptConnection(ip: string): { allowed: boolean; reason?: string } {
    // فحص الحد الإجمالي
    if (this.stats.total >= this.maxTotalConnections) {
      return {
        allowed: false,
        reason: `تم الوصول للحد الأقصى من الاتصالات (${this.maxTotalConnections})`,
      };
    }

    // فحص الحد لكل IP
    const ipConnections = this.stats.byIP.get(ip) || 0;
    if (ipConnections >= this.maxConnectionsPerIP) {
      return {
        allowed: false,
        reason: `تم تجاوز حد الاتصالات لهذا العنوان (${this.maxConnectionsPerIP})`,
      };
    }

    return { allowed: true };
  }

  /**
   * تسجيل اتصال جديد
   */
  addConnection(ip: string, roomId?: string): void {
    this.stats.total++;
    this.stats.byIP.set(ip, (this.stats.byIP.get(ip) || 0) + 1);
    
    if (roomId) {
      this.stats.byRoom.set(roomId, (this.stats.byRoom.get(roomId) || 0) + 1);
    }

    console.log(`🔗 اتصال جديد من ${ip} (إجمالي: ${this.stats.total})`);
  }

  /**
   * إزالة اتصال
   */
  removeConnection(ip: string, roomId?: string): void {
    if (this.stats.total > 0) {
      this.stats.total--;
    }

    const ipCount = this.stats.byIP.get(ip) || 0;
    if (ipCount > 1) {
      this.stats.byIP.set(ip, ipCount - 1);
    } else {
      this.stats.byIP.delete(ip);
    }

    if (roomId) {
      const roomCount = this.stats.byRoom.get(roomId) || 0;
      if (roomCount > 1) {
        this.stats.byRoom.set(roomId, roomCount - 1);
      } else {
        this.stats.byRoom.delete(roomId);
      }
    }

    console.log(`👋 انقطع اتصال من ${ip} (إجمالي: ${this.stats.total})`);
  }

  /**
   * الحصول على إحصائيات الاتصالات
   */
  getStats(): {
    total: number;
    maxTotal: number;
    topIPs: Array<{ ip: string; connections: number }>;
    topRooms: Array<{ room: string; connections: number }>;
    uptime: number;
  } {
    const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);

    // أعلى 10 عناوين IP
    const topIPs = Array.from(this.stats.byIP.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, connections]) => ({ ip, connections }));

    // أعلى 10 غرف
    const topRooms = Array.from(this.stats.byRoom.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([room, connections]) => ({ room, connections }));

    return {
      total: this.stats.total,
      maxTotal: this.maxTotalConnections,
      topIPs,
      topRooms,
      uptime,
    };
  }

  /**
   * تنظيف البيانات القديمة
   */
  private cleanup(): void {
    const now = Date.now();
    
    // إزالة IPs بدون اتصالات
    for (const [ip, count] of this.stats.byIP.entries()) {
      if (count <= 0) {
        this.stats.byIP.delete(ip);
      }
    }

    // إزالة الغرف الفارغة
    for (const [room, count] of this.stats.byRoom.entries()) {
      if (count <= 0) {
        this.stats.byRoom.delete(room);
      }
    }

    this.stats.lastCleanup = now;
    console.log(`🧹 تنظيف إحصائيات الاتصالات - IPs: ${this.stats.byIP.size}, Rooms: ${this.stats.byRoom.size}`);
  }

  /**
   * تقرير مفصل عن حالة النظام
   */
  getHealthReport(): {
    status: 'healthy' | 'warning' | 'critical';
    usage: number; // نسبة الاستخدام من الحد الأقصى
    issues: string[];
    recommendations: string[];
  } {
    const usage = (this.stats.total / this.maxTotalConnections) * 100;
    const issues: string[] = [];
    const recommendations: string[] = [];

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (usage > 90) {
      status = 'critical';
      issues.push(`استخدام عالي جداً: ${usage.toFixed(1)}%`);
      recommendations.push('زيادة عدد الخوادم أو تحسين الموارد');
    } else if (usage > 75) {
      status = 'warning';
      issues.push(`استخدام عالي: ${usage.toFixed(1)}%`);
      recommendations.push('مراقبة مستمرة ومراجعة الأداء');
    }

    // فحص IPs مع اتصالات كثيرة
    for (const [ip, count] of this.stats.byIP.entries()) {
      if (count > this.maxConnectionsPerIP * 0.8) {
        issues.push(`IP عالي الاستخدام: ${ip} (${count} اتصال)`);
      }
    }

    return {
      status,
      usage: Math.round(usage),
      issues,
      recommendations,
    };
  }
}

// إنشاء instance واحد للاستخدام العام
export const connectionLimiter = new ConnectionLimiter(
  parseInt(process.env.MAX_CONCURRENT_CONNECTIONS || '6000'),
  parseInt(process.env.MAX_CONNECTIONS_PER_IP || '100')
);

/**
 * إعداد نظام إدارة الاتصالات مع Socket.IO
 */
export function setupConnectionLimiter(io: SocketIOServer): void {
  io.engine.on('connection_error', (err) => {
    console.error('❌ خطأ في اتصال Socket.IO:', {
      req: err.req?.url,
      code: err.code,
      message: err.message,
      context: err.context,
    });
  });

  // مراقبة الاتصالات الجديدة
  io.on('connection', (socket) => {
    const clientIP = socket.handshake.address || 'unknown';
    
    // فحص الحدود قبل قبول الاتصال
    const check = connectionLimiter.canAcceptConnection(clientIP);
    if (!check.allowed) {
      console.warn(`🚫 رفض اتصال من ${clientIP}: ${check.reason}`);
      socket.emit('error', {
        type: 'connection_limit',
        message: check.reason,
      });
      socket.disconnect(true);
      return;
    }

    // تسجيل الاتصال
    connectionLimiter.addConnection(clientIP);

    // مراقبة انضمام الغرف
    socket.on('joinRoom', (data) => {
      const roomId = data?.roomId;
      if (roomId) {
        connectionLimiter.addConnection(clientIP, roomId);
      }
    });

    // إزالة الاتصال عند القطع
    socket.on('disconnect', () => {
      connectionLimiter.removeConnection(clientIP);
    });
  });

  // تقرير دوري كل 5 دقائق
  setInterval(() => {
    const stats = connectionLimiter.getStats();
    const health = connectionLimiter.getHealthReport();
    
    console.log(`📊 إحصائيات الاتصالات: ${stats.total}/${stats.maxTotal} (${health.usage}%)`);
    
    if (health.status !== 'healthy') {
      console.warn(`⚠️ حالة النظام: ${health.status}`);
      health.issues.forEach(issue => console.warn(`  - ${issue}`));
    }
  }, 5 * 60 * 1000);
}