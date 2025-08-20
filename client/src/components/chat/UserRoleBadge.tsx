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
 * المالك (owner): تاج من client/public/svgs/crown.svg
 * المشرف العام (admin): ⭐
 * المراقب (moderator): 🛡️
 * العضو (ذكر) مستوى 1–10: سهم أزرق client/public/svgs/blue_arrow.svg
 * العضو (أنثى) مستوى 1–10: ميدالية وردية client/public/svgs/pink_medal.svg
 * العضو مستوى 11–20: ألماسة بيضاء client/public/svgs/white.svg
 * العضو مستوى 21–30: ألماسة خضراء client/public/svgs/emerald.svg
 * العضو مستوى 31–40: ألماسة برتقالية لامعة client/public/svgs/orange_shine.svg
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
    return <span style={{ color: '#10b981', fontSize: size * 0.8 }}>●</span>;
  }

  // owner: تاج SVG مع fallback
  if (user.userType === 'owner') {
    return (
      <img
        src="/svgs/crown.svg"
        alt="owner"
        style={{ width: size, height: size, display: 'inline' }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.outerHTML = '<span style="font-size: ' + size + 'px; display: inline;">👑</span>';
        }}
      />
    );
  }
  // admin: نجمة
  if (user.userType === 'admin') {
    return <span style={{ fontSize: size, display: 'inline' }}>⭐</span>;
  }
  // moderator: درع
  if (user.userType === 'moderator') {
    return <span style={{ fontSize: size, display: 'inline' }}>🛡️</span>;
  }

  // للأعضاء - نفحص المستوى والجنس
  if (user.userType === 'member') {
    const level = user.level || 1; // افتراضي 1 إذا لم يكن محدد
    const gender = user.gender || 'male'; // افتراضي ذكر إذا لم يكن محدد

    // عضو ذكر لفل 1-10: سهم أزرق
    if (level >= 1 && level <= 10 && gender === 'male') {
      return (
        <img
          src="/svgs/blue_arrow.svg"
          alt="male-lvl1-10"
          style={{ width: size, height: size, display: 'inline' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.outerHTML =
              '<span style="color: #3b82f6; font-size: ' + size + 'px; display: inline;">↗️</span>';
          }}
        />
      );
    }
    // عضو أنثى لفل 1-10: ميدالية وردية
    if (level >= 1 && level <= 10 && gender === 'female') {
      return (
        <img
          src="/svgs/pink_medal.svg"
          alt="female-lvl1-10"
          style={{ width: size, height: size, display: 'inline' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.outerHTML =
              '<span style="color: #ec4899; font-size: ' + size + 'px; display: inline;">🏅</span>';
          }}
        />
      );
    }
    // عضو لفل 11-20: ألماسة بيضاء
    if (level >= 11 && level <= 20) {
      return (
        <img
          src="/svgs/white.svg"
          alt="lvl11-20"
          style={{ width: size, height: size, display: 'inline' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.outerHTML =
              '<span style="color: #f8fafc; font-size: ' + size + 'px; display: inline;">💎</span>';
          }}
        />
      );
    }
    // عضو لفل 21-30: ألماسة خضراء
    if (level >= 21 && level <= 30) {
      return (
        <img
          src="/svgs/emerald.svg"
          alt="lvl21-30"
          style={{ width: size, height: size, display: 'inline' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.outerHTML =
              '<span style="color: #10b981; font-size: ' + size + 'px; display: inline;">💚</span>';
          }}
        />
      );
    }
    // عضو لفل 31-40: ألماسة برتقالية مضيئة
    if (level >= 31 && level <= 40) {
      return (
        <img
          src="/svgs/orange_shine.svg"
          alt="lvl31-40"
          style={{ width: size, height: size, display: 'inline' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.outerHTML =
              '<span style="color: #f97316; font-size: ' + size + 'px; display: inline;">🔥</span>';
          }}
        />
      );
    }
  }

  // للضيوف - نقطة خضراء بسيطة
  if (user.userType === 'guest') {
    return <span style={{ color: '#10b981', fontSize: size * 0.8 }}>●</span>;
  }

  // افتراضي لأي حالة أخرى
  return <span style={{ color: '#10b981', fontSize: size * 0.8 }}>●</span>;
}

export default function UserRoleBadge({
  user,
  showOnlyIcon = false,
  size = 20,
}: UserRoleBadgeProps) {
  const roleIcon = getUserLevelIcon(user, size);

  return <span className="inline-flex items-center justify-center">{roleIcon}</span>;
}
