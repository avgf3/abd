import type { ChatUser } from '@/types/chat';

interface ProfileImageProps {
  user: ChatUser;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function ProfileImage({ user, size = 'medium', className = '' }: ProfileImageProps) {
  const sizeClasses = {
    small: 'w-10 h-10',
    medium: 'w-16 h-16',
    large: 'w-20 h-20'
  };

  return (
    <div className="relative">
      <img
        src={user.profileImage && user.profileImage !== '/default_avatar.svg' ? user.profileImage : "/default_avatar.svg"}
        alt="صورة المستخدم"
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        style={{ objectFit: 'cover' }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = '/default_avatar.svg';
        }}
      />
    </div>
  );
}