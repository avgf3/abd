import React from 'react';
import { ChatUser } from '../../types/chat';

interface UserRoleBadgeProps {
  user: ChatUser;
  showOnlyIcon?: boolean;
}

export default function UserRoleBadge({ user, showOnlyIcon = false }: UserRoleBadgeProps) {
  const getRoleDisplay = () => {
    // owner: تاج SVG
    if (user.userType === 'owner') {
      return <img src="/svgs/crown.svg" alt="owner" style={{width: 24, height: 24, display: 'inline'}} />;
    }
    // admin: نجمة
    if (user.userType === 'admin') {
      return <span style={{fontSize: 24, display: 'inline'}}>⭐</span>;
    }
    // moderator: درع
    if (user.userType === 'moderator') {
      return <span style={{fontSize: 24, display: 'inline'}}>🛡️</span>;
    }
    // عضو ذكر لفل 1-10: سهم أزرق
    if (user.userType === 'member' && user.level >= 1 && user.level <= 10 && user.gender === 'male') {
      return <img src="/svgs/blue_arrow.svg" alt="male-lvl1-10" style={{width: 24, height: 24, display: 'inline'}} />;
    }
    // عضو أنثى لفل 1-10: ميدالية وردية
    if (user.userType === 'member' && user.level >= 1 && user.level <= 10 && user.gender === 'female') {
      return <img src="/svgs/pink_medal.svg" alt="female-lvl1-10" style={{width: 24, height: 24, display: 'inline'}} />;
    }
    // عضو لفل 10-20: ألماسة بيضاء
    if (user.userType === 'member' && user.level > 10 && user.level <= 20) {
      return <img src="/svgs/white.svg" alt="lvl10-20" style={{width: 24, height: 24, display: 'inline'}} />;
    }
    // عضو لفل 20-30: ألماسة خضراء
    if (user.userType === 'member' && user.level > 20 && user.level <= 30) {
      return <img src="/svgs/emerald.svg" alt="lvl20-30" style={{width: 24, height: 24, display: 'inline'}} />;
    }
    // عضو لفل 30-40: ألماسة برتقالية مضيئة
    if (user.userType === 'member' && user.level > 30 && user.level <= 40) {
      return <img src="/svgs/orange_shine.svg" alt="lvl30-40" style={{width: 24, height: 24, display: 'inline'}} />;
    }
    return null;
  };

  const roleIcon = getRoleDisplay();
  
  if (!roleIcon) return null;

  return (
    <span className="inline-flex items-center">
      {roleIcon}
    </span>
  );
}