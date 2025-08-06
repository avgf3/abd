import { storage } from '../storage';
import { 
  calculateLevel, 
  calculateLevelProgress, 
  checkLevelUp, 
  DEFAULT_POINTS_CONFIG,
  DEFAULT_LEVELS
} from '../../shared/points-system';
import { notificationService } from './notificationService';

export interface PointsResult {
  success: boolean;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  newPoints: number;
  newTotalPoints: number;
  levelInfo?: any;
  error?: string;
}

export interface UserPointsData {
  points: number;
  level: number;
  totalPoints: number;
  levelProgress: number;
  levelInfo: any;
  nextLevelInfo: any;
  pointsToNext: number;
  rank?: number;
}

export class PointsService {
  // إضافة نقاط لمستخدم مع التحقق من الصحة
  async addPoints(userId: number, points: number, reason: string): Promise<PointsResult> {
    try {
      // التحقق من صحة البيانات
      if (!userId || isNaN(userId) || userId <= 0) {
        return {
          success: false,
          error: 'معرف المستخدم غير صالح',
          leveledUp: false,
          oldLevel: 0,
          newLevel: 0,
          newPoints: 0,
          newTotalPoints: 0
        };
      }

      if (isNaN(points) || points === 0) {
        return {
          success: false,
          error: 'عدد النقاط غير صالح',
          leveledUp: false,
          oldLevel: 0,
          newLevel: 0,
          newPoints: 0,
          newTotalPoints: 0
        };
      }

      if (!reason || reason.trim().length === 0) {
        return {
          success: false,
          error: 'سبب الحصول على النقاط مطلوب',
          leveledUp: false,
          oldLevel: 0,
          newLevel: 0,
          newPoints: 0,
          newTotalPoints: 0
        };
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return {
          success: false,
          error: 'المستخدم غير موجود',
          leveledUp: false,
          oldLevel: 0,
          newLevel: 0,
          newPoints: 0,
          newTotalPoints: 0
        };
      }

      const oldLevel = user.level || 1;
      const oldTotalPoints = user.totalPoints || 0;
      const newTotalPoints = Math.max(0, oldTotalPoints + points);
      const newCurrentPoints = Math.max(0, (user.points || 0) + points);

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

      // إرسال إشعار إذا تم ترقية المستوى
      if (levelUpInfo.leveledUp) {
        await notificationService.createNotification({
          userId,
          type: 'level_up',
          title: 'ترقية مستوى! 🎉',
          message: `تهانينا! وصلت للمستوى ${newLevel}`,
          data: {
            oldLevel,
            newLevel,
            levelInfo: levelUpInfo.levelInfo
          }
        });
      }

      // إرسال إشعار للنقاط الإيجابية الكبيرة
      if (points >= 50) {
        await notificationService.createNotification({
          userId,
          type: 'points_earned',
          title: 'نقاط جديدة! ⭐',
          message: `حصلت على ${points} نقطة من ${reason}`,
          data: { points, reason }
        });
      }

      return {
        success: true,
        leveledUp: levelUpInfo.leveledUp,
        oldLevel: levelUpInfo.oldLevel,
        newLevel: levelUpInfo.newLevel,
        newPoints: newCurrentPoints,
        newTotalPoints,
        levelInfo: levelUpInfo.levelInfo
      };

    } catch (error) {
      console.error('خطأ في إضافة النقاط:', error);
      return {
        success: false,
        error: 'خطأ في الخادم',
        leveledUp: false,
        oldLevel: 0,
        newLevel: 0,
        newPoints: 0,
        newTotalPoints: 0
      };
    }
  }

