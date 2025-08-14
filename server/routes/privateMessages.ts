import { Router } from 'express';
import { storage } from '../storage';
import { notificationService } from '../services/notificationService';

const router = Router();

// Cache for recent conversations to reduce database queries
const conversationCache = new Map<string, { messages: any[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * POST /api/private-messages/send
 * إرسال رسالة خاصة بين مستخدمين مع تحسينات الأداء
 */
router.post('/send', async (req, res) => {
  try {
    const { senderId, receiverId, content, messageType = 'text' } = req.body || {};

    // التحقق من صحة البيانات
    if (!senderId || !receiverId) {
      return res.status(400).json({ error: 'معرّف المرسل والمستلم مطلوبان' });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ error: 'لا يمكن إرسال رسالة لنفسك' });
    }

    const text = typeof content === 'string' ? content.trim() : '';
    if (!text) {
      return res.status(400).json({ error: 'محتوى الرسالة مطلوب' });
    }

    // التحقق من المستخدمين بشكل متوازي لتحسين السرعة
    const [sender, receiver] = await Promise.all([
      storage.getUser(parseInt(senderId)),
      storage.getUser(parseInt(receiverId))
    ]);

    if (!sender) {
      return res.status(404).json({ error: 'المرسل غير موجود' });
    }
    if (!receiver) {
      return res.status(404).json({ error: 'المستلم غير موجود' });
    }

    // إنشاء الرسالة في قاعدة البيانات مع تحسين البيانات
    const messageData = {
      senderId: parseInt(senderId),
      receiverId: parseInt(receiverId),
      content: text,
      messageType,
      isPrivate: true,
      timestamp: new Date()
    };

    const newMessage = await storage.createMessage(messageData);

    if (!newMessage) {
      return res.status(500).json({ error: 'فشل في إنشاء الرسالة' });
    }

    const messageWithSender = { ...newMessage, sender };

    // تنظيف cache للمحادثة عند إضافة رسالة جديدة
    const conversationKey = `${Math.min(parseInt(senderId), parseInt(receiverId))}-${Math.max(parseInt(senderId), parseInt(receiverId))}`;
    conversationCache.delete(conversationKey);

    // إرسال إشعار وبث الرسالة بشكل متوازي
    const promises = [];

    // إنشاء إشعار للمستقبل
    promises.push(
      notificationService.createMessageNotification(
        receiver.id,
        sender.username,
        sender.id,
        text.substring(0, 100)
      ).catch(() => null)
    );

    // بث الرسالة عبر Socket.IO
    const io = req.app.get('io');
    if (io) {
      promises.push(
        Promise.all([
          new Promise(resolve => {
            try {
              io.to(String(senderId)).emit('privateMessage', { message: messageWithSender });
              resolve(true);
            } catch { resolve(false); }
          }),
          new Promise(resolve => {
            try {
              io.to(String(receiverId)).emit('privateMessage', { message: messageWithSender });
              resolve(true);
            } catch { resolve(false); }
          })
        ])
      );
    }

    const [createdNotification] = await Promise.all(promises);

    // بث الإشعار إذا تم إنشاؤه بنجاح
    if (io && createdNotification) {
      try {
        io.to(String(receiverId)).emit('newNotification', { notification: createdNotification });
      } catch {}
    }

    return res.json({ success: true, message: messageWithSender });

  } catch (error: any) {
    console.error('خطأ في إرسال رسالة خاصة:', error);
    return res.status(500).json({ error: error?.message || 'خطأ في الخادم' });
  }
});

/**
 * GET /api/private-messages/:userId/:otherUserId?limit=50
 * جلب سجل المحادثة الخاصة بين مستخدمين مع تحسين الأداء والتخزين المؤقت
 */
router.get('/:userId/:otherUserId', async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    const { limit = 50 } = req.query;

    const uid = parseInt(userId);
    const oid = parseInt(otherUserId);
    const lim = Math.min(100, Math.max(1, parseInt(limit as string)));

    if (!uid || !oid || isNaN(uid) || isNaN(oid)) {
      return res.status(400).json({ error: 'معرّفات المستخدمين غير صالحة' });
    }

    if (uid === oid) {
      return res.status(400).json({ error: 'لا يمكن جلب محادثة مع نفس المستخدم' });
    }

    // إنشاء مفتاح cache للمحادثة
    const conversationKey = `${Math.min(uid, oid)}-${Math.max(uid, oid)}`;
    const cachedData = conversationCache.get(conversationKey);

    // التحقق من صحة cache
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return res.json({ 
        success: true, 
        messages: cachedData.messages.slice(-lim), 
        count: Math.min(cachedData.messages.length, lim),
        cached: true
      });
    }

    // جلب الرسائل من قاعدة البيانات
    const messages = await storage.getPrivateMessages(uid, oid, lim);

    if (!messages) {
      return res.status(500).json({ error: 'خطأ في جلب الرسائل' });
    }

    // إثراء الرسائل بمعلومات المرسل بشكل محسن
    const enriched = await Promise.allSettled(
      messages.map(async (m: any) => {
        try {
          const sender = await storage.getUser(m.senderId);
          return { ...m, sender };
        } catch {
          return m;
        }
      })
    );

    const finalMessages = enriched
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);

    // حفظ في cache للاستخدام المستقبلي
    conversationCache.set(conversationKey, {
      messages: finalMessages,
      timestamp: Date.now()
    });

    // تنظيف cache القديم
    cleanOldCache();

    return res.json({ 
      success: true, 
      messages: finalMessages, 
      count: finalMessages.length,
      cached: false
    });

  } catch (error: any) {
    console.error('خطأ في جلب رسائل الخاص:', error);
    return res.status(500).json({ error: error?.message || 'خطأ في الخادم' });
  }
});

/**
 * تنظيف cache القديم لتوفير الذاكرة
 */
function cleanOldCache() {
  const now = Date.now();
  for (const [key, value] of conversationCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      conversationCache.delete(key);
    }
  }
}

/**
 * GET /api/private-messages/cache/stats
 * إحصائيات cache للإدارة
 */
router.get('/cache/stats', (req, res) => {
  const stats = {
    totalEntries: conversationCache.size,
    entries: Array.from(conversationCache.entries()).map(([key, value]) => ({
      conversation: key,
      messageCount: value.messages.length,
      ageInMinutes: Math.round((Date.now() - value.timestamp) / 60000)
    })),
    cacheTtlMinutes: CACHE_TTL / 60000
  };

  res.json({ success: true, stats });
});

/**
 * POST /api/private-messages/cache/clear
 * مسح cache للإدارة
 */
router.post('/cache/clear', (req, res) => {
  conversationCache.clear();
  res.json({ success: true, message: 'تم مسح cache الرسائل الخاصة' });
});

export default router;