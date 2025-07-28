interface UploadOptions {
  onProgress?: (progress: number) => void;
  timeout?: number;
}

interface UploadResult {
  success: boolean;
  imageUrl?: string;
  bannerUrl?: string;
  error?: string;
}

// رفع الصورة الشخصية
export async function uploadProfileImage(
  file: File, 
  userId: number, 
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { onProgress, timeout = 60000 } = options;

  try {
    const formData = new FormData();
    formData.append('profileImage', file);
    formData.append('userId', userId.toString());

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      // معالجة التقدم
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });
      }

      // معالجة الاستجابة
      xhr.addEventListener('load', () => {
        try {
          const response = JSON.parse(xhr.responseText);
          if (xhr.status === 200 && response.success) {
            resolve(response);
          } else {
            resolve({
              success: false,
              error: response.error || `خطأ في الخادم: ${xhr.status}`
            });
          }
        } catch (error) {
          resolve({
            success: false,
            error: 'خطأ في تحليل الاستجابة'
          });
        }
      });

      // معالجة الأخطاء
      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: 'خطأ في الشبكة'
        });
      });

      // معالجة انتهاء الوقت
      xhr.addEventListener('timeout', () => {
        resolve({
          success: false,
          error: 'انتهت مهلة الرفع'
        });
      });

      // إعداد الطلب
      xhr.timeout = timeout;
      xhr.open('POST', '/api/upload/profile-image');
      xhr.send(formData);
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}

// رفع صورة الغلاف
export async function uploadProfileBanner(
  file: File, 
  userId: number, 
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { onProgress, timeout = 60000 } = options;

  try {
    const formData = new FormData();
    formData.append('banner', file);
    formData.append('userId', userId.toString());

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      // معالجة التقدم
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });
      }

      // معالجة الاستجابة
      xhr.addEventListener('load', () => {
        try {
          const response = JSON.parse(xhr.responseText);
          if (xhr.status === 200 && response.success) {
            resolve(response);
          } else {
            resolve({
              success: false,
              error: response.error || `خطأ في الخادم: ${xhr.status}`
            });
          }
        } catch (error) {
          resolve({
            success: false,
            error: 'خطأ في تحليل الاستجابة'
          });
        }
      });

      // معالجة الأخطاء
      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: 'خطأ في الشبكة'
        });
      });

      // معالجة انتهاء الوقت
      xhr.addEventListener('timeout', () => {
        resolve({
          success: false,
          error: 'انتهت مهلة الرفع'
        });
      });

      // إعداد الطلب
      xhr.timeout = timeout;
      xhr.open('POST', '/api/upload/profile-banner');
      xhr.send(formData);
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}