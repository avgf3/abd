import type { ReactNode } from 'react';

import { getUserLevelIcon } from '@/components/chat/UserRoleBadge';
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

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      السعودية: '🇸🇦',
      مصر: '🇪🇬',
      الإمارات: '🇦🇪',
      الأردن: '🇯🇴',
      العراق: '🇮🇶',
      سوريا: '🇸🇾',
      لبنان: '🇱🇧',
      تونس: '🇹🇳',
      الجزائر: '🇩🇿',
      ليبيا: '🇱🇾',
      قطر: '🇶🇦',
      البحرين: '🇧🇭',
      عمان: '🇴🇲',
      فلسطين: '🇵🇸',
      اليمن: '🇾🇪',
      السودان: '🇸🇩',
      موريتانيا: '🇲🇷',
      الصومال: '🇸🇴',
      المغرب: '🇲🇦',
      جيبوتي: '🇩🇯',
      'جزر القمر': '🇰🇲',
      تركيا: '🇹🇷',
      إيران: '🇮🇷',
      أفغانستان: '🇦🇫',
      باكستان: '🇵🇰',
      بنغلاديش: '🇧🇩',
      إندونيسيا: '🇮🇩',
      ماليزيا: '🇲🇾',
      بروناي: '🇧🇳',
      الفلبين: '🇵🇭',
      تايلاند: '🇹🇭',
      سنغافورة: '🇸🇬',
      بريطانيا: '🇬🇧',
      أمريكا: '🇺🇸',
      كندا: '🇨🇦',
      أستراليا: '🇦🇺',
      ألمانيا: '🇩🇪',
      فرنسا: '🇫🇷',
      إيطاليا: '🇮🇹',
      إسبانيا: '🇪🇸',
      البرتغال: '🇵🇹',
      هولندا: '🇳🇱',
      بلجيكا: '🇧🇪',
      سويسرا: '🇨🇭',
      النمسا: '🇦🇹',
      الدنمارك: '🇩🇰',
      السويد: '🇸🇪',
      النرويج: '🇳🇴',
      فنلندا: '🇫🇮',
      روسيا: '🇷🇺',
      بولندا: '🇵🇱',
      التشيك: '🇨🇿',
      المجر: '🇭🇺',
      اليونان: '🇬🇷',
      بلغاريا: '🇧🇬',
      رومانيا: '🇷🇴',
      كرواتيا: '🇭🇷',
      صربيا: '🇷🇸',
      البوسنة: '🇧🇦',
      الصين: '🇨🇳',
      اليابان: '🇯🇵',
      كوريا: '🇰🇷',
      الهند: '🇮🇳',
      نيبال: '🇳🇵',
      سريلانكا: '🇱🇰',
      البرازيل: '🇧🇷',
      الأرجنتين: '🇦🇷',
      المكسيك: '🇲🇽',
    };
    return flags[country] || '🌍';
  };

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
