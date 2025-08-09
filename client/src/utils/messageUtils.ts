import type { ChatMessage } from '@/types/chat';

export function mapDbMessageToChatMessage(msg: any, fallbackRoomId?: string): ChatMessage {
  return {
    id: msg.id,
    content: msg.content,
    timestamp: new Date(msg.timestamp),
    senderId: msg.senderId,
    sender: msg.sender,
    messageType: msg.messageType || 'text',
    isPrivate: msg.isPrivate || false,
    roomId: msg.roomId || fallbackRoomId,
  } as ChatMessage;
}

export function mapDbMessagesToChatMessages(messages: any[], fallbackRoomId?: string): ChatMessage[] {
  return messages.map((msg) => mapDbMessageToChatMessage(msg, fallbackRoomId));
}