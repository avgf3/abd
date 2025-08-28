/**
 * 🧠 دوال مساعدة متقدمة لمعالجة مصادر الصور في التطبيق
 * نظام ذكي يدعم جميع أنواع التخزين مع تحسينات متقدمة
 */

// إحصائيات استخدام الصور للتحليل
interface ImageUsageStats {
  totalLoads: number;
  base64Loads: number;
  filesystemLoads: number;
  externalLoads: number;
  fallbackLoads: number;
  errors: number;
}

const imageStats: ImageUsageStats = {
  totalLoads: 0,
  base64Loads: 0,
  filesystemLoads: 0,
  externalLoads: 0,
  fallbackLoads: 0,
  errors: 0
};

/**
 * 🎯 تحويل مصدر الصورة إلى URL صحيح مع ذكاء متقدم
 * @param imageSrc - مصدر الصورة (قد يكون base64، URL، أو مسار ملف)
 * @param fallback - الصورة الافتراضية في حالة عدم وجود صورة
 * @param options - خيارات متقدمة للمعالجة
 * @returns URL صحيح للصورة مع معلومات إضافية
 */
export function getImageSrc(
  imageSrc: string | null | undefined,
  fallback: string = '/default_avatar.svg',
  options?: {
    enableStats?: boolean;
    preferBase64?: boolean;
    cacheControl?: 'auto' | 'force-refresh' | 'cache-first';
  }
): string {
  const { enableStats = true, preferBase64 = false, cacheControl = 'auto' } = options || {};
  
  if (enableStats) {
    imageStats.totalLoads++;
  }

  // إذا لم تكن هناك صورة، استخدم الافتراضي
  if (!imageSrc || imageSrc === '' || imageSrc === '/default_avatar.svg') {
    if (enableStats) imageStats.fallbackLoads++;
    return fallback;
  }

  try {
    // إذا كانت الصورة base64 data URL - أولوية عالية للأداء
    if (imageSrc.startsWith('data:')) {
      if (enableStats) imageStats.base64Loads++;
      return imageSrc;
    }

    // إذا كانت الصورة URL كامل (http/https) - صور خارجية
    if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
      if (enableStats) imageStats.externalLoads++;
      return imageSrc;
    }

    // إذا كانت الصورة تبدأ بـ /uploads أو / (مسار محلي)
    if (imageSrc.startsWith('/')) {
      if (enableStats) imageStats.filesystemLoads++;
      
      // إضافة cache control ذكي
      if (cacheControl === 'force-refresh') {
        const separator = imageSrc.includes('?') ? '&' : '?';
        return `${imageSrc}${separator}_t=${Date.now()}`;
      }
      
      return imageSrc;
    }

    // مسار غير معروف - محاولة معالجة ذكية
    if (imageSrc.includes('.')) {
      // يبدو أنه اسم ملف، نحاول إضافة مسار افتراضي
      const possiblePath = `/uploads/avatars/${imageSrc}`;
      if (enableStats) imageStats.filesystemLoads++;
      return possiblePath;
    }

    // إذا فشل كل شيء، استخدم الافتراضي
    if (enableStats) imageStats.fallbackLoads++;
    return fallback;
    
  } catch (error) {
    if (enableStats) imageStats.errors++;
    console.warn('⚠️ خطأ في معالجة مصدر الصورة:', error);
    return fallback;
  }
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

/**
 * 📊 الحصول على إحصائيات استخدام الصور
 */
export function getImageUsageStats(): ImageUsageStats & {
  base64Percentage: number;
  filesystemPercentage: number;
  externalPercentage: number;
  fallbackPercentage: number;
  errorPercentage: number;
} {
  const total = imageStats.totalLoads || 1;
  
  return {
    ...imageStats,
    base64Percentage: (imageStats.base64Loads / total) * 100,
    filesystemPercentage: (imageStats.filesystemLoads / total) * 100,
    externalPercentage: (imageStats.externalLoads / total) * 100,
    fallbackPercentage: (imageStats.fallbackLoads / total) * 100,
    errorPercentage: (imageStats.errors / total) * 100
  };
}

/**
 * 🔄 إعادة تعيين إحصائيات الصور
 */
export function resetImageStats(): void {
  imageStats.totalLoads = 0;
  imageStats.base64Loads = 0;
  imageStats.filesystemLoads = 0;
  imageStats.externalLoads = 0;
  imageStats.fallbackLoads = 0;
  imageStats.errors = 0;
}

/**
 * 🎨 إنشاء صورة افتراضية ديناميكية بالألوان
 */
