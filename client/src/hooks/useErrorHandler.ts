import { useCallback } from 'react';

import { useToast } from './use-toast';

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
  timestamp?: string;
}

// رسائل الأخطاء المحلية
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'مشكلة في الاتصال بالإنترنت',
  TIMEOUT: 'انتهت مهلة الطلب',
  UNAUTHORIZED: 'يجب تسجيل الدخول أولاً',
  FORBIDDEN: 'ليس لديك صلاحية لتنفيذ هذا الإجراء',
  NOT_FOUND: 'المحتوى المطلوب غير موجود',
  VALIDATION_ERROR: 'بيانات غير صحيحة',
  SERVER_ERROR: 'خطأ في الخادم',
  SERVICE_UNAVAILABLE: 'الخدمة غير متاحة حالياً',
  DEFAULT: 'حدث خطأ غير متوقع',
};

export function useErrorHandler() {
  const { toast } = useToast();

  const handleError = useCallback(
    (error: ApiError | Error, customMessage?: string) => {
      console.error('خطأ في التطبيق:', error);

      let errorMessage = customMessage;
      let errorTitle = 'خطأ';

      if (!customMessage) {
        const apiError = error as ApiError;

        // تحديد الرسالة بناءً على نوع الخطأ
        if (apiError.code) {
          switch (apiError.code) {
            case 'NETWORK_ERROR':
              errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
              errorTitle = 'مشكلة في الاتصال';
              break;
            case 'TIMEOUT':
              errorMessage = ERROR_MESSAGES.TIMEOUT;
              errorTitle = 'انتهت المهلة';
              break;
            case 'UNAUTHORIZED':
              errorMessage = ERROR_MESSAGES.UNAUTHORIZED;
              errorTitle = 'غير مصرح';
              break;
            case 'FORBIDDEN':
              errorMessage = ERROR_MESSAGES.FORBIDDEN;
              errorTitle = 'غير مسموح';
              break;
            case 'NOT_FOUND':
              errorMessage = ERROR_MESSAGES.NOT_FOUND;
              errorTitle = 'غير موجود';
              break;
            case 'VALIDATION_ERROR':
              errorMessage = ERROR_MESSAGES.VALIDATION_ERROR;
              errorTitle = 'بيانات خاطئة';
              break;
            default:
              errorMessage = apiError.message || ERROR_MESSAGES.DEFAULT;
          }
        } else if (apiError.status) {
          // تحديد الرسالة بناءً على رمز الحالة
          switch (apiError.status) {
            case 0:
              errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
              errorTitle = 'مشكلة في الاتصال';
              break;
            case 401:
              errorMessage = ERROR_MESSAGES.UNAUTHORIZED;
              errorTitle = 'غير مصرح';
              break;
            case 403:
              errorMessage = ERROR_MESSAGES.FORBIDDEN;
              errorTitle = 'غير مسموح';
              break;
            case 404:
              errorMessage = ERROR_MESSAGES.NOT_FOUND;
              errorTitle = 'غير موجود';
              break;
            case 408:
              errorMessage = ERROR_MESSAGES.TIMEOUT;
              errorTitle = 'انتهت المهلة';
              break;
            case 422:
              errorMessage = ERROR_MESSAGES.VALIDATION_ERROR;
              errorTitle = 'بيانات خاطئة';
              break;
            case 500:
              errorMessage = ERROR_MESSAGES.SERVER_ERROR;
              errorTitle = 'خطأ في الخادم';
              break;
            case 503:
              errorMessage = ERROR_MESSAGES.SERVICE_UNAVAILABLE;
              errorTitle = 'خدمة غير متاحة';
              break;
            default:
              errorMessage = apiError.message || ERROR_MESSAGES.DEFAULT;
          }
        } else {
          errorMessage = error.message || ERROR_MESSAGES.DEFAULT;
        }
      }

      // عرض الخطأ للمستخدم
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
      });
    },
    [toast]
  );

  const handleSuccess = useCallback(
    (message: string, title?: string) => {
      toast({
        title: title || 'نجح',
        description: message,
        variant: 'default',
      });
    },
    [toast]
  );

  const handleWarning = useCallback(
    (message: string, title?: string) => {
      toast({
        title: title || 'تحذير',
        description: message,
        variant: 'default',
      });
    },
    [toast]
  );

  const handleInfo = useCallback(
    (message: string, title?: string) => {
      toast({
        title: title || 'معلومة',
        description: message,
        variant: 'default',
      });
    },
    [toast]
  );

  return {
    handleError,
    handleSuccess,
    handleWarning,
    handleInfo,
  };
}
