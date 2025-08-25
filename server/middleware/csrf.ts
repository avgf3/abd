import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// نظام CSRF Token مخصص بديل لحزمة csurf المهجورة
export class CSRFProtection {
  private tokens = new Map<string, { token: string; expires: number }>();
  private secretLength = 32;
  private tokenLength = 48;
  private tokenExpiry = 60 * 60 * 1000; // ساعة واحدة

  constructor() {
    // تنظيف التوكنات المنتهية كل 10 دقائق
    setInterval(() => this.cleanupExpiredTokens(), 10 * 60 * 1000);
  }

  // توليد secret جديد للجلسة
  generateSecret(): string {
    return crypto.randomBytes(this.secretLength).toString('base64url');
  }

  // توليد token CSRF
  generateToken(sessionId: string): string {
    const secret = this.generateSecret();
    const token = crypto.randomBytes(this.tokenLength).toString('base64url');
    const hash = crypto
      .createHmac('sha256', secret)
      .update(token)
      .digest('base64url');
    
    const csrfToken = `${token}.${hash}`;
    
    // حفظ التوكن مع وقت الانتهاء
    this.tokens.set(sessionId, {
      token: csrfToken,
      expires: Date.now() + this.tokenExpiry
    });
    
    return csrfToken;
  }

  // التحقق من صحة التوكن
  verifyToken(sessionId: string, providedToken: string): boolean {
    const storedData = this.tokens.get(sessionId);
    
    if (!storedData) {
      return false;
    }
    
    // التحقق من انتهاء الصلاحية
    if (Date.now() > storedData.expires) {
      this.tokens.delete(sessionId);
      return false;
    }
    
    // مقارنة آمنة ضد timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(storedData.token),
      Buffer.from(providedToken)
    );
  }

  // تنظيف التوكنات المنتهية
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [sessionId, data] of this.tokens.entries()) {
      if (now > data.expires) {
        this.tokens.delete(sessionId);
      }
    }
  }
}

// إنشاء instance واحد
export const csrfProtection = new CSRFProtection();

// Middleware للتحقق من CSRF
export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  // تخطي التحقق للطلبات الآمنة
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // تخطي بعض المسارات الخاصة
  const skipPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/logout', '/health'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  const sessionId = (req.session as any)?.id;
  if (!sessionId) {
    res.status(403).json({ error: 'جلسة غير صالحة' });
    return;
  }

  // البحث عن التوكن في الطلب
  const token = req.body._csrf || 
                req.query._csrf || 
                req.headers['x-csrf-token'] ||
                req.headers['x-xsrf-token'];

  if (!token || typeof token !== 'string') {
    res.status(403).json({ error: 'CSRF token missing' });
    return;
  }

  if (!csrfProtection.verifyToken(sessionId, token)) {
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  next();
}

// Middleware لتوليد وإرسال CSRF token
export function csrfTokenEndpoint(req: Request, res: Response): void {
  const sessionId = (req.session as any)?.id;
  if (!sessionId) {
    res.status(401).json({ error: 'غير مصرح' });
    return;
  }

  const token = csrfProtection.generateToken(sessionId);
  res.json({ csrfToken: token });
}