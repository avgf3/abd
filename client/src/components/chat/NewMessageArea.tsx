import { useEffect, useRef } from 'react';
import ProfileImage from './ProfileImage';
import { getUserThemeStyles, getUserThemeTextColor } from '@/utils/themeUtils';
import { getImageSrc } from '@/utils/imageUtils';

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
          const sender: ChatUser = message.sender || {
            id: message.senderId || 0,
            username: 'مستخدم محذوف',
            userType: 'guest' as const,
            role: 'guest' as const,
            profileImage: '/default_avatar.svg',
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
            ipAddress: undefined,
            deviceId: undefined,
            ignoredUsers: [],
            usernameColor: '#666666',
            userTheme: 'default',
            profileEffect: 'none',
            points: 0,
            level: 1,
            totalPoints: 0,
            levelProgress: 0
          };

          return (
            <div 
              key={`${message.id}-${index}`}
              className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors group"
            >
              {/* User Avatar */}
              <div 
                className="cursor-pointer flex-shrink-0"
                onClick={(e) => onUserClick(e, sender)}
              >
                <img
                  src={getImageSrc(sender.profileImage)}
                  alt="صورة المستخدم"
                  className="w-10 h-10 rounded-full border-2 border-blue-400 ring-1 ring-blue-200 shadow-sm object-cover hover:scale-105 transition-transform"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/default_avatar.svg';
                  }}
                />
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {/* Username with Theme */}
                  <div 
                    className="inline-block px-4 py-3 rounded-xl cursor-pointer hover:underline transition-all duration-300 min-w-[120px]"
                    style={{ 
                      background: getUserThemeStyles(sender).background || 'transparent',
                      color: getUserThemeTextColor(sender),
                      ...getUserThemeStyles(sender)
                    }}
                    onClick={(e) => onUserClick(e, sender)}
                  >
                    <span 
                      className="font-medium transition-all duration-300"
                      style={{ 
                        color: sender.usernameColor || '#ffffff',
                        textShadow: sender.usernameColor ? `0 0 8px ${sender.usernameColor}40` : 'none',
                        filter: sender.usernameColor ? 'drop-shadow(0 0 2px rgba(255,255,255,0.3))' : 'none'
                      }}
                    >
                      {getUserTypeBadge(sender.userType)} {sender.username}
                    </span>
                  </div>
                  
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