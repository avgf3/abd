import type { ChatUser } from '@/types/chat';

interface ProfileImageProps {
  user: ChatUser;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function ProfileImage({ user, size = 'medium', className = '' }: ProfileImageProps) {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-10 h-10',
    large: 'w-16 h-16'
  };

  return (
    <div className={`${sizeClasses[size]} bg-blue-600 rounded-full flex items-center justify-center text-white font-bold ${className}`}>
      {user.profileImage ? (
        <img 
          src={user.profileImage} 
          alt={user.username}
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
      ) : (
        <span className="text-sm">
          {user.username.charAt(0)}
        </span>
      )}
    </div>
  );
}