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
  showInitials?: boolean; // إظهار الأحرف الأولى عند عدم وجود صورة
}

export default function ProfileImage({
  user,
  size = 'medium',
  className = '',
  onClick,
  hideRoleBadgeOverlay = false,
  showInitials = true,
}: ProfileImageProps) {
  const sizeClasses = {
    small: 'w-10 h-10',
    medium: 'w-16 h-16',
    large: 'w-20 h-20',
  };

  const fontSizeClasses = {
    small: 'text-sm',
    medium: 'text-lg',
    large: 'text-2xl',
  };

  // تحديد لون الإطار حسب الجنس
  const borderColor =
    user.gender === 'female' ? 'border-pink-400 ring-pink-200' : 'border-blue-400 ring-blue-200';

  // تحديد لون الخلفية للأحرف الأولى حسب الجنس
  const bgColor = user.gender === 'female' ? 'bg-pink-100' : 'bg-blue-100';
  const textColor = user.gender === 'female' ? 'text-pink-600' : 'text-blue-600';

  // تحديد مصدر الصورة بشكل مستقر
  const imageSrc = useMemo(() => {
    const avatarHash = (user as any).avatarHash || (user as any).avatarVersion;
    return getProfileImageSrc(user.profileImage, user.id, avatarHash);
  }, [user.profileImage, user.id, (user as any)?.avatarHash, (user as any)?.avatarVersion]);

  // الحصول على الأحرف الأولى من اسم المستخدم
  const getInitials = (username: string): string => {
    if (!username) return '؟';
    
    // إذا كان الاسم عربي
    const arabicMatch = username.match(/[\u0600-\u06FF]/);
    if (arabicMatch) {
      // نأخذ أول حرفين من الاسم العربي
      return username.substring(0, 2).toUpperCase();
    }
    
    // إذا كان الاسم لاتيني
    const words = username.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(user.username || '');

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
            // إخفاء الصورة المعطوبة
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : showInitials ? (
        // عرض الأحرف الأولى إذا لم توجد صورة
        <div
          className={`${sizeClasses[size]} rounded-full ring-2 ${borderColor} shadow-sm ${bgColor} ${textColor} flex items-center justify-center font-bold ${fontSizeClasses[size]} ${className}`}
        >
          {initials}
        </div>
      ) : (
        // عرض دائرة فارغة إذا لم نرد إظهار الأحرف الأولى
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
