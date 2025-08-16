// دوال مساعدة للتأثيرات
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

// دالة للتحقق من صحة كود HEX
const isValidHexColor = (color: string): boolean => {
  if (!color) return false;
  const hexPattern = /^#?[0-9A-Fa-f]{6}$/;
  return hexPattern.test(color.trim());
};

// دالة لتنظيف وتصحيح لون HEX
const sanitizeHexColor = (color: string, defaultColor: string = '#3c0d0d'): string => {
  if (!color || color === 'null' || color === 'undefined' || color === '') {
    return defaultColor;
  }
  
  const trimmed = color.trim();
  if (isValidHexColor(trimmed)) {
    return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  }
  
  return defaultColor;
};

// بناء خلفية ملف شخصي: تمرير التدرج كما هو، أو توليد تدرج من لون HEX
export const buildProfileBackgroundGradient = (colorOrGradient: string): string => {
  const input = (colorOrGradient || '').trim();
  if (input.toLowerCase().startsWith('linear-gradient(')) {
    return input;
  }
  const cleanHex = sanitizeHexColor(input);
  const start = lightenHexColor(cleanHex, 14);
  const end = lightenHexColor(cleanHex, -12);
  return `linear-gradient(135deg, ${start}, ${end})`;
};

// تفتيح/تعتيم لون HEX بنسبة مئوية
const lightenHexColor = (hex: string, percent: number): string => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return hex;
  let r = parseInt(match[1], 16);
  let g = parseInt(match[2], 16);
  let b = parseInt(match[3], 16);

  const adjust = (value: number): number => {
    if (percent >= 0) {
      return Math.min(255, Math.round(value + (255 - value) * (percent / 100)));
    }
    return Math.max(0, Math.round(value * (1 + percent / 100)));
  };

  r = adjust(r);
  g = adjust(g);
  b = adjust(b);

  const toHex = (value: number): string => value.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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
  const color = (user && user.usernameColor) ? String(user.usernameColor) : '#000000';
  return sanitizeHexColor(color, '#000000');
};

// ===== نظام موحد جديد لتأثيرات صندوق المستخدم مع الملف الشخصي =====

// دالة للحصول على كلاسات CSS للتأثيرات
export const getUserEffectClasses = (user: any): string => {
  const effect = (user && user.profileEffect) ? String(user.profileEffect) : 'none';
  if (!effect || effect === 'none') return '';
  // هذه الكلاسات معرفة في index.css
  return effect;
};

// دالة للحصول على أنماط التأثيرات بناءً على لون الخلفية والتأثير
export const getUserEffectStyles = (user: any): Record<string, string> => {
  const style: Record<string, string> = {};
  
  // أولاً: تطبيق خلفية الملف الشخصي (تدرج أو لون)
  if (user?.profileBackgroundColor) {
    const bg = buildProfileBackgroundGradient(String(user.profileBackgroundColor));
    if (bg) {
      // استخدام backgroundImage لضمان أولوية التدرج وعدم تجاوزه بسهولة
      style.backgroundImage = bg.startsWith('linear-gradient(') ? bg : undefined as any;
      if (!style.backgroundImage) {
        style.background = bg;
      }
      // تحسين المزج لمنع الطبقات الأخرى من محو التدرج
      style.backgroundBlendMode = 'normal';
    }
  }
  
  // ثانياً: إضافة تأثيرات إضافية حسب نوع التأثير المختار
  const effect = user?.profileEffect || 'none';
  if (effect !== 'none' && effect !== 'null' && effect !== 'undefined') {
    // إضافة ظلال ملونة حسب التأثير
    const effectShadows: Record<string, string> = {
      'effect-glow': '0 0 20px rgba(255, 215, 0, 0.5)',
      'effect-pulse': '0 0 20px rgba(255, 105, 180, 0.5)',
      'effect-water': '0 0 20px rgba(0, 206, 209, 0.5)',
      'effect-aurora': '0 0 20px rgba(155, 89, 182, 0.5)',
      'effect-neon': '0 0 20px rgba(0, 255, 127, 0.6)',
      'effect-fire': '0 0 20px rgba(255, 69, 0, 0.5)',
      'effect-ice': '0 0 20px rgba(135, 206, 235, 0.5)',
      'effect-rainbow': '0 0 20px rgba(236, 72, 153, 0.5)',
      'effect-shadow': '0 2px 10px rgba(0, 0, 0, 0.3)',
      'effect-electric': '0 0 20px rgba(0, 191, 255, 0.5)',
      'effect-crystal': '0 0 20px rgba(230, 230, 250, 0.5)',
    };
    
    if (effectShadows[effect]) {
      style.boxShadow = effectShadows[effect];
    }
  }
  
  return style;
};

// دالة موحدة للحصول على أنماط عنصر المستخدم في القائمة
export const getUserListItemStyles = (user: any): Record<string, string> => {
  // استخدام نفس المنطق المستخدم في الملف الشخصي
  return getUserEffectStyles(user);
};

// دالة للحصول على كلاسات CSS للمستخدم في القائمة
export const getUserListItemClasses = (user: any): string => {
  const classes = [] as string[];

  // إضافة كلاس التأثير إذا وجد
  if (user?.profileEffect && user.profileEffect !== 'none') {
    classes.push(user.profileEffect);
  }

  // إضافة كلاس خاص إذا كان هناك لون خلفية
  if (user?.profileBackgroundColor) {
    classes.push('has-custom-bg');
  }

  return classes.join(' ');
};

// دالة للحصول على البيانات الكاملة للتأثير للمستخدم
export const getUserThemeAndEffect = (user: any) => {
  return {
    effect: user?.profileEffect || 'none',
    effectColor: user?.profileEffect ? getEffectColor(user.profileEffect) : null,
    usernameColor: getFinalUsernameColor(user),
    hasAnimation: (user?.profileEffect && user.profileEffect !== 'none'),
    backgroundColor: user?.profileBackgroundColor || null
  };
};

// دالة مساعدة للتحقق من وجود تخصيص
export const hasCustomTheme = (user: any): boolean => {
  return (user?.profileEffect && user.profileEffect !== 'none') || 
         (user?.profileBackgroundColor);
};

// دالة للتحقق من تطابق الألوان بين الملف الشخصي وصندوق المستخدم
export const verifyColorMatch = (profileColor: string, userBoxColor: string): boolean => {
  if (!profileColor || !userBoxColor) return false;
  
  // بناء التدرج من لون الملف الشخصي
  const expectedGradient = buildProfileBackgroundGradient(profileColor);
  
  // المقارنة
  return expectedGradient === userBoxColor;
};

// دالة للحصول على معلومات اللون المطبق
export const getAppliedColorInfo = (user: any) => {
  return {
    profileColor: user?.profileBackgroundColor || null,
    appliedGradient: user?.profileBackgroundColor ? buildProfileBackgroundGradient(user.profileBackgroundColor) : null,
    effect: user?.profileEffect || 'none',
    hasCustomBackground: !!user?.profileBackgroundColor
  };
};