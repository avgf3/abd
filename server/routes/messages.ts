import { Router } from 'express';

import { notificationService } from '../services/notificationService';
import { roomMessageService } from '../services/roomMessageService';
import { roomService } from '../services/roomService';
import { storage } from '../storage';
import { protect } from '../middleware/enhancedSecurity';
import { sanitizeInput, limiters, SecurityConfig, validateMessageContent } from '../security';
import { z } from 'zod';
import { getAuthTokenFromRequest, verifyAuthToken } from '../utils/auth-token';
import { isUserInRoom } from '../storage';

const router = Router();

/**
 * GET /api/messages/room/:roomId
 * جلب رسائل الغرفة مع الصفحات
 */
// 📦 نظام كاش محسّن للرسائل مع منع التزاحم
const roomMessagesMicroCache = new Map<string, { data: any; expiresAt: number; etag: string }>();

// 🔒 نظام منع التزاحم للاستعلامات المتكررة
const queryDeduplication = new Map<string, Promise<any>>();

router.get('/room/:roomId', limiters.roomMessagesRead, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 20, offset = 0, useCache = 'true' } = req.query;

    if (!roomId?.trim()) {
      return res.status(400).json({ error: 'معرف الغرفة مطلوب' });
    }

    // التحقق من وجود الغرفة
    const room = await roomService.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ error: 'الغرفة غير موجودة' });
    }

    // إن كانت الغرفة مقفلة: السماح فقط للمشرف/الإداري/المالك أو الأعضاء الحاليين
    const isLocked = (room as any).isLocked ?? (room as any).is_locked ?? false;
    if (isLocked) {
      const token = getAuthTokenFromRequest(req as any);
      const verified = token ? verifyAuthToken(token) : null;
      const requesterId = verified?.userId;
      if (!requesterId) {
        return res.status(403).json({ error: 'الغرفة مقفلة ولا يمكن عرض رسائلها' });
      }
      const requester = await storage.getUser(requesterId);
      const isPrivileged = requester && ['admin', 'owner', 'moderator'].includes((requester as any).userType);
      if (!isPrivileged) {
        const member = await isUserInRoom(requesterId, roomId);
        if (!member) {
          return res.status(403).json({ error: 'الغرفة مقفلة ولا يمكن عرض رسائلها' });
        }
      }
    }

    const limitValue = Math.min(20, Math.max(1, parseInt(limit as string)));
    const offsetValue = Math.max(0, parseInt(offset as string));

    // مفتاح الكاش ومنع التزاحم
    const isFirstPage = offsetValue === 0;
    const cacheKey = `room:${roomId}:limit:${limitValue}:offset:${offsetValue}`;
    const dedupeKey = `${cacheKey}:${Date.now() / 1000 | 0}`; // مفتاح للثانية الواحدة
    const now = Date.now();

    // التحقق من الكاش أولاً
    if (useCache === 'true' && isFirstPage) {
      const cached = roomMessagesMicroCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        // إرسال ETag للتحقق من التغييرات
        res.setHeader('ETag', cached.etag);
        res.setHeader('Cache-Control', 'public, max-age=3, s-maxage=5, stale-while-revalidate=10');
        res.setHeader('X-Cache', 'HIT');
        
        if (req.headers['if-none-match'] === cached.etag) {
          return res.status(304).end();
        }
        
        return res.json({ success: true, roomId, ...cached.data });
      }
    }

    // منع التزاحم: إذا كان هناك استعلام جارٍ لنفس البيانات
    const existingQuery = queryDeduplication.get(dedupeKey);
    if (existingQuery) {
      const result = await existingQuery;
      res.setHeader('X-Cache', 'DEDUPE');
      res.setHeader('Cache-Control', 'public, max-age=3');
      return res.json({ success: true, roomId, ...result });
    }

    // بدء استعلام جديد مع حفظه لمنع التزاحم
    const queryPromise = roomMessageService.getRoomMessages(
      roomId,
      limitValue,
      offsetValue,
      true
    );
    
    queryDeduplication.set(dedupeKey, queryPromise);
    
    try {
      const result = await queryPromise;
      
      // حفظ في الكاش مع ETag
      if (useCache === 'true' && isFirstPage) {
        const etag = `"msg-${roomId}-${Date.now()}"`;
        roomMessagesMicroCache.set(cacheKey, { 
          data: result, 
          expiresAt: now + 3000, // 3 ثواني فقط
          etag 
        });
        
        // تنظيف الكاش القديم
        if (roomMessagesMicroCache.size > 100) {
          const entries = Array.from(roomMessagesMicroCache.entries());
          entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
          entries.slice(0, 50).forEach(([key]) => roomMessagesMicroCache.delete(key));
        }
      }
      
      res.setHeader('Cache-Control', 'public, max-age=3, s-maxage=5');
      res.setHeader('X-Cache', 'MISS');
      res.json({ success: true, roomId, ...result });
    } finally {
      // حذف من قائمة الاستعلامات الجارية
      setTimeout(() => queryDeduplication.delete(dedupeKey), 100);
    }
  } catch (error: any) {
    console.error('خطأ في جلب رسائل الغرفة:', error);
    res.status(500).json({
      error: 'خطأ في الخادم',
      details: error.message,
    });
  }
});

