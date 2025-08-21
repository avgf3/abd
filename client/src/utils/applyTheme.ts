/**
 * @deprecated استخدم settingsManager.applyTheme() بدلاً من ذلك
 * هذه الدالة محفوظة للتوافق مع الإصدارات القديمة
 */
import { applyTheme } from './settingsManager';

export function applyThemeById(themeId: string, persist: boolean = false) {
  return applyTheme(themeId, persist);
}
