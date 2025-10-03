import type { Request, Response, NextFunction } from 'express';
import { getAuthTokenFromRequest, verifyAuthToken } from '../utils/auth-token';
import { isUserId, isBotId, parseEntityId, isBotEntityId, isUserEntityId } from '../types/entities';

// إضافة خصائص مخصصة لـ Request
declare global {
  namespace Express {
    interface Request {
      entityId?: number;
      entityType?: 'user' | 'bot';
      isValidUser?: boolean;
      isValidBot?: boolean;
    }
  }
}

/**
 * Middleware للتحقق من أن المستخدم المصادق عليه هو مستخدم حقيقي وليس بوت
 */
export function requireUser(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getAuthTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ 
        error: 'المصادقة مطلوبة',
        code: 'AUTH_REQUIRED' 
      });
    }

    const verified = verifyAuthToken(token);
    if (!verified?.userId) {
      return res.status(401).json({ 
        error: 'رمز المصادقة غير صالح',
        code: 'INVALID_TOKEN' 
      });
    }

    // التحقق من أن المعرف ينتمي لمستخدم حقيقي وليس بوت
    if (!isUserId(verified.userId)) {
      return res.status(403).json({ 
        error: 'هذه العملية مخصصة للمستخدمين الحقيقيين فقط',
        code: 'USER_REQUIRED' 
      });
    }

    // إضافة المعلومات للطلب
    req.entityId = verified.userId;
    req.entityType = 'user';
    req.isValidUser = true;
    req.isValidBot = false;

    next();
  } catch (error) {
    console.error('خطأ في middleware requireUser:', error);
    return res.status(500).json({ 
      error: 'خطأ في التحقق من المصادقة',
      code: 'AUTH_ERROR' 
    });
  }
}

/**
 * Middleware للتحقق من أن العملية تتم على بوت (للعمليات الإدارية)
 */
export function requireBotOperation(req: Request, res: Response, next: NextFunction) {
  try {
    // أولاً: التأكد من أن المستخدم الذي يقوم بالعملية هو مستخدم حقيقي
    const token = getAuthTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ 
        error: 'المصادقة مطلوبة',
        code: 'AUTH_REQUIRED' 
      });
    }

    const verified = verifyAuthToken(token);
    if (!verified?.userId || !isUserId(verified.userId)) {
      return res.status(403).json({ 
        error: 'غير مصرح لك بهذه العملية',
        code: 'UNAUTHORIZED' 
      });
    }

    // ثانياً: التحقق من أن المعرف المستهدف هو بوت
    const rawTarget = (req.params.id as any) ?? (req.body as any)?.botId;
    const parsed = parseEntityId(rawTarget);
    const targetId = parsed.id;
    if (!targetId || !isBotEntityId(rawTarget)) {
      return res.status(400).json({ 
        error: 'معرف البوت غير صالح',
        code: 'INVALID_BOT_ID' 
      });
    }

    // إضافة المعلومات للطلب
    req.entityId = verified.userId; // المستخدم الذي يقوم بالعملية
    req.entityType = 'user';
    (req as any).targetBotId = targetId; // البوت المستهدف (رقمي)

    next();
  } catch (error) {
    console.error('خطأ في middleware requireBotOperation:', error);
    return res.status(500).json({ 
      error: 'خطأ في التحقق من العملية',
      code: 'VALIDATION_ERROR' 
    });
  }
}

/**
 * Middleware عام للتحقق من نوع الكيان
 */
export function validateEntityType(expectedType: 'user' | 'bot') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = getAuthTokenFromRequest(req);
      if (!token) {
        return res.status(401).json({ 
          error: 'المصادقة مطلوبة',
          code: 'AUTH_REQUIRED' 
        });
      }

      const verified = verifyAuthToken(token);
      if (!verified?.userId) {
        return res.status(401).json({ 
          error: 'رمز المصادقة غير صالح',
          code: 'INVALID_TOKEN' 
        });
      }

      // التحقق من نوع الكيان
      const actualType = isBotId(verified.userId) ? 'bot' : 'user';
      if (actualType !== expectedType) {
        return res.status(403).json({ 
          error: `هذه العملية مخصصة لـ ${expectedType === 'user' ? 'المستخدمين' : 'البوتات'} فقط`,
          code: 'WRONG_ENTITY_TYPE',
          expected: expectedType,
          actual: actualType
        });
      }

      // إضافة المعلومات للطلب
      req.entityId = verified.userId;
      req.entityType = actualType;
      req.isValidUser = actualType === 'user';
      req.isValidBot = actualType === 'bot';

      next();
    } catch (error) {
      console.error('خطأ في middleware validateEntityType:', error);
      return res.status(500).json({ 
        error: 'خطأ في التحقق من نوع الكيان',
        code: 'VALIDATION_ERROR' 
      });
    }
  };
}

/**
 * Middleware للتحقق من صحة معرف الكيان في المعاملات
 */
export function validateEntityIdParam(paramName: string = 'id', expectedType?: 'user' | 'bot') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const raw = req.params[paramName];
      const parsed = parseEntityId(raw as any);
      const entityId = parsed.id;
      if (!entityId || isNaN(entityId)) {
        return res.status(400).json({ 
          error: 'معرف الكيان غير صالح',
          code: 'INVALID_ENTITY_ID' 
        });
      }

      // التحقق من نوع الكيان إذا تم تحديده
      if (expectedType) {
        const actualType = isBotEntityId(raw as any) ? 'bot' : (isUserEntityId(raw as any) ? 'user' : (isBotId(entityId) ? 'bot' : 'user'));
        if (actualType !== expectedType) {
          return res.status(400).json({ 
            error: `معرف ${expectedType === 'user' ? 'المستخدم' : 'البوت'} غير صالح`,
            code: 'WRONG_ENTITY_ID_TYPE',
            expected: expectedType,
            actual: actualType
          });
        }
      }

      // إضافة المعلومات للطلب
      (req as any).validatedEntityId = entityId;
      (req as any).validatedEntityType = isBotEntityId(raw as any) ? 'bot' : (isUserEntityId(raw as any) ? 'user' : (isBotId(entityId) ? 'bot' : 'user'));

      next();
    } catch (error) {
      console.error('خطأ في middleware validateEntityIdParam:', error);
      return res.status(500).json({ 
        error: 'خطأ في التحقق من معرف الكيان',
        code: 'VALIDATION_ERROR' 
      });
    }
  };
}

/**
 * دالة مساعدة للتحقق من الصلاحيات
 */
export function hasPermission(userType: string, requiredPermission: string): boolean {
  const permissions: Record<string, string[]> = {
    'owner': ['all'],
    'admin': ['manage_users', 'manage_bots', 'moderate'],
    'moderator': ['moderate'],
    'member': ['chat'],
    'guest': ['chat'],
    'bot': [] // البوتات لا تملك صلاحيات مباشرة
  };

  const userPermissions = permissions[userType] || [];
  return userPermissions.includes('all') || userPermissions.includes(requiredPermission);
}