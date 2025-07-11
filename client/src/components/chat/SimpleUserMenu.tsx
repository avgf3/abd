import { ReactNode } from 'react';
import type { ChatUser } from '@/types/chat';

interface SimpleUserMenuProps {
  targetUser: ChatUser;
  currentUser: ChatUser | null;
  children: ReactNode;
}

export default function SimpleUserMenu({ children }: SimpleUserMenuProps) {
  return <div>{children}</div>;
}