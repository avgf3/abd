import type { ChatMessage } from '@/types/chat';

export function mapDbMessageToChatMessage(msg: any, fallbackRoomId?: string): ChatMessage {
	const isoTs = (msg.timestamp instanceof Date ? msg.timestamp.toISOString() : (msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString()));
	return {
		id: msg.id,
		content: msg.content,
		timestamp: isoTs,
		senderId: msg.senderId,
		sender: msg.sender,
		messageType: msg.messageType || 'text',
		isPrivate: Boolean(msg.isPrivate),
		roomId: msg.roomId || fallbackRoomId,
		clientMessageId: msg.clientMessageId,
	} as ChatMessage;
}

export function mapDbMessagesToChatMessages(messages: any[], fallbackRoomId?: string): ChatMessage[] {
	return messages
		.map((msg) => mapDbMessageToChatMessage(msg, fallbackRoomId))
		.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}