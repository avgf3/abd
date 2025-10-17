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
  tagNumber?: number;
}

// Simple crown component - no complex positioning
const CrownOverlay = memo(function CrownOverlay({ src, size, tagNumber }: CrownOverlayProps) {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  // Simple crown size - 20% larger than avatar
  const crownSize = Math.round(size * 1.2);

  return (
    <img
      src={imageSrc}
      alt="crown"
      className="profile-crown"
      style={{
        position: 'absolute',
        top: '-10%',
        left: '50%',
        width: crownSize,
        height: 'auto',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.2s',
        zIndex: 2,
      }}
      loading="lazy"
      decoding="async"
      draggable={false}
      onLoad={() => setIsVisible(true)}
      onError={(e: any) => {
        // Simple fallback chain: .webp -> .png -> .jpg
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
  // Simple size mapping
  const sizeMap = {
    small: 32,
    medium: 48,
    large: 64,
  };

  // Simple border color based on gender
  const isFemale = user.gender === 'female' || user.gender === 'أنثى';
  const borderColor = isFemale ? 'border-pink-400' : 'border-blue-400';

  // Image source with simple fallback
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
  
  // Simple tag number extraction
  const tagNumber = useMemo(() => {
    if (!tagName) return undefined;
    const str = String(tagName);
    const m = str.match(/(\d+)/);
    if (m && Number.isFinite(parseInt(m[1]))) {
      return Math.max(1, Math.min(50, parseInt(m[1])));
    }
    return undefined;
  }, [tagName]);
  
  // Simple crown source
  const crownSrc: string | undefined = useMemo(() => {
    if (!tagName) return undefined;
    const str = String(tagName);
    if (str.startsWith('data:') || str.startsWith('/') || str.includes('/')) return str;
    if (tagNumber) {
      return `/tags/tag${tagNumber}.webp`;
    }
    return `/tags/${str}`;
  }, [tagName, tagNumber]);
  
  // Simple frame extraction
  const frameIndex = (() => {
    if (!frameName) return undefined;
    const match = String(frameName).match(/(\d+)/);
    if (!match) return undefined;
    const n = parseInt(match[1], 10);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return Math.min(50, n) as any;
  })();

  // Simple size calculation - no complex multipliers
  const px = pixelSize ?? sizeMap[size];

  // With frame
  if (!disableFrame && frameName && frameIndex) {
    return (
      <div
        className={`relative inline-block ${className || ''}`}
        onClick={onClick}
        style={{ 
          width: px, 
          height: px,
          position: 'relative',
        }}
      >
        <VipAvatar 
          src={imageSrc} 
          alt={`صورة ${user.username}`} 
          size={px} 
          frame={frameIndex as any} 
        />
        {crownSrc && <CrownOverlay src={crownSrc} size={px} tagNumber={tagNumber} />}
      </div>
    );
  }

  // Without frame - simple avatar
  return (
    <div
      className={`relative inline-block ${className || ''}`}
      onClick={onClick}
      style={{ 
        width: px, 
        height: px,
        position: 'relative',
      }}
    >
      <img
        src={imageSrc}
        alt={`صورة ${user.username}`}
        className={`rounded-full ring-2 ${borderColor} shadow-sm`}
        style={{
          width: px,
          height: px,
          display: 'block',
          objectFit: 'cover',
        }}
        loading="lazy"
        decoding="async"
        onError={(e: any) => {
          if (e?.currentTarget && e.currentTarget.src !== '/default_avatar.svg') {
            e.currentTarget.src = '/default_avatar.svg';
          }
        }}
      />
      {crownSrc && <CrownOverlay src={crownSrc} size={px} tagNumber={tagNumber} />}
    </div>
  );
}