import React, { useCallback } from 'react';
import ProfileImage from './ProfileImage';
import SimpleUserMenu from './SimpleUserMenu';
import UserRoleBadge from './UserRoleBadge';
import type { ChatUser } from '@/types/chat';
import {
  getFinalUsernameColor,
  getUserListItemStyles,
  getUserListItemClasses,
} from '@/utils/themeUtils';

interface UserCardProps {
  user: ChatUser;
  currentUser?: ChatUser | null;
  onClick?: (event: React.MouseEvent, user: ChatUser) => void;
  showModerationActions?: boolean;
  showCountryFlag?: boolean;
  variant?: 'list' | 'message' | 'popup' | 'wall';
  className?: string;
  showUnreadCount?: boolean;
}

export default function UserCard({
  user,
  currentUser,
  onClick,
  showModerationActions = false,
  showCountryFlag = true,
  variant = 'list',
  className = '',
  showUnreadCount = false,
}: UserCardProps) {
  if (!user?.username || !user?.userType) return null;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(e, user);
    },
    [onClick, user]
  );

  const getCountryEmoji = useCallback((country?: string): string | null => {
    if (!country) return null;
    const token = country.trim().split(' ')[0];
    return token || null;
  }, []);

  const renderCountryFlag = useCallback(() => {
    if (!showCountryFlag) return null;
    
    const emoji = getCountryEmoji(user.country);
    const boxStyle: React.CSSProperties = {
      width: 20,
      height: 20,
      borderRadius: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      border: 'none',
    };

    if (emoji) {
      return (
        <span style={boxStyle} title={user.country}>
          <span style={{ fontSize: 14, lineHeight: 1 }}>{emoji}</span>
        </span>
      );
    }

    return (
      <span style={boxStyle} title="لم يتم تحديد الدولة">
        <span style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1 }}>?</span>
      </span>
    );
  }, [getCountryEmoji, showCountryFlag, user.country]);

  // مكون البطاقة للقائمة
  if (variant === 'list') {
    return (
      <SimpleUserMenu
        targetUser={user}
        currentUser={currentUser}
        showModerationActions={showModerationActions}
      >
        <div
          className={`flex items-center gap-2 py-1.5 px-0 rounded-none border-b border-black transition-colors duration-200 cursor-pointer w-full ${getUserListItemClasses(user) || 'bg-card hover:bg-accent/10'} ${className}`}
          style={getUserListItemStyles(user)}
          onClick={handleClick}
        >
          <ProfileImage user={user} size="small" className="" hideRoleBadgeOverlay={true} />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="text-base font-medium transition-colors duration-300"
                  style={{
                    color: getFinalUsernameColor(user),
                  }}
                  title={user.username}
                >
                  {user.username}
                </span>
                {user.isMuted && <span className="text-yellow-400 text-xs">🔇</span>}
                {showUnreadCount && user.unreadCount && user.unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                    {user.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <UserRoleBadge user={user} size={20} />
                {renderCountryFlag()}
              </div>
            </div>
          </div>
        </div>
      </SimpleUserMenu>
    );
  }

  // مكون البطاقة للرسائل
  if (variant === 'message') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <ProfileImage 
          user={user} 
          size="small" 
          className="w-7 h-7 cursor-pointer hover:scale-110 transition-transform duration-200"
          onClick={handleClick}
        />
        <UserRoleBadge user={user} showOnlyIcon={true} hideGuestAndGender={true} size={16} />
        <button
          onClick={handleClick}
          className="font-semibold hover:underline transition-colors duration-200 truncate"
          style={{ color: getFinalUsernameColor(user) }}
        >
          {user.username}
        </button>
        {showCountryFlag && renderCountryFlag()}
      </div>
    );
  }

  // مكون البطاقة في النافذة المنبثقة
  if (variant === 'popup') {
    return (
      <div className={`flex items-center gap-3 p-3 ${className}`}>
        <ProfileImage user={user} size="medium" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className="font-bold text-lg"
              style={{ color: getFinalUsernameColor(user) }}
            >
              {user.username}
            </span>
            <UserRoleBadge user={user} size={20} />
            {showCountryFlag && renderCountryFlag()}
          </div>
          {user.bio && (
            <p className="text-sm text-gray-600 mt-1">{user.bio}</p>
          )}
        </div>
      </div>
    );
  }

  // مكون البطاقة في الحائط
  if (variant === 'wall') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
          {user.profileImage ? (
            <img
              src={user.profileImage}
              alt={user.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs">{user.username.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className="font-medium text-sm cursor-pointer hover:underline"
              style={{ color: getFinalUsernameColor(user) }}
              onClick={handleClick}
              title="عرض خيارات المستخدم"
            >
              {user.username}
            </span>
            <UserRoleBadge user={user} size={16} />
            {showCountryFlag && renderCountryFlag()}
          </div>
        </div>
      </div>
    );
  }

  // افتراضي
  return (
    <div className={`flex items-center gap-2 ${className}`} onClick={handleClick}>
      <ProfileImage user={user} size="small" />
      <span
        className="font-medium"
        style={{ color: getFinalUsernameColor(user) }}
      >
        {user.username}
      </span>
      <UserRoleBadge user={user} size={16} />
      {showCountryFlag && renderCountryFlag()}
    </div>
  );
}