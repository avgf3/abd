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
  profileColor?: string;
  usernameColor?: string;
  profileEffect?: string;
  userTheme?: string;
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
}

// 🔥 UNIFIED ChatMessage interface - مصدر واحد للحقيقة
export interface ChatMessage {
  id: number;
  content: string;
  senderId: number;
  timestamp: string; // ✅ توحيد النوع ليكون string دائماً
  messageType: 'text' | 'image' | 'system';
  sender: ChatUser; // ✅ جعل المرسل مطلوب
  
  // Optional properties
  roomId?: string;
  isPrivate?: boolean;
  receiverId?: number;
  receiver?: ChatUser;
}

export interface PrivateConversation {
  [userId: number]: ChatMessage[];
}

// 🔥 SIMPLIFIED WebSocket message types - حذف التعقيدات
export type WebSocketMessageType = 
  // Core message types
  | 'publicMessage' | 'privateMessage' | 'newMessage'
  // User events
  | 'userJoined' | 'userLeft' | 'onlineUsers' | 'typing'
  // Room events  
  | 'roomJoined' | 'roomMessages'
  // System events
  | 'auth' | 'error' | 'warning'
  // Misc events
  | 'kicked' | 'profileUpdated';

export type WebSocketMessage = {
  type: WebSocketMessageType;
  
  // خصائص الرسالة الأساسية
  username?: string;
  content?: string;
  messageType?: string;
  receiverId?: number;
  isTyping?: boolean;
  user?: ChatUser;
  users?: ChatUser[];
  message?: ChatMessage | string; // يمكن أن يكون string أيضاً
  messages?: ChatMessage[]; // للرسائل المجمّعة مثل roomMessages
  broadcastInfo?: any; // معلومات غرفة البث المرفقة مع الحدث
  action?: string;
  
  // خصائص إضافية للوظائف المختلفة
  isHidden?: boolean; // لرؤية المستخدم
  color?: string; // لتغيير لون اسم المستخدم
  usernameColor?: string; // لون اسم المستخدم الجديد
  userTheme?: string; // لموضوع المستخدم
  profileEffect?: string; // لتأثير البروفايل
  targetUserId?: number; // للإجراءات المستهدفة
  duration?: number; // مدة الإجراء (كيك، حظر، إلخ)
  reason?: string; // سبب الإجراء
  moderatorName?: string; // اسم المراقب
  notificationType?: string; // نوع الإشعار
  senderId?: number; // معرف المرسل
  senderUsername?: string; // اسم المرسل
  acceptedBy?: string; // من قبل الطلب
  friendId?: number; // معرف الصديق
  newRole?: string; // الدور الجديد للترقية
  
  // خصائص إضافية مفقودة للتوافق مع الاستخدامات
  userId?: number; // إضافة: معرف المستخدم
  source?: string; // إضافة: مصدر الرسالة لأغراض السجلات
  
  // خصائص النقاط
  points?: number; // عدد النقاط
  senderName?: string; // اسم مرسل النقاط
  receiverName?: string; // اسم مستقبل النقاط
  oldLevel?: number; // المستوى القديم
  newLevel?: number; // المستوى الجديد
  levelInfo?: any; // معلومات المستوى
  
  // خصائص Broadcast Room الجديدة
  roomId?: string; // معرف الغرفة
  hostId?: number; // معرف المضيف
  speakers?: number[]; // قائمة المتحدثين
  micQueue?: number[]; // قائمة انتظار طلبات المايك
  requestUserId?: number; // معرف المستخدم الذي طلب المايك
  speakerId?: number; // معرف المتحدث
  speakerAction?: 'add' | 'remove'; // نوع عملية المتحدث
  queueAction?: 'join' | 'leave' | 'accept' | 'reject'; // نوع عملية طابور المايك
  
  // خصائص Wall Post
  post?: any; // بيانات المنشور
  postId?: number; // معرف المنشور
};

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

// أنواع بيانات الروم الموحدة
export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  createdBy: number;
  createdAt?: Date;
  isActive?: boolean;
  userCount?: number;
  maxUsers?: number;
  icon?: string;
  color?: string;
  // خصائص Broadcast Room
  isBroadcast?: boolean;
  hostId?: number | null;
  speakers?: number[];
  micQueue?: number[];
  // حقول إضافية للتوافق مع قاعدة البيانات
  type?: string;
  isPrivate?: boolean;
  password?: string;
  slug?: string;
  deletedAt?: Date;
  updatedAt?: Date;
  lastMessageAt?: Date;
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

// API Response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
