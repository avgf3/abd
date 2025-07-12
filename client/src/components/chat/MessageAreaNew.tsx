import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { ChatUser, ChatMessage } from '@/types/chat';

interface MessageAreaProps {
  messages: ChatMessage[];
  currentUser: ChatUser | null;
  onSendMessage: (content: string, type?: 'text' | 'image') => void;
  typingUsers: Set<string>;
  onTyping: (isTyping: boolean) => void;
}

export default function MessageArea({ 
  messages, 
  currentUser, 
  onSendMessage, 
  typingUsers, 
  onTyping 
}: MessageAreaProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    onSendMessage(newMessage.trim());
    setNewMessage('');
    handleStopTyping();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleStartTyping();
  };

  const handleStartTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      onTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 2000);
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      onTyping(false);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return format(new Date(timestamp), 'HH:mm', { locale: ar });
  };

  const getUserColor = (user: ChatUser) => {
    if (user.usernameColor) {
      return user.usernameColor;
    }
    
    // Default colors based on user type
    switch (user.userType) {
      case 'owner': return '#FFD700';
      case 'admin': return '#FF6B6B';
      case 'moderator': return '#4ECDC4';
      case 'member': return '#95E1D3';
      default: return '#FFFFFF';
    }
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'owner': return '👑';
      case 'admin': return '⭐';
      case 'moderator': return '🛡️';
      case 'member': return '👤';
      default: return '👤';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-800">
        <h2 className="text-xl font-bold">💬 الدردشة العامة</h2>
        <p className="text-sm text-gray-400">
          {messages.length} رسالة • {Array.from(typingUsers).length > 0 && `${Array.from(typingUsers).join(', ')} يكتب...`}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p>لا توجد رسائل بعد</p>
            <p className="text-sm">كن أول من يبدأ المحادثة!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex ${message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-md px-4 py-2 rounded-lg ${
                message.senderId === currentUser?.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-white'
              }`}>
                {message.senderId !== currentUser?.id && message.sender && (
                  <div className="flex items-center gap-2 mb-1">
                    <span>{getUserTypeIcon(message.sender.userType)}</span>
                    <span 
                      className="text-sm font-bold"
                      style={{ color: getUserColor(message.sender) }}
                    >
                      {message.sender.username}
                    </span>
                  </div>
                )}
                
                <div className="break-words">{message.content}</div>
                
                <div className="text-xs text-gray-300 mt-1">
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="text-sm text-gray-400 italic">
            {Array.from(typingUsers).join(', ')} يكتب...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="اكتب رسالتك هنا..."
            className="flex-1 bg-gray-700 border-gray-600 text-white"
            maxLength={500}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            إرسال
          </Button>
        </div>
        
        <div className="text-xs text-gray-400 mt-1">
          {newMessage.length}/500 حرف
        </div>
      </div>
    </div>
  );
}