import { Request, Response, NextFunction } from 'express';
import { roomService } from '../services/roomService';

// 🔐 أنواع الأذونات
export enum Permission {
  CREATE_ROOM = 'create_room',
  EDIT_ROOM = 'edit_room',
  DELETE_ROOM = 'delete_room',
  MANAGE_BROADCAST = 'manage_broadcast',
  MODERATE_ROOM = 'moderate_room',
  JOIN_ROOM = 'join_room',
  UPLOAD_MEDIA = 'upload_media'
}

// 🎭 أنواع المستخدمين وصلاحياتهم
export const USER_PERMISSIONS = {
  owner: [
    Permission.CREATE_ROOM,
    Permission.EDIT_ROOM,
    Permission.DELETE_ROOM,
    Permission.MANAGE_BROADCAST,
    Permission.MODERATE_ROOM,
    Permission.JOIN_ROOM,
    Permission.UPLOAD_MEDIA
  ],
  admin: [
    Permission.CREATE_ROOM,
    Permission.EDIT_ROOM,
    Permission.DELETE_ROOM,
    Permission.MANAGE_BROADCAST,
    Permission.MODERATE_ROOM,
    Permission.JOIN_ROOM,
    Permission.UPLOAD_MEDIA
  ],
  moderator: [
    Permission.MODERATE_ROOM,
    Permission.JOIN_ROOM,
    Permission.UPLOAD_MEDIA
  ],
  user: [
    Permission.JOIN_ROOM
  ]
} as const;

// 🛡️ التحقق من الصلاحيات العامة
export const checkPermission = (permission: Permission) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.validatedUserId || parseInt(req.body.userId || req.query.userId);
      
      if (!userId || isNaN(userId)) {
        return res.status(401).json({
          success: false,
          error: 'مطلوب تسجيل الدخول',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      const user = await roomService.getUser(userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'المستخدم غير موجود',
          code: 'USER_NOT_FOUND'
        });
      }

      const userType = user.userType || 'user';
      const userPermissions = USER_PERMISSIONS[userType as keyof typeof USER_PERMISSIONS] || USER_PERMISSIONS.user;

      if (!userPermissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          error: 'ليس لديك الصلاحية للقيام بهذا الإجراء',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermission: permission,
          userType
        });
      }

      // إضافة بيانات المستخدم للطلب
      req.user = user;
      next();
    } catch (error) {
      console.error('خطأ في التحقق من الصلاحيات:', error);
      return res.status(500).json({
        success: false,
        error: 'خطأ في التحقق من الصلاحيات',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

// 🏠 التحقق من ملكية الغرفة أو صلاحيات الأدمن
export const checkRoomOwnership = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { roomId } = req.params;
    const userId = req.validatedUserId || parseInt(req.body.userId || req.query.userId);
    
    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: 'معرف الغرفة مطلوب',
        code: 'ROOM_ID_REQUIRED'
      });
    }

    if (!userId || isNaN(userId)) {
      return res.status(401).json({
        success: false,
        error: 'مطلوب تسجيل الدخول',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    const room = await roomService.getRoom(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'الغرفة غير موجودة',
        code: 'ROOM_NOT_FOUND'
      });
    }

    const user = await roomService.getUser(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'المستخدم غير موجود',
        code: 'USER_NOT_FOUND'
      });
    }

    // التحقق من الملكية أو الصلاحيات
    const isOwner = room.createdBy === userId;
    const isAdmin = ['admin', 'owner'].includes(user.userType || '');
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية للتعديل على هذه الغرفة',
        code: 'NOT_ROOM_OWNER'
      });
    }

    // إضافة بيانات الغرفة والمستخدم للطلب
    req.room = room;
    req.user = user;
    req.isRoomOwner = isOwner;
    req.isAdmin = isAdmin;
    
    next();
  } catch (error) {
    console.error('خطأ في التحقق من ملكية الغرفة:', error);
    return res.status(500).json({
      success: false,
      error: 'خطأ في التحقق من الصلاحيات',
      code: 'OWNERSHIP_CHECK_ERROR'
    });
  }
};

