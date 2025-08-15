// ===== نظام الثيمات الموحد الجديد =====
// يوحد جميع أنظمة الثيمات ويحل مشاكل التضارب والتكرار

export interface UnifiedTheme {
  id: string;
  name: string;
  nameAr: string;
  emoji: string;
  gradient: string;
  textColor: string;
  cssVars: {
    '--primary': string;
    '--primary-foreground': string;
    '--background': string;
    '--foreground': string;
    '--card': string;
    '--card-foreground': string;
    '--border': string;
    '--accent': string;
    '--accent-foreground': string;
    '--muted': string;
    '--muted-foreground': string;
  };
  hasAnimation: boolean;
  previewGradient: string;
}

export interface ProfileEffect {
  id: string;
  name: string;
  nameAr: string;
  emoji: string;
  color: string;
  animationClass: string;
  glowIntensity: number;
}

// ===== الثيمات الموحدة =====
export const UNIFIED_THEMES: Record<string, UnifiedTheme> = {
  default: {
    id: 'default',
    name: 'Default',
    nameAr: 'افتراضي',
    emoji: '⚪',
    gradient: 'transparent',
    textColor: '#000000',
    cssVars: {
      '--primary': '#3b82f6',
      '--primary-foreground': '#ffffff',
      '--background': '#ffffff',
      '--foreground': '#0f172a',
      '--card': '#ffffff',
      '--card-foreground': '#0f172a',
      '--border': '#e2e8f0',
      '--accent': '#f1f5f9',
      '--accent-foreground': '#0f172a',
      '--muted': '#f8fafc',
      '--muted-foreground': '#64748b',
    },
    hasAnimation: false,
    previewGradient: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
  },

  dark: {
    id: 'dark',
    name: 'Dark',
    nameAr: 'داكن',
    emoji: '🌙',
    gradient: 'linear-gradient(45deg, #1a202c, #2d3748)',
    textColor: '#ffffff',
    cssVars: {
      '--primary': '#60a5fa',
      '--primary-foreground': '#1e293b',
      '--background': '#0f172a',
      '--foreground': '#f8fafc',
      '--card': '#1e293b',
      '--card-foreground': '#f8fafc',
      '--border': '#334155',
      '--accent': '#475569',
      '--accent-foreground': '#f8fafc',
      '--muted': '#1e293b',
      '--muted-foreground': '#94a3b8',
    },
    hasAnimation: false,
    previewGradient: 'linear-gradient(135deg, #1a202c, #2d3748)',
  },

  sunset: {
    id: 'sunset',
    name: 'Sunset Glow',
    nameAr: 'توهج الغروب',
    emoji: '🌅',
    gradient: 'linear-gradient(45deg, #ff6b6b, #ff8e53, #ffa726)',
    textColor: '#ffffff',
    cssVars: {
      '--primary': '#ff6b6b',
      '--primary-foreground': '#ffffff',
      '--background': '#fff5f5',
      '--foreground': '#7c2d12',
      '--card': '#fef2f2',
      '--card-foreground': '#7c2d12',
      '--border': '#fed7d7',
      '--accent': '#fecaca',
      '--accent-foreground': '#7c2d12',
      '--muted': '#fee2e2',
      '--muted-foreground': '#a78bfa',
    },
    hasAnimation: true,
    previewGradient: 'linear-gradient(135deg, #ff6b6b, #ff8e53, #ffa726, #ffcc02)',
  },

  ocean: {
    id: 'ocean',
    name: 'Ocean Depths',
    nameAr: 'أعماق المحيط',
    emoji: '🌊',
    gradient: 'linear-gradient(45deg, #667eea, #764ba2)',
    textColor: '#ffffff',
    cssVars: {
      '--primary': '#667eea',
      '--primary-foreground': '#ffffff',
      '--background': '#f0f9ff',
      '--foreground': '#0c4a6e',
      '--card': '#e0f2fe',
      '--card-foreground': '#0c4a6e',
      '--border': '#7dd3fc',
      '--accent': '#bae6fd',
      '--accent-foreground': '#0c4a6e',
      '--muted': '#e0f2fe',
      '--muted-foreground': '#0369a1',
    },
    hasAnimation: true,
    previewGradient: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb)',
  },

  forest: {
    id: 'forest',
    name: 'Emerald Forest',
    nameAr: 'الغابة الزمردية',
    emoji: '🌲',
    gradient: 'linear-gradient(45deg, #22c55e, #16a34a)',
    textColor: '#ffffff',
    cssVars: {
      '--primary': '#22c55e',
      '--primary-foreground': '#ffffff',
      '--background': '#f0fdf4',
      '--foreground': '#14532d',
      '--card': '#dcfce7',
      '--card-foreground': '#14532d',
      '--border': '#86efac',
      '--accent': '#bbf7d0',
      '--accent-foreground': '#14532d',
      '--muted': '#dcfce7',
      '--muted-foreground': '#166534',
    },
    hasAnimation: true,
    previewGradient: 'linear-gradient(135deg, #22c55e, #16a34a, #059669)',
  },

  royal: {
    id: 'royal',
    name: 'Royal Purple',
    nameAr: 'البنفسجي الملكي',
    emoji: '👑',
    gradient: 'linear-gradient(45deg, #8b5cf6, #a855f7)',
    textColor: '#ffffff',
    cssVars: {
      '--primary': '#8b5cf6',
      '--primary-foreground': '#ffffff',
      '--background': '#faf5ff',
      '--foreground': '#581c87',
      '--card': '#f3e8ff',
      '--card-foreground': '#581c87',
      '--border': '#c4b5fd',
      '--accent': '#ddd6fe',
      '--accent-foreground': '#581c87',
      '--muted': '#f3e8ff',
      '--muted-foreground': '#7c3aed',
    },
    hasAnimation: true,
    previewGradient: 'linear-gradient(135deg, #8b5cf6, #a855f7, #c084fc)',
  },

  fire: {
    id: 'fire',
    name: 'Fire Opal',
    nameAr: 'عقيق النار',
    emoji: '🔥',
    gradient: 'linear-gradient(45deg, #ef4444, #dc2626)',
    textColor: '#ffffff',
    cssVars: {
      '--primary': '#ef4444',
      '--primary-foreground': '#ffffff',
      '--background': '#fef2f2',
      '--foreground': '#7f1d1d',
      '--card': '#fee2e2',
      '--card-foreground': '#7f1d1d',
      '--border': '#fca5a5',
      '--accent': '#fecaca',
      '--accent-foreground': '#7f1d1d',
      '--muted': '#fee2e2',
      '--muted-foreground': '#b91c1c',
    },
    hasAnimation: true,
    previewGradient: 'linear-gradient(135deg, #ef4444, #dc2626, #b91c1c)',
  },

  ice: {
    id: 'ice',
    name: 'Crystal Ice',
    nameAr: 'الجليد البلوري',
    emoji: '❄️',
    gradient: 'linear-gradient(45deg, #a8edea, #66a6ff)',
    textColor: '#0f172a',
    cssVars: {
      '--primary': '#66a6ff',
      '--primary-foreground': '#0f172a',
      '--background': '#f0fdfa',
      '--foreground': '#134e4a',
      '--card': '#ccfbf1',
      '--card-foreground': '#134e4a',
      '--border': '#5eead4',
      '--accent': '#99f6e4',
      '--accent-foreground': '#134e4a',
      '--muted': '#ccfbf1',
      '--muted-foreground': '#0f766e',
    },
    hasAnimation: true,
    previewGradient: 'linear-gradient(135deg, #a8edea, #66a6ff, #93c5fd)',
  },

  golden: {
    id: 'golden',
    name: 'Golden Velvet',
    nameAr: 'المخمل الذهبي',
    emoji: '✨',
    gradient: 'linear-gradient(45deg, #ffd700, #ffa500)',
    textColor: '#000000',
    cssVars: {
      '--primary': '#ffd700',
      '--primary-foreground': '#000000',
      '--background': '#fffbeb',
      '--foreground': '#78350f',
      '--card': '#fef3c7',
      '--card-foreground': '#78350f',
      '--border': '#fcd34d',
      '--accent': '#fed7aa',
      '--accent-foreground': '#78350f',
      '--muted': '#fef3c7',
      '--muted-foreground': '#d97706',
    },
    hasAnimation: true,
    previewGradient: 'linear-gradient(135deg, #ffd700, #ffa500, #f59e0b)',
  },

  aurora: {
    id: 'aurora',
    name: 'Aurora Borealis',
    nameAr: 'الشفق القطبي',
    emoji: '🌈',
    gradient: 'linear-gradient(45deg, #a8edea, #fed6e3, #ffecd2)',
    textColor: '#000000',
    cssVars: {
      '--primary': '#ec4899',
      '--primary-foreground': '#ffffff',
      '--background': '#fdf2f8',
      '--foreground': '#831843',
      '--card': '#fce7f3',
      '--card-foreground': '#831843',
      '--border': '#f9a8d4',
      '--accent': '#fbcfe8',
      '--accent-foreground': '#831843',
      '--muted': '#fce7f3',
      '--muted-foreground': '#be185d',
    },
    hasAnimation: true,
    previewGradient: 'linear-gradient(135deg, #a8edea, #fed6e3, #ffecd2, #fcb69f)',
  },

  galaxy: {
    id: 'galaxy',
    name: 'Neon Galaxy',
    nameAr: 'المجرة النيونية',
    emoji: '🌌',
    gradient: 'linear-gradient(45deg, #6366f1, #4f46e5)',
    textColor: '#ffffff',
    cssVars: {
      '--primary': '#6366f1',
      '--primary-foreground': '#ffffff',
      '--background': '#eef2ff',
      '--foreground': '#312e81',
      '--card': '#e0e7ff',
      '--card-foreground': '#312e81',
      '--border': '#a5b4fc',
      '--accent': '#c7d2fe',
      '--accent-foreground': '#312e81',
      '--muted': '#e0e7ff',
      '--muted-foreground': '#4338ca',
    },
    hasAnimation: true,
    previewGradient: 'linear-gradient(135deg, #6366f1, #4f46e5, #3730a3)',
  },

  emerald: {
    id: 'emerald',
    name: 'Emerald Dream',
    nameAr: 'حلم الزمرد',
    emoji: '💚',
    gradient: 'linear-gradient(45deg, #10b981, #059669)',
    textColor: '#ffffff',
    cssVars: {
      '--primary': '#10b981',
      '--primary-foreground': '#ffffff',
      '--background': '#ecfdf5',
      '--foreground': '#064e3b',
      '--card': '#d1fae5',
      '--card-foreground': '#064e3b',
      '--border': '#6ee7b7',
      '--accent': '#a7f3d0',
      '--accent-foreground': '#064e3b',
      '--muted': '#d1fae5',
      '--muted-foreground': '#047857',
    },
    hasAnimation: true,
    previewGradient: 'linear-gradient(135deg, #10b981, #059669, #047857)',
  },

  crystal: {
    id: 'crystal',
    name: 'Crystal Clear',
    nameAr: 'البلور الصافي',
    emoji: '💎',
    gradient: 'linear-gradient(45deg, #e5e7eb, #9ca3af)',
    textColor: '#000000',
    cssVars: {
      '--primary': '#6b7280',
      '--primary-foreground': '#ffffff',
      '--background': '#f9fafb',
      '--foreground': '#111827',
      '--card': '#f3f4f6',
      '--card-foreground': '#111827',
      '--border': '#d1d5db',
      '--accent': '#e5e7eb',
      '--accent-foreground': '#111827',
      '--muted': '#f3f4f6',
      '--muted-foreground': '#4b5563',
    },
    hasAnimation: true,
    previewGradient: 'linear-gradient(135deg, #e5e7eb, #9ca3af, #6b7280)',
  },

  crimson: {
    id: 'crimson',
    name: 'Crimson Velvet',
    nameAr: 'المخمل القرمزي',
    emoji: '🍷',
    gradient: 'linear-gradient(45deg, #991b1b, #dc2626)',
    textColor: '#ffffff',
    cssVars: {
      '--primary': '#dc2626',
      '--primary-foreground': '#ffffff',
      '--background': '#fef2f2',
      '--foreground': '#450a0a',
      '--card': '#fee2e2',
      '--card-foreground': '#450a0a',
      '--border': '#fca5a5',
      '--accent': '#fecaca',
      '--accent-foreground': '#450a0a',
      '--muted': '#fee2e2',
      '--muted-foreground': '#7f1d1d',
    },
    hasAnimation: true,
    previewGradient: 'linear-gradient(135deg, #991b1b, #dc2626, #ef4444)',
  },

  obsidian: {
    id: 'obsidian',
    name: 'Royal Black',
    nameAr: 'الأسود الملكي',
    emoji: '🖤',
    gradient: 'linear-gradient(45deg, #1f2937, #111827)',
    textColor: '#ffffff',
    cssVars: {
      '--primary': '#4b5563',
      '--primary-foreground': '#ffffff',
      '--background': '#030712',
      '--foreground': '#f9fafb',
      '--card': '#111827',
      '--card-foreground': '#f9fafb',
      '--border': '#374151',
      '--accent': '#1f2937',
      '--accent-foreground': '#f9fafb',
      '--muted': '#111827',
      '--muted-foreground': '#9ca3af',
    },
    hasAnimation: true,
    previewGradient: 'linear-gradient(135deg, #1f2937, #111827, #030712)',
  },

  sapphire: {
    id: 'sapphire',
    name: 'Sapphire Velvet',
    nameAr: 'المخمل الياقوتي',
    emoji: '💙',
    gradient: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
    textColor: '#ffffff',
    cssVars: {
      '--primary': '#3b82f6',
      '--primary-foreground': '#ffffff',
      '--background': '#eff6ff',
      '--foreground': '#1e3a8a',
      '--card': '#dbeafe',
      '--card-foreground': '#1e3a8a',
      '--border': '#93c5fd',
      '--accent': '#bfdbfe',
      '--accent-foreground': '#1e3a8a',
      '--muted': '#dbeafe',
      '--muted-foreground': '#1d4ed8',
    },
    hasAnimation: true,
    previewGradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8, #1e40af)',
  },
};

