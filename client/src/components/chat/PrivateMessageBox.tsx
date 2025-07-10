import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChatUser, ChatMessage } from '@/types/chat';

interface PrivateMessageBoxProps {
  targetUser: ChatUser;
  currentUser: ChatUser | null;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onClose: () => void;
}

export default function PrivateMessageBox({
  targetUser,
  currentUser,
  messages,
  onSendMessage,
  onClose
}: PrivateMessageBoxProps) {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      onSendMessage(messageText.trim());
      setMessageText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="private-message-box animate-slide-up">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span>✉️</span>
          <span className="font-semibold">رسالة إلى {targetUser.username}</span>
        </div>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-white"
        >
          ❌
        </Button>
      </div>
      
      <div className="max-h-32 overflow-y-auto bg-accent rounded-lg p-3 mb-4 space-y-2">
        {messages.map((message, index) => (
          <div key={`${message.id}-${message.senderId}-${index}`} className="text-sm">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <span className="font-semibold">
                {message.senderId === currentUser?.id ? 'أنت' : targetUser.username}
              </span>
              <span>{formatTime(message.timestamp)}</span>
            </div>
            <div className="text-white">{message.content}</div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm">
            ✉️ اكتب رسالتك
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="flex gap-2">
        <Input
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="اكتب رسالتك..."
          className="flex-1 bg-accent border-border text-white placeholder:text-muted-foreground"
        />
        <Button
          onClick={handleSendMessage}
          className="btn-success"
          size="sm"
        >
          📤
        </Button>
      </div>
    </div>
  );
}
