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

// LRU Cache Node for proper cache management
interface CacheNode {
  key: string;
  value: RoomMessage[];
  prev?: CacheNode;
  next?: CacheNode;
  lastAccess: number;
}

class LRUCache {
  private capacity: number;
  private cache: Map<string, CacheNode>;
  private head?: CacheNode;
  private tail?: CacheNode;
  private size: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
    this.size = 0;
  }

  private moveToHead(node: CacheNode): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private removeNode(node: CacheNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private addToHead(node: CacheNode): void {
    node.prev = undefined;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeTail(): CacheNode | undefined {
    if (!this.tail) return undefined;

    const last = this.tail;
    this.removeNode(last);
    return last;
  }

  get(key: string): RoomMessage[] | null {
    const node = this.cache.get(key);
    if (!node) return null;

    // تحديث وقت الوصول ونقل للمقدمة
    node.lastAccess = Date.now();
    this.moveToHead(node);
    return [...node.value]; // إرجاع نسخة للأمان
  }

  set(key: string, value: RoomMessage[]): void {
    const existingNode = this.cache.get(key);

    if (existingNode) {
      // تحديث القيمة الموجودة
      existingNode.value = [...value]; // نسخة للأمان
      existingNode.lastAccess = Date.now();
      this.moveToHead(existingNode);
    } else {
      // إضافة عقدة جديدة
      const newNode: CacheNode = {
        key,
        value: [...value], // نسخة للأمان
        lastAccess: Date.now()
      };

      if (this.size >= this.capacity) {
        // إزالة العقدة الأقدم
        const tail = this.removeTail();
        if (tail) {
          this.cache.delete(tail.key);
          this.size--;
        }
      }

      this.cache.set(key, newNode);
      this.addToHead(newNode);
      this.size++;
    }
  }

  delete(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) return false;

    this.removeNode(node);
    this.cache.delete(key);
    this.size--;
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.head = undefined;
    this.tail = undefined;
    this.size = 0;
  }

  getStats(): { size: number; capacity: number; hitRatio: number } {
    return {
      size: this.size,
      capacity: this.capacity,
      hitRatio: 0 // يمكن تطبيق نظام tracking للحصول على نسبة دقيقة
    };
  }

  removeMessageFromRoom(roomId: string, messageId: number): boolean {
    const node = this.cache.get(roomId);
    if (!node) return false;

    const messageIndex = node.value.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return false;

    node.value.splice(messageIndex, 1);
    node.lastAccess = Date.now();
    this.moveToHead(node);
    return true;
  }

  addMessageToRoom(roomId: string, message: RoomMessage): void {
    const node = this.cache.get(roomId);
    if (!node) return;

    // إضافة الرسالة في البداية (الأحدث أولاً)
    node.value.unshift({ ...message });
    
    // تحديد الحد الأقصى للرسائل في كل غرفة
    const MAX_MESSAGES_PER_ROOM = 100;
    if (node.value.length > MAX_MESSAGES_PER_ROOM) {
      node.value.splice(MAX_MESSAGES_PER_ROOM);
    }

    node.lastAccess = Date.now();
    this.moveToHead(node);
  }
}

class RoomMessageService {
  private messageCache: LRUCache;
  private readonly MAX_CACHE_SIZE = 100; // رسائل لكل غرفة
  private readonly MAX_CACHE_ROOMS = 50; // عدد الغرف المحفوظة في الذاكرة
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor() {
    this.messageCache = new LRUCache(this.MAX_CACHE_ROOMS);
  }

  /**
   * إرسال رسالة لغرفة مع معالجة شاملة للأخطاء
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
      // التحقق من توفر قاعدة البيانات
      if (!db || dbType === 'disabled') {
        const error = new Error('قاعدة البيانات غير متوفرة');
        console.error('خطأ في إرسال الرسالة:', error.message);
        throw error;
      }

      // التحقق من صحة البيانات المدخلة
      const validation = this.validateMessageData(messageData);
      if (!validation.isValid) {
        const error = new Error(validation.error);
        console.error('خطأ في التحقق من البيانات:', error.message);
        throw error;
      }

      // التحقق من وجود المرسل وصلاحياته
      const sender = await this.validateSender(messageData.senderId, messageData.isPrivate);
      if (!sender) {
        const error = new Error('المرسل غير موجود أو غير مخول');
        console.error('خطأ في التحقق من المرسل:', error.message);
        throw error;
      }

      // إنشاء الرسالة في قاعدة البيانات
      const message = await this.createDatabaseMessage(messageData);
      if (!message) {
        const error = new Error('فشل في إنشاء الرسالة في قاعدة البيانات');
        console.error('خطأ في قاعدة البيانات:', error.message);
        throw error;
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

      console.log(`✅ تم إرسال الرسالة ${message.id} للغرفة ${messageData.roomId}`);
      return roomMessage;

    } catch (error) {
      // معالجة مفصلة للأخطاء
      this.handleError('sendMessage', error, { 
        roomId: messageData.roomId, 
        senderId: messageData.senderId 
      });
      throw error;
    }
  }

  /**
   * التحقق من صحة بيانات الرسالة
   */
  private validateMessageData(messageData: any): { isValid: boolean; error?: string } {
    if (!messageData.content?.trim()) {
      return { isValid: false, error: 'محتوى الرسالة مطلوب' };
    }

    if (!messageData.roomId?.trim()) {
      return { isValid: false, error: 'معرف الغرفة مطلوب' };
    }

    if (!messageData.senderId || typeof messageData.senderId !== 'number') {
      return { isValid: false, error: 'معرف المرسل غير صحيح' };
    }

    // فحص طول المحتوى
    if (messageData.content.length > 5000) {
      return { isValid: false, error: 'محتوى الرسالة طويل جداً' };
    }

    return { isValid: true };
  }

