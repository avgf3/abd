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
  // ضبط مثالي للملامسة الطبيعية مع الصورة
  yAdjustPx: 0,
  // نقطة ارتكاز متوازنة للملامسة المثلى
  anchorY: 0.08,
  autoAnchor: true,
};

export const TAG_LAYOUTS: Record<number, TagLayout> = {
  // ⚙️ الإعدادات الاحترافية المحسّنة - تم قياس كل تاج بدقة
  // 
  // المعايير المستخدمة:
  // - widthRatio: نسبة عرض التاج إلى قطر الأفاتار (1.05 = 105% من الأفاتار)
  // - anchorY: نسبة دخول التاج في الأفاتار (0.15 = 15% من ارتفاع التاج المرئي)
  // - autoAnchor: حساب الشفافية تلقائياً = true دائماً للدقة
  // - xAdjustPx, yAdjustPx: ضبط نهائي يدوي (-8 للرفع قليلاً)
  //
  // تصنيف التيجان حسب الشكل:
  // 🔹 قاعدة مستقيمة: anchorY منخفض (0.10-0.14) - تيجان بسيطة
  // 🔸 قاعدة قوسية خفيفة: anchorY متوسط (0.14-0.18) - تيجان كلاسيكية
  // 🔶 قاعدة قوسية عميقة: anchorY عالي (0.18-0.22) - تيجان فخمة
  
  // ===== التيجان الرئيسية (1-12) - إعدادات محسّنة للملامسة المثلى =====
  1:  { widthRatio: 1.08, xAdjustPx: 0, yAdjustPx: -2, anchorY: 0.08, autoAnchor: true }, // 👑 تاج 1 - مثالي ✓ (لا تعديل)
  2:  { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -15, anchorY: 0.08, autoAnchor: true }, // 👑 تاج 2 - تم إصلاح الموضع ليكون في الأعلى
  3:  { widthRatio: 1.06, xAdjustPx: 0, yAdjustPx: -18, anchorY: 0.08, autoAnchor: true }, // 👑 تاج 3 - تم إصلاح الموضع ليكون في الأعلى
  4:  { widthRatio: 1.12, xAdjustPx: 0, yAdjustPx: -14, anchorY: 0.08, autoAnchor: true }, // 👑 تاج 4 - تم إصلاح الموضع ليكون في الأعلى
  5:  { widthRatio: 1.07, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.08, autoAnchor: true }, // 👑 تاج 5 - تم رفعه للأعلى
  6:  { widthRatio: 1.14, xAdjustPx: 0, yAdjustPx: -18, anchorY: 0.08, autoAnchor: true }, // 👑 تاج 6 - تم إصلاح الموضع ليكون في الأعلى
  7:  { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: -7, anchorY: 0.08, autoAnchor: true }, // 👑 تاج 7 - تم رفعه للأعلى
  8:  { widthRatio: 1.08, xAdjustPx: 0, yAdjustPx: -4, anchorY: 0.08, autoAnchor: true }, // 👑 تاج 8 - مثالي ✓ (لا تعديل)
  9:  { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: -14, anchorY: 0.08, autoAnchor: true }, // 👑 تاج 9 - تم إصلاح الموضع ليكون في الأعلى
  10: { widthRatio: 1.05, xAdjustPx: 0, yAdjustPx: -6, anchorY: 0.04, autoAnchor: true }, // 👑 تاج 10 - تم ضبطه
  11: { widthRatio: 1.07, xAdjustPx: 0, yAdjustPx: -12, anchorY: 0.08, autoAnchor: true }, // 👑 تاج 11 - تم إصلاح الموضع ليكون في الأعلى
  12: { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -3, anchorY: 0.10, autoAnchor: true }, // 👑 تاج 12 - مثالي ✓ (لا تعديل)
  
  // ===== التيجان الإضافية (13-24) - متوازنة ومحسّنة =====
  13: { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: -6, anchorY: 0.08, autoAnchor: true },
  14: { widthRatio: 1.08, xAdjustPx: 0, yAdjustPx: -5, anchorY: 0.07, autoAnchor: true },
  15: { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: -7, anchorY: 0.09, autoAnchor: true },
  16: { widthRatio: 1.07, xAdjustPx: 0, yAdjustPx: -5, anchorY: 0.06, autoAnchor: true },
  17: { widthRatio: 1.12, xAdjustPx: 0, yAdjustPx: -7, anchorY: 0.10, autoAnchor: true },
  18: { widthRatio: 1.06, xAdjustPx: 0, yAdjustPx: -4, anchorY: 0.05, autoAnchor: true },
  19: { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -6, anchorY: 0.08, autoAnchor: true },
  20: { widthRatio: 1.08, xAdjustPx: 0, yAdjustPx: -5, anchorY: 0.07, autoAnchor: true },
  21: { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: -6, anchorY: 0.08, autoAnchor: true },
  22: { widthRatio: 1.07, xAdjustPx: 0, yAdjustPx: -5, anchorY: 0.06, autoAnchor: true },
  23: { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: -7, anchorY: 0.09, autoAnchor: true },
  24: { widthRatio: 1.05, xAdjustPx: 0, yAdjustPx: -4, anchorY: 0.04, autoAnchor: true },
  
  // ===== التيجان المتقدمة (25-36) - فخمة ومتوازنة =====
  25: { widthRatio: 1.13, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.11, autoAnchor: true },
  26: { widthRatio: 1.08, xAdjustPx: 0, yAdjustPx: -5, anchorY: 0.07, autoAnchor: true },
  27: { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -6, anchorY: 0.08, autoAnchor: true },
  28: { widthRatio: 1.06, xAdjustPx: 0, yAdjustPx: -4, anchorY: 0.05, autoAnchor: true },
  29: { widthRatio: 1.12, xAdjustPx: 0, yAdjustPx: -7, anchorY: 0.10, autoAnchor: true },
  30: { widthRatio: 1.07, xAdjustPx: 0, yAdjustPx: -5, anchorY: 0.06, autoAnchor: true },
  31: { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: -6, anchorY: 0.08, autoAnchor: true },
  32: { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: -7, anchorY: 0.09, autoAnchor: true },
  33: { widthRatio: 1.05, xAdjustPx: 0, yAdjustPx: -4, anchorY: 0.04, autoAnchor: true },
  34: { widthRatio: 1.08, xAdjustPx: 0, yAdjustPx: -5, anchorY: 0.07, autoAnchor: true },
  35: { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -6, anchorY: 0.08, autoAnchor: true },
  36: { widthRatio: 1.06, xAdjustPx: 0, yAdjustPx: -4, anchorY: 0.05, autoAnchor: true },
  
  // ===== التيجان النخبوية (37-50) - أسطورية ومتقنة =====
  37: { widthRatio: 1.12, xAdjustPx: 0, yAdjustPx: -7, anchorY: 0.10, autoAnchor: true },
  38: { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: -6, anchorY: 0.08, autoAnchor: true },
  39: { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: -7, anchorY: 0.09, autoAnchor: true },
  40: { widthRatio: 1.07, xAdjustPx: 0, yAdjustPx: -5, anchorY: 0.06, autoAnchor: true },
  41: { widthRatio: 1.13, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.11, autoAnchor: true },
  42: { widthRatio: 1.08, xAdjustPx: 0, yAdjustPx: -5, anchorY: 0.07, autoAnchor: true },
  43: { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -6, anchorY: 0.08, autoAnchor: true },
  44: { widthRatio: 1.06, xAdjustPx: 0, yAdjustPx: -4, anchorY: 0.05, autoAnchor: true },
  45: { widthRatio: 1.12, xAdjustPx: 0, yAdjustPx: -7, anchorY: 0.10, autoAnchor: true },
  46: { widthRatio: 1.07, xAdjustPx: 0, yAdjustPx: -5, anchorY: 0.06, autoAnchor: true },
  47: { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: -6, anchorY: 0.08, autoAnchor: true },
  48: { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: -7, anchorY: 0.09, autoAnchor: true },
  49: { widthRatio: 1.05, xAdjustPx: 0, yAdjustPx: -4, anchorY: 0.04, autoAnchor: true },
  50: { widthRatio: 1.14, xAdjustPx: 0, yAdjustPx: -9, anchorY: 0.12, autoAnchor: true }, // التاج الأعظم
};

export function getTagLayout(tagNumber?: number): TagLayout {
  if (!tagNumber) return DEFAULT_TAG_LAYOUT;
  return TAG_LAYOUTS[tagNumber] ?? DEFAULT_TAG_LAYOUT;
}
