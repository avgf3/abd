import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';

// إعدادات الكوكيز
export const cookieOptions: import('express').CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax'),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
  path: '/'
};

// إعداد cookie parser
export const cookieMiddleware = cookieParser(process.env.COOKIE_SECRET || 'default-secret-change-in-production');

// توليد CSRF token
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware لحماية CSRF باستخدام Double Submit Cookie
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // تخطي حماية CSRF للطرق الآمنة
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // تخطي لمسارات معينة (مثل webhooks)
  const excludedPaths = ['/api/webhook', '/api/health'];
  if (excludedPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // التحقق من وجود CSRF token في الهيدر والكوكي
  const headerToken = req.headers['x-csrf-token'] as string;
  const cookieToken = req.cookies['csrf-token'];

  if (!headerToken || !cookieToken) {
    return res.status(403).json({ 
      error: 'حماية CSRF: رمز الحماية مفقود' 
    });
  }

  // التحقق من تطابق التوكن
  if (headerToken !== cookieToken) {
    return res.status(403).json({ 
      error: 'حماية CSRF: رمز الحماية غير صالح' 
    });
  }

  // التحقق من صحة التوكن (طول وتنسيق)
  if (headerToken.length !== 64 || !/^[a-f0-9]+$/.test(headerToken)) {
    return res.status(403).json({ 
      error: 'حماية CSRF: رمز الحماية غير صحيح' 
    });
  }

  next();
};

// Middleware لإنشاء وإرسال CSRF token
export const csrfTokenMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // إنشاء توكن جديد إذا لم يكن موجوداً
  if (!req.cookies['csrf-token']) {
    const token = generateCSRFToken();
    res.cookie('csrf-token', token, {
      ...cookieOptions,
      httpOnly: false // يجب أن يكون قابل للقراءة من JavaScript
    });
  }

  next();
};

// endpoint لإرجاع CSRF token للعميل
export const getCSRFToken = (req: Request, res: Response) => {
  let token = req.cookies['csrf-token'];
  
  if (!token) {
    token = generateCSRFToken();
    res.cookie('csrf-token', token, {
      ...cookieOptions,
      httpOnly: false
    });
  }

  res.json({ csrfToken: token });
};

// Middleware لتعيين الكوكيز الآمنة للجلسة
export const setAuthCookie = (res: Response, token: string, userId: number) => {
  // كوكي المصادقة الرئيسي (httpOnly)
  res.cookie('auth-token', token, {
    ...cookieOptions,
    httpOnly: true
  });

  // كوكي معرف المستخدم (للقراءة من JavaScript)
  res.cookie('user-id', userId.toString(), {
    ...cookieOptions,
    httpOnly: false
  });

  // تحديث CSRF token
  const csrfToken = generateCSRFToken();
  res.cookie('csrf-token', csrfToken, {
    ...cookieOptions,
    httpOnly: false
  });
};

// Middleware لمسح الكوكيز عند تسجيل الخروج
export const clearAuthCookies = (res: Response) => {
  res.clearCookie('auth-token', { path: '/' });
  res.clearCookie('user-id', { path: '/' });
  res.clearCookie('csrf-token', { path: '/' });
};

// Middleware للتحقق من الكوكي للمصادقة
export const cookieAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies['auth-token'];
  
  if (!token) {
    return next(); // تمرير بدون مصادقة
  }

  // إضافة التوكن للهيدر ليتم معالجته بواسطة requireAuth
  req.headers.authorization = `Bearer ${token}`;
  next();
};