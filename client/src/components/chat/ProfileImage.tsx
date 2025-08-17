import { useMemo } from 'react';

import { getUserLevelIcon } from '@/components/chat/UserRoleBadge';
import { useImageLoader } from '@/hooks/useImageLoader';
import type { ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import { AvatarWithFrame } from '@/components/ui/AvatarWithFrame';

interface ProfileImageProps {
  user: ChatUser;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: (e: any) => void;
  hideRoleBadgeOverlay?: boolean;
  showFrame?: boolean; // إظهار إطار الصورة أم لا (افتراضي: نعم)
}

export default function ProfileImage({ user, size = 'medium', className = '', onClick, hideRoleBadgeOverlay = false, showFrame = true }: ProfileImageProps) {
  const sizePixels = size === 'small' ? 40 : size === 'large' ? 80 : 64;

  // تحديد مصدر الصورة بشكل مستقر مع مراقبة تغيّر الهاش/الإصدار
  const imageSrc = useMemo(() => {
    const base = getImageSrc(user.profileImage, '/default_avatar.svg');
    const v = (user as any).avatarHash || (user as any).avatarVersion;
    if (base && v && typeof v === 'string' && !base.includes('?v=')) {
      return `${base}?v=${v}`;
    }
    if (base && v && typeof v === 'number' && !base.includes('?v=')) {
      return `${base}?v=${v}`;
    }
    return base || '/default_avatar.svg';
  }, [user.profileImage, (user as any)?.avatarHash, (user as any)?.avatarVersion]);

  return (
    <div className="relative inline-block" onClick={onClick}>
      <AvatarWithFrame
        src={imageSrc}
        alt={`صورة ${user.username}`}
        frame={showFrame ? (user.avatarFrame || 'none') : 'none'}
        pixelSize={sizePixels}
        innerScale={0.82}
        className={className}
      />

      {!hideRoleBadgeOverlay && (user.userType === 'owner' || user.userType === 'admin' || user.userType === 'moderator') && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-white border-2 border-white rounded-full flex items-center justify-center overflow-hidden">
          <span className="scale-90">{getUserLevelIcon(user, 14)}</span>
        </div>
      )}
    </div>
  );
}