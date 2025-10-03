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

// دعم معرفات الكيانات بحروف بادئة: A للبوت، B للمستخدم
export type EntityIdLike = number | string;

/**
 * يحلل معرف الكيان الذي قد يحتوي على بادئة حرفية (A للبوت، B للمستخدم)
 * ويعيد المعرف العددي مع تلميح لنوع الكيان إن وُجد.
 */
export function parseEntityId(input: EntityIdLike): { id: number | null; typeHint?: 'user' | 'bot' } {
  if (typeof input === 'number') {
    return { id: Number.isFinite(input) ? input : null };
  }
  if (typeof input !== 'string') {
    return { id: null };
  }
  const raw = input.trim();
  if (/^[Aa]\d+$/.test(raw)) {
    const num = parseInt(raw.slice(1), 10);
    return { id: Number.isFinite(num) ? num : null, typeHint: 'bot' };
  }
  if (/^[Bb]\d+$/.test(raw)) {
    const num = parseInt(raw.slice(1), 10);
    return { id: Number.isFinite(num) ? num : null, typeHint: 'user' };
  }
  if (/^\d+$/.test(raw)) {
    const num = parseInt(raw, 10);
    return { id: Number.isFinite(num) ? num : null };
  }
  return { id: null };
}

/**
 * يصيغ معرف الكيان بإضافة بادئة حرفية حسب النوع: A للبوت و B للمستخدم
 */
export function formatEntityId(id: number, type: 'user' | 'bot'): string {
  const prefix = type === 'bot' ? 'A' : 'B';
  return `${prefix}${id}`;
}

/**
 * يتحقق من أن قيمة المعرف تخص بوتاً سواءً عبر العتبة العددية أو البادئة A
 */
export function isBotEntityId(input: EntityIdLike): boolean {
  const parsed = parseEntityId(input);
  if (parsed.id == null) return false;
  if (parsed.typeHint === 'bot') return true;
  return isBotId(parsed.id);
}

/**
 * يتحقق من أن قيمة المعرف تخص مستخدماً سواءً عبر العتبة العددية أو البادئة B
 */
export function isUserEntityId(input: EntityIdLike): boolean {
  const parsed = parseEntityId(input);
  if (parsed.id == null) return false;
  if (parsed.typeHint === 'user') return true;
  return isUserId(parsed.id);
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