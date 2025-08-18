import { Router } from 'express';

import { storage } from '../storage';

const router = Router();

// GET /api/notifications?userId=123
router.get('/', async (req, res) => {
  try {
    const userIdStr = req.query.userId as string | undefined;
    const userId = userIdStr ? parseInt(userIdStr) : NaN;
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
    }
    const notifications = await storage.getUserNotifications(userId);
    return res.json({ notifications });
  } catch (error) {
    return res.status(500).json({ error: 'خطأ في جلب الإشعارات' });
  }
});

// GET /api/notifications/:userId
router.get('/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'معرف المستخدم غير صحيح' });
    }
    const notifications = await storage.getUserNotifications(userId);
    return res.json({ notifications });
  } catch (error) {
    return res.status(500).json({ error: 'خطأ في جلب الإشعارات' });
  }
});

// POST /api/notifications
router.post('/', async (req, res) => {
  try {
    const { userId, type, title, message, data } = req.body || {};
    if (!userId || !type || !title || !message) {
      return res.status(400).json({ error: 'بيانات الإشعار ناقصة' });
    }
    const created = await storage.createNotification({ userId, type, title, message, data });
    try {
      const io = req.app.get('io');
      if (io) io.to(String(userId)).emit('newNotification', { notification: created });
    } catch {}
    return res.json({ notification: created });
  } catch (error) {
    return res.status(500).json({ error: 'خطأ في إنشاء الإشعار' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await storage.markNotificationAsRead(id);
    return res.json({ success });
  } catch (error) {
    return res.status(500).json({ error: 'خطأ في تحديث الإشعار' });
  }
});

// PUT /api/notifications/user/:userId/read-all
router.put('/user/:userId/read-all', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const success = await (await import('../services/notificationService')).notificationService.markAllNotificationsAsRead(userId);
    return res.json({ success });
  } catch (error) {
    return res.status(500).json({ error: 'خطأ في تحديث الإشعارات' });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await (await import('../services/notificationService')).notificationService.deleteNotification(id);
    return res.json({ success });
  } catch (error) {
    return res.status(500).json({ error: 'خطأ في حذف الإشعار' });
  }
});

// GET /api/notifications/:userId/unread-count
router.get('/:userId/unread-count', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const count = await (await import('../services/notificationService')).notificationService.getUnreadNotificationCount(userId);
    return res.json({ count });
  } catch (error) {
    return res.status(500).json({ error: 'خطأ في جلب عدد الإشعارات' });
  }
});

// GET /api/notifications/unread-count?userId=123
router.get('/unread-count', async (req, res) => {
  try {
    const userIdStr = req.query.userId as string | undefined;
    const userId = userIdStr ? parseInt(userIdStr) : NaN;
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
    }
    const count = await (await import('../services/notificationService')).notificationService.getUnreadNotificationCount(userId);
    return res.json({ count });
  } catch (error) {
    return res.status(500).json({ error: 'خطأ في جلب عدد الإشعارات' });
  }
});

export default router;
