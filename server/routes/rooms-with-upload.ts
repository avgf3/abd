import fs from 'fs';
import path from 'path';
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

const router = Router();

// 🔐 Schema للتحقق من صحة البيانات
const createRoomSchema = z.object({
  name: z.string()
    .min(1, 'اسم الغرفة مطلوب')
    .max(50, 'اسم الغرفة طويل جداً')
    .refine(val => val.trim().length > 0, 'اسم الغرفة لا يمكن أن يكون فارغاً'),
  description: z.string()
    .max(200, 'وصف الغرفة طويل جداً')
    .optional(),
  userId: z.number().int().positive('معرف المستخدم غير صالح'),
  isBroadcast: z.boolean().optional().default(false)
});

const updateRoomSchema = z.object({
  name: z.string()
    .min(1, 'اسم الغرفة مطلوب')
    .max(50, 'اسم الغرفة طويل جداً')
    .optional(),
  description: z.string()
    .max(200, 'وصف الغرفة طويل جداً')
    .optional(),
  isActive: z.boolean().optional()
});

// 🛡️ Middleware للتحقق من صحة معرف الغرفة
const validateRoomId = (req: any, res: any, next: any) => {
  try {
    const { roomId } = req.params;
    if (!roomId || !/^[a-zA-Z0-9_-]+$/.test(roomId)) {
      return res.status(400).json({ 
        success: false,
        error: 'معرف الغرفة غير صالح',
        code: 'INVALID_ROOM_ID'
      });
    }
    next();
  } catch (error) {
    return res.status(400).json({ 
      success: false,
      error: 'معرف الغرفة غير صالح',
      code: 'INVALID_ROOM_ID'
    });
  }
};

// 🛡️ Middleware للتحقق من صحة معرف المستخدم
const validateUserId = (req: any, res: any, next: any) => {
  try {
    const userId = parseInt(req.body.userId || req.query.userId);
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'معرف المستخدم غير صالح',
        code: 'INVALID_USER_ID'
      });
    }
    req.validatedUserId = userId;
    next();
  } catch (error) {
    return res.status(400).json({ 
      success: false,
      error: 'معرف المستخدم غير صالح',
      code: 'INVALID_USER_ID'
    });
  }
};

