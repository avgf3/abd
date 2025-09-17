/**
 * دوال مساعدة لمعالجة مصادر الصور
 */

/**
 * تحويل مصدر الصورة إلى URL صحيح
 */
export function getImageSrc(
  imageSrc: string | null | undefined,
  fallback: string = '/default_avatar.svg'
): string {
  if (!imageSrc || imageSrc === '' || imageSrc === '/default_avatar.svg') {
    return fallback;
  }

  // إذا كانت الصورة base64 data URL
  if (imageSrc.startsWith('data:')) {
    return imageSrc;
  }

  // إذا كانت الصورة URL كامل (http/https)
  if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
    return imageSrc;
  }

  // إذا كانت الصورة تبدأ بـ / (مسار محلي)
  if (imageSrc.startsWith('/')) {
    return imageSrc;
  }

  // إذا فشل كل شيء، استخدم الافتراضي
  return fallback;
}

/**
 * مصدر صورة البروفايل
 */
export function getProfileImageSrc(
  imageSrc: string | null | undefined,
  fallback: string = '/default_avatar.svg'
): string {
  return getImageSrc(imageSrc, fallback);
}

/**
 * مصدر صورة البانر
 */
export function getBannerImageSrc(
  bannerSrc: string | null | undefined,
  fallback: string = ''
): string {
  return getImageSrc(bannerSrc, fallback);
}
