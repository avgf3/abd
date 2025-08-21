import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

class ImprovedDatabaseCleanup {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  async connect() {
    if (this.isConnected && this.client) {
      return this.client;
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL غير محدد');
    }

    this.client = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      query_timeout: 30000,
    });

    try {
      await this.client.connect();
      this.isConnected = true;
      console.log('✅ متصل بقاعدة البيانات للتنظيف');
      return this.client;
    } catch (error) {
      console.error('❌ فشل الاتصال بقاعدة البيانات:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.end();
        this.isConnected = false;
        console.log('🔌 تم قطع الاتصال من قاعدة البيانات');
      } catch (error) {
        console.error('⚠️ خطأ في قطع الاتصال:', error.message);
      }
    }
  }

  async executeWithRetry(queryFn, operation) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (!this.isConnected) {
          await this.connect();
        }
        return await queryFn();
      } catch (error) {
        console.error(`❌ فشل ${operation} (محاولة ${attempt}/${this.maxRetries}):`, error.message);

        if (attempt === this.maxRetries) {
          console.error(`💥 فشل نهائي في ${operation} بعد ${this.maxRetries} محاولات`);
          return 0; // إرجاع 0 بدلاً من رمي خطأ
        }

        // إعادة الاتصال في المحاولة التالية
        this.isConnected = false;
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt));
      }
    }
    return 0;
  }

  /**
   * تنظيف الرسائل من مستخدمين غير موجودين
   */
  async cleanupOrphanedMessages() {
    return await this.executeWithRetry(async () => {
      console.log('🧹 بدء تنظيف الرسائل اليتيمة...');

      // فحص وجود الجداول أولاً
      const tablesCheck = await this.client.query(`
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('messages', 'users')
                ORDER BY table_name;
            `);

      if (tablesCheck.rows.length < 2) {
        console.log('⚠️ جداول messages أو users غير موجودة، تخطي التنظيف');
        return 0;
      }

      // الحصول على معرفات المستخدمين الموجودين
      const existingUsers = await this.client.query('SELECT id FROM users WHERE id IS NOT NULL');

      if (existingUsers.rows.length === 0) {
        console.log('⚠️ لا يوجد مستخدمين، تخطي تنظيف الرسائل');
        return 0;
      }

      const userIds = existingUsers.rows.map((row) => row.id);

      // حذف الرسائل من مستخدمين غير موجودين
      const deleteResult = await this.client.query(
        `
                DELETE FROM messages 
                WHERE sender_id NOT IN (${userIds.map((_, i) => `$${i + 1}`).join(',')})
                   OR receiver_id NOT IN (${userIds.map((_, i) => `$${i + 1 + userIds.length}`).join(',')})
            `,
        [...userIds, ...userIds]
      );

      console.log(`✅ تم حذف ${deleteResult.rowCount} رسالة يتيمة`);
      return deleteResult.rowCount;
    }, 'تنظيف الرسائل اليتيمة');
  }

  /**
   * تنظيف الرسائل غير الصالحة
   */
  async cleanupInvalidMessages() {
    return await this.executeWithRetry(async () => {
      console.log('🧹 بدء تنظيف الرسائل غير الصالحة...');

      const deleteResult = await this.client.query(`
                DELETE FROM messages 
                WHERE content IS NULL 
                   OR content = '' 
                   OR content = 'مستخدم'
                   OR sender_id IS NULL 
                   OR sender_id <= 0
                   OR receiver_id IS NULL 
                   OR receiver_id <= 0
            `);

      console.log(`✅ تم حذف ${deleteResult.rowCount} رسالة غير صالحة`);
      return deleteResult.rowCount;
    }, 'تنظيف الرسائل غير الصالحة');
  }

  /**
   * تنظيف المستخدمين الضيوف القدامى
   */
  async cleanupOldGuestUsers() {
    return await this.executeWithRetry(async () => {
      console.log('🧹 بدء تنظيف المستخدمين الضيوف القدامى...');

      // حذف المستخدمين الضيوف القدامى (أكثر من 24 ساعة وغير متصلين)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const deleteResult = await this.client.query(
        `
                DELETE FROM users 
                WHERE id >= 1000 
                  AND (is_online = false OR is_online IS NULL)
                  AND (last_seen IS NULL OR last_seen < $1)
                  AND user_type = 'guest'
            `,
        [oneDayAgo]
      );

      console.log(`✅ تم حذف ${deleteResult.rowCount} مستخدم ضيف قديم`);
      return deleteResult.rowCount;
    }, 'تنظيف المستخدمين الضيوف القدامى');
  }

  /**
   * الحصول على إحصائيات قاعدة البيانات
   */
  async getDatabaseStats() {
    return await this.executeWithRetry(async () => {
      console.log('📊 جمع إحصائيات قاعدة البيانات...');

      const stats = await this.client.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM messages) as total_messages,
                    (SELECT COUNT(*) FROM users WHERE is_online = true) as online_users,
                    (SELECT COUNT(*) FROM users WHERE id >= 1000) as guest_users,
                    (SELECT COUNT(*) FROM users WHERE id < 1000) as registered_users
            `);

      const result = stats.rows[0];
      console.log('📊 إحصائيات قاعدة البيانات:');
      console.log(`   - إجمالي المستخدمين: ${result.total_users}`);
      console.log(`   - إجمالي الرسائل: ${result.total_messages}`);
      console.log(`   - المستخدمين المتصلين: ${result.online_users}`);
      console.log(`   - المستخدمين الضيوف: ${result.guest_users}`);
      console.log(`   - المستخدمين المسجلين: ${result.registered_users}`);

      return result;
    }, 'جمع الإحصائيات');
  }

  /**
   * تنظيف شامل محسن
   */
  async performImprovedCleanup() {
    console.log('🧹 بدء التنظيف الشامل المحسن...');

    try {
      await this.connect();

      const results = {
        orphanedMessages: await this.cleanupOrphanedMessages(),
        invalidMessages: await this.cleanupInvalidMessages(),
        oldGuestUsers: await this.cleanupOldGuestUsers(),
      };

      const totalCleaned =
        results.orphanedMessages + results.invalidMessages + results.oldGuestUsers;

      console.log('📊 نتائج التنظيف:');
      console.log(`   - رسائل يتيمة: ${results.orphanedMessages}`);
      console.log(`   - رسائل غير صالحة: ${results.invalidMessages}`);
      console.log(`   - مستخدمين ضيوف قدامى: ${results.oldGuestUsers}`);
      console.log(`   - إجمالي المحذوف: ${totalCleaned}`);

      // جمع الإحصائيات النهائية
      await this.getDatabaseStats();

      console.log('✅ تم الانتهاء من التنظيف الشامل بنجاح');
      return results;
    } catch (error) {
      console.error('❌ خطأ في التنظيف الشامل:', error.message);
      return {
        orphanedMessages: 0,
        invalidMessages: 0,
        oldGuestUsers: 0,
      };
    } finally {
      await this.disconnect();
    }
  }
}

async function fixDatabaseCleanupIssues() {
  console.log('🔧 إصلاح مشاكل التنظيف التلقائي...');

  const cleanup = new ImprovedDatabaseCleanup();

  try {
    // تشغيل التنظيف المحسن
    await cleanup.performImprovedCleanup();

    console.log('✅ تم إصلاح مشاكل التنظيف التلقائي بنجاح!');
  } catch (error) {
    console.error('❌ فشل في إصلاح مشاكل التنظيف:', error.message);
    throw error;
  }
}

// تشغيل الإصلاح
if (import.meta.url === `file://${process.argv[1]}`) {
  fixDatabaseCleanupIssues()
    .then(() => {
      console.log('🎉 تم إصلاح مشاكل التنظيف بنجاح!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 فشل في إصلاح مشاكل التنظيف:', error);
      process.exit(1);
    });
}

export { ImprovedDatabaseCleanup, fixDatabaseCleanupIssues };
export default fixDatabaseCleanupIssues;
