import { Router } from 'express';
import { roomService } from '../services/roomService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth as requireJwtAuth } from '../middleware/requireAuth';

const router = Router();

// فرض المصادقة على جميع مسارات الغرف
router.use(requireJwtAuth as any);

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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `room-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
      'image/webp', 'image/svg+xml'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}`));
    }
  }
});

/**
 * GET /api/rooms
 * جلب جميع الغرف مع تحسينات الأداء
 */
router.get('/', async (req, res) => {
  try {
    // 🚀 إضافة رؤوس التخزين المؤقت لتحسين الأداء
    res.set({
      'Cache-Control': 'public, max-age=30', // 30 ثانية cache
      'ETag': `rooms-${Date.now()}` // ETag للتحقق من التغييرات
    });

    const rooms = await roomService.getAllRooms();
    
    // 📊 إضافة إحصائيات مفيدة
    const response = {
      rooms,
      meta: {
        total: rooms.length,
        broadcast: rooms.filter(r => r.isBroadcast).length,
        active: rooms.filter(r => r.isActive).length,
        timestamp: new Date().toISOString()
      }
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
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, description, userId, isBroadcast } = req.body;

    if (!name || !userId) {
      return res.status(400).json({ 
        error: 'اسم الغرفة ومعرف المستخدم مطلوبان' 
      });
    }

    // معالجة الصورة
    let icon = '';
    if (req.file) {
      icon = `/uploads/rooms/${req.file.filename}`;
    }

    const roomData = {
      name: name.trim(),
      description: description?.trim() || '',
      icon,
      createdBy: parseInt(userId),
      isBroadcast: isBroadcast === 'true' || isBroadcast === true
    };

    const room = await roomService.createRoom(roomData);
    
    // 🚀 إشعار واحد محسن للغرفة الجديدة
    // لا بث عام عبر REST هنا لتفادي التعارض مع Socket.IO
    // يمكن الاعتماد على Socket لإرسال إشعار إنشاء الغرفة عند الحاجة

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
 * DELETE /api/rooms/:roomId
 * حذف غرفة
 */
router.delete('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
    }

    await roomService.deleteRoom(roomId, parseInt(userId));

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
router.post('/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
    }

    // 🔍 التحقق من أن المستخدم ليس في الغرفة بالفعل
    const roomUsers = await roomService.getRoomUsers(roomId);
    const isAlreadyInRoom = roomUsers.some(user => user.id === parseInt(userId));
    
    if (isAlreadyInRoom) {
      return res.json({ 
        message: 'أنت موجود في الغرفة بالفعل',
        alreadyJoined: true 
      });
    }

    await roomService.joinRoom(parseInt(userId), roomId);

    // لا بث عبر REST لتفادي التعارض مع Socket.IO
    // إرجاع استجابة موحدة فقط
    res.json({ 
      message: 'تم الانضمام للغرفة بنجاح',
      roomId,
      joined: true 
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
router.post('/:roomId/leave', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
    }

    // 🔍 التحقق من أن المستخدم في الغرفة فعلاً
    const roomUsers = await roomService.getRoomUsers(roomId);
    const isInRoom = roomUsers.some(user => user.id === parseInt(userId));
    
    if (!isInRoom) {
      return res.json({ 
        message: 'أنت لست في هذه الغرفة',
        notInRoom: true 
      });
    }

    await roomService.leaveRoom(parseInt(userId), roomId);

    // لا بث عبر REST لتفادي التعارض مع Socket.IO
    res.json({ 
      message: 'تم مغادرة الغرفة بنجاح',
      roomId,
      left: true 
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
router.post('/:roomId/request-mic', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
    }

    await roomService.requestMic(roomId, parseInt(userId));

    // إرسال إشعار للمشرفين
    const io = req.app.get('io');
    io?.to(`room_${roomId}`).emit('micRequested', {
      roomId,
      userId: parseInt(userId),
      timestamp: new Date().toISOString()
    });

    // بث معلومات البث المحدثة
    try {
      const info = await roomService.getBroadcastInfo(roomId);
      io?.to(`room_${roomId}`).emit('roomUpdate', { roomId, type: 'broadcastInfo', broadcast: info });
    } catch {}

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
router.post('/:roomId/approve-mic/:userId', async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    const { approvedBy } = req.body;

    if (!approvedBy) {
      return res.status(400).json({ error: 'معرف المعتمد مطلوب' });
    }

    await roomService.approveMic(roomId, parseInt(userId), parseInt(approvedBy));

    // إرسال إشعار بالموافقة
    const io = req.app.get('io');
    io?.to(`room_${roomId}`).emit('micApproved', {
      roomId,
      userId: parseInt(userId),
      approvedBy: parseInt(approvedBy),
      timestamp: new Date().toISOString()
    });

    // بث معلومات البث المحدثة
    try {
      const info = await roomService.getBroadcastInfo(roomId);
      io?.to(`room_${roomId}`).emit('roomUpdate', { roomId, type: 'broadcastInfo', broadcast: info });
    } catch {}

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
router.post('/:roomId/reject-mic/:userId', async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    const { rejectedBy } = req.body;

    if (!rejectedBy) {
      return res.status(400).json({ error: 'معرف الرافض مطلوب' });
    }

    await roomService.rejectMic(roomId, parseInt(userId), parseInt(rejectedBy));

    // إرسال إشعار بالرفض
    const io = req.app.get('io');
    io?.to(`room_${roomId}`).emit('micRejected', {
      roomId,
      userId: parseInt(userId),
      rejectedBy: parseInt(rejectedBy),
      timestamp: new Date().toISOString()
    });

    // بث معلومات البث المحدثة
    try {
      const info = await roomService.getBroadcastInfo(roomId);
      io?.to(`room_${roomId}`).emit('roomUpdate', { roomId, type: 'broadcastInfo', broadcast: info });
    } catch {}

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
router.post('/:roomId/remove-speaker/:userId', async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    const { removedBy } = req.body;

    if (!removedBy) {
      return res.status(400).json({ error: 'معرف المُزيل مطلوب' });
    }

    await roomService.removeSpeaker(roomId, parseInt(userId), parseInt(removedBy));

    // إرسال إشعار بإزالة المتحدث
    const io = req.app.get('io');
    io?.to(`room_${roomId}`).emit('speakerRemoved', {
      roomId,
      userId: parseInt(userId),
      removedBy: parseInt(removedBy),
      timestamp: new Date().toISOString()
    });

    // بث معلومات البث المحدثة
    try {
      const info = await roomService.getBroadcastInfo(roomId);
      io?.to(`room_${roomId}`).emit('roomUpdate', { roomId, type: 'broadcastInfo', broadcast: info });
    } catch {}

    res.json({ message: 'تم إزالة المتحدث' });
  } catch (error: any) {
    console.error('خطأ في إزالة المتحدث:', error);
    res.status(400).json({ error: error.message || 'خطأ في إزالة المتحدث' });
  }
});

/**
 * GET /api/rooms/stats
 * جلب إحصائيات الغرف
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await roomService.getRoomsStats();
    res.json({ stats });
  } catch (error) {
    console.error('خطأ في جلب إحصائيات الغرف:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

export default router;