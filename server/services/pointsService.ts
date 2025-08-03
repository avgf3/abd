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
        throw new Error('المستخدم غير موجود');
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
    // التحقق من آخر تسجيل دخول
    const lastLogin = await storage.getUserLastDailyLogin(userId);
    const today = new Date().toDateString();
    
    if (lastLogin !== today) {
      await storage.updateUserLastDailyLogin(userId, today);
      return this.addPoints(userId, DEFAULT_POINTS_CONFIG.DAILY_LOGIN, 'DAILY_LOGIN');
    }
    
    return null; // لم يحصل على نقاط اليوم
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
      pointsToNextLevel: nextLevelInfo ? nextLevelInfo.requiredPoints - (user.totalPoints || 0) : 0
    };
  }

  // الحصول على سجل النقاط للمستخدم
  async getUserPointsHistory(userId: number, limit: number = 50) {
    return await storage.getPointsHistory(userId, limit);
  }

  // الحصول على قائمة أفضل المستخدمين
  async getLeaderboard(limit: number = 20) {
    return await storage.getTopUsersByPoints(limit);
  }

  // إعادة حساب نقاط المستخدم
  async recalculateUserPoints(userId: number): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user) return;

      // حساب عدد الرسائل
      const messageCount = await storage.getUserMessageCount(userId);
      
      // حساب النقاط بناء على النشاط
      const calculatedPoints = messageCount * DEFAULT_POINTS_CONFIG.MESSAGE_SENT;
      
      // حساب المستوى الجديد
      const newLevel = calculateLevel(calculatedPoints);
      const newLevelProgress = calculateLevelProgress(calculatedPoints);

      // تحديث النقاط
      await storage.updateUserPoints(userId, {
        points: calculatedPoints,
        level: newLevel,
        totalPoints: calculatedPoints,
        levelProgress: newLevelProgress
      });

      console.log(`✅ تم إعادة حساب نقاط المستخدم ${userId}: ${calculatedPoints} نقطة، المستوى ${newLevel}`);
    } catch (error) {
      console.error(`❌ خطأ في إعادة حساب نقاط المستخدم ${userId}:`, error);
    }
  }

  // التحقق من الإنجازات
  async checkAchievement(userId: number, achievementType: string): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      if (!user) return false;

      let earned = false;

      switch (achievementType) {
        case 'first_message':
          if (user.totalPoints === DEFAULT_POINTS_CONFIG.FIRST_MESSAGE) {
            earned = true;
          }
          break;
        case 'profile_complete':
          if (user.bio && user.age && user.country) {
            earned = true;
          }
          break;
        case 'friend_master':
          const friends = await storage.getFriends(userId);
          if (friends.length >= 10) {
            earned = true;
          }
          break;
        case 'message_master':
          if ((user.totalPoints || 0) >= 100) {
            earned = true;
          }
          break;
      }

      if (earned) {
        // إضافة نقاط للإنجاز
        await this.addPoints(userId, 10, `ACHIEVEMENT_${achievementType.toUpperCase()}`);
      }

      return earned;
    } catch (error) {
      console.error('خطأ في التحقق من الإنجاز:', error);
      return false;
    }
  }

  // إضافة نقاط للنشاط الأسبوعي
  async addWeeklyActivityPoints(userId: number): Promise<any> {
    return this.addPoints(userId, DEFAULT_POINTS_CONFIG.WEEKLY_ACTIVE, 'WEEKLY_ACTIVE');
  }

  // إضافة نقاط للنشاط الشهري
  async addMonthlyActivityPoints(userId: number): Promise<any> {
    return this.addPoints(userId, DEFAULT_POINTS_CONFIG.MONTHLY_ACTIVE, 'MONTHLY_ACTIVE');
  }

  // خصم نقاط (للعقوبات)
  async deductPoints(userId: number, points: number, reason: string): Promise<any> {
    return this.addPoints(userId, -Math.abs(points), reason);
  }

  // الحصول على إحصائيات النقاط
  async getPointsStats(): Promise<{
    totalUsers: number;
    totalPoints: number;
    averagePoints: number;
    topUser: any;
  }> {
    try {
      const allUsers = await storage.getAllUsers();
      const usersWithPoints = allUsers.filter(u => (u.points || 0) > 0);
      
      const totalPoints = usersWithPoints.reduce((sum, user) => sum + (user.points || 0), 0);
      const averagePoints = usersWithPoints.length > 0 ? totalPoints / usersWithPoints.length : 0;
      
      const topUser = usersWithPoints.sort((a, b) => (b.points || 0) - (a.points || 0))[0];

      return {
        totalUsers: usersWithPoints.length,
        totalPoints,
        averagePoints: Math.round(averagePoints),
        topUser
      };
    } catch (error) {
      console.error('خطأ في الحصول على إحصائيات النقاط:', error);
      return {
        totalUsers: 0,
        totalPoints: 0,
        averagePoints: 0,
        topUser: null
      };
    }
  }
}

// إنشاء instance واحد للاستخدام
export const pointsService = new PointsService();