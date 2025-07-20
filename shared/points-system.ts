// نظام النقاط والمستويات
export interface PointsAction {
  MESSAGE_SENT: number;      // نقاط إرسال رسالة
  DAILY_LOGIN: number;       // نقاط تسجيل الدخول اليومي
  PROFILE_COMPLETE: number;  // نقاط إكمال الملف الشخصي
  FRIEND_ADDED: number;      // نقاط إضافة صديق
  FIRST_MESSAGE: number;     // نقاط أول رسالة
  WEEKLY_ACTIVE: number;     // نقاط النشاط الأسبوعي
  MONTHLY_ACTIVE: number;    // نقاط النشاط الشهري
}

// إعدادات النقاط الافتراضية
export const DEFAULT_POINTS_CONFIG: PointsAction = {
  MESSAGE_SENT: 1,
  DAILY_LOGIN: 5,
  PROFILE_COMPLETE: 10,
  FRIEND_ADDED: 3,
  FIRST_MESSAGE: 5,
  WEEKLY_ACTIVE: 20,
  MONTHLY_ACTIVE: 50,
};

// مستويات النظام الافتراضية
export const DEFAULT_LEVELS = [
  { level: 1, requiredPoints: 0, title: "مبتدئ", color: "#8B4513" },
  { level: 2, requiredPoints: 50, title: "عضو نشط", color: "#CD853F" },
  { level: 3, requiredPoints: 150, title: "عضو متميز", color: "#DAA520" },
  { level: 4, requiredPoints: 300, title: "عضو خبير", color: "#FFD700" },
  { level: 5, requiredPoints: 500, title: "عضو محترف", color: "#FF8C00" },
  { level: 6, requiredPoints: 750, title: "خبير متقدم", color: "#FF6347" },
  { level: 7, requiredPoints: 1000, title: "خبير النخبة", color: "#DC143C" },
  { level: 8, requiredPoints: 1500, title: "أسطورة", color: "#8A2BE2" },
  { level: 9, requiredPoints: 2000, title: "أسطورة النخبة", color: "#4B0082" },
  { level: 10, requiredPoints: 3000, title: "إمبراطور", color: "#000080" },
];

// دالة حساب المستوى بناء على النقاط
export function calculateLevel(totalPoints: number, levels = DEFAULT_LEVELS): number {
  let currentLevel = 1;
  
  for (const level of levels) {
    if (totalPoints >= level.requiredPoints) {
      currentLevel = level.level;
    } else {
      break;
    }
  }
  
  return currentLevel;
}

// دالة حساب تقدم المستوى
export function calculateLevelProgress(totalPoints: number, levels = DEFAULT_LEVELS): number {
  const currentLevel = calculateLevel(totalPoints, levels);
  const currentLevelData = levels.find(l => l.level === currentLevel);
  const nextLevelData = levels.find(l => l.level === currentLevel + 1);
  
  if (!currentLevelData || !nextLevelData) {
    return 100; // إذا كان في المستوى الأخير
  }
  
  const pointsInCurrentLevel = totalPoints - currentLevelData.requiredPoints;
  const pointsNeededForNextLevel = nextLevelData.requiredPoints - currentLevelData.requiredPoints;
  
  return Math.min(100, Math.floor((pointsInCurrentLevel / pointsNeededForNextLevel) * 100));
}

// دالة الحصول على معلومات المستوى
export function getLevelInfo(level: number, levels = DEFAULT_LEVELS) {
  return levels.find(l => l.level === level) || levels[0];
}

// دالة حساب النقاط المطلوبة للمستوى التالي
export function getPointsToNextLevel(totalPoints: number, levels = DEFAULT_LEVELS): number {
  const currentLevel = calculateLevel(totalPoints, levels);
  const nextLevelData = levels.find(l => l.level === currentLevel + 1);
  
  if (!nextLevelData) {
    return 0; // إذا كان في المستوى الأخير
  }
  
  return nextLevelData.requiredPoints - totalPoints;
}

// دالة التحقق من ترقية المستوى
export function checkLevelUp(oldPoints: number, newPoints: number, levels = DEFAULT_LEVELS): {
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  levelInfo?: any;
} {
  const oldLevel = calculateLevel(oldPoints, levels);
  const newLevel = calculateLevel(newPoints, levels);
  
  const leveledUp = newLevel > oldLevel;
  
  return {
    leveledUp,
    oldLevel,
    newLevel,
    levelInfo: leveledUp ? getLevelInfo(newLevel, levels) : undefined
  };
}

// دالة حساب النقاط بناء على النشاط
export function calculatePointsForAction(action: keyof PointsAction, config = DEFAULT_POINTS_CONFIG): number {
  return config[action] || 0;
}

// دالة التحقق من صحة نقاط المستخدم
export function validateUserPoints(user: { points: number; level: number; totalPoints: number; levelProgress: number }): boolean {
  const calculatedLevel = calculateLevel(user.totalPoints);
  const calculatedProgress = calculateLevelProgress(user.totalPoints);
  
  return user.level === calculatedLevel && 
         user.levelProgress === calculatedProgress && 
         user.points >= 0 && 
         user.totalPoints >= 0;
}

// دالة إعادة حساب النقاط والمستوى
export function recalculateUserStats(totalPoints: number) {
  const level = calculateLevel(totalPoints);
  const levelProgress = calculateLevelProgress(totalPoints);
  const levelInfo = getLevelInfo(level);
  const pointsToNext = getPointsToNextLevel(totalPoints);
  
  return {
    level,
    levelProgress,
    levelInfo,
    pointsToNext
  };
}