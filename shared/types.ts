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
}

export interface ChatMessage {
  id: number;
  senderId: number;
  receiverId?: number;
  content: string;
  messageType: 'text' | 'image';
  isPrivate: boolean;
  timestamp: Date;
  sender?: ChatUser;
}

export interface PrivateConversation {
  [userId: number]: ChatMessage[];
}

export interface Notification {
  id: number;
  userId: number;
  type: 'friend_request' | 'friend_accepted' | 'message' | 'system' | 'moderation';
  title: string;
  message: string;
  isRead: boolean;
  timestamp: Date;
  data?: any;
}

export interface WebSocketMessage {
  type: 'auth' | 'publicMessage' | 'privateMessage' | 'typing' | 'userJoined' | 
        'userLeft' | 'newMessage' | 'onlineUsers' | 'userUpdated' | 'error' | 
        'warning' | 'userVisibilityChanged' | 'usernameColorChanged' | 
        'theme_update' | 'moderationAction' | 'notification' | 'systemMessage' | 
        'kicked' | 'blocked' | 'friendRequest' | 'friendRequestAccepted' | 
        'friendRequestDeclined' | 'promotion' | 'demotion' | 'ban' | 'unban' | 
        'mute' | 'unmute';
  userId?: number;
  username?: string;
  content?: string;
  messageType?: 'text' | 'image';
  receiverId?: number;
  data?: any;
  timestamp?: Date;
  user?: ChatUser;
  users?: ChatUser[];
  message?: ChatMessage;
  notification?: Notification;
  reason?: string;
  duration?: number;
  targetUserId?: number;
  targetUsername?: string;
  moderatorId?: number;
  moderatorUsername?: string;
  newRole?: string;
  oldRole?: string;
  isPrivate?: boolean;
}

export interface FriendRequest {
  id: number;
  senderId: number;
  receiverId: number;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: Date;
  sender?: ChatUser;
  receiver?: ChatUser;
}

export interface ChatState {
  currentUser: ChatUser | null;
  onlineUsers: ChatUser[];
  publicMessages: ChatMessage[];
  privateConversations: PrivateConversation;
  notifications: Notification[];
  isConnected: boolean;
  isLoading: boolean;
  typingUsers: Set<string>;
  connectionError: string | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UserRegistration {
  username: string;
  password: string;
  email?: string;
  gender?: string;
  age?: number;
  country?: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface MessageInput {
  content: string;
  messageType: 'text' | 'image';
  receiverId?: number;
  isPrivate: boolean;
}