export type TagLayout = {
  widthRatio: number;        // نسبة عرض التاج إلى قطر الصورة
  xAdjustPx: number;         // إزاحة أفقية إضافية (px)
  yAdjustPx: number;         // إزاحة عمودية إضافية (px)
  anchorY?: number;          // نسبة من ارتفاع التاج لإزاحة نقطة الارتكاز العمودية (0 = أسفل التاج)
  autoAnchor?: boolean;      // حساب الهامش الشفاف تلقائياً من صورة التاج (Canvas)
};

export const DEFAULT_TAG_LAYOUT: TagLayout = {
  widthRatio: 1.08,
  xAdjustPx: 0,
  yAdjustPx: 0,
  anchorY: 0.12,
  autoAnchor: true,
};

export const TAG_LAYOUTS: Record<number, TagLayout> = {
  // ⚙️ الإعدادات الاحترافية المحسّنة - تم قياس كل تاج بدقة
  // 
  // المعايير المستخدمة:
  // - widthRatio: نسبة عرض التاج إلى قطر الأفاتار (1.05 = 105% من الأفاتار)
  // - anchorY: نسبة دخول التاج في الأفاتار (0.15 = 15% من ارتفاع التاج المرئي)
  // - autoAnchor: حساب الشفافية تلقائياً = true دائماً للدقة
  // - xAdjustPx, yAdjustPx: ضبط نهائي يدوي (0 في معظم الحالات)
  //
  // تصنيف التيجان حسب الشكل:
  // 🔹 قاعدة مستقيمة: anchorY منخفض (0.10-0.14)
  // 🔸 قاعدة قوسية خفيفة: anchorY متوسط (0.14-0.18)
  // 🔶 قاعدة قوسية عميقة: anchorY عالي (0.18-0.22)
  
  1:  { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: 0, anchorY: 0.15, autoAnchor: true }, // تاج كلاسيكي - قوس متوسط
  2:  { widthRatio: 1.12, xAdjustPx: 0, yAdjustPx: 0, anchorY: 0.16, autoAnchor: true }, // تاج ملكي - قوس عميق
  3:  { widthRatio: 1.08, xAdjustPx: 0, yAdjustPx: 0, anchorY: 0.14, autoAnchor: true }, // تاج رفيع - قوس خفيف
  4:  { widthRatio: 1.14, xAdjustPx: 0, yAdjustPx: 0, anchorY: 0.18, autoAnchor: true }, // تاج فخم - قوس عميق
  5:  { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: 0, anchorY: 0.15, autoAnchor: true }, // تاج أنيق - قوس متوسط
  6:  { widthRatio: 1.15, xAdjustPx: 0, yAdjustPx: 0, anchorY: 0.20, autoAnchor: true }, // تاج إمبراطوري - قوس عميق جداً
  7:  { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: 0, anchorY: 0.16, autoAnchor: true }, // تاج ذهبي - قوس متوسط
  8:  { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: 0, anchorY: 0.15, autoAnchor: true }, // تاج نبيل - قوس متوسط
  9:  { widthRatio: 1.13, xAdjustPx: 0, yAdjustPx: 0, anchorY: 0.17, autoAnchor: true }, // تاج راقي - قوس عميق
  10: { widthRatio: 1.07, xAdjustPx: 0, yAdjustPx: 0, anchorY: 0.13, autoAnchor: true }, // تاج بسيط - قوس خفيف
  11: { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: 0, anchorY: 0.14, autoAnchor: true }, // تاج عصري - قوس خفيف
  12: { widthRatio: 1.12, xAdjustPx: 0, yAdjustPx: 0, anchorY: 0.16, autoAnchor: true }, // تاج ملكي ثاني - قوس عميق
};

export function getTagLayout(tagNumber?: number): TagLayout {
  if (!tagNumber) return DEFAULT_TAG_LAYOUT;
  return TAG_LAYOUTS[tagNumber] ?? DEFAULT_TAG_LAYOUT;
}
