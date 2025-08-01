import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { createError, ERROR_MESSAGES } from './errorHandler';
import { log } from '../utils/productionLogger';

// تمديد نوع Request
declare global {
  namespace Express {
    interface Request {
      user?: any;
      session?: any;
    }
  }
}

// أنواع الحماية المختلفة
export enum ProtectionLevel {
  PUBLIC = 'public',           // مفتوح للجميع
  AUTHENTICATED = 'authenticated', // يتطلب تسجيل دخول
  MEMBER = 'member',           // يتطلب عضوية
  MODERATOR = 'moderator',     // يتطلب صلاحيات إشراف
  ADMIN = 'admin',             // يتطلب صلاحيات إدارية
  OWNER = 'owner'              // يتطلب صلاحيات المالك
}

// خريطة الأذونات
const PERMISSION_HIERARCHY = {
  'guest': 0,
  'member': 1,
  'moderator': 2,
  'admin': 3,
  'owner': 4
};

// دالة للتحقق من مستوى الإذن
function hasPermission(userRole: string, requiredLevel: ProtectionLevel): boolean {
  const userLevel = PERMISSION_HIERARCHY[userRole as keyof typeof PERMISSION_HIERARCHY] ?? -1;
  const requiredLevelNum = PERMISSION_HIERARCHY[requiredLevel as keyof typeof PERMISSION_HIERARCHY] ?? 5;
  
  return userLevel >= requiredLevelNum;
}

// Middleware للتحقق من المصادقة الأساسية
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // البحث عن معرف المستخدم في الجسم، المعاملات، أو الجلسة
    let userId: number | undefined;
    
    if (req.body?.userId) {
      userId = parseInt(req.body.userId);
    } else if (req.params?.userId) {
      userId = parseInt(req.params.userId);
    } else if (req.params?.id) {
      userId = parseInt(req.params.id);
    } else if (req.session?.userId) {
      userId = parseInt(req.session.userId);
    }

    if (!userId || isNaN(userId)) {
      log.security('محاولة وصول بدون معرف مستخدم صالح', {
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      throw createError.unauthorized('معرف المستخدم مطلوب للوصول لهذه الخدمة');
    }

    // التحقق من وجود المستخدم
    const user = await storage.getUser(userId);
    if (!user) {
      log.security('محاولة وصول بمعرف مستخدم غير موجود', {
        userId,
        ip: req.ip,
        path: req.path
      });
      throw createError.unauthorized('المستخدم غير موجود');
    }

    // التحقق من أن المستخدم ليس محظوراً
    if (user.isBanned) {
      log.security('محاولة وصول من مستخدم محظور', {
        userId: user.id,
        username: user.username,
        ip: req.ip
      });
      throw createError.forbidden('حسابك محظور مؤقتاً');
    }

    // إضافة بيانات المستخدم للطلب
    req.user = user;
    next();

  } catch (error) {
    next(error);
  }
};

// Middleware للتحقق من مستوى الحماية
export const requirePermission = (level: ProtectionLevel) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // التحقق من المصادقة أولاً
      if (level !== ProtectionLevel.PUBLIC) {
        await requireAuth(req, res, () => {});
        
        if (!req.user) {
          throw createError.unauthorized();
        }
      }

      // التحقق من مستوى الإذن
      if (level !== ProtectionLevel.PUBLIC && level !== ProtectionLevel.AUTHENTICATED) {
        const userRole = req.user?.userType || 'guest';
        
        if (!hasPermission(userRole, level)) {
          log.security('محاولة وصول بصلاحيات غير كافية', {
            userId: req.user?.id,
            username: req.user?.username,
            userRole,
            requiredLevel: level,
            path: req.path,
            ip: req.ip
          });
          
          throw createError.forbidden(`هذا الإجراء يتطلب صلاحيات ${level}`);
        }
      }

      next();

    } catch (error) {
      next(error);
    }
  };
};

// Middleware للتحقق من ملكية المورد
export const requireOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await requireAuth(req, res, () => {});
    
    if (!req.user) {
      throw createError.unauthorized();
    }

    // التحقق من أن المستخدم يحاول الوصول لبياناته الخاصة فقط
    const resourceUserId = parseInt(req.params.userId || req.params.id || req.body.userId);
    const currentUserId = req.user.id;

    if (resourceUserId !== currentUserId) {
      // السماح للمشرفين والمالكين بالوصول لبيانات المستخدمين الآخرين
      const isPrivileged = req.user.userType === 'admin' || 
                          req.user.userType === 'owner' || 
                          req.user.userType === 'moderator';
      
      if (!isPrivileged) {
        log.security('محاولة وصول لبيانات مستخدم آخر', {
          userId: currentUserId,
          targetUserId: resourceUserId,
          path: req.path,
          ip: req.ip
        });
        
        throw createError.forbidden('لا يمكنك الوصول لبيانات مستخدم آخر');
      }
    }

    next();

  } catch (error) {
    next(error);
  }
};

// Middleware للتحقق من الحد الزمني للعمليات الحساسة
export const requireRecentAuth = (maxAgeMinutes: number = 30) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await requireAuth(req, res, () => {});
      
      if (!req.user) {
        throw createError.unauthorized();
      }

      // التحقق من آخر مرة قام فيها المستخدم بتسجيل الدخول
      const lastLoginTime = new Date(req.user.lastSeen || req.user.createdAt);
      const maxAge = maxAgeMinutes * 60 * 1000; // تحويل لميلي ثانية
      
      if (Date.now() - lastLoginTime.getTime() > maxAge) {
        log.security('محاولة عملية حساسة بجلسة قديمة', {
          userId: req.user.id,
          lastLogin: lastLoginTime,
          maxAgeMinutes,
          path: req.path
        });
        
        throw createError.unauthorized('يرجى تسجيل الدخول مرة أخرى لتنفيذ هذا الإجراء');
      }

      next();

    } catch (error) {
      next(error);
    }
  };
};

// Middleware للتحقق من أن المستخدم متصل حالياً
export const requireOnlineStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await requireAuth(req, res, () => {});
    
    if (!req.user) {
      throw createError.unauthorized();
    }

    if (!req.user.isOnline) {
      log.security('محاولة عملية من مستخدم غير متصل', {
        userId: req.user.id,
        username: req.user.username,
        path: req.path
      });
      
      throw createError.unauthorized('يجب أن تكون متصلاً لتنفيذ هذا الإجراء');
    }

    next();

  } catch (error) {
    next(error);
  }
};

// Middleware لتسجيل النشاط
export const logActivity = (actionType: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data: any) {
      // تسجيل النشاط عند إرسال الاستجابة
      if (req.user && res.statusCode < 400) {
        log.user(`نشاط مستخدم: ${actionType}`, {
          userId: req.user.id,
          username: req.user.username,
          action: actionType,
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          timestamp: new Date().toISOString()
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// دوال مساعدة للاستخدام السريع
export const protect = {
  public: requirePermission(ProtectionLevel.PUBLIC),
  auth: requirePermission(ProtectionLevel.AUTHENTICATED),
  member: requirePermission(ProtectionLevel.MEMBER),
  moderator: requirePermission(ProtectionLevel.MODERATOR),
  admin: requirePermission(ProtectionLevel.ADMIN),
  owner: requirePermission(ProtectionLevel.OWNER),
  ownership: requireOwnership,
  online: requireOnlineStatus,
  recentAuth: requireRecentAuth,
  log: logActivity
};