import { useMemo } from 'react';
import { useImageLoader } from '@/hooks/useImageLoader';
import { getImageSrc } from '@/utils/imageUtils';
import type { ChatUser } from '@/types/chat';
import { getUserLevelIcon } from '@/components/chat/UserRoleBadge';

interface ProfileImageProps {
  user: ChatUser;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: (e: any) => void;
  hideRoleBadgeOverlay?: boolean;
}

export default function ProfileImage({ user, size = 'medium', className = '', onClick, hideRoleBadgeOverlay = false }: ProfileImageProps) {
  const sizeClasses = {
    small: 'w-10 h-10',
    medium: 'w-16 h-16',
    large: 'w-20 h-20'
  };

  // تحديد مصدر الصورة بشكل مستقر
  const imageSrc = useMemo(() => {
    return getImageSrc(user.profileImage, '');
  }, [user.profileImage]);

  const fallbackSrc = '/default_avatar.svg';
  const { src: finalSrc, isLoading } = useImageLoader({ src: imageSrc, fallback: fallbackSrc });

  return (
    <div className="relative inline-block" onClick={onClick}>
      {/* الصورة الأساسية */}
      <img
        src={finalSrc}
        alt={`صورة ${user.username}`}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        style={{
          transition: 'none',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          display: 'block'
        }}
        loading="lazy"
      />
      
      {/* مؤشر التحميل */}
      {isLoading && (
        <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center absolute inset-0 z-10`}>
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* مؤشر الدور統一 */}
      {!hideRoleBadgeOverlay && (user.userType === 'owner' || user.userType === 'admin' || user.userType === 'moderator') && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-white border-2 border-white rounded-full flex items-center justify-center overflow-hidden">
          <span className="scale-90">{getUserLevelIcon(user, 14)}</span>
        </div>
      )}
    </div>
  );
}