// أداة لتنظيف وتصحيح البيانات قبل إرسالها للعميل

// دالة للتحقق من صحة كود HEX
export function isValidHexColor(color: string): boolean {
  if (!color) return false;
  const hexPattern = /^#?[0-9A-Fa-f]{6}$/;
  return hexPattern.test(color.trim());
}

// دالة لتنظيف وتصحيح لون HEX
export function sanitizeHexColor(
  color: string | null | undefined,
  defaultColor: string = '#4A90E2'
): string {
  if (!color || color === 'null' || color === 'undefined' || color === '') {
    return defaultColor;
  }

  const trimmed = color.trim();
  if (isValidHexColor(trimmed)) {
    return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  }

  return defaultColor;
}

// دالة لتنظيف التأثير
export function sanitizeEffect(effect: string | null | undefined): string {
  if (!effect || effect === 'null' || effect === 'undefined' || effect === '') {
    return 'none';
  }

  // قائمة التأثيرات المسموحة
  const validEffects = [
    'none',
    'effect-glow',
    'effect-pulse',
    'effect-water',
    'effect-aurora',
    'effect-neon',
    'effect-fire',
    'effect-ice',
    'effect-rainbow',
    'effect-shadow',
    'effect-electric',
    'effect-crystal',
    // تأثيرات إضافية مدعومة في الواجهة
    'effect-holographic',
    'effect-galaxy',
    'effect-shimmer',
    'effect-prism',
    'effect-magnetic',
    'effect-heartbeat',
    'effect-stars',
    'effect-snow',
  ];

  return validEffects.includes(effect) ? effect : 'none';
}

// دالة لتنظيف الثيم
export function sanitizeTheme(theme: string | null | undefined): string {
  if (!theme || theme === 'null' || theme === 'undefined' || theme === '') {
    return 'default';
  }

  // قائمة الثيمات المسموحة
  const validThemes = [
    'default',
    'dark',
    'golden',
    'royal',
    'ocean',
    'sunset',
    'forest',
    'rose',
    'emerald',
    'fire',
    'galaxy',
    'rainbow',
    'aqua',
    'crystal',
    'amber',
    'coral',
    'jade',
    'sapphire',
    'bronze',
    'silver',
    'platinum',
    'obsidian',
    'mystical',
    'tropical',
    'aurora',
    'phoenix',
    'burgundy',
    'midnight',
    'arctic',
    'wine',
    'steel',
    'navy',
    'slate',
    'storm',
    'crimson',
    'royal_blue',
    'black_gradient',
    'deep_black',
    'charcoal',
    'blush_pink',
    'lavender',
    'powder_blue',
    'soft_mint',
    'peach',
    'lilac',
    'ivory',
    'ice',
  ];

  return validThemes.includes(theme) ? theme : 'default';
}

// دالة لتنظيف بيانات المستخدم قبل إرسالها
export function sanitizeUserData(user: any): any {
  if (!user) return user;

  const safeMusicUrl =
    typeof user.profileMusicUrl === 'string' && user.profileMusicUrl.startsWith('/uploads/music/')
      ? user.profileMusicUrl
      : undefined;

  // sanitize dmPrivacy
  const rawDmPrivacy = typeof user.dmPrivacy === 'string' ? user.dmPrivacy : 'all';
  const dmPrivacy = ['all', 'friends', 'none'].includes(rawDmPrivacy) ? rawDmPrivacy : 'all';

  return {
    ...user,
    profileBackgroundColor: sanitizeProfileBackgroundColor(user.profileBackgroundColor),
    usernameColor: sanitizeHexColor(user.usernameColor, '#4A90E2'),
    // تمرير تدرج اسم المستخدم كما هو إذا كان نصاً صالحاً يبدأ بـ linear-gradient(
    usernameGradient:
      typeof user.usernameGradient === 'string' && user.usernameGradient.startsWith('linear-gradient(')
        ? user.usernameGradient
        : undefined,
    // تنظيف تأثير الاسم (إن وجد)
    usernameEffect: sanitizeEffect(user.usernameEffect),
    profileEffect: sanitizeEffect(user.profileEffect),
    dmPrivacy,
    // تفضيلات عامة (ضمان قيم منطقية افتراضية)
    showPointsToOthers:
      typeof user.showPointsToOthers === 'boolean' ? user.showPointsToOthers : true,
    showSystemMessages:
      typeof user.showSystemMessages === 'boolean' ? user.showSystemMessages : true,
    globalSoundEnabled:
      typeof user.globalSoundEnabled === 'boolean' ? user.globalSoundEnabled : true,
    // موسيقى البروفايل
    profileMusicUrl: safeMusicUrl,
    profileMusicTitle: typeof user.profileMusicTitle === 'string' ? user.profileMusicTitle : undefined,
    profileMusicEnabled:
      typeof user.profileMusicEnabled === 'boolean' ? user.profileMusicEnabled : true,
    profileMusicVolume:
      typeof user.profileMusicVolume === 'number'
        ? Math.max(0, Math.min(100, user.profileMusicVolume))
        : 70,
    // توحيد الحقول المفقودة لضمان عدم ظهور "غير محدد" دون داع
    status: typeof user.status === 'string' ? user.status : '',
    relation: typeof user.relation === 'string' ? user.relation : undefined,
    age: typeof user.age === 'number' && Number.isFinite(user.age) ? user.age : undefined,
    createdAt: user.createdAt || user.joinDate || undefined,
    joinDate: user.joinDate || user.createdAt || undefined,
  };
}

// دالة لتنظيف مصفوفة من المستخدمين
export function sanitizeUsersArray(users: any[]): any[] {
  // التحقق من أن users هو array فعلاً
  if (!Array.isArray(users)) {
    console.error('sanitizeUsersArray: Expected array but got:', typeof users);
    return [];
  }

  return users.map((user) => sanitizeUserData(user));
}

export function sanitizeProfileBackgroundColor(
  color: string | null | undefined,
  defaultColor: string = '#2a2a2a'
): string {
  if (!color || color === 'null' || color === 'undefined' || color === '') {
    return defaultColor;
  }

  const trimmed = color.trim();
  if (trimmed.startsWith('linear-gradient(')) {
    return trimmed;
  }

  if (isValidHexColor(trimmed)) {
    return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  }

  return defaultColor;
}
