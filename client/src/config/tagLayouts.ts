export type TagLayout = {
  widthRatio: number;        // نسبة عرض التاج إلى قطر الصورة
  xAdjustPx: number;         // إزاحة أفقية إضافية (px)
  yAdjustPx: number;         // إزاحة عمودية إضافية (px)
  anchorY?: number;          // نسبة من ارتفاع التاج لإزاحة نقطة الارتكاز العمودية (0 = أسفل التاج)
  autoAnchor?: boolean;      // حساب الهامش الشفاف تلقائياً من صورة التاج (Canvas)
};

// 🏷️ قالب موحّد مستمد من "تاج 12" ليكون المرجع في كل الأماكن
export const TAG12_TEMPLATE: TagLayout = {
  // نموذج افتراضي متوازن يناسب أغلب التيجان كـ "طوق رأس"
  // العرض أكبر قليلاً من عرض الصورة لضمان مظهر متناسق
  widthRatio: 1.10,
  xAdjustPx: 0,
  // سالب = رفع بسيط للتاج نحو الأعلى لتحسين الالتحام مع الصورة
  yAdjustPx: -2,
  // قيمة افتراضية تجعل جزءاً من قاعدة التاج يدخل الصورة (Headband)
  anchorY: 0.35,
  autoAnchor: true,
};

export const DEFAULT_TAG_LAYOUT: TagLayout = { ...TAG12_TEMPLATE };

// ⚙️ توحيد شامل: كل التيجان تتبع نفس قالب "تاج 12"
// هذا يضمن ثباتاً بصرياً كاملاً في جميع السياقات والأحجام
export const TAG_LAYOUTS: Record<number, TagLayout> = (() => {
  const map: Record<number, TagLayout> = {};

  // املأ الكل بالإعدادات الافتراضية أولاً
  for (let i = 1; i <= 50; i++) map[i] = { ...DEFAULT_TAG_LAYOUT };

  const override = (n: number, layout: Partial<TagLayout>) => {
    map[n] = { ...map[n], ...layout } as TagLayout;
  };

  // تاج 1: تجربة أقوى - ينزل أكثر ويدخل أكثر في الصورة
  override(1,  { widthRatio: 1.10, yAdjustPx: 15, anchorY: 0.65 });
  
  // تاج 8: تجربة أقوى - ينزل أكثر ويدخل أكثر في الصورة
  override(8,  { widthRatio: 1.10, yAdjustPx: 15, anchorY: 0.65 });

  return map;
})();

export function getTagLayout(tagNumber?: number): TagLayout {
  if (!tagNumber) return DEFAULT_TAG_LAYOUT;
  return TAG_LAYOUTS[tagNumber] ?? DEFAULT_TAG_LAYOUT;
}
