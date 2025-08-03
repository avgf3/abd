import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import OptimizedMessageItem from './OptimizedMessageItem';
import type { ChatMessage, ChatUser } from '@/types/chat';

interface OptimizedMessageListProps {
  messages: ChatMessage[];
  currentUserId?: number;
  onUserClick?: (user: ChatUser) => void;
  onMessageClick?: (message: ChatMessage) => void;
  className?: string;
  height?: number;
  itemHeight?: number;
  enableVirtualization?: boolean;
}

// تجميع الرسائل حسب المرسل والوقت
interface MessageGroup {
  sender: ChatUser;
  messages: ChatMessage[];
  timestamp: Date;
}

// مكون محسن لمجموعة الرسائل
const OptimizedMessageGroup = memo<{
  group: MessageGroup;
  currentUserId?: number;
  onUserClick?: (user: ChatUser) => void;
  onMessageClick?: (message: ChatMessage) => void;
}>(({ group, currentUserId, onUserClick, onMessageClick }) => {
  const isOwnGroup = group.sender.id === currentUserId;
  
  return (
    <div className="message-group mb-4">
      {group.messages.map((message, index) => (
        <OptimizedMessageItem
          key={message.id || `${message.senderId}-${message.timestamp}-${index}`}
          message={message}
          isOwn={isOwnGroup}
          showSender={index === 0} // إظهار اسم المرسل فقط للرسالة الأولى
          onUserClick={onUserClick}
          onMessageClick={onMessageClick}
          className={index > 0 ? 'mt-1' : ''}
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.group.sender.id === nextProps.group.sender.id &&
    prevProps.group.messages.length === nextProps.group.messages.length &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.group.messages.every((msg, index) => 
      nextProps.group.messages[index]?.id === msg.id &&
      nextProps.group.messages[index]?.content === msg.content
    )
  );
});

OptimizedMessageGroup.displayName = 'OptimizedMessageGroup';

// مكون محسن لقائمة الرسائل
const OptimizedMessageList = memo<OptimizedMessageListProps>(({
  messages,
  currentUserId,
  onUserClick,
  onMessageClick,
  className = '',
  height = 400,
  itemHeight = 80,
  enableVirtualization = true
}) => {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // تجميع الرسائل حسب المرسل والوقت
  const groupedMessages = useMemo(() => {
    const groups: MessageGroup[] = [];
    let currentGroup: MessageGroup | null = null;
    const timeThreshold = 5 * 60 * 1000; // 5 دقائق
    
    messages.forEach(message => {
      const isSameSender = currentGroup?.sender.id === message.senderId;
      const isWithinTimeThreshold = currentGroup && 
        message.timestamp && currentGroup.timestamp &&
        (new Date(message.timestamp).getTime() - currentGroup.timestamp.getTime()) < timeThreshold;
      
      if (isSameSender && isWithinTimeThreshold) {
        currentGroup!.messages.push(message);
      } else {
        currentGroup = {
          sender: message.sender || {
            id: message.senderId || 0,
            username: 'مستخدم محذوف',
            userType: 'guest' as const,
            role: 'guest' as const,
            profileBackgroundColor: '#3c0d0d',
            isOnline: false,
            isHidden: false,
            lastSeen: null,
            joinDate: new Date(),
            createdAt: new Date(),
            isMuted: false,
            muteExpiry: null,
            isBanned: false,
            banExpiry: null,
            isBlocked: false,
            ignoredUsers: [],
            usernameColor: '#666666',
            userTheme: 'default',
            profileEffect: 'none',
            points: 0,
            level: 1,
            totalPoints: 0,
            levelProgress: 0
          },
          messages: [message],
          timestamp: message.timestamp || new Date()
        };
        groups.push(currentGroup);
      }
    });
    
    return groups;
  }, [messages]);

  // التمرير إلى آخر رسالة تلقائياً
  useEffect(() => {
    if (listRef.current && groupedMessages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToItem(groupedMessages.length - 1, 'end');
      }, 100);
    }
  }, [groupedMessages.length]);

  // معالجة النقر على المستخدم
  const handleUserClick = useCallback((user: ChatUser) => {
    if (onUserClick) {
      onUserClick(user);
    }
  }, [onUserClick]);

  // معالجة النقر على الرسالة
  const handleMessageClick = useCallback((message: ChatMessage) => {
    if (onMessageClick) {
      onMessageClick(message);
    }
  }, [onMessageClick]);

  // مكون الصف للقائمة الافتراضية
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const group = groupedMessages[index];
    if (!group) return null;

    return (
      <div style={style}>
        <OptimizedMessageGroup
          group={group}
          currentUserId={currentUserId}
          onUserClick={handleUserClick}
          onMessageClick={handleMessageClick}
        />
      </div>
    );
  }, [groupedMessages, currentUserId, handleUserClick, handleMessageClick]);

  // إذا كان Virtual Scrolling معطل أو الرسائل قليلة
  if (!enableVirtualization || groupedMessages.length < 20) {
    return (
      <div 
        ref={containerRef}
        className={`optimized-message-list ${className}`}
        style={{ height }}
      >
        <div className="space-y-4 overflow-y-auto h-full">
          {groupedMessages.map((group, index) => (
            <OptimizedMessageGroup
              key={`${group.sender.id}-${group.timestamp.getTime()}-${index}`}
              group={group}
              currentUserId={currentUserId}
              onUserClick={handleUserClick}
              onMessageClick={handleMessageClick}
            />
          ))}
        </div>
      </div>
    );
  }

  // استخدام Virtual Scrolling للرسائل الكثيرة
  return (
    <div 
      ref={containerRef}
      className={`optimized-message-list ${className}`}
    >
      <List
        ref={listRef}
        height={height}
        itemCount={groupedMessages.length}
        itemSize={itemHeight}
        width="100%"
        overscanCount={5}
        className="message-list-virtual"
      >
        {Row}
      </List>
    </div>
  );
}, (prevProps, nextProps) => {
  // مقارنة مخصصة للأداء
  return (
    prevProps.messages.length === nextProps.messages.length &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.height === nextProps.height &&
    prevProps.itemHeight === nextProps.itemHeight &&
    prevProps.enableVirtualization === nextProps.enableVirtualization &&
    // مقارنة سريعة للرسائل
    prevProps.messages.every((msg, index) => 
      nextProps.messages[index]?.id === msg.id &&
      nextProps.messages[index]?.content === msg.content &&
      nextProps.messages[index]?.senderId === msg.senderId
    )
  );
});

OptimizedMessageList.displayName = 'OptimizedMessageList';

export default OptimizedMessageList;