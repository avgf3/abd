export type TagLayout = {
  widthRatio: number;        // نسبة عرض التاج إلى قطر الصورة
  xAdjustPx: number;         // إزاحة أفقية إضافية (px)
  yAdjustPx: number;         // إزاحة عمودية إضافية (px)
  anchorY?: number;          // نسبة من ارتفاع التاج لإزاحة نقطة الارتكاز العمودية (0 = أسفل التاج)
  autoAnchor?: boolean;      // حساب الهامش الشفاف تلقائياً من صورة التاج (Canvas)
};

export const DEFAULT_TAG_LAYOUT: TagLayout = {
  widthRatio: 1.10,
  xAdjustPx: 0,
  // تقليل الرفع الافتراضي قليلاً لمنع قصّ أعلى التاج في بعض السياقات
  yAdjustPx: -6,
  // خفض نقطة الارتكاز الافتراضية حتى لا يتوغل التاج داخل الصورة
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
  // - xAdjustPx, yAdjustPx: ضبط نهائي يدوي (-8 للرفع قليلاً)
  //
  // تصنيف التيجان حسب الشكل:
  // 🔹 قاعدة مستقيمة: anchorY منخفض (0.10-0.14) - تيجان بسيطة
  // 🔸 قاعدة قوسية خفيفة: anchorY متوسط (0.14-0.18) - تيجان كلاسيكية
  // 🔶 قاعدة قوسية عميقة: anchorY عالي (0.18-0.22) - تيجان فخمة
  
  // ===== التيجان الرئيسية (1-12) =====
  1:  { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.12, autoAnchor: true }, // 👑 تاج كلاسيكي - قوس متوسط، متوازن
  2:  { widthRatio: 1.13, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.14, autoAnchor: true }, // 👑 تاج ملكي - خفض التداخل
  3:  { widthRatio: 1.08, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.11, autoAnchor: true }, // 👑 تاج رفيع
  4:  { widthRatio: 1.15, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.16, autoAnchor: true }, // 👑 تاج فخم
  5:  { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.12, autoAnchor: true }, // 👑 تاج أنيق
  6:  { widthRatio: 1.16, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.17, autoAnchor: true }, // 👑 إمبراطوري
  7:  { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.13, autoAnchor: true }, // 👑 ذهبي
  8:  { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.12, autoAnchor: true }, // 👑 نبيل
  9:  { widthRatio: 1.14, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.15, autoAnchor: true }, // 👑 راقي
  10: { widthRatio: 1.07, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.10, autoAnchor: true }, // 👑 بسيط
  11: { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.11, autoAnchor: true }, // 👑 عصري
  12: { widthRatio: 1.13, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.14, autoAnchor: true }, // 👑 ملكي ثاني
  
  // ===== التيجان الإضافية (13-24) =====
  13: { widthRatio: 1.12, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.13, autoAnchor: true },
  14: { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.12, autoAnchor: true },
  15: { widthRatio: 1.14, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.15, autoAnchor: true },
  16: { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.12, autoAnchor: true },
  17: { widthRatio: 1.15, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.16, autoAnchor: true },
  18: { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.11, autoAnchor: true },
  19: { widthRatio: 1.13, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.14, autoAnchor: true },
  20: { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.13, autoAnchor: true },
  21: { widthRatio: 1.12, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.13, autoAnchor: true },
  22: { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.12, autoAnchor: true },
  23: { widthRatio: 1.14, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.15, autoAnchor: true },
  24: { widthRatio: 1.08, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.10, autoAnchor: true },
  
  // ===== التيجان المتقدمة (25-36) =====
  25: { widthRatio: 1.16, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.17, autoAnchor: true },
  26: { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.13, autoAnchor: true },
  27: { widthRatio: 1.13, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.14, autoAnchor: true },
  28: { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.11, autoAnchor: true },
  29: { widthRatio: 1.15, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.16, autoAnchor: true },
  30: { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.12, autoAnchor: true },
  31: { widthRatio: 1.12, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.13, autoAnchor: true },
  32: { widthRatio: 1.14, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.15, autoAnchor: true },
  33: { widthRatio: 1.08, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.10, autoAnchor: true },
  34: { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.12, autoAnchor: true },
  35: { widthRatio: 1.13, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.14, autoAnchor: true },
  36: { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.11, autoAnchor: true },
  
  // ===== التيجان النخبوية (37-50) =====
  37: { widthRatio: 1.15, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.16, autoAnchor: true },
  38: { widthRatio: 1.12, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.13, autoAnchor: true },
  39: { widthRatio: 1.14, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.15, autoAnchor: true },
  40: { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.12, autoAnchor: true },
  41: { widthRatio: 1.16, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.17, autoAnchor: true },
  42: { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.13, autoAnchor: true },
  43: { widthRatio: 1.13, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.14, autoAnchor: true },
  44: { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.11, autoAnchor: true },
  45: { widthRatio: 1.15, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.16, autoAnchor: true },
  46: { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.12, autoAnchor: true },
  47: { widthRatio: 1.12, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.13, autoAnchor: true },
  48: { widthRatio: 1.14, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.15, autoAnchor: true },
  49: { widthRatio: 1.08, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.10, autoAnchor: true },
  50: { widthRatio: 1.17, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.18, autoAnchor: true },
};

export function getTagLayout(tagNumber?: number): TagLayout {
  if (!tagNumber) return DEFAULT_TAG_LAYOUT;
  return TAG_LAYOUTS[tagNumber] ?? DEFAULT_TAG_LAYOUT;
}
