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
  yAdjustPx: -8,
  anchorY: 0.14,
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
  1:  { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.15, autoAnchor: true }, // 👑 تاج كلاسيكي - قوس متوسط، متوازن
  2:  { widthRatio: 1.13, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.17, autoAnchor: true }, // 👑 تاج ملكي - قوس عميق، فخم
  3:  { widthRatio: 1.08, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.13, autoAnchor: true }, // 👑 تاج رفيع - قوس خفيف، أنيق
  4:  { widthRatio: 1.15, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.19, autoAnchor: true }, // 👑 تاج فخم - قوس عميق جداً، مهيب
  5:  { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.14, autoAnchor: true }, // 👑 تاج أنيق - قوس متوسط، راقي
  6:  { widthRatio: 1.16, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.20, autoAnchor: true }, // 👑 تاج إمبراطوري - قوس عميق جداً، ملكي
  7:  { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.16, autoAnchor: true }, // 👑 تاج ذهبي - قوس متوسط، لامع
  8:  { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.15, autoAnchor: true }, // 👑 تاج نبيل - قوس متوسط، كريم
  9:  { widthRatio: 1.14, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.18, autoAnchor: true }, // 👑 تاج راقي - قوس عميق، متميز
  10: { widthRatio: 1.07, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.12, autoAnchor: true }, // 👑 تاج بسيط - قوس خفيف، عصري
  11: { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.14, autoAnchor: true }, // 👑 تاج عصري - قوس خفيف، حديث
  12: { widthRatio: 1.13, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.17, autoAnchor: true }, // 👑 تاج ملكي ثاني - قوس عميق، مزدوج
  
  // ===== التيجان الإضافية (13-24) =====
  13: { widthRatio: 1.12, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.16, autoAnchor: true }, // 👑 تاج برونزي - قوس متوسط
  14: { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.15, autoAnchor: true }, // 👑 تاج فضي - قوس متوسط
  15: { widthRatio: 1.14, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.18, autoAnchor: true }, // 👑 تاج بلاتيني - قوس عميق
  16: { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.15, autoAnchor: true }, // 👑 تاج ماسي - قوس متوسط
  17: { widthRatio: 1.15, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.19, autoAnchor: true }, // 👑 تاج كريستالي - قوس عميق
  18: { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.14, autoAnchor: true }, // 👑 تاج لؤلؤي - قوس خفيف
  19: { widthRatio: 1.13, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.17, autoAnchor: true }, // 👑 تاج ياقوتي - قوس عميق
  20: { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.16, autoAnchor: true }, // 👑 تاج زمردي - قوس متوسط
  21: { widthRatio: 1.12, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.16, autoAnchor: true }, // 👑 تاج عقيقي - قوس متوسط
  22: { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.15, autoAnchor: true }, // 👑 تاج عنبري - قوس متوسط
  23: { widthRatio: 1.14, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.18, autoAnchor: true }, // 👑 تاج أوبالي - قوس عميق
  24: { widthRatio: 1.08, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.13, autoAnchor: true }, // 👑 تاج جرانيتي - قوس خفيف
  
  // ===== التيجان المتقدمة (25-36) =====
  25: { widthRatio: 1.16, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.20, autoAnchor: true }, // 👑 تاج الأساطير - قوس عميق جداً
  26: { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.16, autoAnchor: true }, // 👑 تاج الأبطال - قوس متوسط
  27: { widthRatio: 1.13, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.17, autoAnchor: true }, // 👑 تاج الشجعان - قوس عميق
  28: { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.14, autoAnchor: true }, // 👑 تاج الحكماء - قوس خفيف
  29: { widthRatio: 1.15, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.19, autoAnchor: true }, // 👑 تاج الملوك - قوس عميق جداً
  30: { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.15, autoAnchor: true }, // 👑 تاج الأمراء - قوس متوسط
  31: { widthRatio: 1.12, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.16, autoAnchor: true }, // 👑 تاج الدوقات - قوس متوسط
  32: { widthRatio: 1.14, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.18, autoAnchor: true }, // 👑 تاج الأباطرة - قوس عميق
  33: { widthRatio: 1.08, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.13, autoAnchor: true }, // 👑 تاج الفرسان - قوس خفيف
  34: { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.15, autoAnchor: true }, // 👑 تاج القادة - قوس متوسط
  35: { widthRatio: 1.13, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.17, autoAnchor: true }, // 👑 تاج الأساتذة - قوس عميق
  36: { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.14, autoAnchor: true }, // 👑 تاج الخبراء - قوس خفيف
  
  // ===== التيجان النخبوية (37-50) =====
  37: { widthRatio: 1.15, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.19, autoAnchor: true }, // 👑 تاج الأولمب - قوس عميق جداً
  38: { widthRatio: 1.12, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.16, autoAnchor: true }, // 👑 تاج الآلهة - قوس متوسط
  39: { widthRatio: 1.14, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.18, autoAnchor: true }, // 👑 تاج الأرباب - قوس عميق
  40: { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.15, autoAnchor: true }, // 👑 تاج السماء - قوس متوسط
  41: { widthRatio: 1.16, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.20, autoAnchor: true }, // 👑 تاج الكون - قوس عميق جداً
  42: { widthRatio: 1.11, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.16, autoAnchor: true }, // 👑 تاج النجوم - قوس متوسط
  43: { widthRatio: 1.13, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.17, autoAnchor: true }, // 👑 تاج القمر - قوس عميق
  44: { widthRatio: 1.09, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.14, autoAnchor: true }, // 👑 تاج الشمس - قوس خفيف
  45: { widthRatio: 1.15, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.19, autoAnchor: true }, // 👑 تاج الأبدية - قوس عميق جداً
  46: { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.15, autoAnchor: true }, // 👑 تاج الخلود - قوس متوسط
  47: { widthRatio: 1.12, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.16, autoAnchor: true }, // 👑 تاج المجد - قوس متوسط
  48: { widthRatio: 1.14, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.18, autoAnchor: true }, // 👑 تاج العظمة - قوس عميق
  49: { widthRatio: 1.08, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.13, autoAnchor: true }, // 👑 تاج الشرف - قوس خفيف
  50: { widthRatio: 1.17, xAdjustPx: 0, yAdjustPx: -8, anchorY: 0.21, autoAnchor: true }, // 👑 تاج التفوق المطلق - قوس عميق جداً
};

export function getTagLayout(tagNumber?: number): TagLayout {
  if (!tagNumber) return DEFAULT_TAG_LAYOUT;
  return TAG_LAYOUTS[tagNumber] ?? DEFAULT_TAG_LAYOUT;
}