// 📻 التحقق من صلاحيات إدارة البث
export const checkBroadcastPermissions = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { roomId } = req.params;
    const userId = req.validatedUserId || parseInt(req.body.userId || req.query.userId);
    
    const room = await roomService.getRoom(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'الغرفة غير موجودة',
        code: 'ROOM_NOT_FOUND'
      });
    }

    if (!room.isBroadcast) {
      return res.status(400).json({
        success: false,
        error: 'هذه ليست غرفة بث',
        code: 'NOT_BROADCAST_ROOM'
      });
    }

    const user = await roomService.getUser(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'المستخدم غير موجود',
        code: 'USER_NOT_FOUND'
      });
    }

    // التحقق من صلاحيات البث
    const isHost = room.hostId === userId;
    const isOwner = room.createdBy === userId;
    const canManageBroadcast = ['admin', 'owner', 'moderator'].includes(user.userType || '');
    
    if (!isHost && !isOwner && !canManageBroadcast) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية لإدارة هذا البث',
        code: 'INSUFFICIENT_BROADCAST_PERMISSIONS'
      });
    }

    // إضافة بيانات للطلب
    req.room = room;
    req.user = user;
    req.isHost = isHost;
    req.isOwner = isOwner;
    req.canManageBroadcast = canManageBroadcast;
    
    next();
  } catch (error) {
    console.error('خطأ في التحقق من صلاحيات البث:', error);
    return res.status(500).json({
      success: false,
      error: 'خطأ في التحقق من صلاحيات البث',
      code: 'BROADCAST_PERMISSION_ERROR'
    });
  }
};

// 🚫 التحقق من حالة الحظر
export const checkBanStatus = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.validatedUserId || parseInt(req.body.userId || req.query.userId);
    
    if (!userId || isNaN(userId)) {
      return next();
    }

    const user = await roomService.getUser(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'المستخدم غير موجود',
        code: 'USER_NOT_FOUND'
      });
    }

    // التحقق من حالة الحظر العام
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        error: 'تم حظر حسابك',
        code: 'USER_BANNED'
      });
    }

    // التحقق من حالة التوقيف المؤقت
    if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
      return res.status(403).json({
        success: false,
        error: `حسابك موقف حتى ${new Date(user.suspendedUntil).toLocaleDateString('ar')}`,
        code: 'USER_SUSPENDED',
        suspendedUntil: user.suspendedUntil
      });
    }

    next();
  } catch (error) {
    console.error('خطأ في التحقق من حالة الحظر:', error);
    return res.status(500).json({
      success: false,
      error: 'خطأ في التحقق من حالة الحساب',
      code: 'BAN_CHECK_ERROR'
    });
  }
};

// 🎯 التحقق من معدل الطلبات لكل مستخدم
export const userRateLimit = (maxRequests: number, windowMs: number) => {
  const userRequests = new Map<number, { count: number; resetTime: number }>();

  return async (req: any, res: Response, next: NextFunction) => {
    const userId = req.validatedUserId || parseInt(req.body.userId || req.query.userId);
    
    if (!userId || isNaN(userId)) {
      return next();
    }

    const now = Date.now();
    const userLimit = userRequests.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // إنشاء أو إعادة تعيين العداد
      userRequests.set(userId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (userLimit.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'تم تجاوز الحد الأقصى للطلبات',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
      });
    }

    // زيادة العداد
    userLimit.count++;
    next();
  };
};

// 🧹 تنظيف البيانات المؤقتة كل ساعة
setInterval(() => {
  // تنظيف بيانات معدل الطلبات المنتهية الصلاحية
  // يمكن إضافة منطق تنظيف هنا إذا لزم الأمر
}, 60 * 60 * 1000);

export default {
  checkPermission,
  checkRoomOwnership,
  checkBroadcastPermissions,
  checkBanStatus,
  userRateLimit,
  Permission,
  USER_PERMISSIONS
};