/**
 * GET /api/messages/room/:roomId/latest
 * جلب أحدث رسائل الغرفة
 */
router.get('/room/:roomId/latest', limiters.roomMessagesRead, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 20 } = req.query;

    if (!roomId?.trim()) {
      return res.status(400).json({ error: 'معرف الغرفة مطلوب' });
    }

    // التحقق من وجود الغرفة
    const room = await roomService.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ error: 'الغرفة غير موجودة' });
    }

    // إن كانت الغرفة مقفلة: السماح فقط للمشرف/الإداري/المالك أو الأعضاء الحاليين
    const isLocked = (room as any).isLocked ?? (room as any).is_locked ?? false;
    if (isLocked) {
      const token = getAuthTokenFromRequest(req as any);
      const verified = token ? verifyAuthToken(token) : null;
      const requesterId = verified?.userId;
      if (!requesterId) {
        return res.status(403).json({ error: 'الغرفة مقفلة ولا يمكن عرض رسائلها' });
      }
      const requester = await storage.getUser(requesterId);
      const isPrivileged = requester && ['admin', 'owner', 'moderator'].includes((requester as any).userType);
      if (!isPrivileged) {
        const member = await isUserInRoom(requesterId, roomId);
        if (!member) {
          return res.status(403).json({ error: 'الغرفة مقفلة ولا يمكن عرض رسائلها' });
        }
      }
    }

    const messages = await roomMessageService.getLatestRoomMessages(
      roomId,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      roomId,
      messages,
      count: messages.length,
    });
  } catch (error: any) {
    console.error('خطأ في جلب أحدث رسائل الغرفة:', error);
    res.status(500).json({
      error: 'خطأ في الخادم',
      details: error.message,
    });
  }
});

/**
 * POST /api/messages/room/:roomId
 * إرسال رسالة لغرفة
 */
const roomMessageSchema = z.object({
  content: z.string().trim().min(1, 'محتوى الرسالة مطلوب').max(SecurityConfig.MAX_MESSAGE_LENGTH),
  messageType: z.enum(['text', 'image', 'sticker']).default('text'),
  isPrivate: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true'),
  receiverId: z
    .union([z.number().int().positive(), z.string().regex(/^\d+$/)])
    .optional()
    .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
});

