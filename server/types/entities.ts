// أنواع البيانات الآمنة للتمييز بين المستخدمين والبوتات

export interface BaseEntity {
  id: number;
  username: string;
  profileImage?: string;
  profileBanner?: string;
  profileBackgroundColor: string;
  status?: string;
  gender?: string;
  country?: string;
  relation?: string;
  bio?: string;
  isOnline: boolean;
  lastSeen?: Date | string;
  usernameColor: string;
  profileEffect: string;
  points: number;
  level: number;
  totalPoints: number;
  levelProgress: number;
  createdAt?: Date | string;
}

// نوع المستخدم الحقيقي
export interface UserEntity extends BaseEntity {
  entityType: 'user';
  userType: 'guest' | 'member' | 'admin' | 'owner';
  role: 'guest' | 'member' | 'admin' | 'owner';
  password?: string;
  age?: number;
  isHidden: boolean;
  joinDate?: Date | string;
  isMuted: boolean;
  muteExpiry?: Date | string;
  isBanned: boolean;
  banExpiry?: Date | string;
  isBlocked: boolean;
  ipAddress?: string;
  deviceId?: string;
  ignoredUsers: string;
  // موسيقى البروفايل
  profileMusicUrl?: string | null;
  profileMusicTitle?: string | null;
  profileMusicEnabled?: boolean;
  profileMusicVolume?: number;
}

// نوع البوت
export interface BotEntity extends BaseEntity {
  entityType: 'bot';
  userType: 'bot';
  role: 'bot';
  currentRoom: string;
  isActive: boolean;
  botType: 'system' | 'chat' | 'moderator';
  settings: Record<string, any>;
  createdBy?: number;
  lastActivity?: Date | string;
}

// نوع موحد للكيانات
export type Entity = UserEntity | BotEntity;

// دوال مساعدة للتحقق من النوع
export function isUser(entity: Entity): entity is UserEntity {
  return entity.entityType === 'user';
}

export function isBot(entity: Entity): entity is BotEntity {
  return entity.entityType === 'bot';
}

export function isBotId(id: number): boolean {
  return id >= 1000000;
}

export function isUserId(id: number): boolean {
  return id < 1000000;
}

// دالة للتحقق من صحة نوع الكيان بناءً على المعرف
export function validateEntityType(id: number, expectedType: 'user' | 'bot'): boolean {
  if (expectedType === 'bot') {
    return isBotId(id);
  } else {
    return isUserId(id);
  }
}

// أخطاء مخصصة
export class InvalidEntityTypeError extends Error {
  constructor(id: number, expectedType: 'user' | 'bot') {
    super(`Invalid entity type: ID ${id} does not match expected type ${expectedType}`);
    this.name = 'InvalidEntityTypeError';
  }
}

export class EntityNotFoundError extends Error {
  constructor(id: number, type?: 'user' | 'bot') {
    super(`Entity not found: ${type || 'Entity'} with ID ${id} does not exist`);
    this.name = 'EntityNotFoundError';
  }
}