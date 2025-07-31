// استيراد الأنواع الموحدة من shared
import type {
  UserRole,
  UserStatus,
  Gender,
  MessageType,
  MessageStatus,
  NotificationType,
  WebSocketMessageType,
  FriendRequestStatus,
  RoomType,
  RoomPermission,
  ReportReason,
  UserBase,
  UserPresence,
  UserModeration,
  UserGameification,
  UserPreferences,
  UserSecurity,
  FullUser,
  DisplayUser,
  MessageBase,
  PublicMessage,
  PrivateMessage,
  ChatMessage,
  MessageReaction,
  FriendRequest,
  Friend,
  Notification,
  NotificationSettings,
  PrivacySettings,
  Achievement,
  LoginAttempt,
  Room,
  RoomSettings,
  RoomMember,
  FileUpload,
  Report,
  SystemStats,
  WebSocketMessage,
  LoginFormData,
  RegisterFormData,
  ProfileUpdateData,
  PasswordChangeData,
  SearchParams,
  SearchResult,
  PaginationParams,
  PaginatedResponse,
  Permission,
  RolePermissions,
  ApiResponse,
  ApiError
} from '../../shared/types';

// إعادة تصدير الأنواع للتوافق مع الكود الموجود
export type ChatUser = FullUser;
export type ChatMessage = ChatMessage;
export type PrivateConversation = Record<number, ChatMessage[]>;

// أنواع إضافية للواجهة
export interface ChatState {
  currentUser: ChatUser | null;
  onlineUsers: ChatUser[];
  publicMessages: ChatMessage[];
  privateConversations: PrivateConversation;
  ignoredUsers: Set<number>;
  isConnected: boolean;
  typingUsers: Set<string>;
  connectionError: string | null;
  newMessageSender: ChatUser | null;
  isLoading: boolean;
  notifications: Notification[];
  currentRoomId: string;
  roomMessages: Record<string, ChatMessage[]>;
  showKickCountdown: boolean;
}

// أنواع بيانات الحوائط للتوافق مع الكود الموجود
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

// أنواع بيانات الروم للتوافق مع الكود الموجود
export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  createdBy: number;
  createdAt: Date;
  isActive: boolean;
  userCount: number;
  maxUsers?: number;
  icon?: string;
  color?: string;
  // خصائص Broadcast Room الجديدة
  isBroadcast?: boolean;
  hostId?: number;
  speakers?: number[];
  micQueue?: number[];
}

export interface RoomUser extends ChatUser {
  roomId: string;
  joinedAt: Date;
}

export interface RoomMessage extends ChatMessage {
  roomId: string;
}

export interface RoomWebSocketMessage extends WebSocketMessage {
  roomId?: string;
  room?: ChatRoom;
  rooms?: ChatRoom[];
}

// تصدير جميع الأنواع
export type {
  UserRole,
  UserStatus,
  Gender,
  MessageType,
  MessageStatus,
  NotificationType,
  WebSocketMessageType,
  FriendRequestStatus,
  RoomType,
  RoomPermission,
  ReportReason,
  UserBase,
  UserPresence,
  UserModeration,
  UserGameification,
  UserPreferences,
  UserSecurity,
  FullUser,
  DisplayUser,
  MessageBase,
  PublicMessage,
  PrivateMessage,
  MessageReaction,
  FriendRequest,
  Friend,
  Notification,
  NotificationSettings,
  PrivacySettings,
  Achievement,
  LoginAttempt,
  Room,
  RoomSettings,
  RoomMember,
  FileUpload,
  Report,
  SystemStats,
  WebSocketMessage,
  LoginFormData,
  RegisterFormData,
  ProfileUpdateData,
  PasswordChangeData,
  SearchParams,
  SearchResult,
  PaginationParams,
  PaginatedResponse,
  Permission,
  RolePermissions,
  ApiResponse,
  ApiError
};
