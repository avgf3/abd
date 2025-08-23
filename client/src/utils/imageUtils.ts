/**
 * دوال مساعدة لمعالجة مصادر الصور في التطبيق
 */

/**
 * تحويل مصدر الصورة إلى URL صحيح
 * @param imageSrc - مصدر الصورة (قد يكون base64، URL، أو مسار ملف)
 * @param fallback - الصورة الافتراضية في حالة عدم وجود صورة
 * @returns URL صحيح للصورة
 */
export function getImageSrc(
  imageSrc: string | null | undefined,
  fallback: string = '/default_avatar.svg'
): string {
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

  // إذا كانت اسم ملف فقط، لا نخمّن المسار. نعيد كما هو ليتحمّل من DB فقط.
  return imageSrc;
}

/**
 * مصدر صورة البروفايل - يعتمد على getImageSrc فقط
 */
export function getProfileImageSrc(
  imageSrc: string | null | undefined,
  fallback: string = '/default_avatar.svg'
): string {
  return getImageSrc(imageSrc, fallback);
}

/**
 * مصدر صورة البانر - للإبقاء على التوافق فقط
 */
export function getBannerImageSrc(
  bannerSrc: string | null | undefined,
  fallback: string = 'https://i.imgur.com/rJKrUfs.jpeg'
): string {
  return getImageSrc(bannerSrc, fallback);
}

// تم حذف جميع دوال timestamp والتحديث القسري. الاعتماد على ?v=hash من السيرفر عند التغيير.
