import { ReactNode } from 'react';
import type { ChatUser } from '@/types/chat';

interface PremiumUserThemeProps {
  user: ChatUser | null;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large';
  showFlag?: boolean;
}

export default function PremiumUserTheme({ user, children, size = 'medium', showFlag = false }: PremiumUserThemeProps) {
  if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
    return <>{children}</>;
  }

  const getFrameStyles = () => {
    if (user.userType === 'owner') {
      return {
        border: '2px solid #FFD700',
        borderRadius: '8px',
        padding: '4px 8px',
        background: 'rgba(255, 215, 0, 0.1)',
      };
    } else if (user.userType === 'admin') {
      return {
        border: '2px solid #9333EA',
        borderRadius: '8px', 
        padding: '4px 8px',
        background: 'rgba(147, 51, 234, 0.1)',
      };
    }
    return {};
  };

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      'السعودية': '🇸🇦',
      'مصر': '🇪🇬',
      'الإمارات': '🇦🇪',
      'الأردن': '🇯🇴',
      'العراق': '🇮🇶',
      'سوريا': '🇸🇾',
      'لبنان': '🇱🇧',
      'تونس': '🇹🇳',
      'الجزائر': '🇩🇿',
      'ليبيا': '🇱🇾',
      'قطر': '🇶🇦',
      'البحرين': '🇧🇭',
      'عمان': '🇴🇲',
      'فلسطين': '🇵🇸',
      'اليمن': '🇾🇪',
      'السودان': '🇸🇩',
      'موريتانيا': '🇲🇷',
      'الصومال': '🇸🇴',
      'المغرب': '🇲🇦',
      'جيبوتي': '🇩🇯',
      'جزر القمر': '🇰🇲',
      'تركيا': '🇹🇷',
      'إيران': '🇮🇷',
      'أفغانستان': '🇦🇫',
      'باكستان': '🇵🇰',
      'بنغلاديش': '🇧🇩',
      'إندونيسيا': '🇮🇩',
      'ماليزيا': '🇲🇾',
      'بروناي': '🇧🇳',
      'الفلبين': '🇵🇭',
      'تايلاند': '🇹🇭',
      'سنغافورة': '🇸🇬',
      'بريطانيا': '🇬🇧',
      'أمريكا': '🇺🇸',
      'كندا': '🇨🇦',
      'أستراليا': '🇦🇺',
      'ألمانيا': '🇩🇪',
      'فرنسا': '🇫🇷',
      'إيطاليا': '🇮🇹',
      'إسبانيا': '🇪🇸',
      'البرتغال': '🇵🇹',
      'هولندا': '🇳🇱',
      'بلجيكا': '🇧🇪',
      'سويسرا': '🇨🇭',
      'النمسا': '🇦🇹',
      'الدنمارك': '🇩🇰',
      'السويد': '🇸🇪',
      'النرويج': '🇳🇴',
      'فنلندا': '🇫🇮',
      'روسيا': '🇷🇺',
      'بولندا': '🇵🇱',
      'التشيك': '🇨🇿',
      'المجر': '🇭🇺',
      'اليونان': '🇬🇷',
      'بلغاريا': '🇧🇬',
      'رومانيا': '🇷🇴',
      'كرواتيا': '🇭🇷',
      'صربيا': '🇷🇸',
      'البوسنة': '🇧🇦',
      'الصين': '🇨🇳',
      'اليابان': '🇯🇵',
      'كوريا': '🇰🇷',
      'الهند': '🇮🇳',
      'نيبال': '🇳🇵',
      'سريلانكا': '🇱🇰',
      'البرازيل': '🇧🇷',
      'الأرجنتين': '🇦🇷',
      'المكسيك': '🇲🇽'
    };
    return flags[country] || '🌍';
  };

  return (
    <div className="inline-block" style={getFrameStyles()}>
      <div className="flex items-center gap-1">
        <span className="text-base">
          {user.userType === 'owner' ? '👑' : '⭐'}
        </span>
        
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