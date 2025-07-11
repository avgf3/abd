import React from 'react';

interface UserRoleBadgeProps {
  userType: string;
  username: string;
  showOnlyIcon?: boolean;
}

export default function UserRoleBadge({ userType, username, showOnlyIcon = false }: UserRoleBadgeProps) {
  const getRoleDisplay = () => {
    if (username === 'عبود') {
      return showOnlyIcon ? '👑' : '👑';
    }
    
    switch (userType) {
      case 'owner':
        return showOnlyIcon ? '👑' : '👑';
      case 'admin':
        return showOnlyIcon ? '⭐' : '⭐';
      case 'moderator':
        return showOnlyIcon ? '🛡️' : '🛡️';
      default:
        return '';
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