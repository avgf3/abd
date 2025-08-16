import React, { memo } from 'react';
import SimpleUserMenu from './SimpleUserMenu';
import ProfileImage from './ProfileImage';
import UserRoleBadge from './UserRoleBadge';
import type { ChatUser } from '@/types/chat';
import { getUserListItemStyles, getUserListItemClasses, getFinalUsernameColor } from '@/utils/themeUtils';

interface UserListItemProps {
  user: ChatUser;
  currentUser: ChatUser | null;
  isModerator?: boolean;
  onUserClick: (event: React.MouseEvent, user: ChatUser) => void;
}

// مكون محسن للمستخدم الواحد مع React.memo
const UserListItem = memo(({ user, currentUser, isModerator, onUserClick }: UserListItemProps) => {
  // معالج النقر المحلي
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUserClick(e, user);
  };

  // دالة لرسم علم الدولة
  const renderCountryFlag = () => {
    const country = user.country?.trim().split(' ')[0];
    const boxStyle: React.CSSProperties = {
      width: 20,
      height: 20,
      borderRadius: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      border: 'none'
    };

    if (country) {
      return (
        <span style={boxStyle} title={user.country}>
          <span style={{ fontSize: 14, lineHeight: 1 }}>{country}</span>
        </span>
      );
    }

    return (
      <span style={boxStyle} title="لم يتم تحديد الدولة">
        <span style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1 }}>?</span>
      </span>
    );
  };

  return (
    <li className="relative -mx-4">
      <SimpleUserMenu
        targetUser={user}
        currentUser={currentUser}
        showModerationActions={isModerator}
      >
        <div
          className={`flex items-center gap-2 p-2 px-4 rounded-none border-b border-border transition-colors duration-200 cursor-pointer w-full ${getUserListItemClasses(user)}`}
          style={getUserListItemStyles(user)}
          onClick={handleClick}
        >
          <ProfileImage 
            user={user} 
            size="small" 
            className=""
            hideRoleBadgeOverlay={true}
          />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span 
                  className="text-base font-medium transition-colors duration-300"
                  style={{ 
                    color: getFinalUsernameColor(user),
                    textShadow: user.profileEffect && user.profileEffect !== 'none' ? `0 0 10px ${getFinalUsernameColor(user)}40` : 'none'
                  }}
                  title={user.username}
                >
                  {user.username}
                </span>
                {/* إشارة المكتوم */}
                {user.isMuted && (
                  <span className="text-yellow-400 text-xs">🔇</span>
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
    </li>
  );
}, (prevProps, nextProps) => {
  // دالة مقارنة مخصصة لتحسين الأداء
  return (
    prevProps.user.id === nextProps.user.id &&
    prevProps.user.username === nextProps.user.username &&
    prevProps.user.userType === nextProps.user.userType &&
    prevProps.user.profileImage === nextProps.user.profileImage &&
    prevProps.user.profileBackgroundColor === nextProps.user.profileBackgroundColor &&
    prevProps.user.profileEffect === nextProps.user.profileEffect &&
    prevProps.user.usernameColor === nextProps.user.usernameColor &&
    prevProps.user.isMuted === nextProps.user.isMuted &&
    prevProps.user.country === nextProps.user.country &&
    prevProps.currentUser?.id === nextProps.currentUser?.id &&
    prevProps.isModerator === nextProps.isModerator
  );
});

UserListItem.displayName = 'UserListItem';

export default UserListItem;