export type TagLayout = {
  widthRatio: number;        // نسبة عرض التاج إلى قطر الصورة
  xAdjustPx: number;         // إزاحة أفقية إضافية (px)
  yAdjustPx: number;         // إزاحة عمودية إضافية (px)
  anchorY?: number;          // نسبة من ارتفاع التاج لإزاحة نقطة الارتكاز العمودية (0 = أسفل التاج)
  autoAnchor?: boolean;      // حساب الهامش الشفاف تلقائياً من صورة التاج (Canvas)
};

// 🏷️ قالب موحّد مستمد من "تاج 12" ليكون المرجع في كل الأماكن
export const TAG12_TEMPLATE: TagLayout = {
  widthRatio: 1.10,
  xAdjustPx: 0,
  yAdjustPx: -3,
  anchorY: 0.10,
  autoAnchor: true,
};

export const DEFAULT_TAG_LAYOUT: TagLayout = {
  ...TAG12_TEMPLATE,
};

// ⚙️ توحيد شامل: كل التيجان تتبع نفس قالب "تاج 12"
// هذا يضمن ثباتاً بصرياً كاملاً في جميع السياقات والأحجام
export const TAG_LAYOUTS: Record<number, TagLayout> = (() => {
  const map: Record<number, TagLayout> = {};
  for (let i = 1; i <= 50; i++) {
    map[i] = TAG12_TEMPLATE;
  }
  return map;
})();

export function getTagLayout(tagNumber?: number): TagLayout {
  if (!tagNumber) return DEFAULT_TAG_LAYOUT;
  return TAG_LAYOUTS[tagNumber] ?? DEFAULT_TAG_LAYOUT;
}
