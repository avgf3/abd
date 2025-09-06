// @ts-nocheck
/// <reference types="react" />
import type { ChatUser } from '@/types/chat';
import { getFinalUsernameColor } from '@/utils/themeUtils';
import { getUserLevelIcon } from '@/components/chat/UserRoleBadge';

interface ProfileHeaderProps {
  user: ChatUser;
  onNameClick?: () => void;
  canEditName?: boolean;
}

/**
 * Unified profile header: renders only the role/logo icon and username
 * in the exact same placement used for the owner profile.
 * Applies uniformly to all users and bots.
 */
export default function ProfileHeader({ user, onNameClick, canEditName }: ProfileHeaderProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '38px',
        left: '50%',
        transform: 'translateX(calc(-50% - 12px - 2cm))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1px',
        zIndex: 12,
        textAlign: 'center',
        maxWidth: 'calc(100% - 180px)',
        padding: '0 12px',
        boxSizing: 'border-box',
        pointerEvents: canEditName ? 'auto' : 'none',
      }}
    >
      {/* logo/icon only (no textual rank label) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', transform: 'translateX(2cm)' }}>
        <span style={{ fontSize: '16px' }}>{getUserLevelIcon(user, 16)}</span>
      </div>

      {/* username */}
      <h3
        dir="auto"
        style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 'bold',
          color: getFinalUsernameColor(user || ({} as ChatUser)),
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          cursor: canEditName ? 'pointer' : 'default',
          unicodeBidi: 'plaintext',
          textAlign: 'center',
          whiteSpace: 'normal',
          overflowWrap: 'break-word',
          wordBreak: 'keep-all',
          hyphens: 'none',
          transform: 'translateX(2cm)',
          pointerEvents: canEditName ? 'auto' : 'none',
        }}
        onClick={canEditName ? onNameClick : undefined}
      >
        <bdi>{user?.username || 'اسم المستخدم'}</bdi>
      </h3>
    </div>
  );
}

