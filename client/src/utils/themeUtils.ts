// دوال مساعدة للثيمات
export const getThemeData = (themeId: string) => {
  const themes = {
    'default': { gradient: 'transparent', textColor: '#FFFFFF', hasAnimation: false },
    'dark': { gradient: 'linear-gradient(45deg, #1a202c, #111827)', textColor: '#FFFFFF', hasAnimation: false },
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
    'ivory': { gradient: 'linear-gradient(45deg, #FFFBEB, #FEF3C7)', textColor: '#000000', hasAnimation: true },
    'ice': { gradient: 'linear-gradient(45deg, #a8edea, #66a6ff)', textColor: '#0f172a', hasAnimation: true },
  };
  return themes[themeId as keyof typeof themes] || themes.default;
};

export const getUserThemeClasses = (user: any) => {
  const theme = getThemeData(user.userTheme || 'default');
  if (theme.gradient === 'transparent') {
    return 'glass-effect hover:bg-accent';
  }
  return 'shadow-lg';
};

export const getUserThemeStyles = (user: any) => {
  const theme = getThemeData(user.userTheme || 'default');
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
  const theme = getThemeData(user.userTheme || 'default');
  return theme.textColor;
};

export const getUserThemeGradient = (user: any) => {
  const theme = getThemeData(user.userTheme || 'default');
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

// تحويل HEX إلى RGBA بنسبة شفافية
const hexToRgba = (hex: string, alpha: number): string => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return hex;
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// دالة لتحويل التدرج اللوني إلى تدرج شفاف
const gradientToTransparent = (gradient: string, opacity: number): string => {
  // استخراج الألوان من التدرج
  const colors = gradient.match(/#[a-fA-F0-9]{6}/g);
  if (!colors) return gradient;
  
  // تحويل كل لون إلى RGBA مع الشفافية المطلوبة
  let newGradient = gradient;
  colors.forEach(color => {
    const rgba = hexToRgba(color, opacity);
    newGradient = newGradient.replace(color, rgba);
  });
  
  return newGradient;
};

// دالة لحصول على لون الاسم النهائي (يعتمد فقط على usernameColor)
export const getFinalUsernameColor = (user: any): string => {
  return (user && user.usernameColor) ? String(user.usernameColor) : '#FFFFFF';
};

// ===== دوال تأثيرات صندوق المستخدم (بدلاً من ربطه بالثيم العام) =====

// إرجاع كلاسات CSS الخاصة بالتأثير ليتم تطبيق الحركة/التوهج
export const getUserEffectClasses = (user: any): string => {
  const rawEffect = (user && user.profileEffect) ? String(user.profileEffect) : 'none';
  const effect = rawEffect === 'golden' ? 'effect-glow' : rawEffect;
  if (!effect || effect === 'none') return '';
  // هذه الكلاسات معرفة في index.css: .effect-glow, .effect-pulse, .effect-water, .effect-aurora ...
  return effect;
};

// إرجاع أنماط خلفية لطيفة وفق التأثير (بدون استخدام userTheme)
export const getUserEffectStyles = (user: any): Record<string, string> => {
  const rawEffect = (user && user.profileEffect) ? String(user.profileEffect) : 'none';
  const effect = rawEffect === 'golden' ? 'effect-glow' : rawEffect;
  const backgrounds: Record<string, string> = {
    'effect-glow': 'linear-gradient(135deg, rgba(255, 215, 0, 0.12), rgba(255, 215, 0, 0.08))',
    'effect-pulse': 'linear-gradient(135deg, rgba(255, 105, 180, 0.12), rgba(255, 105, 180, 0, 0.08))',
    'effect-water': 'linear-gradient(135deg, rgba(0, 206, 209, 0.12), rgba(0, 206, 209, 0.08))',
    'effect-aurora': 'linear-gradient(135deg, rgba(155, 89, 182, 0.12), rgba(155, 89, 182, 0.08))',
    'effect-neon': 'linear-gradient(135deg, rgba(0, 255, 127, 0.14), rgba(0, 255, 127, 0.08))',
    'effect-fire': 'linear-gradient(135deg, rgba(255, 69, 0, 0.12), rgba(255, 69, 0, 0.08))',
    'effect-ice': 'linear-gradient(135deg, rgba(135, 206, 235, 0.12), rgba(135, 206, 235, 0.08))',
    'effect-rainbow': 'linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(139, 92, 246, 0.08))',
    'effect-shadow': 'linear-gradient(135deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.04))',
    'effect-electric': 'linear-gradient(135deg, rgba(0, 191, 255, 0.12), rgba(0, 191, 255, 0.08))',
    'effect-crystal': 'linear-gradient(135deg, rgba(230, 230, 250, 0.12), rgba(230, 230, 250, 0.08))',
  };

  const style: Record<string, string> = {};
  if (effect && effect !== 'none') {
    // جعل تأثير البروفايل هو لون الصندوق مباشرة بدون مزج لون الاسم
    const base = backgrounds[effect] || 'rgba(255,255,255,0.06)';
    style.background = base;
    return style;
  }

  // ✨ استخدام userTheme للحصول على نفس اللون المستخدم في البطاقة الشخصية مع تظليل من لون المستخدم
  const theme = getThemeData(user?.userTheme || 'default');
  if (theme.gradient !== 'transparent') {
    const base = gradientToTransparent(theme.gradient, 0.12);
    if (user?.usernameColor) {
      const overlay = `linear-gradient(0deg, ${hexToRgba(String(user.usernameColor), 0.08)}, ${hexToRgba(String(user.usernameColor), 0.08)})`;
      style.background = `${overlay}, ${base}`;
    } else {
      style.background = base;
    }
  } else if (user?.usernameColor) {
    style.background = hexToRgba(String(user.usernameColor), 0.08);
  }

  return style;
};

// دالة موحدة للحصول على أنماط عنصر المستخدم في القائمة
export const getUserListItemStyles = (user: any): Record<string, string> => {
  const style: Record<string, string> = {};
  const typeOrRole = String((user?.userType || user?.role || '')).toLowerCase();
  const isPrivileged = ['moderator', 'admin', 'owner'].includes(typeOrRole);

  // للمشرفين/الأدمن/الأونر: السلوك المتقدم (تأثيرات ثم ثيم)
  if (isPrivileged) {
    // 1) تأثيرات الصندوق إذا وُجدت (التأثير يحدد لون الصندوق مباشرة)
    if (user?.profileEffect && user.profileEffect !== 'none') {
      return getUserEffectStyles(user);
    }

    // 2) ثيم المستخدم (بدون profileBackgroundColor لتجنب التضارب)
    const theme = getThemeData(user?.userTheme || 'default');
    if (theme.gradient !== 'transparent') {
      const base = gradientToTransparent(theme.gradient, 0.08);
      if (user?.usernameColor) {
        const overlay = `linear-gradient(0deg, ${hexToRgba(String(user.usernameColor), 0.08)}, ${hexToRgba(String(user.usernameColor), 0.08)})`;
        style.background = `${overlay}, ${base}`;
      } else {
        style.background = base;
      }
    } else if (user?.usernameColor) {
      style.background = hexToRgba(String(user.usernameColor), 0.08);
    }

    // خط جانبي لإبراز اللون
    if (user?.usernameColor) {
      style.borderLeft = `3px solid ${String(user.usernameColor)}`;
    }

    return style;
  }

  // للمستخدمين العاديين: يعتمد الصندوق فقط على لون الاسم
  if (user?.usernameColor) {
    style.background = hexToRgba(String(user.usernameColor), 0.08);
    style.borderLeft = `3px solid ${String(user.usernameColor)}`;
  }

  return style;
};

// دالة للحصول على كلاسات CSS للمستخدم في القائمة
export const getUserListItemClasses = (user: any): string => {
  const classes: string[] = [];
  const typeOrRole = String((user?.userType || user?.role || '')).toLowerCase();
  const isPrivileged = ['moderator', 'admin', 'owner'].includes(typeOrRole);

  if (isPrivileged) {
    // إضافة كلاس التأثير إذا وجد (مع تطبيع القيمة القديمة golden)
    if (user?.profileEffect && user.profileEffect !== 'none') {
      const raw = String(user.profileEffect);
      classes.push(raw === 'golden' ? 'effect-glow' : raw);
    }

    // إضافة كلاس التحريك إذا كان الثيم يدعم التحريك
    const theme = getThemeData(user?.userTheme || 'default');
    if (theme.hasAnimation) {
      classes.push('theme-animated');
    }
  }

  return classes.join(' ');
};

// دالة للحصول على البيانات الكاملة للثيم والتأثير للمستخدم
export const getUserThemeAndEffect = (user: any) => {
  return {
    theme: getThemeData(user?.userTheme || 'default'),
    effect: user?.profileEffect || 'none',
    effectColor: user?.profileEffect ? getEffectColor(user.profileEffect) : null,
    usernameColor: getFinalUsernameColor(user),
    hasAnimation: getThemeData(user?.userTheme || 'default').hasAnimation || (user?.profileEffect && user.profileEffect !== 'none')
  };
};

// دالة مساعدة للتحقق من وجود ثيم مخصص
export const hasCustomTheme = (user: any): boolean => {
  return (user?.userTheme && user.userTheme !== 'default') || (user?.profileEffect && user.profileEffect !== 'none');
};