router.post('/room/:roomId', protect.auth, limiters.sendMessage, async (req, res) => {
  try {
    const { roomId } = req.params;
    const parsed = roomMessageSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'بيانات غير صحيحة' });
    }
    const { content, messageType, isPrivate = false, receiverId } = parsed.data as any;
    const senderId = (req as any).user?.id as number;

    if (!roomId?.trim()) {
      return res.status(400).json({ error: 'معرف الغرفة مطلوب' });
    }

    if (!senderId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول' });
    }

    const sanitizedContent = sanitizeInput(typeof content === 'string' ? content : '');
    if (!sanitizedContent) {
      return res.status(400).json({ error: 'محتوى الرسالة مطلوب' });
    }

    // السماح فقط بروابط YouTube ومنع غيرها
    const contentCheck = validateMessageContent(sanitizedContent);
    if (!contentCheck.isValid) {
      return res.status(400).json({ error: contentCheck.reason || 'محتوى غير مسموح' });
    }

    // منع استخدام هذا المسار لإرسال رسائل خاصة
    if (isPrivate || receiverId) {
      return res
        .status(400)
        .json({ error: 'استخدم /api/private-messages/send لإرسال الرسائل الخاصة' });
    }

    // التحقق من وجود الغرفة
    const room = await roomService.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ error: 'الغرفة غير موجودة' });
    }

    // التحقق من إعدادات قفل الدردشة
    const sender = (req as any).user;
    if (sender && room) {
      const isOwner = sender.userType === 'owner';
      const isGuest = sender.userType === 'guest';
      
      // إذا كان قفل الدردشة الكامل مفعل - السماح للمالك فقط
      if (room.chatLockAll && !isOwner) {
        return res.status(403).json({ 
          error: 'الدردشة مقفلة من قبل المالك',
          reason: 'chat_locked_all',
          message: 'هذه الخاصية غير متوفرة الآن'
        });
      }
      
      // إذا كان قفل الدردشة للزوار مفعل - منع الضيوف فقط
      if (room.chatLockVisitors && isGuest && !isOwner) {
        return res.status(403).json({ 
          error: 'الدردشة مقفلة للزوار',
          reason: 'chat_locked_visitors',
          message: 'هذه الخاصية غير متوفرة الآن'
        });
      }
    }

    // إرسال الرسالة
    const message = await roomMessageService.sendMessage({
      senderId: parseInt(String(senderId)),
      roomId,
      content: sanitizedContent,
      messageType,
      isPrivate: false,
      receiverId: undefined,
    });

    if (!message) {
      return res.status(500).json({ error: 'فشل في إرسال الرسالة' });
    }

    // إرسال الرسالة عبر Socket.IO
    const io = req.app.get('io');
    if (io) {
      const socketData = {
        type: 'newMessage',
        roomId,
        message,
        timestamp: new Date().toISOString(),
      };

      // رسالة عامة - إرسال لجميع أعضاء الغرفة
      io.to(`room_${roomId}`).emit('message', socketData);
    }

    res.json({
      success: true,
      message,
      roomId,
    });
  } catch (error: any) {
    console.error('خطأ في إرسال الرسالة:', error);
    res.status(400).json({
      error: error.message || 'خطأ في إرسال الرسالة',
    });
  }
});

/**
 * POST /api/messages/:messageId/reactions
 * إضافة/تحديث تفاعل على رسالة (like/dislike/heart)
 */
router.post('/:messageId/reactions', protect.auth, limiters.reaction, async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const { type } = req.body as { type?: string };
    const userId = (req as any).user?.id as number;

    if (!messageId || !['like', 'dislike', 'heart'].includes(String(type))) {
      return res.status(400).json({ error: 'بيانات تفاعل غير صالحة' });
    }
    if (!userId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول' });
    }

    const message = await storage.getMessage(messageId);
    if (!message) return res.status(404).json({ error: 'الرسالة غير موجودة' });

    const result = await storage.reactToMessage(messageId, userId, type as any);
    if (!result) return res.status(500).json({ error: 'تعذر حفظ التفاعل' });

    // بث التحديث عبر Socket.IO إلى الغرفة المناسبة فقط
    const io = req.app.get('io');
    const roomId = (message as any).roomId || 'general';
    if (io && !message.isPrivate) {
      io.to(`room_${roomId}`).emit('message', {
        type: 'reactionUpdated',
        roomId,
        messageId,
        counts: { like: result.like, dislike: result.dislike, heart: result.heart },
        myReaction: result.myReaction,
        reactorId: userId,
      });
    }

    res.json({
      success: true,
      messageId,
      counts: { like: result.like, dislike: result.dislike, heart: result.heart },
      myReaction: result.myReaction,
    });
  } catch (error: any) {
    console.error('خطأ في إضافة تفاعل:', error);
    res.status(500).json({ error: error?.message || 'خطأ في الخادم' });
  }
});

