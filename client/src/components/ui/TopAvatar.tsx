import React, { useMemo } from 'react';

import type { ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';

interface TopAvatarProps {
  user: ChatUser;
  size?: number; // pixels
  className?: string;
}

export default function TopAvatar({ user, size = 48, className = '' }: TopAvatarProps) {
  const imgSrc = useMemo(() => getImageSrc(user.profileImage, '/default_avatar.svg'), [user.profileImage]);

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    // @ts-ignore custom css var for spin duration
    ['--top-spin-duration' as any]: '7s',
  };

  const imgStyle: React.CSSProperties = {
    width: size - 4,
    height: size - 4,
  };

  return (
    <div className={`top-avatar ${className}`} style={containerStyle} title={`TOP - ${user.username}`}>
      <div className="top-avatar-inner">
        <img src={imgSrc} alt={user.username} className="top-avatar-img" style={imgStyle} />
      </div>
      <div className="top-badge" aria-hidden>
        <span className="top-badge-crown">👑</span>
        <span className="top-badge-text">TOP</span>
      </div>
    </div>
  );
}