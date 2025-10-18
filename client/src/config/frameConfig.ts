/**
 * إعدادات الإطارات المتقدمة
 * Advanced Frame Configuration
 */

export interface FrameSettings {
  // إعدادات الأحجام
  sizing: {
    frameWidth: number;           // عرض الإطار بالبكسل
    borderRadius: number;         // انحناء الحواف
    shadowIntensity: number;      // شدة الظل (0-1)
    glowIntensity: number;        // شدة التوهج (0-1)
  };
  
  // إعدادات الحركة والتأثيرات
  animation: {
    enabled: boolean;             // تفعيل/إلغاء الحركة
    rotationSpeed: number;        // سرعة الدوران (ثواني)
    pulseSpeed: number;          // سرعة النبض (ثواني)
    hoverEffects: boolean;       // تأثيرات التحويم
  };
  
  // إعدادات الجودة والأداء
  performance: {
    useWebP: boolean;            // استخدام صيغة WebP
    lazyLoading: boolean;        // التحميل التدريجي
    preloadFrames: number[];     // الإطارات المُحمَّلة مسبقاً
    fallbackFormats: string[];  // الصيغ البديلة
  };
  
  // إعدادات المستخدمين
  userAccess: {
    guestFrames: number[];       // الإطارات المتاحة للزوار
    memberFrames: number[];      // الإطارات المتاحة للأعضاء
    vipFrames: number[];         // الإطارات المتاحة للمميزين
    adminFrames: number[];       // الإطارات المتاحة للمشرفين
  };
}

// الإعدادات الافتراضية المُحسَّنة
export const DEFAULT_FRAME_CONFIG: FrameSettings = {
  sizing: {
    frameWidth: 8,               // حجم مناسب لجميع الشاشات
    borderRadius: 9999,          // دائري كامل
    shadowIntensity: 0.5,        // ظل متوسط
    glowIntensity: 0.6,          // توهج جميل
  },
  
  animation: {
    enabled: true,               // الحركة مفعلة افتراضياً
    rotationSpeed: 6,            // دوران هادئ (6 ثواني)
    pulseSpeed: 3.6,             // نبض لطيف
    hoverEffects: true,          // تأثيرات تفاعلية
  },
  
  performance: {
    useWebP: true,               // جودة وحجم أفضل
    lazyLoading: true,           // توفير الباندويدث
    preloadFrames: [1, 2, 3, 10], // الإطارات الشائعة
    fallbackFormats: ['webp', 'png', 'jpg', 'jpeg'],
  },
  
  userAccess: {
    guestFrames: [1, 2, 3],                    // إطارات بسيطة للزوار
    memberFrames: [1, 2, 3, 4, 5, 6, 7, 8, 9], // إطارات متنوعة للأعضاء
    vipFrames: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], // إطارات مميزة
    adminFrames: Array.from({length: 42}, (_, i) => i + 1),   // جميع الإطارات
  },
};

// إعدادات محسّنة للأداء (للأجهزة الضعيفة)
export const PERFORMANCE_FRAME_CONFIG: FrameSettings = {
  ...DEFAULT_FRAME_CONFIG,
  animation: {
    ...DEFAULT_FRAME_CONFIG.animation,
    enabled: false,              // إلغاء الحركة لتوفير الموارد
    hoverEffects: false,
  },
  performance: {
    ...DEFAULT_FRAME_CONFIG.performance,
    preloadFrames: [1],          // تحميل إطار واحد فقط
  },
};

// إعدادات للشاشات الصغيرة (الجوال)
export const MOBILE_FRAME_CONFIG: FrameSettings = {
  ...DEFAULT_FRAME_CONFIG,
  sizing: {
    ...DEFAULT_FRAME_CONFIG.sizing,
    frameWidth: 6,               // إطار أصغر للجوال
    shadowIntensity: 0.3,        // ظل أخف
  },
  animation: {
    ...DEFAULT_FRAME_CONFIG.animation,
    rotationSpeed: 8,            // حركة أبطأ
    hoverEffects: false,         // لا توجد تأثيرات تحويم في الجوال
  },
};

/**
 * الحصول على الإطارات المتاحة حسب نوع المستخدم
 */
export function getAvailableFrames(userType: string, config: FrameSettings = DEFAULT_FRAME_CONFIG): number[] {
  switch (userType) {
    case 'guest':
      return config.userAccess.guestFrames;
    case 'member':
      return [...config.userAccess.guestFrames, ...config.userAccess.memberFrames];
    case 'vip':
      return [...config.userAccess.guestFrames, ...config.userAccess.memberFrames, ...config.userAccess.vipFrames];
    case 'admin':
    case 'moderator':
      return config.userAccess.adminFrames;
    default:
      return config.userAccess.guestFrames;
  }
}

/**
 * تحسين إعدادات الإطار حسب الجهاز
 */
export function getOptimizedFrameConfig(): FrameSettings {
  // كشف نوع الجهاز
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
  
  if (isMobile) {
    return MOBILE_FRAME_CONFIG;
  }
  
  if (isLowEnd) {
    return PERFORMANCE_FRAME_CONFIG;
  }
  
  return DEFAULT_FRAME_CONFIG;
}

/**
 * إعدادات الإطارات الخاصة (للمناسبات والأحداث)
 */
export const SPECIAL_FRAMES = {
  // إطارات المناسبات
  holidays: {
    ramadan: [25, 26, 27],       // إطارات رمضانية
    eid: [28, 29, 30],           // إطارات العيد
    newYear: [31, 32, 33],       // إطارات رأس السنة
  },
  
  // إطارات الإنجازات
  achievements: {
    firstMessage: 1,              // أول رسالة
    active: 5,                    // مستخدم نشط
    popular: 10,                  // مستخدم محبوب
    veteran: 15,                  // مستخدم قديم
  },
  
  // إطارات المستويات
  levels: {
    beginner: [1, 2, 3],         // المبتدئين (مستوى 1-10)
    intermediate: [4, 5, 6, 7],  // المتوسطين (مستوى 11-25)
    advanced: [8, 9, 10, 11],    // المتقدمين (مستوى 26-50)
    expert: [12, 13, 14, 15],    // الخبراء (مستوى 51+)
  },
};