/**
 * DELETE /api/messages/:messageId/reactions
 * إزالة تفاعل المستخدم على رسالة
 */
router.delete('/:messageId/reactions', protect.auth, limiters.reaction, async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const { type } = req.body as { type?: string };
    const userId = (req as any).user?.id as number;

    if (!messageId || !['like', 'dislike', 'heart'].includes(String(type))) {
      return res.status(400).json({ error: 'بيانات تفاعل غير صالحة' });
    }
    if (!userId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول' });
    }

    const message = await storage.getMessage(messageId);
    if (!message) return res.status(404).json({ error: 'الرسالة غير موجودة' });

    const result = await storage.reactToMessage(messageId, userId, type as any);
    if (!result) return res.status(500).json({ error: 'تعذر حفظ التفاعل' });

    // بث التحديث عبر Socket.IO إلى الغرفة المناسبة فقط
    const io = req.app.get('io');
    const roomId = (message as any).roomId || 'general';
    if (io && !message.isPrivate) {
      io.to(`room_${roomId}`).emit('message', {
        type: 'reactionUpdated',
        roomId,
        messageId,
        counts: { like: result.like, dislike: result.dislike, heart: result.heart },
        myReaction: result.myReaction,
        reactorId: userId,
      });
    }

    res.json({
      success: true,
      messageId,
      counts: { like: result.like, dislike: result.dislike, heart: result.heart },
      myReaction: result.myReaction,
    });
  } catch (error: any) {
    console.error('خطأ في إزالة تفاعل:', error);
    res.status(500).json({ error: error?.message || 'خطأ في الخادم' });
  }
});

/**
 * DELETE /api/messages/:messageId
 * حذف رسالة
 */
router.delete('/:messageId', protect.auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { roomId } = req.body;
    const userId = (req as any).user?.id as number;

    if (!messageId || !userId || !roomId) {
      return res.status(400).json({
        error: 'معرف الرسالة ومعرف المستخدم ومعرف الغرفة مطلوبة',
      });
    }

    await roomMessageService.deleteMessage(parseInt(messageId), userId, roomId);

    // إرسال إشعار بحذف الرسالة عبر Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`room_${roomId}`).emit('message', {
        type: 'messageDeleted',
        messageId: parseInt(messageId),
        roomId,
        deletedBy: userId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'تم حذف الرسالة بنجاح',
    });
  } catch (error: any) {
    console.error('خطأ في حذف الرسالة:', error);
    res.status(400).json({
      error: error.message || 'خطأ في حذف الرسالة',
    });
  }
});

/**
 * GET /api/messages/room/:roomId/search
 * البحث في رسائل الغرفة
 */
router.get('/room/:roomId/search', limiters.search, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { q: searchQuery, limit = 20, offset = 0 } = req.query;

    const qStr = Array.isArray(searchQuery) ? (searchQuery[0] ?? '') : (searchQuery ?? '');

    if (!roomId?.trim()) {
      return res.status(400).json({ error: 'معرف الغرفة مطلوب' });
    }

    if (typeof qStr !== 'string' || !qStr.trim()) {
      return res.status(400).json({ error: 'نص البحث مطلوب' });
    }

    const result = await roomMessageService.searchRoomMessages(
      roomId,
      qStr,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      success: true,
      roomId,
      searchQuery: qStr,
      ...result,
    });
  } catch (error: any) {
    console.error('خطأ في البحث في رسائل الغرفة:', error);
    res.status(500).json({
      error: 'خطأ في الخادم',
      details: error.message,
    });
  }
});

