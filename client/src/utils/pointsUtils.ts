// إعادة تصدير من الملف المشترك لتجنب التكرار
export { 
  calculateLevel, 
  calculateLevelProgress, 
  getLevelInfo, 
  getPointsToNextLevel,
  DEFAULT_LEVELS as LEVELS,
  type PointsAction
} from '../../../shared/points-system';

import { getLevelInfo as _getLevelInfo } from '../../../shared/points-system';

// دوال مساعدة خاصة بالعميل فقط
export interface LevelInfo {
  level: number;
  title: string;
  color: string;
  requiredPoints: number;
}

// دالة تنسيق عرض النقاط
export function formatPoints(points: number): string {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}م`;
  } else if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}ك`;
  } else {
    return points.toString();
  }
}

// دالة الحصول على لون المستوى
export function getLevelColor(level: number): string {
  const levelInfo = _getLevelInfo(level);
  return levelInfo.color;
}