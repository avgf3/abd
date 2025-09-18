/**
 * نظام مبسط لتحديث قائمة المستخدمين بدون تعقيد مفرط
 */

interface UserUpdateEvent {
  type: 'join' | 'leave' | 'update';
  userId: number;
  roomId: string;
  userData?: any;
  timestamp: number;
}

class UserListOptimizer {
  private pendingUpdates = new Map<string, UserUpdateEvent[]>();
  private readonly DEBOUNCE_DELAY = 500; // تقليل التأخير إلى 500ms
  private readonly MAX_BATCH_SIZE = 20; // تقليل الحد الأقصى

  constructor(private emitCallback: (roomId: string, users: any[]) => Promise<void>) {}

  // إضافة حدث تحديث مبسط
  addUpdateEvent(event: UserUpdateEvent) {
    const { roomId } = event;
    
    if (!this.pendingUpdates.has(roomId)) {
      this.pendingUpdates.set(roomId, []);
    }
    
    const updates = this.pendingUpdates.get(roomId)!;
    updates.push(event);
    
    // إذا وصلنا للحد الأقصى، معالجة فورية
    if (updates.length >= this.MAX_BATCH_SIZE) {
      this.processUpdates(roomId);
    } else {
      // معالجة بعد تأخير قصير
      setTimeout(() => this.processUpdates(roomId), this.DEBOUNCE_DELAY);
    }
  }

  // معالجة التحديثات المبسطة
  private async processUpdates(roomId: string) {
    const updates = this.pendingUpdates.get(roomId);
    if (!updates || updates.length === 0) {
      return;
    }
    
    try {
      // إزالة التحديثات المعلقة
      this.pendingUpdates.delete(roomId);
      
      // تجميع الأحداث وإزالة التكرارات البسيطة
      const optimizedEvents = this.optimizeEvents(updates);
      
      console.log(`🔄 معالجة ${optimizedEvents.length} أحداث للغرفة ${roomId}`);
      
      // بناء قائمة المستخدمين المحدثة
      const users = await this.buildUpdatedUserList(roomId, optimizedEvents);
      
      // إرسال التحديث
      await this.emitCallback(roomId, users);
      
    } catch (error) {
      console.error(`❌ خطأ في معالجة تحديثات المستخدمين للغرفة ${roomId}:`, error);
    }
  }

  // تحسين الأحداث البسيط
  private optimizeEvents(events: UserUpdateEvent[]): UserUpdateEvent[] {
    // ترتيب الأحداث حسب الوقت
    events.sort((a, b) => a.timestamp - b.timestamp);
    
    // الاحتفاظ بآخر حدث لكل مستخدم فقط
    const userEvents = new Map<number, UserUpdateEvent>();
    for (const event of events) {
      userEvents.set(event.userId, event);
    }
    
    return Array.from(userEvents.values());
  }

  // بناء قائمة المستخدمين المحدثة المبسطة
  private async buildUpdatedUserList(roomId: string, events: UserUpdateEvent[]): Promise<any[]> {
    try {
      // استيراد الدوال المطلوبة
      const { buildOnlineUsersForRoom } = await import('../realtime');
      
      // الحصول على القائمة الحالية
      const currentUsers = await buildOnlineUsersForRoom(roomId);
      
      // تطبيق الأحداث البسيط
      const userMap = new Map<number, any>();
      
      // إضافة المستخدمين الحاليين
      for (const user of currentUsers) {
        if (user && user.id) {
          userMap.set(user.id, user);
        }
      }
      
      // تطبيق الأحداث
      for (const event of events) {
        switch (event.type) {
          case 'join':
            if (event.userData) {
              userMap.set(event.userId, event.userData);
            }
            break;
            
          case 'leave':
            userMap.delete(event.userId);
            break;
            
          case 'update':
            const existing = userMap.get(event.userId);
            if (existing && event.userData) {
              userMap.set(event.userId, { ...existing, ...event.userData });
            }
            break;
        }
      }
      
      return Array.from(userMap.values());
      
    } catch (error) {
      console.error('خطأ في بناء قائمة المستخدمين المحدثة:', error);
      return [];
    }
  }

  // إجبار معالجة التحديثات المعلقة
  async flushUpdates(roomId?: string) {
    if (roomId) {
      this.processUpdates(roomId);
    } else {
      // معالجة جميع التحديثات المعلقة
      const roomIds = Array.from(this.pendingUpdates.keys());
      for (const id of roomIds) {
        this.processUpdates(id);
      }
    }
  }

  // تنظيف التحديثات القديمة
  cleanup() {
    const now = Date.now();
    const maxAge = 10000; // 10 ثوان
    
    for (const [roomId, updates] of this.pendingUpdates) {
      const recentUpdates = updates.filter(update => 
        now - update.timestamp < maxAge
      );
      
      if (recentUpdates.length === 0) {
        this.pendingUpdates.delete(roomId);
      } else {
        this.pendingUpdates.set(roomId, recentUpdates);
      }
    }
  }
}

// إنشاء مثيل واحد مع callback للإرسال
let userListOptimizer: UserListOptimizer | null = null;

export function createUserListOptimizer(emitCallback: (roomId: string, users: any[]) => Promise<void>) {
  if (!userListOptimizer) {
    userListOptimizer = new UserListOptimizer(emitCallback);
    
    // تنظيف دوري كل دقيقة
    setInterval(() => {
      userListOptimizer?.cleanup();
    }, 60000);
  }
  return userListOptimizer;
}

export function getUserListOptimizer(): UserListOptimizer | null {
  return userListOptimizer;
}

// دوال مساعدة للاستخدام السهل
export function optimizedUserJoin(roomId: string, userId: number, userData: any) {
  userListOptimizer?.addUpdateEvent({
    type: 'join',
    userId,
    roomId,
    userData,
    timestamp: Date.now(),
  });
}

export function optimizedUserLeave(roomId: string, userId: number) {
  userListOptimizer?.addUpdateEvent({
    type: 'leave',
    userId,
    roomId,
    timestamp: Date.now(),
  });
}

export function optimizedUserUpdate(roomId: string, userId: number, userData: any) {
  userListOptimizer?.addUpdateEvent({
    type: 'update',
    userId,
    roomId,
    userData,
    timestamp: Date.now(),
  });
}