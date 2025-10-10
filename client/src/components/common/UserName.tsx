import React from 'react';
import { getUsernameDisplayStyle, getUserNameplateStyles, getUserListItemClasses } from '@/utils/themeUtils';

interface UserNameProps {
  user: any;
  className?: string;
  title?: string;
  onClick?: (e: React.MouseEvent) => void;
  enableNameplate?: boolean; // Use nameplate styling when available (admin/mod only)
}

export default function UserName({ user, className = '', title, onClick, enableNameplate = true }: UserNameProps) {
  const np = enableNameplate ? getUserNameplateStyles(user) : {};
  const hasNameplate = enableNameplate && np && Object.keys(np).length > 0;

  if (hasNameplate) {
    const effectClasses = getUserListItemClasses(user);
    return (
      <span
        className={`ac-nameplate ${effectClasses || ''} ${className}`.trim()}
        style={np}
        onClick={onClick}
        title={title || user?.username}
      >
        <span className="ac-name">{user?.username || ''}</span>
        <span className="ac-mark">〰</span>
      </span>
    );
  }

  const uds = getUsernameDisplayStyle(user);
  return (
    <span
      className={`${uds.className || ''} ${className}`.trim()}
      style={uds.style}
      onClick={onClick}
      title={title || user?.username}
    >
      {user?.username || ''}
    </span>
  );
}
