import { db } from '../database-adapter';
import { sql } from 'drizzle-orm';

/**
 * تحسينات أداء قاعدة البيانات
 */
export class DatabaseOptimizations {
  /**
   * إنشاء الفهارس المطلوبة لتحسين الأداء
   */
  static async createIndexes() {
    try {
      console.log('🔧 إنشاء فهارس قاعدة البيانات...');
      
      // فهرس للرسائل - تحسين استعلامات الرسائل
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_messages_room_created 
        ON messages(room_id, created_at DESC)
      `);
      
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_messages_sender_created 
        ON messages(sender_id, created_at DESC)
      `);
      
      // فهرس للمستخدمين - تحسين البحث
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_users_username 
        ON users(username)
      `);
      
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_users_online_status 
        ON users(is_online, last_seen DESC)
      `);
      
      // فهرس للأصدقاء
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_friends_user_friend 
        ON friends(user_id, friend_id, status)
      `);
      
      // فهرس للإشعارات
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
        ON notifications(user_id, is_read, created_at DESC)
      `);
      
      // فهرس للغرف
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_room_users_room_user 
        ON room_users(room_id, user_id)
      `);
      
      // فهرس للحوائط
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_wall_posts_type_created 
        ON wall_posts(post_type, created_at DESC)
      `);
      
      console.log('✅ تم إنشاء الفهارس بنجاح');
    } catch (error) {
      console.error('❌ خطأ في إنشاء الفهارس:', error);
    }
  }
  
  /**
   * تنظيف البيانات القديمة
   */
  static async cleanupOldData() {
    try {
      console.log('🧹 تنظيف البيانات القديمة...');
      
      // حذف الرسائل القديمة (أكثر من 30 يوم)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      await db.execute(sql`
        DELETE FROM messages 
        WHERE created_at < ${thirtyDaysAgo.toISOString()}
        AND room_id = 'public'
      `);
      
      // حذف الإشعارات المقروءة القديمة (أكثر من 7 أيام)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      await db.execute(sql`
        DELETE FROM notifications 
        WHERE is_read = true 
        AND created_at < ${sevenDaysAgo.toISOString()}
      `);
      
      // حذف الضيوف غير النشطين (أكثر من 24 ساعة)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      await db.execute(sql`
        DELETE FROM users 
        WHERE user_type = 'guest' 
        AND last_seen < ${oneDayAgo.toISOString()}
      `);
      
      console.log('✅ تم تنظيف البيانات القديمة');
    } catch (error) {
      console.error('❌ خطأ في تنظيف البيانات:', error);
    }
  }
  
  /**
   * تحليل وإحصائيات الأداء
   */
  static async analyzePerformance() {
    try {
      console.log('📊 تحليل أداء قاعدة البيانات...');
      
      // إحصائيات الجداول
      const tableStats = await db.execute(sql`
        SELECT 
          'users' as table_name, COUNT(*) as row_count FROM users
        UNION ALL
        SELECT 'messages', COUNT(*) FROM messages
        UNION ALL
        SELECT 'friends', COUNT(*) FROM friends
        UNION ALL
        SELECT 'notifications', COUNT(*) FROM notifications
        UNION ALL
        SELECT 'rooms', COUNT(*) FROM rooms
        UNION ALL
        SELECT 'wall_posts', COUNT(*) FROM wall_posts
      `);
      
      console.log('📈 إحصائيات الجداول:', tableStats);
      
      // الاستعلامات البطيئة - PostgreSQL فقط
      if (process.env.DATABASE_URL?.includes('postgres')) {
        const slowQueries = await db.execute(sql`
          SELECT 
            query,
            calls,
            mean_exec_time,
            max_exec_time
          FROM pg_stat_statements
          WHERE mean_exec_time > 100
          ORDER BY mean_exec_time DESC
          LIMIT 10
        `).catch(() => null);
        
        if (slowQueries) {
          console.log('🐌 الاستعلامات البطيئة:', slowQueries);
        }
      }
      
      return tableStats;
    } catch (error) {
      console.error('❌ خطأ في تحليل الأداء:', error);
      return null;
    }
  }
  
  /**
   * تحسين الاستعلامات الشائعة
   */
  static optimizedQueries = {
    // استعلام محسّن للحصول على الرسائل مع معلومات المرسل
    getMessagesWithSender: sql`
      SELECT 
        m.*,
        u.username,
        u.profile_image,
        u.user_type,
        u.role,
        u.username_color,
        u.is_hidden
      FROM messages m
      INNER JOIN users u ON m.sender_id = u.id
      WHERE m.room_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2
    `,
    
    // استعلام محسّن للحصول على الأصدقاء النشطين
    getActiveFriends: sql`
      SELECT 
        u.*,
        f.status as friendship_status
      FROM friends f
      INNER JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = $1
      AND f.status = 'accepted'
      AND u.is_online = true
      ORDER BY u.last_seen DESC
    `,
    
    // استعلام محسّن للإشعارات غير المقروءة
    getUnreadNotifications: sql`
      SELECT 
        n.*,
        u.username as from_username,
        u.profile_image as from_profile_image
      FROM notifications n
      LEFT JOIN users u ON n.from_user_id = u.id
      WHERE n.user_id = $1
      AND n.is_read = false
      ORDER BY n.created_at DESC
      LIMIT 20
    `
  };
}

// تشغيل التحسينات عند بدء التطبيق
export async function initializeOptimizations() {
  try {
    await DatabaseOptimizations.createIndexes();
    
    // جدولة تنظيف دوري كل 24 ساعة
    setInterval(async () => {
      await DatabaseOptimizations.cleanupOldData();
    }, 24 * 60 * 60 * 1000);
    
    // تحليل الأداء كل ساعة
    setInterval(async () => {
      await DatabaseOptimizations.analyzePerformance();
    }, 60 * 60 * 1000);
    
    console.log('✅ تم تفعيل تحسينات قاعدة البيانات');
  } catch (error) {
    console.error('❌ خطأ في تفعيل التحسينات:', error);
  }
}