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
  yAdjustPx: 0,        // بدون ضبط يدوي
  anchorY: 0.32,       // قيمة افتراضية، ستُتجاهل عند touchTop
  autoAnchor: true,    // يزيل الشفافية السفلية تلقائياً
};

// 🎯 إعدادات مخصصة لكل تاج (فقط التيجان التي تحتاج ضبط خاص)
// نظام مبسّط: لا توجد استثناءات لكل تاج.
// كل التيجان تستخدم نفس القالب وتعتمد على حساب الشفافية السفلية تلقائياً.
export const TAG_LAYOUTS: Record<number, TagLayout> = {} as Record<number, TagLayout>;

export function getTagLayout(_tagNumber?: number): TagLayout {
  return DEFAULT_TAG_LAYOUT;
}
