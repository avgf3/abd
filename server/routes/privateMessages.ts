import { Router } from 'express';

import { db, dbType } from '../database-adapter';
import { notificationService } from '../services/notificationService';
import { storage } from '../storage';
import { spamProtection } from '../spam-protection';
import { protect } from '../middleware/enhancedSecurity';
import { sanitizeInput, limiters, SecurityConfig, validateMessageContent } from '../security';
import { moderationSystem } from '../moderation';
import { z } from 'zod';
import { parseEntityId } from '../types/entities';
import { friendService } from '../services/friendService';
import { databaseService } from '../services/databaseService';

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
  receiverId: z.union([z.number().int().positive(), z.string()]).transform((v) => {
    if (typeof v === 'number') return v;
    const parsed = parseEntityId(v as any).id as number;
    return parsed;
  }),
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

    if (senderId === parseInt(String(receiverId))) {
      return res.status(400).json({ error: 'لا يمكن إرسال رسالة لنفسك' });
    }

    const text = sanitizeInput(typeof content === 'string' ? content : '');
    if (!text) {
      return res.status(400).json({ error: 'محتوى الرسالة مطلوب' });
    }

    // احترام حالات الكتم/الطرد: إيقاف الكتابة خلال مدة الكتم
    try {
      const status = await moderationSystem.checkUserStatus(parseInt(String(senderId)));
      if (!status.canChat) {
        return res.status(403).json({ error: status.reason || 'غير مسموح بإرسال الرسائل حالياً', timeLeft: status.timeLeft });
      }
    } catch {}

    // السماح فقط بروابط YouTube ومنع غيرها
    const contentCheck = validateMessageContent(text);
    if (!contentCheck.isValid) {
      return res.status(400).json({ error: contentCheck.reason || 'محتوى غير مسموح' });
    }

    // التحقق من المستخدمين بشكل متوازي لتحسين السرعة
    const [sender, receiver] = await Promise.all([
      storage.getUser(parseInt(String(senderId))),
      storage.getUser(parseInt(String(receiverId))),
    ]);

    if (!sender) {
      return res.status(404).json({ error: 'المرسل غير موجود' });
    }
    if (!receiver) {
      return res.status(404).json({ error: 'المستلم غير موجود' });
    }

    // فرض إعدادات خصوصية المستلم
    try {
      const dmPrivacy = ((receiver as any).dmPrivacy || 'all') as string;
      if (dmPrivacy === 'none') {
        return res.status(403).json({ error: 'هذا المستخدم أغلق الرسائل الخاصة' });
      }
      if (dmPrivacy === 'friends') {
        const friendship = await friendService.getFriendship(
          parseInt(String(senderId)),
          parseInt(String(receiverId))
        );
        if (!friendship || (friendship as any).status !== 'accepted') {
          return res.status(403).json({ error: 'الرسائل الخاصة مسموحة للأصدقاء فقط' });
        }
      }
    } catch {}

    // فحص السبام/التكرار
    const check = spamProtection.checkMessage(parseInt(String(senderId)), text);
    if (!check.isAllowed) {
      try {
        if (check.action === 'tempBan') {
          await storage.updateUser(parseInt(String(senderId)), {
            isMuted: true as any,
            muteExpiry: new Date(Date.now() + 60 * 1000) as any,
          });
        }
      } catch {}
      return res.status(400).json({ error: check.reason || 'تم منع الرسالة بسبب التكرار/السبام' });
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

    // تحديث مؤشر القراءة للطرف المُرسل فور الإرسال
    try {
      await databaseService.upsertConversationRead(
        parseInt(String(senderId)),
        parseInt(String(receiverId)),
        new Date(messageWithSender.timestamp as any),
        (messageWithSender as any).id
      );
    } catch {}

    // تنظيف cache للمحادثة عند إضافة رسالة جديدة
    const conversationKey = `${Math.min(parseInt(String(senderId)), parseInt(receiverId))}-${Math.max(parseInt(String(senderId)), parseInt(receiverId))}`;
    conversationCache.delete(conversationKey);

    // إرسال إشعار وبث الرسالة بشكل متوازي
    const promises: Array<Promise<any>> = [];

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

    await Promise.all(promises);

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

    const uid = parseEntityId(userId as any).id as number;
    const oid = parseEntityId(otherUserId as any).id as number;
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
 * PUT /api/private-messages/reads
 * تحديث مؤشر قراءة محادثة خاصة (userId يحدده التوكن)
 * body: { otherUserId: number, lastReadAt?: string, lastReadMessageId?: number }
 */
router.put('/reads', protect.auth, async (req, res) => {
  try {
    const userId = (req as any).user?.id as number;
    const otherUserIdRaw = (req.body?.otherUserId ?? req.query?.otherUserId) as any;
    const otherUserId = parseEntityId(otherUserIdRaw as any).id as number;
    const lastReadAtStr = (req.body?.lastReadAt as string) || undefined;
    const lastReadMessageId = req.body?.lastReadMessageId as number | undefined;

    if (!userId || !otherUserId || userId === otherUserId) {
      return res.status(400).json({ error: 'بيانات غير صالحة' });
    }

    const lastReadAt = lastReadAtStr ? new Date(lastReadAtStr) : new Date();
    const ok = await databaseService.upsertConversationRead(userId, otherUserId, lastReadAt, lastReadMessageId);
    if (!ok) return res.status(500).json({ error: 'تعذر حفظ مؤشر القراءة' });

    // بث حدث لتزامن الشارات بين التبويبات/الأجهزة وإبلاغ الطرف الآخر للـ read receipts
    try {
      const io = (req.app as any).get('io');
      if (io) {
        const payload = {
          type: 'conversationRead',
          userId, // القارئ
          otherUserId,
          lastReadAt: lastReadAt.toISOString(),
          lastReadMessageId: lastReadMessageId || null,
        } as any;
        // إلى القارئ (لتحديث القوائم محلياً)
        io.to(String(userId)).emit('message', payload);
        // إلى الطرف الآخر (لعرض الصحّين)
        io.to(String(otherUserId)).emit('message', payload);
      }
    } catch {}

    return res.json({ success: true });
  } catch (error: any) {
    console.error('خطأ في تحديث مؤشر قراءة الخاص:', error);
    return res.status(500).json({ error: error?.message || 'خطأ في الخادم' });
  }
});

/**
 * GET /api/private-messages/unread-count/:userId
 * إرجاع عدد المحادثات الخاصة غير المقروءة بناءً على مؤشّر القراءة
 */
router.get('/unread-count/:userId', protect.auth, async (req, res) => {
  try {
    const userId = parseEntityId(req.params.userId as any).id as number;
    const requester = (req as any).user;
    const isPrivileged = requester && ['admin', 'owner'].includes(requester.userType);
    if (!requester || (requester.id !== userId && !isPrivileged)) {
      return res.status(403).json({ error: 'غير مسموح' });
    }
    const c = await databaseService.getUnreadDmCount(userId);
    return res.json({ count: c || 0 });
  } catch (error: any) {
    console.error('خطأ في unread-count الخاص:', error);
    return res.status(500).json({ error: error?.message || 'خطأ في الخادم' });
  }
});

/**
 * GET /api/private-messages/conversations/:userId?limit=50
 * إرجاع قائمة المحادثات الخاصة الأخيرة (طرف واحد + آخر رسالة) لعرضها في تبويب الرسائل
 */
router.get('/conversations/:userId', protect.auth, async (req, res) => {
  try {
    const userId = parseEntityId(req.params.userId as any).id as number;
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

    // PostgreSQL: استخدم DISTINCT ON مع فهرس pair للحصول على آخر رسالة لكل ثنائية + unreadCount
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
          SELECT l.id, l.sender_id, l.receiver_id, l.content, l.message_type, l.is_private, l."timestamp",
                 CASE 
                   WHEN l.receiver_id = ${userId} THEN l.sender_id 
                   ELSE l.receiver_id 
                 END AS other_user_id,
                 COALESCE(
                   (
                     SELECT COUNT(*)::int FROM messages m
                     LEFT JOIN conversation_reads cr
                       ON cr.user_id = ${userId} AND cr.other_user_id = (
                         CASE WHEN l.receiver_id = ${userId} THEN l.sender_id ELSE l.receiver_id END
                       )
                     WHERE m.is_private = TRUE
                       AND ((m.sender_id = ${userId} AND m.receiver_id = (
                              CASE WHEN l.receiver_id = ${userId} THEN l.sender_id ELSE l.receiver_id END
                            ))
                            OR (m.receiver_id = ${userId} AND m.sender_id = (
                              CASE WHEN l.receiver_id = ${userId} THEN l.sender_id ELSE l.receiver_id END
                            )))
                       AND m.receiver_id = ${userId}
                       AND (cr.last_read_at IS NULL OR m."timestamp" > cr.last_read_at)
                   ), 0) AS unread_count
          FROM latest l
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

        const conversations = (rows as any[]).map((r) => {
          const otherUserId = (r as any).other_user_id || (r.sender_id === userId ? r.receiver_id : r.sender_id);
          return {
            otherUserId,
            otherUser: userMap.get(otherUserId) || null,
            lastMessage: {
              id: r.id,
              content: r.content,
              messageType: r.message_type,
              timestamp: r.timestamp,
            },
            unreadCount: Number((r as any).unread_count || 0),
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
/**
 * GET /api/private-messages/reads/:otherUserId
 * جلب مؤشرات القراءة للطرفين في محادثة ثنائية
 */
router.get('/reads/:otherUserId', protect.auth, async (req, res) => {
  try {
    const userId = (req as any).user?.id as number;
    const otherUserId = parseEntityId(req.params.otherUserId as any).id as number;
    if (!userId || !otherUserId || userId === otherUserId) {
      return res.status(400).json({ error: 'بيانات غير صالحة' });
    }
    const mine = await databaseService.getConversationRead(userId, otherUserId);
    const partner = await databaseService.getConversationRead(otherUserId, userId);
    return res.json({
      success: true,
      mine: mine
        ? {
            lastReadAt: mine.lastReadAt ? (mine.lastReadAt as any).toISOString?.() || new Date(mine.lastReadAt as any).toISOString() : null,
            lastReadMessageId: mine.lastReadMessageId ?? null,
          }
        : { lastReadAt: null, lastReadMessageId: null },
      partner: partner
        ? {
            lastReadAt: partner.lastReadAt ? (partner.lastReadAt as any).toISOString?.() || new Date(partner.lastReadAt as any).toISOString() : null,
            lastReadMessageId: partner.lastReadMessageId ?? null,
          }
        : { lastReadAt: null, lastReadMessageId: null },
    });
  } catch (error: any) {
    console.error('خطأ في جلب مؤشرات القراءة:', error);
    return res.status(500).json({ error: error?.message || 'خطأ في الخادم' });
  }
});

export default router;
