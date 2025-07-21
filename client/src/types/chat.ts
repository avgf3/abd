export interface ChatUser {
  id: number;
  username: string;
  userType: 'guest' | 'member' | 'owner' | 'admin' | 'moderator';
  role: 'guest' | 'member' | 'owner' | 'admin' | 'moderator';
  profileImage?: string;
  profileBanner?: string;
  profileBackgroundColor: string;
  status?: string;
  gender?: string;
  age?: number;
  country?: string;
  relation?: string;
  bio?: string;
  isOnline: boolean;
  isHidden: boolean;
  lastSeen: Date | null;
  joinDate: Date;
  createdAt: Date;
  isMuted: boolean;
  muteExpiry: Date | null;
  isBanned: boolean;
  banExpiry: Date | null;
  isBlocked: boolean;
  isKicked?: boolean;
  ipAddress?: string;
  deviceId?: string;
  ignoredUsers: number[];
  usernameColor: string;
  userTheme: string;
  profileEffect: string;
  points: number;
  level: number;
  totalPoints: number;
  levelProgress: number;
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
        'userVisibilityChanged' | 'usernameColorChanged' | 'profileEffectChanged' | 'theme_update' | 'moderationAction' | 'notification' | 'systemMessage' | 'kicked' | 'blocked' | 
        'friendRequest' | 'friendRequestAccepted' | 'promotion' | 'pointsReceived' | 'pointsTransfer' | 'pointsAdded' | 'levelUp';
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
  
  // خصائص النقاط
  points?: number; // عدد النقاط
  senderName?: string; // اسم مرسل النقاط
  receiverName?: string; // اسم مستقبل النقاط
  oldLevel?: number; // المستوى القديم
  newLevel?: number; // المستوى الجديد
  levelInfo?: any; // معلومات المستوى
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
