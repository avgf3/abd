import { storage } from '../storage';
import { db, dbType } from '../database-adapter';

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
}

export interface MessagePagination {
  messages: RoomMessage[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
}

class RoomMessageService {
  private messageCache = new Map<string, RoomMessage[]>(); // roomId -> messages
  private readonly MAX_CACHE_SIZE = 100; // رسائل لكل غرفة
  private readonly MAX_CACHE_ROOMS = 50; // عدد الغرف المحفوظة في الذاكرة

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

      // التحقق من وجود المرسل
      const sender = await storage.getUser(messageData.senderId);
      if (!sender) {
        throw new Error('المرسل غير موجود');
      }

      // التحقق من حالة المنع قبل الإرسال
      if (!messageData.isPrivate) {
        if (sender.isBanned) {
          throw new Error('أنت مطرود ولا يمكنك إرسال رسائل عامة');
        }
        if (sender.isMuted) {
          throw new Error('أنت مكتوم ولا يمكنك إرسال رسائل عامة');
        }
      }

      // إنشاء الرسالة في قاعدة البيانات
      const message = await storage.createMessage({
        senderId: messageData.senderId,
        content: messageData.content.trim(),
        messageType: messageData.messageType || 'text',
        isPrivate: messageData.isPrivate || false,
        receiverId: messageData.receiverId || null,
        roomId: messageData.roomId
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
        sender
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
      const safeLimit = Math.min(20, Math.max(1, Number(limit) || 20));
      const safeOffset = Math.max(0, Number(offset) || 0);

      // محاولة الحصول على الرسائل من الذاكرة المؤقتة أولاً
      if (useCache && safeOffset === 0 && this.messageCache.has(roomId)) {
        const cachedMessages = this.messageCache.get(roomId)!;
        const slicedMessages = cachedMessages.slice(0, safeLimit);
        
        return {
          messages: slicedMessages,
          totalCount: cachedMessages.length,
          hasMore: cachedMessages.length > safeLimit,
          nextOffset: slicedMessages.length
        };
      }

      if (!db || dbType === 'disabled') {
        return {
          messages: [],
          totalCount: 0,
          hasMore: false
        };
      }

      // جلب الرسائل من قاعدة البيانات
      const dbMessages = await storage.getRoomMessages(roomId, safeLimit, safeOffset);
      const totalCount = await storage.getRoomMessageCount(roomId);

      // Batch fetch senders to avoid N+1
      const uniqueSenderIds = Array.from(new Set((dbMessages || []).map((m: any) => m.senderId).filter(Boolean)));
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
            senderUsername: sender?.username || 'مستخدم محذوف',
            senderUserType: sender?.userType || 'user',
            senderAvatar: (sender as any)?.profileImage || null,
            sender
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
        hasMore: (safeOffset + messages.length) < totalCount,
        nextOffset: safeOffset + messages.length
      };

    } catch (error) {
      console.error(`خطأ في جلب رسائل الغرفة ${roomId}:`, error);
      return {
        messages: [],
        totalCount: 0,
        hasMore: false
      };
    }
  }

  /**
   * جلب رسائل الغرفة الأحدث فقط
   */
  async getLatestRoomMessages(roomId: string, limit: number = 20): Promise<RoomMessage[]> {
    try {
      const result = await this.getRoomMessages(roomId, Math.min(20, Math.max(1, Number(limit) || 20)), 0, true);
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
          hasMore: false
        };
      }

      if (!db || dbType === 'disabled') {
        return {
          messages: [],
          totalCount: 0,
          hasMore: false
        };
      }

      // البحث في قاعدة البيانات
      const results = await storage.searchRoomMessages(roomId, searchQuery, limit, offset);
      const totalCount = await storage.countSearchRoomMessages(roomId, searchQuery);

      // Batch fetch senders
      const uniqueSenderIds = Array.from(new Set((results || []).map((m: any) => m.senderId).filter(Boolean)));
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
            senderUsername: sender?.username || 'مستخدم محذوف',
            senderUserType: sender?.userType || 'user',
            senderAvatar: (sender as any)?.profileImage || null,
            sender
          };
          messages.push(roomMessage);
        } catch (err) {
          console.warn(`تعذر معالجة نتيجة البحث ${msg.id}:`, err);
        }
      }

      return {
        messages,
        totalCount,
        hasMore: (offset + messages.length) < totalCount,
        nextOffset: offset + messages.length
      };

    } catch (error) {
      console.error(`خطأ في البحث في رسائل الغرفة ${roomId}:`, error);
      return {
        messages: [],
        totalCount: 0,
        hasMore: false
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
          activeUsers: 0
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
        lastMessageTime
      };

    } catch (error) {
      console.error(`خطأ في جلب إحصائيات الغرفة ${roomId}:`, error);
      return {
        totalMessages: 0,
        messagesLast24h: 0,
        activeUsers: 0
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
        const index = messages.findIndex(msg => msg.id === messageId);
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
  private clearCache(roomId: string): void {
    this.messageCache.delete(roomId);
  }

  /**
   * إدارة حجم الذاكرة المؤقتة
   */
  private manageCacheSize(): void {
    if (this.messageCache.size > this.MAX_CACHE_ROOMS) {
      // حذف أقدم الغرف المحفوظة (LRU)
      const roomsToDelete = Array.from(this.messageCache.keys()).slice(this.MAX_CACHE_ROOMS);
      roomsToDelete.forEach(roomId => this.messageCache.delete(roomId));
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
      cacheHitRatio: 0 // يمكن تطويره لاحقاً لحساب نسبة الإصابة
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