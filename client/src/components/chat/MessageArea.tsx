import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SimpleUserMenu from './SimpleUserMenu';
import type { ChatMessage, ChatUser } from '@/types/chat';

interface MessageAreaProps {
  messages: ChatMessage[];
  currentUser: ChatUser | null;
  onSendMessage: (content: string, messageType?: string) => void;
  onTyping: () => void;
  typingUsers: Set<string>;
  onReportMessage?: (user: ChatUser, messageContent: string, messageId: number) => void;
}

export default function MessageArea({ 
  messages, 
  currentUser, 
  onSendMessage, 
  onTyping,
  typingUsers,
  onReportMessage
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

  const getUserRankBadge = (userType?: string) => {
    switch (userType) {
      case 'owner':
        return <span className="user-rank crown">مالك</span>;
      case 'member':
        return <span className="user-rank star">عضو</span>;
      default:
        return <span className="user-rank shield">زائر</span>;
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
    <section className="flex-1 flex flex-col bg-white">
      <div className="flex-1 p-6 overflow-y-auto space-y-3 text-sm bg-gradient-to-b from-gray-50 to-white">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message bg-blue-50 border-r-4 ${getMessageBorderColor(message.sender?.userType)} animate-slide-up`}
          >
            <div className="flex items-start gap-3">
              <img
                src={message.sender?.profileImage || "/default_avatar.svg"}
                alt="صورة المستخدم"
                className="w-8 h-8 rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/default_avatar.svg';
                }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {message.sender ? (
                    <SimpleUserMenu
                      targetUser={message.sender}
                      currentUser={currentUser}
                      messageId={message.id}
                    >
                      <span className="font-semibold text-blue-600 cursor-pointer hover:underline">
                        {message.sender.username}
                        {/* إشارة المكتوم */}
                        {message.sender.isMuted && (
                          <span className="text-yellow-400 text-xs ml-1">🔇</span>
                        )}
                      </span>
                    </SimpleUserMenu>
                  ) : (
                    <span className="font-semibold text-blue-600">مستخدم</span>
                  )}
                  {message.sender && getUserRankBadge(message.sender.userType)}
                  <span className="text-xs text-gray-500">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                {message.messageType === 'image' ? (
                  <img
                    src={message.content}
                    alt="صورة من المحادثة"
                    className="rounded-lg max-w-xs shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                  />
                ) : (
                  <p className="text-gray-800">{message.content}</p>
                )}
              </div>
              
              {/* زر التبليغ */}
              {onReportMessage && message.sender && message.sender.id !== currentUser?.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReportMessage(message.sender!, message.content, message.id)}
                  className="text-gray-400 hover:text-red-500 p-1"
                  title="إبلاغ عن هذه الرسالة"
                >
                  🚩
                </Button>
              )}
            </div>
          </div>
        ))}
        
        {typingUsers.size > 0 && (
          <div className="text-sm text-muted-foreground italic">
            {Array.from(typingUsers).join(', ')} يكتب...
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="shrink-0 flex items-center gap-3 p-4 border-t border-gray-200 bg-gray-50">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary text-white px-4 py-3 rounded-xl flex items-center gap-2"
        >
          📷
        </Button>
        
        <Button 
          className="glass-effect text-gray-600 px-4 py-3 rounded-xl hover:bg-gray-200 transition-all duration-200" 
          title="الرموز التعبيرية"
        >
          😊
        </Button>
        
        <Input
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="اكتب رسالتك هنا..."
          className="flex-1 px-4 py-3 rounded-xl bg-white border border-gray-300 text-gray-800 placeholder:text-gray-500"
        />
        
        <Button
          onClick={handleSendMessage}
          className="btn-success text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2"
        >
          📤
          إرسال
        </Button>
      </div>
    </section>
  );
}
