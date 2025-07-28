interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// تنظيف المدخلات من الرموز الضارة
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // إزالة script tags
    .replace(/javascript:/gi, '') // إزالة javascript protocols
    .replace(/on\w+\s*=/gi, '') // إزالة event handlers
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

// التحقق من صحة بيانات الملف الشخصي
export function validateProfileData(field: string, value: string): ValidationResult {
  const sanitizedValue = sanitizeInput(value);
  
  switch (field) {
    case 'username':
      if (!sanitizedValue || sanitizedValue.length < 2) {
        return { isValid: false, error: 'اسم المستخدم يجب أن يكون حرفين على الأقل' };
      }
      if (sanitizedValue.length > 50) {
        return { isValid: false, error: 'اسم المستخدم طويل جداً (50 حرف كحد أقصى)' };
      }
      if (!/^[\u0600-\u06FFa-zA-Z0-9\s_-]+$/.test(sanitizedValue)) {
        return { isValid: false, error: 'اسم المستخدم يحتوي على رموز غير مسموحة' };
      }
      break;

    case 'status':
      if (sanitizedValue.length > 200) {
        return { isValid: false, error: 'الحالة طويلة جداً (200 حرف كحد أقصى)' };
      }
      break;

    case 'bio':
      if (sanitizedValue.length > 500) {
        return { isValid: false, error: 'السيرة الذاتية طويلة جداً (500 حرف كحد أقصى)' };
      }
      break;

    case 'age':
      const age = parseInt(sanitizedValue);
      if (isNaN(age) || age < 13 || age > 120) {
        return { isValid: false, error: 'العمر يجب أن يكون بين 13 و 120 سنة' };
      }
      break;

    case 'gender':
      const validGenders = ['👨 ذكر', '👩 أنثى', 'ذكر', 'أنثى'];
      if (!validGenders.includes(sanitizedValue)) {
        return { isValid: false, error: 'الجنس المحدد غير صالح' };
      }
      break;

    case 'country':
      const validCountries = [
        '🇸🇦 السعودية', '🇦🇪 الإمارات', '🇪🇬 مصر', '🇯🇴 الأردن',
        '🇱🇧 لبنان', '🇸🇾 سوريا', '🇮🇶 العراق', '🇰🇼 الكويت',
        '🇶🇦 قطر', '🇧🇭 البحرين', '🇴🇲 عمان', '🇾🇪 اليمن',
        '🇱🇾 ليبيا', '🇹🇳 تونس', '🇩🇿 الجزائر', '🇲🇦 المغرب'
      ];
      if (sanitizedValue && !validCountries.includes(sanitizedValue)) {
        return { isValid: false, error: 'البلد المحدد غير صالح' };
      }
      break;

    case 'relation':
      const validRelations = ['💚 أعزب', '💍 متزوج', '💔 مطلق', '🖤 أرمل'];
      if (sanitizedValue && !validRelations.includes(sanitizedValue)) {
        return { isValid: false, error: 'الحالة الاجتماعية المحددة غير صالحة' };
      }
      break;
  }

  return { isValid: true };
}

// التحقق من صحة ملفات الصور
export function validateImageFile(file: File, type: 'profile' | 'banner'): ValidationResult {
  // التحقق من نوع الملف
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'نوع الملف غير مدعوم. يرجى اختيار صورة (JPG, PNG, GIF, WebP)'
    };
  }

  // التحقق من حجم الملف
  const maxSize = type === 'profile' ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB للبروفايل، 10MB للبانر
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      isValid: false,
      error: `حجم الصورة كبير جداً. الحد الأقصى ${maxSizeMB}MB`
    };
  }

  // التحقق من أن الملف ليس فارغاً
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'الملف فارغ أو تالف'
    };
  }

  return { isValid: true };
}

// التحقق من صحة عنوان البريد الإلكتروني
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    return { isValid: false, error: 'البريد الإلكتروني مطلوب' };
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'صيغة البريد الإلكتروني غير صحيحة' };
  }
  
  return { isValid: true };
}

// التحقق من صحة كلمة المرور
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'كلمة المرور مطلوبة' };
  }
  
  if (password.length < 6) {
    return { isValid: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
  }
  
  if (password.length > 100) {
    return { isValid: false, error: 'كلمة المرور طويلة جداً' };
  }
  
  return { isValid: true };
}

// التحقق من صحة النقاط المرسلة
export function validatePointsTransfer(points: number, senderPoints: number): ValidationResult {
  if (!points || points <= 0) {
    return { isValid: false, error: 'عدد النقاط يجب أن يكون أكبر من صفر' };
  }
  
  if (!Number.isInteger(points)) {
    return { isValid: false, error: 'عدد النقاط يجب أن يكون رقم صحيح' };
  }
  
  if (points > senderPoints) {
    return { isValid: false, error: 'لا تملك نقاط كافية' };
  }
  
  if (points > 10000) {
    return { isValid: false, error: 'لا يمكن إرسال أكثر من 10,000 نقطة في المرة الواحدة' };
  }
  
  return { isValid: true };
}