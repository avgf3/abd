// نظام الأمان المحسن - بدون مكتبات خارجية
import { Request, Response, NextFunction } from 'express';

// نظام حد التكرار البسيط
interface RateLimitData {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitData>();

// دالة حد التكرار المخصصة
export const createSimpleRateLimit = (windowMs: number, max: number, message: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    let data = rateLimitStore.get(key);
    
    if (!data || now > data.resetTime) {
      data = { count: 1, resetTime: now + windowMs };
    } else {
      data.count++;
    }
    
    rateLimitStore.set(key, data);
    
    if (data.count > max) {
      return res.status(429).json({ error: message });
    }
    
    next();
  };
};

// حد التكرار للتسجيل
export const authLimiter = createSimpleRateLimit(
  15 * 60 * 1000, // 15 دقيقة
  5, // 5 محاولات
  'محاولات كثيرة جداً. حاول مرة أخرى خلال 15 دقيقة'
);

// حد التكرار للرسائل
export const messageLimiter = createSimpleRateLimit(
  60 * 1000, // دقيقة واحدة
  30, // 30 رسالة
  'رسائل كثيرة جداً. انتظر قليلاً'
);

// تنظيف المدخلات
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // إزالة script tags
    .replace(/[<>\"']/g, '') // إزالة الأحرف الخطيرة
    .substring(0, 500); // تحديد الطول الأقصى
};

// فحص عنوان IP للحظر
const blockedIPs = new Set<string>();
const suspiciousIPs = new Map<string, { count: number; lastAttempt: number }>();

export const checkIPSecurity = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  // فحص IPs المحظورة
  if (blockedIPs.has(clientIP)) {
    return res.status(403).json({ error: 'عنوان IP محظور' });
  }
  
  // تتبع المحاولات المشبوهة
  const now = Date.now();
  const suspicious = suspiciousIPs.get(clientIP);
  
  if (suspicious) {
    // إذا كانت المحاولات كثيرة خلال 5 دقائق
    if (now - suspicious.lastAttempt < 5 * 60 * 1000 && suspicious.count > 10) {
      blockedIPs.add(clientIP);
      return res.status(403).json({ error: 'تم حظر عنوان IP بسبب النشاط المشبوه' });
    }
    
    // إعادة تعيين العداد إذا مر أكثر من 5 دقائق
    if (now - suspicious.lastAttempt > 5 * 60 * 1000) {
      suspiciousIPs.delete(clientIP);
    }
  }
  
  next();
};

// تسجيل محاولة مشبوهة
export const logSuspiciousActivity = (ip: string) => {
  const now = Date.now();
  const current = suspiciousIPs.get(ip) || { count: 0, lastAttempt: 0 };
  
  suspiciousIPs.set(ip, {
    count: current.count + 1,
    lastAttempt: now
  });
};

// فحص محتوى الرسائل للمحتوى الضار
export const validateMessageContent = (content: string): { isValid: boolean; reason?: string } => {
  if (!content || !content.trim()) {
    return { isValid: false, reason: 'الرسالة فارغة' };
  }
  
  // فحص الطول
  if (content.length > 1000) {
    return { isValid: false, reason: 'الرسالة طويلة جداً' };
  }
  
  // فحص الروابط المشبوهة
  const suspiciousPatterns = [
    /https?:\/\/[^\s]+\.(tk|ml|ga|cf)\b/i, // نطاقات مجانية مشبوهة
    /discord\.gg\/[a-zA-Z0-9]+/i, // روابط Discord
    /t\.me\/[a-zA-Z0-9_]+/i, // روابط Telegram
    /bit\.ly\/[a-zA-Z0-9]+/i, // روابط مختصرة
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      return { isValid: false, reason: 'يحتوي على روابط غير مسموحة' };
    }
  }
  
  // فحص الكلمات المحظورة الإضافية
  const bannedWords = [
    'هاك', 'hack', 'cheat', 'exploit', 'virus',
    'scam', 'spam', 'bot', 'fake', 'phishing'
  ];
  
  const lowerContent = content.toLowerCase();
  for (const word of bannedWords) {
    if (lowerContent.includes(word)) {
      return { isValid: false, reason: 'يحتوي على محتوى محظور' };
    }
  }
  
  return { isValid: true };
};

// إعدادات الأمان العامة
export const securityConfig = {
  maxUsernameLength: 20,
  minUsernameLength: 3,
  maxMessageLength: 1000,
  maxMessagesPerMinute: 30,
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 دقيقة
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 ساعة
};