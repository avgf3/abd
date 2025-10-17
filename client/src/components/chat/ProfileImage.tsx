import { memo, useMemo, useState } from 'react';

import type { ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import VipAvatar from '@/components/ui/VipAvatar';

interface ProfileImageProps {
  user: ChatUser;
  size?: 'small' | 'medium' | 'large';
  pixelSize?: number;
  className?: string;
  onClick?: (e: any) => void;
  hideRoleBadgeOverlay?: boolean;
  disableFrame?: boolean;
}

interface CrownOverlayProps {
  src: string;
  size: number;
}

// مكون التاج البسيط - بدون أي تعقيدات!
const CrownOverlay = memo(function CrownOverlay({ src, size, tagNumber }: CrownOverlayProps & { tagNumber?: number }) {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  // حجم التاج = 120% من حجم الصورة
  const crownSize = Math.round(size * 1.2);

  // التاجات 3، 5، 6، 7، 23، 25 تبقى كما هي (-35%)
  // باقي التاجات تُرفع إلى -47%
  const keepOriginal = tagNumber === 3 || tagNumber === 5 || tagNumber === 6 || tagNumber === 7 || tagNumber === 23 || tagNumber === 25;
  const yPosition = keepOriginal ? -35 : -47;

  return (
    <img
      src={imageSrc}
      alt="crown"
      className="profile-crown"
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        width: crownSize,
        height: 'auto',
        transform: `translate(-50%, ${yPosition}%)`, // رفع التاج
        pointerEvents: 'none',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.2s',
        zIndex: 10,
      }}
      loading="lazy"
      decoding="async"
      draggable={false}
      onLoad={() => setIsVisible(true)}
      onError={(e: any) => {
        // Fallback chain: .webp -> .png -> .jpg
        const cur = imageSrc || '';
        if (/\.webp(\?.*)?$/.test(cur)) {
          setImageSrc(cur.replace(/\.webp(\?.*)?$/i, '.png$1'));
        } else if (/\.png(\?.*)?$/.test(cur)) {
          setImageSrc(cur.replace(/\.png(\?.*)?$/i, '.jpg$1'));
        } else {
          e.currentTarget.style.display = 'none';
        }
      }}
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

  // تحديد لون الإطار حسب الجنس
  const isFemale = user.gender === 'female' || user.gender === 'أنثى';
  const borderColor = isFemale ? 'border-pink-400 ring-pink-200' : 'border-blue-400 ring-blue-200';

  // مصدر الصورة
  const imageSrc = useMemo(() => {
    if (!user.profileImage) {
      return '/default_avatar.svg';
    }
    
    const base = getImageSrc(user.profileImage, '/default_avatar.svg');
    
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
  
  // استخراج رقم التاج
  const tagNumber = useMemo(() => {
    if (!tagName) return undefined;
    const str = String(tagName);
    const m = str.match(/(\d+)/);
    if (m && Number.isFinite(parseInt(m[1]))) {
      return Math.max(1, Math.min(50, parseInt(m[1])));
    }
    return undefined;
  }, [tagName]);
  
  const crownSrc: string | undefined = useMemo(() => {
    if (!tagName) return undefined;
    const str = String(tagName);
    if (str.startsWith('data:') || str.startsWith('/') || str.includes('/')) return str;
    if (tagNumber) {
      return `/tags/tag${tagNumber}.webp`;
    }
    return `/tags/${str}`;
  }, [tagName, tagNumber]);
  
  const frameIndex = (() => {
    if (!frameName) return undefined;
    const match = String(frameName).match(/(\d+)/);
    if (!match) return undefined;
    const n = parseInt(match[1], 10);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return Math.min(50, n) as any;
  })();

  // حساب الأحجام
  const px = pixelSize ?? (size === 'small' ? 36 : size === 'large' ? 72 : 56);
  const containerSize = px * 1.4; // حاوية أكبر قليلاً للتاج

  // مع إطار
  if (!disableFrame && frameName && frameIndex) {
    return (
      <div
        className={`relative inline-block ${className || ''}`}
        onClick={onClick}
        style={{ 
          width: containerSize, 
          height: containerSize,
          position: 'relative',
        }}
      >
        <div style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}>
          <VipAvatar 
            src={imageSrc} 
            alt={`صورة ${user.username}`} 
            size={px} 
            frame={frameIndex as any} 
          />
        </div>
        {crownSrc && <CrownOverlay src={crownSrc} size={px} tagNumber={tagNumber} />}
      </div>
    );
  }

  // بدون إطار
  return (
    <div
      className={`relative inline-block ${className || ''}`}
      onClick={onClick}
      style={{ 
        width: containerSize, 
        height: containerSize,
        position: 'relative',
      }}
    >
      <div style={{ 
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}>
        <img
          src={imageSrc}
          alt={`صورة ${user.username}`}
          className={`rounded-full ring-[3px] ${borderColor} shadow-sm object-cover`}
          style={{
            width: px,
            height: px,
            display: 'block',
          }}
          loading="lazy"
          decoding="async"
          onError={(e: any) => {
            if (e?.currentTarget && e.currentTarget.src !== '/default_avatar.svg') {
              e.currentTarget.src = '/default_avatar.svg';
            }
          }}
        />
      </div>
      {crownSrc && <CrownOverlay src={crownSrc} size={px} tagNumber={tagNumber} />}
    </div>
  );
}
