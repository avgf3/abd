import type { ChatMessage } from '@/types/chat';

export function mapDbMessageToChatMessage(msg: any, fallbackRoomId?: string): ChatMessage {
  return {
    id: msg.id,
    content: msg.content,
    timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp ?? Date.now()),
    senderId: msg.senderId,
    sender: msg.sender,
    messageType: msg.messageType || 'text',
    isPrivate: Boolean(msg.isPrivate),
    roomId: msg.roomId || fallbackRoomId,
  } as ChatMessage;
}

export function mapDbMessagesToChatMessages(messages: any[], fallbackRoomId?: string): ChatMessage[] {
  return messages.map((msg) => mapDbMessageToChatMessage(msg, fallbackRoomId));
}