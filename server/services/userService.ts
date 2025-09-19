import bcrypt from 'bcrypt';
import { eq, desc, and, sql } from 'drizzle-orm';

import { users, type User, type InsertUser } from '../../shared/schema';
import { db } from '../database-adapter';

export class UserService {
  // إنشاء مستخدم جديد
  async createUser(userData: InsertUser): Promise<User> {
    try {
      // تشفير كلمة المرور إذا كانت موجودة
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }

      // تعيين القيم الافتراضية
      const userToInsert: InsertUser = {
        ...userData,
        role: userData.role || userData.userType || 'guest',
        profileBackgroundColor: userData.profileBackgroundColor || '#2a2a2a',
        usernameColor: userData.usernameColor || '#000000',
      };

      const [newUser] = await db
        .insert(users)
        .values(userToInsert as any)
        .returning();
      return newUser;
    } catch (error) {
      console.error('خطأ في إنشاء المستخدم:', error);
      throw error;
    }
  }

  // الحصول على مستخدم بالمعرف
  async getUserById(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return user;
    } catch (error) {
      console.error('خطأ في الحصول على المستخدم:', error);
      return undefined;
    }
  }

  // الحصول على مستخدم باسم المستخدم
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username.trim()))
        .limit(1);
      return user;
    } catch (error) {
      console.error('خطأ في الحصول على المستخدم باسم المستخدم:', error);
      return undefined;
    }
  }

  // تحديث بيانات المستخدم مع التحقق من الصلاحيات والبيانات
  async updateUser(id: number, updates: Partial<User>, requesterId?: number): Promise<User | undefined> {
    try {
      // التحقق من الصلاحيات إذا كان هناك طالب
      if (requesterId && requesterId !== id) {
        const hasPermission = await this.checkUserPermissions(requesterId, 'edit_profile');
        if (!hasPermission) {
          throw new Error('ليس لديك صلاحية لتعديل بيانات هذا المستخدم');
        }
      }

      // التحقق من صحة البيانات
      const validation = await this.validateUserUpdate(id, updates);
      if (!validation.isValid) {
        throw new Error(validation.error || 'بيانات غير صحيحة');
      }

      // إزالة المعرف من التحديثات
      const { id: userId, ...updateData } = updates as any;

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error('خطأ في تحديث المستخدم:', error);
      throw error;
    }
  }

  // تعيين حالة الاتصال
  async setUserOnlineStatus(id: number, isOnline: boolean): Promise<void> {
    try {
      await db
        .update(users)
        .set({
          isOnline,
          lastSeen: new Date(), // تحديث lastSeen دائماً سواء كان متصل أو غير متصل
        } as any)
        .where(eq(users.id, id));
    } catch (error) {
      console.error('خطأ في تعيين حالة الاتصال:', error);
    }
  }

  // تعيين حالة الإخفاء
  async setUserHiddenStatus(id: number, isHidden: boolean): Promise<void> {
    try {
      await db
        .update(users)
        .set({ isHidden } as any)
        .where(eq(users.id, id));
    } catch (error) {
      console.error('خطأ في تعيين حالة الإخفاء:', error);
    }
  }

  // الحصول على جميع المستخدمين المتصلين مع تحسين الأداء
  async getOnlineUsers(): Promise<User[]> {
    try {
      const onlineUsers = await db
        .select()
        .from(users)
        .where(and(eq(users.isOnline, true), eq(users.isHidden, false)))
        .orderBy(desc(users.lastSeen)); // ترتيب حسب آخر تواجد

      return onlineUsers;
    } catch (error) {
      console.error('خطأ في الحصول على المستخدمين المتصلين:', error);
      return [];
    }
  }

  // الحصول على جميع المستخدمين مع تحسين الأداء
  async getAllUsers(limit?: number, offset?: number): Promise<User[]> {
    try {
      let query = db
        .select()
        .from(users)
        .orderBy(desc(users.joinDate));

      if (limit) {
        query = query.limit(limit);
      }
      
      if (offset) {
        query = query.offset(offset);
      }

      const allUsers = await query;
      return allUsers;
    } catch (error) {
      console.error('خطأ في الحصول على جميع المستخدمين:', error);
      return [];
    }
  }

  // البحث في المستخدمين مع تحسين الأداء
  async searchUsers(searchTerm: string, limit: number = 20): Promise<User[]> {
    try {
      if (!searchTerm.trim()) {
        return [];
      }

      const searchPattern = `%${searchTerm.trim()}%`;
      
      const searchResults = await db
        .select()
        .from(users)
        .where(
          and(
            // البحث في اسم المستخدم
            sql`${users.username} ILIKE ${searchPattern}`,
            // استبعاد المستخدمين المحجوبين
            eq(users.isBlocked, false)
          )
        )
        .orderBy(desc(users.isOnline), desc(users.lastSeen))
        .limit(limit);

      return searchResults;
    } catch (error) {
      console.error('خطأ في البحث في المستخدمين:', error);
      return [];
    }
  }

  // الحصول على المستخدمين حسب البلد مع تحسين الأداء
  async getUsersByCountry(country: string, limit: number = 50): Promise<User[]> {
    try {
      const usersByCountry = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.country, country),
            eq(users.isBlocked, false)
          )
        )
        .orderBy(desc(users.isOnline), desc(users.lastSeen))
        .limit(limit);

      return usersByCountry;
    } catch (error) {
      console.error('خطأ في الحصول على المستخدمين حسب البلد:', error);
      return [];
    }
  }

  // الحصول على المستخدمين حسب المستوى مع تحسين الأداء
  async getUsersByLevel(minLevel: number, maxLevel?: number, limit: number = 50): Promise<User[]> {
    try {
      let levelCondition;
      
      if (maxLevel) {
        levelCondition = and(
          sql`${users.level} >= ${minLevel}`,
          sql`${users.level} <= ${maxLevel}`
        );
      } else {
        levelCondition = sql`${users.level} >= ${minLevel}`;
      }

      const usersByLevel = await db
        .select()
        .from(users)
        .where(
          and(
            levelCondition,
            eq(users.isBlocked, false)
          )
        )
        .orderBy(desc(users.level), desc(users.points))
        .limit(limit);

      return usersByLevel;
    } catch (error) {
      console.error('خطأ في الحصول على المستخدمين حسب المستوى:', error);
      return [];
    }
  }

  // التحقق من بيانات الاعتماد
  async verifyUserCredentials(username: string, password: string): Promise<User | null> {
    try {
      const user = await this.getUserByUsername(username);

      if (!user || !user.password) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (isPasswordValid) {
        return user;
      }

      return null;
    } catch (error) {
      console.error('خطأ في التحقق من بيانات الاعتماد:', error);
      return null;
    }
  }

  // إضافة مستخدم للقائمة المتجاهلة
  async addIgnoredUser(userId: number, ignoredUserId: number): Promise<void> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return;

      const ignoredUsers = JSON.parse(user.ignoredUsers || '[]');
      if (!ignoredUsers.includes(ignoredUserId.toString())) {
        ignoredUsers.push(ignoredUserId.toString());

        await db
          .update(users)
          .set({ ignoredUsers: JSON.stringify(ignoredUsers) } as any)
          .where(eq(users.id, userId));
      }
    } catch (error) {
      console.error('خطأ في إضافة مستخدم للقائمة المتجاهلة:', error);
    }
  }

  // إزالة مستخدم من القائمة المتجاهلة
  async removeIgnoredUser(userId: number, ignoredUserId: number): Promise<void> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return;

      const ignoredUsers = JSON.parse(user.ignoredUsers || '[]').filter(
        (id: string) => id !== ignoredUserId.toString()
      );

      await db
        .update(users)
        .set({ ignoredUsers: JSON.stringify(ignoredUsers) } as any)
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('خطأ في إزالة مستخدم من القائمة المتجاهلة:', error);
    }
  }

  // الحصول على قائمة المستخدمين المتجاهلين
  async getIgnoredUsers(userId: number): Promise<number[]> {
    try {
      const user = await this.getUserById(userId);
      if (!user || !user.ignoredUsers) return [];

      const ignoredArray = JSON.parse(user.ignoredUsers);
      return ignoredArray.map((id: string) => parseInt(id));
    } catch (error) {
      console.error('خطأ في الحصول على قائمة المستخدمين المتجاهلين:', error);
      return [];
    }
  }

  // التحقق من صلاحيات المستخدم
  async checkUserPermissions(userId: number, action: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return false;

      switch (action) {
        case 'upload_profile_image':
          return user.userType !== 'guest';
          
        case 'upload_profile_banner':
          return ['owner', 'admin', 'moderator'].includes(user.userType) || (user.level || 1) >= 20;
          
        case 'edit_profile':
          return user.userType !== 'guest';
          
        case 'send_points':
          return user.userType !== 'guest' && (user.points || 0) > 0;
          
        case 'moderate_users':
          return ['owner', 'admin', 'moderator'].includes(user.userType);
          
        case 'manage_rooms':
          return ['owner', 'admin'].includes(user.userType);
          
        case 'view_admin_panel':
          return ['owner', 'admin'].includes(user.userType);
          
        default:
          return false;
      }
    } catch (error) {
      console.error('خطأ في التحقق من الصلاحيات:', error);
      return false;
    }
  }

  // التحقق من صحة البيانات قبل التحديث
  async validateUserUpdate(userId: number, updates: Partial<User>): Promise<{ isValid: boolean; error?: string }> {
    try {
      // التحقق من وجود المستخدم
      const user = await this.getUserById(userId);
      if (!user) {
        return { isValid: false, error: 'المستخدم غير موجود' };
      }

      // التحقق من اسم المستخدم
      if (updates.username) {
        if (!updates.username.trim() || updates.username.length < 2) {
          return { isValid: false, error: 'اسم المستخدم يجب أن يكون على الأقل حرفين' };
        }
        
        if (updates.username.length > 50) {
          return { isValid: false, error: 'اسم المستخدم طويل جداً' };
        }

        // التحقق من عدم تكرار اسم المستخدم
        const existingUser = await this.getUserByUsername(updates.username);
        if (existingUser && existingUser.id !== userId) {
          return { isValid: false, error: 'اسم المستخدم مستخدم بالفعل' };
        }
      }

      // التحقق من العمر
      if (updates.age !== undefined) {
        if (updates.age < 13 || updates.age > 120) {
          return { isValid: false, error: 'العمر يجب أن يكون بين 13 و 120 سنة' };
        }
      }

      // التحقق من الجنس
      if (updates.gender) {
        if (!['ذكر', 'أنثى'].includes(updates.gender)) {
          return { isValid: false, error: 'الجنس يجب أن يكون ذكر أو أنثى' };
        }
      }

      // التحقق من البلد
      if (updates.country) {
        const validCountries = [
          'السعودية', 'الإمارات', 'الكويت', 'قطر', 'البحرين', 'عُمان',
          'الأردن', 'لبنان', 'سوريا', 'العراق', 'مصر', 'السودان',
          'ليبيا', 'تونس', 'الجزائر', 'المغرب', 'اليمن', 'الصومال',
          'جيبوتي', 'جزر القمر', 'موريتانيا', 'فلسطين', 'أخرى'
        ];
        
        if (!validCountries.includes(updates.country)) {
          return { isValid: false, error: 'البلد غير صحيح' };
        }
      }

      // التحقق من السيرة الذاتية
      if (updates.bio) {
        if (updates.bio.length > 500) {
          return { isValid: false, error: 'السيرة الذاتية يجب أن تكون أقل من 500 حرف' };
        }
      }

      return { isValid: true };
    } catch (error) {
      console.error('خطأ في التحقق من صحة البيانات:', error);
      return { isValid: false, error: 'خطأ في التحقق من البيانات' };
    }
  }
}

// إنشاء مثيل واحد من الخدمة
export const userService = new UserService();
