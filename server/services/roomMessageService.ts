import { databaseService } from './databaseService';
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
}

export interface MessagePagination {
  messages: RoomMessage[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
}

// 🚀 LRU Cache Node for efficient management
interface LRUCacheNode {
  roomId: string;
  messages: RoomMessage[];
  lastAccessed: number;
  accessCount: number;
  prev: LRUCacheNode | null;
  next: LRUCacheNode | null;
}

// 🚀 Advanced LRU Cache Implementation
class AdvancedLRUCache {
  private capacity: number;
  private maxMessagesPerRoom: number;
  private cache = new Map<string, LRUCacheNode>();
  private head: LRUCacheNode | null = null;
  private tail: LRUCacheNode | null = null;
  private size: number = 0;

  constructor(capacity: number = 50, maxMessagesPerRoom: number = 100) {
    this.capacity = capacity;
    this.maxMessagesPerRoom = maxMessagesPerRoom;
  }

  private moveToHead(node: LRUCacheNode): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private removeNode(node: LRUCacheNode): void {
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

  private addToHead(node: LRUCacheNode): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeTail(): LRUCacheNode | null {
    if (!this.tail) return null;
    
    const lastNode = this.tail;
    this.removeNode(lastNode);
    return lastNode;
  }

  get(roomId: string): RoomMessage[] | null {
    const node = this.cache.get(roomId);
    if (!node) return null;

    // Update access statistics
    node.lastAccessed = Date.now();
    node.accessCount++;

    // Move to head (most recently used)
    this.moveToHead(node);

    return [...node.messages]; // Return a copy to prevent mutation
  }

  put(roomId: string, messages: RoomMessage[]): void {
    const existingNode = this.cache.get(roomId);
    const now = Date.now();

    if (existingNode) {
      // Update existing entry
      existingNode.messages = messages.slice(0, this.maxMessagesPerRoom);
      existingNode.lastAccessed = now;
      existingNode.accessCount++;
      this.moveToHead(existingNode);
    } else {
      // Create new entry
      const newNode: LRUCacheNode = {
        roomId,
        messages: messages.slice(0, this.maxMessagesPerRoom),
        lastAccessed: now,
        accessCount: 1,
        prev: null,
        next: null
      };

      this.cache.set(roomId, newNode);
      this.addToHead(newNode);
      this.size++;

      // Remove least recently used if capacity exceeded
      if (this.size > this.capacity) {
        const tail = this.removeTail();
        if (tail) {
          this.cache.delete(tail.roomId);
          this.size--;
        }
      }
    }
  }

  addMessage(roomId: string, message: RoomMessage): void {
    const node = this.cache.get(roomId);
    const now = Date.now();

    if (node) {
      // Check for duplicate message
      const isDuplicate = node.messages.some(msg => 
        msg.id === message.id || 
        (msg.timestamp === message.timestamp && 
         msg.senderId === message.senderId && 
         msg.content === message.content)
      );

      if (!isDuplicate) {
        node.messages.unshift(message); // Add to beginning (newest first)
        
        // Limit messages per room
        if (node.messages.length > this.maxMessagesPerRoom) {
          node.messages = node.messages.slice(0, this.maxMessagesPerRoom);
        }

        node.lastAccessed = now;
        node.accessCount++;
        this.moveToHead(node);
      }
    } else {
      // Create new cache entry
      this.put(roomId, [message]);
    }
  }

  remove(roomId: string): void {
    const node = this.cache.get(roomId);
    if (node) {
      this.removeNode(node);
      this.cache.delete(roomId);
      this.size--;
    }
  }

  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  getStats(): {
    totalRooms: number;
    totalMessages: number;
    capacity: number;
    averageAccessCount: number;
    mostAccessedRoom: string | null;
  } {
    let totalMessages = 0;
    let totalAccessCount = 0;
    let mostAccessedRoom: string | null = null;
    let maxAccessCount = 0;

    for (const [roomId, node] of this.cache) {
      totalMessages += node.messages.length;
      totalAccessCount += node.accessCount;

      if (node.accessCount > maxAccessCount) {
        maxAccessCount = node.accessCount;
        mostAccessedRoom = roomId;
      }
    }

    return {
      totalRooms: this.size,
      totalMessages,
      capacity: this.capacity,
      averageAccessCount: this.size > 0 ? totalAccessCount / this.size : 0,
      mostAccessedRoom
    };
  }

  // Advanced cleanup based on access patterns
  performSmartCleanup(): void {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    const roomsToRemove: string[] = [];

    for (const [roomId, node] of this.cache) {
      // Remove rooms not accessed in the last hour with low access count
      if (now - node.lastAccessed > ONE_HOUR && node.accessCount < 3) {
        roomsToRemove.push(roomId);
      }
    }

    roomsToRemove.forEach(roomId => this.remove(roomId));
  }
}

class RoomMessageService {
  private messageCache = new AdvancedLRUCache(50, 100); // 50 rooms, 100 messages each
  private loadingStates = new Map<string, boolean>(); // Prevent concurrent loading

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
      const sender = await databaseService.getUser(messageData.senderId);
      if (!sender) {
        throw new Error('المرسل غير موجود');
      }

      // التحقق من حالة الكتم للرسائل العامة
      if (!messageData.isPrivate && sender.isMuted) {
        throw new Error('أنت مكتوم ولا يمكنك إرسال رسائل عامة');
      }

