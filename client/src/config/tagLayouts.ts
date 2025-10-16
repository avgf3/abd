export type TagLayout = {
  widthRatio: number;        // نسبة عرض التاج إلى قطر الصورة (1.0 = نفس عرض الصورة)
  xAdjustPx: number;         // إزاحة أفقية إضافية (px)
  yAdjustPx: number;         // إزاحة عمودية إضافية - موجب = للأسفل، سالب = للأعلى (px)
  anchorY?: number;          // مقدار دخول التاج في الصورة (0.3 = 30% من ارتفاع التاج يدخل)
  autoAnchor?: boolean;      // حساب الشفافية السفلية تلقائياً لرفع التاج
};

// 👑 القالب الموحد البسيط: كل التيجان تتبع نفس المنطق
// هذا يجعل التيجان تبدو مثل "عصبة الرأس" الطبيعية
export const DEFAULT_TAG_LAYOUT: TagLayout = {
  widthRatio: 1.10,    // التاج أعرض قليلاً من الصورة (10%)
  xAdjustPx: 0,        // في المنتصف
  yAdjustPx: 0,        // بدون ضبط يدوي — الثبات أولاً
  anchorY: 0.10,       // 10% دخول افتراضي ليلامس التاج الرأس بشكل واضح
  autoAnchor: true,    // يزيل الشفافية السفلية تلقائياً
};

// 🎯 إعدادات مخصصة لكل تاج (فقط التيجان التي تحتاج ضبط خاص)
export const TAG_LAYOUTS: Record<number, TagLayout> = (() => {
  const map: Record<number, TagLayout> = {};

  // ملء كل التيجان بالقالب الافتراضي أولاً
  for (let i = 1; i <= 50; i++) {
    map[i] = { ...DEFAULT_TAG_LAYOUT };
  }

  return map;
})();

export function getTagLayout(tagNumber?: number): TagLayout {
  if (!tagNumber) return DEFAULT_TAG_LAYOUT;
  return TAG_LAYOUTS[tagNumber] ?? DEFAULT_TAG_LAYOUT;
}
