/**
 * نظام تحسين قائمة المستخدمين مع debouncing وتجميع التحديثات
 */

interface UserUpdateEvent {
  type: 'join' | 'leave' | 'update';
  userId: number;
  roomId: string;
  userData?: any;
  timestamp: number;
}

interface PendingUpdate {
  roomId: string;
  events: UserUpdateEvent[];
  timeoutId: any; // Timer ID
}

class UserListOptimizer {
  private pendingUpdates = new Map<string, PendingUpdate>();
  private readonly DEBOUNCE_DELAY = 500; // 🔥 تقليل التأخير إلى 500ms للاستجابة الأسرع
  private readonly MAX_BATCH_SIZE = 30; // 🔥 تقليل حجم المجموعة للمعالجة الأسرع

  constructor(private emitCallback: (roomId: string, users: any[]) => Promise<void>) {}

  // إضافة حدث تحديث مع debouncing
  addUpdateEvent(event: UserUpdateEvent) {
    const { roomId } = event;
    
    // الحصول على التحديث المعلق أو إنشاء جديد
    let pending = this.pendingUpdates.get(roomId);
    
    if (!pending) {
      pending = {
        roomId,
        events: [],
        timeoutId: setTimeout(() => this.processUpdates(roomId), this.DEBOUNCE_DELAY),
      };
      this.pendingUpdates.set(roomId, pending);
    } else {
      // إعادة تعيين المؤقت
      clearTimeout(pending.timeoutId);
      pending.timeoutId = setTimeout(() => this.processUpdates(roomId), this.DEBOUNCE_DELAY);
    }
    
    // إضافة الحدث
    pending.events.push(event);
    
    // إذا وصلنا للحد الأقصى، معالجة فورية
    if (pending.events.length >= this.MAX_BATCH_SIZE) {
      clearTimeout(pending.timeoutId);
      this.processUpdates(roomId);
    }
  }

  // معالجة التحديثات المجمعة
  private async processUpdates(roomId: string) {
    const pending = this.pendingUpdates.get(roomId);
    if (!pending || pending.events.length === 0) {
      return;
    }
    
    try {
      // إزالة التحديث المعلق
      this.pendingUpdates.delete(roomId);
      clearTimeout(pending.timeoutId);
      
      // تجميع الأحداث وإزالة التكرارات
      const optimizedEvents = this.optimizeEvents(pending.events);
      
      console.log(`🔄 معالجة ${optimizedEvents.length} أحداث للغرفة ${roomId}`);
      
      // بناء قائمة المستخدمين المحدثة
      const users = await this.buildUpdatedUserList(roomId, optimizedEvents);
      
      // إرسال التحديث
      await this.emitCallback(roomId, users);
      
    } catch (error) {
      console.error(`❌ خطأ في معالجة تحديثات المستخدمين للغرفة ${roomId}:`, error);
    }
  }

  // 🔥 تحسين الأحداث مع منطق ذكي لتجنب فقدان المستخدمين
  private optimizeEvents(events: UserUpdateEvent[]): UserUpdateEvent[] {
    // ترتيب الأحداث حسب الوقت
    events.sort((a, b) => a.timestamp - b.timestamp);
    
    // تجميع الأحداث حسب المستخدم
    const userEvents = new Map<number, UserUpdateEvent[]>();
    for (const event of events) {
      if (!userEvents.has(event.userId)) {
        userEvents.set(event.userId, []);
      }
      userEvents.get(event.userId)!.push(event);
    }
    
    // 🔥 منطق ذكي: إذا كان آخر حدث "leave" لكن هناك "join" حديث، استخدم "join"
    const optimized: UserUpdateEvent[] = [];
    for (const [userId, userEventList] of userEvents) {
      const lastEvent = userEventList[userEventList.length - 1];
      
      // إذا كان آخر حدث هو "leave"
      if (lastEvent.type === 'leave') {
        // ابحث عن آخر "join" أو "update" في آخر 5 ثوان
        const recentThreshold = Date.now() - 5000; // 5 ثوان
        const recentJoinOrUpdate = userEventList
          .filter(e => e.timestamp > recentThreshold && (e.type === 'join' || e.type === 'update'))
          .pop();
        
        // إذا وُجد join/update حديث، استخدمه بدلاً من leave
        if (recentJoinOrUpdate) {
          console.log(`🔄 تجاهل leave قديم للمستخدم ${userId}، استخدام ${recentJoinOrUpdate.type} حديث`);
          optimized.push(recentJoinOrUpdate);
        } else {
          optimized.push(lastEvent);
        }
      } else {
        optimized.push(lastEvent);
      }
    }
    
    return optimized;
  }

  // بناء قائمة المستخدمين المحدثة
  private async buildUpdatedUserList(roomId: string, events: UserUpdateEvent[]): Promise<any[]> {
    try {
      // استيراد الدوال المطلوبة
      const { buildOnlineUsersForRoom } = await import('../realtime');
      
      // الحصول على القائمة الحالية
      const currentUsers = await buildOnlineUsersForRoom(roomId);
      
      // تطبيق الأحداث
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

  // إجبار معالجة التحديثات المعلقة لغرفة معينة
  async flushUpdates(roomId?: string) {
    if (roomId) {
      const pending = this.pendingUpdates.get(roomId);
      if (pending) {
        clearTimeout(pending.timeoutId);
        await this.processUpdates(roomId);
      }
    } else {
      // معالجة جميع التحديثات المعلقة
      const roomIds = Array.from(this.pendingUpdates.keys());
      await Promise.all(roomIds.map(id => {
        const pending = this.pendingUpdates.get(id);
        if (pending) {
          clearTimeout(pending.timeoutId);
          return this.processUpdates(id);
        }
      }));
    }
  }

  // الحصول على إحصائيات التحديثات المعلقة
  getPendingStats() {
    const stats = {
      totalPendingRooms: this.pendingUpdates.size,
      totalPendingEvents: 0,
      roomDetails: [] as Array<{ roomId: string; eventCount: number; oldestEvent: number }>,
    };
    
    for (const [roomId, pending] of this.pendingUpdates) {
      stats.totalPendingEvents += pending.events.length;
      const oldestEvent = pending.events.length > 0 
        ? Math.min(...pending.events.map(e => e.timestamp))
        : Date.now();
        
      stats.roomDetails.push({
        roomId,
        eventCount: pending.events.length,
        oldestEvent,
      });
    }
    
    return stats;
  }

  // تنظيف التحديثات القديمة (أكثر من 10 ثوان)
  cleanup() {
    const now = Date.now();
    const maxAge = 10000; // 10 ثوان
    
    for (const [roomId, pending] of this.pendingUpdates) {
      const oldestEvent = pending.events.length > 0 
        ? Math.min(...pending.events.map(e => e.timestamp))
        : now;
        
      if (now - oldestEvent > maxAge) {
        console.warn(`🧹 تنظيف تحديثات قديمة للغرفة ${roomId}`);
        clearTimeout(pending.timeoutId);
        this.pendingUpdates.delete(roomId);
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