// ===== تأثيرات البروفايل =====
export const PROFILE_EFFECTS: Record<string, ProfileEffect> = {
  none: {
    id: 'none',
    name: 'None',
    nameAr: 'بدون تأثير',
    emoji: '⚪',
    color: '#ffffff',
    animationClass: '',
    glowIntensity: 0,
  },

  'effect-glow': {
    id: 'effect-glow',
    name: 'Golden Glow',
    nameAr: 'التوهج الذهبي',
    emoji: '✨',
    color: '#ffd700',
    animationClass: 'effect-glow',
    glowIntensity: 0.8,
  },

  'effect-pulse': {
    id: 'effect-pulse',
    name: 'Pink Pulse',
    nameAr: 'النبض الوردي',
    emoji: '💗',
    color: '#ff69b4',
    animationClass: 'effect-pulse',
    glowIntensity: 0.6,
  },

  'effect-water': {
    id: 'effect-water',
    name: 'Water Wave',
    nameAr: 'موجة الماء',
    emoji: '🌊',
    color: '#00ced1',
    animationClass: 'effect-water',
    glowIntensity: 0.5,
  },

  'effect-aurora': {
    id: 'effect-aurora',
    name: 'Aurora Light',
    nameAr: 'ضوء الشفق',
    emoji: '🌈',
    color: '#9b59b6',
    animationClass: 'effect-aurora',
    glowIntensity: 0.7,
  },

  'effect-neon': {
    id: 'effect-neon',
    name: 'Neon Green',
    nameAr: 'الأخضر النيوني',
    emoji: '💚',
    color: '#00ff7f',
    animationClass: 'effect-neon',
    glowIntensity: 0.9,
  },

  'effect-fire': {
    id: 'effect-fire',
    name: 'Fire Flame',
    nameAr: 'لهيب النار',
    emoji: '🔥',
    color: '#ff4500',
    animationClass: 'effect-fire',
    glowIntensity: 0.8,
  },

  'effect-ice': {
    id: 'effect-ice',
    name: 'Ice Crystal',
    nameAr: 'بلور الجليد',
    emoji: '❄️',
    color: '#87ceeb',
    animationClass: 'effect-ice',
    glowIntensity: 0.4,
  },

  'effect-electric': {
    id: 'effect-electric',
    name: 'Electric Blue',
    nameAr: 'الأزرق الكهربائي',
    emoji: '⚡',
    color: '#00bfff',
    animationClass: 'effect-electric',
    glowIntensity: 0.7,
  },

  'effect-shadow': {
    id: 'effect-shadow',
    name: 'Shadow Dark',
    nameAr: 'ظل داكن',
    emoji: '🌑',
    color: '#696969',
    animationClass: 'effect-shadow',
    glowIntensity: 0.3,
  },

  'effect-rainbow': {
    id: 'effect-rainbow',
    name: 'Rainbow Spectrum',
    nameAr: 'طيف قوس قزح',
    emoji: '🌈',
    color: '#ff69b4',
    animationClass: 'effect-rainbow',
    glowIntensity: 1.0,
  },

  'effect-crystal': {
    id: 'effect-crystal',
    name: 'Crystal Shine',
    nameAr: 'بريق البلور',
    emoji: '💎',
    color: '#e6e6fa',
    animationClass: 'effect-crystal',
    glowIntensity: 0.6,
  },
};

