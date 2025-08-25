import { Router } from 'express';

import { db, dbType } from '../database-adapter';
import { notificationService } from '../services/notificationService';
import { storage } from '../storage';
import { protect } from '../middleware/enhancedSecurity';
import { sanitizeInput, limiters, SecurityConfig } from '../security';
import { z } from 'zod';

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
const conversationCache = new Map<string, { messages: any[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * POST /api/private-messages/send
 * إرسال رسالة خاصة بين مستخدمين مع تحسينات الأداء
 */
const pmSchema = z.object({
  receiverId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
  content: z.string().trim().min(1, 'محتوى الرسالة مطلوب').max(SecurityConfig.MAX_MESSAGE_LENGTH),
  messageType: z.enum(['text', 'image', 'sticker']).default('text'),
});

router.post('/send', protect.auth, limiters.pmSend, async (req, res) => {
  try {
    const parsed = pmSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'بيانات غير صحيحة' });
    }
    const { receiverId, content, messageType } = parsed.data as any;
    const senderId = (req as any).user?.id as number;

    // التحقق من صحة البيانات
    if (!senderId || !receiverId) {
      return res.status(400).json({ error: 'معرّف المرسل والمستلم مطلوبان' });
    }

    if (senderId === parseInt(receiverId)) {
      return res.status(400).json({ error: 'لا يمكن إرسال رسالة لنفسك' });
    }

    const text = sanitizeInput(typeof content === 'string' ? content : '');
    if (!text) {
      return res.status(400).json({ error: 'محتوى الرسالة مطلوب' });
    }

    // التحقق من المستخدمين بشكل متوازي لتحسين السرعة
    const [sender, receiver] = await Promise.all([
      storage.getUser(parseInt(String(senderId))),
      storage.getUser(parseInt(receiverId)),
    ]);

    if (!sender) {
      return res.status(404).json({ error: 'المرسل غير موجود' });
    }
    if (!receiver) {
      return res.status(404).json({ error: 'المستلم غير موجود' });
    }

    // إنشاء الرسالة في قاعدة البيانات مع تحسين البيانات
    const messageData = {
      senderId: parseInt(String(senderId)),
      receiverId: parseInt(receiverId),
      content: text,
      messageType,
      isPrivate: true,
      timestamp: new Date(),
      attachments: (() => {
        try {
          const profileImage: string = (sender as any)?.profileImage || '';
          const baseUrl = typeof profileImage === 'string' ? profileImage.split('?')[0] : '';
          const hashFromField: string | undefined = (sender as any)?.avatarHash;
          let hashFromUrl: string | undefined;
          try {
            const q = profileImage.includes('?') ? profileImage.split('?')[1] : '';
            const params = new URLSearchParams(q);
            const v = params.get('v') || undefined;
            hashFromUrl = v || undefined;
          } catch {}
          const finalHash = hashFromField || hashFromUrl || undefined;
          if (baseUrl && finalHash) {
            return [
              { type: 'senderAvatar', url: baseUrl, hash: finalHash },
            ];
          }
        } catch {}
        return [];
      })(),
    };

    const newMessage = await storage.createMessage(messageData);

    if (!newMessage) {
      return res.status(500).json({ error: 'فشل في إنشاء الرسالة' });
    }

    const messageWithSender = { ...newMessage, sender };

    // تنظيف cache للمحادثة عند إضافة رسالة جديدة
    const conversationKey = `${Math.min(parseInt(String(senderId)), parseInt(receiverId))}-${Math.max(parseInt(String(senderId)), parseInt(receiverId))}`;
    conversationCache.delete(conversationKey);

    // إرسال إشعار وبث الرسالة بشكل متوازي
    const promises = [];

    // تم إيقاف إنشاء إشعار الرسائل: تبويب الإشعارات لا يعرض إشعارات الرسائل

    // بث الرسالة عبر Socket.IO
    const io = req.app.get('io');
    if (io) {
      promises.push(
        Promise.all([
          new Promise((resolve) => {
            try {
              io.to(String(senderId)).emit('privateMessage', { message: messageWithSender });
              resolve(true);
            } catch {
              resolve(false);
            }
          }),
          new Promise((resolve) => {
            try {
              io.to(String(receiverId)).emit('privateMessage', { message: messageWithSender });
              resolve(true);
            } catch {
              resolve(false);
            }
          }),
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
router.get('/:userId/:otherUserId', protect.auth, async (req, res, next) => {
  try {
    const { userId, otherUserId } = req.params;
    // تمرير المسارات الثابتة إلى معالجاتها الصحيحة لتفادي تطابق المسار الديناميكي
    if (userId === 'conversations' || userId === 'cache') {
      return next();
    }
    const {
      limit = 50,
      beforeTs,
      beforeId,
    } = req.query as { limit?: any; beforeTs?: string; beforeId?: string };

    const uid = parseInt(userId);
    const oid = parseInt(otherUserId);
    const lim = Math.min(100, Math.max(1, parseInt(limit as string)));

    if (!uid || !oid || isNaN(uid) || isNaN(oid)) {
      return res.status(400).json({ error: 'معرّفات المستخدمين غير صالحة' });
    }

    // السماح للمستخدم نفسه فقط أو للإدمن/المالك
    const requester = (req as any).user;
    const isPrivileged = requester && ['admin', 'owner'].includes(requester.userType);
    if (!requester || (requester.id !== uid && !isPrivileged)) {
      return res.status(403).json({ error: 'غير مسموح' });
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
          messages = filtered
            .sort(
              (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )
            .slice(0, fetchLimitPlusOne);
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
          [...existing, ...messages].forEach((m: any) => {
            if (m && typeof m.id === 'number') byId.set(m.id, m);
          });
          const merged = Array.from(byId.values()).sort(
            (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          conversationCache.set(conversationKey, { messages: merged, timestamp: Date.now() });
          cleanOldCache();
        }
      }
    } else {
      // أحدث الرسائل
      const latest = await storage.getPrivateMessages(uid, oid, fetchLimitPlusOne);
      messages = latest || [];

      // إثراء الرسائل بمعلومات المرسل بشكل محسن (Batch)
      const uniqueSenderIds = Array.from(
        new Set(messages.map((m: any) => m.senderId).filter(Boolean))
      );
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
      const uniqueSenderIds = Array.from(
        new Set(messages.map((m: any) => m.senderId).filter(Boolean))
      );
      const senders = await storage.getUsersByIds(uniqueSenderIds as number[]);
      const senderMap = new Map<number, any>((senders || []).map((u: any) => [u.id, u]));
      messages = messages.map((m: any) => ({
        ...m,
        sender: m.sender || senderMap.get(m.senderId),
      }));
    }

    const hasMore = messages.length > lim;
    const limited = hasMore ? messages.slice(0, lim) : messages;

    return res.json({
      success: true,
      messages: limited,
      count: limited.length,
      hasMore,
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
router.get('/conversations/:userId', protect.auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const limitParam = req.query.limit as string | undefined;
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '50')));

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'معرّف المستخدم غير صالح' });
    }

    // تحقق الملكية أو صلاحية إدارية
    const requester = (req as any).user;
    const isPrivileged = requester && ['admin', 'owner'].includes(requester.userType);
    if (!requester || (requester.id !== userId && !isPrivileged)) {
      return res.status(403).json({ error: 'غير مسموح' });
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
        const otherUserIds = Array.from(
          new Set(
            rows.map((r) => (r.sender_id === userId ? r.receiver_id : r.sender_id)).filter(Boolean)
          )
        );
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
            },
          };
        });

        return res.json({ success: true, conversations });
      } catch (e) {
        console.error('خطأ في جلب المحادثات (PG):', e);
        return res.status(500).json({ error: 'خطأ في جلب المحادثات' });
      }
    }
    // إذا لم تكن قاعدة البيانات متصلة أو ليست PostgreSQL
    return res.status(503).json({ error: 'قاعدة البيانات غير متاحة' });
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
router.get('/cache/stats', protect.admin, (req, res) => {
  const stats = {
    totalEntries: conversationCache.size,
    entries: Array.from(conversationCache.entries()).map(([key, value]) => ({
      conversation: key,
      messageCount: value.messages.length,
      ageInMinutes: Math.round((Date.now() - value.timestamp) / 60000),
    })),
    cacheTtlMinutes: CACHE_TTL / 60000,
  };

  res.json({ success: true, stats });
});

/**
 * POST /api/private-messages/cache/clear
 * مسح cache للإدارة
 */
router.post('/cache/clear', protect.admin, (req, res) => {
  conversationCache.clear();
  res.json({ success: true, message: 'تم مسح cache الرسائل الخاصة' });
});

export default router;
