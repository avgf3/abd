import { Router } from 'express';
import { z } from 'zod';

import { roomService } from '../services/roomService';
import { sanitizeInput } from '../security';
import { authLimiter } from '../security';
import { getIO } from '../realtime';
import { 
  roomUpload, 
  cleanupOnError, 
  validateUpload, 
  deleteOldFile 
} from '../middleware/upload';
import {
  checkPermission,
  checkRoomOwnership,
  checkBroadcastPermissions,
  checkBanStatus,
  userRateLimit,
  Permission
} from '../middleware/permissions';

const router = Router();

// 🔐 Schemas للتحقق من صحة البيانات
const createRoomSchema = z.object({
  name: z.string()
    .min(1, 'اسم الغرفة مطلوب')
    .max(50, 'اسم الغرفة طويل جداً (الحد الأقصى 50 حرف)')
    .refine(val => val.trim().length > 0, 'اسم الغرفة لا يمكن أن يكون فارغاً')
    .refine(val => !/[<>\"'&]/.test(val), 'اسم الغرفة يحتوي على رموز غير مسموحة'),
  description: z.string()
    .max(200, 'وصف الغرفة طويل جداً (الحد الأقصى 200 حرف)')
    .optional()
    .default(''),
  userId: z.number().int().positive('معرف المستخدم غير صالح'),
  isBroadcast: z.boolean().optional().default(false)
});

const updateRoomSchema = z.object({
  name: z.string()
    .min(1, 'اسم الغرفة مطلوب')
    .max(50, 'اسم الغرفة طويل جداً')
    .refine(val => !/[<>\"'&]/.test(val), 'اسم الغرفة يحتوي على رموز غير مسموحة')
    .optional(),
  description: z.string()
    .max(200, 'وصف الغرفة طويل جداً')
    .optional(),
  isActive: z.boolean().optional()
});

const roomIdSchema = z.string()
  .min(1, 'معرف الغرفة مطلوب')
  .refine(val => /^[a-zA-Z0-9_-]+$/.test(val), 'معرف الغرفة يحتوي على رموز غير صالحة');

const userIdSchema = z.number().int().positive('معرف المستخدم غير صالح');

// 🛡️ Middleware للتحقق من صحة معرف الغرفة
const validateRoomId = (req: any, res: any, next: any) => {
  try {
    const { roomId } = req.params;
    roomIdSchema.parse(roomId);
    next();
  } catch (error) {
    return res.status(400).json({ 
      success: false,
      error: 'معرف الغرفة غير صالح',
      code: 'INVALID_ROOM_ID',
      details: error instanceof z.ZodError ? error.errors : undefined
    });
  }
};

// 🛡️ Middleware للتحقق من صحة معرف المستخدم
const validateUserId = (req: any, res: any, next: any) => {
  try {
    const userId = parseInt(req.body.userId || req.query.userId);
    if (isNaN(userId)) {
      throw new Error('معرف المستخدم غير صالح');
    }
    userIdSchema.parse(userId);
    req.validatedUserId = userId;
    next();
  } catch (error) {
    return res.status(400).json({ 
      success: false,
      error: 'معرف المستخدم غير صالح',
      code: 'INVALID_USER_ID',
      details: error instanceof z.ZodError ? error.errors : undefined
    });
  }
};

// 🚀 دالة مساعدة للاستجابات الموحدة
const sendResponse = (res: any, data: any, status: number = 200) => {
  res.status(status).json({
    success: status < 400,
    timestamp: new Date().toISOString(),
    version: '2.0',
    ...data
  });
};

// 🚀 دالة مساعدة لمعالجة الأخطاء
const handleError = (res: any, error: any, message: string = 'خطأ في الخادم') => {
  console.error(`${message}:`, error);
  
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  
  if (error.message?.includes('غير موجود')) {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
  } else if (error.message?.includes('غير صالح') || error.message?.includes('مطلوب')) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  } else if (error.message?.includes('صلاحية')) {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
  } else if (error.message?.includes('موجود مسبقاً')) {
    statusCode = 409;
    errorCode = 'CONFLICT';
  }
  
  sendResponse(res, {
    error: error.message || message,
    code: errorCode
  }, statusCode);
};

/**
 * GET /api/rooms
 * جلب جميع الغرف مع تحسينات الأداء والتخزين المؤقت
 */
router.get('/', 
  userRateLimit(30, 60000), // 30 طلب في الدقيقة
  async (req, res) => {
    try {
      // 🚀 رؤوس التخزين المؤقت المحسنة
      const etag = `rooms-${Date.now()}`;
      res.set({
        'Cache-Control': 'public, max-age=30, must-revalidate',
        'ETag': etag,
        'Last-Modified': new Date().toUTCString(),
        'Vary': 'Accept-Encoding'
      });

      // التحقق من If-None-Match للتخزين المؤقت
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }

      const rooms = await roomService.getAllRooms();
      
      // 📊 إحصائيات شاملة ومفيدة
      const stats = {
        total: rooms.length,
        active: rooms.filter(r => r.isActive).length,
        broadcast: rooms.filter(r => r.isBroadcast).length,
        private: rooms.filter(r => !r.isDefault).length,
        default: rooms.filter(r => r.isDefault).length
      };
      
      sendResponse(res, {
        rooms: rooms.map(room => ({
          ...room,
          // إخفاء المعلومات الحساسة
          createdBy: undefined
        })),
        meta: {
          ...stats,
          hasMore: false,
          page: 1,
          limit: rooms.length
        }
      });
    } catch (error) {
      handleError(res, error, 'خطأ في جلب الغرف');
    }
  }
);

/**
 * GET /api/rooms/:roomId
 * جلب غرفة واحدة مع معلومات شاملة
 */
router.get('/:roomId', 
  validateRoomId,
  userRateLimit(60, 60000), // 60 طلب في الدقيقة
  async (req, res) => {
    try {
      const { roomId } = req.params;
      const includeUsers = req.query.includeUsers === 'true';
      const includeBroadcastInfo = req.query.includeBroadcastInfo === 'true';

      const room = await roomService.getRoom(roomId);
      
      if (!room) {
        return sendResponse(res, { 
          error: 'الغرفة غير موجودة',
          roomId 
        }, 404);
      }

      const response: any = { 
        room: {
          ...room,
          // إخفاء المعلومات الحساسة للمستخدمين العاديين
          createdBy: undefined
        }
      };

      // إضافة معلومات إضافية حسب الطلب
      if (includeUsers) {
        response.users = await roomService.getRoomUsers(roomId);
        response.userCount = response.users.length;
      }

      if (includeBroadcastInfo && room.isBroadcast) {
        response.broadcastInfo = await roomService.getBroadcastInfo(roomId);
      }
      
      sendResponse(res, response);
    } catch (error) {
      handleError(res, error, 'خطأ في جلب الغرفة');
    }
  }
);

/**
 * POST /api/rooms
 * إنشاء غرفة جديدة مع رفع صورة اختيارية
 */
router.post('/', 
  authLimiter,
  checkBanStatus,
  checkPermission(Permission.CREATE_ROOM),
  userRateLimit(5, 60000), // 5 غرف في الدقيقة كحد أقصى
  cleanupOnError,
  roomUpload.upload,
  roomUpload.processImage,
  async (req, res) => {
    try {
      // 🔐 تنظيف وتحقق من البيانات
      const sanitizedData = {
        name: sanitizeInput(req.body.name),
        description: sanitizeInput(req.body.description || ''),
        userId: req.user.id,
        isBroadcast: req.body.isBroadcast === 'true' || req.body.isBroadcast === true
      };

      // 🛡️ التحقق من صحة البيانات باستخدام Zod
      const validatedData = createRoomSchema.parse(sanitizedData);

      // 🖼️ معالجة الصورة المرفوعة
      let icon = '';
      if (req.file) {
        icon = `/uploads/rooms/${req.file.filename}`;
      }

      // 🏠 إنشاء الغرفة
      const roomData = {
        name: validatedData.name.trim(),
        description: validatedData.description.trim(),
        icon,
        createdBy: validatedData.userId,
        isBroadcast: validatedData.isBroadcast,
        isDefault: false,
        isActive: true,
        hostId: validatedData.isBroadcast ? validatedData.userId : null
      };

      const room = await roomService.createRoom(roomData);

      if (!room) {
        // حذف الصورة المرفوعة في حالة فشل إنشاء الغرفة
        if (req.file) {
          await deleteOldFile(icon);
        }
        return sendResponse(res, { error: 'فشل في إنشاء الغرفة' }, 500);
      }

      // 📡 إشعار الجميع بإنشاء الغرفة الجديدة
      const io = getIO();
      if (io) {
        io.emit('roomCreated', {
          room: {
            ...room,
            createdBy: undefined // إخفاء معرف المنشئ في الإشعار العام
          },
          creator: {
            id: req.user.id,
            username: req.user.username,
            userType: req.user.userType
          },
          timestamp: new Date().toISOString()
        });
      }

      sendResponse(res, {
        room,
        message: 'تم إنشاء الغرفة بنجاح'
      }, 201);

    } catch (error) {
      // حذف الصورة المرفوعة في حالة الخطأ
      if (req.file) {
        await deleteOldFile(`/uploads/rooms/${req.file.filename}`);
      }

      if (error instanceof z.ZodError) {
        return sendResponse(res, {
          error: 'بيانات غير صالحة',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code
          }))
        }, 400);
      }
      
      handleError(res, error, 'خطأ في إنشاء الغرفة');
    }
  }
);

