import { and, desc, eq, or, sql, inArray, isNull, gte, lte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { 
  conversations, 
  conversationParticipants, 
  privateMessages, 
  messageReadReceipts,
  typingIndicators,
  messageDrafts,
  messageReactions,
  callLogs
} from "../../shared/private-messages-schema";
import { users } from "../../shared/schema";
import * as crypto from "crypto";

export class PrivateMessagesService {
  constructor(private db: PostgresJsDatabase) {}

  // ==================== إدارة المحادثات ====================

  /**
   * إنشاء أو الحصول على محادثة مباشرة بين مستخدمين
   */
  async findOrCreateDirectConversation(userId1: number, userId2: number) {
    // التحقق من وجود محادثة سابقة
    const existingConversation = await this.db
      .select({
        conversation: conversations,
        participants: sql<number[]>`array_agg(${conversationParticipants.userId})`.as('participants')
      })
      .from(conversations)
      .innerJoin(conversationParticipants, eq(conversations.id, conversationParticipants.conversationId))
      .where(
        and(
          eq(conversations.type, 'direct'),
          eq(conversationParticipants.status, 'active')
        )
      )
      .groupBy(conversations.id)
      .having(
        sql`array_agg(${conversationParticipants.userId} ORDER BY ${conversationParticipants.userId}) = ARRAY[${Math.min(userId1, userId2)}, ${Math.max(userId1, userId2)}]::integer[]`
      )
      .limit(1);

    if (existingConversation.length > 0) {
      return existingConversation[0].conversation;
    }

    // إنشاء محادثة جديدة
    const [newConversation] = await this.db
      .insert(conversations)
      .values({
        type: 'direct',
        settings: {
          allowedMessageTypes: ['text', 'image', 'video', 'audio', 'file'],
          maxFileSize: 50 * 1024 * 1024, // 50MB
        }
      })
      .returning();

    // إضافة المشاركين
    await this.db.insert(conversationParticipants).values([
      {
        conversationId: newConversation.id,
        userId: userId1,
        role: 'member',
        status: 'active'
      },
      {
        conversationId: newConversation.id,
        userId: userId2,
        role: 'member',
        status: 'active'
      }
    ]);

    return newConversation;
  }

  /**
   * إنشاء محادثة جماعية
   */
  async createGroupConversation(creatorId: number, name: string, memberIds: number[], avatar?: string) {
    const [newConversation] = await this.db
      .insert(conversations)
      .values({
        type: 'group',
        name,
        avatar,
        createdBy: creatorId,
        settings: {
          allowedMessageTypes: ['text', 'image', 'video', 'audio', 'file'],
          maxFileSize: 50 * 1024 * 1024,
          maxMembers: 100,
        }
      })
      .returning();

    // إضافة المنشئ كمالك
    const participants = [
      {
        conversationId: newConversation.id,
        userId: creatorId,
        role: 'owner' as const,
        status: 'active' as const
      }
    ];

    // إضافة باقي الأعضاء
    for (const memberId of memberIds) {
      if (memberId !== creatorId) {
        participants.push({
          conversationId: newConversation.id,
          userId: memberId,
          role: 'member' as const,
          status: 'active' as const
        });
      }
    }

    await this.db.insert(conversationParticipants).values(participants);

    return newConversation;
  }

  /**
   * الحصول على جميع محادثات المستخدم
   */
  async getUserConversations(userId: number, options?: {
    includeArchived?: boolean;
    includeMuted?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const { includeArchived = false, includeMuted = true, limit = 50, offset = 0 } = options || {};

    let query = this.db
      .select({
        conversation: conversations,
        participant: conversationParticipants,
        unreadCount: sql<number>`
          COUNT(DISTINCT ${privateMessages.id}) FILTER (
            WHERE ${privateMessages.id} > COALESCE(${conversationParticipants.lastReadMessageId}, 0)
            AND ${privateMessages.senderId} != ${userId}
            AND ${privateMessages.isDeleted} = false
          )
        `.as('unreadCount'),
        lastMessage: sql<any>`
          json_build_object(
            'id', lm.id,
            'content', lm.content,
            'type', lm.type,
            'senderId', lm.sender_id,
            'createdAt', lm.created_at,
            'sender', json_build_object(
              'id', u.id,
              'username', u.username,
              'profileImage', u.profile_image
            )
          )
        `.as('lastMessage'),
        otherParticipants: sql<any[]>`
          COALESCE(
            array_agg(
              DISTINCT jsonb_build_object(
                'id', op.id,
                'username', op.username,
                'profileImage', op.profile_image,
                'isOnline', op.is_online,
                'lastSeen', op.last_seen
              )
            ) FILTER (WHERE op.id != ${userId}),
            ARRAY[]::jsonb[]
          )
        `.as('otherParticipants')
      })
      .from(conversationParticipants)
      .innerJoin(conversations, eq(conversationParticipants.conversationId, conversations.id))
      .leftJoin(privateMessages, eq(conversations.lastMessageId, privateMessages.id))
      .leftJoin(sql`${privateMessages} lm`, sql`lm.id = ${conversations.lastMessageId}`)
      .leftJoin(sql`${users} u`, sql`u.id = lm.sender_id`)
      .leftJoin(
        sql`${conversationParticipants} cp2`,
        sql`cp2.conversation_id = ${conversations.id} AND cp2.status = 'active'`
      )
      .leftJoin(sql`${users} op`, sql`op.id = cp2.user_id`)
      .where(
        and(
          eq(conversationParticipants.userId, userId),
          eq(conversationParticipants.status, 'active'),
          includeArchived ? undefined : eq(conversationParticipants.isArchived, false),
          includeMuted ? undefined : eq(conversationParticipants.isMuted, false)
        )
      )
      .groupBy(
        conversations.id,
        conversationParticipants.conversationId,
        conversationParticipants.userId,
        conversationParticipants.role,
        conversationParticipants.status,
        conversationParticipants.lastReadMessageId,
        conversationParticipants.lastReadAt,
        conversationParticipants.notificationEnabled,
        conversationParticipants.isMuted,
        conversationParticipants.mutedUntil,
        conversationParticipants.isPinned,
        conversationParticipants.pinnedAt,
        conversationParticipants.isArchived,
        conversationParticipants.archivedAt,
        conversationParticipants.joinedAt,
        conversationParticipants.leftAt,
        sql`lm.id`,
        sql`lm.content`,
        sql`lm.type`,
        sql`lm.sender_id`,
        sql`lm.created_at`,
        sql`u.id`,
        sql`u.username`,
        sql`u.profile_image`
      )
      .orderBy(
        desc(conversationParticipants.isPinned),
        desc(conversations.lastMessageAt)
      )
      .limit(limit)
      .offset(offset);

    return await query;
  }

  // ==================== إدارة الرسائل ====================

  /**
   * إرسال رسالة جديدة
   */
  async sendMessage(conversationId: number, senderId: number, data: {
    content?: string;
    type?: string;
    attachments?: any[];
    metadata?: any;
    replyToId?: number;
    forwardedFromId?: number;
    expiresInSeconds?: number;
  }) {
    const { 
      content, 
      type = 'text', 
      attachments = [], 
      metadata = {},
      replyToId,
      forwardedFromId,
      expiresInSeconds
    } = data;

    // التحقق من صلاحية المرسل
    const participant = await this.db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, senderId),
          eq(conversationParticipants.status, 'active')
        )
      )
      .limit(1);

    if (!participant.length) {
      throw new Error('لا يمكنك إرسال رسائل في هذه المحادثة');
    }

    // إنشاء الرسالة
    const expiresAt = expiresInSeconds 
      ? new Date(Date.now() + expiresInSeconds * 1000)
      : undefined;

    const [message] = await this.db
      .insert(privateMessages)
      .values({
        conversationId,
        senderId,
        content,
        type,
        attachments,
        metadata,
        replyToId,
        forwardedFromId,
        status: 'sent',
        expiresAt
      })
      .returning();

    // تحديث آخر رسالة في المحادثة
    await this.db
      .update(conversations)
      .set({
        lastMessageId: message.id,
        lastMessageAt: message.createdAt,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, conversationId));

    // حذف المسودة إن وجدت
    await this.db
      .delete(messageDrafts)
      .where(
        and(
          eq(messageDrafts.conversationId, conversationId),
          eq(messageDrafts.userId, senderId)
        )
      );

    return message;
  }

  /**
   * الحصول على رسائل محادثة
   */
  async getConversationMessages(conversationId: number, userId: number, options?: {
    limit?: number;
    beforeId?: number;
    afterId?: number;
  }) {
    const { limit = 50, beforeId, afterId } = options || {};

    // التحقق من صلاحية المستخدم
    const participant = await this.db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .limit(1);

    if (!participant.length) {
      throw new Error('ليس لديك صلاحية للوصول لهذه المحادثة');
    }

    let conditions = [
      eq(privateMessages.conversationId, conversationId),
      eq(privateMessages.isDeleted, false),
      // استبعاد الرسائل المحذوفة للمستخدم الحالي
      sql`NOT (${privateMessages.deletedFor}::jsonb ? ${userId.toString()})`
    ];

    if (beforeId) {
      conditions.push(sql`${privateMessages.id} < ${beforeId}`);
    }
    if (afterId) {
      conditions.push(sql`${privateMessages.id} > ${afterId}`);
    }

    const messages = await this.db
      .select({
        message: privateMessages,
        sender: {
          id: users.id,
          username: users.username,
          profileImage: users.profileImage,
          nameColor: users.nameColor,
          nameGlow: users.nameGlow,
          badges: users.badges
        },
        replyTo: sql<any>`
          CASE WHEN ${privateMessages.replyToId} IS NOT NULL THEN
            json_build_object(
              'id', reply.id,
              'content', reply.content,
              'type', reply.type,
              'senderId', reply.sender_id,
              'senderName', reply_sender.username
            )
          ELSE NULL END
        `.as('replyTo'),
        reactions: sql<any[]>`
          COALESCE(
            array_agg(
              DISTINCT jsonb_build_object(
                'reaction', r.reaction,
                'userId', r.user_id,
                'username', ru.username
              )
            ) FILTER (WHERE r.message_id IS NOT NULL),
            ARRAY[]::jsonb[]
          )
        `.as('reactions'),
        readBy: sql<number[]>`
          COALESCE(
            array_agg(DISTINCT rr.user_id) FILTER (WHERE rr.message_id IS NOT NULL),
            ARRAY[]::integer[]
          )
        `.as('readBy')
      })
      .from(privateMessages)
      .innerJoin(users, eq(privateMessages.senderId, users.id))
      .leftJoin(
        sql`${privateMessages} reply`,
        sql`reply.id = ${privateMessages.replyToId}`
      )
      .leftJoin(
        sql`${users} reply_sender`,
        sql`reply_sender.id = reply.sender_id`
      )
      .leftJoin(messageReactions, eq(privateMessages.id, messageReactions.messageId))
      .leftJoin(sql`${users} ru`, sql`ru.id = ${messageReactions.userId}`)
      .leftJoin(messageReadReceipts, eq(privateMessages.id, messageReadReceipts.messageId))
      .where(and(...conditions))
      .groupBy(
        privateMessages.id,
        users.id,
        sql`reply.id`,
        sql`reply.content`,
        sql`reply.type`,
        sql`reply.sender_id`,
        sql`reply_sender.username`
      )
      .orderBy(desc(privateMessages.createdAt))
      .limit(limit);

    return messages.reverse(); // عكس الترتيب للحصول على الأحدث في الأسفل
  }

  // ==================== حالة القراءة والكتابة ====================

  /**
   * تحديد الرسائل كمقروءة
   */
  async markMessagesAsRead(conversationId: number, userId: number, messageIds: number[]) {
    if (!messageIds.length) return;

    // إضافة سجلات القراءة
    const receipts = messageIds.map(messageId => ({
      messageId,
      userId
    }));

    await this.db
      .insert(messageReadReceipts)
      .values(receipts)
      .onConflictDoNothing();

    // تحديث آخر رسالة مقروءة للمشارك
    const lastMessageId = Math.max(...messageIds);
    await this.db
      .update(conversationParticipants)
      .set({
        lastReadMessageId: lastMessageId,
        lastReadAt: new Date()
      })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );

    // تحديث حالة التسليم للرسائل
    await this.db
      .update(privateMessages)
      .set({
        status: 'read',
        deliveredAt: sql`COALESCE(${privateMessages.deliveredAt}, NOW())`
      })
      .where(
        and(
          inArray(privateMessages.id, messageIds),
          eq(privateMessages.status, 'delivered')
        )
      );
  }

  /**
   * تحديث حالة الكتابة
   */
  async updateTypingStatus(conversationId: number, userId: number, isTyping: boolean) {
    if (isTyping) {
      const expiresAt = new Date(Date.now() + 10000); // 10 ثواني
      await this.db
        .insert(typingIndicators)
        .values({
          conversationId,
          userId,
          expiresAt
        })
        .onConflictDoUpdate({
          target: [typingIndicators.conversationId, typingIndicators.userId],
          set: {
            startedAt: new Date(),
            expiresAt
          }
        });
    } else {
      await this.db
        .delete(typingIndicators)
        .where(
          and(
            eq(typingIndicators.conversationId, conversationId),
            eq(typingIndicators.userId, userId)
          )
        );
    }
  }

  /**
   * الحصول على المستخدمين الذين يكتبون حالياً
   */
  async getTypingUsers(conversationId: number) {
    const now = new Date();
    const typingUsers = await this.db
      .select({
        user: {
          id: users.id,
          username: users.username,
          profileImage: users.profileImage
        }
      })
      .from(typingIndicators)
      .innerJoin(users, eq(typingIndicators.userId, users.id))
      .where(
        and(
          eq(typingIndicators.conversationId, conversationId),
          gte(typingIndicators.expiresAt, now)
        )
      );

    return typingUsers.map(t => t.user);
  }

  // ==================== المسودات ====================

  /**
   * حفظ مسودة رسالة
   */
  async saveDraft(conversationId: number, userId: number, content: string, replyToId?: number) {
    await this.db
      .insert(messageDrafts)
      .values({
        conversationId,
        userId,
        content,
        replyToId
      })
      .onConflictDoUpdate({
        target: [messageDrafts.conversationId, messageDrafts.userId],
        set: {
          content,
          replyToId,
          updatedAt: new Date()
        }
      });
  }

  /**
   * الحصول على مسودة
   */
  async getDraft(conversationId: number, userId: number) {
    const [draft] = await this.db
      .select()
      .from(messageDrafts)
      .where(
        and(
          eq(messageDrafts.conversationId, conversationId),
          eq(messageDrafts.userId, userId)
        )
      )
      .limit(1);

    return draft;
  }

  // ==================== التفاعلات ====================

  /**
   * إضافة أو إزالة تفاعل
   */
  async toggleReaction(messageId: number, userId: number, reaction: string) {
    const existing = await this.db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, userId),
          eq(messageReactions.reaction, reaction)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // إزالة التفاعل
      await this.db
        .delete(messageReactions)
        .where(
          and(
            eq(messageReactions.messageId, messageId),
            eq(messageReactions.userId, userId),
            eq(messageReactions.reaction, reaction)
          )
        );
      return { action: 'removed' };
    } else {
      // إضافة التفاعل
      await this.db
        .insert(messageReactions)
        .values({
          messageId,
          userId,
          reaction
        });
      return { action: 'added' };
    }
  }

  // ==================== إدارة المحادثات ====================

  /**
   * تثبيت/إلغاء تثبيت محادثة
   */
  async togglePinConversation(conversationId: number, userId: number) {
    const [participant] = await this.db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .limit(1);

    if (!participant) {
      throw new Error('المحادثة غير موجودة');
    }

    await this.db
      .update(conversationParticipants)
      .set({
        isPinned: !participant.isPinned,
        pinnedAt: !participant.isPinned ? new Date() : null
      })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );

    return { isPinned: !participant.isPinned };
  }

  /**
   * كتم/إلغاء كتم محادثة
   */
  async toggleMuteConversation(conversationId: number, userId: number, muteDurationHours?: number) {
    const [participant] = await this.db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .limit(1);

    if (!participant) {
      throw new Error('المحادثة غير موجودة');
    }

    const mutedUntil = muteDurationHours
      ? new Date(Date.now() + muteDurationHours * 60 * 60 * 1000)
      : null;

    await this.db
      .update(conversationParticipants)
      .set({
        isMuted: !participant.isMuted,
        mutedUntil: !participant.isMuted ? mutedUntil : null
      })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );

    return { isMuted: !participant.isMuted, mutedUntil };
  }

  /**
   * أرشفة/إلغاء أرشفة محادثة
   */
  async toggleArchiveConversation(conversationId: number, userId: number) {
    const [participant] = await this.db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .limit(1);

    if (!participant) {
      throw new Error('المحادثة غير موجودة');
    }

    await this.db
      .update(conversationParticipants)
      .set({
        isArchived: !participant.isArchived,
        archivedAt: !participant.isArchived ? new Date() : null
      })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );

    return { isArchived: !participant.isArchived };
  }

  /**
   * حذف رسالة
   */
  async deleteMessage(messageId: number, userId: number, deleteForEveryone = false) {
    const [message] = await this.db
      .select()
      .from(privateMessages)
      .where(eq(privateMessages.id, messageId))
      .limit(1);

    if (!message) {
      throw new Error('الرسالة غير موجودة');
    }

    if (deleteForEveryone) {
      // يمكن للمرسل فقط حذف الرسالة للجميع
      if (message.senderId !== userId) {
        throw new Error('يمكن للمرسل فقط حذف الرسالة للجميع');
      }

      // التحقق من مدة الرسالة (24 ساعة مثلاً)
      const messageAge = Date.now() - new Date(message.createdAt).getTime();
      const maxDeleteTime = 24 * 60 * 60 * 1000; // 24 ساعة

      if (messageAge > maxDeleteTime) {
        throw new Error('لا يمكن حذف الرسائل القديمة للجميع');
      }

      await this.db
        .update(privateMessages)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          content: null,
          attachments: []
        })
        .where(eq(privateMessages.id, messageId));
    } else {
      // حذف للمستخدم الحالي فقط
      const deletedFor = [...(message.deletedFor as number[] || []), userId];
      
      await this.db
        .update(privateMessages)
        .set({
          deletedFor
        })
        .where(eq(privateMessages.id, messageId));
    }
  }

  /**
   * تعديل رسالة
   */
  async editMessage(messageId: number, userId: number, newContent: string) {
    const [message] = await this.db
      .select()
      .from(privateMessages)
      .where(eq(privateMessages.id, messageId))
      .limit(1);

    if (!message) {
      throw new Error('الرسالة غير موجودة');
    }

    if (message.senderId !== userId) {
      throw new Error('يمكنك تعديل رسائلك فقط');
    }

    // التحقق من نوع الرسالة
    if (message.type !== 'text') {
      throw new Error('يمكن تعديل الرسائل النصية فقط');
    }

    // حفظ التعديل السابق
    const editHistory = [
      ...(message.editHistory as any[] || []),
      {
        content: message.content,
        editedAt: new Date()
      }
    ];

    await this.db
      .update(privateMessages)
      .set({
        content: newContent,
        isEdited: true,
        editedAt: new Date(),
        editHistory
      })
      .where(eq(privateMessages.id, messageId));
  }

  /**
   * البحث في الرسائل
   */
  async searchMessages(userId: number, query: string, options?: {
    conversationId?: number;
    limit?: number;
    offset?: number;
  }) {
    const { conversationId, limit = 20, offset = 0 } = options || {};

    let conditions = [
      sql`${privateMessages.content} ILIKE ${`%${query}%`}`,
      eq(privateMessages.isDeleted, false),
      sql`NOT (${privateMessages.deletedFor}::jsonb ? ${userId.toString()})`
    ];

    if (conversationId) {
      conditions.push(eq(privateMessages.conversationId, conversationId));
    }

    // الحصول على المحادثات التي يشارك فيها المستخدم
    const userConversations = await this.db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    const conversationIds = userConversations.map(c => c.conversationId);

    if (!conversationId && conversationIds.length > 0) {
      conditions.push(inArray(privateMessages.conversationId, conversationIds));
    }

    const results = await this.db
      .select({
        message: privateMessages,
        conversation: conversations,
        sender: {
          id: users.id,
          username: users.username,
          profileImage: users.profileImage
        }
      })
      .from(privateMessages)
      .innerJoin(conversations, eq(privateMessages.conversationId, conversations.id))
      .innerJoin(users, eq(privateMessages.senderId, users.id))
      .where(and(...conditions))
      .orderBy(desc(privateMessages.createdAt))
      .limit(limit)
      .offset(offset);

    return results;
  }

  /**
   * تنظيف الرسائل المنتهية الصلاحية
   */
  async cleanupExpiredMessages() {
    const now = new Date();
    
    await this.db
      .update(privateMessages)
      .set({
        isDeleted: true,
        deletedAt: now,
        content: null,
        attachments: []
      })
      .where(
        and(
          lte(privateMessages.expiresAt, now),
          eq(privateMessages.isDeleted, false)
        )
      );
  }

  /**
   * تنظيف مؤشرات الكتابة المنتهية
   */
  async cleanupExpiredTypingIndicators() {
    const now = new Date();
    
    await this.db
      .delete(typingIndicators)
      .where(lte(typingIndicators.expiresAt, now));
  }

  /**
   * إنشاء مكالمة
   */
  async createCall(conversationId: number, callerId: number, type: 'voice' | 'video') {
    const [call] = await this.db
      .insert(callLogs)
      .values({
        conversationId,
        callerId,
        type,
        status: 'initiated',
        participants: [callerId]
      })
      .returning();

    return call;
  }

  /**
   * تحديث حالة المكالمة
   */
  async updateCallStatus(callId: number, status: string, participantId?: number) {
    const [call] = await this.db
      .select()
      .from(callLogs)
      .where(eq(callLogs.id, callId))
      .limit(1);

    if (!call) {
      throw new Error('المكالمة غير موجودة');
    }

    const updates: any = { status };

    if (status === 'answered' && !call.answeredAt) {
      updates.answeredAt = new Date();
      if (participantId && !call.participants.includes(participantId)) {
        updates.participants = [...call.participants, participantId];
      }
    } else if (status === 'ended' && !call.endedAt) {
      updates.endedAt = new Date();
      if (call.answeredAt) {
        const duration = Math.floor((new Date().getTime() - new Date(call.answeredAt).getTime()) / 1000);
        updates.duration = duration;
      }
    }

    await this.db
      .update(callLogs)
      .set(updates)
      .where(eq(callLogs.id, callId));
  }
}