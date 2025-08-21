/**
 * إدارة مركزية لمعرف الجهاز
 * يحل مشكلة تكرار كود deviceId في عدة ملفات
 */

import { getDeviceId } from './settingsManager';

/**
 * @deprecated استخدم getDeviceId() من settingsManager بدلاً من ذلك
 * هذه الدالة محفوظة للتوافق مع الإصدارات القديمة
 */
export function createDeviceId(): string {
  return getDeviceId();
}

/**
 * الحصول على معرف الجهاز مع headers للطلبات
 */
export function getDeviceHeaders(): Record<string, string> {
  const deviceId = getDeviceId();
  return {
    'x-device-id': deviceId,
  };
}

/**
 * إنشاء كائن auth للـ Socket.IO
 */
export function getSocketAuth() {
  const deviceId = getDeviceId();
  return {
    deviceId,
  };
}

/**
 * إنشاء extraHeaders للـ Socket.IO
 */
export function getSocketHeaders(): Record<string, string> {
  return getDeviceHeaders();
}