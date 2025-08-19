import { Router } from 'express';

import { notificationService } from '../services/notificationService';
import { storage } from '../storage';
import { messageLimiter, validateMessageContent } from '../security';
import { db, dbType } from '../database-adapter';

// Helper type for conversation item (server-side internal)
type ConversationItem = {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  message_type: string;
  is_private: boolean;
  timestamp: string | Date;
};

const router = Router();

// Cache for recent conversations to reduce database queries
const conversationCache = new Map<string, { messages: any[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * POST /api/private-messages/send
 * إرسال رسالة خاصة بين مستخدمين مع تحسينات الأداء
 */
router.post('/send', messageLimiter, async (req, res) => {
  try {
    const { senderId, receiverId, content, messageType = 'text' } = req.body || {};

    // التحقق من صحة البيانات
    if (!senderId || !receiverId) {
      return res.status(400).json({ error: 'معرّف المرسل والمستلم مطلوبان' });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ error: 'لا يمكن إرسال رسالة لنفسك' });
    }

    const raw = typeof content === 'string' ? content : '';
    const validation = validateMessageContent(raw);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.reason || 'محتوى الرسالة غير صالح' });
    }
    const text = raw.trim();

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

    // منع الإرسال إذا كان المستقبل قد تجاهل المُرسل
    try {
      const ignoredByReceiver: number[] = await storage.getIgnoredUsers(parseInt(receiverId));
      if (Array.isArray(ignoredByReceiver) && ignoredByReceiver.includes(parseInt(senderId))) {
        return res.status(403).json({ error: 'لا يمكن إرسال رسالة: هذا المستخدم قام بتجاهلك' });
      }
    } catch {}

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
router.get('/:userId/:otherUserId', async (req, res, next) => {
  try {
    const { userId, otherUserId } = req.params;
    // تمرير المسارات الثابتة إلى معالجاتها الصحيحة لتفادي تطابق المسار الديناميكي
    if (userId === 'conversations' || userId === 'cache') {
      return next();
    }
    const { limit = 50, beforeTs, beforeId } = req.query as { limit?: any; beforeTs?: string; beforeId?: string };

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

    // إعدادات hasMore عبر جلب عنصر إضافي
    const fetchLimitPlusOne = lim + 1;

    let messages: any[] = [];
    let fetchedFromCache = false;

    // دعم الجلب للأقدم
    if (beforeTs || beforeId) {
      // إذا كان لدينا كاش، حاول التزويد منه أولاً
      if (cachedData && Array.isArray(cachedData.messages) && cachedData.messages.length > 0) {
        const thresholdTs = beforeTs ? new Date(beforeTs) : undefined;
        const thresholdId = beforeId ? parseInt(beforeId) : undefined;
        const filtered = cachedData.messages.filter((m: any) => {
          if (thresholdTs) {
            return new Date(m.timestamp).getTime() < new Date(thresholdTs).getTime();
          }
          if (typeof thresholdId === 'number' && !isNaN(thresholdId)) {
            return (m.id as number) < thresholdId;
          }
          return false;
        });
        if (filtered.length >= lim) {
          messages = filtered.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, fetchLimitPlusOne);
          fetchedFromCache = true;
        }
      }

      if (!fetchedFromCache) {
        const older = await storage.getPrivateMessagesBefore(
          uid,
          oid,
          fetchLimitPlusOne,
          beforeTs ? new Date(beforeTs) : undefined,
          beforeId ? parseInt(beforeId) : undefined
        );
        messages = older || [];

        // دمج مع الكاش الحالي لتسريع الطلبات القادمة
        const existing = (cachedData?.messages || []) as any[];
        if (messages.length > 0 || existing.length > 0) {
          const byId = new Map<number, any>();
          [...existing, ...messages].forEach((m: any) => { if (m && typeof m.id === 'number') byId.set(m.id, m); });
          const merged = Array.from(byId.values()).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          conversationCache.set(conversationKey, { messages: merged, timestamp: Date.now() });
          cleanOldCache();
        }
      }
    } else {
      // أحدث الرسائل
      const latest = await storage.getPrivateMessages(uid, oid, fetchLimitPlusOne);
      messages = latest?.filter((m: any) => !m.deletedAt) || [];

      // إثراء الرسائل بمعلومات المرسل بشكل محسن (Batch)
      const uniqueSenderIds = Array.from(new Set(messages.map((m: any) => m.senderId).filter(Boolean)));
      const senders = await storage.getUsersByIds(uniqueSenderIds as number[]);
      const senderMap = new Map<number, any>((senders || []).map((u: any) => [u.id, u]));
      const finalMessages = messages.map((m: any) => ({ ...m, sender: senderMap.get(m.senderId) }));

      // حفظ في cache كأحدث نسخة
      conversationCache.set(conversationKey, { messages: finalMessages, timestamp: Date.now() });
      cleanOldCache();
      messages = finalMessages;
    }

    // إثراء الرسائل المجلوبة للأقدم بمعلومات المرسل إذا لزم (قد تكون موجودة بالفعل)
    if (messages.length > 0 && !messages[0]?.sender) {
      const uniqueSenderIds = Array.from(new Set(messages.map((m: any) => m.senderId).filter(Boolean)));
      const senders = await storage.getUsersByIds(uniqueSenderIds as number[]);
      const senderMap = new Map<number, any>((senders || []).map((u: any) => [u.id, u]));
      messages = messages.map((m: any) => ({ ...m, sender: m.sender || senderMap.get(m.senderId) })).filter((m: any) => !m.deletedAt);
    }

    const hasMore = messages.length > lim;
    const limited = hasMore ? messages.slice(0, lim) : messages;

    return res.json({ 
      success: true, 
      messages: limited, 
      count: limited.length,
      hasMore
    });

  } catch (error: any) {
    console.error('خطأ في جلب رسائل الخاص:', error);
    return res.status(500).json({ error: error?.message || 'خطأ في الخادم' });
  }
});

