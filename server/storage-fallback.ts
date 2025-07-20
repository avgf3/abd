import { db } from "./database-adapter";
import { sql } from "drizzle-orm";
import type { User } from "../shared/schema";

/**
 * دوال مساعدة للتعامل مع قاعدة البيانات حتى لو كان عمود role مفقود
 */
export class DatabaseFallback {
  
  /**
   * البحث عن مستخدم باسم المستخدم مع التعامل مع العمود المفقود
   */
  static async getUserByUsername(username: string): Promise<User | null> {
    if (!db) return null;
    
    try {
      // محاولة مع جميع الأعمدة المتوقعة
      const result = await db.execute(sql`
        SELECT 
          id, username, password, user_type, 
          COALESCE(role, user_type, 'guest') as role,
          profile_image, profile_banner, 
          COALESCE(profile_background_color, '#3c0d0d') as profile_background_color,
          status, gender, age, country, relation, bio,
          is_online, is_hidden, last_seen, join_date, created_at,
          is_muted, mute_expiry, is_banned, ban_expiry, is_blocked,
          ip_address, device_id,
          COALESCE(ignored_users, '{}') as ignored_users,
          COALESCE(username_color, '#FFFFFF') as username_color,
          COALESCE(user_theme, 'default') as user_theme
        FROM users 
        WHERE username = ${username}
        LIMIT 1
      `);
      
      if (result && (result as any).length > 0) {
        return (result as any)[0] as User;
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ Database fallback error in getUserByUsername:', error);
      
      // إذا كان الخطأ بسبب عمود مفقود، جرب استعلام أبسط
      if (error.code === '42703') {
        try {
          console.log('🔄 محاولة استعلام مبسط...');
          const simpleResult = await db.execute(sql`
            SELECT id, username, password, user_type, profile_image,
                   status, gender, age, country, relation,
                   is_online, is_hidden, last_seen, join_date, created_at,
                   is_muted, mute_expiry, is_banned, ban_expiry, is_blocked
            FROM users 
            WHERE username = ${username}
            LIMIT 1
          `);
          
          if (simpleResult && (simpleResult as any).length > 0) {
            const user = (simpleResult as any)[0];
            // إضافة القيم الافتراضية للحقول المفقودة
            return {
              ...user,
              role: user.user_type || 'guest',
              profileBackgroundColor: '#3c0d0d',
              usernameColor: '#FFFFFF',
              userTheme: 'default',
              bio: user.bio || null,
              ignoredUsers: [],
              profileBanner: user.profile_banner || null
            } as User;
          }
        } catch (simpleError) {
          console.error('❌ حتى الاستعلام المبسط فشل:', simpleError);
        }
      }
      
      return null;
    }
  }

  /**
   * البحث عن مستخدم بالـ ID مع التعامل مع العمود المفقود
   */
  static async getUserById(id: number): Promise<User | null> {
    if (!db) return null;
    
    try {
      const result = await db.execute(sql`
        SELECT 
          id, username, password, user_type, 
          COALESCE(role, user_type, 'guest') as role,
          profile_image, profile_banner, 
          COALESCE(profile_background_color, '#3c0d0d') as profile_background_color,
          status, gender, age, country, relation, bio,
          is_online, is_hidden, last_seen, join_date, created_at,
          is_muted, mute_expiry, is_banned, ban_expiry, is_blocked,
          ip_address, device_id,
          COALESCE(ignored_users, '{}') as ignored_users,
          COALESCE(username_color, '#FFFFFF') as username_color,
          COALESCE(user_theme, 'default') as user_theme
        FROM users 
        WHERE id = ${id}
        LIMIT 1
      `);
      
      if (result && (result as any).length > 0) {
        return (result as any)[0] as User;
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ Database fallback error in getUserById:', error);
      
      if (error.code === '42703') {
        try {
          const simpleResult = await db.execute(sql`
            SELECT id, username, password, user_type, profile_image,
                   status, gender, age, country, relation,
                   is_online, is_hidden, last_seen, join_date, created_at,
                   is_muted, mute_expiry, is_banned, ban_expiry, is_blocked
            FROM users 
            WHERE id = ${id}
            LIMIT 1
          `);
          
          if (simpleResult && (simpleResult as any).length > 0) {
            const user = (simpleResult as any)[0];
            return {
              ...user,
              role: user.user_type || 'guest',
              profileBackgroundColor: '#3c0d0d',
              usernameColor: '#FFFFFF',
              userTheme: 'default',
              bio: user.bio || null,
              ignoredUsers: [],
              profileBanner: user.profile_banner || null
            } as User;
          }
        } catch (simpleError) {
          console.error('❌ حتى الاستعلام المبسط فشل:', simpleError);
        }
      }
      
      return null;
    }
  }

  /**
   * فحص وجود العمود role في قاعدة البيانات
   */
  static async checkRoleColumn(): Promise<boolean> {
    if (!db) return false;
    
    try {
      const result = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name='role'
      `);
      
      return result && (result as any).length > 0;
    } catch (error) {
      console.error('❌ خطأ في فحص عمود role:', error);
      return false;
    }
  }
}