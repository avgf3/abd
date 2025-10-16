import { memo, useEffect, useMemo, useState } from 'react';

import { getUserLevelIcon } from '@/components/chat/UserRoleBadge';
import type { ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import VipAvatar from '@/components/ui/VipAvatar';
import { TAG_CONFIG } from '@/config/tagLayouts';

interface ProfileImageProps {
  user: ChatUser;
  size?: 'small' | 'medium' | 'large';
  pixelSize?: number;
  className?: string;
  onClick?: (e: any) => void;
  hideRoleBadgeOverlay?: boolean;
  disableFrame?: boolean;
}

type TagOverlayProps = {
  src: string;
  basePx: number;      // عرض التاج بالبكسل
  yAdjustPx: number;   // إزاحة عمودية
};

// مكون التاج - بسيط ومباشر
const TagOverlay = memo(function TagOverlay({ src, basePx, yAdjustPx }: TagOverlayProps) {
  return (
    <img
      src={src}
      alt="tag"
      className="profile-tag-overlay"
      style={{
        position: 'absolute',
        top: yAdjustPx,
        left: '50%',
        width: basePx,
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }}
      draggable={false}
    />
  );
});

export default function ProfileImage({
  user,
  size = 'medium',
  pixelSize,
  className = '',
  onClick,
  hideRoleBadgeOverlay = false,
  disableFrame = false,
}: ProfileImageProps) {
  const sizeClasses = {
    small: 'w-9 h-9',
    medium: 'w-14 h-14',
    large: 'w-18 h-18',
  };

  // تحديد لون الإطار حسب الجنس - كما كان سابقاً (ring + border color)
  // دعم القيم العربية للجنس إضافة إلى الإنجليزية
  const isFemale = user.gender === 'female' || user.gender === 'أنثى';
  const borderColor = isFemale ? 'border-pink-400 ring-pink-200' : 'border-blue-400 ring-blue-200';
  


  // مصدر الصورة مع دعم ?v=hash إذا وُجد ومعالجة أفضل للحالات الفارغة
  const imageSrc = useMemo(() => {
    // التأكد من وجود profileImage قبل المعالجة
    if (!user.profileImage) {
      return '/default_avatar.svg';
    }
    
    const base = getImageSrc(user.profileImage, '/default_avatar.svg');
    
    // لا تضف ?v عندما يكون base عبارة عن data:base64 أو يحتوي بالفعل على v
    const isBase64 = typeof base === 'string' && base.startsWith('data:');
    const hasVersionAlready = typeof base === 'string' && base.includes('?v=');
    const versionTag = (user as any)?.avatarHash || (user as any)?.avatarVersion;
    
    if (!isBase64 && versionTag && !hasVersionAlready && typeof base === 'string' && base.startsWith('/')) {
      return `${base}?v=${versionTag}`;
    }
    
    return base;
  }, [user.profileImage, (user as any)?.avatarHash, (user as any)?.avatarVersion]);

  const frameName = (user as any)?.profileFrame as string | undefined;
  const tagName = (user as any)?.profileTag as string | undefined;
  const tagSrc: string | undefined = (() => {
    if (!tagName) return undefined;
    const str = String(tagName);
    if (str.startsWith('data:') || str.startsWith('/') || str.includes('/')) return str;
    const m = str.match(/(\d+)/);
    if (m && Number.isFinite(parseInt(m[1]))) {
      const n = Math.max(1, Math.min(50, parseInt(m[1])));
      return `/tags/tag${n}.webp`;
    }
    return `/tags/${str}`;
  })();
  const tagNumber: number | undefined = (() => {
    if (!tagName) return undefined;
    const m = String(tagName).match(/(\d+)/);
    if (!m) return undefined;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? n : undefined;
  })();

  const frameIndex = (() => {
    if (!frameName) return undefined;
    const match = String(frameName).match(/(\d+)/);
    if (!match) return undefined;
    const n = parseInt(match[1], 10);
    if (!Number.isFinite(n) || n <= 0) return undefined; // تجاهل 0 أو قيم غير صالحة
    // دعم حتى 50 إطاراً
    return Math.min(50, n) as any;
  })();

  const px = pixelSize ?? (size === 'small' ? 36 : size === 'large' ? 72 : 56);
  const containerSize = px * 1.35;
  const tagWidth = Math.round(px * TAG_CONFIG.widthRatio);
  const tagTop = Math.round(px * TAG_CONFIG.topOffsetRatio);

  if (!disableFrame && frameName && frameIndex) {
    return (
      <div className={`relative inline-block ${className || ''}`} onClick={onClick} style={{ width: containerSize, height: containerSize, overflow: 'visible' }}>
        <VipAvatar src={imageSrc} alt={`صورة ${user.username}`} size={px} frame={frameIndex as any} />
        {tagSrc && <TagOverlay src={tagSrc} basePx={tagWidth} yAdjustPx={tagTop} />}
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className || ''}`} onClick={onClick} style={{ width: containerSize, height: containerSize, overflow: 'visible' }}>
      <img
        src={imageSrc}
        alt={`صورة ${user.username}`}
        className={`rounded-full ring-[3px] ${borderColor} shadow-sm object-cover`}
        style={{ width: px, height: px }}
        loading="lazy"
        onError={(e: any) => {
          if (e?.currentTarget && e.currentTarget.src !== '/default_avatar.svg') {
            e.currentTarget.src = '/default_avatar.svg';
          }
        }}
      />
      {tagSrc && <TagOverlay src={tagSrc} basePx={tagWidth} yAdjustPx={tagTop} />}
    </div>
  );
}
