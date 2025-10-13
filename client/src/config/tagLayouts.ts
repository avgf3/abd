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

  // 👑 إعدادات التيجان المُحسَّنة - تحليل عميق ومواضع مثالية
  const override = (n: number, layout: Partial<TagLayout>) => {
    map[n] = { ...map[n], ...layout } as TagLayout;
  };

  // تاج 1: كلاسيكي (منحني - مطابقة الرأس)
  override(1, { widthRatio: 1.10, yAdjustPx: 1, anchorY: 0.200 });

  // تاج 2: ملكي أنيق (منحني - مطابقة الرأس)
  override(2, { widthRatio: 1.10, yAdjustPx: 1, anchorY: 0.150 });

  // تاج 3: رفيع بسيط (مستقيم - دخول واضح)
  override(3, { widthRatio: 1.10, yAdjustPx: 5, anchorY: 0.250 });

  // تاج 4: مزخرف عريض (منحني - مطابقة الرأس)
  override(4, { widthRatio: 1.10, yAdjustPx: 1, anchorY: 0.150 });

  // تاج 5: ناعم متوسط (مستقيم - دخول واضح)
  override(5, { widthRatio: 1.10, yAdjustPx: 5, anchorY: 0.250 });

  // تاج 6: ملكي ثقيل (منحني - مطابقة الرأس)
  override(6, { widthRatio: 1.10, yAdjustPx: 1, anchorY: 0.130 });

  // تاج 7: متوسط عادي (مستقيم - دخول واضح)
  override(7, { widthRatio: 1.10, yAdjustPx: 5, anchorY: 0.270 });

  // تاج 8: بسيط منحني (منحني - مطابقة الرأس)
  override(8, { widthRatio: 1.10, yAdjustPx: 1, anchorY: 0.180 });

  // تاج 9: مزخرف متقن (منحني - مطابقة الرأس)
  override(9, { widthRatio: 1.10, yAdjustPx: 1, anchorY: 0.150 });

  // تاج 10: صغير مدمج (مستقيم - دخول واضح)
  override(10, { widthRatio: 1.10, yAdjustPx: 5, anchorY: 0.280 });

  // تاج 11: متقدم أنيق (منحني - مطابقة الرأس)
  override(11, { widthRatio: 1.10, yAdjustPx: 1, anchorY: 0.180 });

  // تاج 12: إمبراطوري فخم (منحني - مطابقة الرأس)
  override(12, { widthRatio: 1.10, yAdjustPx: 1, anchorY: 0.110 });

  return map;
})();

export function getTagLayout(tagNumber?: number): TagLayout {
  if (!tagNumber) return DEFAULT_TAG_LAYOUT;
  return TAG_LAYOUTS[tagNumber] ?? DEFAULT_TAG_LAYOUT;
}
