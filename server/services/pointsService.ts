import { storage } from '../storage';
import { 
  calculateLevel, 
  calculateLevelProgress, 
  checkLevelUp, 
  DEFAULT_POINTS_CONFIG,
  DEFAULT_LEVELS
} from '../../shared/points-system';

export class PointsService {
  // إضافة نقاط لمستخدم
  async addPoints(userId: number, points: number, reason: string): Promise<{ 
    leveledUp: boolean; 
    oldLevel: number; 
    newLevel: number; 
    newPoints: number; 
    newTotalPoints: number;
    levelInfo?: any;
  }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`❌ خطأ في النقاط: المستخدم ${userId} غير موجود`);
        throw new Error('المستخدم غير موجود');
      }

      // التحقق من أن المستخدم ليس ضيف (الضيوف لا يحصلون على نقاط)
      if (user.userType === 'guest') {
        console.log(`⚠️ تجاهل إضافة نقاط للضيف: ${user.username}`);
        return {
          leveledUp: false,
          oldLevel: 1,
          newLevel: 1,
          newPoints: 0,
          newTotalPoints: 0
        };
      }

      const oldTotalPoints = user.totalPoints || 0;
      const newTotalPoints = oldTotalPoints + points;
      const newCurrentPoints = (user.points || 0) + points;

      // حساب المستوى الجديد
      const newLevel = calculateLevel(newTotalPoints);
      const newLevelProgress = calculateLevelProgress(newTotalPoints);

      // التحقق من ترقية المستوى
      const levelUpInfo = checkLevelUp(oldTotalPoints, newTotalPoints);

      // تحديث بيانات المستخدم
      await storage.updateUserPoints(userId, {
        points: newCurrentPoints,
        level: newLevel,
        totalPoints: newTotalPoints,
        levelProgress: newLevelProgress
      });

      // إضافة سجل في تاريخ النقاط
      await storage.addPointsHistory(userId, points, reason, points >= 0 ? 'earn' : 'spend');

      return {
        leveledUp: levelUpInfo.leveledUp,
        oldLevel: levelUpInfo.oldLevel,
        newLevel: levelUpInfo.newLevel,
        newPoints: newCurrentPoints,
        newTotalPoints,
        levelInfo: levelUpInfo.levelInfo
      };
    } catch (error) {
      console.error('خطأ في إضافة النقاط:', error);
      throw error;
    }
  }

  // إضافة نقاط لإرسال رسالة
  async addMessagePoints(userId: number): Promise<any> {
    return this.addPoints(userId, DEFAULT_POINTS_CONFIG.MESSAGE_SENT, 'MESSAGE_SENT');
  }

  // إضافة نقاط تسجيل الدخول اليومي
  async addDailyLoginPoints(userId: number): Promise<any> {
    try {
      console.log(`🔍 محاولة إضافة نقاط تسجيل الدخول للمستخدم ID: ${userId}`);
      
      // التحقق من وجود المستخدم أولاً
      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`❌ خطأ في نقاط تسجيل الدخول: المستخدم ${userId} غير موجود في قاعدة البيانات`);
        return null;
      }

      console.log(`✅ تم العثور على المستخدم: ${user.username} (Type: ${user.userType})`);

      // الضيوف لا يحصلون على نقاط يومية
      if (user.userType === 'guest') {
        console.log(`⚠️ تجاهل نقاط تسجيل الدخول للضيف: ${user.username}`);
        return null;
      }

      // التحقق من آخر تسجيل دخول
      const lastLogin = await storage.getUserLastDailyLogin(userId);
      const today = new Date().toDateString();
      
      if (lastLogin !== today) {
        await storage.updateUserLastDailyLogin(userId, today);
        return this.addPoints(userId, DEFAULT_POINTS_CONFIG.DAILY_LOGIN, 'DAILY_LOGIN');
      }
      
      return null; // لم يحصل على نقاط اليوم
    } catch (error) {
      console.error('خطأ في نقاط تسجيل الدخول اليومي:', error);
      return null;
    }
  }

  // إضافة نقاط إكمال الملف الشخصي
  async addProfileCompletePoints(userId: number): Promise<any> {
    return this.addPoints(userId, DEFAULT_POINTS_CONFIG.PROFILE_COMPLETE, 'PROFILE_COMPLETE');
  }

  // إضافة نقاط إضافة صديق
  async addFriendPoints(userId: number): Promise<any> {
    return this.addPoints(userId, DEFAULT_POINTS_CONFIG.FRIEND_ADDED, 'FRIEND_ADDED');
  }

  // الحصول على معلومات النقاط والمستوى للمستخدم
  async getUserPointsInfo(userId: number) {
    const user = await storage.getUser(userId);
    if (!user) return null;

    const levelInfo = DEFAULT_LEVELS.find(l => l.level === (user.level || 1));
    const nextLevelInfo = DEFAULT_LEVELS.find(l => l.level === (user.level || 1) + 1);

    return {
      points: user.points || 0,
      level: user.level || 1,
      totalPoints: user.totalPoints || 0,
      levelProgress: user.levelProgress || 0,
      levelInfo,
      nextLevelInfo,
      pointsToNext: nextLevelInfo ? nextLevelInfo.requiredPoints - (user.totalPoints || 0) : 0
    };
  }

  // الحصول على تاريخ النقاط للمستخدم
  async getUserPointsHistory(userId: number, limit: number = 50) {
    return storage.getPointsHistory(userId, limit);
  }

  // الحصول على لوحة الصدارة
  async getLeaderboard(limit: number = 20) {
    return storage.getTopUsersByPoints(limit);
  }

  // إعادة حساب نقاط مستخدم (للصيانة)
  async recalculateUserPoints(userId: number) {
    const user = await storage.getUser(userId);
    if (!user) return null;

    const totalPoints = user.totalPoints || 0;
    const newLevel = calculateLevel(totalPoints);
    const newLevelProgress = calculateLevelProgress(totalPoints);

    await storage.updateUserPoints(userId, {
      points: user.points || 0, // النقاط الحالية تبقى كما هي
      level: newLevel,
      totalPoints,
      levelProgress: newLevelProgress
    });

    return { level: newLevel, levelProgress: newLevelProgress };
  }

  // التحقق من إنجاز معين (مثل أول رسالة)
  async checkAchievement(userId: number, achievementType: string) {
    switch (achievementType) {
      case 'FIRST_MESSAGE':
        const messageCount = await storage.getUserMessageCount(userId);
        if (messageCount === 1) {
          return this.addPoints(userId, DEFAULT_POINTS_CONFIG.FIRST_MESSAGE, 'FIRST_MESSAGE');
        }
        break;
      // يمكن إضافة إنجازات أخرى هنا
    }
    return null;
  }
}

export const pointsService = new PointsService();