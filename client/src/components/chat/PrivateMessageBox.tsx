import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatUser, ChatMessage } from '@/types/chat';

interface PrivateMessageBoxProps {
  isOpen: boolean;
  user: ChatUser;
  currentUser: ChatUser | null;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onClose: () => void;
}

export default function PrivateMessageBox({
  isOpen,
  user,
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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xs max-h-[360px] bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 shadow-2xl">
        <DialogHeader className="border-b border-purple-200 pb-1 px-2">
          <DialogTitle className="text-xs font-bold text-center text-purple-800 flex items-center justify-center gap-1 py-1">
            <img
              src={user.profileImage || "/default_avatar.svg"}
              alt="صورة المستخدم"
              className="w-5 h-5 rounded-full border border-purple-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/default_avatar.svg';
              }}
            />
            <span className="font-bold text-purple-800 text-xs">{user.username}</span>
            <span className="text-xs">
              {user.userType === 'owner' && '👑'}
              {user.userType === 'admin' && '🛡️'}
              {user.userType === 'moderator' && '⚖️'}
              {user.userType === 'member' && '👤'}
              {user.userType === 'guest' && '👋'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[260px] w-full p-2">
          <div className="space-y-2">
            {messages.map((message, index) => (
              <div 
                key={`${message.id}-${message.senderId}-${index}`}
                className={`flex ${message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] p-2 rounded-lg shadow-sm ${
                  message.senderId === currentUser?.id 
                    ? 'bg-purple-500 text-white rounded-br-sm' 
                    : 'bg-white text-gray-800 rounded-bl-sm border border-purple-200'
                }`}>
                  <div className="text-xs font-medium mb-0.5">
                    {message.content}
                  </div>
                  <div className={`text-xs ${
                    message.senderId === currentUser?.id ? 'text-purple-100' : 'text-gray-500'
                  }`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            
            {messages.length === 0 && (
              <div className="text-center py-6 text-purple-400">
                <div className="text-2xl mb-2">✉️</div>
                <p className="text-sm font-medium">لا توجد رسائل</p>
                <p className="text-xs">ابدأ محادثة!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="flex gap-1.5 p-2 border-t border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="رسالة..."
            className="flex-1 bg-white border-purple-300 text-gray-800 placeholder:text-purple-400 focus:border-purple-500 text-xs h-8"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs h-8"
          >
            ✉️
          </Button>
          <Button 
            onClick={onClose} 
            variant="outline" 
            className="bg-white border-purple-300 text-purple-700 hover:bg-purple-100 px-2 text-xs h-8"
          >
            ✖️
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}