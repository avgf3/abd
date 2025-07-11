import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProfileImage from './ProfileImage';
import type { ChatMessage, ChatUser } from '@/types/chat';

interface MessageAreaProps {
  messages: ChatMessage[];
  currentUser: ChatUser | null;
  onSendMessage: (content: string, messageType?: string) => void;
  onTyping: () => void;
  typingUsers: Set<string>;
  onReportMessage?: (user: ChatUser, messageContent: string, messageId: number) => void;
  onUserClick?: (event: React.MouseEvent, user: ChatUser) => void;
}

export default function MessageArea({ 
  messages, 
  currentUser, 
  onSendMessage, 
  onTyping,
  typingUsers,
  onReportMessage,
  onUserClick
}: MessageAreaProps) {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (messageText.trim() && currentUser) {
      onSendMessage(messageText.trim());
      setMessageText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    } else {
      onTyping();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        onSendMessage(imageData, 'image');
      };
      reader.readAsDataURL(file);
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

  const getUserRankBadge = (userType?: string, username?: string) => {
    if (username === 'عبود') {
      return <span className="text-yellow-400 ml-1">👑</span>;
    }
    
    switch (userType) {
      case 'owner':
        return <span className="text-yellow-400 ml-1">👑</span>;
      case 'admin':
        return <span className="text-blue-400 ml-1">⭐</span>;
      case 'moderator':
        return <span className="text-green-400 ml-1">🛡️</span>;
      default:
        return null;
    }
  };

  const getMessageBorderColor = (userType?: string) => {
    switch (userType) {
      case 'owner':
        return 'border-r-yellow-400';
      case 'member':
        return 'border-r-blue-400';
      default:
        return 'border-r-green-400';
    }
  };

  return (
    <section className="flex-1 flex flex-col bg-gradient-to-br from-slate-800 via-slate-900 to-gray-900">
      <div className="flex-1 p-6 overflow-y-auto space-y-4 text-sm bg-gradient-to-br from-slate-800/70 via-slate-900/70 to-gray-900/70 backdrop-blur-sm">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300 group shadow-lg`}
          >
            <div className="flex items-start gap-4">
              {message.sender && (
                <ProfileImage 
                  user={message.sender} 
                  size="small" 
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {message.sender ? (
                    <span 
                      className="font-semibold text-sm text-blue-300 cursor-pointer hover:underline transition-colors"
                      onClick={(e) => onUserClick && onUserClick(e, message.sender!)}
                    >
                      <span className="text-lg mr-1">{getUserRankBadge(message.sender.userType, message.sender.username)}</span>
                      {message.sender.username}
                      {/* إشارة المكتوم */}
                      {message.sender.isMuted && (
                        <span className="text-yellow-400 text-xs ml-1">🔇</span>
                      )}
                    </span>
                  ) : (
                    <span className="font-semibold text-sm text-blue-300">مستخدم</span>
                  )}
                  <span className="text-xs text-blue-200 bg-blue-900/30 px-2 py-1 rounded-full">
                    🕐 {formatTime(message.timestamp)}
                  </span>
                </div>
                {message.messageType === 'image' ? (
                  <img
                    src={message.content}
                    alt="صورة من المحادثة"
                    className="rounded-xl max-w-xs shadow-lg cursor-pointer hover:shadow-xl transition-shadow border-2 border-white/20"
                  />
                ) : (
                  <p className="text-gray-100 text-base leading-relaxed">{message.content}</p>
                )}
              </div>
              
              {/* زر التبليغ */}
              {onReportMessage && message.sender && message.sender.id !== currentUser?.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReportMessage(message.sender!, message.content, message.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-200 bg-red-500/20 hover:bg-red-500/30 p-2 rounded-full transition-all duration-200"
                  title="إبلاغ عن هذه الرسالة"
                >
                  ⚠️
                </Button>
              )}
            </div>
          </div>
        ))}
        
        {typingUsers.size > 0 && (
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl border border-blue-400/30 backdrop-blur-sm">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-gradient-to-r from-pink-400 to-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm font-medium text-blue-200">
              ✍️ {Array.from(typingUsers).join(', ')} يكتب الآن...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="shrink-0 flex items-center gap-4 p-6 border-t border-white/10 bg-gradient-to-r from-slate-800/90 to-gray-900/90 backdrop-blur-xl">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <span className="text-lg">📷</span>
        </Button>
        
        <Button 
          className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105" 
          title="الرموز التعبيرية"
        >
          <span className="text-lg">😊</span>
        </Button>
        
        <Input
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="اكتب رسالتك هنا..."
          className="flex-1 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-gray-300 focus:bg-white/15 focus:border-white/30 transition-all duration-300 text-lg"
        />
        
        <Button
          onClick={handleSendMessage}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-4 rounded-2xl font-semibold flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <span className="text-lg">📤</span>
          <span className="text-lg">إرسال</span>
        </Button>
      </div>
    </section>
  );
}
