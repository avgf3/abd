import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import postgres from 'postgres';

dotenv.config();

async function applyDatabaseFix() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL غير محدد في ملف .env');
    process.exit(1);
  }

  console.log('🔄 بدء إصلاح قاعدة البيانات...');

  const sql = postgres(databaseUrl, {
    max: 1,
    ssl: databaseUrl.includes('localhost') ? false : 'require',
  });

  try {
    // قراءة ملف الهجرة
    const migrationPath = path.join(process.cwd(), 'migrations', '0008_fix_database_complete.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    console.log('📝 تطبيق الهجرة: 0008_fix_database_complete.sql');

    // تنفيذ الهجرة
    await sql.unsafe(migrationSQL);

    console.log('✅ تم تطبيق الهجرة بنجاح!');

    // التحقق من وجود جدول vip_users
    const vipTableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'vip_users'
      ) as exists
    `;

    if (vipTableCheck[0].exists) {
      console.log('✅ جدول vip_users موجود');

      // عد المستخدمين VIP
      const vipCount = await sql`SELECT COUNT(*) as count FROM vip_users`;
      console.log(`📊 عدد المستخدمين VIP: ${vipCount[0].count}`);
    }

    // التحقق من وجود جدول level_settings
    const levelTableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'level_settings'
      ) as exists
    `;

    if (levelTableCheck[0].exists) {
      console.log('✅ جدول level_settings موجود');

      // عد المستويات
      const levelCount = await sql`SELECT COUNT(*) as count FROM level_settings`;
      console.log(`📊 عدد المستويات المُعرّفة: ${levelCount[0].count}`);
    }

    // التحقق من الأعمدة المضافة في users
    const columnsCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN (
        'profile_background_color', 
        'username_color', 
        'profile_effect', 
        'points', 
        'level', 
        'total_points',
        'level_progress',
        'avatar_version',
        'avatar_hash',
        'bio',
        'is_hidden',
        'ignored_users'
      )
    `;

    console.log(`✅ تم التحقق من ${columnsCheck.length} عمود في جدول users`);

    // عرض ملخص الجداول
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log('\n📋 الجداول الموجودة في قاعدة البيانات:');
    tables.forEach((table) => {
      console.log(`  - ${table.table_name}`);
    });

    console.log('\n✅ تم إصلاح قاعدة البيانات بنجاح!');
    console.log('🎉 يمكنك الآن تشغيل التطبيق بدون أخطاء');
  } catch (error) {
    console.error('❌ خطأ في تطبيق الإصلاحات:', error);

    // محاولة عرض تفاصيل الخطأ
    if (error.message) {
      console.error('📝 رسالة الخطأ:', error.message);
    }
    if (error.detail) {
      console.error('📝 تفاصيل:', error.detail);
    }
    if (error.hint) {
      console.error('💡 تلميح:', error.hint);
    }

    process.exit(1);
  } finally {
    await sql.end();
  }
}

// تشغيل الإصلاح
applyDatabaseFix().catch((error) => {
  console.error('❌ فشل تطبيق الإصلاحات:', error);
  process.exit(1);
});