// 🚀 دالة مساعدة للاستجابات الموحدة
const sendResponse = (res: any, data: any, status: number = 200) => {
  res.status(status).json({
    success: status < 400,
    timestamp: new Date().toISOString(),
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
router.get('/', async (req, res) => {
  try {
    // 🚀 رؤوس التخزين المؤقت المحسنة
    const etag = `rooms-${Date.now()}`;
    res.set({
      'Cache-Control': 'public, max-age=30, must-revalidate',
      'ETag': etag,
      'Last-Modified': new Date().toUTCString()
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
      rooms,
      meta: {
        ...stats,
        timestamp: new Date().toISOString(),
        version: '2.0'
      }
    });
  } catch (error) {
    handleError(res, error, 'خطأ في جلب الغرف');
  }
});

/**
 * GET /api/rooms/:roomId
 * جلب غرفة واحدة مع معلومات شاملة
 */
router.get('/:roomId', validateRoomId, async (req, res) => {
  try {
    const { roomId } = req.params;
    const includeUsers = req.query.includeUsers === 'true';
    const includeBroadcastInfo = req.query.includeBroadcastInfo === 'true';

    const room = await roomService.getRoom(roomId);
    
    if (!room) {
      return sendResponse(res, { error: 'الغرفة غير موجودة' }, 404);
    }

    const response: any = { room };

    // إضافة معلومات إضافية حسب الطلب
    if (includeUsers) {
      response.users = await roomService.getRoomUsers(roomId);
    }

    if (includeBroadcastInfo && room.isBroadcast) {
      response.broadcastInfo = await roomService.getBroadcastInfo(roomId);
    }
    
    sendResponse(res, response);
  } catch (error) {
    handleError(res, error, 'خطأ في جلب الغرفة');
  }
});

/**
 * POST /api/rooms
 * إنشاء غرفة جديدة مع رفع صورة اختيارية
 */
router.post('/', 
  authLimiter,
  cleanupOnError,
  roomUpload.upload,
  roomUpload.processImage,
  validateUpload('room'),
  async (req, res) => {
    try {
      // 🔐 تنظيف وتحقق من البيانات
      const sanitizedData = {
        name: sanitizeInput(req.body.name),
        description: sanitizeInput(req.body.description || ''),
        userId: parseInt(req.body.userId),
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
        description: validatedData.description?.trim() || '',
        icon,
        createdBy: validatedData.userId,
        isBroadcast: validatedData.isBroadcast,
        isDefault: false,
        isActive: true
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
          room,
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
            message: e.message
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
  async (req, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.validatedUserId;

      // التحقق من وجود الغرفة والصلاحيات
      const room = await roomService.getRoom(roomId);
      if (!room) {
        return sendResponse(res, { error: 'الغرفة غير موجودة' }, 404);
      }

      // التحقق من الصلاحيات (منشئ الغرفة أو أدمن)
      const user = await roomService.getUser(userId);
      const canEdit = room.createdBy === userId || ['admin', 'owner'].includes(user?.userType || '');
      
      if (!canEdit) {
        return sendResponse(res, { error: 'ليس لديك صلاحية لتعديل هذه الغرفة' }, 403);
      }

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
          room: updatedRoom,
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
            message: e.message
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
  cleanupOnError,
  roomUpload.upload,
  roomUpload.processImage,
  validateUpload('room'),
  async (req, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.validatedUserId;

      if (!req.file) {
        return sendResponse(res, { error: 'لم يتم رفع أي صورة' }, 400);
      }

      // التحقق من الصلاحية
      const room = await roomService.getRoom(roomId);
      if (!room) {
        return sendResponse(res, { error: 'الغرفة غير موجودة' }, 404);
      }

      const user = await roomService.getUser(userId);
      const canEdit = room.createdBy === userId || ['admin', 'owner'].includes(user?.userType || '');
      
      if (!canEdit) {
        return sendResponse(res, { error: 'ليس لديك صلاحية لتعديل هذه الغرفة' }, 403);
      }

      // حذف الأيقونة القديمة
      if (room.icon) {
        await deleteOldFile(room.icon);
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
          room: updatedRoom,
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
  async (req, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.validatedUserId;

      // التحقق من الصلاحية
      const room = await roomService.getRoom(roomId);
      if (!room) {
        return sendResponse(res, { error: 'الغرفة غير موجودة' }, 404);
      }

      const user = await roomService.getUser(userId);
      const canEdit = room.createdBy === userId || ['admin', 'owner'].includes(user?.userType || '');
      
      if (!canEdit) {
        return sendResponse(res, { error: 'ليس لديك صلاحية لتعديل هذه الغرفة' }, 403);
      }

      if (!room.icon) {
        return sendResponse(res, { error: 'الغرفة لا تحتوي على أيقونة' }, 400);
      }

      // حذف الأيقونة
      await deleteOldFile(room.icon);

      const updatedRoom = await roomService.updateRoom(roomId, { icon: null });

      // إشعار بالتحديث
      const io = getIO();
      if (io) {
        io.emit('roomUpdated', {
          room: updatedRoom,
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
router.delete('/:roomId', validateRoomId, validateUserId, authLimiter, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.validatedUserId;

    // الحصول على بيانات الغرفة قبل الحذف لحذف الصورة
    const room = await roomService.getRoom(roomId);
    
    await roomService.deleteRoom(roomId, userId);

    // حذف صورة الغرفة إن وجدت
    if (room?.icon) {
      await deleteOldFile(room.icon);
    }

    // 📡 إشعار محسن لحذف الغرفة
    const io = getIO();
    if (io) {
      // إشعار المستخدمين في الغرفة
      io.to(`room_${roomId}`).emit('roomDeleted', {
        roomId,
        message: 'تم حذف الغرفة',
        timestamp: new Date().toISOString()
      });

      // إشعار عام لتحديث قائمة الغرف
      io.emit('roomRemoved', {
        roomId,
        timestamp: new Date().toISOString()
      });
    }

    sendResponse(res, {
      message: 'تم حذف الغرفة بنجاح',
      roomId
    });

  } catch (error) {
    handleError(res, error, 'خطأ في حذف الغرفة');
  }
});

/**
 * POST /api/rooms/:roomId/join
 * الانضمام للغرفة مع منع التكرار والتحسينات
 */
router.post('/:roomId/join', validateRoomId, validateUserId, authLimiter, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.validatedUserId;

    // 🔍 فحص مسبق للانضمام المتكرر
    const roomUsers = await roomService.getRoomUsers(roomId);
    const isAlreadyInRoom = roomUsers.some(user => user.id === userId);
    
    if (isAlreadyInRoom) {
      return sendResponse(res, {
        message: 'أنت موجود في الغرفة بالفعل',
        alreadyJoined: true,
        roomId
      });
    }

    await roomService.joinRoom(userId, roomId);

    // 📡 إشعار محسن للانضمام
    const io = getIO();
    if (io) {
      const user = await roomService.getUser(userId);
      
      // إشعار المستخدمين في الغرفة
      io.to(`room_${roomId}`).emit('userJoined', {
        roomId,
        user: {
          id: userId,
          username: user?.username,
          userType: user?.userType
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
      joined: true
    });

  } catch (error) {
    handleError(res, error, 'خطأ في الانضمام للغرفة');
  }
});

/**
 * POST /api/rooms/:roomId/leave
 * مغادرة الغرفة مع التحسينات
 */
router.post('/:roomId/leave', validateRoomId, validateUserId, authLimiter, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.validatedUserId;

    // 🔍 فحص مسبق للمغادرة
    const roomUsers = await roomService.getRoomUsers(roomId);
    const isInRoom = roomUsers.some(user => user.id === userId);
    
    if (!isInRoom) {
      return sendResponse(res, {
        message: 'أنت لست في هذه الغرفة',
        notInRoom: true,
        roomId
      });
    }

    await roomService.leaveRoom(userId, roomId);

    // 📡 إشعار محسن للمغادرة
    const io = getIO();
    if (io) {
      const user = await roomService.getUser(userId);
      
      // إشعار المستخدمين في الغرفة
      io.to(`room_${roomId}`).emit('userLeft', {
        roomId,
        user: {
          id: userId,
          username: user?.username
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
      left: true
    });

  } catch (error) {
    handleError(res, error, 'خطأ في مغادرة الغرفة');
  }
});

/**
 * GET /api/rooms/:roomId/users
 * جلب مستخدمي الغرفة مع معلومات إضافية
 */
router.get('/:roomId/users', validateRoomId, async (req, res) => {
  try {
    const { roomId } = req.params;
    const includeStats = req.query.includeStats === 'true';

    const users = await roomService.getRoomUsers(roomId);
    
    const response: any = { 
      users,
      count: users.length
    };

    if (includeStats) {
      response.stats = {
        admins: users.filter(u => ['admin', 'owner'].includes(u.userType)).length,
        moderators: users.filter(u => u.userType === 'moderator').length,
        regular: users.filter(u => u.userType === 'user').length,
        online: users.filter(u => u.isOnline).length
      };
    }

    sendResponse(res, response);
  } catch (error) {
    handleError(res, error, 'خطأ في جلب مستخدمي الغرفة');
  }
});

/**
 * GET /api/rooms/:roomId/broadcast-info
 * جلب معلومات البث للغرفة
 */
router.get('/:roomId/broadcast-info', validateRoomId, async (req, res) => {
  try {
    const { roomId } = req.params;
    const info = await roomService.getBroadcastInfo(roomId);
    
    if (!info) {
      return sendResponse(res, { error: 'الغرفة ليست غرفة بث' }, 404);
    }
    
    sendResponse(res, { info });
  } catch (error) {
    handleError(res, error, 'خطأ في جلب معلومات البث');
  }
});

/**
 * GET /api/rooms/stats
 * جلب إحصائيات شاملة للغرف
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await roomService.getRoomsStats();
    
    // إضافة معلومات إضافية
    const extendedStats = {
      ...stats,
      performance: {
        averageUsersPerRoom: stats.totalConnectedUsers > 0 ? 
          Math.round((stats.totalConnectedUsers / stats.activeRooms) * 100) / 100 : 0,
        utilizationRate: stats.totalRooms > 0 ? 
          Math.round((stats.activeRooms / stats.totalRooms) * 10000) / 100 : 0
      },
      timestamp: new Date().toISOString()
    };
    
    sendResponse(res, { stats: extendedStats });
  } catch (error) {
    handleError(res, error, 'خطأ في جلب إحصائيات الغرف');
  }
});

// 🚀 مسارات إدارة البث المحسنة (تم نقلها من الملف الأصلي مع التحسينات)

/**
 * POST /api/rooms/:roomId/request-mic
 * طلب الميكروفون في غرفة البث
 */
router.post('/:roomId/request-mic', validateRoomId, validateUserId, authLimiter, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.validatedUserId;

    await roomService.requestMic(roomId, userId);

    // إرسال إشعار محسن للمشرفين
    const io = getIO();
    if (io) {
      const user = await roomService.getUser(userId);
      io.to(`room_${roomId}`).emit('micRequested', {
        roomId,
        user: {
          id: userId,
          username: user?.username,
          userType: user?.userType
        },
        timestamp: new Date().toISOString()
      });
    }

    sendResponse(res, { message: 'تم إرسال طلب الميكروفون' });
  } catch (error) {
    handleError(res, error, 'خطأ في طلب الميكروفون');
  }
});

/**
 * POST /api/rooms/:roomId/approve-mic/:userId
 * الموافقة على طلب الميكروفون
 */
router.post('/:roomId/approve-mic/:userId', validateRoomId, authLimiter, async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    const approvedBy = parseInt(req.body.approvedBy);

    if (!approvedBy || isNaN(approvedBy)) {
      return sendResponse(res, { error: 'معرف المعتمد غير صالح' }, 400);
    }

    await roomService.approveMic(roomId, parseInt(userId), approvedBy);

    // إرسال إشعار محسن
    const io = getIO();
    if (io) {
      const [user, approver] = await Promise.all([
        roomService.getUser(parseInt(userId)),
        roomService.getUser(approvedBy)
      ]);

      io.to(`room_${roomId}`).emit('micApproved', {
        roomId,
        user: {
          id: parseInt(userId),
          username: user?.username
        },
        approver: {
          id: approvedBy,
          username: approver?.username
        },
        timestamp: new Date().toISOString()
      });
    }

    sendResponse(res, { message: 'تمت الموافقة على الميكروفون' });
  } catch (error) {
    handleError(res, error, 'خطأ في الموافقة على الميكروفون');
  }
});

/**
 * POST /api/rooms/:roomId/reject-mic/:userId
 * رفض طلب الميكروفون
 */
router.post('/:roomId/reject-mic/:userId', validateRoomId, authLimiter, async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    const rejectedBy = parseInt(req.body.rejectedBy);

    if (!rejectedBy || isNaN(rejectedBy)) {
      return sendResponse(res, { error: 'معرف الرافض غير صالح' }, 400);
    }

    await roomService.rejectMic(roomId, parseInt(userId), rejectedBy);

    // إرسال إشعار محسن
    const io = getIO();
    if (io) {
      const [user, rejecter] = await Promise.all([
        roomService.getUser(parseInt(userId)),
        roomService.getUser(rejectedBy)
      ]);

      io.to(`room_${roomId}`).emit('micRejected', {
        roomId,
        user: {
          id: parseInt(userId),
          username: user?.username
        },
        rejecter: {
          id: rejectedBy,
          username: rejecter?.username
        },
        timestamp: new Date().toISOString()
      });
    }

    sendResponse(res, { message: 'تم رفض طلب الميكروفون' });
  } catch (error) {
    handleError(res, error, 'خطأ في رفض الميكروفون');
  }
});

/**
 * POST /api/rooms/:roomId/remove-speaker/:userId
 * إزالة متحدث من غرفة البث
 */
router.post('/:roomId/remove-speaker/:userId', validateRoomId, authLimiter, async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    const removedBy = parseInt(req.body.removedBy);

    if (!removedBy || isNaN(removedBy)) {
      return sendResponse(res, { error: 'معرف المُزيل غير صالح' }, 400);
    }

    await roomService.removeSpeaker(roomId, parseInt(userId), removedBy);

    // إرسال إشعار محسن
    const io = getIO();
    if (io) {
      const [user, remover] = await Promise.all([
        roomService.getUser(parseInt(userId)),
        roomService.getUser(removedBy)
      ]);

      io.to(`room_${roomId}`).emit('speakerRemoved', {
        roomId,
        user: {
          id: parseInt(userId),
          username: user?.username
        },
        remover: {
          id: removedBy,
          username: remover?.username
        },
        timestamp: new Date().toISOString()
      });
    }

    sendResponse(res, { message: 'تم إزالة المتحدث' });
  } catch (error) {
    handleError(res, error, 'خطأ في إزالة المتحدث');
  }
});

export default router;