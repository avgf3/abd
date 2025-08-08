import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getImageSrc } from '@/utils/imageUtils';
import type { ChatUser, ChatMessage } from '@/types/chat';
import FileUploadButton from './FileUploadButton';
import EmojiPicker from './EmojiPicker';


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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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

  const handleFileSelect = (file: File, type: 'image' | 'video' | 'document') => {
    const fileUrl = URL.createObjectURL(file);
    let fileMessage = '';
    
    switch (type) {
      case 'image':
        fileMessage = `📷 صورة: ${file.name}`;
        break;
      case 'video':
        fileMessage = `🎥 فيديو: ${file.name}`;
        break;
      case 'document':
        fileMessage = `📄 مستند: ${file.name}`;
        break;
    }
    
    onSendMessage(fileMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
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
      {/* Simplify and neutralize the dialog styling to match other lists */}
      <DialogContent className="max-w-md max-h-[450px] bg-white border shadow-lg rounded-lg">
        {/* Header */}
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-semibold text-center text-foreground flex items-center justify-center gap-3">
            <div className="relative">
              <img
                src={getImageSrc(user.profileImage)}
                alt="صورة المستخدم"
                className="w-12 h-12 rounded-full border border-gray-300 shadow-sm"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/default_avatar.svg';
                }}
              />
              {user.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
              )}
            </div>
            <div className="text-center">
              <p className="font-bold text-base text-foreground">{user.username}</p>
              <p className="text-xs text-muted-foreground font-medium">
                {user.userType === 'owner' && 'مالك'}
                {user.userType === 'admin' && 'إدمن'}
                {user.userType === 'moderator' && 'مشرف'}
              </p>
              <p className={`text-xs font-medium ${user.isOnline ? 'text-green-600' : 'text-muted-foreground'}`}>
                {user.isOnline ? 'متصل الآن' : 'غير متصل'}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        <ScrollArea className="h-[250px] w-full p-4">
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div 
                key={`${message.id}-${message.senderId}-${index}`}
                className={`flex ${message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-3 rounded-lg shadow-sm ${
                  message.senderId === currentUser?.id 
                    ? 'bg-muted text-foreground rounded-br-sm border'
                    : 'bg-white text-foreground rounded-bl-sm border'
                }`}>
                  {message.senderId !== currentUser?.id && (
                    <div className="flex items-center gap-2 mb-2">
                      <img
                        src={getImageSrc(message.sender?.profileImage)}
                        alt={message.sender?.username || 'User'}
                        className="w-6 h-6 rounded-full object-cover border border-gray-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/default_avatar.svg';
                        }}
                      />
                      <span 
                        className="text-xs font-medium text-muted-foreground"
                        style={{ color: message.sender?.usernameColor || undefined }}
                      >
                        {message.sender?.username || 'مجهول'}
                      </span>
                    </div>
                  )}
                  <div className="text-sm font-medium mb-1">
                    {message.content}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-4xl mb-3">✉️</div>
                <p className="text-lg font-medium">لا توجد رسائل</p>
                <p className="text-sm">ابدأ محادثة جديدة!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Composer */}
        <div className="flex gap-2 p-4 border-t bg-background/50">
          <FileUploadButton 
            onFileSelect={handleFileSelect}
            disabled={false}
          />
          
          <div className="relative">
            <Button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              variant="outline"
              size="sm"
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
            placeholder="اكتب رسالة..."
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
          >
            ارسال
          </Button>
        </div>
        
        <div className="flex justify-center pt-2 pb-4">
          <Button 
            onClick={onClose} 
            variant="outline"
            className="px-6"
          >
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}