// ===== تحويلات الثيمات القديمة =====
export const LEGACY_THEME_MAPPING: Record<string, string> = {
  // من applyTheme.ts
  'default': 'default',
  'dark': 'dark',
  'ocean': 'ocean',
  'sunset': 'sunset',
  'forest': 'forest',
  'royal': 'royal',
  'fire': 'fire',
  'ice': 'ice',

  // من ProfileModal.tsx
  'theme-new-gradient': 'default',
  'theme-cosmic-night': 'dark',
  'theme-ocean-depths': 'ocean',
  'theme-sunset-glow': 'sunset',
  'theme-emerald-forest': 'forest',
  'theme-midnight-purple': 'royal',
  'theme-fire-opal': 'fire',
  'theme-crystal-clear': 'ice',
  'theme-aurora-borealis': 'aurora',
  'theme-royal-black': 'obsidian',
  'theme-burgundy-velvet': 'crimson',
  'theme-golden-velvet': 'golden',
  'theme-sapphire-velvet': 'sapphire',
  'theme-amethyst-velvet': 'royal',
  'theme-crimson-velvet': 'crimson',
  'theme-onyx-velvet': 'obsidian',
  'theme-neon-dreams': 'galaxy',

  // من themeUtils.ts (51 ثيم)
  'golden': 'golden',
  'rose': 'fire',
  'emerald': 'emerald',
  'galaxy': 'galaxy',
  'rainbow': 'aurora',
  'aqua': 'ocean',
  'crystal': 'crystal',
  'amber': 'golden',
  'coral': 'sunset',
  'jade': 'emerald',
  'sapphire': 'sapphire',
  'bronze': 'golden',
  'silver': 'crystal',
  'platinum': 'crystal',
  'obsidian': 'obsidian',
  'mystical': 'royal',
  'tropical': 'sunset',
  'aurora': 'aurora',
  'phoenix': 'fire',
  'burgundy': 'crimson',
  'midnight': 'dark',
  'arctic': 'ice',
  'wine': 'crimson',
  'steel': 'crystal',
  'navy': 'sapphire',
  'slate': 'dark',
  'storm': 'dark',
  'crimson': 'crimson',
  'royal_blue': 'sapphire',
  'black_gradient': 'obsidian',
  'deep_black': 'obsidian',
  'charcoal': 'obsidian',
  'blush_pink': 'sunset',
  'lavender': 'royal',
  'powder_blue': 'ice',
  'soft_mint': 'emerald',
  'peach': 'sunset',
  'lilac': 'royal',
  'ivory': 'default',
};

