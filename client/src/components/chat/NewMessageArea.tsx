import { useEffect, useRef } from 'react';
import ProfileImage from './ProfileImage';
import { getUserThemeStyles, getUserThemeTextColor } from '@/utils/themeUtils';

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
      case 'admin': return '⭐';
      case 'moderator': return '🛡️';
      case 'member': return '💎';
      default: return '👤';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="space-y-4">
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
              className="flex items-start gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-lg border border-white/50 hover:bg-white/90 transition-all duration-300 group"
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
                  {/* Username with Theme */}
                  <div 
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl cursor-pointer hover:scale-105 transition-all duration-300 shadow-sm"
                    style={{ 
                      background: getUserThemeStyles(sender).background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: getUserThemeTextColor(sender),
                      ...getUserThemeStyles(sender)
                    }}
                    onClick={(e) => onUserClick(e, sender)}
                  >
                    <span className="text-lg">{getUserTypeBadge(sender.userType)}</span>
                    <span className="font-semibold text-sm">{sender.username}</span>
                  </div>
                  
                  {/* Timestamp */}
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    🕐 {formatTime(message.timestamp)}
                  </span>
                  
                  {/* Report Button */}
                  <button
                    onClick={() => onReportMessage(sender, message.content, message.id)}
                    className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded-full transition-all duration-200 hover:scale-110"
                    title="تبليغ عن المحتوى"
                  >
                    ⚠️
                  </button>
                </div>

                {/* Message Text */}
                <div className="text-gray-700 break-words leading-relaxed mt-2 px-1">
                  {message.messageType === 'image' ? (
                    <img 
                      src={message.content} 
                      alt="صورة مرسلة" 
                      className="max-w-xs rounded-xl shadow-lg border-2 border-white hover:shadow-xl transition-shadow duration-300"
                    />
                  ) : (
                    <span className="text-base">{message.content}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicators */}
        {typingUsers.size > 0 && (
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl shadow-sm border border-blue-100/50">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ✍️ {Array.from(typingUsers).join(', ')} يكتب الآن...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}