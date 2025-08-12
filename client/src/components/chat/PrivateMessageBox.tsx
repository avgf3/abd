import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
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

// مكون محسن للرسالة الواحدة
const MessageItem = memo(({ 
  message, 
  currentUser, 
  user, 
  index 
}: { 
  message: ChatMessage; 
  currentUser: ChatUser | null; 
  user: ChatUser; 
  index: number;
}) => {
  // معالجة آمنة للمرسل
  const sender = useMemo(() => {
    if (message.sender && typeof message.sender === 'object' && message.sender.id) {
      return message.sender;
    }
    
    if (message.senderId === currentUser?.id && currentUser) {
      return currentUser;
    }
    
    if (message.senderId === user?.id && user) {
      return user;
    }
    
    // fallback آمن
    return {
      id: message.senderId || 0,
      username: 'مستخدم مجهول',
      userType: 'guest' as const,
      profileImage: undefined,
      isOnline: false
    };
  }, [message.sender, message.senderId, currentUser, user]);

  // فحص آمن للصور
  const isImage = useMemo(() => {
    if (message.messageType === 'image') return true;
    if (typeof message.content === 'string' && message.content.startsWith('data:image/')) {
      return true;
    }
    return false;
  }, [message.messageType, message.content]);

  // التحقق من صحة URL للصور
  const isValidImageUrl = useCallback((url: string): boolean => {
    try {
      // فحص أن الـ URL يبدأ بـ data:image أو http/https
      if (url.startsWith('data:image/')) {
        return true;
      }
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const urlObj = new URL(url);
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => 
          urlObj.pathname.toLowerCase().endsWith(`.${ext}`)
        );
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // معالج آمن لفتح الصور
  const handleImageClick = useCallback((imageUrl: string) => {
    if (!isValidImageUrl(imageUrl)) {
      console.warn('رابط صورة غير آمن:', imageUrl);
      return;
    }
    
    try {
      // استخدام window.open بطريقة آمنة
      const newWindow = window.open();
      if (newWindow) {
        newWindow.opener = null; // منع الوصول للنافذة الأصلية
        newWindow.location.href = imageUrl;
      }
    } catch (error) {
      console.error('خطأ في فتح الصورة:', error);
    }
  }, [isValidImageUrl]);

  // تنظيف محتوى النص من HTML tags
  const sanitizeContent = useCallback((content: string): string => {
    if (!content || typeof content !== 'string') return '';
    
    // إزالة HTML tags وتنظيف النص
    return content
      .replace(/<[^>]*>/g, '') // إزالة HTML tags
      .replace(/javascript:/gi, '') // إزالة javascript links
      .replace(/on\w+\s*=/gi, '') // إزالة event handlers
      .trim();
  }, []);

  const getMessageBorderColor = useCallback((userType?: string) => {
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
  }, []);

  return (
    <div 
      key={`${message.id}-${message.senderId}-${index}`}
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
          {isImage && isValidImageUrl(message.content) ? (
            <img
              src={message.content}
              alt="صورة مرسلة"
              className="max-h-28 rounded cursor-pointer transition-transform hover:scale-105"
              loading="lazy"
              onClick={() => handleImageClick(message.content)}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                // إضافة نص بديل
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = '❌ فشل في تحميل الصورة';
                }
              }}
            />
          ) : (
            <span>{sanitizeContent(message.content)}</span>
          )}
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

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
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // تنظيف الـ state عند الإغلاق
  useEffect(() => {
    if (!isOpen) {
      setMessageText('');
      setShowEmojiPicker(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  // scroll محسن مع debouncing
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      } catch (error) {
        // fallback للمتصفحات القديمة
        messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
      }
    }
  }, []);

  // scroll عند تغيير الرسائل مع cleanup
  useEffect(() => {
    if (!isOpen) return;
    
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isOpen, scrollToBottom]);

  // focus على input عند فتح الصندوق
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // معالج محسن لإرسال الرسائل
  const handleSendMessage = useCallback(async () => {
    const trimmedText = messageText.trim();
    if (!trimmedText || isLoading) return;

    // تنظيف النص من المحتوى الضار
    const sanitizedText = trimmedText
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .substring(0, 1000); // حد أقصى للطول

    if (!sanitizedText) return;

    setIsLoading(true);
    try {
      await onSendMessage(sanitizedText);
      setMessageText('');
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
    } finally {
      setIsLoading(false);
    }
  }, [messageText, isLoading, onSendMessage]);

  // معالج آمن للملفات
  const handleFileSelect = useCallback(async (file: File, type: 'image' | 'video' | 'document') => {
    if (!file || isLoading) return;

    // فحص نوع الملف وحجمه
    const maxSize = type === 'image' ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB للصور، 10MB للبقية
    if (file.size > maxSize) {
      alert(`حجم الملف كبير جداً. الحد الأقصى ${maxSize / 1024 / 1024}MB`);
      return;
    }

    setIsLoading(true);
    try {
      if (type === 'image') {
        // فحص نوع الصورة
        if (!file.type.startsWith('image/')) {
          throw new Error('نوع الملف غير مدعوم');
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const dataUrl = event.target?.result as string;
            if (dataUrl && dataUrl.startsWith('data:image/')) {
              await onSendMessage(dataUrl);
            }
          } catch (error) {
            console.error('خطأ في إرسال الصورة:', error);
            alert('فشل في إرسال الصورة');
          } finally {
            setIsLoading(false);
          }
        };
        
        reader.onerror = () => {
          alert('فشل في قراءة الملف');
          setIsLoading(false);
        };
        
        reader.readAsDataURL(file);
        return;
      }

      // للأنواع الأخرى - رسالة نصية آمنة
      const fileName = file.name.replace(/[<>:"/\\|?*]/g, '_'); // تنظيف اسم الملف
      let fileMessage = '';
      switch (type) {
        case 'video':
          fileMessage = `🎥 فيديو: ${fileName}`;
          break;
        default:
          fileMessage = `📄 مستند: ${fileName}`;
      }
      
      await onSendMessage(fileMessage);
    } catch (error) {
      console.error('خطأ في معالجة الملف:', error);
      alert('فشل في معالجة الملف');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, onSendMessage]);

  // معالج آمن لضغط Enter
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // معالج محسن للرموز التعبيرية
  const handleEmojiSelect = useCallback((emoji: string) => {
    if (!emoji || typeof emoji !== 'string') return;
    
    const cleanEmoji = emoji.substring(0, 10); // حد أقصى لطول الرمز
    setMessageText(prev => (prev + cleanEmoji).substring(0, 1000));
    setShowEmojiPicker(false);
    
    // إعادة focus للـ input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  // مذكرة الرسائل للأداء
  const memoizedMessages = useMemo(() => {
    if (!Array.isArray(messages)) return [];
    
    return messages.map((message, index) => (
      <MessageItem
        key={`${message.id}-${message.senderId}-${index}`}
        message={message}
        currentUser={currentUser}
        user={user}
        index={index}
      />
    ));
  }, [messages, currentUser, user]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
              <Button 
                onClick={onClose} 
                variant="ghost" 
                className="px-2 py-1 hover:bg-destructive/20"
                disabled={isLoading}
              >
                ✖️
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[250px] w-full p-4">
          <div className="space-y-3">
            {memoizedMessages.length > 0 ? (
              <>
                {memoizedMessages}
                <div ref={messagesEndRef} />
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-4xl mb-3">✉️</div>
                <p className="text-lg font-medium">لا توجد رسائل</p>
                <p className="text-sm">ابدأ محادثة جديدة!</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 p-4 border-t border-accent bg-gradient-to-r from-secondary to-accent">
          <FileUploadButton 
            onFileSelect={handleFileSelect}
            disabled={isLoading}
          />
          
          <div className="relative">
            <Button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 rounded-lg"
              title="الرموز التعبيرية"
              disabled={isLoading}
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
            ref={inputRef}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value.substring(0, 1000))}
            onKeyPress={handleKeyPress}
            placeholder="✉️ اكتب رسالتك..."
            className="flex-1 bg-white border border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
            disabled={isLoading}
            maxLength={1000}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || isLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {isLoading ? '⏳' : '✉️'} إرسال
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}