import { db, dbType } from '../database-adapter';
import { storage } from '../storage';
import { moderationSystem } from '../moderation';
import { spamProtection } from '../spam-protection';
import { friendService } from './friendService';
import { databaseService } from './databaseService';

export interface PrivateMessage {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  messageType: string;
  timestamp: Date;
  isPrivate: boolean;
  sender?: any;
  attachments?: any;
  textColor?: string;
  bold?: boolean;
}

export interface PrivateMessagePagination {
  messages: PrivateMessage[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
}

class PrivateMessageService {
  private messageCache = new Map<string, { messages: PrivateMessage[]; timestamp: number; lastAccess: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_CACHE_ENTRIES = 500;

  /**
   * إرسال رسالة خاصة محسنة
   */
  async sendPrivateMessage(messageData: {
    senderId: number;
    receiverId: number;
    content: string;
    messageType?: string;
    textColor?: string;
    bold?: boolean;
  }): Promise<PrivateMessage | null> {
    try {
      if (!db || dbType === 'disabled') {
        throw new Error('قاعدة البيانات غير متوفرة');
      }

      // التحقق من صحة البيانات
      if (!messageData.content?.trim()) {
        throw new Error('محتوى الرسالة مطلوب');
      }

      if (messageData.senderId === messageData.receiverId) {
        throw new Error('لا يمكن إرسال رسالة لنفسك');
      }

      // التحقق من وجود المرسل والمستلم
      const [sender, receiver] = await Promise.all([
        storage.getUser(messageData.senderId),
        storage.getUser(messageData.receiverId),
      ]);

      if (!sender) {
        throw new Error('المرسل غير موجود');
      }
      if (!receiver) {
        throw new Error('المستلم غير موجود');
      }

      // فرض إعدادات خصوصية المستلم
      const dmPrivacy = ((receiver as any).dmPrivacy || 'all') as string;
      if (dmPrivacy === 'none') {
        throw new Error('هذا المستخدم أغلق الرسائل الخاصة');
      }
      if (dmPrivacy === 'friends') {
        const friendship = await friendService.getFriendship(
          messageData.senderId,
          messageData.receiverId
        );
        if (!friendship || (friendship as any).status !== 'accepted') {
          throw new Error('الرسائل الخاصة مسموحة للأصدقاء فقط');
        }
      }

      // التحقق من حالة المنع
      const status = await moderationSystem.checkUserStatus(messageData.senderId);
      if (!status.canChat) {
        throw new Error(status.reason || 'غير مسموح بإرسال الرسائل حالياً');
      }

      // فحص السبام/التكرار
      const check = spamProtection.checkMessage(messageData.senderId, messageData.content);
      if (!check.isAllowed) {
        if (check.action === 'tempBan') {
          await storage.updateUser(messageData.senderId, {
            isMuted: true as any,
            muteExpiry: new Date(Date.now() + 60 * 1000) as any,
          });
        }
        throw new Error(check.reason || 'تم منع الرسالة بسبب التكرار/السبام');
      }

      // إنشاء الرسالة
      const message = await storage.createMessage({
        senderId: messageData.senderId,
        receiverId: messageData.receiverId,
        content: messageData.content.trim(),
        messageType: messageData.messageType || 'text',
        isPrivate: true,
        textColor: messageData.textColor,
        bold: messageData.bold,
        attachments: this.generateAttachments(sender),
      });

      if (!message) {
        throw new Error('فشل في إنشاء الرسالة');
      }

      // تحويل للتنسيق المطلوب
      const privateMessage: PrivateMessage = {
        id: message.id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        messageType: message.messageType,
        timestamp: new Date(message.timestamp),
        isPrivate: true,
        sender,
        attachments: (message as any)?.attachments || [],
        textColor: (message as any)?.textColor,
        bold: (message as any)?.bold,
      };

      // تحديث الكاش
      this.updateCacheAfterSend(messageData.senderId, messageData.receiverId, privateMessage);

      // تحديث مؤشر القراءة للمرسل
      await databaseService.upsertConversationRead(
        messageData.senderId,
        messageData.receiverId,
        new Date(privateMessage.timestamp),
        privateMessage.id
      );

      return privateMessage;
    } catch (error) {
      console.error('خطأ في إرسال الرسالة الخاصة:', error);
      throw error;
    }
  }

  /**
   * جلب رسائل المحادثة الخاصة محسن
   */
  async getPrivateMessages(
    userId: number,
    otherUserId: number,
    limit: number = 50,
    beforeTs?: Date,
    beforeId?: number
  ): Promise<PrivateMessagePagination> {
    try {
      if (!userId || !otherUserId || userId === otherUserId) {
        throw new Error('معرّفات المستخدمين غير صالحة');
      }

      const safeLimit = Math.min(100, Math.max(1, limit));
      const conversationKey = `${Math.min(userId, otherUserId)}-${Math.max(userId, otherUserId)}`;
      
      // محاولة الحصول من الكاش أولاً
      const cachedData = this.messageCache.get(conversationKey);
      if (cachedData && !beforeTs && !beforeId) {
        cachedData.lastAccess = Date.now();
        const messages = cachedData.messages.slice(-safeLimit);
        return {
          messages,
          totalCount: cachedData.messages.length,
          hasMore: cachedData.messages.length > safeLimit,
        };
      }

      if (!db || dbType === 'disabled') {
        return {
          messages: [],
          totalCount: 0,
          hasMore: false,
        };
      }

      // جلب من قاعدة البيانات
      let dbMessages: any[];
      if (beforeTs || beforeId) {
        dbMessages = await storage.getPrivateMessagesBefore(
          userId,
          otherUserId,
          safeLimit + 1,
          beforeTs,
          beforeId
        );
      } else {
        dbMessages = await storage.getPrivateMessages(userId, otherUserId, safeLimit + 1);
      }

      // إثراء الرسائل بمعلومات المرسل
      const uniqueSenderIds = Array.from(
        new Set((dbMessages || []).map((m: any) => m.senderId).filter(Boolean))
      );
      const senders = await storage.getUsersByIds(uniqueSenderIds as number[]);
      const senderMap = new Map<number, any>((senders || []).map((u: any) => [u.id, u]));

      const messages: PrivateMessage[] = (dbMessages || []).map((msg: any) => ({
        id: msg.id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        messageType: msg.messageType || 'text',
        timestamp: new Date(msg.timestamp),
        isPrivate: true,
        sender: senderMap.get(msg.senderId),
        attachments: (msg as any)?.attachments || [],
        textColor: (msg as any)?.textColor,
        bold: (msg as any)?.bold,
      }));

      const hasMore = messages.length > safeLimit;
      const finalMessages = hasMore ? messages.slice(0, safeLimit) : messages;

      // تحديث الكاش للرسائل الحديثة فقط
      if (!beforeTs && !beforeId) {
        this.messageCache.set(conversationKey, {
          messages: finalMessages,
          timestamp: Date.now(),
          lastAccess: Date.now(),
        });
        this.cleanOldCache();
      }

      return {
        messages: finalMessages,
        totalCount: finalMessages.length,
        hasMore,
      };
    } catch (error) {
      console.error('خطأ في جلب الرسائل الخاصة:', error);
      return {
        messages: [],
        totalCount: 0,
        hasMore: false,
      };
    }
  }

  /**
   * جلب قائمة المحادثات محسن
   */
  async getConversations(userId: number, limit: number = 50): Promise<any[]> {
    try {
      if (!userId || !db || dbType === 'disabled') {
        return [];
      }

      const safeLimit = Math.min(100, Math.max(1, limit));

      if (dbType === 'postgresql') {
        const sql = `
          WITH pm AS (
            SELECT id, sender_id, receiver_id, content, message_type, is_private, "timestamp"
            FROM messages
            WHERE is_private = TRUE AND (sender_id = $1 OR receiver_id = $1)
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
                   WHEN l.receiver_id = $1 THEN l.sender_id 
                   ELSE l.receiver_id 
                 END AS other_user_id,
                 COALESCE(
                   (
                     SELECT COUNT(*)::int FROM messages m
                     LEFT JOIN conversation_reads cr
                       ON cr.user_id = $1 AND cr.other_user_id = (
                         CASE WHEN l.receiver_id = $1 THEN l.sender_id ELSE l.receiver_id END
                       )
                     WHERE m.is_private = TRUE
                       AND ((m.sender_id = $1 AND m.receiver_id = (
                              CASE WHEN l.receiver_id = $1 THEN l.sender_id ELSE l.receiver_id END
                            ))
                            OR (m.receiver_id = $1 AND m.sender_id = (
                              CASE WHEN l.receiver_id = $1 THEN l.sender_id ELSE l.receiver_id END
                            )))
                       AND m.receiver_id = $1
                       AND (cr.last_read_at IS NULL OR m."timestamp" > cr.last_read_at)
                   ), 0) AS unread_count
          FROM latest l
          ORDER BY "timestamp" DESC
          LIMIT $2;
        `;
        
        const result: any = await (db as any).execute(sql, [userId, safeLimit]);
        const rows = (result?.rows ?? result ?? []) as any[];

        // جلب بيانات المستخدمين الآخرين
        const otherUserIds = Array.from(
          new Set(rows.map((r) => r.other_user_id).filter(Boolean))
        );
        const users = await storage.getUsersByIds(otherUserIds as number[]);
        const userMap = new Map<number, any>((users || []).map((u: any) => [u.id, u]));

        return rows.map((r) => ({
          otherUserId: r.other_user_id,
          otherUser: userMap.get(r.other_user_id) || null,
          lastMessage: {
            id: r.id,
            content: r.content,
            messageType: r.message_type,
            timestamp: r.timestamp,
          },
          unreadCount: Number(r.unread_count || 0),
        }));
      }

      return [];
    } catch (error) {
      console.error('خطأ في جلب المحادثات:', error);
      return [];
    }
  }

  /**
   * تحديث مؤشر القراءة
   */
  async updateReadStatus(
    userId: number,
    otherUserId: number,
    lastReadAt?: Date,
    lastReadMessageId?: number
  ): Promise<boolean> {
    try {
      const readAt = lastReadAt || new Date();
      return await databaseService.upsertConversationRead(
        userId,
        otherUserId,
        readAt,
        lastReadMessageId
      );
    } catch (error) {
      console.error('خطأ في تحديث مؤشر القراءة:', error);
      return false;
    }
  }

  /**
   * تحديث الكاش بعد إرسال رسالة
   */
  private updateCacheAfterSend(senderId: number, receiverId: number, message: PrivateMessage): void {
    const conversationKey = `${Math.min(senderId, receiverId)}-${Math.max(senderId, receiverId)}`;
    const cached = this.messageCache.get(conversationKey);
    
    if (cached) {
      cached.messages.push(message);
      cached.timestamp = Date.now();
      cached.lastAccess = Date.now();
      
      // الحد من حجم الكاش
      if (cached.messages.length > 100) {
        cached.messages = cached.messages.slice(-100);
      }
    }
  }

  /**
   * توليد المرفقات
   */
  private generateAttachments(sender: any): any[] {
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
  }

  /**
   * تنظيف الكاش القديم
   */
  private cleanOldCache(): void {
    const now = Date.now();
    
    // إزالة الإدخالات المنتهية الصلاحية
    for (const [key, value] of this.messageCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.messageCache.delete(key);
      }
    }
    
    // إذا تجاوز الحد الأقصى، احذف الأقل استخداماً (LRU)
    if (this.messageCache.size > this.MAX_CACHE_ENTRIES) {
      const entries = Array.from(this.messageCache.entries());
      entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
      
      const toDelete = entries.slice(0, entries.length - this.MAX_CACHE_ENTRIES + 50);
      toDelete.forEach(([key]) => this.messageCache.delete(key));
    }
  }

  /**
   * مسح الكاش
   */
  clearCache(): void {
    this.messageCache.clear();
  }

  /**
   * إحصائيات الكاش
   */
  getCacheStats(): {
    cachedConversations: number;
    totalCachedMessages: number;
  } {
    let totalMessages = 0;
    for (const cache of this.messageCache.values()) {
      totalMessages += cache.messages.length;
    }
    
    return {
      cachedConversations: this.messageCache.size,
      totalCachedMessages: totalMessages,
    };
  }
}

// تصدير instance واحد
export const privateMessageService = new PrivateMessageService();