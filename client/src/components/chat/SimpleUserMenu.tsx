import type { ChatUser } from '@/types/chat';

interface SimpleUserMenuProps {
  children: React.ReactNode;
  targetUser: ChatUser;
  currentUser: ChatUser | null;
  messageId?: number;
  onAction?: () => void;
  showModerationActions?: boolean;
}

export default function SimpleUserMenu({ children }: SimpleUserMenuProps) {
  return <>{children}</>;
}
