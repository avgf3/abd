/**
 * ✨ نظام احترافي موحد لأحجام الإطارات - مثل المواقع العالمية
 * Professional unified frame sizing system - Like global websites
 * 
 * 🎯 المفهوم الجديد: الإطار والصورة بنفس الحجم تماماً
 * New Concept: Frame and image are exactly the same size
 * 
 * ✅ المزايا:
 * - محاذاة مثالية 100%
 * - بساطة في الحساب
 * - لا توجد مسافات غير متوقعة
 * - يعمل مثل Facebook, Instagram, Discord
 */

export const FRAME_SIZING = {
  /**
   * 🚫 لم نعد نحتاج FRAME_WIDTH - الإطار يغطي الصورة مباشرة
   * No more FRAME_WIDTH needed - Frame overlays image directly
   */

  /**
   * الأحجام القياسية الموحدة - للصورة والإطار معاً
   * Standard unified sizes - For both image and frame
   */
  SIZES: {
    /** للاستخدام في الرسائل والأماكن الصغيرة جداً (32px) */
    micro: 32,
    
    /** للاستخدام في القوائم الجانبية (40px) */
    small: 40,
    
    /** الحجم الافتراضي للدردشة (56px) */
    medium: 56,
    
    /** للملفات الشخصية المصغرة (80px) */
    large: 80,
    
    /** للملفات الشخصية الكاملة (120px) */
    xlarge: 120,
  },
} as const;

/**
 * ✨ الحل الجديد: الإطار = الصورة (نفس الحجم تماماً)
 * New Solution: Frame = Image (exactly same size)
 * 
 * هذا هو ما تفعله المواقع الاحترافية:
 * - Discord: الإطار يغطي الصورة بنفس الحجم
 * - Facebook: الإطار overlay مباشر
 * - Instagram: نفس الحجم مع padding داخلي
 */
export function getFrameSize(imageSize: number): number {
  // 🎯 البساطة = الكمال
  return imageSize;
}

/**
 * الحصول على الحجم القياسي المناسب
 * Get appropriate standard size
 */
export function getStandardSize(requestedSize: number): number {
  const sizes = Object.values(FRAME_SIZING.SIZES);
  
  // إيجاد أقرب حجم قياسي
  let closest = sizes[0];
  let minDiff = Math.abs(requestedSize - closest);
  
  for (const size of sizes) {
    const diff = Math.abs(requestedSize - size);
    if (diff < minDiff) {
      minDiff = diff;
      closest = size;
    }
  }
  
  return closest;
}
