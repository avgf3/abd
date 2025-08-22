import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
}

// معالج الأخطاء المركزي
export function errorHandler(
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // تسجيل الخطأ
  logger.error('خطأ في الخادم:', err.message, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // تحديد رمز الحالة
  const statusCode = err.status || err.statusCode || 500;

  // إعداد الاستجابة
  const response: any = {
    error: true,
    message: err.message || 'حدث خطأ في الخادم',
    status: statusCode
  };

  // إضافة تفاصيل إضافية في بيئة التطوير
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.code = err.code;
  }

  // معالجة أخطاء محددة
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      response.message = 'حجم الملف أكبر من المسموح به';
      break;
    case 'LIMIT_UNEXPECTED_FILE':
      response.message = 'نوع الملف غير مسموح به';
      break;
    case 'ENOENT':
      response.message = 'الملف المطلوب غير موجود';
      response.status = 404;
      break;
    default:
      // الحفاظ على الرسالة الافتراضية
      break;
  }

  res.status(response.status).json(response);
}

// معالج للمسارات غير الموجودة
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: true,
    message: 'المسار المطلوب غير موجود',
    path: req.path,
    method: req.method
  });
}

// معالج للأخطاء غير المتزامنة
export function asyncErrorHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
