import type { ChatMessage, ChatUser } from '@/types/chat';
import { getFinalUsernameColor } from '@/utils/themeUtils';

export function mapDbMessageToChatMessage(msg: any, fallbackRoomId?: string): ChatMessage {
  const isoTs =
    msg.timestamp instanceof Date
      ? msg.timestamp.toISOString()
      : msg.timestamp
        ? new Date(msg.timestamp).toISOString()
        : new Date().toISOString();
  // Prefer snapshot first, then full sender object, then neutral fallback
  const snapshotSender =
    msg.senderUsernameSnapshot && msg.senderId
      ? {
          id: msg.senderId,
          username: msg.senderUsernameSnapshot,
          userType: msg.senderUserTypeSnapshot || 'guest',
          role: (msg.senderUserTypeSnapshot as any) || 'guest',
          profileImage: msg.senderProfileImageSnapshot || undefined,
          usernameColor: msg.senderUsernameColorSnapshot || undefined,
          isOnline: false,
        }
      : undefined;
  const finalSender = snapshotSender || msg.sender || (msg.senderId
    ? {
        id: msg.senderId,
        username: `مستخدم #${msg.senderId}`,
        userType: 'guest',
        role: 'guest',
        isOnline: false,
      }
    : undefined);

  return {
    id: msg.id,
    content: msg.content,
    timestamp: isoTs,
    senderId: msg.senderId,
    sender: finalSender,
    messageType: msg.messageType || 'text',
    isPrivate: Boolean(msg.isPrivate),
    roomId: msg.roomId || fallbackRoomId,
    reactions: msg.reactions || msg.reactionCounts || { like: 0, dislike: 0, heart: 0 },
    myReaction: msg.myReaction ?? null,
  } as ChatMessage;
}

export function mapDbMessagesToChatMessages(
  messages: any[],
  fallbackRoomId?: string
): ChatMessage[] {
  return messages
    .map((msg) => mapDbMessageToChatMessage(msg, fallbackRoomId))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// Ensure ascending order by timestamp without mutating the original array
export function sortMessagesAscending(messages: ChatMessage[]): ChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  return messages
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// Consistent border color derived from username color with safe fallback
export function getDynamicBorderColor(sender?: ChatUser | null): string {
  if (!sender) return '#4ade80';
  const color = getFinalUsernameColor(sender);
  return color === '#000000' ? '#4ade80' : color;
}

// Truncate long message content for previews
export function formatMessagePreview(content: string, maxLength: number = 100): string {
  if (!content) return '';
  return content.length > maxLength ? content.slice(0, maxLength) + '…' : content;
}

// LocalStorage helpers to track last-opened timestamp for private conversations
function pmLastOpenedKey(currentUserId: number, otherUserId: number): string {
  return `pm_last_opened_${currentUserId}_${otherUserId}`;
}

export function getPmLastOpened(currentUserId: number, otherUserId: number): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(pmLastOpenedKey(currentUserId, otherUserId));
    const num = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(num) ? num : 0;
  } catch {
    return 0;
  }
}

export function setPmLastOpened(
  currentUserId: number,
  otherUserId: number,
  timestamp: number = Date.now()
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(pmLastOpenedKey(currentUserId, otherUserId), String(timestamp));
  } catch {
    // ignore storage errors
  }
}
