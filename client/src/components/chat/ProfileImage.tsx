import { useState } from 'react';
import type { ChatUser } from '@/types/chat';

interface ProfileImageProps {
  user: ChatUser;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: (e: any) => void;
}

export default function ProfileImage({ user, size = 'medium', className = '', onClick }: ProfileImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizeClasses = {
    small: 'w-10 h-10',
    medium: 'w-16 h-16',
    large: 'w-20 h-20'
  };

  // تحديد لون الإطار حسب الجنس (افتراضي ذكر إذا لم يحدد)
  const borderColor = user.gender === 'female' 
    ? 'border-pink-400 ring-pink-200' 
    : 'border-blue-400 ring-blue-200';

  // معالجة مسار الصورة بشكل صحيح
  const getImageSrc = () => {
    // إذا حدث خطأ في تحميل الصورة، استخدم الصورة الافتراضية
    if (imageError) {
      return '/default_avatar.svg';
    }

    // إذا لم تكن هناك صورة أو كانت الصورة الافتراضية
    if (!user.profileImage || user.profileImage === '/default_avatar.svg') {
      return '/default_avatar.svg';
    }

    // إذا كانت الصورة تبدأ بـ http (صورة خارجية)
    if (user.profileImage.startsWith('http')) {
      return user.profileImage;
    }

    // إذا كانت الصورة تبدأ بـ / (مسار مطلق من الجذر)
    if (user.profileImage.startsWith('/')) {
      return user.profileImage;
    }

    // إذا كانت الصورة مسار نسبي، أضف / في البداية
    return `/${user.profileImage}`;
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    console.warn(`فشل في تحميل صورة البروفايل للمستخدم ${user.username}:`, user.profileImage);
    setImageError(true);
    setIsLoading(false);
  };

  return (
    <div className="relative" onClick={onClick}>
      {/* مؤشر التحميل */}
      {isLoading && (
        <div className={`${sizeClasses[size]} rounded-full bg-gray-200 animate-pulse flex items-center justify-center ${className}`}>
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* الصورة */}
      <img
        src={getImageSrc()}
        alt={`صورة ${user.username}`}
        className={`${sizeClasses[size]} rounded-full ring-2 ${borderColor} shadow-sm object-cover transition-opacity duration-200 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${className}`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
      />
      
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