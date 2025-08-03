import React, { memo, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { ChatMessage, ChatUser } from '@/types/chat';

interface OptimizedMessageItemProps {
  message: ChatMessage;
  isOwn: boolean;
  showSender: boolean;
  onUserClick?: (user: ChatUser) => void;
  onMessageClick?: (message: ChatMessage) => void;
  className?: string;
}

// مكون محسن للرسالة مع React.memo
const OptimizedMessageItem = memo<OptimizedMessageItemProps>(({
  message,
  isOwn,
  showSender,
  onUserClick,
  onMessageClick,
  className = ''
}) => {
  // تحسين تنسيق التاريخ مع useMemo
  const formattedTime = useMemo(() => {
    if (!message.timestamp) return '';
    
    const date = new Date(message.timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return format(date, 'HH:mm', { locale: ar });
    } else if (diffInHours < 48) {
      return `أمس ${format(date, 'HH:mm', { locale: ar })}`;
    } else {
      return format(date, 'dd/MM/yyyy HH:mm', { locale: ar });
    }
  }, [message.timestamp]);

  // تحسين معالجة النقر على المستخدم
  const handleUserClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (onUserClick && message.sender) {
      onUserClick(message.sender);
    }
  }, [onUserClick, message.sender]);

  // تحسين معالجة النقر على الرسالة
  const handleMessageClick = useCallback(() => {
    if (onMessageClick) {
      onMessageClick(message);
    }
  }, [onMessageClick, message]);

  // تحسين تنسيق المحتوى
  const formattedContent = useMemo(() => {
    if (!message.content) return '';
    
    // تحويل الروابط إلى روابط قابلة للنقر
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = message.content.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  }, [message.content]);

  // تحسين لون المستخدم
  const userColor = useMemo(() => {
    if (!message.sender) return '#666666';
    
    const userType = message.sender.userType;
    switch (userType) {
      case 'owner':
        return '#FFD700'; // ذهبي
      case 'admin':
        return '#FF6B6B'; // أحمر
      case 'moderator':
        return '#4ECDC4'; // أخضر
      case 'member':
        return '#45B7D1'; // أزرق
      default:
        return message.sender.usernameColor || '#666666';
    }
  }, [message.sender]);

  return (
    <div
      className={`message-item ${isOwn ? 'own-message' : 'other-message'} ${className}`}
      onClick={handleMessageClick}
    >
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
        <div
          className={`max-w-xs lg:max-w-md xl:max-w-lg 2xl:max-w-xl px-4 py-2 rounded-lg ${
            isOwn
              ? 'bg-blue-500 text-white rounded-br-none'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'
          }`}
        >
          {/* معلومات المرسل */}
          {showSender && message.sender && (
            <div className="mb-1">
              <button
                onClick={handleUserClick}
                className="font-semibold text-sm hover:underline cursor-pointer"
                style={{ color: userColor }}
              >
                {message.sender.username}
              </button>
              {message.sender.userType !== 'guest' && (
                <span className="ml-2 text-xs opacity-75">
                  ({message.sender.userType})
                </span>
              )}
            </div>
          )}

          {/* محتوى الرسالة */}
          <div className="message-content">
            {message.messageType === 'image' ? (
              <div className="image-message">
                <img
                  src={message.content}
                  alt="صورة"
                  className="max-w-full h-auto rounded cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(message.content, '_blank');
                  }}
                />
              </div>
            ) : (
              <div className="text-message whitespace-pre-wrap break-words">
                {formattedContent}
              </div>
            )}
          </div>

          {/* وقت الرسالة */}
          <div
            className={`text-xs mt-1 ${
              isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {formattedTime}
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // مقارنة مخصصة للأداء
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.timestamp === nextProps.message.timestamp &&
    prevProps.isOwn === nextProps.isOwn &&
    prevProps.showSender === nextProps.showSender &&
    prevProps.message.sender?.id === nextProps.message.sender?.id &&
    prevProps.message.sender?.username === nextProps.message.sender?.username &&
    prevProps.message.sender?.userType === nextProps.message.sender?.userType
  );
});

OptimizedMessageItem.displayName = 'OptimizedMessageItem';

export default OptimizedMessageItem;