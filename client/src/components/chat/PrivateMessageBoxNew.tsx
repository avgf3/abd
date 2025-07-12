import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { ChatUser, ChatMessage } from '@/types/chat';

interface PrivateMessageBoxProps {
  targetUser: ChatUser;
  currentUser: ChatUser | null;
  messages: ChatMessage[];
  onSendMessage: (content: string, type?: 'text' | 'image') => void;
  onClose: () => void;
}

export default function PrivateMessageBox({ 
  targetUser, 
  currentUser, 
  messages, 
  onSendMessage, 
  onClose 
}: PrivateMessageBoxProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    onSendMessage(newMessage.trim());
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return format(new Date(timestamp), 'HH:mm', { locale: ar });
  };

  const getUserColor = (user: ChatUser) => {
    if (user.usernameColor) {
      return user.usernameColor;
    }
    
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {targetUser.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span>{getUserTypeIcon(targetUser.userType)}</span>
                <span 
                  className="font-bold"
                  style={{ color: getUserColor(targetUser) }}
                >
                  {targetUser.username}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                {targetUser.isOnline ? 'متصل الآن' : 'غير متصل'}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              <p>لا توجد رسائل بعد</p>
              <p className="text-sm">ابدأ محادثة مع {targetUser.username}</p>
            </div>
          ) : (
            messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-sm px-4 py-2 rounded-lg ${
                  message.senderId === currentUser?.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-white'
                }`}>
                  <div className="break-words">{message.content}</div>
                  <div className="text-xs text-gray-300 mt-1">
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`اكتب رسالة إلى ${targetUser.username}...`}
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
    </div>
  );
}