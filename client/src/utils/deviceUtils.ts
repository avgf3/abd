/**
 * دوال مساعدة لإدارة معرف الجهاز
 */

/**
 * الحصول على معرف الجهاز أو إنشاؤه إذا لم يكن موجوداً
 * @returns معرف الجهاز الفريد
 */
export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem('deviceId');
    if (existing) {
      return existing;
    }
    
    // إنشاء معرف جديد
    const id = 'web-' + Math.random().toString(36).slice(2);
    localStorage.setItem('deviceId', id);
    return id;
  } catch (error) {
    console.warn('تعذر الوصول إلى localStorage، سيتم استخدام معرف مؤقت:', error);
    // إنشاء معرف مؤقت في حالة عدم توفر localStorage
    return 'web-temp-' + Math.random().toString(36).slice(2);
  }
}

/**
 * إعادة تعيين معرف الجهاز (إنشاء معرف جديد)
 * @returns معرف الجهاز الجديد
 */
export function resetDeviceId(): string {
  try {
    const id = 'web-' + Math.random().toString(36).slice(2);
    localStorage.setItem('deviceId', id);
    return id;
  } catch (error) {
    console.warn('تعذر إعادة تعيين معرف الجهاز:', error);
    return 'web-temp-' + Math.random().toString(36).slice(2);
  }
}

/**
 * التحقق من صحة معرف الجهاز
 * @param deviceId - معرف الجهاز للتحقق منه
 * @returns true إذا كان المعرف صحيحاً
 */
export function isValidDeviceId(deviceId: string): boolean {
  return typeof deviceId === 'string' && 
         deviceId.length > 0 && 
         (deviceId.startsWith('web-') || deviceId.startsWith('web-temp-'));
}