import { SecurityManager } from '../auth/security';
import type { IStorage } from '../storage';
import type { InsertUser, User } from '../../shared/schema';

/**
 * خدمة المصادقة المحسنة مع الأمان
 */
export class AuthService {
  constructor(private storage: IStorage) {}

  /**
   * تسجيل دخول محسن مع التحقق الأمني
   */
  async login(username: string, password: string): Promise<{success: boolean, user?: User, error?: string}> {
    try {
      // التحقق من صحة البيانات
      const usernameValidation = SecurityManager.validateUsername(username);
      if (!usernameValidation.valid) {
        return { success: false, error: usernameValidation.error };
      }

      if (!password || password.trim().length === 0) {
        return { success: false, error: 'كلمة المرور مطلوبة' };
      }

      // البحث عن المستخدم
      const user = await this.storage.getUserByUsername(username.trim());
      if (!user) {
        return { success: false, error: 'اسم المستخدم غير صحيح' };
      }

      // التحقق من كلمة المرور
      let passwordValid = false;
      if (user.userType === 'guest') {
        // الضيوف يستخدمون مقارنة مباشرة
        passwordValid = user.password === password.trim();
      } else {
        // الأعضاء يستخدمون التشفير
        if (user.password) {
          passwordValid = await SecurityManager.verifyPassword(password.trim(), user.password);
        }
      }

      if (!passwordValid) {
        return { success: false, error: 'كلمة المرور غير صحيحة' };
      }

      // تحديث حالة الاتصال
      await this.storage.setUserOnlineStatus(user.id, true);

      // إنشاء إشعار ترحيب
      if (user.userType !== 'guest') {
        await this.storage.createNotification({
          userId: user.id,
          type: 'welcome_back',
          title: '🎉 أهلاً بعودتك',
          message: `مرحباً بك مرة أخرى ${user.username}! نسعد بعودتك إلى المنصة.`,

        });
      }

      // Add missing profileEffect property for compatibility
      const userWithEffect = { ...user, profileEffect: user.profileEffect || 'none' };
      return { success: true, user: userWithEffect };

    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error);
      return { success: false, error: 'حدث خطأ في الخادم' };
    }
  }

  /**
   * تسجيل مستخدم جديد مع التحقق الأمني
   */
  async register(userData: InsertUser): Promise<{success: boolean, user?: User, error?: string}> {
    try {
      // التحقق من صحة اسم المستخدم
      const usernameValidation = SecurityManager.validateUsername(userData.username);
      if (!usernameValidation.valid) {
        return { success: false, error: usernameValidation.error };
      }

      // التحقق من كلمة المرور للأعضاء
      if (userData.userType !== 'guest' && userData.password) {
        const passwordValidation = SecurityManager.validatePassword(userData.password);
        if (!passwordValidation.valid) {
          return { success: false, error: passwordValidation.error };
        }
      }

      // التحقق من عدم وجود المستخدم مسبقاً
      const existingUser = await this.storage.getUserByUsername(userData.username);
      if (existingUser) {
        return { success: false, error: 'اسم المستخدم موجود مسبقاً' };
      }

      // إنشاء المستخدم
      const newUser = await this.storage.createUser(userData);

      // إنشاء إشعار ترحيب
      await this.storage.createNotification({
        userId: newUser.id,
        type: 'welcome',
        title: '🌟 مرحباً بك في منصة الدردشة العربية',
        message: `أهلاً وسهلاً ${newUser.username}! نتمنى لك تجربة رائعة معنا.`,

      });

      // Add missing profileEffect property for compatibility
      const userWithEffect = { ...newUser, profileEffect: newUser.profileEffect || 'none' };
      return { success: true, user: userWithEffect };

    } catch (error) {
      console.error('خطأ في التسجيل:', error);
      return { success: false, error: 'حدث خطأ في التسجيل' };
    }
  }

  /**
   * تسجيل خروج آمن
   */
  async logout(userId: number): Promise<{success: boolean, error?: string}> {
    try {
      await this.storage.setUserOnlineStatus(userId, false);
      return { success: true };
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
      return { success: false, error: 'حدث خطأ في تسجيل الخروج' };
    }
  }

  /**
   * التحقق من الصلاحيات
   */
  hasPermission(user: User, action: string): boolean {
    return SecurityManager.hasPermission(user.userType, action);
  }

  /**
   * التحقق من صحة الجلسة
   */
  isSessionValid(user: User): boolean {
    if (!user.lastSeen) return false;
    return SecurityManager.isSessionValid(user.lastSeen);
  }
}