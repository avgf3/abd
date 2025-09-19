import { db, dbType } from '../database-adapter';
import { storage } from '../storage';
import { moderationSystem } from '../moderation';
import { spamProtection } from '../spam-protection';

// دالة إعادة المحاولة لجلب بيانات المستخدم
async function getUserWithRetry(userId: number, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const user = await storage.getUser(userId);
      if (user && user.username) {
        return user;
      }
      
      // إذا لم نجد المستخدم، نحاول مرة أخرى بعد انتظار قصير
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      }
    } catch (error) {
      console.error(`محاولة ${attempt} فشلت لجلب المستخدم ${userId}:`, error);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      }
    }
  }
  
  // إذا فشلت جميع المحاولات، نعيد null بدلاً من fallback مزعج
  console.error(`فشل في جلب بيانات المستخدم ${userId} بعد ${maxRetries} محاولات`);
  return null;
}

export interface RoomMessage {
  id: number;
  senderId: number;
  roomId: string;
  content: string;
  messageType: string;
  timestamp: Date;
  isPrivate: boolean;
  receiverId?: number | null;
  senderUsername?: string;
  senderUserType?: string;
  senderAvatar?: string;
  sender?: any;
  attachments?: any;
}

export interface MessagePagination {
  messages: RoomMessage[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
}

class RoomMessageService {
  private messageCache = new Map<string, RoomMessage[]>(); // roomId -> messages
  private readonly MAX_CACHE_SIZE = 10000; // إزالة الحد الأقصى تماماً
  private readonly MAX_CACHE_ROOMS = 1000; // إزالة الحد الأقصى تماماً
  // إزالة قيود الاتصال المتزامن
  private roomFetchLocks = new Map<string, Promise<MessagePagination>>();

