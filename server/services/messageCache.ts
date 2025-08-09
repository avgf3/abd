/**
 * نظام LRU Cache للرسائل - يعتمد على الاستخدام الفعلي
 * يحل مشكلة تضارب الرسائل بين الغرف المختلفة
 */

interface CachedMessage {
  id: number;
  senderId: number;
  content: string;
  messageType: string;
  isPrivate: boolean;
  roomId?: string;
  receiverId?: number;
  timestamp: Date;
  sender: {
    id: number;
    username: string;
    userType: string;
  };
  lastAccessed: Date; // آخر مرة تم الوصول للرسالة
  accessCount: number; // عدد مرات الوصول
}

interface RoomMessageCache {
  messages: Map<number, CachedMessage>; // message ID -> message
  accessOrder: number[]; // ترتيب الوصول (الأحدث في النهاية)
  lastActivity: Date;
  maxSize: number;
}

class MessageCacheManager {
  // 🎯 كاش منفصل لكل غرفة لمنع التضارب
  private roomCaches = new Map<string, RoomMessageCache>();
  
  // 🎯 كاش منفصل للرسائل الخاصة لكل مستخدم
  private privateCaches = new Map<number, Map<number, CachedMessage[]>>(); // senderId -> receiverId -> messages
  
  // ⚙️ إعدادات الكاش
  private readonly DEFAULT_ROOM_CACHE_SIZE = 100; // 100 رسالة لكل غرفة
  private readonly DEFAULT_PRIVATE_CACHE_SIZE = 50; // 50 رسالة لكل محادثة خاصة
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 دقيقة
  private readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // تنظيف كل 10 دقائق

