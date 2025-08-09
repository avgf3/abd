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
  // المستويات الموسعة - نظام الألماس
  { level: 11, title: "فارس الألماس", color: "#f8fafc", requiredPoints: 4000 },
  { level: 12, title: "محارب الألماس", color: "#f1f5f9", requiredPoints: 5000 },
  { level: 13, title: "قائد الألماس", color: "#e2e8f0", requiredPoints: 6500 },
  { level: 14, title: "نبيل الألماس", color: "#cbd5e1", requiredPoints: 8000 },
  { level: 15, title: "أمير الألماس", color: "#94a3b8", requiredPoints: 10000 },
  { level: 16, title: "دوق الألماس", color: "#64748b", requiredPoints: 12500 },
  { level: 17, title: "ملك الألماس", color: "#475569", requiredPoints: 15000 },
  { level: 18, title: "إمبراطور الألماس", color: "#334155", requiredPoints: 18000 },
  { level: 19, title: "أسطورة الألماس", color: "#1e293b", requiredPoints: 22000 },
  { level: 20, title: "إله الألماس", color: "#0f172a", requiredPoints: 27000 },
  // المستويات الزمردية
  { level: 21, title: "فارس الزمرد", color: "#10b981", requiredPoints: 33000 },
  { level: 22, title: "محارب الزمرد", color: "#059669", requiredPoints: 40000 },
  { level: 23, title: "قائد الزمرد", color: "#047857", requiredPoints: 48000 },
  { level: 24, title: "نبيل الزمرد", color: "#065f46", requiredPoints: 57000 },
  { level: 25, title: "أمير الزمرد", color: "#064e3b", requiredPoints: 67000 },
  { level: 26, title: "دوق الزمرد", color: "#022c22", requiredPoints: 78000 },
  { level: 27, title: "ملك الزمرد", color: "#14532d", requiredPoints: 90000 },
  { level: 28, title: "إمبراطور الزمرد", color: "#166534", requiredPoints: 104000 },
  { level: 29, title: "أسطورة الزمرد", color: "#15803d", requiredPoints: 120000 },
  { level: 30, title: "إله الزمرد", color: "#16a34a", requiredPoints: 138000 },
  // المستويات النارية
  { level: 31, title: "فارس النار", color: "#f97316", requiredPoints: 158000 },
  { level: 32, title: "محارب النار", color: "#ea580c", requiredPoints: 180000 },
  { level: 33, title: "قائد النار", color: "#dc2626", requiredPoints: 204000 },
  { level: 34, title: "نبيل النار", color: "#b91c1c", requiredPoints: 230000 },
  { level: 35, title: "أمير النار", color: "#991b1b", requiredPoints: 258000 },
  { level: 36, title: "دوق النار", color: "#7f1d1d", requiredPoints: 288000 },
  { level: 37, title: "ملك النار", color: "#450a0a", requiredPoints: 320000 },
  { level: 38, title: "إمبراطور النار", color: "#7c2d12", requiredPoints: 354000 },
  { level: 39, title: "أسطورة النار", color: "#9a3412", requiredPoints: 390000 },
  { level: 40, title: "إله النار", color: "#c2410c", requiredPoints: 428000 },
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

// تم حذف دالة getLevelIcon - الآن نستخدم UserRoleBadge للأيقونات

// دالة الحصول على لون المستوى
export function getLevelColor(level: number): string {
  const levelInfo = getLevelInfo(level);
  return levelInfo.color;
}