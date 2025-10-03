import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { fromError } from 'zod-validation-error';

/**
 * Middleware factory للتحقق من صحة البيانات
 */
export function validate<T>(schema: z.ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // التحقق من البيانات
      const validated = await schema.parseAsync(req.body);
      
      // استبدال البيانات الأصلية بالبيانات المحققة (بعد التحويلات)
      req.body = validated;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // تحويل أخطاء Zod إلى رسائل واضحة
        const validationError = fromError(error);
        
        res.status(400).json({
          error: 'بيانات غير صالحة',
          message: validationError.toString(),
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      } else {
        res.status(500).json({
          error: 'خطأ في معالجة الطلب'
        });
      }
    }
  };
}

/**
 * Middleware للتحقق من معاملات الاستعلام
 */
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromError(error);
        
        res.status(400).json({
          error: 'معاملات استعلام غير صالحة',
          message: validationError.toString(),
          details: error.errors
        });
      } else {
        res.status(500).json({
          error: 'خطأ في معالجة الطلب'
        });
      }
    }
  };
}

/**
 * Middleware للتحقق من معاملات المسار
 */
export function validateParams<T>(schema: z.ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.params);
      req.params = validated as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromError(error);
        
        res.status(400).json({
          error: 'معاملات مسار غير صالحة',
          message: validationError.toString(),
          details: error.errors
        });
      } else {
        res.status(500).json({
          error: 'خطأ في معالجة الطلب'
        });
      }
    }
  };
}

/**
 * Middleware للتحقق من البيانات المدمجة (body + query + params)
 */
export function validateAll<T>(schemas: {
  body?: z.ZodSchema<any>;
  query?: z.ZodSchema<any>;
  params?: z.ZodSchema<any>;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const errors: any[] = [];
    
    try {
      // التحقق من body
      if (schemas.body) {
        try {
          req.body = await schemas.body.parseAsync(req.body);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(...error.errors.map(err => ({
              ...err,
              source: 'body'
            })));
          }
        }
      }
      
      // التحقق من query
      if (schemas.query) {
        try {
          req.query = await schemas.query.parseAsync(req.query) as any;
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(...error.errors.map(err => ({
              ...err,
              source: 'query'
            })));
          }
        }
      }
      
      // التحقق من params
      if (schemas.params) {
        try {
          req.params = await schemas.params.parseAsync(req.params) as any;
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(...error.errors.map(err => ({
              ...err,
              source: 'params'
            })));
          }
        }
      }
      
      // إذا كانت هناك أخطاء، أرسل الاستجابة
      if (errors.length > 0) {
        res.status(400).json({
          error: 'بيانات غير صالحة',
          details: errors.map(err => ({
            source: err.source,
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
        return;
      }
      
      next();
    } catch (error) {
      res.status(500).json({
        error: 'خطأ في معالجة الطلب'
      });
    }
  };
}

/**
 * دالة مساعدة لتنظيف البيانات من الحقول غير المرغوبة
 */
export function sanitizeData<T extends Record<string, any>>(
  data: T,
  allowedFields: (keyof T)[]
): Partial<T> {
  const sanitized: Partial<T> = {};
  
  for (const field of allowedFields) {
    if (field in data) {
      sanitized[field] = data[field];
    }
  }
  
  return sanitized;
}

/**
 * Middleware لتنظيف البيانات الواردة
 */
export function sanitizeBody(allowedFields: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeData(req.body, allowedFields);
    }
    next();
  };
}