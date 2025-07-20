// نظام النقاط والمستويات - مساعدات العميل
export interface LevelInfo {
  level: number;
  title: string;
  color: string;
  requiredPoints: number;
}

// مستويات النظام (نفس البيانات من الخادم)
export const LEVELS: LevelInfo[] = [
  { level: 1, title: "مبتدئ", color: "#8B4513", requiredPoints: 0 },
  { level: 2, title: "عضو نشط", color: "#CD853F", requiredPoints: 50 },
  { level: 3, title: "عضو متميز", color: "#DAA520", requiredPoints: 150 },
  { level: 4, title: "عضو خبير", color: "#FFD700", requiredPoints: 300 },
  { level: 5, title: "عضو محترف", color: "#FF8C00", requiredPoints: 500 },
  { level: 6, title: "خبير متقدم", color: "#FF6347", requiredPoints: 750 },
  { level: 7, title: "خبير النخبة", color: "#DC143C", requiredPoints: 1000 },
  { level: 8, title: "أسطورة", color: "#8A2BE2", requiredPoints: 1500 },
  { level: 9, title: "أسطورة النخبة", color: "#4B0082", requiredPoints: 2000 },
  { level: 10, title: "إمبراطور", color: "#000080", requiredPoints: 3000 },
];

// دالة الحصول على معلومات المستوى
export function getLevelInfo(level: number): LevelInfo {
  return LEVELS.find(l => l.level === level) || LEVELS[0];
}

// دالة حساب المستوى من النقاط
export function calculateLevel(totalPoints: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalPoints >= LEVELS[i].requiredPoints) {
      return LEVELS[i].level;
    }
  }
  return 1;
}

// دالة حساب تقدم المستوى
export function calculateLevelProgress(totalPoints: number): number {
  const currentLevel = calculateLevel(totalPoints);
  const currentLevelData = LEVELS.find(l => l.level === currentLevel);
  const nextLevelData = LEVELS.find(l => l.level === currentLevel + 1);
  
  if (!currentLevelData || !nextLevelData) {
    return 100; // إذا كان في المستوى الأخير
  }
  
  const pointsInCurrentLevel = totalPoints - currentLevelData.requiredPoints;
  const pointsNeededForNextLevel = nextLevelData.requiredPoints - currentLevelData.requiredPoints;
  
  return Math.min(100, Math.floor((pointsInCurrentLevel / pointsNeededForNextLevel) * 100));
}

// دالة حساب النقاط المطلوبة للمستوى التالي
export function getPointsToNextLevel(totalPoints: number): number {
  const currentLevel = calculateLevel(totalPoints);
  const nextLevelData = LEVELS.find(l => l.level === currentLevel + 1);
  
  if (!nextLevelData) {
    return 0; // إذا كان في المستوى الأخير
  }
  
  return nextLevelData.requiredPoints - totalPoints;
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

// دالة الحصول على أيقونة المستوى
export function getLevelIcon(level: number): string {
  if (level >= 10) return "👑"; // إمبراطور
  if (level >= 8) return "⭐"; // أسطورة
  if (level >= 6) return "💎"; // خبير متقدم
  if (level >= 4) return "🏆"; // عضو خبير
  if (level >= 2) return "🌟"; // عضو نشط
  return "🔰"; // مبتدئ
}

// دالة الحصول على لون المستوى
export function getLevelColor(level: number): string {
  const levelInfo = getLevelInfo(level);
  return levelInfo.color;
}