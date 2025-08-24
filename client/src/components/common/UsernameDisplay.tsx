import React from 'react';
import { getFinalUsernameColor } from '@/utils/themeUtils';
import type { ChatUser } from '@/types/chat';

interface UsernameDisplayProps {
  user: Pick<ChatUser, 'id' | 'username' | 'userType' | 'usernameColor' | 'profileImage'>;
  className?: string;
  onClick?: (e: React.MouseEvent, user: ChatUser) => void;
}

export default function UsernameDisplay({ user, className, onClick }: UsernameDisplayProps) {
  if (!user || !user.username) return null;
  const color = getFinalUsernameColor(user as any);
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) onClick(e, user as any);
  };

  return (
    <span
      className={className || 'text-base font-medium transition-colors duration-300 cursor-pointer'}
      style={{ color }}
      title={user.username}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick(e as any, user as any);
        }
      }}
    >
      {user.username}
    </span>
  );
}