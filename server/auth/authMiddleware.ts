import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';
import { storage } from '../storage';
import { z } from 'zod';

// تعريف أنواع البيانات
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    userType: string;
    isOnline: boolean;
  };
}

interface AuthenticatedSocket extends Socket {
  userId?: number;
  username?: string;
  userType?: string;
  isAuthenticated?: boolean;
  currentRoom?: string;
}

// Secret key للتوقيع - يجب أن يكون قوي في الإنتاج
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production-2024';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d'; // أسبوع كامل

// Schema للتحقق من صحة البيانات
const authDataSchema = z.object({
  userId: z.number().positive(),
  username: z.string().min(1).max(50),
  userType: z.string().min(1)
});

export class AuthManager {
  
  /**
   * تشفير كلمة المرور
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = 12; // قوة التشفير
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      console.error('❌ خطأ في تشفير كلمة المرور:', error);
      throw new Error('فشل في تشفير كلمة المرور');
    }
  }

  /**
   * التحقق من كلمة المرور
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error('❌ خطأ في التحقق من كلمة المرور:', error);
      return false;
    }
  }

  /**
   * إنشاء JWT token للمستخدم مع بيانات إضافية
   */
  static generateToken(user: { id: number; username: string; userType: string }): string {
    try {
      const payload = {
        userId: user.id,
        username: user.username,
        userType: user.userType,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 أيام
        iss: 'arabic-chat-system', // مُصدر التوكن
        aud: 'arabic-chat-users' // الجمهور المستهدف
      };
      
      return jwt.sign(payload, JWT_SECRET, { 
        expiresIn: JWT_EXPIRY,
        algorithm: 'HS256'
      });
    } catch (error) {
      console.error('❌ خطأ في إنشاء JWT token:', error);
      throw new Error('فشل في إنشاء token الأمان');
    }
  }

  /**
   * التحقق من صحة JWT token مع فحص إضافي
   */
  static verifyToken(token: string): { userId: number; username: string; userType: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'arabic-chat-system',
        audience: 'arabic-chat-users'
      }) as any;
      
      // التحقق من صحة البنية
      const validationResult = authDataSchema.safeParse({
        userId: decoded.userId,
        username: decoded.username,
        userType: decoded.userType
      });
      
      if (!validationResult.success) {
        console.error('❌ بنية JWT token غير صالحة:', validationResult.error);
        return null;
      }
      
      return validationResult.data;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        console.log('⏰ انتهت صلاحية JWT token');
      } else if (error instanceof jwt.JsonWebTokenError) {
        console.error('❌ JWT token غير صالح:', error.message);
      } else {
        console.error('❌ خطأ في التحقق من JWT token:', error);
      }
      return null;
    }
  }

  /**
   * تجديد JWT token
   */
  static refreshToken(oldToken: string): string | null {
    try {
      const decoded = this.verifyToken(oldToken);
      if (!decoded) return null;

      // إنشاء token جديد بنفس البيانات
      return this.generateToken(decoded);
    } catch (error) {
      console.error('❌ خطأ في تجديد JWT token:', error);
      return null;
    }
  }

  /**
   * استخراج token من request headers مع طرق متعددة
   */
  static extractTokenFromRequest(req: Request): string | null {
    // البحث في Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // البحث في cookies
    const cookieToken = req.cookies?.authToken;
    if (cookieToken) {
      return cookieToken;
    }
    
    // البحث في custom header
    const customHeader = req.headers['x-auth-token'] as string;
    if (customHeader) {
      return customHeader;
    }
    
    // البحث في query parameters (للاستخدام الخاص فقط)
    const queryToken = req.query?.token as string;
    if (queryToken && req.method === 'GET') {
      return queryToken;
    }
    
    return null;
  }

  /**
   * التحقق من أن المستخدم موجود وفعال في قاعدة البيانات
   */
  static async validateUserInDatabase(userId: number): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      return user !== null && user !== undefined && !user.isBanned;
    } catch (error) {
      console.error('❌ خطأ في التحقق من المستخدم في قاعدة البيانات:', error);
      return false;
    }
  }

  /**
   * التحقق من صلاحيات المستخدم
   */
  static hasPermission(userType: string, requiredRole: string): boolean {
    const roleHierarchy = {
      'guest': 0,
      'member': 1,
      'moderator': 2,
      'admin': 3,
      'owner': 4
    };

    const userLevel = roleHierarchy[userType as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    return userLevel >= requiredLevel;
  }
}

/**
 * Middleware للتحقق من الهوية في HTTP requests
 */
export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // استخراج token
    const token = AuthManager.extractTokenFromRequest(req);
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'غير مخول - لا يوجد token',
        code: 'NO_TOKEN'
      });
    }

    // التحقق من صحة token
    const decoded = AuthManager.verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ 
        success: false,
        error: 'غير مخول - token غير صالح أو منتهي الصلاحية',
        code: 'INVALID_TOKEN'
      });
    }

    // التحقق من وجود المستخدم في قاعدة البيانات
    const isValidUser = await AuthManager.validateUserInDatabase(decoded.userId);
    
    if (!isValidUser) {
      return res.status(401).json({ 
        success: false,
        error: 'غير مخول - المستخدم غير موجود أو محظور',
        code: 'USER_NOT_FOUND'
      });
    }

    // الحصول على بيانات المستخدم الكاملة
    const user = await storage.getUser(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'غير مخول - فشل في جلب بيانات المستخدم',
        code: 'USER_FETCH_FAILED'
      });
    }

    // إضافة بيانات المستخدم للطلب
    req.user = {
      id: user.id,
      username: user.username,
      userType: user.userType,
      isOnline: user.isOnline
    };

    console.log(`✅ تم التحقق من هوية المستخدم: ${user.username} (${user.userType})`);
    next();
    
  } catch (error) {
    console.error('❌ خطأ في middleware التحقق من الهوية:', error);
    res.status(500).json({ 
      success: false,
      error: 'خطأ في الخادم أثناء التحقق من الهوية',
      code: 'AUTH_SERVER_ERROR'
    });
  }
};

/**
 * Middleware للتحقق من الصلاحيات
 */
export const requireRole = (requiredRole: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'غير مخول',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!AuthManager.hasPermission(req.user.userType, requiredRole)) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية للوصول لهذا المورد',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * التحقق من أن المستخدم في غرفة معينة
 */
export const checkRoomAccess = async (userId: number, roomId: string): Promise<boolean> => {
  try {
    const userRooms = await storage.getUserRooms(userId);
    return userRooms.includes(roomId);
  } catch (error) {
    console.error('❌ خطأ في التحقق من إذن الوصول للغرفة:', error);
    return false;
  }
};

/**
 * التحقق من حالة الاتصال للSocket
 */
export const requireSocketAuth = (socket: AuthenticatedSocket): boolean => {
  if (!socket.isAuthenticated || !socket.userId || !socket.username) {
    socket.emit('authError', { 
      message: 'جلسة غير صالحة - يرجى إعادة تسجيل الدخول',
      code: 'INVALID_SESSION'
    });
    socket.disconnect(true);
    return false;
  }
  return true;
};

// تصدير الأنواع للاستخدام في ملفات أخرى
export type { AuthenticatedRequest, AuthenticatedSocket };