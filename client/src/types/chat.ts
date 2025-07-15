export interface ChatUser {
  id: number;
  username: string;
  userType: 'guest' | 'member' | 'owner' | 'admin' | 'moderator';
  role?: 'guest' | 'member' | 'owner' | 'admin' | 'moderator'; // نفس userType للتوافق
  profileImage?: string;
  profileBanner?: string;
  profileBackgroundColor?: string; // لون خلفية البروفايل
  status?: string;
  gender?: string;
  age?: number;
  country?: string;
  relation?: string;
  bio?: string;
  isOnline: boolean;
  isHidden?: boolean; // خاصية الإخفاء للمراقبة
  lastSeen?: Date;
  joinDate?: Date;
  createdAt?: Date; // تاريخ الإنشاء
  isMuted?: boolean;
  isKicked?: boolean;
  isBlocked?: boolean;
  isBanned?: boolean; // حالة الحظر
  ignoredUsers?: string[]; // قائمة المستخدمين المتجاهلين
  usernameColor?: string;
  userTheme?: string; // لون اسم المستخدم
}

export interface ChatMessage {
  id: number;
  senderId: number;
  receiverId?: number;
  content: string;
  messageType: 'text' | 'image';
  isPrivate: boolean;
  timestamp?: Date;
  sender?: ChatUser;
}

export interface PrivateConversation {
  [userId: number]: ChatMessage[];
}

export interface WebSocketMessage {
  type: 'auth' | 'publicMessage' | 'privateMessage' | 'typing' | 'userJoined' | 'userLeft' | 'newMessage' | 'onlineUsers' | 'userUpdated' | 'error' | 'warning' |
        'userVisibilityChanged' | 'usernameColorChanged' | 'theme_update' | 'moderationAction' | 'notification' | 'systemMessage' | 'kicked' | 'blocked' | 
        'friendRequest' | 'friendRequestAccepted' | 'promotion';
  userId?: number;
  username?: string;
  content?: string;
  messageType?: string;
  receiverId?: number;
  isTyping?: boolean;
  user?: ChatUser;
  users?: ChatUser[];
  message?: ChatMessage | string; // يمكن أن يكون string أيضاً
  action?: string;
  
  // خصائص إضافية للوظائف المختلفة
  isHidden?: boolean; // لرؤية المستخدم
  color?: string; // لتغيير لون اسم المستخدم
  userTheme?: string; // لموضوع المستخدم
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
}

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