// ===== الدوال الأساسية =====

/**
 * دالة لتطبيق الثيم الموحد
 */
export function applyUnifiedTheme(themeId: string): void {
  const normalizedId = normalizeThemeId(themeId);
  const theme = UNIFIED_THEMES[normalizedId] || UNIFIED_THEMES.default;
  
  // تطبيق CSS Variables
  const root = document.documentElement;
  Object.entries(theme.cssVars).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });

  // تطبيق كلاس الثيم للحركات
  document.body.className = document.body.className.replace(/theme-\w+/g, '');
  if (theme.hasAnimation) {
    document.body.classList.add('theme-animated');
  }
  document.body.classList.add(`theme-${theme.id}`);
}

/**
 * دالة لتطبيع معرف الثيم (تحويل من القديم للجديد)
 */
export function normalizeThemeId(themeId: string): string {
  if (!themeId) return 'default';
  
  // إذا كان الثيم موجود مباشرة
  if (UNIFIED_THEMES[themeId]) {
    return themeId;
  }
  
  // البحث في خريطة التحويل
  const normalized = LEGACY_THEME_MAPPING[themeId];
  if (normalized && UNIFIED_THEMES[normalized]) {
    return normalized;
  }
  
  // إزالة بادئة theme- وإعادة المحاولة
  const withoutPrefix = themeId.replace(/^theme-/, '');
  if (UNIFIED_THEMES[withoutPrefix]) {
    return withoutPrefix;
  }
  
  if (LEGACY_THEME_MAPPING[withoutPrefix]) {
    return LEGACY_THEME_MAPPING[withoutPrefix];
  }
  
  return 'default';
}

