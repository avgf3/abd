import { useMemo } from 'react';

import { getUserLevelIcon } from '@/components/chat/UserRoleBadge';
import type { ChatUser } from '@/types/chat';
import { getProfileImageSrc } from '@/utils/imageUtils';

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

  // تحديد لون الإطار حسب الجنس
  const borderColor =
    user.gender === 'female' ? 'border-pink-400 ring-pink-200' : 'border-blue-400 ring-blue-200';

  // تحديد لون الخلفية حسب الجنس
  const bgColor = user.gender === 'female' ? 'bg-pink-50' : 'bg-blue-50';

  // تحديد مصدر الصورة بشكل مستقر
  const imageSrc = useMemo(() => {
    const avatarHash = (user as any).avatarHash || (user as any).avatarVersion;
    return getProfileImageSrc(user.profileImage, user.id, avatarHash);
  }, [user.profileImage, user.id, (user as any)?.avatarHash, (user as any)?.avatarVersion]);

  return (
    <div className="relative inline-block" onClick={onClick}>
      {imageSrc ? (
        // عرض الصورة إذا كانت موجودة
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
          onError={(e) => {
            // إخفاء الصورة المعطوبة وعرض الأفاتار الفارغ
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            
            // إنشاء div بديل
            const parent = img.parentElement;
            if (parent) {
              const placeholder = document.createElement('div');
              placeholder.className = `${sizeClasses[size]} rounded-full ring-2 ${borderColor} shadow-sm ${bgColor}`;
              parent.appendChild(placeholder);
            }
          }}
        />
      ) : (
        // عرض أفاتار فارغ بدون صورة أو أحرف
        <div
          className={`${sizeClasses[size]} rounded-full ring-2 ${borderColor} shadow-sm ${bgColor} ${className}`}
        />
      )}

      {/* مؤشر الدور */}
      {!hideRoleBadgeOverlay &&
        (user.userType === 'owner' ||
          user.userType === 'admin' ||
          user.userType === 'moderator') && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-white border-2 border-white rounded-full flex items-center justify-center overflow-hidden">
            <span className="scale-90">{getUserLevelIcon(user, 14)}</span>
          </div>
        )}
    </div>
  );
}
