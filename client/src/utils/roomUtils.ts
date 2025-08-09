import type { ChatRoom } from '@/types/chat';

// 🚀 Centralized Room State Manager - منع التضارب والاستدعاءات المكررة
class RoomStateManager {
  private static instance: RoomStateManager;
  private roomStates = new Map<string, {
    isLoading: boolean;
    lastFetch: number;
    joinInProgress: boolean;
    leaveInProgress: boolean;
    messagesLoading: boolean;
    lastMessageFetch: number;
  }>();
  
  private readonly DEBOUNCE_TIME = 1000; // 1 second
  private readonly MESSAGE_CACHE_TIME = 30000; // 30 seconds

  static getInstance(): RoomStateManager {
    if (!RoomStateManager.instance) {
      RoomStateManager.instance = new RoomStateManager();
    }
    return RoomStateManager.instance;
  }

  // 🔒 منع التحميل المتكرر للغرف
  canFetchRoom(roomId: string): boolean {
    const state = this.roomStates.get(roomId);
    if (!state) return true;
    
    const now = Date.now();
    return !state.isLoading && (now - state.lastFetch) > this.DEBOUNCE_TIME;
  }

  setRoomLoading(roomId: string, loading: boolean): void {
    const state = this.roomStates.get(roomId) || this.createInitialState();
    state.isLoading = loading;
    if (loading) state.lastFetch = Date.now();
    this.roomStates.set(roomId, state);
  }

  // 🚪 منع الانضمام المتكرر للغرف
  canJoinRoom(roomId: string): boolean {
    const state = this.roomStates.get(roomId);
    return !state?.joinInProgress;
  }

  setRoomJoining(roomId: string, joining: boolean): void {
    const state = this.roomStates.get(roomId) || this.createInitialState();
    state.joinInProgress = joining;
    this.roomStates.set(roomId, state);
  }

  // 🚪 منع المغادرة المتكررة للغرف
  canLeaveRoom(roomId: string): boolean {
    const state = this.roomStates.get(roomId);
    return !state?.leaveInProgress;
  }

  setRoomLeaving(roomId: string, leaving: boolean): void {
    const state = this.roomStates.get(roomId) || this.createInitialState();
    state.leaveInProgress = leaving;
    this.roomStates.set(roomId, state);
  }

  // 💬 منع تحميل الرسائل المتكرر
  canFetchMessages(roomId: string): boolean {
    const state = this.roomStates.get(roomId);
    if (!state) return true;
    
    const now = Date.now();
    return !state.messagesLoading && (now - state.lastMessageFetch) > this.MESSAGE_CACHE_TIME;
  }

  setMessagesLoading(roomId: string, loading: boolean): void {
    const state = this.roomStates.get(roomId) || this.createInitialState();
    state.messagesLoading = loading;
    if (loading) state.lastMessageFetch = Date.now();
    this.roomStates.set(roomId, state);
  }

  // 🧹 تنظيف الحالات القديمة
  cleanupStaleStates(): void {
    const now = Date.now();
    const CLEANUP_TIME = 5 * 60 * 1000; // 5 minutes

    for (const [roomId, state] of this.roomStates.entries()) {
      const isStale = (now - state.lastFetch) > CLEANUP_TIME && 
                      (now - state.lastMessageFetch) > CLEANUP_TIME;
      
      if (isStale && !state.isLoading && !state.joinInProgress && 
          !state.leaveInProgress && !state.messagesLoading) {
        this.roomStates.delete(roomId);
      }
    }
  }

  private createInitialState() {
    return {
      isLoading: false,
      lastFetch: 0,
      joinInProgress: false,
      leaveInProgress: false,
      messagesLoading: false,
      lastMessageFetch: 0
    };
  }

  // 📊 إحصائيات الحالة
  getStats() {
    const states = Array.from(this.roomStates.values());
    return {
      totalRooms: this.roomStates.size,
      loadingRooms: states.filter(s => s.isLoading).length,
      joiningRooms: states.filter(s => s.joinInProgress).length,
      leavingRooms: states.filter(s => s.leaveInProgress).length,
      loadingMessages: states.filter(s => s.messagesLoading).length
    };
  }
}

// إنشاء instance مشترك
export const roomStateManager = RoomStateManager.getInstance();

// تنظيف دوري للحالات القديمة
setInterval(() => {
  roomStateManager.cleanupStaleStates();
}, 60000); // كل دقيقة

/**
 * تحويل بيانات الغرف من API إلى تنسيق ChatRoom
 */
export function mapApiRooms(apiRooms: any[]): ChatRoom[] {
  if (!Array.isArray(apiRooms)) {
    console.warn('⚠️ mapApiRooms: البيانات المدخلة ليست مصفوفة:', apiRooms);
    return [];
  }

  return apiRooms
    .filter(room => room && typeof room === 'object')
    .map(room => mapApiRoom(room))
    .filter(room => room !== null) as ChatRoom[];
}

/**
 * تحويل غرفة واحدة من API إلى تنسيق ChatRoom
 */
