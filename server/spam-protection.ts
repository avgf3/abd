// نظام مكافحة السبام
export interface SpamProtectionConfig {
  maxDuplicateMessages: number;
  duplicateTimeWindow: number; // بالميلي ثانية
}

export interface UserSpamData {
  userId: number;
  recentMessages: Array<{
    content: string;
    timestamp: number;
  }>;
  spamScore: number;
  warnings: number;
  lastWarningTime?: number;
}

export interface ReportData {
  id: number;
  reporterId: number;
  reportedUserId: number;
  messageId?: number;
  reason: string;
  content: string;
  timestamp: number;
  status: 'pending' | 'reviewed' | 'dismissed';
}

export class SpamProtection {
  private config: SpamProtectionConfig;
  private userSpamData: Map<number, UserSpamData>;
  private reports: Map<number, ReportData>;
  private currentReportId: number;

  constructor() {
    this.config = {
      maxDuplicateMessages: 10, // زيادة الحد المسموح
      duplicateTimeWindow: 30000, // 30 ثانية فقط
    };

    this.userSpamData = new Map();
    this.reports = new Map();
    this.currentReportId = 1;
  }

  // فحص الرسالة قبل إرسالها (معطل مؤقتاً)
  checkMessage(
    userId: number,
    content: string
  ): {
    isAllowed: boolean;
    reason?: string;
    action?: 'warn' | 'tempBan' | 'ban';
  } {
    // تفعيل فحص التكرار فقط
    const duplicateCheck = this.checkDuplicateMessage(userId, content);
    if (!duplicateCheck.isAllowed) {
      return {
        isAllowed: false,
        reason: duplicateCheck.reason,
        action: duplicateCheck.action,
      };
    }

    // إضافة الرسالة للسجل بعد الفحص
    this.addMessage(userId, content);

    return { isAllowed: true };
  }

  // فحص الرسائل المكررة
  private checkDuplicateMessage(
    userId: number,
    content: string
  ): {
    isAllowed: boolean;
    reason?: string;
    action?: 'warn' | 'tempBan';
  } {
    const userData = this.getUserData(userId);
    const now = Date.now();

    // تنظيف الرسائل القديمة
    userData.recentMessages = userData.recentMessages.filter(
      (msg) => now - msg.timestamp < this.config.duplicateTimeWindow
    );

    // عد الرسائل المكررة
    const duplicateCount = userData.recentMessages.filter(
      (msg) => msg.content.toLowerCase() === content.toLowerCase()
    ).length;

    if (duplicateCount >= this.config.maxDuplicateMessages) {
      return {
        isAllowed: false,
        reason: 'لا يمكن إرسال نفس الرسالة عدة مرات',
        action: duplicateCount >= 5 ? 'tempBan' : 'warn',
      };
    }

    return { isAllowed: true };
  }

  // إضافة رسالة إلى سجل المستخدم
  private addMessage(userId: number, content: string) {
    const userData = this.getUserData(userId);
    userData.recentMessages.push({
      content,
      timestamp: Date.now(),
    });

    // الاحتفاظ بآخر 20 رسالة فقط
    if (userData.recentMessages.length > 20) {
      userData.recentMessages = userData.recentMessages.slice(-20);
    }
  }

  // إضافة نقاط سبام
  private addSpamScore(userId: number, points: number) {
    const userData = this.getUserData(userId);
    userData.spamScore += points;

    // إذا وصل النقاط إلى 10، أعط تحذير
    if (userData.spamScore >= 10 && userData.spamScore < 20) {
      userData.warnings++;
      userData.lastWarningTime = Date.now();
    }
  }

  // الحصول على بيانات المستخدم
  private getUserData(userId: number): UserSpamData {
    if (!this.userSpamData.has(userId)) {
      this.userSpamData.set(userId, {
        userId,
        recentMessages: [],
        spamScore: 0,
        warnings: 0,
      });
    }
    return this.userSpamData.get(userId)!;
  }

  // فحص حالة المستخدم
  getUserStatus(userId: number): {
    spamScore: number;
    warnings: number;
    isBanned: boolean;
    isRestricted: boolean;
  } {
    const userData = this.getUserData(userId);
    return {
      spamScore: userData.spamScore,
      warnings: userData.warnings,
      isBanned: userData.spamScore >= 50,
      isRestricted: userData.spamScore >= 20,
    };
  }

  // إضافة تبليغ (بدون نقاط تلقائية)
  addReport(
    reporterId: number,
    reportedUserId: number,
    reason: string,
    content: string,
    messageId?: number
  ): ReportData {
    const report: ReportData = {
      id: this.currentReportId++,
      reporterId,
      reportedUserId,
      messageId,
      reason,
      content,
      timestamp: Date.now(),
      status: 'pending',
    };

    this.reports.set(report.id, report);
    return report;
  }

  // الحصول على التبليغات المعلقة
  getPendingReports(): ReportData[] {
    return Array.from(this.reports.values())
      .filter((report) => report.status === 'pending')
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // مراجعة تبليغ
  reviewReport(reportId: number, action: 'approved' | 'dismissed'): boolean {
    const report = this.reports.get(reportId);
    if (!report) return false;

    report.status = action === 'approved' ? 'reviewed' : 'dismissed';

    // مجرد تحديث الحالة بدون نقاط

    return true;
  }

  // إعادة تعيين نقاط المستخدم (للمشرفين)
  resetUserSpamScore(userId: number) {
    const userData = this.getUserData(userId);
    userData.spamScore = 0;
    userData.warnings = 0;
    userData.recentMessages = [];
  }

  // الحصول على إحصائيات
  getStats() {
    const totalUsers = this.userSpamData.size;
    const bannedUsers = Array.from(this.userSpamData.values()).filter(
      (user) => user.spamScore >= 50
    ).length;
    const restrictedUsers = Array.from(this.userSpamData.values()).filter(
      (user) => user.spamScore >= 20 && user.spamScore < 50
    ).length;
    const pendingReports = this.getPendingReports().length;

    return {
      totalUsers,
      bannedUsers,
      restrictedUsers,
      pendingReports,
      totalReports: this.reports.size,
    };
  }

  getReviewedReports(): ReportData[] {
    return Array.from(this.reports.values())
      .filter((report) => report.status === 'reviewed' || report.status === 'dismissed')
      .sort((a, b) => b.timestamp - a.timestamp);
  }
}

export const spamProtection = new SpamProtection();