/**
 * PUT /api/rooms/:roomId
 * تحديث بيانات الغرفة
 */
router.put('/:roomId', 
  validateRoomId,
  validateUserId,
  authLimiter,
  checkBanStatus,
  checkRoomOwnership,
  userRateLimit(10, 60000), // 10 تحديثات في الدقيقة
  async (req, res) => {
    try {
      const { roomId } = req.params;

      // 🛡️ التحقق من صحة البيانات
      const updateData: any = {};
      if (req.body.name) {
        updateData.name = sanitizeInput(req.body.name).trim();
      }
      if (req.body.description !== undefined) {
        updateData.description = sanitizeInput(req.body.description).trim();
      }
      if (req.body.isActive !== undefined) {
        updateData.isActive = req.body.isActive === true || req.body.isActive === 'true';
      }

      // التحقق من صحة البيانات باستخدام Zod
      const validatedData = updateRoomSchema.parse(updateData);

      const updatedRoom = await roomService.updateRoom(roomId, validatedData);

      // إشعار الجميع بالتحديث
      const io = getIO();
      if (io) {
        io.emit('roomUpdated', {
          room: {
            ...updatedRoom,
            createdBy: undefined
          },
          updatedBy: {
            id: req.user.id,
            username: req.user.username
          },
          changes: Object.keys(validatedData),
          timestamp: new Date().toISOString()
        });
      }

      sendResponse(res, {
        room: updatedRoom,
        message: 'تم تحديث الغرفة بنجاح'
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendResponse(res, {
          error: 'بيانات غير صالحة',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code
          }))
        }, 400);
      }
      
      handleError(res, error, 'خطأ في تحديث الغرفة');
    }
  }
);

