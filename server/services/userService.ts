import bcrypt from 'bcrypt';
import { eq, desc, and } from 'drizzle-orm';

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
        profileBackgroundColor: userData.profileBackgroundColor || '#3c0d0d',
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

  // تحديث بيانات المستخدم
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    try {
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
      return undefined;
    }
  }

  // تعيين حالة الاتصال
  async setUserOnlineStatus(id: number, isOnline: boolean): Promise<void> {
    try {
      await db
        .update(users)
        .set({
          isOnline,
          lastSeen: isOnline ? undefined : new Date(),
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

  // الحصول على جميع المستخدمين المتصلين
  async getOnlineUsers(): Promise<User[]> {
    try {
      const onlineUsers = await db
        .select()
        .from(users)
        .where(and(eq(users.isOnline, true), eq(users.isHidden, false)));

      return onlineUsers;
    } catch (error) {
      console.error('خطأ في الحصول على المستخدمين المتصلين:', error);
      return [];
    }
  }

  // الحصول على جميع المستخدمين
  async getAllUsers(): Promise<User[]> {
    try {
      const allUsers = await db.select().from(users).orderBy(desc(users.joinDate));
      return allUsers;
    } catch (error) {
      console.error('خطأ في الحصول على جميع المستخدمين:', error);
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
}

// إنشاء مثيل واحد من الخدمة
export const userService = new UserService();
