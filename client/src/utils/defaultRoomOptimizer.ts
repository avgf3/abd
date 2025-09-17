/**
 * ثوابت الغرف الافتراضية
 * تحسين الأداء والاستقرار من خلال استخدام ثوابت موحدة
 */

export const DEFAULT_ROOM_CONSTANTS = {
  // معرفات الغرف الافتراضية
  GENERAL_ROOM_ID: 'general',
  WELCOME_ROOM_ID: 'welcome',
  
  // أسماء الغرف الافتراضية
  GENERAL_ROOM_NAME: 'الغرفة العامة',
  WELCOME_ROOM_NAME: 'غرفة الترحيب',
  
  // وصف الغرف الافتراضية
  DEFAULT_ROOM_DESCRIPTION: 'الغرفة العامة للدردشة',
  WELCOME_ROOM_DESCRIPTION: 'غرفة الترحيب للمستخدمين الجدد',
  
  // إعدادات الغرف الافتراضية
  DEFAULT_ROOM_SETTINGS: {
    isDefault: true,
    isActive: true,
    isLocked: false,
    allowGuests: true,
    maxUsers: 1000,
  },
  
  // ألوان الغرف الافتراضية
  GENERAL_ROOM_COLOR: '#3B82F6',
  WELCOME_ROOM_COLOR: '#10B981',
} as const;

/**
 * دالة للحصول على معرف الغرفة بناءً على الاسم
 */
export function getRoomIdFromName(roomName: string): string {
  switch (roomName) {
    case 'العامة':
      return DEFAULT_ROOM_CONSTANTS.GENERAL_ROOM_ID;
    case 'الترحيب':
      return DEFAULT_ROOM_CONSTANTS.WELCOME_ROOM_ID;
    default:
      return roomName
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '') || 'room';
  }
}

/**
 * دالة للحصول على اسم الغرفة بناءً على المعرف
 */
export function getRoomNameFromId(roomId: string): string {
  switch (roomId) {
    case DEFAULT_ROOM_CONSTANTS.GENERAL_ROOM_ID:
      return DEFAULT_ROOM_CONSTANTS.GENERAL_ROOM_NAME;
    case DEFAULT_ROOM_CONSTANTS.WELCOME_ROOM_ID:
      return DEFAULT_ROOM_CONSTANTS.WELCOME_ROOM_NAME;
    default:
      return roomId;
  }
}

/**
 * دالة للتحقق من كون الغرفة افتراضية
 */
export function isDefaultRoom(roomId: string): boolean {
  return roomId === DEFAULT_ROOM_CONSTANTS.GENERAL_ROOM_ID || 
         roomId === DEFAULT_ROOM_CONSTANTS.WELCOME_ROOM_ID;
}

/**
 * دالة للحصول على إعدادات الغرفة الافتراضية
 */
export function getDefaultRoomSettings(roomId: string) {
  return {
    ...DEFAULT_ROOM_CONSTANTS.DEFAULT_ROOM_SETTINGS,
    id: roomId,
    name: getRoomNameFromId(roomId),
    description: roomId === DEFAULT_ROOM_CONSTANTS.GENERAL_ROOM_ID 
      ? DEFAULT_ROOM_CONSTANTS.DEFAULT_ROOM_DESCRIPTION
      : DEFAULT_ROOM_CONSTANTS.WELCOME_ROOM_DESCRIPTION,
  };
}