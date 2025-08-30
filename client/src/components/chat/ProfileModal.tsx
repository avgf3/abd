import React from 'react';
import ProfileCard from '@/components/profile/ProfileCard';
import type { ChatUser } from '@/types/chat';

interface ProfileModalProps {
  user: ChatUser | null;
  currentUser: ChatUser | null;
  onClose: () => void;
  onIgnoreUser?: (userId: number) => void;
  onUpdate?: (user: ChatUser) => void;
  onPrivateMessage?: (user: ChatUser) => void;
  onAddFriend?: (user: ChatUser) => void;
  onReportUser?: (user: ChatUser) => void;
}

export default function ProfileModal({
  user,
  currentUser,
  onClose,
  onIgnoreUser,
  onUpdate,
  onPrivateMessage,
  onAddFriend,
  onReportUser,
}: ProfileModalProps) {
  // استخدام المكون الموحد ProfileCard
  return (
    <ProfileCard
      user={user}
      currentUser={currentUser}
      onClose={onClose}
      onIgnoreUser={onIgnoreUser}
      onUpdate={onUpdate}
      onPrivateMessage={onPrivateMessage}
      onAddFriend={onAddFriend}
      onReportUser={onReportUser}
      isEmbedded={false}
      showActions={true}
    />
  );
}