/**
 * GET /api/private-messages/conversations/:userId?limit=50
 * إرجاع قائمة المحادثات الخاصة الأخيرة (طرف واحد + آخر رسالة) لعرضها في تبويب الرسائل
 */
router.get('/conversations/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const limitParam = req.query.limit as string | undefined;
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '50')));

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'معرّف المستخدم غير صالح' });
    }

    // PostgreSQL: استخدم DISTINCT ON مع فهرس pair للحصول على آخر رسالة لكل ثنائية
    if (dbType === 'postgresql') {
      try {
        const sql = `
          WITH pm AS (
            SELECT id, sender_id, receiver_id, content, message_type, is_private, "timestamp"
            FROM messages
            WHERE is_private = TRUE AND (sender_id = ${userId} OR receiver_id = ${userId})
          ),
          pairs AS (
            SELECT *, LEAST(sender_id, receiver_id) AS a, GREATEST(sender_id, receiver_id) AS b
            FROM pm
          ),
          latest AS (
            SELECT DISTINCT ON (a, b)
              id, sender_id, receiver_id, content, message_type, is_private, "timestamp", a, b
            FROM pairs
            ORDER BY a, b, "timestamp" DESC
          )
          SELECT id, sender_id, receiver_id, content, message_type, is_private, "timestamp"
          FROM latest
          ORDER BY "timestamp" DESC
          LIMIT ${limit};
        `;
        const result: any = await (db as any).execute(sql);
        const rows: ConversationItem[] = (result?.rows ?? result ?? []) as any;

        // تحديد الطرف الآخر وجلب بياناته دفعة واحدة
        const otherUserIds = Array.from(new Set(rows.map(r => (r.sender_id === userId ? r.receiver_id : r.sender_id)).filter(Boolean)));
        const users = await storage.getUsersByIds(otherUserIds as number[]);
        const userMap = new Map<number, any>((users || []).map((u: any) => [u.id, u]));

        const conversations = rows.map((r) => {
          const otherUserId = r.sender_id === userId ? r.receiver_id : r.sender_id;
          return {
            otherUserId,
            otherUser: userMap.get(otherUserId) || null,
            lastMessage: {
              id: r.id,
              content: r.content,
              messageType: r.message_type,
              timestamp: r.timestamp,
            }
          };
        });

        return res.json({ success: true, conversations });
      } catch (e) {
        console.error('خطأ في جلب المحادثات (PG):', e);
        return res.status(500).json({ error: 'خطأ في جلب المحادثات' });
      }
    }

    // SQLite أو وضع بدون قاعدة بيانات: اجلب آخر الكثير من الرسائل ثم كوّن المحادثات في الذاكرة
    try {
      const sql = `
        SELECT id, sender_id, receiver_id, content, message_type, is_private, timestamp
        FROM messages
        WHERE is_private = 1 AND (sender_id = ${userId} OR receiver_id = ${userId})
        ORDER BY timestamp DESC
        LIMIT ${Math.max(limit * 10, 200)};
      `;
      const result: any = await (db as any)?.execute?.(sql);
      const rows: ConversationItem[] = (result?.rows ?? result ?? []) as any;

      const seenPairs = new Set<string>();
      const picked: ConversationItem[] = [];
      for (const r of rows) {
        const a = Math.min(r.sender_id, r.receiver_id);
        const b = Math.max(r.sender_id, r.receiver_id);
        const key = `${a}-${b}`;
        if (!seenPairs.has(key)) {
          seenPairs.add(key);
          picked.push(r);
          if (picked.length >= limit) break;
        }
      }

      const otherUserIds = Array.from(new Set(picked.map(r => (r.sender_id === userId ? r.receiver_id : r.sender_id)).filter(Boolean)));
      const users = await storage.getUsersByIds(otherUserIds as number[]);
      const userMap = new Map<number, any>((users || []).map((u: any) => [u.id, u]));

      const conversations = picked.map((r) => {
        const otherUserId = r.sender_id === userId ? r.receiver_id : r.sender_id;
        return {
          otherUserId,
          otherUser: userMap.get(otherUserId) || null,
          lastMessage: {
            id: r.id,
            content: r.content,
            messageType: r.message_type,
            timestamp: r.timestamp,
          }
        };
      });

      return res.json({ success: true, conversations });
    } catch (e) {
      console.error('خطأ في جلب المحادثات (SQLite):', e);
      return res.status(500).json({ error: 'خطأ في جلب المحادثات' });
    }
  } catch (error: any) {
    console.error('خطأ غير متوقع في /conversations:', error);
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

/**
 * GET /api/private-messages/unread/:userId
 * جلب عدد الرسائل الخاصة غير المقروءة لكل محادثة
 * ملاحظة: حالياً لا نملك حقل read receipts في جدول الرسائل،
 * لذلك نستخدم إشعارات النوع message كمصدر بديل لعدّاد غير المقروء.
 */
router.get('/unread/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'معرّف المستخدم غير صالح' });
    }

    // جلب إشعارات الرسائل غير المقروءة كمصدر للعداد
    const notes = await notificationService.getUserNotifications(userId, 500);
    const unread = (notes || []).filter((n: any) => n.type === 'message' && n.isRead === false);
    const bySender = new Map<number, number>();
    for (const n of unread) {
      const senderId = n?.data?.senderId;
      if (typeof senderId === 'number') {
        bySender.set(senderId, (bySender.get(senderId) || 0) + 1);
      }
    }

    const result = Array.from(bySender.entries()).map(([otherUserId, count]) => ({ otherUserId, count }));
    return res.json({ success: true, items: result });
  } catch (error: any) {
    console.error('خطأ في جلب عداد الرسائل غير المقروءة:', error);
    return res.status(500).json({ error: error?.message || 'خطأ في الخادم' });
  }
});

/**
 * POST /api/private-messages/mark-read
 * وسم رسائل محادثة كمقروءة عبر الإشعارات المقابلة
 * body: { userId: number, otherUserId: number }
 */
router.post('/mark-read', async (req, res) => {
  try {
    const { userId, otherUserId } = req.body || {};
    const uid = parseInt(userId);
    const oid = parseInt(otherUserId);
    if (!uid || !oid || isNaN(uid) || isNaN(oid)) {
      return res.status(400).json({ error: 'معرّفات غير صالحة' });
    }

    // اجلب إشعارات المستخدم ثم علّم إشعارات رسائل هذا الطرف كمقروءة
    const notes = await notificationService.getUserNotifications(uid, 1000);
    const targets = (notes || []).filter((n: any) => n.type === 'message' && n.isRead === false && n?.data?.senderId === oid);
    for (const n of targets) {
      await notificationService.markNotificationAsRead(n.id);
    }
    return res.json({ success: true, updated: targets.length });
  } catch (error: any) {
    console.error('خطأ في وسم الرسائل كمقروءة:', error);
    return res.status(500).json({ error: error?.message || 'خطأ في الخادم' });
  }
});

export default router;