  /**
   * التحقق من المرسل وصلاحياته
   */
  private async validateSender(senderId: number, isPrivate?: boolean): Promise<any | null> {
    try {
      const sender = await storage.getUser(senderId);
      if (!sender) {
        return null;
      }

      // التحقق من حالة المنع للرسائل العامة فقط
      if (!isPrivate) {
        if (sender.isBanned) {
          throw new Error('أنت مطرود ولا يمكنك إرسال رسائل عامة');
        }
        if (sender.isMuted) {
          throw new Error('أنت مكتوم ولا يمكنك إرسال رسائل عامة');
        }
      }

      return sender;
    } catch (error) {
      console.error('خطأ في التحقق من المرسل:', error);
      throw error;
    }
  }

  /**
   * إنشاء الرسالة في قاعدة البيانات
   */
  private async createDatabaseMessage(messageData: any): Promise<any | null> {
    try {
      return await storage.createMessage({
        senderId: messageData.senderId,
        content: messageData.content.trim(),
        messageType: messageData.messageType || 'text',
        isPrivate: messageData.isPrivate || false,
        receiverId: messageData.receiverId || null,
        roomId: messageData.roomId
      });
    } catch (error) {
      console.error('خطأ في إنشاء الرسالة في قاعدة البيانات:', error);
      throw error;
    }
  }

  /**
   * جلب رسائل الغرفة مع الصفحات - محسن
   */
  async getRoomMessages(
    roomId: string, 
    limit: number = 20, 
    offset: number = 0,
    useCache: boolean = true
  ): Promise<MessagePagination> {
    try {
      // التحقق من صحة المعاملات
      if (!roomId?.trim()) {
        throw new Error('معرف الغرفة مطلوب');
      }

      const safeLimit = Math.min(20, Math.max(1, Number(limit) || 20));
      const safeOffset = Math.max(0, Number(offset) || 0);

      // محاولة الحصول على الرسائل من الذاكرة المؤقتة أولاً
      if (useCache && safeOffset === 0) {
        const cachedMessages = this.messageCache.get(roomId);
        if (cachedMessages && cachedMessages.length > 0) {
          this.cacheHits++;
          const slicedMessages = cachedMessages.slice(0, safeLimit);
          
          return {
            messages: slicedMessages,
            totalCount: cachedMessages.length,
            hasMore: cachedMessages.length > safeLimit,
            nextOffset: slicedMessages.length
          };
        }
        this.cacheMisses++;
      }

      // جلب من قاعدة البيانات إذا لم تكن متوفرة في الذاكرة المؤقتة
      if (!db || dbType === 'disabled') {
        console.warn('قاعدة البيانات غير متوفرة، إرجاع قائمة فارغة');
        return {
          messages: [],
          totalCount: 0,
          hasMore: false
        };
      }

      const [dbMessages, totalCount] = await Promise.all([
        storage.getRoomMessages(roomId, safeLimit, safeOffset),
        storage.getRoomMessageCount(roomId)
      ]);

      // تحويل الرسائل للتنسيق المطلوب مع معالجة الأخطاء
      const messages: RoomMessage[] = await this.processMessages(dbMessages, roomId);

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
      this.handleError('getRoomMessages', error, { roomId, limit, offset });
      return {
        messages: [],
        totalCount: 0,
        hasMore: false
      };
    }
  }

  /**
   * معالجة الرسائل من قاعدة البيانات مع التعامل مع الأخطاء
   */
  private async processMessages(dbMessages: any[], roomId: string): Promise<RoomMessage[]> {
    const messages: RoomMessage[] = [];
    const failedMessages: number[] = [];

    for (const msg of dbMessages) {
      try {
        const sender = await storage.getUser(msg.senderId);
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
        failedMessages.push(msg.id);
      }
    }

    if (failedMessages.length > 0) {
      console.warn(`فشل في معالجة ${failedMessages.length} رسالة من أصل ${dbMessages.length}`);
    }

    return messages;
  }

  /**
   * جلب رسائل الغرفة الأحدث فقط
   */
  async getLatestRoomMessages(roomId: string, limit: number = 20): Promise<RoomMessage[]> {
    try {
      const safeLimit = Math.min(20, Math.max(1, Number(limit) || 20));
      const result = await this.getRoomMessages(roomId, safeLimit, 0, true);
      return result.messages;
    } catch (error) {
      this.handleError('getLatestRoomMessages', error, { roomId, limit });
      return [];
    }
  }

