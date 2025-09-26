// إعدادات مركزية لرفع الملفات
export const UPLOAD_CONFIG = {
  // حدود الحجم بالبايت
  MAX_FILE_SIZES: {
    PROFILE_IMAGE: 5 * 1024 * 1024, // 5MB للصور الشخصية
    PROFILE_BANNER: 10 * 1024 * 1024, // 10MB لصور البانر
    CHAT_IMAGE: 5 * 1024 * 1024, // 5MB لصور الدردشة
    CHAT_VIDEO: 20 * 1024 * 1024, // 20MB لفيديوهات الدردشة
    WALL_IMAGE: 8 * 1024 * 1024, // 8MB لصور الحائط
    PROFILE_MUSIC: 3 * 1024 * 1024, // 3MB لموسيقى البروفايل (تقليل الحد بسبب قيود الخادم)
  },

  // الأنواع المسموحة
  ALLOWED_TYPES: {
    IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    VIDEOS: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'],
    AUDIO: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a', 'audio/aac'],
  },

  // رسائل الخطأ
  ERROR_MESSAGES: {
    FILE_TOO_LARGE: 'حجم الملف كبير جداً',
    INVALID_TYPE: 'نوع الملف غير مدعوم',
    UPLOAD_FAILED: 'فشل في رفع الملف',
    NETWORK_ERROR: 'خطأ في الشبكة',
    TIMEOUT: 'انتهت مهلة الرفع',
  },

  // مهل الانتظار
  TIMEOUTS: {
    IMAGE_UPLOAD: 60000, // دقيقة واحدة للصور
    VIDEO_UPLOAD: 300000, // 5 دقائق للفيديو
    DEFAULT: 30000, // 30 ثانية افتراضي
  },
};

// دالة للتحقق من صحة الملف
export function validateFile(
  file: File,
  type: 'profile_image' | 'profile_banner' | 'chat_image' | 'chat_video' | 'wall_image' | 'profile_music'
): { isValid: boolean; error?: string } {
  // التحقق من الحجم
  const maxSize =
    UPLOAD_CONFIG.MAX_FILE_SIZES[type.toUpperCase() as keyof typeof UPLOAD_CONFIG.MAX_FILE_SIZES];
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      isValid: false,
      error: `${UPLOAD_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE} (الحد الأقصى: ${maxSizeMB} ميجابايت)`,
    };
  }

  // التحقق من النوع
  const isImage = type.includes('image');
  const isVideo = type.includes('video');
  const isAudio = type.includes('music');

  if (isImage && !UPLOAD_CONFIG.ALLOWED_TYPES.IMAGES.includes(file.type)) {
    return {
      isValid: false,
      error: `${UPLOAD_CONFIG.ERROR_MESSAGES.INVALID_TYPE} (المسموح: JPG, PNG, GIF, WebP, SVG)`,
    };
  }

  if (isVideo && !UPLOAD_CONFIG.ALLOWED_TYPES.VIDEOS.includes(file.type)) {
    return {
      isValid: false,
      error: `${UPLOAD_CONFIG.ERROR_MESSAGES.INVALID_TYPE} (المسموح: MP4, AVI, MOV, WMV, WebM)`,
    };
  }

  if (isAudio && !UPLOAD_CONFIG.ALLOWED_TYPES.AUDIO.includes(file.type)) {
    return {
      isValid: false,
      error: `${UPLOAD_CONFIG.ERROR_MESSAGES.INVALID_TYPE} (المسموح: MP3, WAV, OGG, WebM, M4A, AAC)`,
    };
  }

  return { isValid: true };
}

// دالة لتنسيق حجم الملف
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 بايت';

  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// دالة للحصول على timeout مناسب
export function getUploadTimeout(type: 'image' | 'video' | 'audio'): number {
  if (type === 'video') return UPLOAD_CONFIG.TIMEOUTS.VIDEO_UPLOAD;
  if (type === 'audio') return UPLOAD_CONFIG.TIMEOUTS.IMAGE_UPLOAD; // نفس مهلة الصور
  return UPLOAD_CONFIG.TIMEOUTS.IMAGE_UPLOAD;
}

// دالة لاقتراحات تقليل حجم الملفات الصوتية
export function getAudioCompressionTips(currentSizeMB: number): string[] {
  const tips: string[] = [];
  
  if (currentSizeMB > 5) {
    tips.push('🎵 استخدم جودة أقل (128 kbps بدلاً من 320 kbps)');
    tips.push('⏱️ اقطع الملف إلى جزء أقصر (30-60 ثانية)');
  }
  
  if (currentSizeMB > 3) {
    tips.push('🔧 استخدم تطبيقات ضغط الصوت مثل Audacity');
    tips.push('📱 حول الملف إلى MP3 بدلاً من WAV');
  }
  
  tips.push('💡 جرب موقع online-audio-converter.com للضغط');
  
  return tips;
}

// دالة للتحقق من إمكانية ضغط الملف الصوتي
export function canCompressAudio(file: File): boolean {
  const compressibleTypes = ['audio/wav', 'audio/flac', 'audio/aiff'];
  return compressibleTypes.includes(file.type) || file.type.includes('uncompressed');
}
