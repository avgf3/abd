import React from 'react';
import { MessageCircle, UserPlus, Flag, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatUser } from '@/types/chat';

interface ProfileActionsProps {
  user: ChatUser;
  onIgnoreUser?: (userId: number) => void;
  onPrivateMessage?: (user: ChatUser) => void;
  onAddFriend?: (user: ChatUser) => void;
}

export function ProfileActions({
  user,
  onIgnoreUser,
  onPrivateMessage,
  onAddFriend
}: ProfileActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        onClick={() => onPrivateMessage?.(user)}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <MessageCircle size={16} />
        محادثة
      </Button>
      
      <Button
        onClick={() => onAddFriend?.(user)}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <UserPlus size={16} />
        إضافة صديق
      </Button>
      
      <Button
        onClick={() => onIgnoreUser?.(user.id)}
        variant="outline"
        size="sm"
        className="flex items-center gap-2 text-red-400 hover:text-red-300"
      >
        <UserX size={16} />
        حظر
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2 text-orange-400 hover:text-orange-300"
      >
        <Flag size={16} />
        تبليغ
      </Button>
    </div>
  );
}