/**
 * PUT /api/rooms/:roomId/icon
 * تحديث أيقونة الغرفة
 */
router.put('/:roomId/icon', 
  validateRoomId,
  validateUserId,
  authLimiter,
  checkBanStatus,
  checkRoomOwnership,
  checkPermission(Permission.UPLOAD_MEDIA),
  userRateLimit(5, 60000), // 5 تحديثات صور في الدقيقة
  cleanupOnError,
  roomUpload.upload,
  roomUpload.processImage,
  validateUpload('room'),
  async (req, res) => {
    try {
      const { roomId } = req.params;

      if (!req.file) {
        return sendResponse(res, { 
          error: 'لم يتم رفع أي صورة',
          code: 'NO_FILE_UPLOADED'
        }, 400);
      }

      // حذف الأيقونة القديمة
      if (req.room.icon) {
        await deleteOldFile(req.room.icon);
      }

      // حفظ المسار الجديد
      const iconPath = `/uploads/rooms/${req.file.filename}`;

      const updatedRoom = await roomService.updateRoom(roomId, { icon: iconPath });
      
      if (!updatedRoom) {
        await deleteOldFile(iconPath);
        return sendResponse(res, { error: 'فشل تحديث أيقونة الغرفة' }, 500);
      }

      // إشعار بالتحديث
      const io = getIO();
      if (io) {
        io.emit('roomUpdated', {
          room: {
            ...updatedRoom,
            createdBy: undefined
          },
          updatedBy: {
            id: req.user.id,
            username: req.user.username
          },
          changes: ['icon'],
          timestamp: new Date().toISOString()
        });
      }

      sendResponse(res, { 
        room: updatedRoom,
        message: 'تم تحديث أيقونة الغرفة بنجاح'
      });

    } catch (error) {
      // حذف الصورة المرفوعة في حالة الخطأ
      if (req.file) {
        await deleteOldFile(`/uploads/rooms/${req.file.filename}`);
      }
      
      handleError(res, error, 'خطأ في تحديث أيقونة الغرفة');
    }
  }
);

