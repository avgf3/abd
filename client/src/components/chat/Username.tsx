import React from 'react';

import type { ChatUser } from '@/types/chat';
import { getFinalUsernameColor } from '@/utils/themeUtils';

interface UsernameProps {
  user: Partial<ChatUser> & { id: number; username: string };
  className?: string;
  onClick?: (e: React.MouseEvent, user: ChatUser | (Partial<ChatUser> & { id: number; username: string })) => void;
  title?: string;
}

export default function Username({ user, className = '', onClick, title }: UsernameProps) {
  const color = getFinalUsernameColor(user as any);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e, user as any);
      return;
    }
    try {
      if (user && typeof user.id === 'number') {
        window.location.hash = `#id${user.id}`;
      }
    } catch {}
  };

  return (
    <button
      type="button"
      className={`font-medium hover:underline disabled:opacity-60 ${className}`}
      onClick={handleClick}
      style={{ color }}
      title={title || user.username}
    >
      {user.username}
    </button>
  );
}

