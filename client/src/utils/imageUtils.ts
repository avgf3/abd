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
 * تحويل مصدر صورة البروفايل إلى URL صحيح مع timestamp لتجنب cache
 * @param imageSrc - مصدر الصورة
 * @param fallback - الصورة الافتراضية (اختياري)
 * @returns URL صحيح للصورة
 */
export function getProfileImageSrc(
  imageSrc: string | null | undefined,
  fallback: string = '/default_avatar.svg'
): string {
  return getImageSrc(imageSrc, fallback);
}

/**
 * تحويل مصدر صورة البانر إلى URL صحيح
 * @param bannerSrc - مصدر صورة البانر
 * @param fallback - الصورة الافتراضية للبانر
 * @returns URL صحيح لصورة البانر
 */
export function getBannerImageSrc(
  bannerSrc: string | null | undefined,
  fallback: string = '/svgs/emerald.svg'
): string {
  const src = getImageSrc(bannerSrc, fallback);

  // إرجاع الصورة كما هي - base64 أو مسار عادي
  return src;
}

/**
 * دالة موحدة لمعالجة جميع أنواع الصور مع timestamp
 * @param imageSrc - مصدر الصورة
 * @param options - خيارات التكوين
 * @returns URL صحيح للصورة مع timestamp حسب الحاجة
 */
export function getImageUrl(
  imageSrc: string | null | undefined,
  options: {
    type?: 'profile' | 'banner' | 'general';
    addTimestamp?: boolean;
    fallback?: string;
    forceRefresh?: boolean;
  } = {}
): string {
  const { type = 'general', addTimestamp = false, fallback, forceRefresh = false } = options;

  // تحديد الصورة الافتراضية حسب النوع
  let defaultFallback = '/default_avatar.svg';
  if (type === 'banner') {
    defaultFallback = '/svgs/emerald.svg';
  }

  const finalFallback = fallback || defaultFallback;
  const src = getImageSrc(imageSrc, finalFallback);

  // تحديد متى نضيف timestamp
  const shouldAddTimestamp =
    (addTimestamp || forceRefresh) &&
    !src.startsWith('data:') &&
    !src.startsWith('http://') &&
    !src.startsWith('https://') &&
    src !== finalFallback;

  if (!shouldAddTimestamp) {
    return src;
  }

  // إضافة timestamp مناسب
  const timestamp = forceRefresh ? Date.now() : Math.floor(Date.now() / (1000 * 60 * 5)); // تحديث كل 5 دقائق
  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}t=${timestamp}`;
}

/**
 * دالة للحصول على timestamp موحد للصور
 * @param refreshInterval - فترة التحديث بالدقائق (افتراضي: 5 دقائق)
 * @returns timestamp موحد
 */
export function getImageTimestamp(refreshInterval: number = 5): number {
  return Math.floor(Date.now() / (1000 * 60 * refreshInterval));
}

/**
 * دالة لإنشاء URL صورة مع إعادة تحميل فورية
 * @param imageSrc - مصدر الصورة
 * @param type - نوع الصورة
 * @returns URL مع timestamp فوري
 */
export function refreshImageUrl(
  imageSrc: string | null | undefined,
  type: 'profile' | 'banner' | 'general' = 'general'
): string {
  return getImageUrl(imageSrc, {
    type,
    forceRefresh: true,
  });
}
