/**
 * دوال مساعدة لمعالجة مصادر الصور في التطبيق
 */

/**
 * تحويل مصدر الصورة إلى URL صحيح
 * @param imageSrc - مصدر الصورة (قد يكون base64، URL، أو مسار ملف)
 * @param fallback - الصورة الافتراضية في حالة عدم وجود صورة
 * @returns URL صحيح للصورة
 */
export function getImageSrc(imageSrc: string | null | undefined, fallback: string = '/default_avatar.svg'): string {
  // إذا لم تكن هناك صورة، استخدم الافتراضي
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

  // إذا كانت الصورة تبدأ بـ /uploads (مسار كامل)
  if (imageSrc.startsWith('/uploads/')) {
    return imageSrc;
  }

  // إذا كانت الصورة تبدأ بـ / (مسار من الجذر)
  if (imageSrc.startsWith('/')) {
    return imageSrc;
  }

  // إذا كانت اسم ملف فقط، أضف المسار
  return `/uploads/profiles/${imageSrc}`;
}

/**
 * تحويل مصدر صورة البروفايل إلى URL صحيح مع timestamp لتجنب cache
 * @param imageSrc - مصدر الصورة
 * @param addTimestamp - إضافة timestamp أم لا
 * @returns URL صحيح للصورة
 */
export function getProfileImageSrc(imageSrc: string | null | undefined, addTimestamp: boolean = false): string {
  const src = getImageSrc(imageSrc);
  
  // لا نضيف timestamp للصور base64 أو URLs الخارجية
  if (!addTimestamp || src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src === '/default_avatar.svg') {
    return src;
  }

  // إضافة timestamp لتجنب cache
  const timestamp = new Date().getTime();
  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}t=${timestamp}`;
}

/**
 * تحويل مصدر صورة البانر إلى URL صحيح
 * @param bannerSrc - مصدر صورة البانر
 * @param fallback - الصورة الافتراضية للبانر
 * @returns URL صحيح لصورة البانر
 */
export function getBannerImageSrc(bannerSrc: string | null | undefined, fallback: string = 'https://i.imgur.com/rJKrUfs.jpeg'): string {
  if (!bannerSrc || bannerSrc === '') {
    return fallback;
  }

  // إذا كانت الصورة base64 data URL
  if (bannerSrc.startsWith('data:')) {
    return bannerSrc;
  }

  // إذا كانت الصورة URL كامل (http/https)
  if (bannerSrc.startsWith('http://') || bannerSrc.startsWith('https://')) {
    return bannerSrc;
  }

  // إذا كانت الصورة تبدأ بـ /uploads (مسار كامل)
  if (bannerSrc.startsWith('/uploads/')) {
    return bannerSrc;
  }

  // إذا كانت الصورة تبدأ بـ / (مسار من الجذر)
  if (bannerSrc.startsWith('/')) {
    return bannerSrc;
  }

  // إذا كانت اسم ملف فقط، أضف المسار
  return `/uploads/banners/${bannerSrc}`;
}