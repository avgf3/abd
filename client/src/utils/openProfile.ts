import type { ChatUser } from '@/types/chat';

export function openProfile(user: Pick<ChatUser, 'id'> | { id: number }) {
  try {
    if (user && typeof user.id === 'number') {
      window.location.hash = `#id${user.id}`;
    }
  } catch {}
}

