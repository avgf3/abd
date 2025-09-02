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
  const borderColor =
    user.gender === 'female' ? 'border-pink-400 ring-pink-200' : 'border-blue-400 ring-blue-200';
  
  // إضافة تأثير متدرج للإطار حسب مستوى المستخدم
  const gradientBorder = useMemo(() => {
    // تم إزالة الإطار الخاص بالمالك
    if (user.role === 'admin') {
      return 'linear-gradient(135deg, #4B0082, #8A2BE2, #9400D3)';
    } else if (user.role === 'moderator') {
      return 'linear-gradient(135deg, #008000, #32CD32, #00FF00)';
    } else if (user.level && user.level >= 50) {
      return 'linear-gradient(135deg, #FF1493, #FF69B4, #FFB6C1)';
    } else if (user.level && user.level >= 30) {
      return 'linear-gradient(135deg, #00CED1, #48D1CC, #40E0D0)';
    } else if (user.level && user.level >= 10) {
      return 'linear-gradient(135deg, #9370DB, #BA55D3, #DA70D6)';
    }
    return null;
  }, [user.role, user.level]);

  // مصدر الصورة مع دعم ?v=hash إذا وُجد
  const imageSrc = useMemo(() => {
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
      {/* إطار متدرج إذا كان متوفرًا */}
      {gradientBorder && (
        <div 
          className={`absolute inset-0 ${sizeClasses[size]} rounded-full`}
          style={{
            background: gradientBorder,
            padding: '3px',
            WebkitMaskImage: 'radial-gradient(circle, transparent 65%, black 65%)',
            maskImage: 'radial-gradient(circle, transparent 65%, black 65%)',
          }}
        />
      )}
      
      {/* الصورة الأساسية */}
      <img
        src={imageSrc}
        alt={`صورة ${user.username}`}
        className={`${sizeClasses[size]} rounded-full ring-2 ${borderColor} shadow-sm object-cover ${className} ${gradientBorder ? 'relative' : ''}`}
        style={{
          transition: 'none',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          display: 'block',
        }}
        loading="lazy"
        decoding="async"
        sizes={size === 'small' ? '40px' : size === 'large' ? '80px' : '64px'}
        fetchpriority={size === 'large' ? 'high' : 'low'}
        onError={(e: any) => {
          if (e?.currentTarget && e.currentTarget.src !== '/default_avatar.svg') {
            e.currentTarget.src = '/default_avatar.svg';
          }
        }}
      />

      {/* تم إزالة الشعار داخل الصورة بناءً على طلب المستخدم */}
    </div>
  );
}
