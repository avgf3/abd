// دوال مساعدة للثيمات
export const getThemeData = (themeId: string) => {
  const themes = {
    'default': { gradient: 'transparent', textColor: '#FFFFFF', hasAnimation: false },
    'golden': { gradient: 'linear-gradient(45deg, #FFD700, #FFA500)', textColor: '#000000', hasAnimation: true },
    'royal': { gradient: 'linear-gradient(45deg, #8B5CF6, #A855F7)', textColor: '#FFFFFF', hasAnimation: true },
    'ocean': { gradient: 'linear-gradient(45deg, #0EA5E9, #0284C7)', textColor: '#FFFFFF', hasAnimation: true },
    'sunset': { gradient: 'linear-gradient(45deg, #F97316, #EA580C)', textColor: '#FFFFFF', hasAnimation: true },
    'forest': { gradient: 'linear-gradient(45deg, #22C55E, #16A34A)', textColor: '#FFFFFF', hasAnimation: true },
    'rose': { gradient: 'linear-gradient(45deg, #EC4899, #DB2777)', textColor: '#FFFFFF', hasAnimation: true },
    'emerald': { gradient: 'linear-gradient(45deg, #10B981, #059669)', textColor: '#FFFFFF', hasAnimation: true },
    'fire': { gradient: 'linear-gradient(45deg, #EF4444, #DC2626)', textColor: '#FFFFFF', hasAnimation: true },
    'galaxy': { gradient: 'linear-gradient(45deg, #6366F1, #4F46E5)', textColor: '#FFFFFF', hasAnimation: true },
    'rainbow': { gradient: 'linear-gradient(45deg, #F59E0B, #EF4444, #EC4899, #8B5CF6)', textColor: '#FFFFFF', hasAnimation: true },
    'aqua': { gradient: 'linear-gradient(45deg, #06B6D4, #0891B2)', textColor: '#FFFFFF', hasAnimation: true },
    'crystal': { gradient: 'linear-gradient(45deg, #E5E7EB, #9CA3AF)', textColor: '#000000', hasAnimation: true },
    'amber': { gradient: 'linear-gradient(45deg, #F59E0B, #D97706)', textColor: '#000000', hasAnimation: true },
    'coral': { gradient: 'linear-gradient(45deg, #FB7185, #F43F5E)', textColor: '#FFFFFF', hasAnimation: true },
    'jade': { gradient: 'linear-gradient(45deg, #059669, #047857)', textColor: '#FFFFFF', hasAnimation: true },
    'sapphire': { gradient: 'linear-gradient(45deg, #3B82F6, #1D4ED8)', textColor: '#FFFFFF', hasAnimation: true },
    'bronze': { gradient: 'linear-gradient(45deg, #CD7F32, #B8860B)', textColor: '#FFFFFF', hasAnimation: true },
    'silver': { gradient: 'linear-gradient(45deg, #C0C0C0, #A8A8A8)', textColor: '#000000', hasAnimation: true },
    'platinum': { gradient: 'linear-gradient(45deg, #E5E4E2, #D3D3D3)', textColor: '#000000', hasAnimation: true },
    'obsidian': { gradient: 'linear-gradient(45deg, #1F2937, #111827)', textColor: '#FFFFFF', hasAnimation: true },
    'mystical': { gradient: 'linear-gradient(45deg, #7C3AED, #5B21B6)', textColor: '#FFFFFF', hasAnimation: true },
    'tropical': { gradient: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)', textColor: '#FFFFFF', hasAnimation: true },
    'aurora': { gradient: 'linear-gradient(45deg, #00C9FF, #92FE9D)', textColor: '#000000', hasAnimation: true },
    'phoenix': { gradient: 'linear-gradient(45deg, #FF4E50, #F9CA24)', textColor: '#FFFFFF', hasAnimation: true },
    'burgundy': { gradient: 'linear-gradient(45deg, #722F37, #B91C1C)', textColor: '#FFFFFF', hasAnimation: true },
    'midnight': { gradient: 'linear-gradient(45deg, #1E293B, #334155)', textColor: '#FFFFFF', hasAnimation: true },
    'arctic': { gradient: 'linear-gradient(45deg, #0F172A, #1E40AF)', textColor: '#FFFFFF', hasAnimation: true },
    'wine': { gradient: 'linear-gradient(45deg, #881337, #4C1D95)', textColor: '#FFFFFF', hasAnimation: true },
    'steel': { gradient: 'linear-gradient(45deg, #475569, #64748B)', textColor: '#FFFFFF', hasAnimation: true },
    'navy': { gradient: 'linear-gradient(45deg, #1E3A8A, #3730A3)', textColor: '#FFFFFF', hasAnimation: true },
    'slate': { gradient: 'linear-gradient(45deg, #374151, #4B5563)', textColor: '#FFFFFF', hasAnimation: true },
    'storm': { gradient: 'linear-gradient(45deg, #1F2937, #6B7280)', textColor: '#FFFFFF', hasAnimation: true },
    'crimson': { gradient: 'linear-gradient(45deg, #991B1B, #DC2626)', textColor: '#FFFFFF', hasAnimation: true },
    'royal_blue': { gradient: 'linear-gradient(45deg, #1E3A8A, #60A5FA)', textColor: '#FFFFFF', hasAnimation: true },
    'black_gradient': { gradient: 'linear-gradient(45deg, #000000, #374151)', textColor: '#FFFFFF', hasAnimation: true },
    'deep_black': { gradient: 'linear-gradient(45deg, #111827, #1F2937)', textColor: '#FFFFFF', hasAnimation: true },
    'charcoal': { gradient: 'linear-gradient(45deg, #1C1C1C, #4A4A4A)', textColor: '#FFFFFF', hasAnimation: true },
    'blush_pink': { gradient: 'linear-gradient(45deg, #FCE7F3, #F9A8D4)', textColor: '#000000', hasAnimation: true },
    'lavender': { gradient: 'linear-gradient(45deg, #DDD6FE, #C4B5FD)', textColor: '#000000', hasAnimation: true },
    'powder_blue': { gradient: 'linear-gradient(45deg, #DBEAFE, #93C5FD)', textColor: '#000000', hasAnimation: true },
    'soft_mint': { gradient: 'linear-gradient(45deg, #D1FAE5, #86EFAC)', textColor: '#000000', hasAnimation: true },
    'peach': { gradient: 'linear-gradient(45deg, #FED7AA, #FDBA74)', textColor: '#000000', hasAnimation: true },
    'lilac': { gradient: 'linear-gradient(45deg, #E9D5FF, #D8B4FE)', textColor: '#000000', hasAnimation: true },
    'ivory': { gradient: 'linear-gradient(45deg, #FFFBEB, #FEF3C7)', textColor: '#000000', hasAnimation: true }
  };
  return themes[themeId as keyof typeof themes] || themes.default;
};

