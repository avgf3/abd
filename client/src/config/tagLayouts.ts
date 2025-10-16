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
  yAdjustPx: 1,        // ضبط يدوي خفيف للأسفل
  anchorY: 0.37,       // 37% من قاعدة التاج يدخل في الصورة (طبيعي)
  autoAnchor: true,    // يزيل الشفافية السفلية تلقائياً
};

// 🎯 إعدادات مخصصة لكل تاج (فقط التيجان التي تحتاج ضبط خاص)
export const TAG_LAYOUTS: Record<number, TagLayout> = (() => {
  const map: Record<number, TagLayout> = {};

  // ملء كل التيجان بالقالب الافتراضي أولاً
  for (let i = 1; i <= 50; i++) {
    map[i] = { ...DEFAULT_TAG_LAYOUT };
  }

  // دالة مساعدة للتعديل السريع
  const override = (n: number, layout: Partial<TagLayout>) => {
    map[n] = { ...map[n], ...layout } as TagLayout;
  };

  // ===== التيجان الأساسية (1-12) - ضبط دقيق بناءً على تصميم كل تاج =====
  
  // التيجان البسيطة/الخفيفة - دخول متوسط لتبدو طبيعية
  override(1,  { anchorY: 0.54, yAdjustPx: 4 });   // تاج كلاسيكي بسيط - يدخل أكثر وينزل
  override(2,  { anchorY: 0.32, yAdjustPx: 1 });   // تاج ملكي أنيق
  override(3,  { anchorY: 0.30, yAdjustPx: 1, widthRatio: 1.08 }); // تاج رفيع
  override(8,  { anchorY: 0.54, yAdjustPx: 4 });   // تاج بسيط - يدخل أكثر وينزل
  
  // التيجان المتوسطة - دخول متوسط (الافتراضي)
  override(5,  { anchorY: 0.37, yAdjustPx: 1 });   // تاج ناعم
  override(7,  { anchorY: 0.37, yAdjustPx: 1 });   // تاج متوسط
  override(11, { anchorY: 0.37, yAdjustPx: 1 });   // تاج متوسط
  
  // التيجان الثقيلة/الملكية - دخول أكبر
  override(4,  { anchorY: 0.42, yAdjustPx: 1, widthRatio: 1.12 }); // مزخرف
  override(6,  { anchorY: 0.47, yAdjustPx: 1 });   // إمبراطوري
  override(9,  { anchorY: 0.42, yAdjustPx: 1, widthRatio: 1.12 }); // مزخرف
  override(10, { anchorY: 0.42, yAdjustPx: 3 });   // تاج صغير - ينزل شوي
  override(12, { anchorY: 0.44, yAdjustPx: 2 });   // تاج كبير/ملكي

  // ===== باقي التيجان (13-50) - تصنيف حسب المستوى =====
  const applyRange = (from: number, to: number, layout: Partial<TagLayout>) => {
    for (let i = from; i <= to; i++) override(i, layout);
  };

  // 13-20: تيجان بسيطة
  applyRange(13, 20, { anchorY: 0.34, yAdjustPx: 1 });
  
  // 21-30: تيجان متوسطة - قيم مثبتة (كانت تستخدم extraProfileDownshift)
  applyRange(21, 30, { anchorY: 0.37, yAdjustPx: 11 });
  
  // 31-40: تيجان مزخرفة - قيم مثبتة (كانت تستخدم extraProfileDownshift)  
  applyRange(31, 40, { anchorY: 0.40, yAdjustPx: 11, widthRatio: 1.11 });
  
  // 41-50: تيجان ملكية/إمبراطورية
  applyRange(41, 50, { anchorY: 0.44, yAdjustPx: 1, widthRatio: 1.12 });

  return map;
})();

export function getTagLayout(tagNumber?: number): TagLayout {
  if (!tagNumber) return DEFAULT_TAG_LAYOUT;
  return TAG_LAYOUTS[tagNumber] ?? DEFAULT_TAG_LAYOUT;
}
