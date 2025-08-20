/**
 * مساعدات التاريخ لقاعدة البيانات
 */

/**
 * تحويل التاريخ حسب نوع قاعدة البيانات
 */
export function formatDateForDB(
  date: Date | null,
  isPostgreSQL: boolean = true
): Date | string | null {
  if (!date) return null;

  // PostgreSQL يتعامل مع Date objects مباشرة
  if (isPostgreSQL) {
    return date;
  }

  // SQLite يحتاج string format
  return date.toISOString();
}

/**
 * إنشاء تاريخ جديد للإدراج في قاعدة البيانات
 */
export function createDBTimestamp(isPostgreSQL: boolean = true): Date | string {
  const now = new Date();
  return formatDateForDB(now, isPostgreSQL) as Date | string;
}

/**
 * تحويل timestamp من قاعدة البيانات إلى Date object
 */
export function parseDBTimestamp(timestamp: any): Date | null {
  if (!timestamp) return null;

  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'string') return new Date(timestamp);

  return null;
}