  /**
   * إرسال رسالة لغرفة
   */
  async sendMessage(messageData: {
    senderId: number;
    roomId: string;
    content: string;
    messageType?: string;
    isPrivate?: boolean;
    receiverId?: number;
  }): Promise<RoomMessage | null> {
    try {
      if (!db || dbType === 'disabled') {
        throw new Error('قاعدة البيانات غير متوفرة');
      }

      // التحقق من صحة البيانات
      if (!messageData.content?.trim()) {
        throw new Error('محتوى الرسالة مطلوب');
      }

      if (!messageData.roomId?.trim()) {
        throw new Error('معرف الغرفة مطلوب');
      }

      // السماح المطلق لرسائل النظام بدون أي قيود (قفل الدردشة/الموديريشن/السبام)
      const isSystemMessage = (messageData.messageType || '').toLowerCase() === 'system';

      // التحقق من وجود المرسل
      const sender = await storage.getUser(messageData.senderId);
      if (!sender) {
        throw new Error('المرسل غير موجود');
      }

      // التحقق من إعدادات قفل الدردشة في الغرفة (تخطَّ للمحتوى النظامي)
      const room = await storage.getRoom(messageData.roomId);
      if (room && !isSystemMessage) {
        const isOwner = sender.userType === 'owner';
        const isGuest = sender.userType === 'guest';
        
        // إذا كان قفل الدردشة الكامل مفعل - السماح للمالك فقط
        if (room.chatLockAll && !isOwner) {
          throw new Error('الدردشة مقفلة من قبل المالك - غير مسموح بإرسال الرسائل');
        }
        
        // إذا كان قفل الدردشة للزوار مفعل - منع الضيوف فقط
        if (room.chatLockVisitors && isGuest && !isOwner) {
          throw new Error('الدردشة مقفلة للزوار - يجب التسجيل لإرسال الرسائل');
        }
      }

      // التحقق من حالة المنع قبل الإرسال (يشمل كتم/طرد/حجب) - يُستثنى النظام
      if (!messageData.isPrivate && !isSystemMessage) {
        try {
          const status = await moderationSystem.checkUserStatus(messageData.senderId);
          if (!status.canChat) {
            throw new Error(status.reason || 'غير مسموح بإرسال الرسائل حالياً');
          }
        } catch {}
      }

      // فحص السبام/التكرار قبل الإنشاء - يُستثنى النظام
      if (!isSystemMessage) {
        const check = spamProtection.checkMessage(messageData.senderId, messageData.content);
        if (!check.isAllowed) {
          try {
            if (check.action === 'tempBan') {
              await storage.updateUser(messageData.senderId, {
                isMuted: true as any,
                muteExpiry: new Date(Date.now() + 60 * 1000) as any,
              });
            }
          } catch {}
          throw new Error(check.reason || 'تم منع الرسالة بسبب التكرار/السبام');
        }
      }

      // إنشاء الرسالة في قاعدة البيانات
      const message = await storage.createMessage({
        senderId: messageData.senderId,
        content: messageData.content.trim(),
        messageType: messageData.messageType || 'text',
        isPrivate: messageData.isPrivate || false,
        receiverId: messageData.receiverId || null,
        roomId: messageData.roomId,
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
                {
                  type: 'senderAvatar',
                  url: baseUrl,
                  hash: finalHash,
                },
              ];
            }
          } catch {}
          return [];
        })(),
      });

      if (!message) {
        throw new Error('فشل في إنشاء الرسالة');
      }

      // تحويل الرسالة للتنسيق المطلوب
      const roomMessage: RoomMessage = {
        id: message.id,
        senderId: message.senderId,
        roomId: messageData.roomId,
        content: message.content,
        messageType: message.messageType,
        timestamp: new Date(message.timestamp),
        isPrivate: message.isPrivate,
        receiverId: message.receiverId,
        senderUsername: sender.username,
        senderUserType: sender.userType,
        senderAvatar: (sender as any).profileImage || null,
        sender,
        attachments: (message as any)?.attachments || [],
      };

      // إضافة الرسالة للذاكرة المؤقتة
      this.addToCache(messageData.roomId, roomMessage);

      return roomMessage;
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      throw error;
    }
  }

  /**
   * جلب رسائل الغرفة مع الصفحات
   */
  async getRoomMessages(
    roomId: string,
    limit: number = 20,
    offset: number = 0,
    useCache: boolean = true
  ): Promise<MessagePagination> {
    try {
      if (!roomId?.trim()) {
        throw new Error('معرف الغرفة مطلوب');
      }

      // ضبط الحد الأقصى إلى 20 لتفادي التحميل الزائد
      const safeLimit = limit ? Math.max(1, Number(limit)) : undefined; // إزالة الحد الأقصى تماماً
      const safeOffset = Math.max(0, Number(offset) || 0);

      // محاولة الحصول على الرسائل من الذاكرة المؤقتة أولاً
      if (useCache && safeOffset === 0 && this.messageCache.has(roomId)) {
        const cachedMessages = this.messageCache.get(roomId)!;
        const slicedMessages = cachedMessages.slice(0, safeLimit);

        return {
          messages: slicedMessages,
          totalCount: cachedMessages.length,
          hasMore: cachedMessages.length > safeLimit,
          nextOffset: slicedMessages.length,
        };
      }

      if (!db || dbType === 'disabled') {
        return {
          messages: [],
          totalCount: 0,
          hasMore: false,
        };
      }

      // Serialize DB fetches per room when offset=0 to avoid stampede
      const doFetch = async (): Promise<MessagePagination> => {
        // استخدام الاستعلام المحسن إذا كان متاحاً
        try {
          const { getOptimizedRoomMessages } = await import('../utils/query-optimizer');
          const result = await getOptimizedRoomMessages(roomId, safeLimit, safeOffset);
          
          if (result.messages.length > 0) {
            // تحويل النتائج إلى التنسيق المطلوب
            const messages: RoomMessage[] = result.messages.map(msg => ({
              id: msg.id,
              senderId: msg.senderId,
              roomId: msg.roomId,
              content: msg.content,
              messageType: msg.messageType || 'text',
              timestamp: new Date(msg.timestamp),
              isPrivate: msg.isPrivate || false,
              receiverId: msg.receiverId || null,
              senderUsername: msg.sender?.username || (await getUserWithRetry(msg.senderId))?.username || null,
              senderUserType: msg.sender?.userType || 'user',
              senderAvatar: msg.sender?.profileImage || null,
              sender: msg.sender,
              attachments: msg.attachments || [],
            }));

            return {
              messages,
              totalCount: result.total,
              hasMore: result.hasMore,
              nextOffset: safeOffset + messages.length,
            };
          }
        } catch (error) {
          console.warn('فشل استخدام الاستعلام المحسن، استخدام الطريقة التقليدية:', error);
        }

        // الرجوع للطريقة التقليدية في حالة الفشل
        const dbMessages = await storage.getRoomMessages(roomId, safeLimit, safeOffset);
        const totalCount = await storage.getRoomMessageCount(roomId);

        // Batch fetch senders to avoid N+1
        const uniqueSenderIds = Array.from(
          new Set((dbMessages || []).map((m: any) => m.senderId).filter(Boolean))
        );
        const senders = await storage.getUsersByIds(uniqueSenderIds as number[]);
        const senderMap = new Map<number, any>((senders || []).map((u: any) => [u.id, u]));

        // تحويل الرسائل للتنسيق المطلوب
        const messages: RoomMessage[] = [];
        for (const msg of dbMessages) {
          try {
            const sender = senderMap.get(msg.senderId);
            const roomMessage: RoomMessage = {
              id: msg.id,
              senderId: msg.senderId,
              roomId: roomId,
              content: msg.content,
              messageType: msg.messageType || 'text',
              timestamp: new Date(msg.timestamp),
              isPrivate: msg.isPrivate || false,
              receiverId: msg.receiverId || null,
              senderUsername: sender?.username || (await getUserWithRetry(msg.senderId))?.username || null,
              senderUserType: sender?.userType || 'user',
              senderAvatar: (sender as any)?.profileImage || null,
              sender,
              attachments: (msg as any)?.attachments || [],
            };
            messages.push(roomMessage);
          } catch (err) {
            console.warn(`تعذر معالجة الرسالة ${msg.id}:`, err);
          }
        }

        // إضافة الرسائل للذاكرة المؤقتة (إذا كان offset = 0)
        if (safeOffset === 0 && messages.length > 0) {
          this.updateCache(roomId, messages);
        }

        return {
          messages,
          totalCount,
          hasMore: safeOffset + messages.length < totalCount,
          nextOffset: safeOffset + messages.length,
        };
      };

      if (safeOffset === 0) {
        const existing = this.roomFetchLocks.get(roomId);
        if (existing) {
          return existing;
        }
        const promise = doFetch().finally(() => {
          this.roomFetchLocks.delete(roomId);
        });
        this.roomFetchLocks.set(roomId, promise);
        return promise;
      }

      return await doFetch();
    } catch (error) {
      console.error(`خطأ في جلب رسائل الغرفة ${roomId}:`, error);
      return {
        messages: [],
        totalCount: 0,
        hasMore: false,
      };
    }
  }

  /**
   * جلب رسائل الغرفة الأحدث فقط
   */
  async getLatestRoomMessages(roomId: string, limit: number = 20): Promise<RoomMessage[]> {
    try {
      const result = await this.getRoomMessages(
        roomId,
        limit ? Math.max(1, Number(limit)) : undefined, // إزالة الحد الأقصى تماماً
        0,
        true
      );
      return result.messages;
    } catch (error) {
      console.error(`خطأ في جلب أحدث رسائل الغرفة ${roomId}:`, error);
      return [];
    }
  }

  /**
   * حذف رسالة من الغرفة
   */
  async deleteMessage(messageId: number, userId: number, roomId: string): Promise<void> {
    try {
      if (!db || dbType === 'disabled') {
        throw new Error('قاعدة البيانات غير متوفرة');
      }

      // التحقق من وجود الرسالة
      const message = await storage.getMessage(messageId);
      if (!message) {
        throw new Error('الرسالة غير موجودة');
      }

      // التحقق من الصلاحيات
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      const canDelete = message.senderId === userId || ['admin', 'owner'].includes(user.userType);
      if (!canDelete) {
        throw new Error('ليس لديك صلاحية لحذف هذه الرسالة');
      }

      // حذف الرسالة من قاعدة البيانات
      await storage.deleteMessage(messageId);

      // إزالة الرسالة من الذاكرة المؤقتة
      this.removeFromCache(roomId, messageId);
    } catch (error) {
      console.error('خطأ في حذف الرسالة:', error);
      throw error;
    }
  }

  /**
   * البحث في رسائل الغرفة
   */
  async searchRoomMessages(
    roomId: string,
    searchQuery: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<MessagePagination> {
    try {
      if (!roomId?.trim() || !searchQuery?.trim()) {
        return {
          messages: [],
          totalCount: 0,
          hasMore: false,
        };
      }

      if (!db || dbType === 'disabled') {
        return {
          messages: [],
          totalCount: 0,
          hasMore: false,
        };
      }

      // البحث في قاعدة البيانات
      const results = await storage.searchRoomMessages(roomId, searchQuery, limit, offset);
      const totalCount = await storage.countSearchRoomMessages(roomId, searchQuery);

      // Batch fetch senders
      const uniqueSenderIds = Array.from(
        new Set((results || []).map((m: any) => m.senderId).filter(Boolean))
      );
      const senders = await storage.getUsersByIds(uniqueSenderIds as number[]);
      const senderMap = new Map<number, any>((senders || []).map((u: any) => [u.id, u]));

      // تحويل النتائج للتنسيق المطلوب
      const messages: RoomMessage[] = [];
      for (const msg of results) {
        try {
          const sender = senderMap.get(msg.senderId);
          const roomMessage: RoomMessage = {
            id: msg.id,
            senderId: msg.senderId,
            roomId: roomId,
            content: msg.content,
            messageType: msg.messageType || 'text',
            timestamp: new Date(msg.timestamp),
            isPrivate: msg.isPrivate || false,
            receiverId: msg.receiverId || null,
            senderUsername: sender?.username || (await getUserWithRetry(msg.senderId))?.username || null,
            senderUserType: sender?.userType || 'user',
            senderAvatar: (sender as any)?.profileImage || null,
            sender,
            attachments: (msg as any)?.attachments || [],
          };
          messages.push(roomMessage);
        } catch (err) {
          console.warn(`تعذر معالجة نتيجة البحث ${msg.id}:`, err);
        }
      }

      return {
        messages,
        totalCount,
        hasMore: offset + messages.length < totalCount,
        nextOffset: offset + messages.length,
      };
    } catch (error) {
      console.error(`خطأ في البحث في رسائل الغرفة ${roomId}:`, error);
      return {
        messages: [],
        totalCount: 0,
        hasMore: false,
      };
    }
  }

  /**
   * الحصول على إحصائيات رسائل الغرفة
   */
  async getRoomStats(roomId: string): Promise<{
    totalMessages: number;
    messagesLast24h: number;
    activeUsers: number;
    lastMessageTime?: Date;
  }> {
    try {
      if (!db || dbType === 'disabled') {
        return {
          totalMessages: 0,
          messagesLast24h: 0,
          activeUsers: 0,
        };
      }

      const totalMessages = await storage.getRoomMessageCount(roomId);
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const messagesLast24h = await storage.getRoomMessageCountSince(roomId, yesterday);
      const activeUsers = await storage.getRoomActiveUserCount(roomId, yesterday);

      const lastMessage = await storage.getLastRoomMessage(roomId);
      const lastMessageTime = lastMessage ? new Date(lastMessage.timestamp) : undefined;

      return {
        totalMessages,
        messagesLast24h,
        activeUsers,
        lastMessageTime,
      };
    } catch (error) {
      console.error(`خطأ في جلب إحصائيات الغرفة ${roomId}:`, error);
      return {
        totalMessages: 0,
        messagesLast24h: 0,
        activeUsers: 0,
      };
    }
  }

  /**
   * تنظيف الرسائل القديمة
   */
  async cleanupOldMessages(roomId: string, keepLastDays: number = 30): Promise<number> {
    try {
      if (!db || dbType === 'disabled') {
        return 0;
      }

      const cutoffDate = new Date(Date.now() - keepLastDays * 24 * 60 * 60 * 1000);
      const deletedCount = await storage.deleteOldRoomMessages(roomId, cutoffDate);

      // تنظيف الذاكرة المؤقتة أيضاً
      this.clearCache(roomId);

      return deletedCount;
    } catch (error) {
      console.error(`خطأ في تنظيف رسائل الغرفة ${roomId}:`, error);
      return 0;
    }
  }

  // ==================== إدارة الذاكرة المؤقتة ====================

  /**
   * إضافة رسالة للذاكرة المؤقتة
   */
  private addToCache(roomId: string, message: RoomMessage): void {
    try {
      if (!this.messageCache.has(roomId)) {
        this.messageCache.set(roomId, []);
      }

      const messages = this.messageCache.get(roomId)!;
      messages.unshift(message); // إضافة في البداية (الأحدث أولاً)

      // الحد من حجم الذاكرة المؤقتة
      if (messages.length > this.MAX_CACHE_SIZE) {
        messages.splice(this.MAX_CACHE_SIZE);
      }

      // إدارة عدد الغرف المحفوظة
      this.manageCacheSize();
    } catch (error) {
      console.warn(`تعذر إضافة الرسالة للذاكرة المؤقتة للغرفة ${roomId}:`, error);
    }
  }

  /**
   * تحديث الذاكرة المؤقتة
   */
  private updateCache(roomId: string, messages: RoomMessage[]): void {
    try {
      this.messageCache.set(roomId, [...messages]);
      this.manageCacheSize();
    } catch (error) {
      console.warn(`تعذر تحديث الذاكرة المؤقتة للغرفة ${roomId}:`, error);
    }
  }

  /**
   * إزالة رسالة من الذاكرة المؤقتة
   */
  private removeFromCache(roomId: string, messageId: number): void {
    try {
      if (this.messageCache.has(roomId)) {
        const messages = this.messageCache.get(roomId)!;
        const index = messages.findIndex((msg) => msg.id === messageId);
        if (index !== -1) {
          messages.splice(index, 1);
        }
      }
    } catch (error) {
      console.warn(`تعذر إزالة الرسالة من الذاكرة المؤقتة للغرفة ${roomId}:`, error);
    }
  }

  /**
   * مسح ذاكرة الغرفة المؤقتة
   */
  clearCache(roomId: string): void {
    this.messageCache.delete(roomId);
  }

  /**
   * إدارة حجم الذاكرة المؤقتة
   */
  private manageCacheSize(): void {
    if (this.messageCache.size > this.MAX_CACHE_ROOMS) {
      // حذف أقدم الغرف المحفوظة (LRU)
      const roomsToDelete = Array.from(this.messageCache.keys()).slice(this.MAX_CACHE_ROOMS);
      roomsToDelete.forEach((roomId) => this.messageCache.delete(roomId));
    }
  }

  /**
   * الحصول على إحصائيات الذاكرة المؤقتة
   */
  getCacheStats(): {
    cachedRooms: number;
    totalCachedMessages: number;
    cacheHitRatio: number;
  } {
    const cachedRooms = this.messageCache.size;
    let totalCachedMessages = 0;

    for (const messages of this.messageCache.values()) {
      totalCachedMessages += messages.length;
    }

    return {
      cachedRooms,
      totalCachedMessages,
      cacheHitRatio: 0, // يمكن تطويره لاحقاً لحساب نسبة الإصابة
    };
  }

  /**
   * تنظيف الذاكرة المؤقتة بالكامل
   */
  clearAllCache(): void {
    this.messageCache.clear();
  }
}

// تصدير instance واحد
export const roomMessageService = new RoomMessageService();
