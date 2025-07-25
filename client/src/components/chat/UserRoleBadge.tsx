import React from 'react';

interface UserRoleBadgeProps {
  userType: string;
  username: string;
  showOnlyIcon?: boolean;
}

export default function UserRoleBadge({ userType, username, showOnlyIcon = false }: UserRoleBadgeProps) {
  const getRoleDisplay = () => {
    switch (userType) {
      case 'owner':
        return <img src="/svgs/crown.svg" alt="owner" style={{width: 24, height: 24, display: 'inline'}} />;
      case 'admin':
        return <span style={{fontSize: 24, display: 'inline'}}>⭐</span>;
      case 'moderator':
        return <span style={{fontSize: 24, display: 'inline'}}>🛡️</span>;
      default:
        return null;
    }
  };

  const roleIcon = getRoleDisplay();
  
  if (!roleIcon) return null;

  return (
    <span className="inline-flex items-center">
      {roleIcon}
    </span>
  );
}