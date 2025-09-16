import { db } from '../database-adapter';
import { messages, users } from '../../shared/schema';
import { desc, eq, and, gte, lte, sql as drizzleSql } from 'drizzle-orm';

/**
 * استعلام محسّن لجلب الرسائل مع معلومات المرسل
 * يستخدم JOIN واحد بدلاً من N+1 queries
 */
export async function getOptimizedRoomMessages(
  roomId: string,
  limit: number = 20,
  offset: number = 0
) {
  if (!db) return { messages: [], total: 0 };

  try {
    // استعلام محسّن مع JOIN للحصول على معلومات المرسل
    const messagesWithSenders = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          eq(messages.roomId, roomId),
          eq(messages.isPrivate, false),
          eq(messages.deletedAt, null)
        )
      )
      .orderBy(desc(messages.timestamp))
      .limit(limit)
      .offset(offset);

    // عد إجمالي الرسائل بكفاءة
    const totalResult = await db
      .select({ count: drizzleSql<number>`count(*)::int` })
      .from(messages)
      .where(
        and(
          eq(messages.roomId, roomId),
          eq(messages.isPrivate, false),
          eq(messages.deletedAt, null)
        )
      );

    const total = totalResult[0]?.count || 0;

    return {
      messages: messagesWithSenders.map(({ message, sender }) => ({
        ...message,
        sender: sender || undefined,
      })),
      total,
      hasMore: offset + limit < total,
    };
  } catch (error) {
    console.error('خطأ في استعلام الرسائل المحسّن:', error);
    return { messages: [], total: 0 };
  }
}

/**
 * استعلام محسّن لجلب آخر N رسالة من كل غرفة
 * مفيد لعرض معاينة الرسائل الأخيرة
 */
export async function getLatestMessagesPerRoom(roomIds: string[], messagesPerRoom: number = 5) {
  if (!db || roomIds.length === 0) return {};

  try {
    // استخدام Window Functions للحصول على آخر N رسائل لكل غرفة
    const latestMessages = await db.execute(drizzleSql`
      WITH RankedMessages AS (
        SELECT 
          m.*,
          u.username,
          u.profile_image,
          u.user_type,
          ROW_NUMBER() OVER (PARTITION BY m.room_id ORDER BY m.timestamp DESC) as rn
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE 
          m.room_id = ANY(${roomIds})
          AND m.is_private = false
          AND m.deleted_at IS NULL
      )
      SELECT * FROM RankedMessages WHERE rn <= ${messagesPerRoom}
      ORDER BY room_id, timestamp DESC
    `);

    // تجميع الرسائل حسب الغرفة
    const messagesByRoom: Record<string, any[]> = {};
    for (const msg of latestMessages) {
      const roomId = String(msg.room_id);
      if (!messagesByRoom[roomId]) {
        messagesByRoom[roomId] = [];
      }
      messagesByRoom[roomId].push(msg);
    }

    return messagesByRoom;
  } catch (error) {
    console.error('خطأ في جلب آخر الرسائل:', error);
    return {};
  }
}

/**
 * استعلام محسّن لجلب المستخدمين المتصلين
 * مع تخزين مؤقت في الذاكرة
 */
const onlineUsersCache = new Map<string, { users: any[]; timestamp: number }>();
const CACHE_TTL = 5000; // 5 ثواني

export async function getOptimizedOnlineUsers(roomId?: string) {
  if (!db) return [];

  const cacheKey = roomId || 'all';
  const cached = onlineUsersCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.users;
  }

  try {
    const onlineUsers = await db
      .select()
      .from(users)
      .where(eq(users.isOnline, true))
      .orderBy(desc(users.lastSeen));

    onlineUsersCache.set(cacheKey, {
      users: onlineUsers,
      timestamp: Date.now(),
    });

    return onlineUsers;
  } catch (error) {
    console.error('خطأ في جلب المستخدمين المتصلين:', error);
    return cached?.users || [];
  }
}

/**
 * تنظيف الكاش بشكل دوري
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of onlineUsersCache.entries()) {
    if (now - value.timestamp > CACHE_TTL * 2) {
      onlineUsersCache.delete(key);
    }
  }
}, CACHE_TTL * 2);

/**
 * استعلام محسّن للبحث في الرسائل
 * يستخدم Full Text Search إذا كان متاحاً
 */
export async function searchMessages(
  searchTerm: string,
  roomId?: string,
  limit: number = 20
) {
  if (!db || !searchTerm.trim()) return [];

  try {
    const conditions = [
      drizzleSql`${messages.content} ILIKE ${'%' + searchTerm + '%'}`,
      eq(messages.deletedAt, null),
    ];

    if (roomId) {
      conditions.push(eq(messages.roomId, roomId));
    }

    const results = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(and(...conditions))
      .orderBy(desc(messages.timestamp))
      .limit(limit);

    return results.map(({ message, sender }) => ({
      ...message,
      sender: sender || undefined,
    }));
  } catch (error) {
    console.error('خطأ في البحث:', error);
    return [];
  }
}