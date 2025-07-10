import type { ChatUser } from '@/types/chat';

interface ProfileImageProps {
  user: ChatUser;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function ProfileImage({ user, size = 'medium', className = '' }: ProfileImageProps) {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  // تحديد لون الإطار حسب الجنس (افتراضي ذكر إذا لم يحدد)
  const borderColor = user.gender === 'female' 
    ? 'border-pink-400 ring-pink-200' 
    : 'border-blue-400 ring-blue-200';

  return (
    <img
      src={user.profileImage || "/default_avatar.svg"}
      alt="صورة المستخدم"
      className={`${sizeClasses[size]} rounded-full border-2 ${borderColor} ring-1 shadow-sm object-cover ${className}`}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.src = '/default_avatar.svg';
      }}
    />
  );
}