// نظام أمان متقدم للشات
import type { Request, Response, NextFunction } from 'express';


// نظام تتبع الأنشطة المشبوهة
interface SecurityEvent {
  id: string;
  type: 'suspicious_login' | 'spam_attempt' | 'multiple_accounts' | 'unusual_activity';
  userId?: number;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface UserSecurityProfile {
  userId: number;
  ipAddresses: string[];
  devices: string[];
  loginAttempts: Array<{ timestamp: Date; success: boolean; ip: string }>;
  securityScore: number;
  flags: string[];
  lastSecurityCheck: Date;
}

export class AdvancedSecurityManager {
  private securityEvents: SecurityEvent[] = [];
  private userProfiles = new Map<number, UserSecurityProfile>();
  private suspiciousIPs = new Set<string>();
  private blockedIPs = new Set<string>();
  private deviceFingerprints = new Map<string, { userId: number; lastSeen: Date }>();

  // تحليل أمان تسجيل الدخول
  async analyzeLoginSecurity(
    req: Request,
    userId: number
  ): Promise<{
    allowed: boolean;
    risk: 'low' | 'medium' | 'high';
    reasons: string[];
  }> {
    const ip = this.getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const deviceId = this.generateDeviceFingerprint(req);

    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = {
        userId,
        ipAddresses: [],
        devices: [],
        loginAttempts: [],
        securityScore: 100,
        flags: [],
        lastSecurityCheck: new Date(),
      };
      this.userProfiles.set(userId, profile);
    }

    const risks: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // فحص IP جديد
    if (!profile.ipAddresses.includes(ip)) {
      risks.push('تسجيل دخول من عنوان IP جديد');
      profile.ipAddresses.push(ip);
      if (profile.ipAddresses.length > 5) {
        riskLevel = 'medium';
      }
    }

    // فحص الجهاز الجديد
    if (!profile.devices.includes(deviceId)) {
      risks.push('تسجيل دخول من جهاز جديد');
      profile.devices.push(deviceId);
      riskLevel = 'medium';
    }

    // فحص المحاولات المتكررة
    const recentAttempts = profile.loginAttempts.filter(
      (attempt) => Date.now() - attempt.timestamp.getTime() < 60 * 60 * 1000 // آخر ساعة
    );

    if (recentAttempts.length > 10) {
      risks.push('محاولات تسجيل دخول مكثفة');
      riskLevel = 'high';
    }

    // فحص IPs المشبوهة
    if (this.suspiciousIPs.has(ip)) {
      risks.push('تسجيل دخول من IP مشبوه');
      riskLevel = 'high';
    }

    // فحص IPs المحظورة
    if (this.blockedIPs.has(ip)) {
      risks.push('تسجيل دخول من IP محظور');
      return { allowed: false, risk: 'high', reasons: risks };
    }

    // تحديث السجل
    profile.loginAttempts.push({
      timestamp: new Date(),
      success: true,
      ip,
    });

    // الاحتفاظ بآخر 50 محاولة فقط
    if (profile.loginAttempts.length > 50) {
      profile.loginAttempts = profile.loginAttempts.slice(-50);
    }

    // تسجيل حدث أمان إذا كان هناك مخاطر
    if (risks.length > 0) {
      this.logSecurityEvent({
        type: 'suspicious_login',
        userId,
        ipAddress: ip,
        userAgent,
        details: { risks, deviceId },
        severity: riskLevel === 'high' ? 'high' : 'medium',
      });
    }

    return {
      allowed: riskLevel !== 'high',
      risk: riskLevel,
      reasons: risks,
    };
  }

  // تحليل محتوى الرسائل للكشف عن التهديدات
  analyzeMessageSecurity(
    content: string,
    userId: number
  ): {
    allowed: boolean;
    threats: string[];
    confidence: number;
  } {
    const threats: string[] = [];
    let confidence = 0;

    // فحص الروابط المشبوهة
    const urlPattern = /(https?:\/\/[^\s]+)/gi;
    const urls = content.match(urlPattern) || [];

    for (const url of urls) {
      if (this.isSuspiciousURL(url)) {
        threats.push('رابط مشبوه');
        confidence += 30;
      }
    }

    // فحص أنماط السبام
    const spamPatterns = [
      /اربح المال/gi,
      /مجاني 100%/gi,
      /اضغط هنا/gi,
      /عرض محدود/gi,
      /احصل على/gi,
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(content)) {
        threats.push('محتوى سبام محتمل');
        confidence += 20;
      }
    }

    // فحص الكلمات المسيئة المتقدم
    const offensiveWords = this.detectOffensiveContent(content);
    if (offensiveWords.length > 0) {
      threats.push('محتوى مسيء');
      confidence += 40;
    }

    // فحص الرسائل المكررة
    if (this.isDuplicateMessage(content, userId)) {
      threats.push('رسالة مكررة');
      confidence += 25;
    }

    // تسجيل التهديد إذا تم اكتشافه
    if (threats.length > 0) {
      this.logSecurityEvent({
        type: 'spam_attempt',
        userId,
        ipAddress: 'unknown',
        userAgent: 'unknown',
        details: { content: content.substring(0, 100), threats },
        severity: confidence > 50 ? 'high' : 'medium',
      });
    }

