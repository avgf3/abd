import type { ReactNode } from 'react';

import { getUserLevelIcon } from '@/components/chat/UserRoleBadge';
import { parseCountryEmoji } from '@/utils/countryUtils';
import type { ChatUser } from '@/types/chat';

interface PremiumUserThemeProps {
  user: ChatUser | null;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large';
  showFlag?: boolean;
}

export default function PremiumUserTheme({
  user,
  children,
  size = 'medium',
  showFlag = false,
}: PremiumUserThemeProps) {
  if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
    return <>{children}</>;
  }

  const getFrameStyles = () => {
    // توحيد الإطار للمناصب العليا بدون تمييز ذهبي خاص للمالك
    const base = {
      borderRadius: '8px',
      padding: '4px 8px',
    } as const;

    if (user.userType === 'owner' || user.userType === 'admin') {
      return {
        ...base,
        border: '2px solid #6366F1',
        background: 'rgba(99, 102, 241, 0.08)',
      } as React.CSSProperties;
    }
    return base as unknown as React.CSSProperties;
  };

  const getCountryFlag = (country: string) => parseCountryEmoji(country) || '🌍';

  return (
    <div className="inline-block" style={getFrameStyles()}>
      <div className="flex items-center gap-1">
        <span className="text-base">{getUserLevelIcon(user, 16)}</span>

        <div className="flex items-center gap-1">
          {children}

          {showFlag && user.country && (
            <span className="text-sm" title={user.country}>
              {getCountryFlag(user.country)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
