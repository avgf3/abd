import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProfileImage from './ProfileImage';
import EmojiPicker from './EmojiPicker';
import { getFinalUsernameColor } from '@/utils/themeUtils';
import { findMentions, playMentionSound, renderMessageWithMentions, insertMention } from '@/utils/mentionUtils';
import type { ChatMessage, ChatUser } from '@/types/chat';

interface MessageAreaProps {
  messages: ChatMessage[];
  currentUser: ChatUser | null;
  onSendMessage: (content: string, messageType?: string) => void;
  onTyping: () => void;
  typingUsers: Set<string>;
  onReportMessage?: (user: ChatUser, messageContent: string, messageId: number) => void;
  onUserClick?: (event: React.MouseEvent, user: ChatUser) => void;
  onlineUsers?: ChatUser[]; // إضافة قائمة المستخدمين المتصلين للمنشن
  currentRoomName?: string; // اسم الغرفة الحالية
}

export default function MessageArea({ 
  messages, 
  currentUser, 
  onSendMessage, 
  onTyping,
  typingUsers,
  onReportMessage,
  onUserClick,
  onlineUsers = [],
  currentRoomName = 'الدردشة العامة'
}: MessageAreaProps) {
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // تشغيل صوت التنبيه عند استقبال منشن
  useEffect(() => {
    if (messages.length > 0 && currentUser) {
      const lastMessage = messages[messages.length - 1];
      
      // فحص إذا كانت الرسالة الأخيرة تحتوي على منشن للمستخدم الحالي
      // وليست من المستخدم الحالي نفسه
      if (lastMessage.sender?.id !== currentUser.id && 
          lastMessage.content.includes(currentUser.username)) {
        playMentionSound();
      }
    }
  }, [messages, currentUser]);

  const handleSendMessage = () => {
    if (messageText.trim() && currentUser) {
      // إرسال الرسالة
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

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
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

  // معالج النقر على اسم المستخدم لإدراج المنشن
  const handleUsernameClick = (event: React.MouseEvent, user: ChatUser) => {
    event.stopPropagation();
    
    // إدراج اسم المستخدم في مربع النص
    insertMention(messageText, user.username, setMessageText);
    
    // التركيز على مربع النص
    const inputElement = document.querySelector('input[placeholder="اكتب رسالتك هنا..."]') as HTMLInputElement;
    if (inputElement) {
      inputElement.focus();
    }
  };

  return (
    <section className="flex-1 flex flex-col bg-white">
      {/* Room Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <span className="text-primary font-bold">💬</span>
          </div>
          <div>
            <h2 className="font-bold text-lg text-primary">{currentRoomName}</h2>
            <p className="text-sm text-muted-foreground">
              {messages.length} رسالة • {typingUsers.size > 0 ? `${typingUsers.size} يكتب الآن...` : 'جاهز للدردشة'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto space-y-3 text-sm bg-gradient-to-b from-gray-50 to-white">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message bg-blue-50 border-r-4 ${getMessageBorderColor(message.sender?.userType)} animate-slide-up`}
          >
            <div className="flex items-start gap-3">
              {message.sender && (
                <ProfileImage 
                  user={message.sender} 
                  size="small" 
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {message.sender ? (
                    <span 
                      className="font-medium text-sm cursor-pointer hover:underline transition-all duration-300"
                                      style={{
                  color: getFinalUsernameColor(message.sender),
                  textShadow: getFinalUsernameColor(message.sender) ? `0 0 8px ${getFinalUsernameColor(message.sender)}40` : 'none',
                  filter: getFinalUsernameColor(message.sender) ? 'drop-shadow(0 0 2px rgba(255,255,255,0.3))' : 'none'
                }}
                      onClick={(e) => handleUsernameClick(e, message.sender!)}
                    >
                      {message.sender.username}
                      {/* إشارة المكتوم */}
                      {message.sender.isMuted && (
                        <span className="text-yellow-400 text-xs ml-1">🔇</span>
                      )}
                    </span>
                  ) : (
                    <span className="font-medium text-sm text-blue-600">مستخدم</span>
                  )}
                  {message.sender && getUserRankBadge(message.sender.userType, message.sender.username)}
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
                  <p className="text-gray-800">
                    {renderMessageWithMentions(message.content, currentUser, onlineUsers)}
                  </p>
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
        
        <div className="relative">
          <Button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="glass-effect text-gray-600 px-4 py-3 rounded-xl hover:bg-gray-200 transition-all duration-200" 
            title="الرموز التعبيرية"
          >
            😊
          </Button>
          
          {showEmojiPicker && (
            <EmojiPicker 
              onEmojiSelect={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
        </div>
        
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
