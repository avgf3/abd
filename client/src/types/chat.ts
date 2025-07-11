export interface ChatUser {
  id: number;
  username: string;
  userType: 'guest' | 'member' | 'owner' | 'admin' | 'moderator';
  profileImage?: string;
  status?: string;
  gender?: string;
  age?: number;
  country?: string;
  relation?: string;
  isOnline: boolean;
  isHidden?: boolean; // خاصية الإخفاء للمراقبة
  lastSeen?: Date;
  joinDate?: Date;
  isMuted?: boolean;
  isKicked?: boolean;
  isBlocked?: boolean;
  ignoredUsers?: string[]; // قائمة المستخدمين المتجاهلين
  usernameColor?: string; // لون اسم المستخدم
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
  type: 'auth' | 'publicMessage' | 'privateMessage' | 'typing' | 'userJoined' | 'userLeft' | 'newMessage' | 'onlineUsers' | 'userUpdated' | 'error' | 'warning';
  userId?: number;
  username?: string;
  content?: string;
  messageType?: string;
  receiverId?: number;
  isTyping?: boolean;
  user?: ChatUser;
  users?: ChatUser[];
  message?: ChatMessage;
  action?: string;
}

export interface UserProfile {
  name: string;
  status: string;
  gender: string;
  age: string;
  country: string;
  relation: string;
  profileImage?: string;
}
