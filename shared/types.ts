// Extended types for the chat application
export interface ExtendedUser {
  id: number;
  username: string;
  profileImage?: string;
  profileBanner?: string;
  userType: 'guest' | 'member' | 'admin' | 'owner';
  isOnline: boolean;
  usernameColor?: string;
  userTheme?: string;
  status?: string;
  gender?: string;
  age?: number;
  country?: string;
  relation?: string;
  lastSeen?: Date;
  joinDate?: Date;
  isHidden?: boolean;
  isMuted?: boolean;
  isBanned?: boolean;
  isBlocked?: boolean;
  ignoredUsers?: string[];
}

export interface ExtendedMessage {
  id: number;
  senderId: number | null;
  receiverId?: number | null;
  content: string;
  messageType: 'text' | 'image' | 'file';
  isPrivate: boolean;
  timestamp: Date;
  sender?: ExtendedUser;
  senderName?: string;
}