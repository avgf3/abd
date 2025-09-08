import { Router } from 'express';
import { z } from 'zod';
import { voiceService } from '../services/voiceService';
import { protect } from '../middleware/enhancedSecurity';
import { storage } from '../storage';

const router = Router();

// مخططات التحقق
const joinRoomSchema = z.object({
  roomId: z.string().min(1, 'معرف الغرفة مطلوب'),
  userId: z.number().int().positive('معرف المستخدم غير صالح')
});

const manageSpeakerSchema = z.object({
  roomId: z.string().min(1, 'معرف الغرفة مطلوب'),
  userId: z.number().int().positive('معرف المستخدم غير صالح'),
  action: z.enum(['approve', 'deny', 'remove'], {
    errorMap: () => ({ message: 'إجراء غير صالح' })
  })
});

/**
 * GET /api/voice/rooms
 * جلب جميع الغرف الصوتية النشطة
 */
router.get('/rooms', async (req, res) => {
  try {
    const voiceRooms = voiceService.getAllVoiceRooms();
    
    // تصفية البيانات الحساسة
    const sanitizedRooms = voiceRooms.map(room => ({
      id: room.id,
      name: room.name,
      description: room.description,
      icon: room.icon,
      userCount: room.userCount,
      maxUsers: room.maxUsers,
      isLocked: room.isLocked,
      isBroadcastRoom: room.isBroadcastRoom,
      audioCodec: room.audioCodec,
      bitrate: room.bitrate,
      sampleRate: room.sampleRate,
      channels: room.channels,
      lastActivity: room.lastActivity
    }));

    res.json({
      success: true,
      data: {
        rooms: sanitizedRooms,
        totalRooms: sanitizedRooms.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('خطأ في جلب الغرف الصوتية:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم'
    });
  }
});

/**
 * GET /api/voice/rooms/:roomId
 * جلب معلومات غرفة صوتية محددة
 */
router.get('/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = voiceService.getVoiceRoom(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'الغرفة الصوتية غير موجودة'
      });
    }

    // تصفية البيانات الحساسة
    const sanitizedRoom = {
      id: room.id,
      name: room.name,
      description: room.description,
      icon: room.icon,
      userCount: room.userCount,
      maxUsers: room.maxUsers,
      isLocked: room.isLocked,
      isBroadcastRoom: room.isBroadcastRoom,
      hostId: room.hostId,
      speakers: room.speakers,
      audioCodec: room.audioCodec,
      bitrate: room.bitrate,
      sampleRate: room.sampleRate,
      channels: room.channels,
      connectedUsers: room.connectedUsers.map(user => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        profileImage: user.profileImage,
        role: user.role,
        isMuted: user.isMuted,
        isSpeaking: user.isSpeaking,
        connectionQuality: user.connectionQuality,
        joinedAt: user.joinedAt
      })),
      lastActivity: room.lastActivity
    };

    res.json({
      success: true,
      data: {
        room: sanitizedRoom
      }
    });

  } catch (error) {
    console.error('خطأ في جلب معلومات الغرفة الصوتية:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم'
    });
  }
});

/**
 * GET /api/voice/rooms/:roomId/users
 * جلب المستخدمين المتصلين في غرفة صوتية
 */
router.get('/rooms/:roomId/users', async (req, res) => {
  try {
    const { roomId } = req.params;
    const users = voiceService.getRoomUsers(roomId);

    // تصفية البيانات الحساسة
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      profileImage: user.profileImage,
      role: user.role,
      isMuted: user.isMuted,
      isSpeaking: user.isSpeaking,
      connectionQuality: user.connectionQuality,
      joinedAt: user.joinedAt
    }));

    res.json({
      success: true,
      data: {
        users: sanitizedUsers,
        totalUsers: sanitizedUsers.length,
        roomId
      }
    });

  } catch (error) {
    console.error('خطأ في جلب مستخدمي الغرفة الصوتية:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم'
    });
  }
});

/**
 * POST /api/voice/rooms/:roomId/join
 * الانضمام لغرفة صوتية (للتحقق من الصلاحيات قبل الاتصال)
 */
router.post('/rooms/:roomId/join', protect.auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'يجب تسجيل الدخول أولاً'
      });
    }

    // التحقق من وجود الغرفة في قاعدة البيانات
    const dbRoom = await storage.getRoom(roomId);
    if (!dbRoom) {
      return res.status(404).json({
        success: false,
        error: 'الغرفة غير موجودة'
      });
    }

    // التحقق من صلاحيات الدخول
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
    }

    // التحقق من قفل الغرفة
    if (dbRoom.isLocked && !['admin', 'owner', 'moderator'].includes(user.userType)) {
      return res.status(403).json({
        success: false,
        error: 'الغرفة مقفلة ولا يمكن الدخول إليها'
      });
    }

    // التحقق من العضوية في الغرفة العادية أولاً
    await storage.joinRoom(userId, roomId);

    res.json({
      success: true,
      data: {
        message: 'يمكنك الآن الاتصال بالغرفة الصوتية',
        roomId,
        userId,
        room: {
          id: dbRoom.id,
          name: dbRoom.name,
          description: dbRoom.description,
          isBroadcast: dbRoom.isBroadcast,
          isLocked: dbRoom.isLocked
        }
      }
    });

  } catch (error: any) {
    console.error('خطأ في التحقق من الانضمام للغرفة الصوتية:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'خطأ في الانضمام للغرفة'
    });
  }
});

