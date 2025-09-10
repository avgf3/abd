/**
 * 🔍 نظام مراقبة الاتصالات وتشخيص مشاكل قوائم المستخدمين
 */

interface ConnectionStats {
  totalConnections: number;
  authenticatedUsers: number;
  usersInRooms: number;
  orphanedConnections: number;
  reconnectionEvents: number;
  joinFailures: number;
  lastUpdated: Date;
}

interface UserConnectionInfo {
  userId: number;
  username: string;
  socketCount: number;
  rooms: string[];
  lastSeen: Date;
  isAuthenticated: boolean;
  reconnectCount: number;
}

class ConnectionMonitor {
  private stats: ConnectionStats = {
    totalConnections: 0,
    authenticatedUsers: 0,
    usersInRooms: 0,
    orphanedConnections: 0,
    reconnectionEvents: 0,
    joinFailures: 0,
    lastUpdated: new Date(),
  };

  private userConnections = new Map<number, UserConnectionInfo>();

  // تسجيل حدث الاتصال
  logConnection(userId: number, username: string, isReconnect: boolean = false) {
    this.stats.totalConnections++;
    if (isReconnect) {
      this.stats.reconnectionEvents++;
    }

    const existing = this.userConnections.get(userId);
    if (existing) {
      existing.socketCount++;
      existing.lastSeen = new Date();
      existing.reconnectCount += isReconnect ? 1 : 0;
    } else {
      this.userConnections.set(userId, {
        userId,
        username,
        socketCount: 1,
        rooms: [],
        lastSeen: new Date(),
        isAuthenticated: false,
        reconnectCount: isReconnect ? 1 : 0,
      });
    }

    this.updateStats();
    console.log(`📊 اتصال جديد: ${username} (إعادة اتصال: ${isReconnect})`);
  }

  // تسجيل المصادقة الناجحة
  logAuthentication(userId: number) {
    const user = this.userConnections.get(userId);
    if (user && !user.isAuthenticated) {
      user.isAuthenticated = true;
      this.stats.authenticatedUsers++;
      console.log(`🔐 مصادقة ناجحة: ${user.username}`);
    }
  }

  // تسجيل الانضمام للغرفة
  logRoomJoin(userId: number, roomId: string, success: boolean) {
    const user = this.userConnections.get(userId);
    if (user) {
      if (success) {
        if (!user.rooms.includes(roomId)) {
          user.rooms.push(roomId);
        }
        console.log(`🚪 انضمام ناجح: ${user.username} → ${roomId}`);
      } else {
        this.stats.joinFailures++;
        console.warn(`❌ فشل الانضمام: ${user.username} → ${roomId}`);
      }
    }
    this.updateStats();
  }

  // تسجيل قطع الاتصال
  logDisconnection(userId: number) {
    const user = this.userConnections.get(userId);
    if (user) {
      user.socketCount = Math.max(0, user.socketCount - 1);
      
      if (user.socketCount === 0) {
        this.userConnections.delete(userId);
        if (user.isAuthenticated) {
          this.stats.authenticatedUsers--;
        }
        console.log(`📤 انقطاع كامل: ${user.username}`);
      }
    }
    this.updateStats();
  }

  // كشف الاتصالات المعلقة
  detectOrphanedConnections() {
    const now = Date.now();
    const ORPHAN_THRESHOLD = 60000; // دقيقة واحدة
    let orphanedCount = 0;

    for (const [userId, user] of this.userConnections) {
      const timeSinceLastSeen = now - user.lastSeen.getTime();
      
      // اتصال معلق: مصادق لكن لم يدخل أي غرفة منذ فترة طويلة
      if (user.isAuthenticated && user.rooms.length === 0 && timeSinceLastSeen > ORPHAN_THRESHOLD) {
        orphanedCount++;
        console.warn(`⚠️ اتصال معلق: ${user.username} (${Math.round(timeSinceLastSeen / 1000)}s)`);
      }
    }

    this.stats.orphanedConnections = orphanedCount;
    return orphanedCount;
  }

  // تحديث الإحصائيات
  private updateStats() {
    this.stats.usersInRooms = Array.from(this.userConnections.values())
      .filter(user => user.rooms.length > 0).length;
    this.stats.lastUpdated = new Date();
  }

