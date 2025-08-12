/**
 * دوال مساعدة لرفع الملفات والصور
 */

import { api } from '@/lib/queryClient';

/**
 * رفع صورة خاصة بين مستخدمين
 * @param file - ملف الصورة
 * @param senderId - معرف المرسل
 * @param receiverId - معرف المستقبل
 * @returns Promise مع نتيجة الرفع
 */
export async function uploadPrivateImage(
  file: File,
  senderId: number,
  receiverId: number
): Promise<{ success: boolean; imageUrl?: string; message?: any; error?: string }> {
  try {
    // فحص نوع الملف
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'يرجى اختيار ملف صورة صحيح' };
    }

    // فحص حجم الملف (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'حجم الصورة كبير جداً. الحد الأقصى 5MB' };
    }

    const form = new FormData();
    form.append('image', file);
    form.append('senderId', String(senderId));
    form.append('receiverId', String(receiverId));

    const response = await api.upload<{ success: boolean; imageUrl: string; message?: any }>(
      '/api/upload/message-image',
      form,
      { timeout: 60000 }
    );

    return {
      success: true,
      imageUrl: response?.imageUrl,
      message: response?.message
    };
  } catch (error) {
    console.error('فشل رفع الصورة:', error);
    return { success: false, error: 'فشل في رفع الصورة' };
  }
}

/**
 * قراءة ملف كـ base64 data URL (fallback)
 * @param file - الملف المراد قراءته
 * @returns Promise مع data URL
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl && dataUrl.startsWith('data:')) {
        resolve(dataUrl);
      } else {
        reject(new Error('فشل في قراءة الملف'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('فشل في قراءة الملف'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * معالجة رفع صورة مع fallback إلى base64
 * @param file - ملف الصورة
 * @param senderId - معرف المرسل
 * @param receiverId - معرف المستقبل (اختياري للرسائل العامة)
 * @param onSuccess - callback عند النجاح
 * @param onError - callback عند الفشل
 */
export async function handleImageUpload(
  file: File,
  senderId: number,
  receiverId?: number,
  onSuccess?: (content: string, messageType: string) => void,
  onError?: (error: string) => void
): Promise<void> {
  try {
    // فحص نوع الملف
    if (!file.type.startsWith('image/')) {
      const error = 'يرجى اختيار ملف صورة صحيح';
      onError?.(error);
      return;
    }

    // فحص حجم الملف (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      const error = 'حجم الصورة كبير جداً. الحد الأقصى 5MB';
      onError?.(error);
      return;
    }

    // محاولة رفع الصورة إلى الخادم أولاً
    if (receiverId) {
      const uploadResult = await uploadPrivateImage(file, senderId, receiverId);
      if (uploadResult.success && uploadResult.message?.content) {
        // لا حاجة لاستدعاء onSuccess لأن الخادم سيرسلها عبر socket
        return;
      }
    }

    // fallback: قراءة الصورة كـ base64
    try {
      const dataUrl = await readFileAsDataURL(file);
      onSuccess?.(dataUrl, 'image');
    } catch (base64Error) {
      console.error('فشل في قراءة الصورة كـ base64:', base64Error);
      onError?.('فشل في معالجة الصورة');
    }
  } catch (error) {
    console.error('خطأ في معالجة رفع الصورة:', error);
    onError?.('خطأ في معالجة الصورة');
  }
}

/**
 * التحقق من صحة ملف الصورة
 * @param file - الملف المراد فحصه
 * @returns رسالة خطأ أو null إذا كان الملف صحيحاً
 */
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'يرجى اختيار ملف صورة صحيح';
  }

  if (file.size > 5 * 1024 * 1024) {
    return 'حجم الصورة كبير جداً. الحد الأقصى 5MB';
  }

  return null; // الملف صحيح
}

/**
 * تنسيق رسالة ملف حسب نوعه
 * @param file - الملف
 * @param type - نوع الملف
 * @returns نص الرسالة المنسق
 */
export function formatFileMessage(file: File, type: 'image' | 'video' | 'document'): string {
  switch (type) {
    case 'video':
      return `🎥 فيديو: ${file.name}`;
    case 'document':
      return `📄 مستند: ${file.name}`;
    case 'image':
    default:
      return `🖼️ صورة: ${file.name}`;
  }
}