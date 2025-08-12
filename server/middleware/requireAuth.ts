import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';

interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

/**
 * Middleware للتحقق من المصادقة باستخدام JWT
 * يتحقق من هيدر Authorization: Bearer <token>
 * ويملأ req.user بمعلومات المستخدم
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // استخراج التوكن من الهيدر
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'غير مصرح - لم يتم توفير رمز المصادقة' 
      });
    }

    const token = authHeader.substring(7); // إزالة "Bearer " من البداية

    // التحقق من وجود JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET غير محدد في متغيرات البيئة');
      return res.status(500).json({ 
        error: 'خطأ في إعداد الخادم' 
      });
    }

    // التحقق من التوكن
    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'انتهت صلاحية رمز المصادقة' 
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'رمز المصادقة غير صالح' 
        });
      }
      throw jwtError;
    }

    // التحقق من وجود معرف المستخدم
    if (!decoded.userId || typeof decoded.userId !== 'number') {
      return res.status(401).json({ 
        error: 'رمز المصادقة غير صالح - معرف المستخدم مفقود' 
      });
    }

    // جلب معلومات المستخدم من قاعدة البيانات
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        error: 'المستخدم غير موجود' 
      });
    }

    // التحقق من حالة المستخدم
    if (user.isBlocked) {
      return res.status(403).json({ 
        error: 'تم حظر حسابك' 
      });
    }

    // إضافة معلومات المستخدم إلى الطلب
    req.user = {
      id: user.id,
      role: user.userType || 'member'
    };

    next();
  } catch (error) {
    console.error('خطأ في التحقق من المصادقة:', error);
    return res.status(500).json({ 
      error: 'خطأ في التحقق من المصادقة' 
    });
  }
};

/**
 * Middleware للتحقق من صلاحيات المستخدم
 * يتحقق من أن المستخدم يحاول الوصول لموارده الخاصة فقط
 */
export const requireOwnership = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // التحقق من المصادقة أولاً
    if (!req.user) {
      return res.status(401).json({ 
        error: 'غير مصرح - يجب تسجيل الدخول' 
      });
    }

    // استخراج معرف المستخدم من المعاملات
    const requestedUserId = Number(req.params.userId) || Number(req.body.userId);
    
    if (!requestedUserId) {
      return res.status(400).json({ 
        error: 'معرف المستخدم مطلوب' 
      });
    }

    // التحقق من الملكية
    if (req.user.id !== requestedUserId) {
      // السماح للمدراء والمالكين بالوصول
      if (req.user.role !== 'admin' && req.user.role !== 'owner') {
        return res.status(403).json({ 
          error: 'غير مصرح - لا يمكنك الوصول لموارد مستخدم آخر' 
        });
      }
    }

    next();
  } catch (error) {
    console.error('خطأ في التحقق من الملكية:', error);
    return res.status(500).json({ 
      error: 'خطأ في التحقق من الصلاحيات' 
    });
  }
};

/**
 * Middleware للتحقق من دور المستخدم
 * @param allowedRoles - الأدوار المسموح لها بالوصول
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'غير مصرح - يجب تسجيل الدخول' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'غير مصرح - ليس لديك الصلاحيات المطلوبة' 
      });
    }

    next();
  };
};

// تصدير النوع للاستخدام في ملفات أخرى
export type { AuthRequest };