  // خصم نقاط من مستخدم
  async deductPoints(userId: number, points: number, reason: string): Promise<PointsResult> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return {
          success: false,
          error: 'المستخدم غير موجود',
          leveledUp: false,
          oldLevel: 0,
          newLevel: 0,
          newPoints: 0,
          newTotalPoints: 0
        };
      }

      if ((user.points || 0) < points) {
        return {
          success: false,
          error: 'النقاط غير كافية',
          leveledUp: false,
          oldLevel: user.level || 1,
          newLevel: user.level || 1,
          newPoints: user.points || 0,
          newTotalPoints: user.totalPoints || 0
        };
      }

      return this.addPoints(userId, -points, reason);
    } catch (error) {
      console.error('خطأ في خصم النقاط:', error);
      return {
        success: false,
        error: 'خطأ في الخادم',
        leveledUp: false,
        oldLevel: 0,
        newLevel: 0,
        newPoints: 0,
        newTotalPoints: 0
      };
    }
  }

  // تحويل نقاط بين المستخدمين
  async transferPoints(fromUserId: number, toUserId: number, points: number, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (fromUserId === toUserId) {
        return { success: false, error: 'لا يمكن تحويل النقاط لنفسك' };
      }

      if (points <= 0) {
        return { success: false, error: 'عدد النقاط يجب أن يكون أكبر من صفر' };
      }

      // التحقق من وجود المستخدمين
      const [fromUser, toUser] = await Promise.all([
        storage.getUser(fromUserId),
        storage.getUser(toUserId)
      ]);

      if (!fromUser) {
        return { success: false, error: 'المرسل غير موجود' };
      }

      if (!toUser) {
        return { success: false, error: 'المستقبل غير موجود' };
      }

      // خصم النقاط من المرسل
      const deductResult = await this.deductPoints(fromUserId, points, `تحويل إلى ${toUser.username}: ${reason}`);
      if (!deductResult.success) {
        return { success: false, error: deductResult.error };
      }

      // إضافة النقاط للمستقبل
      const addResult = await this.addPoints(toUserId, points, `تحويل من ${fromUser.username}: ${reason}`);
      if (!addResult.success) {
        // إرجاع النقاط للمرسل في حالة الفشل
        await this.addPoints(fromUserId, points, 'إرجاع نقاط بعد فشل التحويل');
        return { success: false, error: addResult.error };
      }

      // إرسال إشعارات
      await Promise.all([
        notificationService.createNotification({
          userId: toUserId,
          type: 'points_received',
          title: 'نقاط جديدة! 🎁',
          message: `حصلت على ${points} نقطة من ${fromUser.username}`,
          data: { points, from: fromUser.username, reason }
        }),
        notificationService.createNotification({
          userId: fromUserId,
          type: 'points_sent',
          title: 'تم التحويل ✅',
          message: `تم تحويل ${points} نقطة إلى ${toUser.username}`,
          data: { points, to: toUser.username, reason }
        })
      ]);

      return { success: true };

    } catch (error) {
      console.error('خطأ في تحويل النقاط:', error);
      return { success: false, error: 'خطأ في الخادم' };
    }
  }

  // إضافة نقاط لإرسال رسالة مع فحص التكرار
  async addMessagePoints(userId: number): Promise<PointsResult | null> {
    try {
      // فحص عدد الرسائل المرسلة اليوم لمنع التكرار المفرط
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayMessagesCount = await storage.getUserMessageCountSince(userId, today);
      
      // حد أقصى 50 رسالة في اليوم تحصل على نقاط
      if (todayMessagesCount >= 50) {
        return null;
      }

      return this.addPoints(userId, DEFAULT_POINTS_CONFIG.MESSAGE_SENT, 'إرسال رسالة');
    } catch (error) {
      console.error('خطأ في إضافة نقاط الرسالة:', error);
      return null;
    }
  }

  // إضافة نقاط تسجيل الدخول اليومي
  async addDailyLoginPoints(userId: number): Promise<PointsResult | null> {
    try {
      const lastLogin = await storage.getUserLastDailyLogin(userId);
      const today = new Date().toDateString();
      
      if (lastLogin !== today) {
        await storage.updateUserLastDailyLogin(userId, today);
        return this.addPoints(userId, DEFAULT_POINTS_CONFIG.DAILY_LOGIN, 'تسجيل دخول يومي');
      }
      
      return null;
    } catch (error) {
      console.error('خطأ في إضافة نقاط تسجيل الدخول:', error);
      return null;
    }
  }

  // إضافة نقاط إكمال الملف الشخصي
  async addProfileCompletePoints(userId: number): Promise<PointsResult | null> {
    try {
      // التحقق من عدم حصول المستخدم على هذه النقاط من قبل
      const history = await storage.getPointsHistory(userId, 100);
      const alreadyReceived = history.some(h => h.reason === 'إكمال الملف الشخصي');
      
      if (alreadyReceived) {
        return null;
      }

      return this.addPoints(userId, DEFAULT_POINTS_CONFIG.PROFILE_COMPLETE, 'إكمال الملف الشخصي');
    } catch (error) {
      console.error('خطأ في إضافة نقاط إكمال الملف:', error);
      return null;
    }
  }

  // إضافة نقاط إضافة صديق
  async addFriendPoints(userId: number): Promise<PointsResult | null> {
    try {
      return this.addPoints(userId, DEFAULT_POINTS_CONFIG.FRIEND_ADDED, 'إضافة صديق جديد');
    } catch (error) {
      console.error('خطأ في إضافة نقاط الصديق:', error);
      return null;
    }
  }

  // الحصول على معلومات النقاط والمستوى للمستخدم مع الترتيب
  async getUserPointsData(userId: number): Promise<UserPointsData | null> {
    try {
      const user = await storage.getUser(userId);
      if (!user) return null;

      const levelInfo = DEFAULT_LEVELS.find(l => l.level === (user.level || 1));
      const nextLevelInfo = DEFAULT_LEVELS.find(l => l.level === (user.level || 1) + 1);

      // حساب الترتيب
      const rank = await storage.getUserRank(userId);

      return {
        points: user.points || 0,
        level: user.level || 1,
        totalPoints: user.totalPoints || 0,
        levelProgress: user.levelProgress || 0,
        levelInfo: levelInfo || DEFAULT_LEVELS[0],
        nextLevelInfo,
        pointsToNext: nextLevelInfo ? nextLevelInfo.requiredPoints - (user.totalPoints || 0) : 0,
        rank
      };
    } catch (error) {
      console.error('خطأ في جلب معلومات النقاط:', error);
      return null;
    }
  }

  // الحصول على تاريخ النقاط للمستخدم
  async getUserPointsHistory(userId: number, limit: number = 50) {
    try {
      return storage.getPointsHistory(userId, Math.min(limit, 100));
    } catch (error) {
      console.error('خطأ في جلب تاريخ النقاط:', error);
      return [];
    }
  }

  // الحصول على لوحة الصدارة
  async getLeaderboard(limit: number = 20) {
    try {
      return storage.getTopUsersByPoints(Math.min(limit, 50));
    } catch (error) {
      console.error('خطأ في جلب لوحة الصدارة:', error);
      return [];
    }
  }

  // إعادة حساب نقاط مستخدم (للصيانة)
  async recalculateUserPoints(userId: number) {
    try {
      const user = await storage.getUser(userId);
      if (!user) return null;

      const totalPoints = user.totalPoints || 0;
      const newLevel = calculateLevel(totalPoints);
      const newLevelProgress = calculateLevelProgress(totalPoints);

      await storage.updateUserPoints(userId, {
        points: user.points || 0,
        level: newLevel,
        totalPoints,
        levelProgress: newLevelProgress
      });

      return { level: newLevel, levelProgress: newLevelProgress };
    } catch (error) {
      console.error('خطأ في إعادة حساب النقاط:', error);
      return null;
    }
  }

  // التحقق من الإنجازات
  async checkAchievement(userId: number, achievementType: string): Promise<PointsResult | null> {
    try {
      switch (achievementType) {
        case 'FIRST_MESSAGE':
          const messageCount = await storage.getUserMessageCount(userId);
          if (messageCount === 1) {
            return this.addPoints(userId, DEFAULT_POINTS_CONFIG.FIRST_MESSAGE, 'أول رسالة');
          }
          break;

        case 'FIRST_FRIEND':
          const friendCount = await storage.getUserFriendCount(userId);
          if (friendCount === 1) {
            return this.addPoints(userId, 25, 'أول صديق');
          }
          break;

        case 'ACTIVE_USER':
          const loginDays = await storage.getUserLoginDays(userId);
          if (loginDays >= 7) {
            return this.addPoints(userId, 100, 'مستخدم نشط (7 أيام)');
          }
          break;
      }
      
      return null;
    } catch (error) {
      console.error('خطأ في فحص الإنجازات:', error);
      return null;
    }
  }

  // إحصائيات النقاط (للإدارة)
  async getPointsStatistics() {
    try {
      return {
        totalPointsDistributed: await storage.getTotalPointsDistributed(),
        activeUsersToday: await storage.getActiveUsersToday(),
        topEarners: await storage.getTopEarnersThisWeek(),
        pointsDistributionByReason: await storage.getPointsDistributionByReason()
      };
    } catch (error) {
      console.error('خطأ في جلب إحصائيات النقاط:', error);
      return null;
    }
  }
}

export const pointsService = new PointsService();