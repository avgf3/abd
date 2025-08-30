// دوال مساعدة للتأثيرات
export const getEffectColor = (effect: string): string => {
  const effectColors = {
    none: '#FFFFFF',

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
    'effect-holographic': '#C0C0C0', // فضي هولوغرافي
    'effect-galaxy': '#4B0082', // نيلي مجري
    'effect-shimmer': '#F0E68C', // ذهبي متلألئ
    'effect-prism': '#FF00FF', // أرجواني منشوري
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
const sanitizeHexColor = (color: string, defaultColor: string = ''): string => {
  // تجاهل القيم النصية غير الصالحة نهائياً حتى لا نطبق لون افتراضي قديم
  if (!color) return '';
  const raw = String(color);
  if (raw === 'null' || raw === 'undefined') return '';

  const trimmed = raw.trim();
  if (trimmed === '') return '';

  if (isValidHexColor(trimmed)) {
    return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  }

  // إن لم يكن صالحاً، لا نُرجع لوناً افتراضياً لتفادي تطبيق تدرجات غير مرغوبة
  return '';
};

// بناء خلفية ملف شخصي: تمرير التدرج كما هو، أو توليد تدرج من لون HEX
export const buildProfileBackgroundGradient = (colorOrGradient: string): string => {
  const input = (colorOrGradient || '').trim();
  if (input.toLowerCase().startsWith('linear-gradient(')) {
    return input;
  }
  const cleanHex = sanitizeHexColor(input);
  if (!cleanHex) return '';
  const start = lightenHexColor(cleanHex, 14);
  const end = lightenHexColor(cleanHex, -12);
  return `linear-gradient(135deg, ${start}, ${end})`;
};

// توليد تدرجات ديناميكية متعددة الألوان
export const generateMultiColorGradient = (colors: string[], angle: number = 135): string => {
  if (!colors || colors.length === 0) return '';
  if (colors.length === 1) return buildProfileBackgroundGradient(colors[0]);
  
  const validColors = colors.map(c => sanitizeHexColor(c)).filter(c => c);
  if (validColors.length === 0) return '';
  
  return `linear-gradient(${angle}deg, ${validColors.join(', ')})`;
};

// توليد تدرج نابض بالحياة
export const generateVibrantGradient = (baseColor: string): string => {
  const cleanHex = sanitizeHexColor(baseColor);
  if (!cleanHex) return '';
  
  const vibrant1 = lightenHexColor(cleanHex, 20);
  const vibrant2 = lightenHexColor(cleanHex, -10);
  const vibrant3 = lightenHexColor(cleanHex, -30);
  
  return `linear-gradient(135deg, ${vibrant1} 0%, ${cleanHex} 50%, ${vibrant2} 75%, ${vibrant3} 100%)`;
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
  colors.forEach((color) => {
    const rgba = hexToRgba(color, opacity);
    newGradient = newGradient.replace(color, rgba);
  });

  return newGradient;
};

// دالة لحصول على لون الاسم النهائي (يعتمد فقط على usernameColor)
export const getFinalUsernameColor = (user: any): string => {
  const color = user && user.usernameColor ? String(user.usernameColor) : '';
  const cleaned = sanitizeHexColor(color, '');
  return cleaned || '#000000';
};

// ===== نظام موحد جديد لتأثيرات صندوق المستخدم مع الملف الشخصي =====

// دالة للحصول على كلاسات CSS للتأثيرات
export const getUserEffectClasses = (user: any): string => {
  const effect = user && user.profileEffect ? String(user.profileEffect) : 'none';
  if (!effect || effect === 'none') return '';
  // هذه الكلاسات معرفة في index.css
  return effect;
};

// دالة للحصول على أنماط التأثيرات بناءً على لون الخلفية والتأثير
export const getUserEffectStyles = (user: any): Record<string, string> => {
  const style: Record<string, string> = {};

  // أولاً: تطبيق خلفية الملف الشخصي (تدرج أو لون)
  if (user?.profileBackgroundColor && user.profileBackgroundColor !== 'null' && user.profileBackgroundColor !== 'undefined') {
    const bg = buildProfileBackgroundGradient(String(user.profileBackgroundColor));
    if (bg && bg.startsWith('linear-gradient(')) {
      // استخدام backgroundImage لضمان أولوية التدرج وعدم تجاوزه بسهولة
      style.backgroundImage = bg;
      // تحسين المزج لمنع الطبقات الأخرى من محو التدرج
      style.backgroundBlendMode = 'normal';
    }
  }

  // ثانياً: إضافة تأثيرات إضافية حسب نوع التأثير المختار
  const effect = user?.profileEffect || 'none';
  if (effect !== 'none' && effect !== 'null' && effect !== 'undefined') {
    // إضافة ظلال ملونة حسب التأثير
    const effectShadows: Record<string, string> = {

      'effect-pulse': '0 0 20px rgba(255, 105, 180, 0.5), 0 0 40px rgba(255, 105, 180, 0.3)',
      'effect-water': '0 0 20px rgba(0, 206, 209, 0.5), 0 0 40px rgba(0, 206, 209, 0.3)',
      'effect-aurora': '0 0 20px rgba(155, 89, 182, 0.5), 0 0 40px rgba(155, 89, 182, 0.3)',
      'effect-neon': '0 0 20px rgba(0, 255, 127, 0.6), 0 0 40px rgba(0, 255, 127, 0.4)',
      'effect-fire': '0 0 20px rgba(255, 69, 0, 0.5), 0 0 40px rgba(255, 69, 0, 0.3)',
      'effect-ice': '0 0 20px rgba(135, 206, 235, 0.5), 0 0 40px rgba(135, 206, 235, 0.3)',
      'effect-holographic': '0 0 20px rgba(192, 192, 192, 0.6), 0 0 40px rgba(192, 192, 192, 0.4)',
      'effect-galaxy': '0 0 20px rgba(75, 0, 130, 0.5), 0 0 40px rgba(75, 0, 130, 0.3)',
      'effect-shimmer': '0 0 20px rgba(240, 230, 140, 0.6), 0 0 40px rgba(240, 230, 140, 0.4)',
      'effect-prism': '0 0 20px rgba(255, 0, 255, 0.5), 0 0 40px rgba(255, 0, 255, 0.3)',
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
  if (user?.profileBackgroundColor && user.profileBackgroundColor !== 'null' && user.profileBackgroundColor !== 'undefined') {
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
    hasAnimation: user?.profileEffect && user.profileEffect !== 'none',
    backgroundColor: user?.profileBackgroundColor || null,
  };
};

// دالة مساعدة للتحقق من وجود تخصيص
export const hasCustomTheme = (user: any): boolean => {
  return (user?.profileEffect && user.profileEffect !== 'none') || user?.profileBackgroundColor;
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
    appliedGradient: user?.profileBackgroundColor
      ? buildProfileBackgroundGradient(user.profileBackgroundColor)
      : null,
    effect: user?.profileEffect || 'none',
    hasCustomBackground: !!user?.profileBackgroundColor,
  };
};
