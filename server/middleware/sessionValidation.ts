import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// تمديد نوع Request لإضافة خاصية user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Middleware للتحقق من صحة الجلسة
 */
export const validateSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'معرف المستخدم مطلوب',
        code: 'USER_ID_REQUIRED'
      });
    }
    
    // التحقق من أن معرف المستخدم رقم صالح
    const userIdNumber = parseInt(userId);
    if (isNaN(userIdNumber) || userIdNumber <= 0) {
      return res.status(400).json({ 
        error: 'معرف المستخدم غير صالح',
        code: 'INVALID_USER_ID'
      });
    }
    
    // التحقق من وجود المستخدم في قاعدة البيانات
    const user = await storage.getUser(userIdNumber);
    if (!user) {
      return res.status(404).json({ 
        error: 'المستخدم غير موجود',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // التحقق من أن المستخدم متصل
    if (!user.isOnline) {
      return res.status(401).json({ 
        error: 'المستخدم غير متصل',
        code: 'USER_OFFLINE'
      });
    }
    
    // إضافة بيانات المستخدم إلى الطلب
    req.user = user;
    next();
    
  } catch (error) {
    console.error('خطأ في التحقق من الجلسة:', error);
    return res.status(500).json({ 
      error: 'خطأ في التحقق من الجلسة',
      code: 'SESSION_VALIDATION_ERROR'
    });
  }
};

/**
 * Middleware للتحقق من صحة الجلسة (اختياري)
 * لا يرجع خطأ إذا لم يكن المستخدم متصل
 */
export const validateSessionOptional = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return next();
    }
    
    const userIdNumber = parseInt(userId);
    if (isNaN(userIdNumber) || userIdNumber <= 0) {
      return next();
    }
    
    const user = await storage.getUser(userIdNumber);
    if (user && user.isOnline) {
      req.user = user;
    }
    
    next();
    
  } catch (error) {
    console.error('خطأ في التحقق الاختياري من الجلسة:', error);
    next();
  }
};

/**
 * Middleware للتحقق من صحة الجلسة للمشرفين
 */
export const validateAdminSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // التحقق من الجلسة أولاً
    await validateSession(req, res, () => {});
    
    if (!req.user) {
      return res.status(401).json({ 
        error: 'جلسة غير صالحة',
        code: 'INVALID_SESSION'
      });
    }
    
    // التحقق من أن المستخدم مشرف أو مالك
    if (req.user.userType !== 'admin' && req.user.userType !== 'owner') {
      return res.status(403).json({ 
        error: 'صلاحيات غير كافية - مطلوب مشرف أو مالك',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    next();
    
  } catch (error) {
    console.error('خطأ في التحقق من جلسة المشرف:', error);
    return res.status(500).json({ 
      error: 'خطأ في التحقق من الصلاحيات',
      code: 'ADMIN_VALIDATION_ERROR'
    });
  }
};

/**
 * Middleware للتحقق من صحة الجلسة للمالكين فقط
 */
export const validateOwnerSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // التحقق من الجلسة أولاً
    await validateSession(req, res, () => {});
    
    if (!req.user) {
      return res.status(401).json({ 
        error: 'جلسة غير صالحة',
        code: 'INVALID_SESSION'
      });
    }
    
    // التحقق من أن المستخدم مالك
    if (req.user.userType !== 'owner') {
      return res.status(403).json({ 
        error: 'صلاحيات غير كافية - مطلوب مالك فقط',
        code: 'OWNER_ONLY'
      });
    }
    
    next();
    
  } catch (error) {
    console.error('خطأ في التحقق من جلسة المالك:', error);
    return res.status(500).json({ 
      error: 'خطأ في التحقق من الصلاحيات',
      code: 'OWNER_VALIDATION_ERROR'
    });
  }
};

/**
 * تسجيل أحداث الجلسة
 */
export const logSessionEvent = (event: string, userId: number, username: string, details?: any) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    userId,
    username,
    details,
    serverTime: Date.now()
  };
  
  console.log(`📋 [SESSION] ${event}:`, logEntry);
  
  // يمكن إضافة حفظ في ملف أو قاعدة بيانات هنا
};

/**
 * إحصائيات الجلسات
 */
class SessionStats {
  private stats = {
    totalConnections: 0,
    activeConnections: 0,
    disconnections: 0,
    invalidSessions: 0,
    messagesFromInvalidSessions: 0,
    adminActions: 0,
    ownerActions: 0
  };
  
  incrementConnection() {
    this.stats.totalConnections++;
    this.stats.activeConnections++;
  }
  
  incrementDisconnection() {
    this.stats.disconnections++;
    this.stats.activeConnections = Math.max(0, this.stats.activeConnections - 1);
  }
  
  incrementInvalidSession() {
    this.stats.invalidSessions++;
  }
  
  incrementInvalidMessage() {
    this.stats.messagesFromInvalidSessions++;
  }
  
  incrementAdminAction() {
    this.stats.adminActions++;
  }
  
  incrementOwnerAction() {
    this.stats.ownerActions++;
  }
  
  getStats() {
    return { ...this.stats };
  }
  
  resetStats() {
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      disconnections: 0,
      invalidSessions: 0,
      messagesFromInvalidSessions: 0,
      adminActions: 0,
      ownerActions: 0
    };
  }
}

export const sessionStats = new SessionStats();