import { useEffect, useRef } from 'react';
import ProfileImage from './ProfileImage';
import type { ChatMessage, ChatUser } from '@/types/chat';

interface MessageAreaProps {
  messages: ChatMessage[];
  onUserClick: (event: React.MouseEvent, user: ChatUser) => void;
  onReportMessage: (user: ChatUser, messageContent: string, messageId: number) => void;
  typingUsers: Set<string>;
}

export default function NewMessageArea({ 
  messages, 
  onUserClick, 
  onReportMessage,
  typingUsers 
}: MessageAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (timestamp?: Date) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'owner': return 'text-red-600 font-bold';
      case 'admin': return 'text-purple-600 font-bold';
      case 'moderator': return 'text-blue-600 font-bold';
      case 'member': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getUserTypeBadge = (userType: string) => {
    switch (userType) {
      case 'owner': return '👑';
      case 'admin': return '🛡️';
      case 'moderator': return '🔰';
      case 'member': return '⭐';
      default: return '👤';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
      <div className="space-y-2">
        {messages.map((message, index) => {
          const sender = message.sender || {
            id: message.senderId || 0,
            username: 'مستخدم محذوف',
            userType: 'guest' as const,
            profileImage: '/default_avatar.svg',
            isOnline: false
          };

          return (
            <div 
              key={`${message.id}-${index}`}
              className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors group"
            >
              {/* User Avatar */}
              <div 
                className="cursor-pointer"
                onClick={(e) => onUserClick(e, sender)}
              >
                <ProfileImage user={sender} size="small" />
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {/* Username with Badge */}
                  <span 
                    className="font-medium cursor-pointer hover:underline"
                    style={{ color: sender.usernameColor || '#000000' }}
                    onClick={(e) => onUserClick(e, sender)}
                  >
                    {getUserTypeBadge(sender.userType)} {sender.username}
                  </span>
                  
                  {/* Timestamp */}
                  <span className="text-xs text-gray-400">
                    {formatTime(message.timestamp)}
                  </span>
                  
                  {/* Report Button */}
                  <button
                    onClick={() => onReportMessage(sender, message.content, message.id)}
                    className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 transition-opacity"
                    title="تبليغ"
                  >
                    🚨
                  </button>
                </div>

                {/* Message Text */}
                <div className="text-gray-800 break-words leading-relaxed">
                  {message.messageType === 'image' ? (
                    <img 
                      src={message.content} 
                      alt="صورة" 
                      className="max-w-xs rounded-lg shadow-sm"
                    />
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicators */}
        {typingUsers.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm text-blue-600">
              {Array.from(typingUsers).join(', ')} يكتب...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}