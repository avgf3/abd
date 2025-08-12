import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * نظام الأمان والتشفير
 */
export class SecurityManager {
  private static readonly SALT_ROUNDS = 12;
  private static readonly SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // أسبوع
  private static readonly DEV_JWT_SECRET = 'dev-secret-change-me';

  /**
   * الحصول على سر JWT مع اعتماد افتراضي في التطوير
   */
  static getJwtSecret(): string | undefined {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    if (process.env.NODE_ENV !== 'production') return this.DEV_JWT_SECRET;
    return undefined;
  }

  /**
   * إنشاء رمز مصادقة JWT
   */
  static createAuthToken(payload: { userId: number; username: string; userType: string }, expiresIn: string | number = '7d'): string {
    const secret = this.getJwtSecret();
    if (!secret) {
      throw new Error('JWT_SECRET غير محدد في متغيرات البيئة');
    }
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * تشفير كلمة المرور
   */
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * التحقق من كلمة المرور
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * التحقق من صحة اسم المستخدم
   */
  static validateUsername(username: string): { valid: boolean; error?: string } {
    if (!username || username.trim().length < 3) {
      return { valid: false, error: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' };
    }

    if (username.trim().length > 20) {
      return { valid: false, error: 'اسم المستخدم يجب ألا يزيد عن 20 حرف' };
    }

    if (!/^[\u0600-\u06FFa-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      return { valid: false, error: 'اسم المستخدم يحتوي على أحرف غير مسموحة' };
    }

    return { valid: true };
  }

  /**
   * التحقق من قوة كلمة المرور
   */
  static validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password || password.length < 6) {
      return { valid: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
    }

    if (!/\d/.test(password)) {
      return { valid: false, error: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل' };
    }

    return { valid: true };
  }

  /**
   * فحص الصلاحيات
   */
  static hasPermission(userType: string, action: string): boolean {
    const permissions = {
      guest: ['send_message', 'view_public'],
      member: ['send_message', 'view_public', 'add_friends', 'upload_image'],
      moderator: ['send_message', 'view_public', 'add_friends', 'upload_image', 'mute_users'],
      admin: ['send_message', 'view_public', 'add_friends', 'upload_image', 'mute_users', 'kick_users', 'block_users'],
      owner: ['*'] // جميع الصلاحيات
    };

    const userPermissions = permissions[userType as keyof typeof permissions] || [];
    return userPermissions.includes('*') || userPermissions.includes(action);
  }

  /**
   * فحص انتهاء الجلسة
   */
  static isSessionValid(lastActivity: Date): boolean {
    const now = new Date().getTime();
    const lastTime = new Date(lastActivity).getTime();
    return (now - lastTime) < this.SESSION_DURATION;
  }
}

/**
 * تشفير البيانات الحساسة
 */
export class DataEncryption {
  private static readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

  /**
   * تشفير النص
   */
  static encrypt(text: string): string {
    // تشفير بسيط - يُفضل استخدام مكتبة تشفير متقدمة في الإنتاج
    return Buffer.from(text).toString('base64');
  }

  /**
   * فك التشفير
   */
  static decrypt(encryptedText: string): string {
    return Buffer.from(encryptedText, 'base64').toString('utf-8');
  }
}