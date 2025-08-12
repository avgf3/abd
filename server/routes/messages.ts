import { Router } from 'express';
import { roomMessageService } from '../services/roomMessageService';
import { roomService } from '../services/roomService';
import { storage } from '../storage';

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
      ...result
    });

  } catch (error: any) {
    console.error('خطأ في جلب رسائل الغرفة:', error);
    res.status(500).json({
      error: 'خطأ في الخادم',
      details: error.message
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
      count: messages.length
    });

  } catch (error: any) {
    console.error('خطأ في جلب أحدث رسائل الغرفة:', error);
    res.status(500).json({
      error: 'خطأ في الخادم',
      details: error.message
    });
  }
});

/**
 * POST /api/messages/room/:roomId
 * إرسال رسالة لغرفة
 */
router.post('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { senderId, content, messageType = 'text', isPrivate = false, receiverId } = req.body;

    if (!roomId?.trim()) {
      return res.status(400).json({ error: 'معرف الغرفة مطلوب' });
    }

    if (!senderId) {
      return res.status(400).json({ error: 'معرف المرسل مطلوب' });
    }

    if (!content?.trim()) {
      return res.status(400).json({ error: 'محتوى الرسالة مطلوب' });
    }

    // التحقق من وجود الغرفة
    const room = await roomService.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ error: 'الغرفة غير موجودة' });
    }

    // إرسال الرسالة
    const message = await roomMessageService.sendMessage({
      senderId: parseInt(senderId),
      roomId,
      content: content.trim(),
      messageType,
      isPrivate,
      receiverId: receiverId ? parseInt(receiverId) : undefined
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
        timestamp: new Date().toISOString()
      };

      if (isPrivate && receiverId) {
        // رسالة خاصة - حدث موحّد فقط
        io.to(String(senderId)).emit('privateMessage', { message });
        io.to(String(receiverId)).emit('privateMessage', { message });
      } else {
        // رسالة عامة - إرسال لجميع أعضاء الغرفة
        io.to(`room_${roomId}`).emit('message', socketData);
      }
    }

    res.json({
      success: true,
      message,
      roomId
    });

  } catch (error: any) {
    console.error('خطأ في إرسال الرسالة:', error);
    res.status(400).json({
      error: error.message || 'خطأ في إرسال الرسالة'
    });
  }
});

/**
 * DELETE /api/messages/:messageId
 * حذف رسالة
 */
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, roomId } = req.body;

    if (!messageId || !userId || !roomId) {
      return res.status(400).json({
        error: 'معرف الرسالة ومعرف المستخدم ومعرف الغرفة مطلوبة'
      });
    }

    await roomMessageService.deleteMessage(
      parseInt(messageId),
      parseInt(userId),
      roomId
    );

    // إرسال إشعار بحذف الرسالة عبر Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`room_${roomId}`).emit('message', {
        type: 'messageDeleted',
        messageId: parseInt(messageId),
        roomId,
        deletedBy: parseInt(userId),
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'تم حذف الرسالة بنجاح'
    });

  } catch (error: any) {
    console.error('خطأ في حذف الرسالة:', error);
    res.status(400).json({
      error: error.message || 'خطأ في حذف الرسالة'
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
      ...result
    });

  } catch (error: any) {
    console.error('خطأ في البحث في رسائل الغرفة:', error);
    res.status(500).json({
      error: 'خطأ في الخادم',
      details: error.message
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
      stats
    });

  } catch (error: any) {
    console.error('خطأ في جلب إحصائيات رسائل الغرفة:', error);
    res.status(500).json({
      error: 'خطأ في الخادم',
      details: error.message
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
      roomId
    });

  } catch (error: any) {
    console.error('خطأ في تنظيف رسائل الغرفة:', error);
    res.status(400).json({
      error: error.message || 'خطأ في تنظيف الرسائل'
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
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('خطأ في جلب إحصائيات الذاكرة المؤقتة:', error);
    res.status(500).json({
      error: 'خطأ في الخادم',
      details: error.message
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
      message: 'تم مسح الذاكرة المؤقتة بنجاح'
    });

  } catch (error: any) {
    console.error('خطأ في مسح الذاكرة المؤقتة:', error);
    res.status(400).json({
      error: error.message || 'خطأ في مسح الذاكرة المؤقتة'
    });
  }
});

// تم حذف route مكرر لرفع الصور الخاصة - يتم التعامل معه في النظام الموحد

export default router;