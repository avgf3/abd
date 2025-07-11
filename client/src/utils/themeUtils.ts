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
    'rainbow': { gradient: 'linear-gradient(45deg, #F59E0B, #EF4444, #EC4899, #8B5CF6)', textColor: '#FFFFFF', hasAnimation: true }
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