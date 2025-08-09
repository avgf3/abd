// نظام النقاط والمستويات - مساعدات العميل
export interface LevelInfo {
  level: number;
  title: string;
  color: string;
  requiredPoints: number;
}

// مستويات النظام (نفس البيانات من الخادم)
export const LEVELS: LevelInfo[] = [
  // المستويات الأساسية (1-10)
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
  
  // المستويات المتقدمة (11-20) - ألماسة بيضاء
  { level: 11, title: "ماسة بيضاء", color: "#F8F8FF", requiredPoints: 4000 },
  { level: 12, title: "ماسة فضية", color: "#C0C0C0", requiredPoints: 5000 },
  { level: 13, title: "ماسة لامعة", color: "#E6E6FA", requiredPoints: 6500 },
  { level: 14, title: "ماسة كريستال", color: "#F0F8FF", requiredPoints: 8000 },
  { level: 15, title: "ماسة متألقة", color: "#FFFAFA", requiredPoints: 10000 },
  { level: 16, title: "ماسة مشعة", color: "#F5F5F5", requiredPoints: 12000 },
  { level: 17, title: "ماسة سماوية", color: "#F0FFFF", requiredPoints: 15000 },
  { level: 18, title: "ماسة إلهية", color: "#FFFFFF", requiredPoints: 18000 },
  { level: 19, title: "ماسة أسطورية", color: "#F8F8FF", requiredPoints: 22000 },
  { level: 20, title: "ماسة النخبة", color: "#FFFACD", requiredPoints: 26000 },
  
  // المستويات العليا (21-30) - ألماسة خضراء
  { level: 21, title: "زمردة مبتدئة", color: "#00FF7F", requiredPoints: 30000 },
  { level: 22, title: "زمردة ناشئة", color: "#00FF00", requiredPoints: 35000 },
  { level: 23, title: "زمردة متوسطة", color: "#32CD32", requiredPoints: 40000 },
  { level: 24, title: "زمردة متقدمة", color: "#228B22", requiredPoints: 46000 },
  { level: 25, title: "زمردة خبيرة", color: "#006400", requiredPoints: 52000 },
  { level: 26, title: "زمردة محترفة", color: "#008000", requiredPoints: 60000 },
  { level: 27, title: "زمردة أسطورية", color: "#2E8B57", requiredPoints: 68000 },
  { level: 28, title: "زمردة نادرة", color: "#3CB371", requiredPoints: 77000 },
  { level: 29, title: "زمردة ملكية", color: "#20B2AA", requiredPoints: 87000 },
  { level: 30, title: "زمردة إمبراطورية", color: "#008B8B", requiredPoints: 98000 },
  
  // المستويات الأسطورية (31-40) - ألماسة برتقالية مضيئة
  { level: 31, title: "نار مقدسة", color: "#FF4500", requiredPoints: 110000 },
  { level: 32, title: "لهب إلهي", color: "#FF6347", requiredPoints: 125000 },
  { level: 33, title: "شعلة أسطورية", color: "#FF7F50", requiredPoints: 140000 },
  { level: 34, title: "جحيم متقد", color: "#FF8C00", requiredPoints: 160000 },
  { level: 35, title: "حريق سماوي", color: "#FFA500", requiredPoints: 180000 },
  { level: 36, title: "عاصفة نارية", color: "#FFB347", requiredPoints: 205000 },
  { level: 37, title: "انفجار شمسي", color: "#FFCC5C", requiredPoints: 235000 },
  { level: 38, title: "نور كوني", color: "#FFD700", requiredPoints: 270000 },
  { level: 39, title: "طاقة لامحدودة", color: "#FFDF00", requiredPoints: 310000 },
  { level: 40, title: "قوة إلهية", color: "#FFFF00", requiredPoints: 350000 },
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