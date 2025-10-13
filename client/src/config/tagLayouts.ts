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

  // ===== ضبط يدوي دقيق لكل تاج معروف التصميم (1-12 وفق التحليل) =====
  // ملاحظة: anchorY يحدد مقدار دخول قاعدة التاج داخل الصورة (0 = يلامس فقط، 0.5 = نصف التاج داخل الصورة)
  const override = (n: number, layout: Partial<TagLayout>) => {
    map[n] = { ...map[n], ...layout } as TagLayout;
  };

  // tag1: كلاسيكي بسيط — زيادة دخول القاعدة وضبط الحجم
  override(1,  { widthRatio: 1.10, yAdjustPx: -1, anchorY: 0.35 });
  // tag2: ملكي أنيق
  override(2,  { widthRatio: 1.10, yAdjustPx: -3, anchorY: 0.28 });
  // tag3: رفيع بسيط
  override(3,  { widthRatio: 1.06, yAdjustPx: -1, anchorY: 0.25 });
  // tag4: مزخرف (قاعدة عريضة)
  override(4,  { widthRatio: 1.12, yAdjustPx: -3, anchorY: 0.40 });
  // tag5: ناعم متوسط
  override(5,  { widthRatio: 1.10, yAdjustPx: -2, anchorY: 0.35 });
  // tag6: ملكي ثقيل (حزام عريض)
  override(6,  { widthRatio: 1.10, yAdjustPx: -4, anchorY: 0.50 });
  // tag7: متوسط — إنزال بسيط وزيادة دخول القاعدة
  override(7,  { widthRatio: 1.11, yAdjustPx: -1, anchorY: 0.36 });
  // tag8: بسيط — كان مرتفعاً قليلاً، خفّضناه بدرجة خفيفة
  override(8,  { widthRatio: 1.10, yAdjustPx: 1, anchorY: 0.36 });
  // tag9: مزخرف
  override(9,  { widthRatio: 1.12, yAdjustPx: -3, anchorY: 0.38 });
  // tag10: صغير — كان مرتفعاً بشكل ملحوظ، زيد الإنزال أكثر
  override(10, { widthRatio: 1.08, yAdjustPx: 2,  anchorY: 0.40 });
  // tag11: متوسط
  override(11, { widthRatio: 1.10, yAdjustPx: -2, anchorY: 0.33 });
  // tag12: كبير/ملكي ثاني
  override(12, { widthRatio: 1.10, yAdjustPx: -3, anchorY: 0.48 });

  // ===== ضبط تدريجي لباقي التيجان (13-50) وفق فئات تصميمية عامة =====
  const applyRange = (from: number, to: number, layout: Partial<TagLayout>) => {
    for (let i = from; i <= to; i++) override(i, layout);
  };

  // 13-18: بسيط/متوسط
  applyRange(13, 18, { widthRatio: 1.10, yAdjustPx: -2, anchorY: 0.32 });
  // 19-24: متوسط مع تفاصيل أكثر
  applyRange(19, 24, { widthRatio: 1.10, yAdjustPx: -2, anchorY: 0.34 });
  // 25-30: مزخرف خفيف
  applyRange(25, 30, { widthRatio: 1.11, yAdjustPx: -2, anchorY: 0.36 });
  // 31-36: مزخرف/ملكي متوسط
  applyRange(31, 36, { widthRatio: 1.12, yAdjustPx: -3, anchorY: 0.38 });
  // 37-42: ثقيل/ملكيات أو قواعد أعرض
  applyRange(37, 42, { widthRatio: 1.12, yAdjustPx: -3, anchorY: 0.40 });
  // 43-46: متقدم/فخم
  applyRange(43, 46, { widthRatio: 1.12, yAdjustPx: -3, anchorY: 0.42 });
  // 47-50: نخبوية/إمبراطورية
  applyRange(47, 50, { widthRatio: 1.12, yAdjustPx: -3, anchorY: 0.45 });

  return map;
})();

export function getTagLayout(tagNumber?: number): TagLayout {
  if (!tagNumber) return DEFAULT_TAG_LAYOUT;
  return TAG_LAYOUTS[tagNumber] ?? DEFAULT_TAG_LAYOUT;
}