/**
 * دالة للحصول على بيانات الثيم
 */
export function getUnifiedTheme(themeId: string): UnifiedTheme {
  const normalizedId = normalizeThemeId(themeId);
  return UNIFIED_THEMES[normalizedId] || UNIFIED_THEMES.default;
}

/**
 * دالة للحصول على تأثير البروفايل
 */
export function getProfileEffect(effectId: string): ProfileEffect {
  return PROFILE_EFFECTS[effectId] || PROFILE_EFFECTS.none;
}

/**
 * دالة للحصول على لون اسم المستخدم النهائي
 */
export function getFinalUsernameColor(user: any): string {
  return (user && user.usernameColor) ? String(user.usernameColor) : '#000000';
}

/**
 * دالة لتحويل HEX إلى RGBA مع شفافية
 */
function hexToRgba(hex: string, alpha: number): string {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return hex;
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * دالة للحصول على أنماط خلفية المستخدم في القائمة (بدون شفافية مفرطة)
 */
export function getUserListItemStyles(user: any): Record<string, string> {
  const style: Record<string, string> = {};
  
  // أولاً: تطبيق تأثير البروفايل إن وجد
  const effect = getProfileEffect(user?.profileEffect || 'none');
  if (effect.id !== 'none') {
    const effectAlpha = Math.max(0.08, effect.glowIntensity * 0.1); // شفافية محدودة
    style.background = `linear-gradient(135deg, ${hexToRgba(effect.color, effectAlpha)}, ${hexToRgba(effect.color, effectAlpha * 0.5)})`;
    style.boxShadow = `inset 0 0 20px ${hexToRgba(effect.color, effectAlpha * 2)}`;
    
    // إضافة خط جانبي بلون التأثير
    style.borderLeft = `3px solid ${effect.color}`;
    return style;
  }
  
  // ثانياً: تطبيق خلفية من الثيم بدون شفافية مفرطة
  const theme = getUnifiedTheme(user?.userTheme || 'default');
  if (theme.gradient !== 'transparent') {
    // استخدام لون خفيف من الثيم الأساسي
    const primaryColor = theme.cssVars['--primary'];
    style.background = `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.05)}, ${hexToRgba(primaryColor, 0.02)})`;
  }
  
  // ثالثاً: إضافة خط جانبي بلون اسم المستخدم لوضوح أكبر
  const usernameColor = getFinalUsernameColor(user);
  if (usernameColor && usernameColor !== '#000000' && usernameColor !== '#ffffff') {
    style.borderLeft = `3px solid ${usernameColor}`;
    
    // إضافة توهج خفيف جداً إذا لم يكن هناك تأثير
    if (effect.id === 'none') {
      style.boxShadow = `inset 0 0 10px ${hexToRgba(usernameColor, 0.03)}`;
    }
  }
  
  return style;
}

/**
 * دالة للحصول على كلاسات CSS للمستخدم في القائمة
 */
export function getUserListItemClasses(user: any): string {
  const classes = [];
  
  // إضافة كلاس التأثير
  const effect = getProfileEffect(user?.profileEffect || 'none');
  if (effect.animationClass) {
    classes.push(effect.animationClass);
  }
  
  // إضافة كلاس الثيم إذا كان متحركاً
  const theme = getUnifiedTheme(user?.userTheme || 'default');
  if (theme.hasAnimation) {
    classes.push('theme-animated');
  }
  
  return classes.join(' ');
}

/**
 * دالة موحدة لحفظ الثيم
 */
export function saveThemeToStorage(themeId: string): void {
  const normalizedId = normalizeThemeId(themeId);
  
  // حفظ في localStorage
  try {
    localStorage.setItem('selectedTheme', normalizedId);
    localStorage.setItem('unifiedTheme', normalizedId); // مفتاح جديد للنظام الموحد
  } catch (error) {
    console.warn('فشل في حفظ الثيم في localStorage:', error);
  }
}

/**
 * دالة لاسترجاع الثيم المحفوظ
 */
export function loadThemeFromStorage(): string {
  try {
    // أولاً: محاولة الحصول على الثيم الموحد الجديد
    const unifiedTheme = localStorage.getItem('unifiedTheme');
    if (unifiedTheme && UNIFIED_THEMES[unifiedTheme]) {
      return unifiedTheme;
    }
    
    // ثانياً: تحويل من النظام القديم
    const oldTheme = localStorage.getItem('selectedTheme');
    if (oldTheme) {
      const normalized = normalizeThemeId(oldTheme);
      // حفظ النسخة المحولة
      saveThemeToStorage(normalized);
      return normalized;
    }
  } catch (error) {
    console.warn('فشل في تحميل الثيم من localStorage:', error);
  }
  
  return 'default';
}

/**
 * دالة لتهيئة النظام الموحد
 */
export function initializeUnifiedThemeSystem(): void {
  // تحميل تحسينات الأداء
  import('./performanceOptimizations').then(({ initializePerformanceOptimizations }) => {
    initializePerformanceOptimizations();
  });
  
  // تحميل الثيم المحفوظ وتطبيقه
  const savedTheme = loadThemeFromStorage();
  applyUnifiedTheme(savedTheme);
  
  // إضافة مستمع لتغييرات الثيم مع تحسين الأداء
  window.addEventListener('storage', (e) => {
    if (e.key === 'unifiedTheme' || e.key === 'selectedTheme') {
      const newTheme = e.newValue || 'default';
      
      // استخدام تطبيق محسن للأداء
      import('./performanceOptimizations').then(({ applyThemeOptimized }) => {
        applyThemeOptimized(newTheme);
      }).catch(() => {
        // fallback للتطبيق العادي إذا فشل التحسين
        applyUnifiedTheme(newTheme);
      });
    }
  });
}

/**
 * دالة للحصول على قائمة جميع الثيمات المتاحة
 */
export function getAvailableThemes(): UnifiedTheme[] {
  return Object.values(UNIFIED_THEMES);
}

/**
 * دالة للحصول على قائمة جميع التأثيرات المتاحة
 */
export function getAvailableEffects(): ProfileEffect[] {
  return Object.values(PROFILE_EFFECTS);
}