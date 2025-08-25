import fs from 'fs';
import path from 'path';

import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { roomService } from '../services/roomService';
import { protect } from '../middleware/enhancedSecurity';

const router = Router();

// إعداد multer لرفع صور الغرف
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'client', 'public', 'uploads', 'rooms');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `room-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}`));
    }
  },
});

// إضافة مخطط تحقق للإنشاء عبر Zod
const createRoomSchema = z.object({
  name: z
    .string({ required_error: 'اسم الغرفة مطلوب' })
    .trim()
    .min(1, 'اسم الغرفة مطلوب')
    .max(100, 'اسم الغرفة طويل جداً'),
  description: z
    .string()
    .trim()
    .max(300, 'الوصف طويل جداً')
    .optional()
    .default(''),
  isBroadcast: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true'),
});

// وضع /stats قبل المسارات ذات المعاملات لتجنب التعارض مع :roomId
router.get('/stats', protect.admin, async (req, res) => {
  try {
    const stats = await roomService.getRoomsStats();
    res.json({ stats });
  } catch (error) {
    console.error('خطأ في جلب إحصائيات الغرف:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/**
 * GET /api/rooms
 * جلب جميع الغرف مع تحسينات الأداء
 */
router.get('/', async (req, res) => {
  try {
    // 🚀 تحسينات الكاش والأداء
    const version = roomService.getRoomsVersion?.() || 1;
    const etag = `"rooms-v${version}-${Date.now() / 10000 | 0}"`; // ETag يتغير كل 10 ثواني

    // Cache-Control محسّن: كاش قصير مع إعادة التحقق
    res.setHeader('Cache-Control', 'public, max-age=5, s-maxage=10, stale-while-revalidate=30');
    res.setHeader('ETag', etag);
    res.setHeader('Vary', 'Accept-Encoding'); // للتعامل مع الضغط
    
    // التحقق من ETag للحفظ في النطاق الترددي
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    const rooms = await roomService.getAllRooms();

    // 📊 إضافة إحصائيات مفيدة
    const response = {
      rooms,
      meta: {
        total: rooms.length,
        broadcast: rooms.filter((r) => r.isBroadcast).length,
        active: rooms.filter((r) => r.isActive).length,
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error('خطأ في جلب الغرف:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/**
 * GET /api/rooms/:roomId
 * جلب غرفة واحدة
 */
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await roomService.getRoom(roomId);

    if (!room) {
      return res.status(404).json({ error: 'الغرفة غير موجودة' });
    }

    res.json({ room });
  } catch (error) {
    console.error('خطأ في جلب الغرفة:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/**
 * POST /api/rooms
 * إنشاء غرفة جديدة
 */
router.post('/', protect.admin, upload.single('image'), async (req, res) => {
  try {
    const parsed = createRoomSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'بيانات غير صحيحة' });
    }
    const { name, description, isBroadcast } = parsed.data as any;

    // معالجة الصورة
    let icon = '';
    if (req.file) {
      icon = `/uploads/rooms/${req.file.filename}`;
    }

    const creatorId = (req as any).user?.id as number;
    const roomData = {
      name,
      description,
      icon,
      createdBy: creatorId,
      isBroadcast: !!isBroadcast,
    };

    const room = await roomService.createRoom(roomData);

    res.json({ room });
  } catch (error: any) {
    console.error('خطأ في إنشاء الغرفة:', error);

    // حذف الملف المرفوع في حالة الخطأ
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (deleteError) {
        console.warn('تعذر حذف الملف المرفوع:', deleteError);
      }
    }

    res.status(400).json({ error: error.message || 'خطأ في إنشاء الغرفة' });
  }
});

/**
 * PUT /api/rooms/:roomId/icon
 * تحديث أيقونة الغرفة بعد الإنشاء
 */
router.put('/:roomId/icon', protect.auth, upload.single('image'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const requester = (req as any).user;

    const room = await roomService.getRoom(roomId);
    if (!room) {
      // تنظيف ملف مرفوع إن وُجد
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(404).json({ error: 'الغرفة غير موجودة' });
    }

    const creatorOrAdmin = (room as any).createdBy === requester?.id || ['admin', 'owner'].includes(requester?.userType);
    if (!creatorOrAdmin) {
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(403).json({ error: 'غير مسموح بتحديث أيقونة الغرفة' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم رفع أي صورة' });
    }

    // حفظ المسار
    const iconPath = `/uploads/rooms/${req.file.filename}`;

    // حذف أيقونة سابقة لو وجدت
    if ((room as any).icon) {
      try {
        const rel = (room as any).icon.startsWith('/') ? (room as any).icon.slice(1) : (room as any).icon;
        const p = path.join(process.cwd(), 'client', 'public', rel);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {}
    }

    const updated = await (
      await import('../storage')
    ).storage.updateRoom(String(roomId), { icon: iconPath } as any);
    if (!updated) {
      return res.status(500).json({ error: 'فشل تحديث أيقونة الغرفة' });
    }

    try { roomService.invalidateRoomsCache(); } catch {}

    res.json({ success: true, room: updated });
  } catch (error: any) {
    console.error('خطأ في تحديث أيقونة الغرفة:', error);
    // تنظيف الملف عند الخطأ
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    res.status(400).json({ error: error.message || 'خطأ في تحديث أيقونة الغرفة' });
  }
});

/**
 * DELETE /api/rooms/:roomId
 * حذف غرفة
 */
router.delete('/:roomId', protect.auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const requesterId = (req as any).user?.id as number;

    await roomService.deleteRoom(roomId, requesterId);

    // 🚀 إشعار واحد محسن لحذف الغرفة
    // لا بث عام عبر REST هنا لتفادي التعارض مع Socket.IO
    // يمكن الاعتماد على Socket لإرسال إشعار حذف الغرفة عند الحاجة

    res.json({ message: 'تم حذف الغرفة بنجاح' });
  } catch (error: any) {
    console.error('خطأ في حذف الغرفة:', error);
    res.status(400).json({ error: error.message || 'خطأ في حذف الغرفة' });
  }
});

/**
 * POST /api/rooms/:roomId/join
 * الانضمام لغرفة مع منع التكرار
 */
router.post('/:roomId/join', protect.auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = (req as any).user?.id as number;

    // 🔍 التحقق من أن المستخدم ليس في الغرفة بالفعل
    const roomUsers = await roomService.getRoomUsers(roomId);
    const isAlreadyInRoom = roomUsers.some((user: any) => user.id === userId);

    if (isAlreadyInRoom) {
      return res.json({
        message: 'أنت موجود في الغرفة بالفعل',
        alreadyJoined: true,
      });
    }

    await roomService.joinRoom(userId, roomId);

    // لا بث عبر REST لتفادي التعارض مع Socket.IO
    // إرجاع استجابة موحدة فقط
    res.json({
      message: 'تم الانضمام للغرفة بنجاح',
      roomId,
      joined: true,
    });
  } catch (error: any) {
    console.error('خطأ في الانضمام للغرفة:', error);
    res.status(400).json({ error: error.message || 'خطأ في الانضمام للغرفة' });
  }
});

/**
 * POST /api/rooms/:roomId/leave
 * مغادرة غرفة مع التحسينات
 */
router.post('/:roomId/leave', protect.auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = (req as any).user?.id as number;

    // 🔍 التحقق من أن المستخدم في الغرفة فعلاً
    const roomUsers = await roomService.getRoomUsers(roomId);
    const isInRoom = roomUsers.some((user: any) => user.id === userId);

    if (!isInRoom) {
      return res.json({
        message: 'أنت لست في هذه الغرفة',
        notInRoom: true,
      });
    }

    await roomService.leaveRoom(userId, roomId);

    // لا بث عبر REST لتفادي التعارض مع Socket.IO
    res.json({
      message: 'تم مغادرة الغرفة بنجاح',
      roomId,
      left: true,
    });
  } catch (error: any) {
    console.error('خطأ في مغادرة الغرفة:', error);
    res.status(400).json({ error: error.message || 'خطأ في مغادرة الغرفة' });
  }
});

/**
 * GET /api/rooms/:roomId/users
 * جلب مستخدمي الغرفة
 */
router.get('/:roomId/users', async (req, res) => {
  try {
    const { roomId } = req.params;
    const users = await roomService.getRoomUsers(roomId);
    res.json({ users });
  } catch (error) {
    console.error('خطأ في جلب مستخدمي الغرفة:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/**
 * GET /api/rooms/:roomId/broadcast-info
 * جلب معلومات البث للغرفة
 */
router.get('/:roomId/broadcast-info', async (req, res) => {
  try {
    const { roomId } = req.params;
    const info = await roomService.getBroadcastInfo(roomId);

    if (!info) {
      return res.status(404).json({ error: 'الغرفة ليست غرفة بث' });
    }

    res.json({ info });
  } catch (error) {
    console.error('خطأ في جلب معلومات البث:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/**
 * POST /api/rooms/:roomId/request-mic
 * طلب الميكروفون في غرفة البث
 */
router.post('/:roomId/request-mic', protect.auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = (req as any).user?.id as number;

    await roomService.requestMic(roomId, userId);

    // إرسال إشعار للمشرفين
    const io = req.app.get('io');
    io?.to(`room_${roomId}`).emit('micRequested', {
      roomId,
      userId,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'تم إرسال طلب الميكروفون' });
  } catch (error: any) {
    console.error('خطأ في طلب الميكروفون:', error);
    res.status(400).json({ error: error.message || 'خطأ في طلب الميكروفون' });
  }
});

/**
 * POST /api/rooms/:roomId/approve-mic/:userId
 * الموافقة على طلب الميكروفون
 */
router.post('/:roomId/approve-mic/:userId', protect.moderator, async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    const approvedBy = (req as any).user?.id as number;

    await roomService.approveMic(roomId, parseInt(userId), approvedBy);

    // إرسال إشعار بالموافقة
    const io = req.app.get('io');
    io?.to(`room_${roomId}`).emit('micApproved', {
      roomId,
      userId: parseInt(userId),
      approvedBy,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'تمت الموافقة على الميكروفون' });
  } catch (error: any) {
    console.error('خطأ في الموافقة على الميكروفون:', error);
    res.status(400).json({ error: error.message || 'خطأ في الموافقة على الميكروفون' });
  }
});

/**
 * POST /api/rooms/:roomId/reject-mic/:userId
 * رفض طلب الميكروفون
 */
router.post('/:roomId/reject-mic/:userId', protect.moderator, async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    const rejectedBy = (req as any).user?.id as number;

    await roomService.rejectMic(roomId, parseInt(userId), rejectedBy);

    // إرسال إشعار بالرفض
    const io = req.app.get('io');
    io?.to(`room_${roomId}`).emit('micRejected', {
      roomId,
      userId: parseInt(userId),
      rejectedBy,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'تم رفض طلب الميكروفون' });
  } catch (error: any) {
    console.error('خطأ في رفض الميكروفون:', error);
    res.status(400).json({ error: error.message || 'خطأ في رفض الميكروفون' });
  }
});

/**
 * POST /api/rooms/:roomId/remove-speaker/:userId
 * إزالة متحدث من غرفة البث
 */
router.post('/:roomId/remove-speaker/:userId', protect.moderator, async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    const removedBy = (req as any).user?.id as number;

    await roomService.removeSpeaker(roomId, parseInt(userId), removedBy);

    // إرسال إشعار بإزالة المتحدث
    const io = req.app.get('io');
    io?.to(`room_${roomId}`).emit('speakerRemoved', {
      roomId,
      userId: parseInt(userId),
      removedBy,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'تم إزالة المتحدث' });
  } catch (error: any) {
    console.error('خطأ في إزالة المتحدث:', error);
    res.status(400).json({ error: error.message || 'خطأ في إزالة المتحدث' });
  }
});

export default router;