  constructor() {
    // تنظيف دوري للكاش
    setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * 📨 إضافة رسالة غرفة للكاش
   */
  addRoomMessage(roomId: string, message: any): void {
    if (!roomId || !message) return;

    // إنشاء كاش الغرفة إذا لم يكن موجوداً
    if (!this.roomCaches.has(roomId)) {
      this.roomCaches.set(roomId, {
        messages: new Map(),
        accessOrder: [],
        lastActivity: new Date(),
        maxSize: this.DEFAULT_ROOM_CACHE_SIZE
      });
    }

    const roomCache = this.roomCaches.get(roomId)!;
    const now = new Date();

    const cachedMessage: CachedMessage = {
      id: message.id,
      senderId: message.senderId,
      content: message.content,
      messageType: message.messageType || 'text',
      isPrivate: false,
      roomId: roomId,
      timestamp: new Date(message.timestamp),
      sender: message.sender,
      lastAccessed: now,
      accessCount: 1
    };

    // إضافة الرسالة
    roomCache.messages.set(message.id, cachedMessage);
    roomCache.accessOrder.push(message.id);
    roomCache.lastActivity = now;

    // تطبيق سياسة LRU إذا تجاوز الحد الأقصى
    this.evictLRU(roomCache);

    console.log(`✅ تم إضافة رسالة ${message.id} لكاش الغرفة ${roomId}`);
  }

  /**
   * 🔍 الحصول على رسائل الغرفة (مع تحديث آخر استخدام)
   */
  getRoomMessages(roomId: string, limit?: number): CachedMessage[] {
    if (!roomId || !this.roomCaches.has(roomId)) {
      return [];
    }

    const roomCache = this.roomCaches.get(roomId)!;
    const now = new Date();
    
    // تحديث نشاط الكاش
    roomCache.lastActivity = now;

    // جلب الرسائل مرتبة حسب الوقت
    const messages = Array.from(roomCache.messages.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // تحديث آخر استخدام وعداد الوصول لكل رسالة
    messages.forEach(msg => {
      msg.lastAccessed = now;
      msg.accessCount++;
      
      // نقل إلى نهاية قائمة الوصول (الأحدث استخداماً)
      const index = roomCache.accessOrder.indexOf(msg.id);
      if (index > -1) {
        roomCache.accessOrder.splice(index, 1);
        roomCache.accessOrder.push(msg.id);
      }
    });

    // تطبيق الحد إذا مطلوب
    const result = limit ? messages.slice(-limit) : messages;
    
    console.log(`📋 تم جلب ${result.length} رسالة من كاش الغرفة ${roomId}`);
    return result;
  }

  /**
   * 💬 إضافة رسالة خاصة للكاش
   */
  addPrivateMessage(senderId: number, receiverId: number, message: any): void {
    if (!senderId || !receiverId || !message) return;

    // إنشاء كاش المرسل إذا لم يكن موجوداً
    if (!this.privateCaches.has(senderId)) {
      this.privateCaches.set(senderId, new Map());
    }

    const senderCache = this.privateCaches.get(senderId)!;
    
    // إنشاء كاش المحادثة إذا لم يكن موجوداً
    if (!senderCache.has(receiverId)) {
      senderCache.set(receiverId, []);
    }

    const conversationCache = senderCache.get(receiverId)!;
    const now = new Date();

    const cachedMessage: CachedMessage = {
      id: message.id,
      senderId: message.senderId,
      content: message.content,
      messageType: message.messageType || 'text',
      isPrivate: true,
      receiverId: receiverId,
      timestamp: new Date(message.timestamp),
      sender: message.sender,
      lastAccessed: now,
      accessCount: 1
    };

    // إضافة الرسالة
    conversationCache.push(cachedMessage);

    // تطبيق سياسة LRU للرسائل الخاصة
    if (conversationCache.length > this.DEFAULT_PRIVATE_CACHE_SIZE) {
      // إزالة الرسائل الأقل استخداماً
      conversationCache.sort((a, b) => {
        // ترتيب حسب آخر استخدام ثم عدد مرات الوصول
        if (a.lastAccessed.getTime() !== b.lastAccessed.getTime()) {
          return a.lastAccessed.getTime() - b.lastAccessed.getTime();
        }
        return a.accessCount - b.accessCount;
      });
      
      conversationCache.splice(0, conversationCache.length - this.DEFAULT_PRIVATE_CACHE_SIZE);
    }

    console.log(`✅ تم إضافة رسالة خاصة ${message.id} للكاش (${senderId} -> ${receiverId})`);
  }

  /**
   * 🔍 الحصول على الرسائل الخاصة
   */
  getPrivateMessages(senderId: number, receiverId: number): CachedMessage[] {
    const senderCache = this.privateCaches.get(senderId);
    if (!senderCache || !senderCache.has(receiverId)) {
      return [];
    }

    const messages = senderCache.get(receiverId)!;
    const now = new Date();

    // تحديث آخر استخدام وعداد الوصول
    messages.forEach(msg => {
      msg.lastAccessed = now;
      msg.accessCount++;
    });

    // ترتيب حسب الوقت
    const sortedMessages = [...messages].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    console.log(`📋 تم جلب ${sortedMessages.length} رسالة خاصة من الكاش (${senderId} -> ${receiverId})`);
    return sortedMessages;
  }

  /**
   * 🧹 تطبيق سياسة LRU على كاش الغرفة
   */
  private evictLRU(roomCache: RoomMessageCache): void {
    while (roomCache.messages.size > roomCache.maxSize) {
      // إزالة الرسالة الأقل استخداماً (أول رسالة في قائمة الوصول)
      const oldestId = roomCache.accessOrder.shift();
      if (oldestId !== undefined) {
        roomCache.messages.delete(oldestId);
        console.log(`🗑️ تم إزالة الرسالة ${oldestId} من الكاش (LRU)`);
      } else {
        break;
      }
    }
  }

  /**
   * 🏠 مسح كاش غرفة معينة
   */
  clearRoomCache(roomId: string): void {
    if (this.roomCaches.has(roomId)) {
      this.roomCaches.delete(roomId);
      console.log(`🗑️ تم مسح كاش الغرفة ${roomId}`);
    }
  }

  /**
   * 👤 مسح كاش المحادثات الخاصة لمستخدم
   */
  clearUserPrivateCache(userId: number): void {
    if (this.privateCaches.has(userId)) {
      this.privateCaches.delete(userId);
      console.log(`🗑️ تم مسح كاش المحادثات الخاصة للمستخدم ${userId}`);
    }
  }

  /**
   * 🔄 تحديث الرسالة في الكاش
   */
  updateMessage(messageId: number, updates: Partial<CachedMessage>): boolean {
    let updated = false;

    // البحث في كاش الغرف
    for (const [roomId, roomCache] of this.roomCaches.entries()) {
      if (roomCache.messages.has(messageId)) {
        const message = roomCache.messages.get(messageId)!;
        Object.assign(message, updates);
        message.lastAccessed = new Date();
        message.accessCount++;
        updated = true;
        console.log(`✏️ تم تحديث الرسالة ${messageId} في كاش الغرفة ${roomId}`);
        break;
      }
    }

    // البحث في كاش الرسائل الخاصة
    if (!updated) {
      for (const [senderId, senderCache] of this.privateCaches.entries()) {
        for (const [receiverId, messages] of senderCache.entries()) {
          const messageIndex = messages.findIndex(msg => msg.id === messageId);
          if (messageIndex > -1) {
            Object.assign(messages[messageIndex], updates);
            messages[messageIndex].lastAccessed = new Date();
            messages[messageIndex].accessCount++;
            updated = true;
            console.log(`✏️ تم تحديث الرسالة ${messageId} في كاش المحادثة (${senderId} -> ${receiverId})`);
            break;
          }
        }
        if (updated) break;
      }
    }

    return updated;
  }

  /**
   * ❌ حذف رسالة من الكاش
   */
  deleteMessage(messageId: number): boolean {
    let deleted = false;

    // البحث في كاش الغرف
    for (const [roomId, roomCache] of this.roomCaches.entries()) {
      if (roomCache.messages.has(messageId)) {
        roomCache.messages.delete(messageId);
        const index = roomCache.accessOrder.indexOf(messageId);
        if (index > -1) {
          roomCache.accessOrder.splice(index, 1);
        }
        deleted = true;
        console.log(`❌ تم حذف الرسالة ${messageId} من كاش الغرفة ${roomId}`);
        break;
      }
    }

    // البحث في كاش الرسائل الخاصة
    if (!deleted) {
      for (const [senderId, senderCache] of this.privateCaches.entries()) {
        for (const [receiverId, messages] of senderCache.entries()) {
          const messageIndex = messages.findIndex(msg => msg.id === messageId);
          if (messageIndex > -1) {
            messages.splice(messageIndex, 1);
            deleted = true;
            console.log(`❌ تم حذف الرسالة ${messageId} من كاش المحادثة (${senderId} -> ${receiverId})`);
            break;
          }
        }
        if (deleted) break;
      }
    }

    return deleted;
  }

  /**
   * 📊 الحصول على إحصائيات الكاش
   */
  getStats(): {
    roomCaches: number;
    totalRoomMessages: number;
    privateCaches: number;
    totalPrivateMessages: number;
    memoryUsage: string;
  } {
    let totalRoomMessages = 0;
    for (const roomCache of this.roomCaches.values()) {
      totalRoomMessages += roomCache.messages.size;
    }

    let totalPrivateMessages = 0;
    for (const senderCache of this.privateCaches.values()) {
      for (const messages of senderCache.values()) {
        totalPrivateMessages += messages.length;
      }
    }

    const memoryUsage = `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`;

    return {
      roomCaches: this.roomCaches.size,
      totalRoomMessages,
      privateCaches: this.privateCaches.size,
      totalPrivateMessages,
      memoryUsage
    };
  }

  /**
   * 🧹 تنظيف الكاش من البيانات القديمة
   */
  cleanup(): void {
    const now = new Date();
    let cleanedRooms = 0;
    let cleanedPrivateChats = 0;

    // تنظيف كاش الغرف القديمة
    for (const [roomId, roomCache] of this.roomCaches.entries()) {
      const timeSinceLastActivity = now.getTime() - roomCache.lastActivity.getTime();
      
      if (timeSinceLastActivity > this.CACHE_TTL) {
        this.roomCaches.delete(roomId);
        cleanedRooms++;
      } else {
        // تنظيف الرسائل القديمة داخل الكاش النشط
        const messagesToRemove: number[] = [];
        for (const [messageId, message] of roomCache.messages.entries()) {
          const timeSinceLastAccess = now.getTime() - message.lastAccessed.getTime();
          if (timeSinceLastAccess > this.CACHE_TTL) {
            messagesToRemove.push(messageId);
          }
        }
        
        messagesToRemove.forEach(messageId => {
          roomCache.messages.delete(messageId);
          const index = roomCache.accessOrder.indexOf(messageId);
          if (index > -1) {
            roomCache.accessOrder.splice(index, 1);
          }
        });
      }
    }

    // تنظيف كاش المحادثات الخاصة القديمة
    for (const [senderId, senderCache] of this.privateCaches.entries()) {
      for (const [receiverId, messages] of senderCache.entries()) {
        const validMessages = messages.filter(msg => {
          const timeSinceLastAccess = now.getTime() - msg.lastAccessed.getTime();
          return timeSinceLastAccess <= this.CACHE_TTL;
        });
        
        if (validMessages.length === 0) {
          senderCache.delete(receiverId);
          cleanedPrivateChats++;
        } else if (validMessages.length !== messages.length) {
          senderCache.set(receiverId, validMessages);
        }
      }
      
      // حذف المرسل إذا لم تعد لديه محادثات
      if (senderCache.size === 0) {
        this.privateCaches.delete(senderId);
      }
    }

    if (cleanedRooms > 0 || cleanedPrivateChats > 0) {
      console.log(`🧹 تنظيف الكاش: ${cleanedRooms} غرفة، ${cleanedPrivateChats} محادثة خاصة`);
    }

    // طباعة إحصائيات دورية
    const stats = this.getStats();
    console.log(`📊 إحصائيات الكاش: ${stats.roomCaches} غرفة (${stats.totalRoomMessages} رسالة)، ${stats.privateCaches} محادثة خاصة (${stats.totalPrivateMessages} رسالة)، الذاكرة: ${stats.memoryUsage}`);
  }

  /**
   * 🔍 البحث في الرسائل المحفوظة
   */
  searchMessages(query: string, roomId?: string, userId?: number): CachedMessage[] {
    const results: CachedMessage[] = [];
    const searchQuery = query.toLowerCase();

    // البحث في كاش الغرف
    if (!userId) { // بحث عام أو في غرفة محددة
      const roomsToSearch = roomId ? [roomId] : Array.from(this.roomCaches.keys());
      
      for (const searchRoomId of roomsToSearch) {
        const roomCache = this.roomCaches.get(searchRoomId);
        if (roomCache) {
          for (const message of roomCache.messages.values()) {
            if (message.content.toLowerCase().includes(searchQuery) ||
                message.sender.username.toLowerCase().includes(searchQuery)) {
              results.push(message);
              // تحديث آخر استخدام عند البحث
              message.lastAccessed = new Date();
              message.accessCount++;
            }
          }
        }
      }
    }

    // البحث في المحادثات الخاصة للمستخدم
    if (userId && this.privateCaches.has(userId)) {
      const senderCache = this.privateCaches.get(userId)!;
      for (const messages of senderCache.values()) {
        for (const message of messages) {
          if (message.content.toLowerCase().includes(searchQuery) ||
              message.sender.username.toLowerCase().includes(searchQuery)) {
            results.push(message);
            // تحديث آخر استخدام عند البحث
            message.lastAccessed = new Date();
            message.accessCount++;
          }
        }
      }
    }

    // ترتيب النتائج حسب الوقت (الأحدث أولاً)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    console.log(`🔍 البحث عن "${query}": ${results.length} نتيجة`);
    return results;
  }
}

// تصدير instance واحد للاستخدام في جميع أنحاء التطبيق
export const messageCache = new MessageCacheManager();