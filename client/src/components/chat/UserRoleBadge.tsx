import React from 'react';

import type { ChatUser } from '../../types/chat';

interface UserRoleBadgeProps {
  user: ChatUser;
  showOnlyIcon?: boolean;
  size?: number;
  hideGuestAndGender?: boolean;
}

/**
 * نظام الشعارات الموحد للموقع
 *
 * المالك (owner): تاج من client/public/svgs/crown.svg
 * المشرف العام (admin): نجمة من client/public/svgs/star.svg
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

  // توحيد قيمة الجنس لدعم العربي والإنجليزي
  const normalizeGender = (g?: string): 'male' | 'female' | undefined => {
    if (!g) return undefined;
    const trimmed = String(g).trim().toLowerCase();
    if (trimmed === 'male' || trimmed === 'ذكر') return 'male';
    if (trimmed === 'female' || trimmed === 'أنثى' || trimmed === 'انثى') return 'female';
    return undefined;
  };

  // owner: تاج SVG مع fallback
  if (user.userType === 'owner') {
    return (
      <img
        src="/svgs/crown.svg"
        alt="owner"
        style={{ width: '1.15em', height: '1.15em', display: 'inline-block', lineHeight: 1, verticalAlign: '-0.15em' }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.outerHTML = '<span style="font-size: 1em; display: inline;">👑</span>';
        }}
      />
    );
  }
  // admin: نجمة
  if (user.userType === 'admin') {
    return (
      <img
        src="/svgs/star.svg"
        alt="admin"
        style={{ width: '1em', height: '1em', display: 'inline-block', lineHeight: 1, verticalAlign: '-0.15em' }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.outerHTML = '<span style="font-size: 1em; display: inline;">⭐</span>';
        }}
      />
    );
  }
  // moderator: درع
  if (user.userType === 'moderator') {
    return (
      <img
        src="/svgs/moderator_shield.svg"
        alt="moderator"
        style={{ width: '1em', height: '1em', display: 'inline-block', lineHeight: 1, verticalAlign: '-0.15em' }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.outerHTML = '<span style="font-size: 1em; display: inline;">🛡️</span>';
        }}
      />
    );
  }

  // للأعضاء والبوتات - نفحص المستوى والجنس (نفس منطق الأعضاء للبوت)
  if (user.userType === 'member' || user.userType === 'bot') {
    const level = user.level || 1; // افتراضي 1 إذا لم يكن محدد
    const gender = normalizeGender(user.gender) || 'male'; // افتراضي ذكر إذا لم يكن محدد

    // عضو ذكر لفل 1-10: سهم أزرق
    if (level >= 1 && level <= 10 && gender === 'male') {
      return (
        <img
          src="/svgs/blue_arrow.svg"
          alt="male-lvl1-10"
          style={{ width: '1.15em', height: '1em', display: 'inline-block', lineHeight: 1, verticalAlign: '-0.15em' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.outerHTML =
              '<span style="color: #3b82f6; font-size: 1em; display: inline;">↗️</span>';
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
          style={{ width: '1.15em', height: '1em', display: 'inline-block', lineHeight: 1, verticalAlign: '-0.15em' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.outerHTML =
              '<span style="color: #ec4899; font-size: 1em; display: inline;">🏅</span>';
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
          style={{ width: '1em', height: '0.85em', display: 'inline-block', lineHeight: 1, verticalAlign: '-0.15em' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.outerHTML =
              '<span style="color: #f8fafc; font-size: 1em; display: inline;">💎</span>';
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
          style={{ width: '1em', height: '0.85em', display: 'inline-block', lineHeight: 1, verticalAlign: '-0.15em' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.outerHTML =
              '<span style="color: #10b981; font-size: 1em; display: inline;">💚</span>';
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
          style={{ width: '1em', height: '0.85em', display: 'inline-block', lineHeight: 1, verticalAlign: '-0.15em' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.outerHTML =
              '<span style="color: #f97316; font-size: 1em; display: inline;">🔥</span>';
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
  hideGuestAndGender = false,
}: UserRoleBadgeProps) {
  // توحيد قيمة الجنس لدعم العربي والإنجليزي
  const normalizeGender = (g?: string): 'male' | 'female' | undefined => {
    if (!g) return undefined;
    const trimmed = String(g).trim().toLowerCase();
    if (trimmed === 'male' || trimmed === 'ذكر') return 'male';
    if (trimmed === 'female' || trimmed === 'أنثى' || trimmed === 'انثى') return 'female';
    return undefined;
  };
  // إخفاء شعار الضيف وشعار الأعضاء المعتمد على الجنس للمستويات 1–10 في سياقات محددة (مثل الدردشة)
  if (hideGuestAndGender) {
    if (user?.userType === 'guest') {
      return null;
    }
    if (user?.userType === 'member') {
      const level = user.level || 1;
      const gender = normalizeGender(user.gender) || 'male';
      if (level >= 1 && level <= 10 && (gender === 'male' || gender === 'female')) {
        return null;
      }
    }
  }
  const roleIcon = getUserLevelIcon(user, size);

  return (
    <span
      className="inline-block"
      style={{ lineHeight: 1, height: '1em', verticalAlign: '-0.15em' }}
    >
      {roleIcon}
    </span>
  );
}
