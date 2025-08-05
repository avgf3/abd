import jwt from 'jsonwebtoken';
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
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// Schema للتحقق من صحة البيانات
const authDataSchema = z.object({
  userId: z.number().positive(),
  username: z.string().min(1).max(50),
  userType: z.string().min(1)
});

export class AuthManager {
  
  /**
   * إنشاء JWT token للمستخدم
   */
  static generateToken(user: { id: number; username: string; userType: string }): string {
    try {
      const payload = {
        userId: user.id,
        username: user.username,
        userType: user.userType,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 ساعة
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
   * التحقق من صحة JWT token
   */
  static verifyToken(token: string): { userId: number; username: string; userType: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
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
   * استخراج token من request headers
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
    
    // البحث في query parameters (للاستخدام الخاص فقط)
    const queryToken = req.query?.token as string;
    if (queryToken) {
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
      return user !== null && user !== undefined;
    } catch (error) {
      console.error('❌ خطأ في التحقق من المستخدم في قاعدة البيانات:', error);
      return false;
    }
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
        error: 'غير مخول - لا يوجد token',
        code: 'NO_TOKEN'
      });
    }

    // التحقق من صحة token
    const decoded = AuthManager.verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ 
        error: 'غير مخول - token غير صالح',
        code: 'INVALID_TOKEN'
      });
    }

    // التحقق من وجود المستخدم في قاعدة البيانات
    const isValidUser = await AuthManager.validateUserInDatabase(decoded.userId);
    
    if (!isValidUser) {
      return res.status(401).json({ 
        error: 'غير مخول - المستخدم غير موجود',
        code: 'USER_NOT_FOUND'
      });
    }

    // الحصول على بيانات المستخدم الكاملة
    const user = await storage.getUser(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ 
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
      error: 'خطأ في الخادم أثناء التحقق من الهوية',
      code: 'AUTH_SERVER_ERROR'
    });
  }
};

/**
 * التحقق من الهوية في Socket.IO connections
 */
export const socketAuthMiddleware = async (socket: AuthenticatedSocket, next: Function) => {
  try {
    // استخراج token من handshake
    const token = socket.handshake.auth?.token || 
                 socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
                 socket.handshake.query?.token as string;

    if (!token) {
      console.log('❌ Socket connection بدون token');
      return next(new Error('غير مخول - لا يوجد token'));
    }

    // التحقق من صحة token
    const decoded = AuthManager.verifyToken(token);
    
    if (!decoded) {
      console.log('❌ Socket connection مع token غير صالح');
      return next(new Error('غير مخول - token غير صالح'));
    }

    // التحقق من وجود المستخدم في قاعدة البيانات
    const isValidUser = await AuthManager.validateUserInDatabase(decoded.userId);
    
    if (!isValidUser) {
      console.log('❌ Socket connection مع مستخدم غير موجود');
      return next(new Error('غير مخول - المستخدم غير موجود'));
    }

    // الحصول على بيانات المستخدم الكاملة
    const user = await storage.getUser(decoded.userId);
    
    if (!user) {
      console.log('❌ فشل في جلب بيانات المستخدم للSocket');
      return next(new Error('فشل في التحقق من بيانات المستخدم'));
    }

    // إضافة بيانات المستخدم للSocket
    socket.userId = user.id;
    socket.username = user.username;
    socket.userType = user.userType;
    socket.isAuthenticated = true;

    console.log(`✅ Socket authenticated: ${user.username} (${user.userType})`);
    next();
    
  } catch (error) {
    console.error('❌ خطأ في Socket auth middleware:', error);
    next(new Error('خطأ في الخادم أثناء التحقق من الهوية'));
  }
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
    socket.emit('error', { 
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