/**
 * DELETE /api/rooms/:roomId/icon
 * حذف أيقونة الغرفة
 */
router.delete('/:roomId/icon', 
  validateRoomId,
  validateUserId,
  authLimiter,
  checkBanStatus,
  checkRoomOwnership,
  userRateLimit(10, 60000),
  async (req, res) => {
    try {
      const { roomId } = req.params;

      if (!req.room.icon) {
        return sendResponse(res, { 
          error: 'الغرفة لا تحتوي على أيقونة',
          code: 'NO_ICON_TO_DELETE'
        }, 400);
      }

      // حذف الأيقونة
      await deleteOldFile(req.room.icon);

      const updatedRoom = await roomService.updateRoom(roomId, { icon: null });

      // إشعار بالتحديث
      const io = getIO();
      if (io) {
        io.emit('roomUpdated', {
          room: {
            ...updatedRoom,
            createdBy: undefined
          },
          updatedBy: {
            id: req.user.id,
            username: req.user.username
          },
          changes: ['icon'],
          timestamp: new Date().toISOString()
        });
      }

      sendResponse(res, { 
        room: updatedRoom,
        message: 'تم حذف أيقونة الغرفة بنجاح'
      });

    } catch (error) {
      handleError(res, error, 'خطأ في حذف أيقونة الغرفة');
    }
  }
);

/**
 * DELETE /api/rooms/:roomId
 * حذف غرفة مع تحسينات الأمان
 */
router.delete('/:roomId', 
  validateRoomId, 
  validateUserId, 
  authLimiter,
  checkBanStatus,
  checkRoomOwnership,
  userRateLimit(3, 60000), // 3 حذف في الدقيقة كحد أقصى
  async (req, res) => {
    try {
      const { roomId } = req.params;

      // منع حذف الغرف الافتراضية
      if (req.room.isDefault) {
        return sendResponse(res, { 
          error: 'لا يمكن حذف الغرفة الافتراضية',
          code: 'CANNOT_DELETE_DEFAULT_ROOM'
        }, 400);
      }

      // الحصول على قائمة المستخدمين قبل الحذف للإشعارات
      const roomUsers = await roomService.getRoomUsers(roomId);
      
      await roomService.deleteRoom(roomId, req.user.id);

      // حذف صورة الغرفة إن وجدت
      if (req.room.icon) {
        await deleteOldFile(req.room.icon);
      }

      // 📡 إشعار محسن لحذف الغرفة
      const io = getIO();
      if (io) {
        // إشعار المستخدمين في الغرفة
        io.to(`room_${roomId}`).emit('roomDeleted', {
          roomId,
          roomName: req.room.name,
          message: 'تم حذف الغرفة',
          deletedBy: {
            id: req.user.id,
            username: req.user.username
          },
          timestamp: new Date().toISOString()
        });

        // إشعار عام لتحديث قائمة الغرف
        io.emit('roomRemoved', {
          roomId,
          roomName: req.room.name,
          affectedUsers: roomUsers.length,
          timestamp: new Date().toISOString()
        });
      }

      sendResponse(res, {
        message: 'تم حذف الغرفة بنجاح',
        roomId,
        affectedUsers: roomUsers.length
      });

    } catch (error) {
      handleError(res, error, 'خطأ في حذف الغرفة');
    }
  }
);

