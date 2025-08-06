import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger';

/**
 * أنواع الأخطاء المخصصة
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, true, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'يجب تسجيل الدخول') {
    super(401, message, true, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'ليس لديك صلاحية') {
    super(403, message, true, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'المورد غير موجود') {
    super(404, message, true, 'NOT_FOUND');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'تم تجاوز حد الطلبات') {
    super(429, message, true, 'RATE_LIMIT');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'خطأ في قاعدة البيانات') {
    super(500, message, false, 'DATABASE_ERROR');
  }
}

/**
 * معالج الأخطاء العام
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // تسجيل الخطأ
  log.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: req.body,
    params: req.params,
    query: req.query
  });

  // معالجة أنواع مختلفة من الأخطاء
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      timestamp: new Date().toISOString()
    });
  }

  // أخطاء Mongoose/MongoDB
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'بيانات غير صحيحة',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'معرف غير صالح',
      timestamp: new Date().toISOString()
    });
  }

  // أخطاء JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'رمز المصادقة غير صالح',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'انتهت صلاحية رمز المصادقة',
      timestamp: new Date().toISOString()
    });
  }

  // خطأ عام
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'حدث خطأ في الخادم' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
}

/**
 * معالج للمسارات غير الموجودة
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: 'المسار المطلوب غير موجود',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
}

/**
 * معالج الأخطاء غير المتزامنة
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * التحقق من صحة البيانات
 */
export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      next(new ValidationError(error.errors?.[0]?.message || 'بيانات غير صحيحة'));
    }
  };
}