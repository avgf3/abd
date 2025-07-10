export interface ChatUser {
  id: number;
  username: string;
  userType: 'guest' | 'member' | 'owner';
  profileImage?: string;
  status?: string;
  gender?: string;
  age?: number;
  country?: string;
  relation?: string;
  isOnline: boolean;
  lastSeen?: Date;
  joinDate?: Date;
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
  type: 'auth' | 'publicMessage' | 'privateMessage' | 'typing' | 'userJoined' | 'userLeft' | 'newMessage' | 'onlineUsers' | 'userUpdated';
  userId?: number;
  username?: string;
  content?: string;
  messageType?: string;
  receiverId?: number;
  isTyping?: boolean;
  user?: ChatUser;
  users?: ChatUser[];
  message?: ChatMessage;
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