/**
 * POST /api/rooms/:roomId/join
 * الانضمام للغرفة مع منع التكرار والتحسينات
 */
router.post('/:roomId/join', 
  validateRoomId, 
  validateUserId, 
  authLimiter,
  checkBanStatus,
  checkPermission(Permission.JOIN_ROOM),
  userRateLimit(20, 60000), // 20 انضمام في الدقيقة
  async (req, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.validatedUserId;

      // التحقق من وجود الغرفة وحالتها
      const room = await roomService.getRoom(roomId);
      if (!room) {
        return sendResponse(res, { 
          error: 'الغرفة غير موجودة',
          roomId 
        }, 404);
      }

      if (!room.isActive) {
        return sendResponse(res, { 
          error: 'الغرفة غير نشطة حالياً',
          code: 'ROOM_INACTIVE'
        }, 400);
      }

      // 🔍 فحص مسبق للانضمام المتكرر
      const roomUsers = await roomService.getRoomUsers(roomId);
      const isAlreadyInRoom = roomUsers.some(user => user.id === userId);
      
      if (isAlreadyInRoom) {
        return sendResponse(res, {
          message: 'أنت موجود في الغرفة بالفعل',
          alreadyJoined: true,
          roomId,
          roomName: room.name
        });
      }

      await roomService.joinRoom(userId, roomId);

      // 📡 إشعار محسن للانضمام
      const io = getIO();
      if (io) {
        // إشعار المستخدمين في الغرفة
        io.to(`room_${roomId}`).emit('userJoined', {
          roomId,
          roomName: room.name,
          user: {
            id: userId,
            username: req.user.username,
            userType: req.user.userType,
            avatar: req.user.avatar
          },
          timestamp: new Date().toISOString()
        });

        // تحديث عدد المستخدمين
        const updatedCount = await roomService.updateRoomUserCount(roomId);
        io.emit('roomUserCountUpdated', {
          roomId,
          userCount: updatedCount,
          timestamp: new Date().toISOString()
        });
      }

      sendResponse(res, {
        message: 'تم الانضمام للغرفة بنجاح',
        roomId,
        roomName: room.name,
        joined: true
      });

    } catch (error) {
      handleError(res, error, 'خطأ في الانضمام للغرفة');
    }
  }
);

/**
 * POST /api/rooms/:roomId/leave
 * مغادرة الغرفة مع التحسينات
 */
router.post('/:roomId/leave', 
  validateRoomId, 
  validateUserId, 
  authLimiter,
  userRateLimit(20, 60000), // 20 مغادرة في الدقيقة
  async (req, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.validatedUserId;

      const room = await roomService.getRoom(roomId);
      if (!room) {
        return sendResponse(res, { 
          error: 'الغرفة غير موجودة',
          roomId 
        }, 404);
      }

      // 🔍 فحص مسبق للمغادرة
      const roomUsers = await roomService.getRoomUsers(roomId);
      const isInRoom = roomUsers.some(user => user.id === userId);
      
      if (!isInRoom) {
        return sendResponse(res, {
          message: 'أنت لست في هذه الغرفة',
          notInRoom: true,
          roomId,
          roomName: room.name
        });
      }

      await roomService.leaveRoom(userId, roomId);

      // 📡 إشعار محسن للمغادرة
      const io = getIO();
      if (io) {
        // إشعار المستخدمين في الغرفة
        io.to(`room_${roomId}`).emit('userLeft', {
          roomId,
          roomName: room.name,
          user: {
            id: userId,
            username: req.user?.username
          },
          timestamp: new Date().toISOString()
        });

        // تحديث عدد المستخدمين
        const updatedCount = await roomService.updateRoomUserCount(roomId);
        io.emit('roomUserCountUpdated', {
          roomId,
          userCount: updatedCount,
          timestamp: new Date().toISOString()
        });
      }

      sendResponse(res, {
        message: 'تم مغادرة الغرفة بنجاح',
        roomId,
        roomName: room.name,
        left: true
      });

    } catch (error) {
      handleError(res, error, 'خطأ في مغادرة الغرفة');
    }
  }
);

