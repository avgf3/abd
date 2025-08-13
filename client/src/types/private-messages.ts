import { ChatUser } from './chat';

// أنواع المحادثات
export type ConversationType = 'direct' | 'group';

// حالة الرسالة
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

// أنواع الرسائل
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker' | 'gif';

// حالة المشارك
export type ParticipantStatus = 'active' | 'left' | 'removed' | 'blocked';

// دور المشارك
export type ParticipantRole = 'member' | 'admin' | 'owner';

// المحادثة
export interface Conversation {
  id: number;
  type: ConversationType;
  name?: string;
  avatar?: string;
  createdBy?: number;
  settings?: Record<string, any>;
  lastMessageId?: number;
  lastMessageAt?: string;
  isEncrypted?: boolean;
  createdAt: string;
  updatedAt: string;
}

// مشارك في المحادثة
export interface ConversationParticipant {
  conversationId: number;
  userId: number;
  role: ParticipantRole;
  status: ParticipantStatus;
  lastReadMessageId?: number;
  lastReadAt?: string;
  notificationEnabled: boolean;
  isMuted: boolean;
  mutedUntil?: string;
  isPinned: boolean;
  pinnedAt?: string;
  isArchived: boolean;
  archivedAt?: string;
  joinedAt: string;
  leftAt?: string;
}

// رسالة خاصة
export interface PrivateMessage {
  id: number;
  conversationId: number;
  senderId: number;
  sender?: ChatUser;
  type: MessageType;
  content?: string;
  metadata?: Record<string, any>;
  attachments?: MessageAttachment[];
  replyToId?: number;
  replyTo?: {
    id: number;
    content?: string;
    type: MessageType;
    senderId: number;
    senderName: string;
  };
  forwardedFromId?: number;
  isEdited: boolean;
  editedAt?: string;
  editHistory?: Array<{
    content: string;
    editedAt: string;
  }>;
  isDeleted: boolean;
  deletedAt?: string;
  deletedFor?: number[];
  isEncrypted: boolean;
  encryptedContent?: string;
  status: MessageStatus;
  deliveredAt?: string;
  createdAt: string;
  expiresAt?: string;
  reactions?: MessageReaction[];
  readBy?: number[];
}

// مرفق الرسالة
export interface MessageAttachment {
  id: string;
  url: string;
  type: string;
  name: string;
  size: number;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    thumbnailDataUrl?: string;
    [key: string]: any;
  };
}

// تفاعل على الرسالة
export interface MessageReaction {
  reaction: string;
  userId: number;
  username?: string;
  createdAt?: string;
}

// محادثة مع تفاصيل إضافية
export interface ConversationWithDetails {
  conversation: Conversation;
  participant: ConversationParticipant;
  unreadCount: number;
  lastMessage?: {
    id: number;
    content?: string;
    type: MessageType;
    senderId: number;
    createdAt: string;
    sender?: {
      id: number;
      username: string;
      profileImage?: string;
    };
  };
  otherParticipants: Array<{
    id: number;
    username: string;
    profileImage?: string;
    isOnline?: boolean;
    lastSeen?: string;
  }>;
}

// مسودة رسالة
export interface MessageDraft {
  conversationId: number;
  userId: number;
  content: string;
  replyToId?: number;
  updatedAt: string;
}

// مؤشر الكتابة
export interface TypingIndicator {
  conversationId: number;
  user: {
    id: number;
    username: string;
    profileImage?: string;
  };
  isTyping: boolean;
}

// سجل المكالمة
export interface CallLog {
  id: number;
  conversationId: number;
  callerId: number;
  type: 'voice' | 'video';
  status: 'initiated' | 'ringing' | 'answered' | 'declined' | 'missed' | 'ended';
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
  duration?: number;
  participants: number[];
}

// إعدادات المحادثة للمستخدم
export interface UserConversationSettings {
  conversationId: number;
  notificationSound?: string;
  wallpaper?: string;
  theme?: string;
  fontSize?: 'small' | 'medium' | 'large';
  enterToSend?: boolean;
}

// حالة إرسال الرسالة
export interface SendMessageState {
  isLoading: boolean;
  error?: string;
  progress?: number; // للرفع
}

// فلاتر البحث
export interface MessageSearchFilters {
  conversationId?: number;
  senderId?: number;
  dateFrom?: Date;
  dateTo?: Date;
  hasAttachments?: boolean;
  messageType?: MessageType;
}