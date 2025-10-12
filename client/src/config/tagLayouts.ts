export type TagLayout = {
  widthRatio: number;        // نسبة عرض التاج إلى قطر الصورة
  xAdjustPx: number;         // إزاحة أفقية إضافية (px)
  yAdjustPx: number;         // إزاحة عمودية إضافية (px)
  anchorY?: number;          // نسبة من ارتفاع التاج لإزاحة نقطة الارتكاز العمودية (0 = أسفل التاج)
  autoAnchor?: boolean;      // حساب الهامش الشفاف تلقائياً من صورة التاج (Canvas)
};

export const DEFAULT_TAG_LAYOUT: TagLayout = {
  widthRatio: 0.72,
  xAdjustPx: 0,
  yAdjustPx: 3,
  anchorY: 0.18,
  autoAnchor: true,
};

export const TAG_LAYOUTS: Record<number, TagLayout> = {
  // القيم الجديدة المُحسّنة: التاج يلبس على الصورة بشكل احترافي
  // anchorY = نسبة من التاج تدخل في الصورة (0 = يلامس فقط، 0.15 = 15% يدخل)
  // yAdjustPx = ضبط نهائي يدوي (موجب = للأسفل، سالب = للأعلى)
  1:  { widthRatio: 0.75, xAdjustPx: 0, yAdjustPx: 2, anchorY: 0.20, autoAnchor: true },
  2:  { widthRatio: 0.72, xAdjustPx: 0, yAdjustPx: 3, anchorY: 0.18, autoAnchor: true },
  3:  { widthRatio: 0.70, xAdjustPx: 0, yAdjustPx: 4, anchorY: 0.16, autoAnchor: true },
  4:  { widthRatio: 0.74, xAdjustPx: 0, yAdjustPx: 2, anchorY: 0.22, autoAnchor: true },
  5:  { widthRatio: 0.68, xAdjustPx: 0, yAdjustPx: 4, anchorY: 0.20, autoAnchor: true },
  6:  { widthRatio: 0.78, xAdjustPx: 0, yAdjustPx: 1, anchorY: 0.25, autoAnchor: true },
  7:  { widthRatio: 0.74, xAdjustPx: 0, yAdjustPx: 3, anchorY: 0.22, autoAnchor: true },
  8:  { widthRatio: 0.72, xAdjustPx: 0, yAdjustPx: 2, anchorY: 0.21, autoAnchor: true },
  9:  { widthRatio: 0.76, xAdjustPx: 0, yAdjustPx: 2, anchorY: 0.22, autoAnchor: true },
  10: { widthRatio: 0.70, xAdjustPx: 0, yAdjustPx: 4, anchorY: 0.16, autoAnchor: true },
  11: { widthRatio: 0.73, xAdjustPx: 0, yAdjustPx: 3, anchorY: 0.19, autoAnchor: true },
  12: { widthRatio: 0.75, xAdjustPx: 0, yAdjustPx: 1, anchorY: 0.24, autoAnchor: true },
};

export function getTagLayout(tagNumber?: number): TagLayout {
  if (!tagNumber) return DEFAULT_TAG_LAYOUT;
  return TAG_LAYOUTS[tagNumber] ?? DEFAULT_TAG_LAYOUT;
}