/**
 * GET /api/rooms/:roomId/users
 * جلب مستخدمي الغرفة مع معلومات إضافية
 */
router.get('/:roomId/users', 
  validateRoomId,
  userRateLimit(30, 60000),
  async (req, res) => {
    try {
      const { roomId } = req.params;
      const includeStats = req.query.includeStats === 'true';
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const allUsers = await roomService.getRoomUsers(roomId);
      
      // تطبيق التصفح
      const startIndex = (page - 1) * limit;
      const users = allUsers.slice(startIndex, startIndex + limit);
      
      const response: any = { 
        users: users.map(user => ({
          ...user,
          // إخفاء المعلومات الحساسة
          email: undefined,
          password: undefined,
          ip: undefined
        })),
        pagination: {
          page,
          limit,
          total: allUsers.length,
          totalPages: Math.ceil(allUsers.length / limit),
          hasMore: startIndex + limit < allUsers.length
        }
      };

      if (includeStats) {
        response.stats = {
          total: allUsers.length,
          admins: allUsers.filter(u => ['admin', 'owner'].includes(u.userType)).length,
          moderators: allUsers.filter(u => u.userType === 'moderator').length,
          regular: allUsers.filter(u => u.userType === 'user').length,
          online: allUsers.filter(u => u.isOnline).length,
          byUserType: {
            owner: allUsers.filter(u => u.userType === 'owner').length,
            admin: allUsers.filter(u => u.userType === 'admin').length,
            moderator: allUsers.filter(u => u.userType === 'moderator').length,
            user: allUsers.filter(u => u.userType === 'user').length
          }
        };
      }

      sendResponse(res, response);
    } catch (error) {
      handleError(res, error, 'خطأ في جلب مستخدمي الغرفة');
    }
  }
);

/**
 * GET /api/rooms/:roomId/broadcast-info
 * جلب معلومات البث للغرفة
 */
router.get('/:roomId/broadcast-info', 
  validateRoomId,
  userRateLimit(60, 60000),
  async (req, res) => {
    try {
      const { roomId } = req.params;
      const info = await roomService.getBroadcastInfo(roomId);
      
      if (!info) {
        return sendResponse(res, { 
          error: 'الغرفة ليست غرفة بث',
          code: 'NOT_BROADCAST_ROOM'
        }, 404);
      }
      
      sendResponse(res, { info });
    } catch (error) {
      handleError(res, error, 'خطأ في جلب معلومات البث');
    }
  }
);

/**
 * GET /api/rooms/stats
 * جلب إحصائيات شاملة للغرف
 */
router.get('/stats', 
  userRateLimit(10, 60000),
  async (req, res) => {
    try {
      const stats = await roomService.getRoomsStats();
      
      // إضافة معلومات إضافية
      const extendedStats = {
        ...stats,
        performance: {
          averageUsersPerRoom: stats.totalConnectedUsers > 0 ? 
            Math.round((stats.totalConnectedUsers / Math.max(stats.activeRooms, 1)) * 100) / 100 : 0,
          utilizationRate: stats.totalRooms > 0 ? 
            Math.round((stats.activeRooms / stats.totalRooms) * 10000) / 100 : 0,
          broadcastUtilization: stats.totalRooms > 0 ?
            Math.round((stats.broadcastRooms / stats.totalRooms) * 10000) / 100 : 0
        },
        health: {
          status: stats.activeRooms > 0 ? 'healthy' : 'warning',
          lastUpdated: new Date().toISOString()
        }
      };
      
      sendResponse(res, { stats: extendedStats });
    } catch (error) {
      handleError(res, error, 'خطأ في جلب إحصائيات الغرف');
    }
  }
);

// 🚀 مسارات إدارة البث المحسنة

/**
 * POST /api/rooms/:roomId/request-mic
 * طلب الميكروفون في غرفة البث
 */
