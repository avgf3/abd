import React, { useMemo } from 'react';
import { ChatUser } from '@/types/chat';
import { AvatarWithFrame } from '@/components/ui/AvatarWithFrame';
import UserRoleBadge from './UserRoleBadge';
import { cn } from '@/lib/utils';
import { getUserListItemStyles, getUserListItemClasses } from '@/utils/themeUtils';
import { getImageSrc } from '@/utils/imageUtils';

interface UserListItemProps {
  user: ChatUser;
  onClick?: (event: React.MouseEvent<HTMLLIElement>) => void;
  showCountry?: boolean;
  className?: string;
}

export const UserListItem: React.FC<UserListItemProps> = ({ 
  user, 
  onClick,
  showCountry = true,
  className 
}) => {
  const getCountryEmoji = (country?: string): string | null => {
    if (!country) return null;
    const token = country.trim().split(' ')[0];
    return token || null;
  };

  const userNameStyle = useMemo(() => {
    if (user.profileEffect && user.profileEffect !== 'none') {
      return {
        color: user.usernameColor || '#FFFFFF',
        className: `animated-text ${user.profileEffect}`,
        style: { '--username-color': user.usernameColor || '#FFFFFF' } as React.CSSProperties
      };
    }
    return {
      color: user.usernameColor || '#FFFFFF',
      className: '',
      style: { color: user.usernameColor || '#FFFFFF' }
    };
  }, [user.usernameColor, user.profileEffect]);

  const avatarSrc = useMemo(() => {
    const base = getImageSrc(user.profileImage, '/default_avatar.svg');
    const v = (user as any).avatarHash || (user as any).avatarVersion;
    if (base && v && typeof v === 'string' && !base.includes('?v=')) {
      return `${base}?v=${v}`;
    }
    if (base && v && typeof v === 'number' && !base.includes('?v=')) {
      return `${base}?v=${v}`;
    }
    return base;
  }, [user.profileImage, (user as any)?.avatarHash, (user as any)?.avatarVersion]);

  return (
    <li
      onClick={onClick}
      className={cn(
        "px-3 py-2 cursor-pointer transition-colors duration-200",
        "flex items-center gap-2",
        getUserListItemClasses(user) || 'hover:bg-gray-100 dark:hover:bg-gray-800',
        className
      )}
      style={getUserListItemStyles(user)}
    >
      {/* الصورة الشخصية مع الإطار */}
      <AvatarWithFrame
        src={avatarSrc}
        alt={user.username}
        fallback={user.username.substring(0, 2).toUpperCase()}
        // استخدام إطار دائري CSS لضمان فرق الحجم الصحيح بصريًا
        useCircularFrame
        imageSize={40}
        frameBorderWidth={3}
        frameBorderColor={'gold'}
        frameGap={3}
      />

      {/* معلومات المستخدم */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          {/* شارة الرتبة */}
          <UserRoleBadge user={user} size={16} />
          
          {/* اسم المستخدم */}
          <span 
            className={cn("font-medium truncate", userNameStyle.className)}
            style={userNameStyle.style}
          >
            {user.username}
          </span>
          
          {/* علم الدولة */}
          {showCountry && user.country && (
            <span className="text-sm" title={user.country}>
              {getCountryEmoji(user.country)}
            </span>
          )}
        </div>
        
        {/* الحالة إذا كانت موجودة */}
        {user.status && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {user.status}
          </p>
        )}
      </div>

      {/* مؤشر الاتصال */}
      <div className={cn(
        "w-2 h-2 rounded-full",
        user.isOnline ? "bg-green-500" : "bg-gray-400"
      )} />
    </li>
  );
};