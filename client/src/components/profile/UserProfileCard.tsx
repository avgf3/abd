import React from 'react';

import ProfileImage from '@/components/chat/ProfileImage';
import UserRoleBadge from '@/components/chat/UserRoleBadge';
import type { ChatUser } from '@/types/chat';
import { getFinalUsernameColor, getUserListItemClasses, getUserListItemStyles } from '@/utils/themeUtils';
import { formatTimeAgo } from '@/utils/timeUtils';

interface UserProfileCardProps {
  user: ChatUser;
  currentUser?: ChatUser | null;
  className?: string;
  onPrivateMessage?: (user: ChatUser) => void;
  onAddFriend?: (user: ChatUser) => void;
  onIgnore?: (userId: number) => void;
  onReport?: (user: ChatUser) => void;
}

export default function UserProfileCard({
  user,
  currentUser,
  className = '',
  onPrivateMessage,
  onAddFriend,
  onIgnore,
  onReport,
}: UserProfileCardProps) {
  const canActOnUser = currentUser && currentUser.id !== user.id;

  return (
    <div
      className={`flex items-center gap-3 p-2 px-4 rounded-none border-b border-gray-200 transition-colors duration-200 w-full ${
        getUserListItemClasses(user) || 'bg-card hover:bg-accent/10'
      } ${className}`}
      style={getUserListItemStyles(user)}
    >
      <ProfileImage user={user} size="small" hideRoleBadgeOverlay={true} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-base font-medium transition-all duration-300 truncate"
              style={{
                color: getFinalUsernameColor(user),
                textShadow: getFinalUsernameColor(user)
                  ? `0 0 10px ${getFinalUsernameColor(user)}40`
                  : 'none',
                filter: getFinalUsernameColor(user)
                  ? 'drop-shadow(0 0 3px rgba(255,255,255,0.3))'
                  : 'none',
              }}
              title={user.username}
            >
              {user.username}
            </span>
            <UserRoleBadge user={user} size={18} />
          </div>
          <div className="flex items-center gap-2 shrink-0 text-xs text-foreground/70">
            {user.isOnline ? (
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span>متصل الآن</span>
              </span>
            ) : user.lastSeen ? (
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span>{formatTimeAgo(user.lastSeen)}</span>
              </span>
            ) : null}
          </div>
        </div>

        {(onPrivateMessage || onAddFriend || onIgnore || onReport) && canActOnUser && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            {onPrivateMessage && (
              <button
                className="px-2 py-1 rounded border border-border hover:bg-accent/30"
                onClick={() => onPrivateMessage(user)}
              >
                💬 محادثة خاصة
              </button>
            )}
            {onAddFriend && (
              <button
                className="px-2 py-1 rounded border border-border hover:bg-accent/30"
                onClick={() => onAddFriend(user)}
              >
                👥 إضافة صديق
              </button>
            )}
            {onIgnore && (
              <button
                className="px-2 py-1 rounded border border-border hover:bg-accent/30"
                onClick={() => onIgnore(user.id)}
              >
                🚫 تجاهل
              </button>
            )}
            {onReport && (
              <button
                className="px-2 py-1 rounded border border-border hover:bg-accent/30 text-red-600"
                onClick={() => onReport(user)}
              >
                🚩 إبلاغ
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