router.post('/:roomId/request-mic', 
  validateRoomId, 
  validateUserId, 
  authLimiter,
  checkBanStatus,
  userRateLimit(10, 60000), // 10 طلبات في الدقيقة
  async (req, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.validatedUserId;

      await roomService.requestMic(roomId, userId);

      // إرسال إشعار محسن للمشرفين
      const io = getIO();
      if (io) {
        io.to(`room_${roomId}`).emit('micRequested', {
          roomId,
          user: {
            id: userId,
            username: req.user?.username,
            userType: req.user?.userType,
            avatar: req.user?.avatar
          },
          timestamp: new Date().toISOString()
        });
      }

      sendResponse(res, { 
        message: 'تم إرسال طلب الميكروفون',
        roomId
      });
    } catch (error) {
      handleError(res, error, 'خطأ في طلب الميكروفون');
    }
  }
);

/**
 * POST /api/rooms/:roomId/approve-mic/:userId
 * الموافقة على طلب الميكروفون
 */
router.post('/:roomId/approve-mic/:userId', 
  validateRoomId, 
  authLimiter,
  checkBanStatus,
  checkBroadcastPermissions,
  userRateLimit(20, 60000),
  async (req, res) => {
    try {
      const { roomId, userId } = req.params;
      const approvedBy = req.user.id;

      await roomService.approveMic(roomId, parseInt(userId), approvedBy);

      // إرسال إشعار محسن
      const io = getIO();
      if (io) {
        const approvedUser = await roomService.getUser(parseInt(userId));

        io.to(`room_${roomId}`).emit('micApproved', {
          roomId,
          user: {
            id: parseInt(userId),
            username: approvedUser?.username,
            avatar: approvedUser?.avatar
          },
          approver: {
            id: approvedBy,
            username: req.user.username
          },
          timestamp: new Date().toISOString()
        });
      }

      sendResponse(res, { 
        message: 'تمت الموافقة على الميكروفون',
        userId: parseInt(userId),
        roomId
      });
    } catch (error) {
      handleError(res, error, 'خطأ في الموافقة على الميكروفون');
    }
  }
);

/**
 * POST /api/rooms/:roomId/reject-mic/:userId
 * رفض طلب الميكروفون
 */
router.post('/:roomId/reject-mic/:userId', 
  validateRoomId, 
  authLimiter,
  checkBanStatus,
  checkBroadcastPermissions,
  userRateLimit(20, 60000),
  async (req, res) => {
    try {
      const { roomId, userId } = req.params;
      const rejectedBy = req.user.id;

      await roomService.rejectMic(roomId, parseInt(userId), rejectedBy);

      // إرسال إشعار محسن
      const io = getIO();
      if (io) {
        const rejectedUser = await roomService.getUser(parseInt(userId));

        io.to(`room_${roomId}`).emit('micRejected', {
          roomId,
          user: {
            id: parseInt(userId),
            username: rejectedUser?.username
          },
          rejecter: {
            id: rejectedBy,
            username: req.user.username
          },
          timestamp: new Date().toISOString()
        });
      }

      sendResponse(res, { 
        message: 'تم رفض طلب الميكروفون',
        userId: parseInt(userId),
        roomId
      });
    } catch (error) {
      handleError(res, error, 'خطأ في رفض الميكروفون');
    }
  }
);

/**
 * POST /api/rooms/:roomId/remove-speaker/:userId
 * إزالة متحدث من غرفة البث
 */
router.post('/:roomId/remove-speaker/:userId', 
  validateRoomId, 
  authLimiter,
  checkBanStatus,
  checkBroadcastPermissions,
  userRateLimit(15, 60000),
  async (req, res) => {
    try {
      const { roomId, userId } = req.params;
      const removedBy = req.user.id;

      await roomService.removeSpeaker(roomId, parseInt(userId), removedBy);

      // إرسال إشعار محسن
      const io = getIO();
      if (io) {
        const removedUser = await roomService.getUser(parseInt(userId));

        io.to(`room_${roomId}`).emit('speakerRemoved', {
          roomId,
          user: {
            id: parseInt(userId),
            username: removedUser?.username
          },
          remover: {
            id: removedBy,
            username: req.user.username
          },
          timestamp: new Date().toISOString()
        });
      }

      sendResponse(res, { 
        message: 'تم إزالة المتحدث',
        userId: parseInt(userId),
        roomId
      });
    } catch (error) {
      handleError(res, error, 'خطأ في إزالة المتحدث');
    }
  }
);

export default router;