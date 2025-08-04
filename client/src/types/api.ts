// أنواع API الشاملة للمشروع

// أنواع الاستجابة العامة
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: string[];
  timestamp?: string;
  code?: string;
}

// أنواع أخطاء API
export interface ApiError {
  error: boolean;
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
  status?: number;
}

// أنواع pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// أنواع المستخدم المحسّنة
export type UserRole = 'guest' | 'member' | 'moderator' | 'admin' | 'owner';
export type UserStatus = 'online' | 'offline' | 'away' | 'busy';
export type Gender = 'ذكر' | 'أنثى' | '';

export interface UserBase {
  id: number;
  username: string;
  email?: string;
  userType: UserRole;
  role: UserRole;
  profileImage?: string;
  profileBanner?: string;
  profileBackgroundColor: string;
  status?: string;
  gender?: Gender;
  age?: number;
  country?: string;
  relation?: string;
  bio?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface UserPresence {
  isOnline: boolean;
  lastSeen: Date | null;
  isHidden: boolean;
}

export interface UserModeration {
  isMuted: boolean;
  muteExpiry: Date | null;
  isBanned: boolean;
  banExpiry: Date | null;
  isBlocked: boolean;
  isKicked?: boolean;
}

export interface UserGameification {
  points: number;
  level: number;
  totalPoints: number;
  levelProgress: number;
  achievements?: Achievement[];
}

export interface UserPreferences {
  usernameColor: string;
  userTheme: string;
  profileEffect: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface UserSecurity {
  ipAddress?: string;
  deviceId?: string;
  lastLoginIp?: string;
  lastLoginDate?: Date;
  loginHistory?: LoginAttempt[];
}

// مستخدم كامل
export interface FullUser extends UserBase, UserPresence, UserModeration, UserGameification, UserPreferences, UserSecurity {
  ignoredUsers: number[];
  friends?: Friend[];
  blockedUsers?: number[];
}

// مستخدم مبسط للعرض
export interface DisplayUser extends UserBase, UserPresence {
  points: number;
  level: number;
  usernameColor: string;
}

// أنواع الرسائل
export type MessageType = 'text' | 'image' | 'file' | 'sticker' | 'voice';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageBase {
  id: number;
  senderId: number;
  content: string;
  messageType: MessageType;
  timestamp: Date;
  editedAt?: Date;
  deletedAt?: Date;
}

export interface PublicMessage extends MessageBase {
  isPrivate: false;
  roomId?: string;
  sender: DisplayUser;
  reactions?: MessageReaction[];
  mentions?: number[];
}

export interface PrivateMessage extends MessageBase {
  isPrivate: true;
  receiverId: number;
  sender: DisplayUser;
  receiver: DisplayUser;
  status: MessageStatus;
  isRead: boolean;
  readAt?: Date;
}

export type ChatMessage = PublicMessage | PrivateMessage;

// تفاعلات الرسائل
export interface MessageReaction {
  id: number;
  messageId: number;
  userId: number;
  emoji: string;
  timestamp: Date;
}

// أنواع الصداقة
export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface FriendRequest {
  id: number;
  senderId: number;
  receiverId: number;
  status: FriendRequestStatus;
  message?: string;
  createdAt: Date;
  respondedAt?: Date;
  sender: DisplayUser;
  receiver: DisplayUser;
}

export interface Friend {
  id: number;
  userId: number;
  friendId: number;
  friendshipDate: Date;
  nickname?: string;
  isFavorite: boolean;
  user: DisplayUser;
}

// أنواع الإشعارات
export type NotificationType = 
  | 'friend_request' 
  | 'friend_accepted' 
  | 'message' 
  | 'mention' 
  | 'system' 
  | 'achievement' 
  | 'level_up'
  | 'warning'
  | 'ban'
  | 'unban';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
}

export interface NotificationSettings {
  friendRequests: boolean;
  messages: boolean;
  mentions: boolean;
  system: boolean;
  achievements: boolean;
  sound: boolean;
  desktop: boolean;
  email: boolean;
}

// إعدادات الخصوصية
export interface PrivacySettings {
  showOnlineStatus: boolean;
  allowDirectMessages: 'all' | 'friends' | 'none';
  showProfileToGuests: boolean;
  showLastSeen: boolean;
  allowFriendRequests: boolean;
}

// أنواع الإنجازات
export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

// محاولات تسجيل الدخول
export interface LoginAttempt {
  timestamp: Date;
  success: boolean;
  ip: string;
  userAgent?: string;
  location?: string;
}

// أنواع الغرف
export type RoomType = 'public' | 'private' | 'broadcast';
export type RoomPermission = 'view' | 'speak' | 'moderate' | 'admin';

export interface Room {
  id: string;
  name: string;
  description?: string;
  type: RoomType;
  ownerId: number;
  maxUsers?: number;
  currentUsers: number;
  isPasswordProtected: boolean;
  createdAt: Date;
  updatedAt?: Date;
  settings: RoomSettings;
}

export interface RoomSettings {
  allowGuests: boolean;
  requireApproval: boolean;
  slowMode: number; // seconds
  maxMessageLength: number;
  allowImages: boolean;
  allowFiles: boolean;
}

export interface RoomMember {
  userId: number;
  roomId: string;
  permission: RoomPermission;
  joinedAt: Date;
  isMuted: boolean;
  user: DisplayUser;
}

// أنواع الملفات
export interface FileUpload {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  uploadedBy: number;
  uploadedAt: Date;
}

// أنواع التقارير
export type ReportReason = 
  | 'spam'
  | 'harassment'
  | 'inappropriate_content'
  | 'fake_profile'
  | 'other';

export interface Report {
  id: number;
  reporterId: number;
  reportedUserId?: number;
  reportedMessageId?: number;
  reason: ReportReason;
  description: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: number;
  reporter: DisplayUser;
  reportedUser?: DisplayUser;
}

// إحصائيات النظام
export interface SystemStats {
  totalUsers: number;
  onlineUsers: number;
  totalMessages: number;
  activeRooms: number;
  systemLoad: number;
  uptime: number;
  lastUpdate: Date;
}

// أنواع WebSocket
export type WebSocketMessageType = 
  | 'auth'
  | 'message'
  | 'privateMessage'
  | 'userJoined'
  | 'userLeft'
  | 'userUpdated'
  | 'typing'
  | 'stopTyping'
  | 'notification'
  | 'roomJoined'
  | 'roomLeft'
  | 'error'
  | 'success';

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  data: T;
  timestamp: Date;
  userId?: number;
}

// أنواع FormData
export interface LoginFormData {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface ProfileUpdateData {
  username?: string;
  bio?: string;
  status?: string;
  gender?: Gender;
  age?: number;
  country?: string;
  relation?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// أنواع التصفية والبحث
export interface SearchParams {
  query: string;
  type?: 'users' | 'messages' | 'rooms';
  filters?: Record<string, any>;
  pagination?: PaginationParams;
}

export interface SearchResult<T> {
  results: T[];
  total: number;
  query: string;
  filters: Record<string, any>;
  pagination: PaginationParams;
}

// أنواع الأذونات
export interface Permission {
  name: string;
  description: string;
  category: string;
  requiredRole: UserRole;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  inheritsFrom?: UserRole;
}