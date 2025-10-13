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

  // ===== تصنيف التيجان حسب النوع وتطبيق القواعد =====
  const override = (n: number, layout: Partial<TagLayout>) => {
    map[n] = { ...map[n], ...layout } as TagLayout;
  };

  // 🌙 التيجان المنحنية - مطابقة انحناء الرأس بالضبط
  const curvedCrowns = [1, 2, 4, 6, 8, 9, 11, 12];
  curvedCrowns.forEach(n => {
    override(n, { widthRatio: 1.10, yAdjustPx: -2, anchorY: 0.05 });
  });

  // 📏 التيجان المستقيمة - دخول 8% بالضبط في الصورة  
  const straightCrowns = [3, 5, 7, 10];
  straightCrowns.forEach(n => {
    override(n, { widthRatio: 1.10, yAdjustPx: 0, anchorY: 0.08 });
  });

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
