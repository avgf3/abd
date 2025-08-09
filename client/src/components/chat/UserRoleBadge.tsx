
import React from 'react';
import { ChatUser } from '../../types/chat';

interface UserRoleBadgeProps {
  user: ChatUser;
  showOnlyIcon?: boolean;
  size?: number;
}

// دالة مساعدة للحصول على أيقونة المستوى/الدور
export function getUserLevelIcon(user: ChatUser, size: number = 20): JSX.Element {
  // owner: تاج SVG
  if (user.userType === 'owner') {
    return <img src="/svgs/crown.svg" alt="owner" style={{width: size, height: size, display: 'inline'}} />;
  }
  // admin: نجمة
  if (user.userType === 'admin') {
    return <span style={{fontSize: size, display: 'inline'}}>⭐</span>;
  }
  // moderator: درع
  if (user.userType === 'moderator') {
    return <span style={{fontSize: size, display: 'inline'}}>🛡️</span>;
  }
  
  // للأعضاء - نفحص المستوى والجنس
  if (user.userType === 'member') {
    const level = user.level || 1; // افتراضي 1 إذا لم يكن محدد
    const gender = user.gender || 'male'; // افتراضي ذكر إذا لم يكن محدد
    
    // عضو ذكر لفل 1-10: سهم أزرق
    if (level >= 1 && level <= 10 && gender === 'male') {
      return <img src="/svgs/blue_arrow.svg" alt="male-lvl1-10" style={{width: size, height: size, display: 'inline'}} />;
    }
    // عضو أنثى لفل 1-10: ميدالية وردية
    if (level >= 1 && level <= 10 && gender === 'female') {
      return <img src="/svgs/pink_medal.svg" alt="female-lvl1-10" style={{width: size, height: size, display: 'inline'}} />;
    }
    // عضو لفل 10-20: ألماسة بيضاء
    if (level > 10 && level <= 20) {
      return <img src="/svgs/white.svg" alt="lvl10-20" style={{width: size, height: size, display: 'inline'}} />;
    }
    // عضو لفل 20-30: ألماسة خضراء
    if (level > 20 && level <= 30) {
      return <img src="/svgs/emerald.svg" alt="lvl20-30" style={{width: size, height: size, display: 'inline'}} />;
    }
    // عضو لفل 30-40: ألماسة برتقالية مضيئة
    if (level > 30 && level <= 40) {
      return <img src="/svgs/orange_shine.svg" alt="lvl30-40" style={{width: size, height: size, display: 'inline'}} />;
    }
  }
  
  // للضيوف - نقطة خضراء بسيطة
  if (user.userType === 'guest') {
    return <span style={{color: '#10b981', fontSize: size * 0.8}}>●</span>;
  }
  
  // افتراضي لأي حالة أخرى
  return <span style={{color: '#10b981', fontSize: size * 0.8}}>●</span>;
}

export default function UserRoleBadge({ user, showOnlyIcon = false, size = 20 }: UserRoleBadgeProps) {
  const roleIcon = getUserLevelIcon(user, size);

  return (
    <span className="inline-flex items-center justify-center">
      {roleIcon}
    </span>
  );
}