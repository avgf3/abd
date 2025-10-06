import { useMemo } from 'react';

import { getUserLevelIcon } from '@/components/chat/UserRoleBadge';
import type { ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import VipAvatar from '@/components/ui/VipAvatar';

interface ProfileImageProps {
  user: ChatUser;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: (e: any) => void;
  hideRoleBadgeOverlay?: boolean;
  // تعطيل عرض إطار الصورة في سياقات معينة (مثل الرسائل)
  disableFrame?: boolean;
}

export default function ProfileImage({
  user,
  size = 'medium',
  className = '',
  onClick,
  hideRoleBadgeOverlay = false,
  disableFrame = false,
}: ProfileImageProps) {
  const sizeClasses = {
    small: 'w-10 h-10',
    medium: 'w-16 h-16',
    large: 'w-20 h-20',
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
  const frameIndex = (() => {
    if (!frameName) return undefined;
    const match = String(frameName).match(/(\d+)/);
    if (match) {
      const n = parseInt(match[1]);
      if (Number.isFinite(n)) return (Math.max(1, Math.min(10, n)) as any);
    }
    return undefined;
  })();

  if (!disableFrame && frameName && frameIndex) {
    const px = size === 'small' ? 40 : size === 'large' ? 80 : 64;
    return (
      <div className={`relative inline-block ${className || ''}`} onClick={onClick}>
        <VipAvatar src={imageSrc} alt={`صورة ${user.username}`} size={px} frame={frameIndex as any} />
      </div>
    );
  }

  return (
    <div className="relative inline-block" onClick={onClick}>
      <img
        src={imageSrc}
        alt={`صورة ${user.username}`}
        className={`${sizeClasses[size]} rounded-full ring-2 ${borderColor} shadow-sm object-cover ${className}`}
        style={{
          transition: 'none',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          display: 'block',
        }}
        loading="lazy"
        decoding="async"
        sizes={size === 'small' ? '40px' : size === 'large' ? '80px' : '64px'}
        onError={(e: any) => {
          if (e?.currentTarget && e.currentTarget.src !== '/default_avatar.svg') {
            e.currentTarget.src = '/default_avatar.svg';
          }
        }}
      />
    </div>
  );
}
