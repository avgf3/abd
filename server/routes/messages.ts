import { Router } from 'express';

import { notificationService } from '../services/notificationService';
import { roomMessageService } from '../services/roomMessageService';
import { roomService } from '../services/roomService';
import { storage } from '../storage';
import { protect } from '../middleware/enhancedSecurity';
import { messageLimiter, sanitizeInput } from '../security';

const router = Router();

/**
 * GET /api/messages/room/:roomId
 * جلب رسائل الغرفة مع الصفحات
 */
router.get('/room/:roomId', async (req, res) => {
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

    const limitValue = Math.min(20, Math.max(1, parseInt(limit as string)));
    const offsetValue = Math.max(0, parseInt(offset as string));

    const result = await roomMessageService.getRoomMessages(
      roomId,
      limitValue,
      offsetValue,
      useCache === 'true'
    );

    res.json({
      success: true,
      roomId,
      ...result,
    });
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
router.get('/room/:roomId/latest', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 20 } = req.query;

    if (!roomId?.trim()) {
      return res.status(400).json({ error: 'معرف الغرفة مطلوب' });
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
router.post('/room/:roomId', protect.auth, messageLimiter, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, messageType = 'text', isPrivate = false, receiverId } = req.body;
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
router.post('/:messageId/reactions', protect.auth, async (req, res) => {
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
router.delete('/:messageId/reactions', protect.auth, async (req, res) => {
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
router.get('/room/:roomId/search', async (req, res) => {
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

export default router;
