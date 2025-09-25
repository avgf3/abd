import createDOMPurify from 'isomorphic-dompurify';

// إنشاء instance من DOMPurify
const DOMPurify = createDOMPurify as any;

// إعدادات التنقية الافتراضية
const defaultConfig = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span', 'a', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  RETURN_TRUSTED_TYPE: false,
  FORCE_BODY: true,
  SANITIZE_DOM: true,
  IN_PLACE: false
};

// إعدادات صارمة للرسائل
const messageConfig = {
  ...defaultConfig,
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span'],
  ALLOWED_ATTR: []
};

// إعدادات للأسماء والعناوين
const nameConfig = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true
};

/**
 * تنقية محتوى HTML من أي كود ضار
 */
export function sanitizeHTML(dirty: string, config = defaultConfig): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  try {
    // إضافة rel="noopener noreferrer" لجميع الروابط الخارجية
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('rel', 'noopener noreferrer');
        if (node.getAttribute('target') === '_blank') {
          node.setAttribute('rel', 'noopener noreferrer nofollow');
        }
      }
    });

    const clean = DOMPurify.sanitize(dirty, config);
    
    // إزالة الـ hook بعد الاستخدام
    DOMPurify.removeAllHooks();
    
    return clean;
  } catch (error) {
    console.error('Error sanitizing HTML:', error);
    return '';
  }
}

/**
 * تنقية رسائل الدردشة
 */
export function sanitizeMessage(message: string): string {
  return sanitizeHTML(message, messageConfig);
}

/**
 * تنقية أسماء المستخدمين والعناوين
 */
export function sanitizeName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // إزالة جميع HTML tags والاحتفاظ بالنص فقط
  const cleaned = sanitizeHTML(name, nameConfig as any);
  
  // إزالة أي أحرف خاصة قد تسبب مشاكل
  return cleaned
    .replace(/[<>"'&]/g, '') // إزالة أحرف HTML الخاصة
    .trim();
}

/**
 * تنقية كائن كامل من القيم
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fieldsToSanitize: (keyof T)[]
): T {
  const sanitized = { ...obj };
  
  for (const field of fieldsToSanitize) {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeName(sanitized[field] as string) as T[keyof T];
    }
  }
  
  return sanitized;
}

/**
 * التحقق من وجود محتوى ضار محتمل
 */
export function hasXSSContent(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }

  // أنماط شائعة لـ XSS
  const xssPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onerror, etc.
    /<object[^>]*>[\s\S]*?<\/object>/gi,
    /<embed[^>]*>/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    /<img[^>]+src\s*=\s*["]javascript:/gi
  ];

  return xssPatterns.some(pattern => pattern.test(content));
}

/**
 * escape HTML entities
 */
export function escapeHtml(unsafe: string): string {
  if (!unsafe || typeof unsafe !== 'string') {
    return '';
  }

  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}