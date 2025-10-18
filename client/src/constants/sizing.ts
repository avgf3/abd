/**
 * نظام بسيط وموحد لأحجام الإطارات
 * Simple and unified frame sizing system
 * 
 * الفكرة: الإطار أكبر من الصورة بمقدار عرض الإطار من كل جانب
 * Concept: Frame is larger than image by frame width on each side
 */

export const FRAME_SIZING = {
  /**
   * عرض الإطار من كل جانب (pixels)
   * Frame width from each side (pixels)
   */
  FRAME_WIDTH: 8,

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
} as const;

/**
 * حساب حجم الإطار بناءً على حجم الصورة
 * Calculate frame size based on image size
 * 
 * ببساطة: حجم الإطار = حجم الصورة + (2 × عرض الإطار)
 * Simply: Frame size = Image size + (2 × Frame width)
 */
export function getFrameSize(imageSize: number): number {
  return imageSize + (2 * FRAME_SIZING.FRAME_WIDTH);
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