export function generateDynamicAvatar(
  username: string,
  size: number = 256,
  options?: {
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
    shape?: 'circle' | 'square' | 'rounded';
  }
): string {
  const {
    backgroundColor = generateColorFromString(username),
    textColor = '#FFFFFF',
    fontSize = size * 0.4,
    shape = 'circle'
  } = options || {};

  const initials = username
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip">
          ${shape === 'circle' 
            ? `<circle cx="${size/2}" cy="${size/2}" r="${size/2}"/>` 
            : shape === 'rounded'
            ? `<rect x="0" y="0" width="${size}" height="${size}" rx="${size*0.1}"/>`
            : `<rect x="0" y="0" width="${size}" height="${size}"/>`
          }
        </clipPath>
      </defs>
      <rect width="${size}" height="${size}" fill="${backgroundColor}" clip-path="url(#clip)"/>
      <text x="50%" y="50%" text-anchor="middle" dy="0.35em" fill="${textColor}" 
            font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold">
        ${initials}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * 🌈 توليد لون من النص
 */
function generateColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * 📏 حساب حجم الصورة Base64
 */
export function calculateBase64Size(base64String: string): {
  bytes: number;
  kb: number;
  mb: number;
  formatted: string;
} {
  const data = base64String.includes(',') ? base64String.split(',')[1] : base64String;
  const bytes = Math.ceil(data.length * 0.75);
  const kb = bytes / 1024;
  const mb = kb / 1024;
  
  let formatted: string;
  if (mb >= 1) {
    formatted = `${mb.toFixed(2)} MB`;
  } else if (kb >= 1) {
    formatted = `${kb.toFixed(2)} KB`;
  } else {
    formatted = `${bytes} bytes`;
  }
  
  return { bytes, kb, mb, formatted };
}

/**
 * 🔍 فحص صحة URL الصورة
 */
export function validateImageUrl(url: string): Promise<{
  isValid: boolean;
  width?: number;
  height?: number;
  size?: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    if (!url) {
      resolve({ isValid: false, error: 'URL فارغ' });
      return;
    }

    // فحص Base64
    if (url.startsWith('data:')) {
      try {
        const sizeInfo = calculateBase64Size(url);
        resolve({ 
          isValid: true, 
          size: sizeInfo.bytes,
          width: 0, // لا يمكن تحديدها من Base64 بدون تحميل
          height: 0 
        });
      } catch (error) {
        resolve({ isValid: false, error: 'Base64 غير صحيح' });
      }
      return;
    }

    // فحص URL عادي
    const img = new Image();
    const timeout = setTimeout(() => {
      resolve({ isValid: false, error: 'انتهت مهلة التحميل' });
    }, 10000);

    img.onload = () => {
      clearTimeout(timeout);
      resolve({ 
        isValid: true, 
        width: img.naturalWidth, 
        height: img.naturalHeight 
      });
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve({ isValid: false, error: 'فشل تحميل الصورة' });
    };

    img.src = url;
  });
}

/**
 * 🎯 تحسين URL الصورة للأداء
 */
export function optimizeImageUrl(
  url: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'auto';
    lazy?: boolean;
  }
): {
  src: string;
  srcSet?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
} {
  const { width, height, quality = 80, format = 'auto', lazy = true } = options || {};
  
  // إذا كانت Base64، لا نحتاج تحسين
  if (url.startsWith('data:')) {
    return { src: url, loading: lazy ? 'lazy' : 'eager' };
  }
  
  // إذا كانت URL خارجي، لا نحتاج تحسين
  if (url.startsWith('http')) {
    return { src: url, loading: lazy ? 'lazy' : 'eager' };
  }
  
  // تحسين للصور المحلية
  let optimizedUrl = url;
  const params = new URLSearchParams();
  
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  if (quality !== 80) params.set('q', quality.toString());
  if (format !== 'auto') params.set('f', format);
  
  if (params.toString()) {
    optimizedUrl += (url.includes('?') ? '&' : '?') + params.toString();
  }
  
  // إنشاء srcSet للشاشات عالية الدقة
  const srcSet = width ? [
    `${optimizedUrl} 1x`,
    `${optimizedUrl.replace(`w=${width}`, `w=${width * 2}`)} 2x`
  ].join(', ') : undefined;
  
  return {
    src: optimizedUrl,
    srcSet,
    sizes: width ? `${width}px` : undefined,
    loading: lazy ? 'lazy' : 'eager'
  };
}

/**
 * 🔄 تحديث hash الصورة لإجبار التحديث
 */
export function forceImageRefresh(url: string): string {
  if (!url) return url;
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_refresh=${Date.now()}`;
}

/**
 * 🎭 إخفاء تفاصيل Base64 للعرض
 */
export function maskBase64ForDisplay(base64: string, maxLength: number = 50): string {
  if (!base64.startsWith('data:')) return base64;
  
  const [header, data] = base64.split(',');
  if (data && data.length > maxLength) {
    return `${header},${data.substring(0, maxLength)}...`;
  }
  
  return base64;
}

// تم حذف جميع دوال timestamp والتحديث القسري. الاعتماد على ?v=hash من السيرفر عند التغيير.
