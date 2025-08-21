/**
 * دالة مساعدة موحدة للتحقق من نوع الرسالة
 * تحل مشكلة عدم التناسق في فحص أنواع الرسائل
 */

import type { ChatMessage } from '@/types/chat';

/**
 * التحقق من أن الرسالة هي صورة
 * يفحص messageType أولاً، ثم يفحص المحتوى كـ fallback
 */
export function isImageMessage(message: ChatMessage | { messageType?: string; content?: string }): boolean {
  // أولاً: فحص messageType الصريح
  if (message.messageType === 'image') {
    return true;
  }
  
  // ثانياً: فحص المحتوى كـ fallback للتوافق مع الرسائل القديمة
  if (typeof message.content === 'string' && message.content.startsWith('data:image')) {
    return true;
  }
  
  // ثالثاً: فحص روابط الصور الشائعة
  if (typeof message.content === 'string') {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const lowerContent = message.content.toLowerCase();
    
    // فحص الامتدادات
    if (imageExtensions.some(ext => lowerContent.endsWith(ext))) {
      return true;
    }
    
    // فحص روابط الصور من مجلدات uploads
    if (lowerContent.includes('/uploads/') && imageExtensions.some(ext => lowerContent.includes(ext))) {
      return true;
    }
  }
  
  return false;
}

/**
 * الحصول على نوع الرسالة الصحيح
 * يكتشف نوع الرسالة من المحتوى إذا لم يكن messageType محدداً
 */
export function detectMessageType(content: string, explicitType?: string): 'text' | 'image' | 'system' {
  // إذا كان النوع محدداً صراحة، استخدمه
  if (explicitType === 'image' || explicitType === 'system') {
    return explicitType as 'image' | 'system';
  }
  
  // كشف الصور من المحتوى
  if (content.startsWith('data:image')) {
    return 'image';
  }
  
  // كشف روابط الصور
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const lowerContent = content.toLowerCase();
  if (imageExtensions.some(ext => lowerContent.endsWith(ext))) {
    return 'image';
  }
  
  // كشف رسائل النظام (تبدأ عادة بـ emoji أو كلمات محددة)
  const systemPrefixes = ['🎉', '📢', '⚠️', 'تم', 'انضم', 'غادر', 'النظام:'];
  if (systemPrefixes.some(prefix => content.startsWith(prefix))) {
    return 'system';
  }
  
  // الافتراضي هو نص عادي
  return 'text';
}

/**
 * تحويل الرسالة للتأكد من أن لديها messageType صحيح
 */
export function normalizeMessage<T extends { content: string; messageType?: string }>(message: T): T & { messageType: 'text' | 'image' | 'system' } {
  return {
    ...message,
    messageType: detectMessageType(message.content, message.messageType)
  };
}

/**
 * الحصول على معاينة مناسبة للرسالة حسب نوعها
 */
export function getMessagePreview(message: { messageType?: string; content: string }): string {
  if (isImageMessage(message)) {
    return '📷 صورة';
  }
  
  // للرسائل النصية، اقتطع النص الطويل
  const maxLength = 50;
  if (message.content.length > maxLength) {
    return message.content.substring(0, maxLength) + '...';
  }
  
  return message.content;
}

/**
 * التحقق من أن المحتوى هو رابط صورة صالح
 */
export function isValidImageUrl(url: string): boolean {
  try {
    // تحقق من أن الرابط صالح
    new URL(url);
    
    // تحقق من امتداد الصورة
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext));
  } catch {
    // إذا لم يكن رابط صالح، تحقق من data URL
    return url.startsWith('data:image');
  }
}