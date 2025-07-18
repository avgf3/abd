import { db } from '../db';
import { messages, users } from '../../shared/schema';
import { sql, eq, notInArray } from 'drizzle-orm';

export class DatabaseCleanup {
  
  /**
   * تنظيف الرسائل من مستخدمين غير موجودين
   */
  async cleanupOrphanedMessages(): Promise<number> {
    try {
      console.log('🧹 بدء تنظيف الرسائل اليتيمة...');
      
      // الحصول على جميع معرفات المستخدمين الموجودين
      const existingUsers = await db.select({ id: users.id }).from(users);
      const existingUserIds = existingUsers.map(user => user.id);
      
      if (existingUserIds.length === 0) {
        console.log('⚠️ لا توجد مستخدمين في قاعدة البيانات');
        return 0;
      }
      
      // حذف الرسائل من مستخدمين غير موجودين
      const deletedMessages = await db
        .delete(messages)
        .where(notInArray(messages.senderId, existingUserIds))
        .returning({ id: messages.id });
      
      console.log(`✅ تم حذف ${deletedMessages.length} رسالة يتيمة`);
      return deletedMessages.length;
      
    } catch (error) {
      console.error('❌ خطأ في تنظيف الرسائل اليتيمة:', error);
      return 0;
    }
  }
  
  /**
   * تنظيف الرسائل الفارغة أو غير الصالحة
   */
  async cleanupInvalidMessages(): Promise<number> {
    try {
      console.log('🧹 بدء تنظيف الرسائل غير الصالحة...');
      
      // حذف الرسائل الفارغة أو غير الصالحة
      const deletedMessages = await db
        .delete(messages)
        .where(
          sql`${messages.content} IS NULL 
              OR ${messages.content} = '' 
              OR ${messages.content} = 'مستخدم'
              OR ${messages.senderId} IS NULL
              OR ${messages.senderId} <= 0`
        )
        .returning({ id: messages.id });
      
      console.log(`✅ تم حذف ${deletedMessages.length} رسالة غير صالحة`);
      return deletedMessages.length;
      
    } catch (error) {
      console.error('❌ خطأ في تنظيف الرسائل غير الصالحة:', error);
      return 0;
    }
  }
  
  /**
   * تنظيف المستخدمين الضيوف القدامى (أكثر من 24 ساعة)
   */
  async cleanupOldGuestUsers(): Promise<number> {
    try {
      console.log('🧹 بدء تنظيف المستخدمين الضيوف القدامى...');
      
      // حذف المستخدمين الضيوف القدامى (معرف أكبر من 1000 وغير متصلين لأكثر من 24 ساعة)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const deletedUsers = await db
        .delete(users)
        .where(
          sql`${users.id} >= 1000 
              AND ${users.isOnline} = false 
              AND (${users.lastSeen} IS NULL OR ${users.lastSeen} < ${oneDayAgo})`
        )
        .returning({ id: users.id });
      
      console.log(`✅ تم حذف ${deletedUsers.length} مستخدم ضيف قديم`);
      return deletedUsers.length;
      
    } catch (error) {
      console.error('❌ خطأ في تنظيف المستخدمين الضيوف القدامى:', error);
      return 0;
    }
  }
  
  /**
   * تنظيف شامل لقاعدة البيانات
   */
  async performFullCleanup(): Promise<{
    orphanedMessages: number;
    invalidMessages: number;
    oldGuestUsers: number;
  }> {
    console.log('🧹 بدء التنظيف الشامل لقاعدة البيانات...');
    
    const results = {
      orphanedMessages: await this.cleanupOrphanedMessages(),
      invalidMessages: await this.cleanupInvalidMessages(),
      oldGuestUsers: await this.cleanupOldGuestUsers()
    };
    
    const totalCleaned = results.orphanedMessages + results.invalidMessages + results.oldGuestUsers;
    console.log(`✅ تم الانتهاء من التنظيف الشامل - تم حذف ${totalCleaned} عنصر`);
    
    return results;
  }
  
  /**
   * تشغيل التنظيف الدوري
   */
  startPeriodicCleanup(intervalHours: number = 6): NodeJS.Timeout {
    console.log(`🔄 بدء التنظيف الدوري كل ${intervalHours} ساعات`);
    
    return setInterval(async () => {
      try {
        await this.performFullCleanup();
      } catch (error) {
        console.error('❌ خطأ في التنظيف الدوري:', error);
      }
    }, intervalHours * 60 * 60 * 1000);
  }
  
  /**
   * الحصول على إحصائيات قاعدة البيانات
   */
  async getDatabaseStats(): Promise<{
    totalUsers: number;
    totalMessages: number;
    onlineUsers: number;
    guestUsers: number;
    registeredUsers: number;
  }> {
    try {
      const [totalUsersResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      
      const [totalMessagesResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages);
      
      const [onlineUsersResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.isOnline, true));
      
      const [guestUsersResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`${users.id} >= 1000`);
      
      const [registeredUsersResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`${users.id} < 1000`);
      
      return {
        totalUsers: totalUsersResult.count,
        totalMessages: totalMessagesResult.count,
        onlineUsers: onlineUsersResult.count,
        guestUsers: guestUsersResult.count,
        registeredUsers: registeredUsersResult.count
      };
      
    } catch (error) {
      console.error('❌ خطأ في الحصول على إحصائيات قاعدة البيانات:', error);
      return {
        totalUsers: 0,
        totalMessages: 0,
        onlineUsers: 0,
        guestUsers: 0,
        registeredUsers: 0
      };
    }
  }
}

// إنشاء مثيل واحد للاستخدام
export const databaseCleanup = new DatabaseCleanup();