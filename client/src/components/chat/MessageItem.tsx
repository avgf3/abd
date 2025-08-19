import React, { memo, useMemo, useCallback } from 'react';
import { formatTime } from '@/utils/timeUtils';
import { getFinalUsernameColor } from '@/utils/themeUtils';
import { renderMessageWithMentions } from '@/utils/mentionUtils';
import ProfileImage from './ProfileImage';
import UserRoleBadge from './UserRoleBadge';
import type { ChatMessage, ChatUser } from '@/types/chat';

interface MessageItemProps {
  message: ChatMessage;
  currentUser: ChatUser | null;
  onUserClick?: (event: React.MouseEvent, user: ChatUser) => void;
  onReportMessage?: (user: ChatUser, messageContent: string, messageId: number) => void;
  showActions?: boolean;
}

const MessageItem = memo<MessageItemProps>(({ 
  message, 
  currentUser, 
  onUserClick,
  onReportMessage,
  showActions = true
}) => {
  // Memoize expensive calculations
  const usernameColor = useMemo(() => 
    getFinalUsernameColor(message.sender),
    [message.sender.id, message.sender.usernameColor, message.sender.userType]
  );

  const formattedTime = useMemo(() => 
    formatTime(message.timestamp),
    [message.timestamp]
  );

  const messageContent = useMemo(() => 
    renderMessageWithMentions(message.content, currentUser),
    [message.content, currentUser]
  );

  // Memoize event handlers
  const handleUserClick = useCallback((e: React.MouseEvent) => {
    if (onUserClick && message.sender) {
      onUserClick(e, message.sender);
    }
  }, [onUserClick, message.sender]);

  const handleReport = useCallback(() => {
    if (onReportMessage && message.sender) {
      onReportMessage(message.sender, message.content, message.id);
    }
  }, [onReportMessage, message.sender, message.content, message.id]);

  const handleDeleteMessage = useCallback(async () => {
    if (!currentUser || !window.confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
    
    try {
      const response = await fetch('/api/messages/' + message.id, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('فشل حذف الرسالة');
      }
    } catch (error) {
      console.error('خطأ في حذف الرسالة:', error);
    }
  }, [message.id, currentUser]);

  // System messages
  if (message.messageType === 'system') {
    return (
      <div className="text-center text-sm text-muted-foreground py-2">
        {message.content}
      </div>
    );
  }

  // Private messages styling
  const isPrivate = !!message.isPrivate;
  const isOwnMessage = currentUser?.id === message.senderId;

  return (
    <div 
      className={`group flex gap-3 py-2 px-4 hover:bg-accent/50 transition-colors ${
        isPrivate ? 'bg-blue-50/50 border-l-4 border-blue-500' : ''
      }`}
    >
      {/* Profile Image */}
      <div className="flex-shrink-0 pt-1">
        <ProfileImage
          user={message.sender}
          size="small"
          onClick={handleUserClick}
          className="cursor-pointer hover:opacity-80 transition-opacity"
        />
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <button
            onClick={handleUserClick}
            className="font-medium hover:underline transition-all truncate max-w-[200px]"
            style={{ color: usernameColor }}
          >
            {message.sender.username}
          </button>
          
          <UserRoleBadge user={message.sender} />
          
          <time className="text-xs text-muted-foreground">
            {formattedTime}
          </time>

          {isPrivate && (
            <span className="text-xs text-blue-600 font-medium">
              رسالة خاصة
            </span>
          )}
        </div>

        {/* Message Text */}
        <div className="text-sm mt-0.5 break-words whitespace-pre-wrap">
          {message.messageType === 'image' ? (
            <div className="mt-2">
              <img
                src={message.content}
                alt="صورة مرفقة"
                className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(message.content, '_blank')}
              />
            </div>
          ) : (
            <>{messageContent}</>
          )}
        </div>

        {/* Actions - Only show on hover */}
        {showActions && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 mt-1">
            {onReportMessage && !isOwnMessage && (
              <button
                onClick={handleReport}
                className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                title="الإبلاغ عن الرسالة"
              >
                بلاغ
              </button>
            )}
            
            {isOwnMessage && (
              <button
                onClick={handleDeleteMessage}
                className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                title="حذف الرسالة"
              >
                حذف
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.currentUser?.id === nextProps.currentUser?.id &&
    prevProps.showActions === nextProps.showActions
  );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;