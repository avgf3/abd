import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { formatTime } from '@/utils/timeUtils';
import type { ChatUser, ChatMessage } from '@/types/chat';
import FileUploadButton from './FileUploadButton';
import EmojiPicker from './EmojiPicker';
import ProfileImage from './ProfileImage';
import UserRoleBadge from './UserRoleBadge';
import { getFinalUsernameColor, getUserThemeClasses, getUserThemeStyles } from '@/utils/themeUtils';
import { api } from '@/lib/queryClient';
import { scrollToBottom, handleAutoScroll } from '@/utils/scrollUtils';
import { handleImageUpload, formatFileMessage } from '@/utils/uploadUtils';


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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // ترتيب الرسائل حسب الوقت وإزالة التكرارات
  const sortedMessages = React.useMemo(() => {
    const uniqueMap = new Map<string, ChatMessage>();
    
    messages.forEach(msg => {
      const key = msg.id || `${msg.senderId}-${msg.content}-${msg.timestamp}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, msg);
      }
    });
    
    return Array.from(uniqueMap.values()).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [messages]);

  // تم نقل دالة scrollToBottom إلى utils/scrollUtils.ts لتجنب التكرار

  useEffect(() => {
    // استخدم الدالة الموحدة للتمرير التلقائي
    handleAutoScroll({
      messagesEndRef,
      messagesContainerRef,
      messageCount: sortedMessages.length,
      useContainer: true
    });
  }, [sortedMessages]);

  // Ensure we scroll on open as well
  useEffect(() => {
    if (isOpen) {
      // slight delay to allow layout to render
      const t = setTimeout(() => {
        scrollToBottom({
          messagesEndRef,
          messagesContainerRef,
          behavior: 'auto',
          useContainer: true
        });
      }, 0);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      onSendMessage(messageText.trim());
      setMessageText('');
      // Scroll after sending to keep the latest message in view
      setTimeout(() => {
        scrollToBottom({
          messagesEndRef,
          messagesContainerRef,
          behavior: 'smooth',
          useContainer: true
        });
      }, 0);
    }
  };

  const handleFileSelect = async (file: File, type: 'image' | 'video' | 'document') => {
    if (!currentUser) {
      alert('يجب تسجيل الدخول');
      return;
    }

    if (type === 'image') {
      await handleImageUpload(
        file,
        currentUser.id,
        user.id,
        onSendMessage,
        (error) => alert(error)
      );
    } else {
      // حالياً نعرض رسالة نصية للأنواع الأخرى إلى حين إضافة مسار رفع مرفقات خاص
      const fileMessage = formatFileMessage(file, type);
      onSendMessage(fileMessage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

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
      <DialogContent className="relative max-w-md max-h-[450px] bg-gradient-to-br from-secondary to-accent border-2 border-accent shadow-2xl overflow-hidden">
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
              <Button onClick={onClose} variant="ghost" className="px-2 py-1">✖️</Button>
            </div>
          </div>
        </DialogHeader>

        <div ref={messagesContainerRef} className="h-[250px] w-full p-4 overflow-y-auto">
          <div className="space-y-3">
            {sortedMessages.map((message, index) => {
              // تحديد المرسل بشكل صحيح
              const sender = message.sender || (message.senderId === currentUser?.id ? currentUser : user);
              const isImage = message.messageType === 'image' || (typeof message.content === 'string' && message.content.startsWith('data:image'));
              const key = message.id ?? `${message.senderId}-${message.timestamp}-${index}`;

              // Handle system message in a compact style similar to public area
              if (message.messageType === 'system') {
                return (
                  <div key={key} className="w-full flex items-center justify-between p-3 rounded-lg bg-white shadow-sm text-red-600">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold">النظام:</span>
                      <span className="truncate">{message.content}</span>
                    </div>
                    <span className="text-xs text-red-500 ml-2 whitespace-nowrap">{formatTime(message.timestamp)}</span>
                  </div>
                );
              }

              return (
                <div 
                  key={key}
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
            
            {sortedMessages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-4xl mb-3">✉️</div>
                <p className="text-lg font-medium">لا توجد رسائل</p>
                <p className="text-sm">ابدأ محادثة جديدة!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-accent bg-gradient-to-r from-secondary to-accent">
          <FileUploadButton 
            onFileSelect={handleFileSelect}
            disabled={false}
          />
          
          <div className="relative">
            <Button
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
            onKeyDown={handleKeyDown}
            placeholder="✉️ ارسال رسالة..."
            className="flex-1 bg-white border border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
          />
          <Button
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