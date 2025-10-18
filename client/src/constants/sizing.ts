/**
 * نظام الأحجام الموحد لإطارات البروفايل
 * Unified sizing system for profile frames
 * 
 * هذا الملف يضمن تناسق كامل في أحجام الإطارات عبر كامل التطبيق
 * This file ensures complete consistency in frame sizes across the entire app
 */

export const FRAME_SIZING = {
  /**
   * النسبة الموحدة لحجم الإطار بالنسبة للصورة
   * Unified ratio for frame size relative to image
   * 
   * الإطار = حجم الصورة × 1.38
   * Frame = Image size × 1.38
   */
  RATIO: 1.38,

  /**
   * الأحجام القياسية للصور
   * Standard sizes for images
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

  /**
   * مسافة إضافية للإطار حول الصورة (2%)
   * Additional padding for frame around image (2%)
   */
  OVERLAY_PADDING: 0.02,
} as const;

/**
 * حساب حجم الحاوية بناءً على حجم الصورة
 * Calculate container size based on image size
 */
export function getContainerSize(imageSize: number): number {
  return Math.round(imageSize * FRAME_SIZING.RATIO);
}

/**
 * حساب حجم الإطار مع الـ padding
 * Calculate frame size with padding
 */
export function getFrameSize(imageSize: number): number {
  return Math.round(imageSize * (1 + FRAME_SIZING.OVERLAY_PADDING * 2));
}

/**
 * الحصول على الحجم القياسي المناسب
 * Get appropriate standard size
 */
export function getStandardSize(requestedSize: number): number {
  const sizes = Object.values(FRAME_SIZING.SIZES);
  
  // إيجاد أقرب حجم قياسي
  // Find closest standard size
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
