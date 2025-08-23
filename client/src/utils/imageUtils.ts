/**
 * دوال مساعدة لمعالجة مصادر الصور في التطبيق
 */

/**
 * تحويل مصدر الصورة إلى URL صحيح
 * @param imageSrc - مصدر الصورة (قد يكون base64، URL، أو مسار ملف)
 * @returns URL صحيح للصورة أو null إذا لم توجد صورة
 */
export function getImageSrc(
  imageSrc: string | null | undefined
): string | null {
  // إذا لم تكن هناك صورة، نرجع null
  if (!imageSrc || imageSrc === '') {
    return null;
  }

  // تجاهل الصور الافتراضية القديمة
  if (imageSrc === '/default_avatar.svg' || 
      imageSrc.includes('default') || 
      imageSrc.includes('facebook')) {
    return null;
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

  // إذا كانت اسم ملف فقط، نعيدها كما هي
  return imageSrc;
}

/**
 * تحويل مصدر صورة البروفايل إلى URL صحيح
 * @param imageSrc - مصدر الصورة
 * @param userId - معرف المستخدم (اختياري)
 * @param avatarHash - هاش الصورة للتحديث (اختياري)
 * @returns URL صحيح للصورة أو null
 */
export function getProfileImageSrc(
  imageSrc: string | null | undefined,
  userId?: number,
  avatarHash?: string | number
): string | null {
  const src = getImageSrc(imageSrc);
  
  // إذا لم توجد صورة ولدينا userId، نحاول البحث عن صورة محفوظة
  if (!src && userId) {
    const possiblePath = `/uploads/avatars/${userId}.webp`;
    // نتحقق من وجود هاش للتأكد من وجود صورة فعلاً
    if (avatarHash) {
      return `${possiblePath}?v=${avatarHash}`;
    }
  }
  
  // إضافة هاش للصورة إذا كان موجوداً
  if (src && avatarHash && !src.includes('?v=')) {
    return `${src}?v=${avatarHash}`;
  }
  
  return src;
}

/**
 * تحويل مصدر صورة البانر إلى URL صحيح
 * @param bannerSrc - مصدر صورة البانر
 * @returns URL صحيح لصورة البانر أو null
 */
export function getBannerImageSrc(
  bannerSrc: string | null | undefined
): string | null {
  // لا نريد صور بانر افتراضية
  return getImageSrc(bannerSrc);
}

/**
 * دالة موحدة لمعالجة جميع أنواع الصور
 * @param imageSrc - مصدر الصورة
 * @param options - خيارات التكوين
 * @returns URL صحيح للصورة أو null
 */
export function getImageUrl(
  imageSrc: string | null | undefined,
  options: {
    type?: 'profile' | 'banner' | 'general';
    userId?: number;
    avatarHash?: string | number;
    addTimestamp?: boolean;
    forceRefresh?: boolean;
  } = {}
): string | null {
  const { type = 'general', userId, avatarHash, addTimestamp = false, forceRefresh = false } = options;

  let src: string | null = null;
  
  if (type === 'profile') {
    src = getProfileImageSrc(imageSrc, userId, avatarHash);
  } else if (type === 'banner') {
    src = getBannerImageSrc(imageSrc);
  } else {
    src = getImageSrc(imageSrc);
  }

  if (!src) {
    return null;
  }

  // تحديد متى نضيف timestamp
  const shouldAddTimestamp =
    (addTimestamp || forceRefresh) &&
    !src.startsWith('data:') &&
    !src.startsWith('http://') &&
    !src.startsWith('https://');

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
 * @returns URL مع timestamp فوري أو null
 */
export function refreshImageUrl(
  imageSrc: string | null | undefined,
  type: 'profile' | 'banner' | 'general' = 'general'
): string | null {
  return getImageUrl(imageSrc, {
    type,
    forceRefresh: true,
  });
}

/**
 * التحقق من صحة امتداد الصورة
 * @param filename - اسم الملف
 * @returns true إذا كان الامتداد صحيحاً
 */
export function isValidImageExtension(filename: string): boolean {
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return validExtensions.includes(ext);
}

/**
 * التحقق من صحة حجم الصورة
 * @param sizeInBytes - حجم الملف بالبايت
 * @param maxSizeMB - الحد الأقصى بالميجابايت (افتراضي 5)
 * @returns true إذا كان الحجم مقبولاً
 */
export function isValidImageSize(sizeInBytes: number, maxSizeMB: number = 5): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return sizeInBytes <= maxSizeBytes;
}