  // الحصول على الإحصائيات
  getStats(): ConnectionStats {
    this.detectOrphanedConnections();
    return { ...this.stats };
  }

  // الحصول على تفاصيل المستخدمين
  getUserConnections(): UserConnectionInfo[] {
    return Array.from(this.userConnections.values());
  }

  // تشخيص مشاكل محددة
  diagnoseIssues(): string[] {
    const issues: string[] = [];
    const stats = this.getStats();

    // نسبة المصادقة المنخفضة
    const authRate = stats.authenticatedUsers / Math.max(stats.totalConnections, 1);
    if (authRate < 0.8) {
      issues.push(`نسبة المصادقة منخفضة: ${Math.round(authRate * 100)}%`);
    }

    // نسبة فشل الانضمام العالية
    const joinFailureRate = stats.joinFailures / Math.max(stats.reconnectionEvents, 1);
    if (joinFailureRate > 0.1) {
      issues.push(`نسبة فشل انضمام عالية: ${Math.round(joinFailureRate * 100)}%`);
    }

    // اتصالات معلقة كثيرة
    if (stats.orphanedConnections > 5) {
      issues.push(`اتصالات معلقة كثيرة: ${stats.orphanedConnections}`);
    }

    // مستخدمون بدون غرف
    const usersWithoutRooms = stats.authenticatedUsers - stats.usersInRooms;
    if (usersWithoutRooms > 3) {
      issues.push(`مستخدمون مصادقون بدون غرف: ${usersWithoutRooms}`);
    }

    return issues;
  }

  // تقرير مفصل
  generateReport(): string {
    const stats = this.getStats();
    const issues = this.diagnoseIssues();
    
    let report = `
📊 تقرير مراقبة الاتصالات - ${stats.lastUpdated.toLocaleString('ar')}
═══════════════════════════════════════════════════════

📈 الإحصائيات العامة:
• إجمالي الاتصالات: ${stats.totalConnections}
• المستخدمون المصادقون: ${stats.authenticatedUsers}
• المستخدمون في غرف: ${stats.usersInRooms}
• أحداث إعادة الاتصال: ${stats.reconnectionEvents}
• فشل الانضمام: ${stats.joinFailures}
• الاتصالات المعلقة: ${stats.orphanedConnections}

`;

    if (issues.length > 0) {
      report += `⚠️ المشاكل المكتشفة:\n`;
      issues.forEach(issue => {
        report += `• ${issue}\n`;
      });
      report += '\n';
    } else {
      report += `✅ لا توجد مشاكل مكتشفة\n\n`;
    }

    // أفضل 5 مستخدمين من ناحية إعادة الاتصال
    const topReconnectors = Array.from(this.userConnections.values())
      .sort((a, b) => b.reconnectCount - a.reconnectCount)
      .slice(0, 5);

    if (topReconnectors.length > 0) {
      report += `🔄 أكثر المستخدمين إعادة اتصال:\n`;
      topReconnectors.forEach((user, index) => {
        report += `${index + 1}. ${user.username}: ${user.reconnectCount} مرة\n`;
      });
    }

    return report;
  }

  // تنظيف البيانات القديمة
  cleanup() {
    const now = Date.now();
    const CLEANUP_THRESHOLD = 300000; // 5 دقائق
    let cleanedCount = 0;

    for (const [userId, user] of this.userConnections) {
      if (now - user.lastSeen.getTime() > CLEANUP_THRESHOLD && user.socketCount === 0) {
        this.userConnections.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 تنظيف ${cleanedCount} اتصال قديم من المراقب`);
    }
  }
}

// إنشاء مثيل واحد
export const connectionMonitor = new ConnectionMonitor();

// تنظيف دوري كل 5 دقائق
setInterval(() => {
  connectionMonitor.cleanup();
}, 300000);

// تقرير دوري كل 10 دقائق
setInterval(() => {
  const issues = connectionMonitor.diagnoseIssues();
  if (issues.length > 0) {
    console.warn('⚠️ مشاكل اتصال مكتشفة:', issues);
  }
}, 600000);