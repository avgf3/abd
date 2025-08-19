
import React from 'react';

import type { ChatUser } from '../../types/chat';

interface UserRoleBadgeProps {
  user: ChatUser;
  showOnlyIcon?: boolean;
  size?: number;
}

/**
 * نظام الشعارات الموحد للموقع
 * 
 * المالك (owner): تاج نصي 👑 (تم إزالة ملفات svg القديمة)
 * المشرف العام (admin): ⭐
 * المراقب (moderator): 🛡️
 * العضو (ذكر) مستوى 1–10: سهم أزرق (↗️)
 * العضو (أنثى) مستوى 1–10: ميدالية وردية (🏅)
 * العضو مستوى 11–20: ألماسة بيضاء (💎)
 * العضو مستوى 21–30: قلب أخضر (💚)
 * العضو مستوى 31–40: نار برتقالية (🔥)
 */

// دالة للحصول على أيقونة الدور فقط (بدون مستوى)
export function getUserRoleIcon(userType: string): string {
  switch (userType) {
    case 'owner':
      return '👑';
    case 'admin':
      return '⭐';
    case 'moderator':
      return '🛡️';
    default:
      return '';
  }
}

// دالة مساعدة للحصول على أيقونة المستوى/الدور
export function getUserLevelIcon(user: ChatUser, size: number = 20): JSX.Element {
  // التحقق من وجود المستخدم
  if (!user) {
    return <span style={{color: '#10b981', fontSize: size * 0.8}}>●</span>;
  }

  // owner: تاج نصي
  if (user.userType === 'owner') {
    return <span style={{fontSize: size, display: 'inline'}}>👑</span>;
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
      return <span style={{color: '#3b82f6', fontSize: size, display: 'inline'}}>↗️</span>;
    }
    // عضو أنثى لفل 1-10: ميدالية وردية
    if (level >= 1 && level <= 10 && gender === 'female') {
      return <span style={{color: '#ec4899', fontSize: size, display: 'inline'}}>🏅</span>;
    }
    // عضو لفل 11-20: ألماسة بيضاء
    if (level >= 11 && level <= 20) {
      return <span style={{color: '#f8fafc', fontSize: size, display: 'inline'}}>💎</span>;
    }
    // عضو لفل 21-30: ألماسة خضراء
    if (level >= 21 && level <= 30) {
      return <span style={{color: '#10b981', fontSize: size, display: 'inline'}}>💚</span>;
    }
    // عضو لفل 31-40: ألماسة برتقالية مضيئة
    if (level >= 31 && level <= 40) {
      return <span style={{color: '#f97316', fontSize: size, display: 'inline'}}>🔥</span>;
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