  /**
   * حذف رسالة من الغرفة مع التحقق من الصلاحيات
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

      console.log(`✅ تم حذف الرسالة ${messageId} من الغرفة ${roomId}`);

    } catch (error) {
      this.handleError('deleteMessage', error, { messageId, userId, roomId });
      throw error;
    }
  }

  /**
   * البحث في رسائل الغرفة مع معالجة آمنة
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
        console.warn('قاعدة البيانات غير متوفرة للبحث');
        return {
          messages: [],
          totalCount: 0,
          hasMore: false
        };
      }

      // تنظيف نص البحث
      const cleanQuery = searchQuery.trim().substring(0, 100);

      const [results, totalCount] = await Promise.all([
        storage.searchRoomMessages(roomId, cleanQuery, limit, offset),
        storage.countSearchRoomMessages(roomId, cleanQuery)
      ]);

      // تحويل النتائج للتنسيق المطلوب
      const messages: RoomMessage[] = await this.processMessages(results, roomId);

      return {
        messages,
        totalCount,
        hasMore: (offset + messages.length) < totalCount,
        nextOffset: offset + messages.length
      };

    } catch (error) {
      this.handleError('searchRoomMessages', error, { roomId, searchQuery });
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

      const [totalMessages, lastMessage] = await Promise.all([
        storage.getRoomMessageCount(roomId),
        storage.getLastRoomMessage(roomId)
      ]);

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [messagesLast24h, activeUsers] = await Promise.all([
        storage.getRoomMessageCountSince(roomId, yesterday),
        storage.getRoomActiveUserCount(roomId, yesterday)
      ]);

      const lastMessageTime = lastMessage ? new Date(lastMessage.timestamp) : undefined;

      return {
        totalMessages,
        messagesLast24h,
        activeUsers,
        lastMessageTime
      };

    } catch (error) {
      this.handleError('getRoomStats', error, { roomId });
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
        console.warn('قاعدة البيانات غير متوفرة للتنظيف');
        return 0;
      }

      const cutoffDate = new Date(Date.now() - keepLastDays * 24 * 60 * 60 * 1000);
      const deletedCount = await storage.deleteOldRoomMessages(roomId, cutoffDate);

      // تنظيف الذاكرة المؤقتة أيضاً
      this.clearCache(roomId);

      console.log(`✅ تم حذف ${deletedCount} رسالة قديمة من الغرفة ${roomId}`);
      return deletedCount;

    } catch (error) {
      this.handleError('cleanupOldMessages', error, { roomId, keepLastDays });
      return 0;
    }
  }

  // ==================== إدارة الذاكرة المؤقتة المحسنة ====================

  /**
   * إضافة رسالة للذاكرة المؤقتة
   */
  private addToCache(roomId: string, message: RoomMessage): void {
    try {
      this.messageCache.addMessageToRoom(roomId, message);
    } catch (error) {
      console.warn(`تعذر إضافة الرسالة للذاكرة المؤقتة للغرفة ${roomId}:`, error);
    }
  }

  /**
   * تحديث الذاكرة المؤقتة
   */
  private updateCache(roomId: string, messages: RoomMessage[]): void {
    try {
      this.messageCache.set(roomId, messages);
    } catch (error) {
      console.warn(`تعذر تحديث الذاكرة المؤقتة للغرفة ${roomId}:`, error);
    }
  }

  /**
   * إزالة رسالة من الذاكرة المؤقتة
   */
  private removeFromCache(roomId: string, messageId: number): void {
    try {
      this.messageCache.removeMessageFromRoom(roomId, messageId);
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
   * الحصول على إحصائيات الذاكرة المؤقتة المحسنة
   */
  getCacheStats(): {
    cachedRooms: number;
    totalCachedMessages: number;
    cacheHitRatio: number;
    cacheStats: any;
  } {
    const cacheStats = this.messageCache.getStats();
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRatio = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;

    return {
      cachedRooms: cacheStats.size,
      totalCachedMessages: 0, // يمكن حسابه إذا لزم الأمر
      cacheHitRatio: Math.round(hitRatio * 100) / 100,
      cacheStats: {
        ...cacheStats,
        hits: this.cacheHits,
        misses: this.cacheMisses,
        totalRequests
      }
    };
  }

  /**
   * تنظيف الذاكرة المؤقتة بالكامل
   */
  clearAllCache(): void {
    this.messageCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.log('✅ تم مسح جميع الذاكرة المؤقتة للرسائل');
  }

  /**
   * معالج موحد للأخطاء
   */
  private handleError(operation: string, error: any, context?: any): void {
    const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
    const contextStr = context ? JSON.stringify(context) : '';
    
    console.error(`❌ خطأ في ${operation}:`, {
      message: errorMessage,
      context: contextStr,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // يمكن إضافة تسجيل أكثر تفصيلاً هنا أو إرسال تنبيهات
  }
}

// تصدير instance واحد
export const roomMessageService = new RoomMessageService();