/**
 * GET /api/messages/room/:roomId/stats
 * جلب إحصائيات رسائل الغرفة
 */
router.get('/room/:roomId/stats', async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId?.trim()) {
      return res.status(400).json({ error: 'معرف الغرفة مطلوب' });
    }

    // التحقق من وجود الغرفة
    const room = await roomService.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ error: 'الغرفة غير موجودة' });
    }

    const stats = await roomMessageService.getRoomStats(roomId);

    res.json({
      success: true,
      roomId,
      stats,
    });
  } catch (error: any) {
    console.error('خطأ في جلب إحصائيات رسائل الغرفة:', error);
    res.status(500).json({
      error: 'خطأ في الخادم',
      details: error.message,
    });
  }
});

/**
 * POST /api/messages/room/:roomId/cleanup
 * تنظيف الرسائل القديمة للغرفة
 */
router.post('/room/:roomId/cleanup', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, keepLastDays = 30 } = req.body;

    if (!roomId?.trim()) {
      return res.status(400).json({ error: 'معرف الغرفة مطلوب' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
    }

    // التحقق من الصلاحيات
    const user = await storage.getUser(parseInt(userId));
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    if (!['admin', 'owner'].includes(user.userType)) {
      return res.status(403).json({ error: 'ليس لديك صلاحية لتنظيف الرسائل' });
    }

    const deletedCount = await roomMessageService.cleanupOldMessages(
      roomId,
      parseInt(keepLastDays as string)
    );

    res.json({
      success: true,
      message: `تم حذف ${deletedCount} رسالة قديمة`,
      deletedCount,
      roomId,
    });
  } catch (error: any) {
    console.error('خطأ في تنظيف رسائل الغرفة:', error);
    res.status(400).json({
      error: error.message || 'خطأ في تنظيف الرسائل',
    });
  }
});

/**
 * GET /api/messages/cache/stats
 * جلب إحصائيات الذاكرة المؤقتة
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const cacheStats = roomMessageService.getCacheStats();

    res.json({
      success: true,
      cacheStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('خطأ في جلب إحصائيات الذاكرة المؤقتة:', error);
    res.status(500).json({
      error: 'خطأ في الخادم',
      details: error.message,
    });
  }
});

/**
 * POST /api/messages/cache/clear
 * مسح الذاكرة المؤقتة
 */
router.post('/cache/clear', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
    }

    // التحقق من الصلاحيات
    const user = await storage.getUser(parseInt(userId));
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    if (!['admin', 'owner'].includes(user.userType)) {
      return res.status(403).json({ error: 'ليس لديك صلاحية لمسح الذاكرة المؤقتة' });
    }

    roomMessageService.clearAllCache();

    res.json({
      success: true,
      message: 'تم مسح الذاكرة المؤقتة بنجاح',
    });
  } catch (error: any) {
    console.error('خطأ في مسح الذاكرة المؤقتة:', error);
    res.status(400).json({
      error: error.message || 'خطأ في مسح الذاكرة المؤقتة',
    });
  }
});

// 🔥 endpoint للرسائل الحديثة (للاستخدام في الخلفية)
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const since = req.query.since ? new Date(Number(req.query.since)) : new Date(Date.now() - 300000); // آخر 5 دقائق افتراضياً
    const roomId = req.query.roomId as string || 'general';
    
    // جلب الرسائل الحديثة
    const recentMessages = await roomMessageService.getRoomMessagesAfter(roomId, since);
    
    res.json({
      success: true,
      messages: recentMessages,
      count: recentMessages.length,
      since: since.toISOString(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ خطأ في جلب الرسائل الحديثة:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب الرسائل الحديثة'
    });
  }
});

export default router;
