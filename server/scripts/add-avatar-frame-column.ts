import { db } from '../database-adapter';

async function addAvatarFrameColumn() {
  console.log('🔄 إضافة عامود avatar_frame إلى جدول المستخدمين...');
  
  try {
    // التحقق من نوع قاعدة البيانات
    if (!db || !db.type) {
      console.error('❌ قاعدة البيانات غير متصلة');
      return;
    }

    if (db.type === 'sqlite') {
      // SQLite
      await db.db.exec(`
        ALTER TABLE users ADD COLUMN avatar_frame TEXT DEFAULT 'none';
      `);
      console.log('✅ تم إضافة عامود avatar_frame لـ SQLite');
    } else if (db.type === 'postgresql') {
      // PostgreSQL
      await db.db.execute(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'avatar_frame'
          ) THEN
            ALTER TABLE users ADD COLUMN avatar_frame TEXT DEFAULT 'none';
          END IF;
        END $$;
      `);
      console.log('✅ تم إضافة عامود avatar_frame لـ PostgreSQL');
    }

    console.log('✅ تمت العملية بنجاح');
  } catch (error) {
    console.error('❌ خطأ في إضافة العامود:', error);
  } finally {
    // إغلاق الاتصال
    if (db.close) {
      await db.close();
    }
    process.exit(0);
  }
}

// تشغيل السكريبت
addAvatarFrameColumn();