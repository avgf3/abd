import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getImageSrc } from '@/utils/imageUtils';
import { formatTime } from '@/utils/timeUtils';
import type { ChatUser, ChatMessage } from '@/types/chat';
import FileUploadButton from './FileUploadButton';
import EmojiPicker from './EmojiPicker';
import { getUserLevelIcon } from './UserRoleBadge';
import ProfileImage from './ProfileImage';
import UserRoleBadge from './UserRoleBadge';
import { getFinalUsernameColor, getUserThemeClasses, getUserThemeStyles } from '@/utils/themeUtils';


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
    if (type === 'image') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl && dataUrl.startsWith('data:image')) {
          onSendMessage(dataUrl);
        }
      };
      reader.onerror = () => {
        alert('فشل في قراءة الملف');
      };
      reader.readAsDataURL(file);
      return;
    }

    // حالياً نعرض رسالة نصية للأنواع الأخرى إلى حين إضافة مسار رفع مرفقات خاص
    let fileMessage = '';
    switch (type) {
      case 'video':
        fileMessage = `🎥 فيديو: ${file.name}`;
        break;
      default:
        fileMessage = `📄 مستند: ${file.name}`;
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

  // تم نقل دالة formatTime إلى utils/timeUtils.ts

  if (!isOpen) return null;

  // محاكاة لون حد الرسالة حسب رتبة المرسل كما في الغرف
  const getMessageBorderColor = (userType?: string) => {
    switch (userType) {
      case 'owner':
        return 'border-r-yellow-400';
      case 'admin':
        return 'border-r-red-400';
      case 'moderator':
        return 'border-r-purple-400';
      case 'member':
        return 'border-r-blue-400';
      default:
        return 'border-r-green-400';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="relative max-w-md max-h-[450px] bg-gradient-to-br from-secondary to-accent border-2 border-accent shadow-2xl">
        <DialogHeader className="border-b border-accent p-2">
          <div
            className={`flex items-center gap-2 px-2 py-1 rounded-none ${getUserThemeClasses(user)}`}
            style={{ ...getUserThemeStyles(user) }}
          >
            <ProfileImage user={user} size="small" className="" hideRoleBadgeOverlay={true} />
            <span
              className="text-base font-medium truncate"
              style={{ color: getFinalUsernameColor(user) }}
              title={user.username}
            >
              {user.username}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <UserRoleBadge user={user} showOnlyIcon={true} />
              <Button type="button" onClick={onClose} variant="ghost" className="px-2 py-1">✖️</Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[250px] w-full p-4">
          <div className="space-y-3">
            {messages.map((message, index) => {
              const sender = message.sender || (message.senderId === currentUser?.id ? currentUser! : user);
              const isImage = message.messageType === 'image' || (typeof message.content === 'string' && message.content.startsWith('data:image'));
              return (
                <div 
                  key={message.id ?? `${message.senderId}-${index}`}
                  className={`flex items-center gap-3 p-3 rounded-lg border-r-4 ${getMessageBorderColor(sender?.userType)} bg-white shadow-sm hover:shadow-md transition-shadow duration-200`}
                >
                  {sender && (
                    <div className="flex-shrink-0">
                      <ProfileImage 
                        user={sender} 
                        size="small"
                        className="cursor-pointer"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {sender && <UserRoleBadge user={sender} showOnlyIcon={true} />}
                    <span
                      className="font-semibold truncate"
                      style={{ color: getFinalUsernameColor(sender) }}
                    >
                      {sender?.username || 'مجهول'}
                    </span>
                    <div className="text-gray-800 break-words flex-1">
                      {isImage ? (
                        <img
                          src={message.content}
                          alt="صورة"
                          className="max-h-28 rounded cursor-pointer"
                          loading="lazy"
                          onClick={() => window.open(message.content, '_blank')}
                        />
                      ) : (
                        <span>{message.content}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{formatTime(message.timestamp)}</span>
                  </div>
                </div>
              );
            })}
            
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

        <div className="flex gap-2 p-4 border-t border-accent bg-gradient-to-r from-secondary to-accent">
          <FileUploadButton 
            onFileSelect={handleFileSelect}
            disabled={false}
          />
          
          <div className="relative">
            <Button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 rounded-lg"
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="✉️ ارسال رسالة..."
            className="flex-1 bg-white border border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
          />
          <Button
            type="button"
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium"
          >
            ✉️ ارسال
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}