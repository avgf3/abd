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
  // المستويات الأساسية (1-10)
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
  
  // المستويات المتقدمة (11-20) - ألماسة بيضاء
  { level: 11, requiredPoints: 4000, title: "ماسة بيضاء", color: "#F8F8FF" },
  { level: 12, requiredPoints: 5000, title: "ماسة فضية", color: "#C0C0C0" },
  { level: 13, requiredPoints: 6500, title: "ماسة لامعة", color: "#E6E6FA" },
  { level: 14, requiredPoints: 8000, title: "ماسة كريستال", color: "#F0F8FF" },
  { level: 15, requiredPoints: 10000, title: "ماسة متألقة", color: "#FFFAFA" },
  { level: 16, requiredPoints: 12000, title: "ماسة مشعة", color: "#F5F5F5" },
  { level: 17, requiredPoints: 15000, title: "ماسة سماوية", color: "#F0FFFF" },
  { level: 18, requiredPoints: 18000, title: "ماسة إلهية", color: "#FFFFFF" },
  { level: 19, requiredPoints: 22000, title: "ماسة أسطورية", color: "#F8F8FF" },
  { level: 20, requiredPoints: 26000, title: "ماسة النخبة", color: "#FFFACD" },
  
  // المستويات العليا (21-30) - ألماسة خضراء
  { level: 21, requiredPoints: 30000, title: "زمردة مبتدئة", color: "#00FF7F" },
  { level: 22, requiredPoints: 35000, title: "زمردة ناشئة", color: "#00FF00" },
  { level: 23, requiredPoints: 40000, title: "زمردة متوسطة", color: "#32CD32" },
  { level: 24, requiredPoints: 46000, title: "زمردة متقدمة", color: "#228B22" },
  { level: 25, requiredPoints: 52000, title: "زمردة خبيرة", color: "#006400" },
  { level: 26, requiredPoints: 60000, title: "زمردة محترفة", color: "#008000" },
  { level: 27, requiredPoints: 68000, title: "زمردة أسطورية", color: "#2E8B57" },
  { level: 28, requiredPoints: 77000, title: "زمردة نادرة", color: "#3CB371" },
  { level: 29, requiredPoints: 87000, title: "زمردة ملكية", color: "#20B2AA" },
  { level: 30, requiredPoints: 98000, title: "زمردة إمبراطورية", color: "#008B8B" },
  
  // المستويات الأسطورية (31-40) - ألماسة برتقالية مضيئة
  { level: 31, requiredPoints: 110000, title: "نار مقدسة", color: "#FF4500" },
  { level: 32, requiredPoints: 125000, title: "لهب إلهي", color: "#FF6347" },
  { level: 33, requiredPoints: 140000, title: "شعلة أسطورية", color: "#FF7F50" },
  { level: 34, requiredPoints: 160000, title: "جحيم متقد", color: "#FF8C00" },
  { level: 35, requiredPoints: 180000, title: "حريق سماوي", color: "#FFA500" },
  { level: 36, requiredPoints: 205000, title: "عاصفة نارية", color: "#FFB347" },
  { level: 37, requiredPoints: 235000, title: "انفجار شمسي", color: "#FFCC5C" },
  { level: 38, requiredPoints: 270000, title: "نور كوني", color: "#FFD700" },
  { level: 39, requiredPoints: 310000, title: "طاقة لامحدودة", color: "#FFDF00" },
  { level: 40, requiredPoints: 350000, title: "قوة إلهية", color: "#FFFF00" },
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