      // إنشاء الرسالة في قاعدة البيانات
      const message = await databaseService.createMessage({
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
        senderAvatar: (sender as any).profileImage || null
      };

      // إضافة الرسالة للذاكرة المؤقتة المحسنة
      this.messageCache.addMessage(messageData.roomId, roomMessage);

      return roomMessage;

    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      throw error;
    }
  }

  /**
   * جلب رسائل الغرفة مع الصفحات والـ LRU cache المحسن
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

      // 🚀 استخدام LRU cache المحسن
      if (useCache && safeOffset === 0) {
        const cachedMessages = this.messageCache.get(roomId);
        if (cachedMessages && cachedMessages.length > 0) {
          const slicedMessages = cachedMessages.slice(0, safeLimit);
          
          console.log(`✅ استخدام LRU cache للغرفة ${roomId} (${slicedMessages.length} رسالة)`);
          
          return {
            messages: slicedMessages,
            totalCount: cachedMessages.length,
            hasMore: cachedMessages.length > safeLimit,
            nextOffset: slicedMessages.length
          };
        }
      }

      // منع التحميل المتزامن للغرفة نفسها
      if (this.loadingStates.get(roomId)) {
        console.log(`⚠️ تحميل رسائل الغرفة ${roomId} قيد التنفيذ بالفعل`);
        return {
          messages: [],
          totalCount: 0,
          hasMore: false
        };
      }

      this.loadingStates.set(roomId, true);

      try {
        if (!db || dbType === 'disabled') {
          return {
            messages: [],
            totalCount: 0,
            hasMore: false
          };
        }

        // جلب الرسائل من قاعدة البيانات
        const dbMessages = await databaseService.getRoomMessages(roomId, safeLimit, safeOffset);
        const totalCount = await databaseService.getRoomMessageCount(roomId);

        // تحويل الرسائل للتنسيق المطلوب
        const messages: RoomMessage[] = [];
        for (const msg of dbMessages) {
          try {
            const sender = await databaseService.getUser(msg.senderId);
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
              senderAvatar: (sender as any)?.profileImage || null
            };
            messages.push(roomMessage);
          } catch (err) {
            console.warn(`تعذر معالجة الرسالة ${msg.id}:`, err);
          }
        }

        // إضافة الرسائل للذاكرة المؤقتة المحسنة (إذا كان offset = 0)
        if (safeOffset === 0 && messages.length > 0) {
          this.messageCache.put(roomId, messages);
        }

        console.log(`✅ تم جلب ${messages.length} رسالة للغرفة ${roomId} من قاعدة البيانات`);

        return {
          messages,
          totalCount,
          hasMore: (safeOffset + messages.length) < totalCount,
          nextOffset: safeOffset + messages.length
        };

      } finally {
        this.loadingStates.delete(roomId);
      }

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
      const message = await databaseService.getMessage(messageId);
      if (!message) {
        throw new Error('الرسالة غير موجودة');
      }

      // التحقق من الصلاحيات
      const user = await databaseService.getUser(userId);
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      const canDelete = message.senderId === userId || ['admin', 'owner'].includes(user.userType);
      if (!canDelete) {
        throw new Error('ليس لديك صلاحية لحذف هذه الرسالة');
      }

      // حذف الرسالة من قاعدة البيانات
      await databaseService.deleteMessage(messageId);

      // إزالة الرسالة من الذاكرة المؤقتة
      const cachedMessages = this.messageCache.get(roomId);
      if (cachedMessages) {
        const updatedMessages = cachedMessages.filter(msg => msg.id !== messageId);
        this.messageCache.put(roomId, updatedMessages);
      }

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
      const results = await databaseService.searchRoomMessages(roomId, searchQuery, limit, offset);
      const totalCount = await databaseService.countSearchRoomMessages(roomId, searchQuery);

      // تحويل النتائج للتنسيق المطلوب
      const messages: RoomMessage[] = [];
      for (const msg of results) {
        try {
          const sender = await databaseService.getUser(msg.senderId);
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
            senderAvatar: (sender as any)?.profileImage || null
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

      const totalMessages = await databaseService.getRoomMessageCount(roomId);
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const messagesLast24h = await databaseService.getRoomMessageCountSince(roomId, yesterday);
      const activeUsers = await databaseService.getRoomActiveUserCount(roomId, yesterday);
      
      const lastMessage = await databaseService.getLastRoomMessage(roomId);
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
      const deletedCount = await databaseService.deleteOldRoomMessages(roomId, cutoffDate);

      // تنظيف الذاكرة المؤقتة أيضاً
      this.messageCache.remove(roomId);

      return deletedCount;

    } catch (error) {
      console.error(`خطأ في تنظيف رسائل الغرفة ${roomId}:`, error);
      return 0;
    }
  }

  // ==================== إدارة الذاكرة المؤقتة ====================

  /**
   * الحصول على إحصائيات الذاكرة المؤقتة المحسنة
   */
  getCacheStats(): {
    cachedRooms: number;
    totalCachedMessages: number;
    capacity: number;
    averageAccessCount: number;
    mostAccessedRoom: string | null;
  } {
    return this.messageCache.getStats();
  }

  /**
   * تنظيف الذاكرة المؤقتة بالكامل
   */
  clearAllCache(): void {
    this.messageCache.clear();
    }

  /**
   * تنظيف ذكي للذاكرة المؤقتة
   */
  performSmartCacheCleanup(): void {
    this.messageCache.performSmartCleanup();
  }
}

// تصدير instance واحد
export const roomMessageService = new RoomMessageService();