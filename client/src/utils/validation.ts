// Validation utilities for chat application

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Message validation
export const validateMessage = (message: string): ValidationResult => {
  if (!message || message.trim().length === 0) {
    return {
      isValid: false,
      error: 'الرسالة لا يمكن أن تكون فارغة'
    };
  }

  if (message.length > 1000) {
    return {
      isValid: false,
      error: 'الرسالة طويلة جداً (الحد الأقصى 1000 حرف)'
    };
  }

  return { isValid: true };
};

// Username validation
export const validateUsername = (username: string): ValidationResult => {
  if (!username || username.trim().length === 0) {
    return {
      isValid: false,
      error: 'اسم المستخدم مطلوب'
    };
  }

  if (username.length < 3) {
    return {
      isValid: false,
      error: 'اسم المستخدم قصير جداً (3 أحرف على الأقل)'
    };
  }

  if (username.length > 30) {
    return {
      isValid: false,
      error: 'اسم المستخدم طويل جداً (30 حرف كحد أقصى)'
    };
  }

  return { isValid: true };
};

// File validation
export const validateImageFile = (file: File): ValidationResult => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

  if (!file) {
    return {
      isValid: false,
      error: 'الملف مطلوب'
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'نوع الملف غير مدعوم. يُسمح فقط بـ: JPG, PNG, GIF'
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'حجم الملف كبير جداً. الحد الأقصى 5MB'
    };
  }

  return { isValid: true };
};
