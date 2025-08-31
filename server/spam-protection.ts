// نظام مكافحة السبام
export interface SpamProtectionConfig {
  maxMessageLength: number;
  minMessageLength: number;
  bannedWords: string[];
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
      maxMessageLength: 1000,
      minMessageLength: 1,
      bannedWords: [
        // كلمات محظورة أساسية فقط
        'سبام',
      ],
      maxDuplicateMessages: 3, // عند الثالثة نوقف
      duplicateTimeWindow: 60000, // 60 ثانية
    };

    this.userSpamData = new Map();
    this.reports = new Map();
    this.currentReportId = 1;
  }

  // فحص الرسالة قبل إرسالها: يمنع التكرار والسبام البسيط
  checkMessage(
    userId: number,
    content: string
  ): {
    isAllowed: boolean;
    reason?: string;
    action?: 'warn' | 'tempBan' | 'ban';
  } {
    const text = (content || '').trim();
    if (text.length === 0) {
      return { isAllowed: false, reason: 'لا يمكن إرسال رسالة فارغة' };
    }

    if (text.length > this.config.maxMessageLength) {
      return { isAllowed: false, reason: 'الرسالة طويلة جداً' };
    }

    // منع فيض الرموز/التكرار الحرفي الطويل
    const suspiciousPatterns: RegExp[] = [
      /(.)\1{10,}/gi, // تكرار نفس الحرف أكثر من 10 مرات متتالية
      /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi, // روابط
    ];
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(text)) {
        // ارفع نقاط السبام لكن لا تمنع فوراً إلا إذا تكرر
        this.addSpamScore(userId, 2);
        break;
      }
    }

    // فحص الرسائل المكررة خلال نافذة زمنية قصيرة
    const duplicate = this.checkDuplicateMessage(userId, text);
    if (!duplicate.isAllowed) {
      // إضافة نقاط عند محاولة تكرار رسالة
      this.addSpamScore(userId, 5);
      return duplicate;
    }

    // عند السماح، أضف الرسالة إلى سجل المستخدم
    this.addMessage(userId, text);

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

    // إذا كانت هذه هي المحاولة الثالثة لنفس النص خلال النافذة الزمنية
    if (duplicateCount >= this.config.maxDuplicateMessages - 1) {
      return {
        isAllowed: false,
        reason: 'تم إيقاف الكتابة لمدة دقيقة بسبب تكرار نفس الرسالة',
        action: 'tempBan',
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
