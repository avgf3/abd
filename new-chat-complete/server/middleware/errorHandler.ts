import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// أنواع الأخطاء المختلفة
export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

// إنشاء خطأ تشغيلي
export class OperationalError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean = true;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

// رسائل الأخطاء الموحدة
export const ERROR_MESSAGES = {
  // أخطاء المصادقة
  UNAUTHORIZED: 'غير مصرح لك بالوصول',
  FORBIDDEN: 'ليس لديك صلاحية لتنفيذ هذا الإجراء',
  INVALID_CREDENTIALS: 'بيانات تسجيل الدخول غير صحيحة',
  SESSION_EXPIRED: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى',

  // أخطاء البيانات
  VALIDATION_ERROR: 'البيانات المدخلة غير صحيحة',
  MISSING_REQUIRED_FIELDS: 'حقول مطلوبة مفقودة',
  INVALID_FORMAT: 'تنسيق البيانات غير صحيح',

  // أخطاء قاعدة البيانات
  DATABASE_ERROR: 'خطأ في قاعدة البيانات',
  RECORD_NOT_FOUND: 'السجل المطلوب غير موجود',
  DUPLICATE_ENTRY: 'البيانات موجودة مسبقاً',

  // أخطاء الملفات
  FILE_UPLOAD_ERROR: 'فشل في رفع الملف',
  FILE_TOO_LARGE: 'حجم الملف كبير جداً',
  INVALID_FILE_TYPE: 'نوع الملف غير مدعوم',

  // أخطاء الشبكة
  NETWORK_ERROR: 'خطأ في الاتصال',
  TIMEOUT_ERROR: 'انتهت مهلة الطلب',

  // أخطاء عامة
  INTERNAL_ERROR: 'خطأ داخلي في الخادم',
  SERVICE_UNAVAILABLE: 'الخدمة غير متاحة حالياً',
  RATE_LIMIT_EXCEEDED: 'تم تجاوز الحد المسموح من الطلبات',
} as const;

// دالة لتنسيق أخطاء Zod
function formatZodError(error: ZodError): string {
  const errors = error.errors.map((err) => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });

  return `أخطاء في البيانات: ${errors.join(', ')}`;
}

// دالة لتحديد رمز الحالة بناءً على نوع الخطأ
function isDatabaseUnavailableError(error: any): boolean {
  const code = (error && (error.code || error.errno || error.sqlState)) || '';
  const name = (error && error.name) || '';
  const message = (error && error.message) || '';
  // رموز شائعة لانقطاع قاعدة البيانات أو الشبكة
  const dbCodes = new Set([
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'EPIPE',
    // SQLSTATE (PostgreSQL)
    '57P01', // admin_shutdown
    '57P02', // crash_shutdown
    '57P03', // cannot_connect_now
    '08006', // connection_failure
    '08001', // sqlclient_unable_to_establish_sqlconnection
  ]);
  if (dbCodes.has(String(code))) return true;
  if (name === 'PostgresError' && /^08|^57P0/.test(String(error?.code || ''))) return true;
  const msg = message.toLowerCase();
  if (
    msg.includes('connection') && (msg.includes('timeout') || msg.includes('refused') || msg.includes('terminated') || msg.includes('reset'))
  ) return true;
  if (msg.includes('database') && (msg.includes('unavailable') || msg.includes('down') || msg.includes('cannot'))) return true;
  return false;
}

function getStatusCode(error: any): number {
  if (error?.statusCode) return error.statusCode;
  if (error instanceof ZodError) return 400;
  if (isDatabaseUnavailableError(error)) return 503;
  if (error?.code === 'ENOTFOUND') return 404;
  if (error?.code === '23505') return 409; // Unique constraint violation
  if (error?.code === '23503') return 400; // Foreign key constraint violation
  return 500;
}

// معالج الأخطاء الرئيسي
export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('🚨 خطأ في الخادم:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });

  let statusCode = getStatusCode(error);
  let message = error.message || ERROR_MESSAGES.INTERNAL_ERROR;
  let details: any = undefined;

  // معالجة أنواع مختلفة من الأخطاء
  if (error instanceof ZodError) {
    message = formatZodError(error);
    statusCode = 400;
    details = error.errors;
  } else if (error.name === 'ValidationError') {
    message = ERROR_MESSAGES.VALIDATION_ERROR;
    statusCode = 400;
  } else if (error.code === 'ENOENT') {
    message = ERROR_MESSAGES.RECORD_NOT_FOUND;
    statusCode = 404;
  } else if (error.code === 'ECONNREFUSED') {
    message = ERROR_MESSAGES.SERVICE_UNAVAILABLE;
    statusCode = 503;
  }

  // تحديد ما إذا كان يجب إظهار تفاصيل الخطأ
  const isProduction = process.env.NODE_ENV === 'production';
  const showDetails = !isProduction || (error as AppError).isOperational;

  const errorResponse: any = {
    error: true,
    message: showDetails ? message : ERROR_MESSAGES.INTERNAL_ERROR,
    code: error.code,
    timestamp: new Date().toISOString(),
  };

  // إضافة التفاصيل في بيئة التطوير فقط
  if (!isProduction) {
    errorResponse.details = details;
    errorResponse.stack = error.stack;
  }

  // Avoid sending headers twice which may cause secondary errors
  if (res.headersSent) {
    return next(error);
  }
  res.status(statusCode).json(errorResponse);
};

// معالج الأخطاء غير المعترف بها
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: true,
    message: 'المسار المطلوب غير موجود',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
};

// معالج الأخطاء غير المتوقعة
export const uncaughtErrorHandler = () => {
  process.on('uncaughtException', (error: Error) => {
    console.error('🚨 خطأ غير متوقع:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: any) => {
    console.error('🚨 رفض غير معالج:', reason);
    process.exit(1);
  });
};

// دالة مساعدة لإنشاء أخطاء منظمة
export const createError = {
  badRequest: (message: string = ERROR_MESSAGES.VALIDATION_ERROR) =>
    new OperationalError(message, 400, 'BAD_REQUEST'),

  unauthorized: (message: string = ERROR_MESSAGES.UNAUTHORIZED) =>
    new OperationalError(message, 401, 'UNAUTHORIZED'),

  forbidden: (message: string = ERROR_MESSAGES.FORBIDDEN) =>
    new OperationalError(message, 403, 'FORBIDDEN'),

  notFound: (message: string = ERROR_MESSAGES.RECORD_NOT_FOUND) =>
    new OperationalError(message, 404, 'NOT_FOUND'),

  conflict: (message: string = ERROR_MESSAGES.DUPLICATE_ENTRY) =>
    new OperationalError(message, 409, 'CONFLICT'),

  internal: (message: string = ERROR_MESSAGES.INTERNAL_ERROR) =>
    new OperationalError(message, 500, 'INTERNAL_ERROR'),
  serviceUnavailable: (message: string = ERROR_MESSAGES.SERVICE_UNAVAILABLE) =>
    new OperationalError(message, 503, 'SERVICE_UNAVAILABLE'),
};
