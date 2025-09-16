import bcrypt from 'bcrypt';
import { eq, desc, and } from 'drizzle-orm';

import { users, type User, type InsertUser } from '../../shared/schema';
import { db } from '../database-adapter';
import { optimizedUserService } from './optimizedUserService';

export class UserService {
  // إنشاء مستخدم جديد - محسن
  async createUser(userData: InsertUser): Promise<User> {
    return optimizedUserService.createUser(userData);
  }

  // الحصول على مستخدم بالمعرف - محسن
  async getUserById(id: number): Promise<User | undefined> {
    return optimizedUserService.getUserById(id);
  }

  // الحصول على مستخدم باسم المستخدم - محسن
  async getUserByUsername(username: string): Promise<User | undefined> {
    return optimizedUserService.getUserByUsername(username);
  }

  // تحديث بيانات المستخدم - محسن
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    return optimizedUserService.updateUser(id, updates);
  }

  // تعيين حالة الاتصال - محسن
  async setUserOnlineStatus(id: number, isOnline: boolean): Promise<void> {
    return optimizedUserService.setUserOnlineStatus(id, isOnline);
  }

  // تحديث الغرفة الحالية للمستخدم - محسن لمنع التذبذب
  async setUserCurrentRoom(id: number, currentRoom: string | null): Promise<void> {
    return optimizedUserService.setUserCurrentRoom(id, currentRoom);
  }

  // تعيين حالة الإخفاء - محسن
  async setUserHiddenStatus(id: number, isHidden: boolean): Promise<void> {
    return optimizedUserService.setUserHiddenStatus(id, isHidden);
  }

  // الحصول على جميع المستخدمين المتصلين - محسن
  async getOnlineUsers(): Promise<User[]> {
    return optimizedUserService.getOnlineUsers();
  }

  // الحصول على جميع المستخدمين - محسن
  async getAllUsers(): Promise<User[]> {
    return optimizedUserService.getAllUsers();
  }

  // التحقق من بيانات الاعتماد - محسن
  async verifyUserCredentials(username: string, password: string): Promise<User | null> {
    return optimizedUserService.verifyUserCredentials(username, password);
  }

  // تحديث آخر تواجد - محسن
  async updateLastSeen(id: number): Promise<void> {
    return optimizedUserService.updateLastSeen(id);
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

  // الحصول على تفاصيل المستخدمين المتجاهلين (للعرض)
  async getIgnoredUsersDetailed(userId: number): Promise<Array<{ id: number; username: string }>> {
    try {
      const ids = await this.getIgnoredUsers(userId);
      if (!Array.isArray(ids) || ids.length === 0) return [];

      const result: Array<{ id: number; username: string }> = [];
      for (const id of ids) {
        try {
          const u = await this.getUserById(id);
          if (u && (u as any).id && (u as any).username) {
            result.push({ id: (u as any).id, username: (u as any).username });
          }
        } catch {}
      }
      return result;
    } catch (error) {
      console.error('خطأ في الحصول على تفاصيل المستخدمين المتجاهلين:', error);
      return [];
    }
  }
}

// إنشاء مثيل واحد من الخدمة
export const userService = new UserService();
