import { useMemo } from 'react';

import { getUserLevelIcon } from '@/components/chat/UserRoleBadge';
import type { ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import VipAvatar from '@/components/ui/VipAvatar';

interface ProfileImageProps {
  user: ChatUser;
  size?: 'small' | 'medium' | 'large';
  // حجم بكسلات مخصص لتوحيد المقاس بدقة أينما لزم
  pixelSize?: number;
  className?: string;
  onClick?: (e: any) => void;
  hideRoleBadgeOverlay?: boolean;
  // تعطيل عرض إطار الصورة في سياقات معينة (مثل الرسائل)
  disableFrame?: boolean;
}

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
    // مقاسات دقيقة لتطابق الموقع الآخر - مُصغرة بحوالي 10%
    const px = pixelSize ?? (size === 'small' ? 36 : size === 'large' ? 72 : 56);
    // الحاوية يجب أن تكون أكبر لاستيعاب الإطار (نفس النسبة المستخدمة في VipAvatar)
    const containerSize = px * 1.35;
    const imageTopWithinContainer = (containerSize - px) / 2; // موضع أعلى الصورة داخل الحاوية
    const overlayTopPx = imageTopWithinContainer; // موضع التاج ليلامس أعلى الصورة مباشرة
    const overlayWidthPx = Math.round(px);
    return (
      <div className={`relative inline-block ${className || ''}`} onClick={onClick} style={{ width: containerSize, height: containerSize }}>
        <VipAvatar src={imageSrc} alt={`صورة ${user.username}`} size={px} frame={frameIndex as any} />
        {tagSrc && (
          <img
            src={tagSrc}
            alt="tag"
            className="profile-tag-overlay"
            aria-hidden="true"
            style={{ 
              top: overlayTopPx, 
              width: overlayWidthPx, 
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'transparent',
              background: 'transparent'
            }}
            onError={(e: any) => { try { e.currentTarget.style.display = 'none'; } catch {} }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block" onClick={onClick} style={{ width: pixelSize ? pixelSize : undefined, height: pixelSize ? pixelSize : undefined }}>
      <img
        src={imageSrc}
        alt={`صورة ${user.username}`}
        className={`${sizeClasses[size]} rounded-full ring-[3px] ${borderColor} shadow-sm object-cover ${className}`}
        style={{
          width: pixelSize ? pixelSize : undefined,
          height: pixelSize ? pixelSize : undefined,
          transition: 'none',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          display: 'block',
        }}
        loading="lazy"
        decoding="async"
        sizes={size === 'small' ? '36px' : size === 'large' ? '72px' : '56px'}
        onError={(e: any) => {
          if (e?.currentTarget && e.currentTarget.src !== '/default_avatar.svg') {
            e.currentTarget.src = '/default_avatar.svg';
          }
        }}
      />
      {(() => {
        if (!tagSrc) return null;
        const basePx = pixelSize ?? (size === 'small' ? 36 : size === 'large' ? 72 : 56);
        const overlayTopPx = 0; // أعلى الحاوية يطابق أعلى الصورة هنا
        const overlayWidthPx = Math.round(basePx);
        return (
          <img
            src={tagSrc}
            alt="tag"
            className="profile-tag-overlay"
            aria-hidden="true"
            style={{ 
              top: overlayTopPx, 
              width: overlayWidthPx, 
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'transparent',
              background: 'transparent'
            }}
            onError={(e: any) => { try { e.currentTarget.style.display = 'none'; } catch {} }}
          />
        );
      })()}
    </div>
  );
}
