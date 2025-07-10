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
      maxMessageLength: 500,
      minMessageLength: 1,
      bannedWords: [
        // كلمات عربية مسيئة (مخفية لأغراض الحماية)
        'سبام', 'إعلان', 'ادخل هنا', 'اربح المال', 'مجاني',
        'www.', 'http', '.com', '.net', '.org',
        // يمكن إضافة المزيد حسب الحاجة
      ],
      maxDuplicateMessages: 3,
      duplicateTimeWindow: 60000, // دقيقة واحدة
    };

    this.userSpamData = new Map();
    this.reports = new Map();
    this.currentReportId = 1;
  }

  // فحص الرسالة قبل إرسالها
  checkMessage(userId: number, content: string): {
    isAllowed: boolean;
    reason?: string;
    action?: 'warn' | 'tempBan' | 'ban';
  } {
    // فحص طول الرسالة
    if (content.length < this.config.minMessageLength) {
      return {
        isAllowed: false,
        reason: 'الرسالة قصيرة جداً'
      };
    }

    if (content.length > this.config.maxMessageLength) {
      return {
        isAllowed: false,
        reason: `الرسالة طويلة جداً. الحد الأقصى ${this.config.maxMessageLength} حرف`
      };
    }

    // فحص الكلمات المحظورة
    const bannedWordFound = this.config.bannedWords.find(word => 
      content.toLowerCase().includes(word.toLowerCase())
    );
    if (bannedWordFound) {
      this.addSpamScore(userId, 5);
      return {
        isAllowed: false,
        reason: 'الرسالة تحتوي على محتوى محظور',
        action: 'warn'
      };
    }

    // فحص الرسائل المكررة
    const duplicateCheck = this.checkDuplicateMessage(userId, content);
    if (!duplicateCheck.isAllowed) {
      return duplicateCheck;
    }

    // تسجيل الرسالة
    this.addMessage(userId, content);
    return { isAllowed: true };
  }

  // فحص الرسائل المكررة
  private checkDuplicateMessage(userId: number, content: string): {
    isAllowed: boolean;
    reason?: string;
    action?: 'warn' | 'tempBan';
  } {
    const userData = this.getUserData(userId);
    const now = Date.now();

    // تنظيف الرسائل القديمة
    userData.recentMessages = userData.recentMessages.filter(
      msg => now - msg.timestamp < this.config.duplicateTimeWindow
    );

    // عد الرسائل المكررة
    const duplicateCount = userData.recentMessages.filter(
      msg => msg.content.toLowerCase() === content.toLowerCase()
    ).length;

    if (duplicateCount >= this.config.maxDuplicateMessages) {
      this.addSpamScore(userId, 3);
      return {
        isAllowed: false,
        reason: 'لا يمكن إرسال نفس الرسالة عدة مرات',
        action: duplicateCount >= 5 ? 'tempBan' : 'warn'
      };
    }

    return { isAllowed: true };
  }

  // إضافة رسالة إلى سجل المستخدم
  private addMessage(userId: number, content: string) {
    const userData = this.getUserData(userId);
    userData.recentMessages.push({
      content,
      timestamp: Date.now()
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
        warnings: 0
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
      isRestricted: userData.spamScore >= 20
    };
  }

  // إضافة تبليغ
  addReport(reporterId: number, reportedUserId: number, reason: string, content: string, messageId?: number): ReportData {
    const report: ReportData = {
      id: this.currentReportId++,
      reporterId,
      reportedUserId,
      messageId,
      reason,
      content,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.reports.set(report.id, report);
    
    // إضافة نقاط سبام تلقائياً للمستخدم المبلغ عنه
    this.addSpamScore(reportedUserId, 2);

    return report;
  }

  // الحصول على التبليغات المعلقة
  getPendingReports(): ReportData[] {
    return Array.from(this.reports.values())
      .filter(report => report.status === 'pending')
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // مراجعة تبليغ
  reviewReport(reportId: number, action: 'approved' | 'dismissed'): boolean {
    const report = this.reports.get(reportId);
    if (!report) return false;

    report.status = action === 'approved' ? 'reviewed' : 'dismissed';

    if (action === 'approved') {
      // إضافة نقاط سبام إضافية للمستخدم المبلغ عنه
      this.addSpamScore(report.reportedUserId, 5);
    }

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
    const bannedUsers = Array.from(this.userSpamData.values())
      .filter(user => user.spamScore >= 50).length;
    const restrictedUsers = Array.from(this.userSpamData.values())
      .filter(user => user.spamScore >= 20 && user.spamScore < 50).length;
    const pendingReports = this.getPendingReports().length;

    return {
      totalUsers,
      bannedUsers,
      restrictedUsers,
      pendingReports,
      totalReports: this.reports.size
    };
  }
}

// إنشاء مثيل واحد للاستخدام في التطبيق
export const spamProtection = new SpamProtection();