export const getUserThemeClasses = (user: any) => {
  const theme = getThemeData(user.userTheme || (user.userType === 'owner' ? 'golden' : 'default'));
  if (theme.gradient === 'transparent') {
    return 'glass-effect hover:bg-accent';
  }
  return 'shadow-lg';
};

export const getUserThemeStyles = (user: any) => {
  const theme = getThemeData(user.userTheme || (user.userType === 'owner' ? 'golden' : 'default'));
  const styles: any = {};
  
  if (theme.gradient !== 'transparent') {
    styles.background = theme.gradient;
  }
  
  if (theme.hasAnimation) {
    styles.animation = 'golden-glow 2s ease-in-out infinite';
    styles.boxShadow = '0 0 25px rgba(255, 215, 0, 0.8)';
  }
  
  return styles;
};

export const getUserThemeTextColor = (user: any) => {
  const theme = getThemeData(user.userTheme || (user.userType === 'owner' ? 'golden' : 'default'));
  return theme.textColor;
};

export const getUserThemeGradient = (user: any) => {
  const theme = getThemeData(user.userTheme || (user.userType === 'owner' ? 'golden' : 'default'));
  return theme.gradient;
};

// دالة جديدة لربط تأثير البروفايل بلون الاسم
export const getEffectColor = (effect: string): string => {
  const effectColors = {
    'none': '#FFFFFF',
    'effect-glow': '#FFD700', // ذهبي للتوهج
    'effect-pulse': '#FF69B4', // وردي للنبض
    'effect-water': '#00CED1', // فيروزي للماء
    'effect-aurora': '#9B59B6', // بنفسجي للشفق
    'effect-neon': '#00FF7F', // أخضر نيون
    'effect-fire': '#FF4500', // برتقالي ناري
    'effect-ice': '#87CEEB', // أزرق جليدي
    'effect-rainbow': '#FF69B4', // وردي للقوس قزح
    'effect-shadow': '#696969', // رمادي للظل
    'effect-electric': '#00BFFF', // أزرق كهربائي
    'effect-crystal': '#E6E6FA', // بنفسجي فاتح
  };
  return effectColors[effect as keyof typeof effectColors] || '#FFFFFF';
};

// دالة لحصول على لون الاسم النهائي (يدمج usernameColor و profileEffect)
export const getFinalUsernameColor = (user: any): string => {
  // إذا المستخدم عنده profileEffect، استخدم لونه
  if (user.profileEffect && user.profileEffect !== 'none') {
    return getEffectColor(user.profileEffect);
  }
  
  // وإلا استخدم usernameColor العادي
  return user.usernameColor || '#FFFFFF';
};