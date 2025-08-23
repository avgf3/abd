/**
 * آلية إعادة المحاولة لرفع الملفات مع معالجة أخطاء محسنة
 */

interface UploadOptions {
  maxRetries?: number;
  timeout?: number;
  onProgress?: (progress: number) => void;
  onRetry?: (attempt: number, error: Error) => void;
}

interface UploadResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * رفع ملف مع إعادة المحاولة التلقائية عند الفشل
 */
export async function uploadWithRetry(
  url: string,
  formData: FormData,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    maxRetries = 3,
    timeout = 60000,
    onProgress,
    onRetry
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // إذا كان هناك callback للتقدم، نستخدم XMLHttpRequest
      if (onProgress) {
        return await uploadWithXHR(url, formData, timeout, onProgress);
      }

      // خلاف ذلك، نستخدم fetch مع AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        credentials: 'include',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return { success: true, data };

    } catch (error: any) {
      lastError = error;
      
      // تسجيل الخطأ
      console.error(`Upload attempt ${attempt} failed:`, error);

      // إشعار callback إعادة المحاولة
      if (onRetry && attempt < maxRetries) {
        onRetry(attempt, error);
      }

      // إذا كانت آخر محاولة، نخرج من الحلقة
      if (attempt === maxRetries) {
        break;
      }

      // حساب وقت الانتظار التصاعدي
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // إرجاع الخطأ النهائي
  return {
    success: false,
    error: lastError?.message || 'فشل رفع الملف بعد عدة محاولات'
  };
}

/**
 * رفع ملف باستخدام XMLHttpRequest مع دعم progress
 */
function uploadWithXHR(
  url: string,
  formData: FormData,
  timeout: number,
  onProgress: (progress: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // معالج التقدم
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    // معالج النجاح
    xhr.addEventListener('load', () => {
      try {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          if (data.error) {
            resolve({ success: false, error: data.error });
          } else {
            resolve({ success: true, data });
          }
        } else {
          resolve({
            success: false,
            error: `خطأ في الخادم: ${xhr.status} ${xhr.statusText}`
          });
        }
      } catch (error) {
        resolve({
          success: false,
          error: 'خطأ في معالجة الاستجابة'
        });
      }
    });

    // معالج الخطأ
    xhr.addEventListener('error', () => {
      resolve({
        success: false,
        error: 'خطأ في الشبكة أو الخادم'
      });
    });

    // معالج الإلغاء
    xhr.addEventListener('abort', () => {
      resolve({
        success: false,
        error: 'تم إلغاء عملية الرفع'
      });
    });

    // معالج timeout
    xhr.addEventListener('timeout', () => {
      resolve({
        success: false,
        error: 'انتهت مهلة الرفع'
      });
    });

    // إعداد الطلب
    xhr.open('POST', url, true);
    xhr.timeout = timeout;
    xhr.withCredentials = true;

    // إضافة headers مخصصة
    const deviceId = localStorage.getItem('deviceId') || 'web-unknown';
    xhr.setRequestHeader('x-device-id', deviceId);

    // إرسال الطلب
    xhr.send(formData);
  });
}

/**
 * التحقق من حالة الشبكة قبل الرفع
 */
export function isNetworkAvailable(): boolean {
  return navigator.onLine;
}

/**
 * انتظار عودة الاتصال بالشبكة
 */
export function waitForNetwork(timeout: number = 30000): Promise<boolean> {
  if (isNetworkAvailable()) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkNetwork = () => {
      if (isNetworkAvailable()) {
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        resolve(false);
      } else {
        setTimeout(checkNetwork, 1000);
      }
    };

    // الاستماع لحدث عودة الشبكة
    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      resolve(true);
    };

    window.addEventListener('online', handleOnline);
    checkNetwork();
  });
}

/**
 * معالج ذكي للرفع مع التحقق من الشبكة
 */
export async function smartUpload(
  url: string,
  formData: FormData,
  options: UploadOptions = {}
): Promise<UploadResult> {
  // التحقق من الشبكة أولاً
  if (!isNetworkAvailable()) {
    console.log('لا يوجد اتصال بالشبكة، في انتظار عودة الاتصال...');
    const networkRestored = await waitForNetwork(30000);
    
    if (!networkRestored) {
      return {
        success: false,
        error: 'لا يوجد اتصال بالإنترنت'
      };
    }
  }

  // محاولة الرفع مع إعادة المحاولة
  return uploadWithRetry(url, formData, options);
}