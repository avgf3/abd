/**
 * مكون عنصر المستخدم في قائمة المتصلين
 * مع دعم كامل للإطارات والتأثيرات
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ChatUser } from '@/types/chat';
import type { FrameType } from '@/types/avatarFrame';
import AvatarFrame from '@/components/ui/AvatarFrame';
import UserRoleBadge from './UserRoleBadge';
import { getImageSrc } from '@/utils/imageUtils';
import { getUserListItemStyles, getUserListItemClasses } from '@/utils/themeUtils';

interface UserListItemProps {
  user: ChatUser;
  onClick?: (event: React.MouseEvent<HTMLLIElement>) => void;
  showCountry?: boolean;
  showStatus?: boolean;
  className?: string;
}

const UserListItem: React.FC<UserListItemProps> = ({
  user,
  onClick,
  showCountry = true,
  showStatus = true,
  className
}) => {
  // استخراج معلومات المستخدم
  const avatarSrc = useMemo(() => {
    return getImageSrc(user.profileImage, '/default_avatar.svg');
  }, [user.profileImage]);
  
  const frameType = useMemo(() => {
    // التحقق من صحة نوع الإطار
    const frame = user.avatarFrame as string;
    // إذا لم يكن هناك إطار أو كان غير صالح، نرجع 'none'
    return (frame || 'none') as FrameType;
  }, [user.avatarFrame]);
  
  // حساب أنماط اسم المستخدم
  const userNameStyle = useMemo(() => {
    const baseStyle: React.CSSProperties = {
      color: user.usernameColor || '#FFFFFF'
    };
    
    // إضافة تأثيرات النص إذا كانت موجودة
    if (user.profileEffect && user.profileEffect !== 'none') {
      return {
        ...baseStyle,
        className: `animated-text ${user.profileEffect}`,
        style: { 
          '--username-color': user.usernameColor || '#FFFFFF',
          ...baseStyle
        } as React.CSSProperties
      };
    }
    
    return {
      ...baseStyle,
      className: '',
      style: baseStyle
    };
  }, [user.usernameColor, user.profileEffect]);
  
  // استخراج رمز الدولة
  const countryEmoji = useMemo(() => {
    if (!user.country || !showCountry) return null;
    // استخراج أول كلمة (رمز الدولة)
    const emoji = user.country.trim().split(' ')[0];
    return emoji || null;
  }, [user.country, showCountry]);
  
  return (
    <li
      onClick={onClick}
      className={cn(
        // الأنماط الأساسية
        'user-list-item',
        'px-3 py-2',
        'cursor-pointer',
        'transition-all duration-200',
        'flex items-center gap-3',
        // أنماط hover
        'hover:bg-opacity-10',
        // أنماط المستخدم المخصصة
        getUserListItemClasses(user),
        // كلاسات إضافية
        className
      )}
      style={getUserListItemStyles(user)}
      role="button"
      tabIndex={0}
    >
      {/* الصورة الشخصية مع الإطار */}
      <AvatarFrame
        src={avatarSrc}
        alt={user.username}
        fallback={user.username.substring(0, 2).toUpperCase()}
        frame={frameType}
        size={40}
        variant="list"
        glow={user.userType === 'owner' || user.userType === 'admin'}
        className="flex-shrink-0"
      />
      
      {/* معلومات المستخدم */}
      <div className="flex-1 min-w-0">
        {/* السطر الأول: الشارة + الاسم + الدولة */}
        <div className="flex items-center gap-1.5">
          {/* شارة الرتبة */}
          <UserRoleBadge user={user} size={16} />
          
          {/* اسم المستخدم */}
          <span
            className={cn(
              'font-medium truncate max-w-[150px]',
              userNameStyle.className
            )}
            style={userNameStyle.style}
            title={user.username}
          >
            {user.username}
          </span>
          
          {/* رمز الدولة */}
          {countryEmoji && (
            <span 
              className="text-sm opacity-80" 
              title={user.country}
              role="img"
              aria-label={`علم ${user.country}`}
            >
              {countryEmoji}
            </span>
          )}
        </div>
        
        {/* السطر الثاني: الحالة (إن وجدت) */}
        {showStatus && user.status && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {user.status}
          </p>
        )}
      </div>
      
      {/* مؤشر الاتصال */}
      <div className="flex-shrink-0">
        <div
          className={cn(
            'w-2.5 h-2.5 rounded-full transition-colors',
            user.isOnline 
              ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]' 
              : 'bg-gray-400 dark:bg-gray-600'
          )}
          title={user.isOnline ? 'متصل' : 'غير متصل'}
        />
      </div>
    </li>
  );
};

export default React.memo(UserListItem);