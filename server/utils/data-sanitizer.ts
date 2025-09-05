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
  defaultColor: string = '#2a2a2a'
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

  return {
    ...user,
    profileBackgroundColor: sanitizeProfileBackgroundColor(user.profileBackgroundColor),
    usernameColor: sanitizeHexColor(user.usernameColor, '#000000'),
    profileEffect: sanitizeEffect(user.profileEffect),
    // موسيقى البروفايل
    profileMusicUrl: safeMusicUrl,
    profileMusicTitle: typeof user.profileMusicTitle === 'string' ? user.profileMusicTitle : undefined,
    profileMusicEnabled:
      typeof user.profileMusicEnabled === 'boolean' ? user.profileMusicEnabled : true,
    profileMusicVolume:
      typeof user.profileMusicVolume === 'number'
        ? Math.max(0, Math.min(100, user.profileMusicVolume))
        : 70,
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
