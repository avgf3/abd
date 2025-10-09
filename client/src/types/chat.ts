export interface ChatUser {
  id: number;
  username: string;
  displayName?: string;
  profileImage?: string;
  role: 'guest' | 'member' | 'owner' | 'admin' | 'moderator' | 'system';
  isOnline: boolean;
  roomId?: string;

  // معلومات إضافية - تحسين type safety
  profileBanner?: string;
  profileBackgroundColor?: string;
  usernameColor?: string;
  usernameGradient?: string; // تدرج لوني لاسم المستخدم (للمشرفين)
  usernameEffect?: string; // تأثير حركي لاسم المستخدم (للمشرفين)
  profileEffect?: string;
  // إطار البروفايل (اسم/مسار ثابت محفوظ)
  profileFrame?: string;
  status?: string;
  gender?: string; // تغيير: جعل النوع اختيارياً وقابلاً لأي نص لضمان التوافق
  age?: number;
  country?: string;
  city?: string;
  bio?: string;
  website?: string;
  socialFacebook?: string;
  socialTwitter?: string;
  socialInstagram?: string;
  socialYoutube?: string;
  socialTiktok?: string;
  messageSound?: boolean;
  allowPrivateMessages?: boolean;
  ipAddress?: string;
  lastSeen?: string | Date; // دعم النوعين string و Date
  isTyping?: boolean;
  isHidden?: boolean;
  points?: number;
  level?: number; // جعل المستوى اختيارياً للتوافق بين الأنواع
  roomColor?: string;
  userType: string; // جعل نوع المستخدم مطلوب

  // خصائص مفقودة - إضافة حديثة
  joinDate?: Date;
  createdAt?: Date;
  relation?: string;
  isMuted?: boolean;
  isBanned?: boolean;
  isBlocked?: boolean;
  totalPoints?: number;
  levelProgress?: number;
  lastActive?: Date;
  achievements?: any[];
  isActive?: boolean;
  muteExpiry?: Date | null;
  banExpiry?: Date | null;
  currentRoom?: string;
  settings?: any;

  // تم إضافة خصائص جديدة
  ignoredUsers?: number[];
  blockedUsers?: number[];

  // موسيقى البروفايل
  profileMusicUrl?: string;
  profileMusicTitle?: string;
  profileMusicEnabled?: boolean;
  profileMusicVolume?: number; // 0-100
  // خصوصية الرسائل الخاصة
  dmPrivacy?: 'all' | 'friends' | 'none';
}

// 🔥 UNIFIED ChatMessage interface - مصدر واحد للحقيقة
export type { ChatMessage } from '../../../shared/types';
import type { ChatMessage as SharedChatMessage } from '../../../shared/types';

export interface UserProfile {
  name: string;
  status: string;
  gender: string;
  age: string;
  country: string;
  relation: string;
  bio?: string;
  profileImage?: string;
  profileBanner?: string;
}

export interface Notification {
  id: number;
  type: 'system' | 'friend' | 'moderation' | 'message';
  username: string;
  content: string;
  timestamp: Date;
  isRead?: boolean;
}

// أنواع بيانات الحوائط
export interface WallPost {
  id: number;
  userId: number;
  username: string;
  userRole: string;
  content: string;
  imageUrl?: string;
  type: 'friends' | 'public';
  timestamp: Date;
  reactions: WallReaction[];
  totalLikes: number;
  totalDislikes: number;
  totalHearts: number;
  userProfileImage?: string;
  usernameColor?: string;
}

export interface WallReaction {
  id: number;
  postId: number;
  userId: number;
  username: string;
  type: 'like' | 'dislike' | 'heart';
  timestamp: Date;
}

export interface CreateWallPostData {
  content: string;
  imageFile?: File;
  type: 'friends' | 'public';
}

// أنواع بيانات الروم الجديدة
export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  createdBy: number;
  createdAt: Date;
  isActive: boolean;
  isLocked?: boolean;
  userCount: number;
  maxUsers?: number;
  icon?: string;
  color?: string;
  // خصائص Broadcast Room الجديدة
  isBroadcast?: boolean;
  hostId?: number;
  speakers?: number[];
  micQueue?: number[];
  // Chat lock settings
  chatLockAll?: boolean;
  chatLockVisitors?: boolean;
}

export interface RoomUser extends ChatUser {
  roomId: string;
  joinedAt: Date;
}

export interface RoomMessage extends SharedChatMessage {
  roomId: string;
}

import type { WebSocketMessage as SharedWSMessage } from '../../../shared/types';
export interface RoomWebSocketMessage extends SharedWSMessage {
  roomId?: string;
  room?: ChatRoom;
  rooms?: ChatRoom[];
}

// API Response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
