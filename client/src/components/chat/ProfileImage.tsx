import { useMemo } from 'react';

import { getUserLevelIcon } from '@/components/chat/UserRoleBadge';
import type { ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';

interface ProfileImageProps {
  user: ChatUser;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: (e: any) => void;
  hideRoleBadgeOverlay?: boolean;
}

export default function ProfileImage({
  user,
  size = 'medium',
  className = '',
  onClick,
  hideRoleBadgeOverlay = false,
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

  return (
    <div className="relative inline-block" onClick={onClick}>
      {/* الصورة الأساسية */}
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
            console.warn(`Failed to load profile image for ${user.username}, falling back to default`);
            e.currentTarget.src = '/default_avatar.svg';
          }
        }}
      />

      {/* تم إزالة الشعار داخل الصورة بناءً على طلب المستخدم */}
    </div>
  );
}
