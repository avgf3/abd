/**
 * دوال حسابات الإطارات
 * حسابات دقيقة لضمان عرض مثالي في جميع الأحجام
 */

import type { FrameCalculations, FrameDisplayConfig, FrameInfo } from '@/types/avatarFrame';

/**
 * حساب أبعاد الإطار بناءً على حجم الصورة والإعدادات
 */
export function calculateFrameDimensions(
  frameInfo: FrameInfo,
  config: FrameDisplayConfig
): FrameCalculations {
  const { avatarSize, variant } = config;
  const { sizeRatio, isCircular } = frameInfo;
  
  // حسابات مختلفة حسب نوع العرض
  let effectiveSizeRatio = sizeRatio;
  
  // في قائمة المتصلين نقلل حجم الإطار قليلاً
  if (variant === 'list') {
    effectiveSizeRatio = Math.min(sizeRatio, 1.2);
  }
  
  // في الشات نستخدم حجم متوسط
  if (variant === 'chat') {
    effectiveSizeRatio = Math.min(sizeRatio, 1.15);
  }
  
  // حساب الأحجام
  const containerSize = Math.round(avatarSize * effectiveSizeRatio);
  const frameSize = containerSize;
  const imageSize = avatarSize;
  const imageOffset = Math.round((containerSize - imageSize) / 2);
  
  // شعاع الحدود - دائري للصور الدائرية
  const borderRadius = isCircular || variant === 'list' ? '50%' : '45%';
  
  return {
    containerSize,
    imageSize,
    imageOffset,
    frameSize,
    borderRadius
  };
}

/**
 * حساب مسار ملف الإطار
 */
export function getFramePath(fileName: string): string {
  if (!fileName) return '';
  
  // المسار الصحيح للملفات داخل مجلد svgs (يخدمه الخادم مع كاش)
  return `/svgs/${fileName}`;
}

/**
 * حساب أنماط CSS للحاوية
 */
export function getContainerStyles(calc: FrameCalculations): React.CSSProperties {
  return {
    position: 'relative',
    width: `${calc.containerSize}px`,
    height: `${calc.containerSize}px`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  };
}

/**
 * حساب أنماط CSS للصورة
 */
export function getImageStyles(calc: FrameCalculations): React.CSSProperties {
  return {
    width: `${calc.imageSize}px`,
    height: `${calc.imageSize}px`,
    borderRadius: calc.borderRadius,
    objectFit: 'cover' as const,
    position: 'relative',
    zIndex: 1
  };
}

/**
 * حساب أنماط CSS للإطار
 */
export function getFrameStyles(calc: FrameCalculations): React.CSSProperties {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    width: `${calc.frameSize}px`,
    height: `${calc.frameSize}px`,
    pointerEvents: 'none' as const,
    zIndex: 2,
    // التأكد من أن الإطار يحيط بالصورة بشكل صحيح
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };
}

/**
 * حساب أنماط التأثيرات الإضافية
 */
export function getEffectStyles(
  frameInfo: FrameInfo,
  config: FrameDisplayConfig
): React.CSSProperties {
  const styles: React.CSSProperties = {};
  
  // إضافة توهج للإطارات الخاصة
  if (config.glow && frameInfo.primaryColor) {
    styles.filter = `drop-shadow(0 0 8px ${frameInfo.primaryColor}80)`;
  }
  
  // إضافة حركة للإطارات المتحركة
  if (config.animate) {
    styles.animation = 'frame-pulse 3s ease-in-out infinite';
  }
  
  return styles;
}

/**
 * حساب حجم الإطار الأمثل بناءً على السياق
 */
export function getOptimalAvatarSize(variant: FrameDisplayConfig['variant']): number {
  switch (variant) {
    case 'list':
      return 40; // حجم صغير لقائمة المتصلين
    case 'chat':
      return 32; // حجم أصغر للرسائل
    case 'profile':
      return 120; // حجم كبير للملف الشخصي
    default:
      return 40;
  }
}