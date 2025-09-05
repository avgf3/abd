const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function applyBotsMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ متصل بقاعدة البيانات');

    // قراءة ملف migration
    const migrationPath = path.join(__dirname, 'migrations', 'add-bots-table.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    // تنفيذ migration
    await client.query(migrationSQL);
    console.log('✓ تم إنشاء جدول البوتات بنجاح');

    // تم تعطيل إنشاء البوتات الافتراضية حسب طلب التبسيط
    console.log('\n✅ تم إنشاء جدول البوتات. (بدون بوتات افتراضية)');
  } catch (error) {
    console.error('❌ خطأ في تطبيق migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// تشغيل migration
applyBotsMigration();