import { Router } from 'express';
import { roomService } from '../services/roomService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
 * جلب جميع الغرف
 */
router.get('/', async (req, res) => {
  try {
    const rooms = await roomService.getAllRooms();
    res.json({ rooms });
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
    
    // إرسال إشعار بالغرفة الجديدة عبر Socket (سيتم تحديثه في الخطوة التالية)
    req.app.get('io')?.emit('roomCreated', { room });
    
    const updatedRooms = await roomService.getAllRooms();
    req.app.get('io')?.emit('roomsUpdated', { rooms: updatedRooms });

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

    // إرسال إشعار بحذف الغرفة
    req.app.get('io')?.emit('roomDeleted', { roomId });
    
    const updatedRooms = await roomService.getAllRooms();
    req.app.get('io')?.emit('roomsUpdated', { rooms: updatedRooms });

    res.json({ message: 'تم حذف الغرفة بنجاح' });
  } catch (error: any) {
    console.error('خطأ في حذف الغرفة:', error);
    res.status(400).json({ error: error.message || 'خطأ في حذف الغرفة' });
  }
});

/**
 * POST /api/rooms/:roomId/join
 * الانضمام لغرفة
 */
router.post('/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
    }

    await roomService.joinRoom(parseInt(userId), roomId);

    // إرسال إشعار بانضمام المستخدم
    const io = req.app.get('io');
    io?.to(`room_${roomId}`).emit('userJoinedRoom', {
      userId: parseInt(userId),
      roomId: roomId,
      timestamp: new Date().toISOString()
    });
    
    // تحديث عدد المستخدمين
    const userCount = await roomService.updateRoomUserCount(roomId);
    io?.emit('roomUserCountUpdated', { roomId, userCount });

    res.json({ message: 'تم الانضمام للغرفة بنجاح' });
  } catch (error: any) {
    console.error('خطأ في الانضمام للغرفة:', error);
    res.status(400).json({ error: error.message || 'خطأ في الانضمام للغرفة' });
  }
});

/**
 * POST /api/rooms/:roomId/leave
 * مغادرة غرفة
 */
router.post('/:roomId/leave', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
    }

    await roomService.leaveRoom(parseInt(userId), roomId);

    // إرسال إشعار بمغادرة المستخدم
    const io = req.app.get('io');
    io?.to(`room_${roomId}`).emit('userLeftRoom', {
      userId: parseInt(userId),
      roomId: roomId,
      timestamp: new Date().toISOString()
    });
    
    // تحديث عدد المستخدمين
    const userCount = await roomService.updateRoomUserCount(roomId);
    io?.emit('roomUserCountUpdated', { roomId, userCount });

    res.json({ message: 'تم مغادرة الغرفة بنجاح' });
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