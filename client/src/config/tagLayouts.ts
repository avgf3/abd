// هذا الملف لم يعد مستخدماً - تم تبسيط نظام التيجان بالكامل
// التيجان الآن تُوضع بشكل بسيط فوق الصورة مباشرة بدون أي معادلات معقدة

export type TagLayout = {
  // تم إزالة كل التعقيدات - لم نعد بحاجة لهذه الإعدادات
};

export const DEFAULT_TAG_LAYOUT: TagLayout = {};

export const TAG_LAYOUTS: Record<number, TagLayout> = {};

export function getTagLayout(tagNumber?: number): TagLayout {
  return DEFAULT_TAG_LAYOUT;
}
