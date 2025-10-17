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

  // Overrides per-tag based on deep analysis (tools/tag-layouts-recommendations.json)
  // anchorY here is a fraction of the final displayed width (basePx),
  // matching the logic in ProfileImage.tsx (TagOverlay).
  const set = (n: number, layout: Partial<TagLayout>) => {
    map[n] = { ...map[n], ...layout } as TagLayout;
  };

  // 1–10
  set(1,  { anchorY: 0.00 });
  set(2,  { anchorY: 0.093 });
  set(3,  { anchorY: 0.084 });
  set(4,  { anchorY: 0.032 });
  set(5,  { anchorY: 0.067 });
  set(6,  { anchorY: 0.059 });
  set(7,  { anchorY: 0.025 });
  set(8,  { anchorY: 0.00 });
  set(9,  { anchorY: 0.119 });
  set(10, { anchorY: 0.00 });

  // 11–20
  set(11, { anchorY: 0.093 });
  set(12, { anchorY: 0.00 });
  set(13, { anchorY: 0.00 });
  set(14, { anchorY: 0.076 });
  set(15, { anchorY: 0.090 });
  set(16, { anchorY: 0.039 });
  set(17, { anchorY: 0.006 });
  set(18, { anchorY: 0.115 });
  set(19, { anchorY: 0.00 });
  set(20, { anchorY: 0.070 });

  // 21–34
  set(21, { anchorY: 0.00 });
  set(22, { anchorY: 0.00 });
  set(23, { anchorY: 0.00 });
  set(24, { anchorY: 0.00 });
  set(25, { anchorY: 0.00 });
  set(26, { anchorY: 0.00 });
  set(27, { anchorY: 0.00 });
  set(28, { anchorY: 0.00 });
  set(29, { anchorY: 0.00 });
  set(30, { anchorY: 0.00 });
  set(31, { anchorY: 0.00 });
  set(32, { anchorY: 0.00 });
  set(33, { anchorY: 0.00 });
  set(34, { anchorY: 0.00 });

  return map;
})();

export function getTagLayout(tagNumber?: number): TagLayout {
  if (!tagNumber) return DEFAULT_TAG_LAYOUT;
  return TAG_LAYOUTS[tagNumber] ?? DEFAULT_TAG_LAYOUT;
}