    return {
      allowed: confidence < 70,
      threats,
      confidence,
    };
  }

  // فحص الحسابات المتعددة
  async detectMultipleAccounts(
    ip: string,
    deviceId: string
  ): Promise<{
    suspicious: boolean;
    relatedAccounts: number[];
  }> {
    const relatedAccounts: number[] = [];

    // البحث عن حسابات بنفس IP
    for (const [userId, profile] of this.userProfiles) {
      if (profile.ipAddresses.includes(ip)) {
        relatedAccounts.push(userId);
      }
    }

    // البحث عن حسابات بنفس الجهاز
    const deviceData = this.deviceFingerprints.get(deviceId);
    if (deviceData) {
      relatedAccounts.push(deviceData.userId);
    }

    const suspicious = relatedAccounts.length > 3; // أكثر من 3 حسابات

    if (suspicious) {
      this.logSecurityEvent({
        type: 'multiple_accounts',
        ipAddress: ip,
        userAgent: 'unknown',
        details: { relatedAccounts, deviceId },
        severity: 'medium',
      });
    }

    return { suspicious, relatedAccounts: [...new Set(relatedAccounts)] };
  }

  // تسجيل حدث أمان
  private logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
    };

    this.securityEvents.push(securityEvent);

    // الاحتفاظ بآخر 10000 حدث فقط
    if (this.securityEvents.length > 10000) {
      this.securityEvents = this.securityEvents.slice(-10000);
    }

    // تنبيه فوري للأحداث الحرجة
    if (event.severity === 'critical') {
      this.alertAdministrators(securityEvent);
    }
  }

  // إنشاء بصمة الجهاز
  private generateDeviceFingerprint(req: Request): string {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';

    const fingerprint = `${userAgent}-${acceptLanguage}-${acceptEncoding}`;
    return Buffer.from(fingerprint).toString('base64').substring(0, 32);
  }

  // الحصول على IP العميل
  private getClientIP(req: Request): string {
    const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    const real = (req.headers['x-real-ip'] as string | undefined)?.trim();
    const ip =
      forwarded ||
      real ||
      (req.ip as any) ||
      (req.connection as any)?.remoteAddress ||
      (req.socket as any)?.remoteAddress ||
      'unknown';
    return typeof ip === 'string' ? ip : 'unknown';
  }

  // فحص الروابط المشبوهة
  private isSuspiciousURL(url: string): boolean {
    const suspiciousDomains = [
      'bit.ly',
      'tinyurl.com',
      'short.link',
      // يمكن إضافة المزيد من النطاقات المشبوهة
    ];

    try {
      const urlObj = new URL(url);
      return suspiciousDomains.includes(urlObj.hostname);
    } catch {
      return true; // URL غير صالح
    }
  }

  // اكتشاف المحتوى المسيء المتقدم
  private detectOffensiveContent(content: string): string[] {
    const offensive: string[] = [];

    // قاموس الكلمات المسيئة (يمكن توسيعه)
    const offensivePatterns = [
      /(\b|\s)(كلب|حقير|غبي)(\b|\s)/gi,
      // يمكن إضافة المزيد من الأنماط
    ];

    for (const pattern of offensivePatterns) {
      if (pattern.test(content)) {
        offensive.push('لغة مسيئة');
        break;
      }
    }

    return offensive;
  }

  // فحص الرسائل المكررة
  private isDuplicateMessage(content: string, userId: number): boolean {
    // يمكن تنفيذ منطق أكثر تعقيداً هنا
    return false;
  }

  // إنشاء معرف الحدث
  private generateEventId(): string {
    return `SEC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // تنبيه المديرين
  private alertAdministrators(event: SecurityEvent) {
    console.warn('🚨 حدث أمان حرج:', {
      type: event.type,
      severity: event.severity,
      timestamp: event.timestamp,
      details: event.details,
    });

    // يمكن إضافة إرسال إيميل أو إشعار push هنا
  }

  // الحصول على تقرير الأمان
  getSecurityReport() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentEvents = this.securityEvents.filter((event) => event.timestamp > dayAgo);

    const eventsByType = recentEvents.reduce(
      (acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const eventsBySeverity = recentEvents.reduce(
      (acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      suspiciousIPs: this.suspiciousIPs.size,
      blockedIPs: this.blockedIPs.size,
      monitoredUsers: this.userProfiles.size,
    };
  }

  // حظر IP
  blockIP(ip: string, reason: string) {
    this.blockedIPs.add(ip);
    this.logSecurityEvent({
      type: 'unusual_activity',
      ipAddress: ip,
      userAgent: 'system',
      details: { action: 'ip_blocked', reason },
      severity: 'high',
    });
  }

  // إلغاء حظر IP
  unblockIP(ip: string) {
    this.blockedIPs.delete(ip);
    this.suspiciousIPs.delete(ip);
  }
}

// مثيل عام لمدير الأمان
export const advancedSecurity = new AdvancedSecurityManager();

// Middleware للفحص الأمني المتقدم
export const advancedSecurityMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    // فحص الحظر
    if (advancedSecurity['blockedIPs'].has(ip)) {
      return res.status(403).json({
        error: 'تم حظر عنوان IP الخاص بك',
        code: 'IP_BLOCKED',
      });
    }

    next();
  } catch (error) {
    console.error('خطأ في فحص الأمان المتقدم:', error);
    next();
  }
};