/**
 * POST /api/voice/rooms/:roomId/leave
 * مغادرة غرفة صوتية
 */
router.post('/rooms/:roomId/leave', protect.auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'يجب تسجيل الدخول أولاً'
      });
    }

    // التحقق من وجود المستخدم في الغرفة الصوتية
    const currentRoom = voiceService.getUserRoom(userId);
    if (currentRoom !== roomId) {
      return res.status(400).json({
        success: false,
        error: 'أنت لست في هذه الغرفة الصوتية'
      });
    }

    res.json({
      success: true,
      data: {
        message: 'يمكنك الآن قطع الاتصال من الغرفة الصوتية',
        roomId,
        userId
      }
    });

  } catch (error) {
    console.error('خطأ في مغادرة الغرفة الصوتية:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم'
    });
  }
});

/**
 * POST /api/voice/rooms/:roomId/request-mic
 * طلب الميكروفون في غرفة البث
 */
router.post('/rooms/:roomId/request-mic', protect.auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'يجب تسجيل الدخول أولاً'
      });
    }

    // التحقق من وجود الغرفة الصوتية
    const room = voiceService.getVoiceRoom(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'الغرفة الصوتية غير موجودة'
      });
    }

    if (!room.isBroadcastRoom) {
      return res.status(400).json({
        success: false,
        error: 'هذه الغرفة ليست غرفة بث'
      });
    }

    // التحقق من وجود المستخدم في الغرفة
    const isInRoom = room.connectedUsers.some(u => u.id === userId);
    if (!isInRoom) {
      return res.status(400).json({
        success: false,
        error: 'يجب أن تكون متصلاً بالغرفة الصوتية أولاً'
      });
    }

    // التحقق من عدم وجوده في قائمة المتحدثين أو الانتظار
    if (room.speakers.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'أنت متحدث بالفعل'
      });
    }

    if (room.micQueue.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'طلبك موجود في قائمة الانتظار بالفعل'
      });
    }

    res.json({
      success: true,
      data: {
        message: 'سيتم إرسال طلبك عبر الاتصال الصوتي',
        roomId,
        userId
      }
    });

  } catch (error) {
    console.error('خطأ في طلب الميكروفون:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم'
    });
  }
});

/**
 * POST /api/voice/rooms/:roomId/manage-speaker
 * إدارة المتحدثين في غرفة البث
 */
router.post('/rooms/:roomId/manage-speaker', protect.moderator, async (req, res) => {
  try {
    const { roomId } = req.params;
    const managerId = (req as any).user?.id;

    // التحقق من صحة البيانات
    const validation = manageSpeakerSchema.safeParse({
      roomId,
      ...req.body
    });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.issues[0]?.message || 'بيانات غير صالحة'
      });
    }

    const { userId, action } = validation.data;

    // التحقق من وجود الغرفة الصوتية
    const room = voiceService.getVoiceRoom(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'الغرفة الصوتية غير موجودة'
      });
    }

    if (!room.isBroadcastRoom) {
      return res.status(400).json({
        success: false,
        error: 'هذه الغرفة ليست غرفة بث'
      });
    }

    // التحقق من الصلاحيات
    const manager = room.connectedUsers.find(u => u.id === managerId);
    if (!manager) {
      return res.status(400).json({
        success: false,
        error: 'يجب أن تكون متصلاً بالغرفة الصوتية'
      });
    }

    const canManage = ['admin', 'owner', 'moderator'].includes(manager.role) || 
                     manager.id === room.hostId;
    if (!canManage) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية لإدارة المتحدثين'
      });
    }

    // التحقق من وجود المستخدم المستهدف
    const targetUser = room.connectedUsers.find(u => u.id === userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير متصل بالغرفة'
      });
    }

    res.json({
      success: true,
      data: {
        message: 'سيتم تنفيذ الإجراء عبر الاتصال الصوتي',
        action,
        targetUserId: userId,
        roomId
      }
    });

  } catch (error) {
    console.error('خطأ في إدارة المتحدثين:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم'
    });
  }
});

/**
 * GET /api/voice/stats
 * إحصائيات الخدمة الصوتية
 */
router.get('/stats', protect.admin, async (req, res) => {
  try {
    const stats = voiceService.getStats();

    res.json({
      success: true,
      data: {
        stats: {
          ...stats,
          uptimeFormatted: formatUptime(stats.uptime)
        }
      }
    });

  } catch (error) {
    console.error('خطأ في جلب إحصائيات الخدمة الصوتية:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم'
    });
  }
});

/**
 * GET /api/voice/user/:userId/status
 * حالة اتصال مستخدم محدد
 */
router.get('/user/:userId/status', protect.auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = parseInt(userId);

    if (isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        error: 'معرف المستخدم غير صالح'
      });
    }

    const isConnected = voiceService.isUserConnected(targetUserId);
    const currentRoom = voiceService.getUserRoom(targetUserId);

    res.json({
      success: true,
      data: {
        userId: targetUserId,
        isConnected,
        currentRoom,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('خطأ في جلب حالة المستخدم:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم'
    });
  }
});

/**
 * مساعدات
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} يوم، ${hours % 24} ساعة`;
  } else if (hours > 0) {
    return `${hours} ساعة، ${minutes % 60} دقيقة`;
  } else if (minutes > 0) {
    return `${minutes} دقيقة، ${seconds % 60} ثانية`;
  } else {
    return `${seconds} ثانية`;
  }
}

export default router;