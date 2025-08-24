import React, { createContext, useContext } from 'react';
import type { ChatUser } from '@/types/chat';

export type OnUserClickHandler = (e: React.MouseEvent, user: ChatUser) => void;

const UserClickContext = createContext<OnUserClickHandler | undefined>(undefined);

export function UserClickProvider({ onUserClick, children }: { onUserClick?: OnUserClickHandler; children: React.ReactNode }) {
  return <UserClickContext.Provider value={onUserClick}>{children}</UserClickContext.Provider>;
}

export function useUserClick() {
  return useContext(UserClickContext);
}