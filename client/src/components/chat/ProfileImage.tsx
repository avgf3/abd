import React, { useMemo } from 'react';
import { useImageLoader } from '@/hooks/useImageLoader';
import type { ChatUser } from '@/types/chat';

interface ProfileImageProps {
  user: ChatUser;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: (e: any) => void;
}

export default function ProfileImage({ user, size = 'medium', className = '', onClick }: ProfileImageProps) {
  const sizeClasses = {
    small: 'w-10 h-10',
    medium: 'w-16 h-16',
    large: 'w-20 h-20'
  };

  // تحديد لون الإطار حسب الجنس
  const borderColor = user.gender === 'أنثى' || user.gender === 'female'
    ? 'border-pink-400 ring-pink-200' 
    : 'border-blue-400 ring-blue-200';

  // تحديد مصدر الصورة بشكل مستقر
  const imageSrc = useMemo(() => {
    // إذا لم تكن هناك صورة، استخدم الافتراضي
    if (!user.profileImage || user.profileImage === '' || user.profileImage === '/default_avatar.svg') {
      return '';
    }

    // إذا كانت الصورة URL كامل (http/https)
    if (user.profileImage.startsWith('http://') || user.profileImage.startsWith('https://')) {
      return user.profileImage;
    }

    // إذا كانت الصورة تبدأ بـ /uploads (مسار كامل)
    if (user.profileImage.startsWith('/uploads/')) {
      return user.profileImage;
    }

    // إذا كانت الصورة تبدأ بـ / (مسار من الجذر)
    if (user.profileImage.startsWith('/')) {
      return user.profileImage;
    }

    // إذا كانت اسم ملف فقط، أضف المسار
    return `/uploads/profiles/${user.profileImage}`;
  }, [user.profileImage]);

  const fallbackSrc = '/default_avatar.svg';
  const { src: finalSrc, isLoading } = useImageLoader({ src: imageSrc, fallback: fallbackSrc });

  return (
    <div className="relative inline-block" onClick={onClick}>
      {/* الصورة الأساسية */}
      <img
        src={finalSrc}
        alt={`صورة ${user.username}`}
        className={`${sizeClasses[size]} rounded-full ring-2 ${borderColor} shadow-sm object-cover ${className}`}
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
      
      {/* مؤشر الحالة (أونلاين/أوفلاين) */}
      {user.isOnline && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
      )}
      
      {/* مؤشر الدور (للمالك والإدمن) */}
      {(user.userType === 'owner' || user.userType === 'admin') && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 border-2 border-white rounded-full flex items-center justify-center">
          <span className="text-xs text-white">
            {user.userType === 'owner' ? '👑' : '⭐'}
          </span>
        </div>
      )}
    </div>
  );
}