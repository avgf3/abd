/**
 * نظام إطارات الصور الشخصية - Types
 * تصميم نظيف ومحسّن للأداء
 */

// أنواع الإطارات المتاحة
export type FrameType = 
  | 'none'
  | 'crown-gold'
  | 'crown-silver'
  | 'crown-rosegold'
  | 'crown-blue'
  | 'crown-emerald'
  | 'crown-purple'
  | 'crown-classic-gold'
  | 'crown-classic-pink'
  | 'svip1-gold'
  | 'svip1-pink'
  | 'svip2-gold'
  | 'svip2-pink'
  | 'wings-king'
  | 'wings-queen';

// تصنيفات الإطارات
export type FrameCategory = 'crown' | 'svip' | 'wings' | 'special';

// معلومات الإطار
export interface FrameInfo {
  id: FrameType;
  name: string;
  category: FrameCategory;
  fileName: string;
  // نسبة حجم الإطار إلى الصورة (1.2 = 120%)
  sizeRatio: number;
  // هل الإطار دائري أم له زخارف خارجية
  isCircular: boolean;
  // الأولوية في العرض (أعلى = أهم)
  priority: number;
  // اللون الأساسي للإطار (للتأثيرات)
  primaryColor?: string;
}

// إعدادات عرض الإطار
export interface FrameDisplayConfig {
  // حجم الصورة الأساسي بالبكسل
  avatarSize: number;
  // هل نعرض الإطار في وضع مصغر (قائمة) أم كامل (ملف شخصي)
  variant: 'list' | 'profile' | 'chat';
  // تأثيرات إضافية
  animate?: boolean;
  glow?: boolean;
  // دالة callback عند النقر
  onClick?: () => void;
}

// نتيجة حسابات الإطار
export interface FrameCalculations {
  // حجم الحاوية الخارجية
  containerSize: number;
  // حجم الصورة الفعلي
  imageSize: number;
  // موضع الصورة داخل الحاوية
  imageOffset: number;
  // حجم الإطار
  frameSize: number;
  // شعاع الحدود للصورة
  borderRadius: string;
}