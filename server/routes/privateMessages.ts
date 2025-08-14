import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

/**
 * POST /api/private-messages/send
 * إرسال رسالة خاصة بين مستخدمين
 */
router.post('/send', async (req, res) => {
  try {
    const { senderId, receiverId, content, messageType = 'text' } = req.body || {};

    if (!senderId || !receiverId) {
      return res.status(400).json({ error: 'معرّف المرسل والمستلم مطلوبان' });
    }

    const text = typeof content === 'string' ? content.trim() : '';
    if (!text) {
      return res.status(400).json({ error: 'محتوى الرسالة مطلوب' });
    }

    const sender = await storage.getUser(parseInt(senderId));
    const receiver = await storage.getUser(parseInt(receiverId));
    if (!sender) {
      return res.status(404).json({ error: 'المرسل غير موجود' });
    }
    if (!receiver) {
      return res.status(404).json({ error: 'المستلم غير موجود' });
    }

    // إنشاء الرسالة الخاصة في قاعدة البيانات
    const newMessage = await storage.createMessage({
      senderId: parseInt(senderId),
      receiverId: parseInt(receiverId),
      content: text,
      messageType,
      isPrivate: true
      // roomId سيأخذ القيمة الافتراضية من الجدول إن لم تُرسل
    });

    if (!newMessage) {
      return res.status(500).json({ error: 'فشل في إنشاء الرسالة' });
    }

    const messageWithSender = { 
      ...newMessage, 
      sender: {
        id: sender.id,
        username: sender.username,
        userType: sender.userType,
        level: sender.level,
        gender: sender.gender,
        usernameColor: sender.usernameColor,
        profileImage: (sender as any)?.profileImage || null,
        userTheme: sender.userTheme,
        profileEffect: sender.profileEffect,
      }
    } as any;

    // بث إلى غرف المستخدمين الخاصة عبر Socket.IO
    const io = req.app.get('io');
    if (io) {
      try { io.to(String(senderId)).emit('privateMessage', { message: messageWithSender }); } catch {}
      try { io.to(String(receiverId)).emit('privateMessage', { message: messageWithSender }); } catch {}
    }

    return res.json({ success: true, message: messageWithSender });
  } catch (error: any) {
    console.error('خطأ في إرسال رسالة خاصة:', error);
    return res.status(500).json({ error: error?.message || 'خطأ في الخادم' });
  }
});

/**
 * GET /api/private-messages/:userId/:otherUserId?limit=50
 * جلب سجل المحادثة الخاصة بين مستخدمين
 */
router.get('/:userId/:otherUserId', async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    const { limit = 50 } = req.query;

    const uid = parseInt(userId);
    const oid = parseInt(otherUserId);
    const lim = Math.min(100, Math.max(1, parseInt(limit as string)));

    if (!uid || !oid) {
      return res.status(400).json({ error: 'معرّفات المستخدمين غير صالحة' });
    }

    const messages = await storage.getPrivateMessages(uid, oid, lim);

    // إرفاق معلومات المرسل لتسهيل العرض في الواجهة
    const enriched = await Promise.all((messages || []).map(async (m: any) => {
      try {
        const sender = await storage.getUser(m.senderId);
        return { ...m, sender };
      } catch {
        return m;
      }
    }));

    return res.json({ success: true, messages: enriched, count: enriched.length });
  } catch (error: any) {
    console.error('خطأ في جلب رسائل الخاص:', error);
    return res.status(500).json({ error: error?.message || 'خطأ في الخادم' });
  }
});

export default router;