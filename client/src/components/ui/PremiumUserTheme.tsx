import { ChatUser } from '@/types/chat';

interface PremiumUserThemeProps {
  user: ChatUser;
  children: React.ReactNode;
  showFlag?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function PremiumUserTheme({ 
  user, 
  children, 
  showFlag = true, 
  size = 'medium' 
}: PremiumUserThemeProps) {
  const isPremium = user.userType === 'admin' || user.userType === 'owner';
  
  if (!isPremium) {
    return <>{children}</>;
  }

  const getThemeStyles = () => {
    if (user.userType === 'owner') {
      return {
        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF6B35 100%)',
        border: '2px solid #FFD700',
        boxShadow: '0 0 15px rgba(255, 215, 0, 0.6), inset 0 0 15px rgba(255, 215, 0, 0.2)',
        animation: 'premium-glow 3s ease-in-out infinite alternate'
      };
    } else if (user.userType === 'admin') {
      return {
        background: 'linear-gradient(135deg, #9333EA 0%, #7C3AED 50%, #6366F1 100%)',
        border: '2px solid #9333EA',
        boxShadow: '0 0 12px rgba(147, 51, 234, 0.5), inset 0 0 12px rgba(147, 51, 234, 0.2)',
        animation: 'admin-glow 3s ease-in-out infinite alternate'
      };
    }
    return {};
  };

  const getBadgeSize = () => {
    switch (size) {
      case 'small':
        return user.userType === 'owner' ? 'text-lg' : 'text-base';
      case 'medium':
        return user.userType === 'owner' ? 'text-xl' : 'text-lg';
      case 'large':
        return user.userType === 'owner' ? 'text-2xl' : 'text-xl';
      default:
        return user.userType === 'owner' ? 'text-xl' : 'text-lg';
    }
  };

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      'السعودية': '🇸🇦',
      'مصر': '🇪🇬',
      'الإمارات': '🇦🇪',
      'الكويت': '🇰🇼',
      'قطر': '🇶🇦',
      'البحرين': '🇧🇭',
      'عمان': '🇴🇲',
      'الأردن': '🇯🇴',
      'لبنان': '🇱🇧',
      'سوريا': '🇸🇾',
      'العراق': '🇮🇶',
      'فلسطين': '🇵🇸',
      'المغرب': '🇲🇦',
      'الجزائر': '🇩🇿',
      'تونس': '🇹🇳',
      'ليبيا': '🇱🇾',
      'السودان': '🇸🇩',
      'الصومال': '🇸🇴',
      'جيبوتي': '🇩🇯',
      'موريتانيا': '🇲🇷',
      'جزر القمر': '🇰🇲',
      'أمريكا': '🇺🇸',
      'كندا': '🇨🇦',
      'بريطانيا': '🇬🇧',
      'فرنسا': '🇫🇷',
      'ألمانيا': '🇩🇪',
      'إيطاليا': '🇮🇹',
      'إسبانيا': '🇪🇸',
      'تركيا': '🇹🇷',
      'روسيا': '🇷🇺',
      'الصين': '🇨🇳',
      'اليابان': '🇯🇵',
      'كوريا الجنوبية': '🇰🇷',
      'الهند': '🇮🇳',
      'باكستان': '🇵🇰',
      'بنغلاديش': '🇧🇩',
      'إيران': '🇮🇷',
      'أفغانستان': '🇦🇫',
      'أستراليا': '🇦🇺',
      'البرازيل': '🇧🇷',
      'الأرجنتين': '🇦🇷',
      'المكسيك': '🇲🇽',
      'مصر': '🇪🇬'
    };
    return flags[country] || '🌍';
  };

  return (
    <div 
      className="relative rounded-xl p-3 transition-all duration-500 hover:scale-105"
      style={getThemeStyles()}
    >
      <div className="flex items-center gap-3">
        {/* Role Badge with Enhanced Size */}
        <span className={`${getBadgeSize()} filter drop-shadow-lg transition-transform duration-300 hover:scale-110`}>
          {user.userType === 'owner' ? '👑' : '⭐'}
        </span>
        
        {/* Username with Color */}
        <div className="flex items-center gap-2">
          {children}
          
          {/* Country Flag */}
          {showFlag && user.country && (
            <span className="text-base filter drop-shadow-sm transition-transform duration-300 hover:scale-110" title={user.country}>
              {getCountryFlag(user.country)}
            </span>
          )}
        </div>
      </div>
      
      {/* Premium Effect Sparkles */}
      <div className="absolute -top-2 -right-2 text-sm sparkle-effect">
        ✨
      </div>
      {user.userType === 'owner' && (
        <div className="absolute -bottom-2 -left-2 text-sm diamond-effect">
          💎
        </div>
      )}
      
      {/* Additional Premium Effects */}
      {user.userType === 'owner' && (
        <>
          <div className="absolute top-1 left-1 text-xs opacity-60 animate-pulse">
            ⭐
          </div>
          <div className="absolute bottom-1 right-1 text-xs opacity-60 animate-bounce">
            🌟
          </div>
        </>
      )}
    </div>
  );
}