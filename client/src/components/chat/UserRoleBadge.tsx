import type { ChatUser } from '@/types/chat';

interface UserRoleBadgeProps {
  user: ChatUser;
  showText?: boolean;
}

export default function UserRoleBadge({ user, showText = false }: UserRoleBadgeProps) {
  const getBadge = () => {
    switch (user.userType) {
      case 'owner':
        return { icon: '👑', text: 'مالك', color: 'text-yellow-400' };
      case 'admin':
        return { icon: '⭐', text: 'مشرف', color: 'text-blue-400' };
      case 'moderator':
        return { icon: '🛡️', text: 'مراقب', color: 'text-green-400' };
      case 'member':
        return { icon: '👤', text: 'عضو', color: 'text-gray-400' };
      default:
        return { icon: '👤', text: 'ضيف', color: 'text-gray-400' };
    }
  };

  const badge = getBadge();

  return (
    <span className={`${badge.color} flex items-center gap-1`}>
      <span>{badge.icon}</span>
      {showText && <span className="text-xs">{badge.text}</span>}
    </span>
  );
}