export function mapApiRoom(apiRoom: any): ChatRoom | null {
  try {
    if (!apiRoom || typeof apiRoom !== 'object') {
      console.warn('⚠️ mapApiRoom: بيانات غرفة غير صالحة:', apiRoom);
      return null;
    }

    // التحقق من الحقول المطلوبة
    if (!apiRoom.id || !apiRoom.name) {
      console.warn('⚠️ mapApiRoom: الغرفة تفتقر للحقول المطلوبة:', apiRoom);
      return null;
    }

    return {
      id: String(apiRoom.id),
      name: String(apiRoom.name || '').trim(),
      description: String(apiRoom.description || '').trim(),
      icon: apiRoom.icon || '',
      isDefault: Boolean(apiRoom.isDefault),
      isActive: Boolean(apiRoom.isActive !== false), // default true
      isBroadcast: Boolean(apiRoom.isBroadcast),
      userCount: Math.max(0, Number(apiRoom.userCount) || 0),
      createdBy: Number(apiRoom.createdBy) || 0,
      createdAt: apiRoom.createdAt ? new Date(apiRoom.createdAt) : new Date(),
      // بيانات البث
      hostId: apiRoom.hostId || null,
      speakers: Array.isArray(apiRoom.speakers) ? apiRoom.speakers : [],
      micQueue: Array.isArray(apiRoom.micQueue) ? apiRoom.micQueue : []
    };
  } catch (error) {
    console.error('❌ خطأ في تحويل بيانات الغرفة:', error, apiRoom);
    return null;
  }
}

/**
 * إزالة الغرف المكررة بناءً على المعرف
 */
export function dedupeRooms(rooms: ChatRoom[]): ChatRoom[] {
  if (!Array.isArray(rooms)) {
    console.warn('⚠️ dedupeRooms: البيانات المدخلة ليست مصفوفة:', rooms);
    return [];
  }

  const seenIds = new Set<string>();
  const uniqueRooms: ChatRoom[] = [];

  for (const room of rooms) {
    if (!room || !room.id) {
      console.warn('⚠️ dedupeRooms: غرفة بدون معرف:', room);
      continue;
    }

    const roomId = String(room.id);
    if (!seenIds.has(roomId)) {
      seenIds.add(roomId);
      uniqueRooms.push(room);
    } else {
      console.log(`🗑️ إزالة غرفة مكررة: ${room.name} (${roomId})`);
    }
  }

  // ترتيب الغرف: الافتراضية أولاً، ثم حسب عدد المستخدمين
  return uniqueRooms.sort((a, b) => {
    // الغرفة الافتراضية تأتي أولاً
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    
    // غرف البث تأتي بعد الافتراضية
    if (a.isBroadcast && !b.isBroadcast) return -1;
    if (!a.isBroadcast && b.isBroadcast) return 1;
    
    // ترتيب حسب عدد المستخدمين (الأكثر أولاً)
    const aUsers = a.userCount || 0;
    const bUsers = b.userCount || 0;
    if (aUsers !== bUsers) return bUsers - aUsers;
    
    // ترتيب أبجدي كخيار أخير
    return a.name.localeCompare(b.name, 'ar');
  });
}

/**
 * التحقق من صحة بيانات الغرفة
 */
export function validateRoom(room: any): room is ChatRoom {
  if (!room || typeof room !== 'object') return false;
  
  return (
    typeof room.id === 'string' && room.id.length > 0 &&
    typeof room.name === 'string' && room.name.trim().length > 0 &&
    typeof room.isDefault === 'boolean' &&
    typeof room.isActive === 'boolean'
  );
}

/**
 * البحث في الغرف بناءً على النص
 */
export function searchRooms(rooms: ChatRoom[], query: string): ChatRoom[] {
  if (!query.trim()) return rooms;
  
  const searchTerm = query.toLowerCase().trim();
  
  return rooms.filter(room => {
    const nameMatch = room.name.toLowerCase().includes(searchTerm);
    const descMatch = room.description?.toLowerCase().includes(searchTerm);
    return nameMatch || descMatch;
  });
}

/**
 * فلترة الغرف بناءً على المعايير
 */
export function filterRooms(rooms: ChatRoom[], filters: {
  showBroadcast?: boolean;
  showEmpty?: boolean;
  isActive?: boolean;
}): ChatRoom[] {
  return rooms.filter(room => {
    if (filters.showBroadcast !== undefined && room.isBroadcast !== filters.showBroadcast) {
      return false;
    }
    
    if (filters.showEmpty === false && (room.userCount || 0) === 0) {
      return false;
    }
    
    if (filters.isActive !== undefined && room.isActive !== filters.isActive) {
      return false;
    }
    
    return true;
  });
}

/**
 * الحصول على الغرفة الافتراضية
 */
export function getDefaultRoom(rooms: ChatRoom[]): ChatRoom | null {
  return rooms.find(room => room.isDefault) || null;
}

/**
 * فورمات عدد المستخدمين
 */
export function formatUserCount(count: number): string {
  if (count === 0) return 'فارغة';
  if (count === 1) return 'مستخدم واحد';
  if (count === 2) return 'مستخدمان';
  if (count <= 10) return `${count} مستخدمين`;
  return `${count} مستخدم`;
}

/**
 * تحويل نوع الغرفة إلى نص
 */
export function getRoomTypeText(room: ChatRoom): string {
  if (room.isDefault) return 'الغرفة الرئيسية';
  if (room.isBroadcast) return 'غرفة بث صوتي';
  return 'غرفة عادية';
}

/**
 * الحصول على أيقونة الغرفة
 */
export function getRoomIcon(room: ChatRoom): string {
  if (room.icon) return room.icon;
  if (room.isDefault) return '🏠';
  if (room.isBroadcast) return '🎙️';
  return '💬';
}