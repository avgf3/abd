import React from 'react';

import type { ChatUser } from '../../types/chat';

interface UserRoleBadgeProps {
  user: ChatUser;
  showOnlyIcon?: boolean;
  size?: number;
  hideGuestAndGender?: boolean;
}

// إصدار للأصول لكسر الكاش عند تحديث الشعارات
const ASSET_VERSION = '3';

/**
 * نظام الشعارات الموحد للموقع
 *
 * المالك (owner): تاج من client/public/svgs/crown.svg
 * المشرف العام (admin): نجمة من client/public/svgs/star.svg
 * المراقب (moderator): 🛡️
 * العضو (ذكر) مستوى 1–10: سهم أزرق client/public/svgs/blue_arrow.svg
 * العضو (أنثى) مستوى 1–10: ميدالية وردية client/public/svgs/pink_medal.svg
 * العضو مستوى 20 وأكثر: شعار رمادي client/public/svgs/level20_gray.svg
 * العضو مستوى 30 وأكثر: شعار برتقالي client/public/svgs/level30_orange.svg
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
    const w = size * 1.15;
    const h = size * 1.15;
    return (
      <img
        src={`/svgs/crown.svg?v=${ASSET_VERSION}`}
        alt="owner"
        style={{ width: w, height: h, display: 'inline', verticalAlign: 'middle' }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.outerHTML = '<span style="font-size: ' + Math.max(w, h) + 'px; display: inline;">👑</span>';
        }}
      />
    );
  }
  // admin: نجمة
  if (user.userType === 'admin') {
    const w = size;
    const h = size;
    return (
      <img
        src={`/svgs/star.svg?v=${ASSET_VERSION}`}
        alt="admin"
        style={{ width: w, height: h, display: 'inline', verticalAlign: 'middle' }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.outerHTML = '<span style="font-size: ' + Math.max(w, h) + 'px; display: inline;">⭐</span>';
        }}
      />
    );
  }
  // moderator: درع
  if (user.userType === 'moderator') {
    const w = size;
    const h = size;
    return (
      <img
        src={`/svgs/moderator_shield.svg?v=${ASSET_VERSION}`}
        alt="moderator"
        style={{ width: w, height: h, display: 'inline', verticalAlign: 'middle' }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.outerHTML = '<span style="font-size: ' + Math.max(w, h) + 'px; display: inline;">🛡️</span>';
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
      const w = size * 1.15; // تعريض بسيط
      const h = size;
      return (
        <img
          src={`/svgs/blue_arrow.svg?v=${ASSET_VERSION}`}
          alt="male-lvl1-10"
          style={{ width: w, height: h, display: 'inline', verticalAlign: 'middle' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.outerHTML =
              '<span style="color: #3b82f6; font-size: ' + Math.max(w, h) + 'px; display: inline;">↗️</span>';
          }}
        />
      );
    }
    // عضو أنثى لفل 1-10: ميدالية وردية
    if (level >= 1 && level <= 10 && gender === 'female') {
      const w = size * 1.15; // تعريض بسيط
      const h = size;
      return (
        <img
          src={`/svgs/pink_medal.svg?v=${ASSET_VERSION}`}
          alt="female-lvl1-10"
          style={{ width: w, height: h, display: 'inline', verticalAlign: 'middle' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.outerHTML =
              '<span style="color: #ec4899; font-size: ' + Math.max(w, h) + 'px; display: inline;">🏅</span>';
          }}
        />
      );
    }
    // عضو مستوى 30 وأكثر: شعار برتقالي
    if (level >= 30) {
      const w = size;
      const h = size;
      return (
        <img
          src={`/svgs/level30_orange.svg?v=${ASSET_VERSION}`}
          alt="lvl30+"
          style={{ width: w, height: h, display: 'inline', verticalAlign: 'middle' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.outerHTML =
              '<span style="color: #FF8C00; font-size: ' + Math.max(w, h) + 'px; display: inline;">🔥</span>';
          }}
        />
      );
    }
    // عضو مستوى 20 وأكثر: شعار رمادي
    if (level >= 20) {
      const w = size;
      const h = size;
      return (
        <img
          src={`/svgs/level20_gray.svg?v=${ASSET_VERSION}`}
          alt="lvl20+"
          style={{ width: w, height: h, display: 'inline', verticalAlign: 'middle' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.outerHTML =
              '<span style="color: #767373; font-size: ' + Math.max(w, h) + 'px; display: inline;">⚡</span>';
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
  // عرض لقب صورة بدلاً من أيقونة الدور/المستوى إذا كان محدداً
  const titleSrc = (() => {
    const t = (user as any)?.profileTitle as string | undefined;
    if (!t) return undefined;
    const s = String(t);
    if (s.startsWith('data:') || s.startsWith('/') || s.includes('/')) return s;
    // دعم ترقيم بسيط مثل title1.webp
    const m = s.match(/(\d+)/);
    if (m && Number.isFinite(parseInt(m[1], 10))) {
      const n = Math.max(1, Math.min(100, parseInt(m[1], 10)));
      return `/titles/title${n}.webp`;
    }
    return `/titles/${s}`;
  })();

  if (titleSrc) {
    const w = size * 1.2;
    const h = size * 1.2;
    return (
      <img
        src={titleSrc}
        alt="title"
        style={{ width: w, height: h, display: 'inline', verticalAlign: 'middle', objectFit: 'contain' }}
        onError={(e) => {
          try { (e.target as HTMLImageElement).style.display = 'none'; } catch {}
        }}
      />
    );
  }
  // توحيد قيمة الجنس لدعم العربي والإنجليزي
  const normalizeGender = (g?: string): 'male' | 'female' | undefined => {
    if (!g) return undefined;
    const trimmed = String(g).trim().toLowerCase();
    if (trimmed === 'male' || trimmed === 'ذكر') return 'male';
    if (trimmed === 'female' || trimmed === 'أنثى' || trimmed === 'انثى') return 'female';
    return undefined;
  };
  // إخفاء شعار الضيف وشعار الأعضاء المعتمد على الجنس للمستويات 1–10 في سياقات محددة (مثل الدردشة)
  // المستويات 20+ و 30+ ستظهر دائماً
  if (hideGuestAndGender) {
    if (user?.userType === 'guest') {
      return null;
    }
    // إخفاء شعار البوت في رسائل الغرف
    if (user?.userType === 'bot') {
      return null;
    }
    if (user?.userType === 'member') {
      const level = user.level || 1;
      const gender = normalizeGender(user.gender) || 'male';
      if (level >= 1 && level <= 19 && (gender === 'male' || gender === 'female')) {
        return null;
      }
    }
  }
  const roleIcon = getUserLevelIcon(user, size);

  return <span className="inline-flex items-center justify-center">{roleIcon}</span>;
}
