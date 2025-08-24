import React from 'react';
import { getFinalUsernameColor } from '@/utils/themeUtils';
import type { ChatUser } from '@/types/chat';
import { useUserClick } from '@/components/common/UserClickContext';

interface UsernameDisplayProps {
  user: Pick<ChatUser, 'id' | 'username' | 'userType' | 'usernameColor' | 'profileImage'>;
  className?: string;
  onClick?: (e: React.MouseEvent, user: ChatUser) => void;
}

export default function UsernameDisplay({ user, className, onClick }: UsernameDisplayProps) {
  if (!user || !user.username) return null;
  const color = getFinalUsernameColor(user as any);
  const ctxOnClick = useUserClick();
  const handleClick = (e: React.MouseEvent) => {
    const handler = onClick || ctxOnClick;
    if (handler) handler(e, user as any);
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
        const handler = onClick || ctxOnClick;
        if ((e.key === 'Enter' || e.key === ' ') && handler) {
          e.preventDefault();
          handler(e as any, user as any);
        }
      }}
    >
      {user.username}
    </span>
  );
}